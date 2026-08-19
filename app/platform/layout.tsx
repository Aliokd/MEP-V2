"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import MaestroSidebar from './components/MaestroSidebar';
import SupportModal from './components/SupportModal';
import FeedbackModal from './components/FeedbackModal';
import MindPowerPanel from './components/MindPowerPanel';
import MindPowerStatus from './components/MindPowerStatus';
import PlatformOnboarding from './components/PlatformOnboarding';
import AnnouncementBanner from './components/AnnouncementBanner';
import { touchLastActive } from '@/lib/lastActive';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Menu, User, X, Brain, ChevronRight, ChevronLeft, ShieldOff, UsersRound, UserMinus, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { acknowledgeRemovalNotice } from './create/collabUtils';

/**
 * When to fire the actual navigation during the profile's slide-out
 * (.profile-view-exit in globals.css runs 420ms). Deliberately well before the
 * animation ends: the route swap costs real time — mounting the Create canvas is
 * not free — and paying it after the view has fully faded left the screen holding
 * on an empty background. By this point the ease-out curve has done ~90% of the
 * motion, so cutting over reads as the end of the slide, not an interruption.
 */
const PROFILE_EXIT_NAV_MS = 200;

/**
 * Shown instead of the app when the account has been disabled in Firebase Auth —
 * by a sanction or by hand in the console. The session is already gone by the time
 * this renders; this exists so being blocked doesn't look like a broken login.
 */
function AccountBlockedScreen({ t }: { t: (key: string) => string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#E4E4DF] p-6 font-sans text-stone-900">
            <div className="bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-[0_24px_60px_rgba(0,0,0,0.08)] flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-500">
                    <ShieldOff size={28} strokeWidth={1.5} />
                </div>

                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-stone-850">{t('account_blocked.title')}</h1>
                    <p className="text-sm text-stone-500 leading-relaxed">{t('account_blocked.body')}</p>
                </div>

                <a
                    href="mailto:support@veinote.com"
                    className="w-full py-4 bg-[#87b884] hover:bg-[#7cb378] active:bg-[#6fa06b] text-[#1c331a] text-base font-semibold rounded-[16px] transition-all shadow-md hover:shadow-lg shadow-[#87b884]/20 active:scale-[0.98] flex items-center justify-center"
                >
                    {t('account_blocked.contact_support')}
                </a>

                <Link href="/" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                    {t('account_blocked.back_home')}
                </Link>
            </div>
        </div>
    );
}

function PlatformLayoutInner({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, blocked } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    
    const [showProgressPopup, setShowProgressPopup] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    // Leaving Profile plays the slide-out first, then navigates; this holds the
    // exit class on the view for that window. Reset on arrival at the new route.
    const [isProfileExiting, setIsProfileExiting] = useState(false);
    // Mirrors the state as a ref so a second trigger can be rejected synchronously,
    // before React has re-rendered with the updated flag.
    const profileExitingRef = useRef(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        profileExitingRef.current = false;
        setIsProfileExiting(false);
    }, [pathname]);

    // Being in the platform shell is what "active" means. Throttled inside
    // touchLastActive, so moving between sections costs nothing.
    useEffect(() => {
        if (user?.uid) touchLastActive(user.uid);
    }, [user?.uid, pathname]);

    // Slide the profile out, then navigate. `to` omitted = back in history.
    const exitProfile = useCallback((to?: string) => {
        if (profileExitingRef.current) return;
        profileExitingRef.current = true;
        setIsProfileExiting(true);
        setTimeout(() => {
            if (to) {
                router.push(to);
            } else if (window.history.length > 1) {
                // A fresh tab landing directly on /platform/profile has no in-app history —
                // falling back to Create beats bouncing the user out of the app.
                router.back();
            } else {
                router.push('/platform/create');
            }
        }, PROFILE_EXIT_NAV_MS);
    }, [router]);

    // The profile page itself can't reach this state, so it asks for the exit by
    // event — e.g. "Replay guide", which slides the profile away to reveal the canvas.
    useEffect(() => {
        const onExitRequest = (e: Event) => exitProfile((e as CustomEvent<{ to?: string }>).detail?.to);
        window.addEventListener('veinote-profile-exit', onExitRequest);
        return () => window.removeEventListener('veinote-profile-exit', onExitRequest);
    }, [exitProfile]);

    // Progress breakdowns and state values
    const [progressLevel, setProgressLevel] = useState(1);
    const [levelProgress, setLevelProgress] = useState(0); // 0-100% toward next level
    const [completedLessonsCount, setCompletedLessonsCount] = useState(0);

    // Create section sub-metrics
    const [wordsTyped, setWordsTyped] = useState(0);
    const [recordingMinutes, setRecordingMinutes] = useState(0);
    const [songsCompleted, setSongsCompleted] = useState(0);

    // Practice section sub-metrics
    const [practiceMinutes, setPracticeMinutes] = useState(0);

    // Community section sub-metrics (projects shared in Connect).
    // Seeded from the last known count because the real value comes from an async Firestore
    // count: starting at 0 made the bar render a quarter short and then jump when the count
    // landed, and left it permanently short whenever that request failed (offline/rules).
    const [communityCount, setCommunityCount] = useState(() => {
        if (typeof window === 'undefined') return 0;
        return parseInt(localStorage.getItem('mep-community-shared-count') || '0');
    });

    // Level milestone criteria (Level 1 → Level 2)
    const L1_WORDS   = 200;  // words
    const L1_LESSONS = 2;    // chapters checked
    const L1_PRACTICE = 30;  // minutes
    const L1_COMMUNITY = 2;  // projects shared

    const [showTooltip, setShowTooltip] = useState(false);
    const [activeQuote, setActiveQuote] = useState('Remember, small actions makes progress');
    const [showConfettiOverlay, setShowConfettiOverlay] = useState(false);
    const [showProgressGlow, setShowProgressGlow] = useState(false);
    // Complete/Publish glows run at 2s to stay in step with the canvas + button gradients;
    // the daily milestone glow keeps its longer 3.4s celebration.
    const [isQuickGlow, setIsQuickGlow] = useState(false);
    const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ---- Collab invites, platform-wide ----
    // The Create canvas has its own invite banner, but someone in Learn/Practice/Connect had
    // no way to know an invite arrived — this listener + the toast below cover every section.
    const [pendingCollabInvites, setPendingCollabInvites] = useState<any[]>([]);
    // Session-scoped dismissals: closing the toast shouldn't bury the invite forever (it still
    // lives in the Create banner), just quiet it until the next visit.
    const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(new Set());
    // Accepting an invite fires a joy moment on the Mind Power pill: the looping ring plus a
    // full moving-gradient wash, mounted for the length of one celebration cycle.
    const [showCollabCelebrate, setShowCollabCelebrate] = useState(false);
    const collabCelebrateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user) {
            setPendingCollabInvites([]);
            return;
        }
        const invitesQuery = query(
            collection(db, "invitations"),
            where("inviteeId", "==", user.uid),
            where("status", "==", "pending")
        );
        const unsub = onSnapshot(invitesQuery, (snap) => {
            const invites: any[] = [];
            snap.forEach(d => invites.push({ id: d.id, ...d.data() }));
            invites.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setPendingCollabInvites(invites);
        }, (err) => console.warn("Platform invites listener error:", err.message));
        return () => unsub();
    }, [user]);

    useEffect(() => {
        const handleCollabJoined = () => {
            setShowCollabCelebrate(true);
            if (collabCelebrateTimeoutRef.current) clearTimeout(collabCelebrateTimeoutRef.current);
            // Matches the 2.6s run of .collab-join-gradient-fill / --collab ring.
            collabCelebrateTimeoutRef.current = setTimeout(() => setShowCollabCelebrate(false), 2600);
        };
        window.addEventListener('veinote-collab-joined', handleCollabJoined);
        return () => {
            window.removeEventListener('veinote-collab-joined', handleCollabJoined);
            if (collabCelebrateTimeoutRef.current) clearTimeout(collabCelebrateTimeoutRef.current);
        };
    }, []);

    // The toast only shows outside Create (the canvas banner owns it there), and only for
    // invites not dismissed this session.
    const visibleInviteToast = pathname?.startsWith('/platform/create')
        ? null
        : pendingCollabInvites.find(inv => !dismissedInviteIds.has(inv.id)) || null;
    const extraInviteCount = visibleInviteToast
        ? pendingCollabInvites.filter(inv => !dismissedInviteIds.has(inv.id)).length - 1
        : 0;

    // ---- Removed-from-project notices ----
    // Being removed is otherwise silent: the project simply vanishes from the workspace, which
    // reads as a bug or lost work. Unlike the invite toast this shows in EVERY section
    // including Create — there is no canvas banner for it, and the project it refers to is
    // precisely the thing that just disappeared from that canvas.
    const [removalNotices, setRemovalNotices] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            setRemovalNotices([]);
            return;
        }
        // Only two equality filters, with `removalAcknowledged` filtered client-side, so this
        // needs no composite index. The per-user result set is tiny.
        const removalQuery = query(
            collection(db, "invitations"),
            where("inviteeId", "==", user.uid),
            where("status", "==", "removed")
        );
        const unsub = onSnapshot(removalQuery, (snap) => {
            const notices: any[] = [];
            snap.forEach(d => {
                const data = d.data();
                if (!data.removalAcknowledged) notices.push({ id: d.id, ...data });
            });
            notices.sort((a, b) => (b.removedAt || '').localeCompare(a.removedAt || ''));
            setRemovalNotices(notices);
        }, (err) => console.warn("Removal notices listener error:", err.message));
        return () => unsub();
    }, [user]);

    const visibleRemovalNotice = removalNotices[0] || null;
    const extraRemovalCount = visibleRemovalNotice ? removalNotices.length - 1 : 0;

    const recalculateProgress = () => {
        // Learn: how many lessons checked (no cap)
        const completedLessons = JSON.parse(localStorage.getItem('mep-completed-lessons') || '[]');
        const lCount = completedLessons.length;

        // Create: words typed (from all notes)
        const words = parseInt(localStorage.getItem('mep-create-words-typed') || '0');

        // Create: recording minutes (live timer + saved recordings via notes watcher)
        const recordingSeconds = parseInt(localStorage.getItem('mep-create-recording-seconds') || '0');
        const recMins = parseFloat((recordingSeconds / 60).toFixed(1));

        // Practice: minutes spent on Practice page (no cap)
        const practiceSeconds = parseInt(localStorage.getItem('mep-practice-seconds') || '0');
        const pracMins = parseFloat((practiceSeconds / 60).toFixed(1));

        // Distinct songs the user has pressed Complete on — surfaced in the panel so the
        // celebration has a concrete number behind it.
        let songsDone = 0;
        try { songsDone = (JSON.parse(localStorage.getItem('mep-completed-songs') || '[]') as string[]).length; } catch {}
        setSongsCompleted(songsDone);

        setCompletedLessonsCount(lCount);
        setWordsTyped(words);
        setRecordingMinutes(recMins);
        setPracticeMinutes(pracMins);
    };

    // Community: how many projects the user has shared in Connect (Firestore-backed).
    // Only a successful count updates the value — a failed request leaves the cached count
    // in place rather than collapsing the Community ring to zero.
    const fetchCommunityCount = async () => {
        if (!user) return;
        try {
            const snapshot = await getCountFromServer(
                query(collection(db, 'connect_posts'), where('authorId', '==', user.uid))
            );
            const count = snapshot.data().count;
            setCommunityCount(count);
            safeLocalStorageSetItem('mep-community-shared-count', count.toString());
        } catch (error) {
            console.error('Error fetching community post count:', error);
        }
    };

    // Overall Mind Power level — combines Create/Learn/Practice/Community into one score
    useEffect(() => {
        const wordsCrit     = Math.min(1, wordsTyped / L1_WORDS);
        const lessonsCrit   = Math.min(1, completedLessonsCount / L1_LESSONS);
        const practiceCrit  = Math.min(1, practiceMinutes / L1_PRACTICE);
        const communityCrit = Math.min(1, communityCount / L1_COMMUNITY);
        const avgProgress   = Math.round(((wordsCrit + lessonsCrit + practiceCrit + communityCrit) / 4) * 100);

        const allMet = wordsCrit >= 1 && lessonsCrit >= 1 && practiceCrit >= 1 && communityCrit >= 1;

        setProgressLevel(allMet ? 2 : 1);
        setLevelProgress(allMet ? 100 : avgProgress);

        safeLocalStorageSetItem('songwriting-progress', avgProgress.toString());
    }, [wordsTyped, completedLessonsCount, practiceMinutes, communityCount]);

    // Load initial values from localStorage
    useEffect(() => {
        recalculateProgress();

        const storedQuote = localStorage.getItem('songwriting-progress-quote');
        if (storedQuote) {
            setActiveQuote(storedQuote);
        } else {
            safeLocalStorageSetItem('songwriting-progress-quote', 'progress.proverbs.0');
            setActiveQuote('progress.proverbs.0');
        }
    }, []);

    // Once the user is available: fetch the real Community count, and re-read the local
    // progress inputs — on an account switch bindLocalStateToAccount has just purged the
    // previous account's counters, and values read at mount may predate that purge.
    useEffect(() => {
        recalculateProgress();
        fetchCommunityCount();
    }, [user]);

    // Listen to songwriting-progress-updated event
    useEffect(() => {
        const handleProgressUpdate = (e: Event) => {
            recalculateProgress();
            fetchCommunityCount();

            const storedQuote = localStorage.getItem('songwriting-progress-quote');
            if (storedQuote) {
                setActiveQuote(storedQuote);
            }
            
            const customEvent = e as CustomEvent;
            const isMajorTask = customEvent.detail?.triggerType === 'major-task';
            
            // Get today's date identifier to track daily triggers
            const todayStr = new Date().toDateString();
            const lastFirstActionDate = localStorage.getItem('mep-last-auto-pop-first-action-date');
            const lastMajorTaskDate = localStorage.getItem('mep-last-auto-pop-major-task-date');
            
            let shouldAutoPop = false;
            
            if (lastFirstActionDate !== todayStr) {
                // First action of the day!
                shouldAutoPop = true;
                safeLocalStorageSetItem('mep-last-auto-pop-first-action-date', todayStr);
            } else if (isMajorTask && lastMajorTaskDate !== todayStr) {
                // Major task completed today!
                shouldAutoPop = true;
                safeLocalStorageSetItem('mep-last-auto-pop-major-task-date', todayStr);
            }
            
            if (shouldAutoPop) {
                // The glow ring alone is enough of a progress hint — don't force the panel open,
                // let the user click in to see details.

                // Trigger the achievement glow border on every progress update
                setShowProgressGlow(true);
                if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
                glowTimeoutRef.current = setTimeout(() => {
                    setShowProgressGlow(false);
                    // This timer shares glowTimeoutRef with handleCelebrate below — if this
                    // milestone timeout ends up being the one left standing (it can win the
                    // race depending on dispatch order), it must also clear isQuickGlow, or
                    // the label gets stuck on "Saving progress..." with nothing left to flip
                    // it back to "Mind Power".
                    setIsQuickGlow(false);
                }, 3400);

                // Confetti overlay trigger
                const isConfetti = localStorage.getItem('songwriting-progress-confetti');
                if (isConfetti === 'true') {
                    setShowConfettiOverlay(true);
                    safeLocalStorageSetItem('songwriting-progress-confetti', 'false');
                }
            }
        };

        // Fired by Complete/Publish in the Create canvas. Unlike the progress event above,
        // this always glows — it's immediate feedback for the action just taken, not a
        // once-a-day milestone celebration.
        const handleCelebrate = () => {
            recalculateProgress();
            setIsQuickGlow(true);
            setShowProgressGlow(true);
            if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
            // Matches .mind-power-glow-ring--quick's 2s animation-duration — it was previously
            // left mounted 1.6s after the ring visually finished, reading as sluggish.
            glowTimeoutRef.current = setTimeout(() => {
                setShowProgressGlow(false);
                setIsQuickGlow(false);
            }, 2000);
        };

        window.addEventListener('songwriting-progress-updated', handleProgressUpdate);
        window.addEventListener('veinote-celebrate', handleCelebrate);
        return () => {
            window.removeEventListener('songwriting-progress-updated', handleProgressUpdate);
            window.removeEventListener('veinote-celebrate', handleCelebrate);
            if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
        };
    }, []);

    // Close popup when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowProgressPopup(false);
                setShowTooltip(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // A blocked account is signed out too, but must not be bounced to /signin —
    // that reads as a session glitch and they'd just try again. They get told.
    useEffect(() => {
        if (!loading && !user && !blocked) {
            router.push('/signin');
        }
    }, [user, loading, blocked, router]);

    // The welcome video now lives inside the onboarding guide as its first step —
    // see PlatformOnboarding, mounted at the bottom of this layout.

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#E4E4DF]">
            <div className="w-12 h-12 border-t-2 border-stone-900 rounded-full animate-spin" />
        </div>
    );

    if (blocked) return <AccountBlockedScreen t={t} />;

    if (!user) return null;

    const firstName = (user.displayName || '').trim().split(' ')[0] || t('navigation.my_profile');

    // Profile is a focused, full-width view: no sidebar, just a back button top-left.
    const isProfile = pathname === '/platform/profile' || pathname?.startsWith('/platform/profile/');

    const handleBack = () => exitProfile();

    return (
        <div className={`min-h-screen flex text-stone-900 font-sans selection:bg-stone-900/10 selection:text-stone-900 transition-colors duration-200 ${
            pathname?.startsWith('/platform/create') ? 'bg-[#FAF9F5] md:bg-[#E4E4DF]' : 'bg-[#E4E4DF]'
        } ${isProfile ? 'overflow-x-clip' : ''}`}>

            {/* Collab notification stack. Both toasts share one fixed column so they stack
                rather than overlap when an invite and a removal notice land together. */}
            {(visibleInviteToast || visibleRemovalNotice) && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[95] px-4 w-full sm:w-auto flex flex-col items-center gap-2 pointer-events-none">
                    {/* Invite toast — every section except Create (the canvas banner covers that
                        one). Keyed by invite id so a newly arriving invite replays the entrance
                        even if a previous toast was already showing. */}
                    {visibleInviteToast && (
                        <div key={visibleInviteToast.id} className="collab-banner-enter pointer-events-auto max-w-full">
                            <div className="relative bg-white rounded-full pl-4 pr-2 py-2 shadow-[0_12px_35px_rgba(0,0,0,0.14)] border border-stone-200/80 flex items-center gap-3 max-w-full">
                                <div className="invite-glow-ring" />
                                <div className="relative w-8 h-8 rounded-full bg-[#EAF3E8] text-[#4e7a49] flex items-center justify-center shrink-0">
                                    <UsersRound size={16} strokeWidth={2} />
                                </div>
                                <div className="relative flex flex-col min-w-0 mr-1">
                                    <span className="text-[13.5px] font-semibold text-stone-800 leading-tight truncate">
                                        {(visibleInviteToast.senderName || t('collab.a_collaborator'))} {t('collab.invited_you_banner')}
                                    </span>
                                    <span className="text-[12px] text-stone-500 leading-tight truncate">
                                        {(visibleInviteToast.projectTitle || t('workspace.untitled_note'))}
                                        {extraInviteCount > 0 ? ` · +${extraInviteCount}` : ''}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push('/platform/create')}
                                    className="relative bg-[#E5FE6C] hover:bg-[#EEFE7B] text-stone-950 font-semibold text-[13px] px-4 py-2 rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95 border-none outline-none shrink-0"
                                >
                                    <span>{t('collab.view_invite')}</span>
                                    <ArrowRight size={14} className="stroke-[2.5]" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDismissedInviteIds(prev => new Set(prev).add(visibleInviteToast.id))}
                                    aria-label={t('card.dismiss')}
                                    className="relative p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all cursor-pointer shrink-0"
                                >
                                    <X size={15} strokeWidth={2.2} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Removed-from-project notice. Shown in EVERY section including Create:
                        the project it names is the one that just vanished from that workspace.
                        Deliberately calm — no glow ring, no celebration colours; this is
                        information, not a moment. Dismissing writes the acknowledgement so it
                        does not reappear on the next device or reload. */}
                    {visibleRemovalNotice && (
                        <div key={visibleRemovalNotice.id} className="collab-banner-enter pointer-events-auto max-w-full">
                            <div className="relative bg-white rounded-full pl-4 pr-2 py-2 shadow-[0_12px_35px_rgba(0,0,0,0.14)] border border-stone-200/80 flex items-center gap-3 max-w-full">
                                <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center shrink-0">
                                    <UserMinus size={16} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col min-w-0 mr-1">
                                    <span className="text-[13.5px] font-semibold text-stone-800 leading-tight truncate">
                                        {(visibleRemovalNotice.senderName || t('collab.the_project_owner'))} {t('collab.removed_you_banner')}
                                    </span>
                                    <span className="text-[12px] text-stone-500 leading-tight truncate">
                                        {(visibleRemovalNotice.projectTitle || t('workspace.untitled_note'))}
                                        {extraRemovalCount > 0 ? ` · +${extraRemovalCount}` : ''}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => acknowledgeRemovalNotice(visibleRemovalNotice.id)}
                                    aria-label={t('card.dismiss')}
                                    className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all cursor-pointer shrink-0"
                                >
                                    <X size={15} strokeWidth={2.2} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Congratulations Confetti Overlay Modal */}
            {showConfettiOverlay && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] p-8 max-w-md w-full mx-4 shadow-2xl text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                                <path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" />
                            </svg>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <h3 className="text-2xl font-bold text-stone-850">{t('platform_layout.outstanding_effort_title')}</h3>
                            <p className="text-sm text-stone-500 leading-normal">
                                {t('platform_layout.outstanding_effort_desc')}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setShowConfettiOverlay(false);
                                safeLocalStorageSetItem('songwriting-progress', '0');
                                setLevelProgress(0);
                            }}
                            className="w-full py-4.5 bg-stone-900 hover:bg-stone-800 text-white rounded-[16px] text-base font-bold transition-all shadow-md cursor-pointer active:scale-95"
                        >
                            {t('platform_layout.start_next_journey')}
                        </button>
                    </div>
                </div>
            )}

            {/* Sidebar — hidden on Profile, which is a focused full-width view */}
            {!isProfile && (
                <MaestroSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onSupportClick={() => setIsSupportOpen(true)}
                    onFeedbackClick={() => setIsFeedbackOpen(true)}
                />
            )}

            <SupportModal 
                isOpen={isSupportOpen} 
                onClose={() => setIsSupportOpen(false)} 
            />

            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {/* Main Content Area. On Profile the whole view (header + panel) slides in
                on arrival and slides back out while Back defers navigation. */}
            <div className={`
                flex-1 flex flex-col min-w-0
                ${isProfile ? (isProfileExiting ? 'profile-view-exit' : 'profile-view-enter') : ''}
                ${pathname?.startsWith('/platform/create')
                    ? 'p-0 xl:p-8'
                    : 'p-4 md:p-8'
                }
            `}>
                {/* The mobile laptop-hint banner is mounted once in the root layout
                    (components/MobileLaptopBanner) and covers platform screens too. */}

                {/* Mobile Top Header */}
                <header className={`flex md:hidden items-center justify-between px-6 pt-6 pb-4 text-stone-655 font-sans z-40 mb-0 relative transition-colors duration-205 ${
                    pathname?.startsWith('/platform/create') ? 'bg-[#F5F4EE] border-none' : 'bg-[#E4E4DF] border-b border-stone-250/20'
                }`}>
                    {isProfile ? (
                        <button
                            onClick={handleBack}
                            aria-label={t('navigation.my_profile')}
                            className="p-2 -ml-2 rounded-full hover:bg-stone-200/40 active:scale-95 transition-all text-stone-700 hover:text-stone-955"
                        >
                            <ChevronLeft size={22} className="stroke-[2.2]" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 rounded-full hover:bg-stone-200/40 active:scale-95 transition-all text-stone-700 hover:text-stone-955"
                        >
                            <Menu size={22} className="stroke-[2.2]" />
                        </button>
                    )}

                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
                        <Link href="/platform/create">
                            <Logo size="md" showBeta />
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isProfile && (
                            <Link
                                href="/platform/profile"
                                className="p-2 -mr-2 rounded-full hover:bg-stone-200/40 active:scale-95 transition-all text-stone-700 hover:text-stone-955 flex items-center justify-center"
                            >
                                <User size={22} className="stroke-[2.2]" />
                            </Link>
                        )}
                    </div>
                </header>

                {/* Mobile Progress Bar Bar */}
                <div className={`flex md:hidden items-center justify-center w-full px-6 pb-4 z-40 transition-colors duration-205 ${
                    pathname?.startsWith('/platform/create') ? 'bg-[#F5F4EE] border-none mb-0' : 'bg-[#E4E4DF] border-b border-stone-250/10 mb-4'
                }`}>
                    <div className="relative flex flex-col items-center w-full" ref={popupRef}>
                        {showProgressGlow && <div className={`mind-power-glow-ring ${isQuickGlow ? "mind-power-glow-ring--quick" : ""}`} />}
                        {showCollabCelebrate && <div className="mind-power-glow-ring mind-power-glow-ring--collab" />}
                        <div
                            onClick={() => setShowTooltip(!showTooltip)}
                            data-tour="mind-power"
                            role="button"
                            aria-label={t('progress.mind_power_label')}
                            className="relative flex items-center w-full bg-white/50 border border-stone-200/40 px-5 py-3 rounded-[20px] select-none cursor-pointer transition-all active:scale-[0.99] shadow-2xs font-sans text-xs text-stone-500 font-medium normal-case"
                        >
                            {showCollabCelebrate && <div className="collab-join-gradient-fill" />}
                            <div className="relative flex items-center gap-3">
                            <Brain size={16} className="text-stone-600 shrink-0" strokeWidth={1.5} />
                            <MindPowerStatus t={t} isSaving={isQuickGlow} size="sm" />
                            </div>
                            <div className="flex-1 h-2 bg-stone-200/70 rounded-full overflow-hidden relative ml-2">
                                <div
                                    className="h-full bg-[#86BE7F] rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${levelProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Mind Power panel — appears below the progress pill */}
                        {showTooltip && (
                            <div className="absolute top-12 left-1/2 mind-power-panel-enter z-50">
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#F5F4EE] border-l border-t border-stone-200/70 rotate-45 z-10" />
                                <MindPowerPanel
                                    t={t}
                                    progressLevel={progressLevel}
                                    levelProgress={levelProgress}
                                    wordsTyped={wordsTyped}
                                    songsCompleted={songsCompleted}
                                    recordingMinutes={recordingMinutes}
                                    wordsGoal={L1_WORDS}
                                    completedLessonsCount={completedLessonsCount}
                                    lessonsGoal={L1_LESSONS}
                                    practiceMinutes={practiceMinutes}
                                    practiceGoal={L1_PRACTICE}
                                    communityCount={communityCount}
                                    communityGoal={L1_COMMUNITY}
                                    activeQuote={activeQuote}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Top Header */}
                {/* Below xl the parent content area has no padding (the canvas claims it),
                    so the header carries its own: pt-6/pb-6 centers the pill row in the
                    top strip and lines its middle up with the sidebar logo (which sits at
                    pt-8 + half its ~30px height ≈ the same 47px centerline). At xl the
                    parent's p-8 returns and the original spacing takes back over. */}
                <header className="hidden md:flex items-center justify-between px-4 xl:px-8 pt-6 xl:pt-0 pb-6 text-stone-600/70 font-sans text-xs tracking-wider z-40">
                    {/* Back button on Profile (which has no sidebar); plain spacer elsewhere */}
                    {isProfile ? (
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1.5 bg-white/50 hover:bg-white/70 border border-stone-200/80 pl-4 pr-5 py-3 rounded-full transition-all active:scale-95 shadow-2xs text-stone-600 hover:text-stone-800 text-sm font-semibold normal-case tracking-normal cursor-pointer"
                        >
                            <ChevronLeft size={16} strokeWidth={2} />
                            {t('navigation.my_profile')}
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {/* Centered navigation items: Progress Bar Capsule & Tooltip */}
                    <div className="flex items-center gap-3 font-medium">
                        <div className="relative flex flex-col items-center" ref={popupRef}>
                            {showProgressGlow && <div className={`mind-power-glow-ring ${isQuickGlow ? "mind-power-glow-ring--quick" : ""}`} />}
                            {showCollabCelebrate && <div className="mind-power-glow-ring mind-power-glow-ring--collab" />}
                            <div
                                onClick={() => setShowTooltip(!showTooltip)}
                                data-tour="mind-power"
                                role="button"
                                aria-label={t('progress.mind_power_label')}
                                className="relative flex items-center bg-white/50 hover:bg-white/70 border border-stone-200/80 px-6 py-3 rounded-full select-none cursor-pointer transition-all active:scale-95 shadow-2xs font-sans text-sm text-stone-650 font-bold normal-case tracking-normal"
                            >
                                {showCollabCelebrate && <div className="collab-join-gradient-fill" />}
                                <div className="relative flex items-center gap-3">
                                <Brain size={19} className="text-stone-600 shrink-0" strokeWidth={1.5} />
                                <MindPowerStatus t={t} isSaving={isQuickGlow} />
                                </div>
                                <div className="w-28 h-2.5 bg-stone-200/70 rounded-full overflow-hidden relative ml-2">
                                    <div
                                        className="h-full bg-[#86BE7F] rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${levelProgress}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Mind Power panel — appears below the progress pill */}
                            {showTooltip && (
                                <div className="absolute top-14 left-1/2 mind-power-panel-enter z-50">
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#F5F4EE] border-l border-t border-stone-200/70 rotate-45 z-10" />
                                    <MindPowerPanel
                                        t={t}
                                        progressLevel={progressLevel}
                                        levelProgress={levelProgress}
                                        wordsTyped={wordsTyped}
                                    songsCompleted={songsCompleted}
                                        recordingMinutes={recordingMinutes}
                                        wordsGoal={L1_WORDS}
                                        completedLessonsCount={completedLessonsCount}
                                        lessonsGoal={L1_LESSONS}
                                        practiceMinutes={practiceMinutes}
                                        practiceGoal={L1_PRACTICE}
                                        communityCount={communityCount}
                                        communityGoal={L1_COMMUNITY}
                                        activeQuote={activeQuote}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Profile link — user's name. Hidden on Profile itself. */}
                        {!isProfile && (
                            <Link
                                href="/platform/profile"
                                className="flex items-center gap-1.5 bg-white/50 hover:bg-white/70 border border-stone-200/80 pl-5 pr-4 py-3 rounded-full transition-all active:scale-95 shadow-2xs text-stone-600 hover:text-stone-800 text-sm font-semibold normal-case tracking-normal"
                            >
                                {firstName}
                                <ChevronRight size={16} strokeWidth={1.5} />
                            </Link>
                        )}
                    </div>
                </header>

                {/* Main panel container */}
                <div className={`
                    flex-1
                    ${pathname?.startsWith('/platform/create')
                        // Frame (beige panel + padding) only from xl up — below that the
                        // canvas card claims the full width and the top gap itself.
                        ? 'bg-transparent xl:bg-[#FAF9F5] p-0 xl:p-8 rounded-none xl:rounded-[32px] shadow-none'
                        // overflow-x-hidden: setting only overflow-y makes overflow-x compute
                        // to auto, so page transitions that translate sideways (the profile's
                        // slide-out to the guide) would flash a horizontal scrollbar.
                        : 'overflow-y-auto overflow-x-hidden bg-[#F0F0EA] rounded-[24px] md:rounded-[32px] p-4 md:p-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.015)]'
                    }
                `}>
                    {/* Announcements published in the admin console. Above the
                        section rather than floating over it — a banner that covers
                        the thing you came for gets dismissed unread. Not on the
                        Create canvas, which is a full-bleed workspace with its own
                        banner region, the same exception the collab toasts make. */}
                    {!pathname?.startsWith('/platform/create') && <AnnouncementBanner />}
                    {children}
                </div>
            </div>

            <PlatformOnboarding />
        </div>
    );
}

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PlatformLayoutInner>{children}</PlatformLayoutInner>;
}