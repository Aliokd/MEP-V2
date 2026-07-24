"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import MaestroSidebar from './components/MaestroSidebar';
import SupportModal from './components/SupportModal';
import FeedbackModal from './components/FeedbackModal';
import MindPowerPanel from './components/MindPowerPanel';
import { useAuth } from '@/context/AuthContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { TreePine, Menu, User, Play, Pause, X, RotateCcw, Brain, ChevronRight } from 'lucide-react';
import Logo from '@/components/Logo';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

function PlatformLayoutInner({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    
    const [showProgressPopup, setShowProgressPopup] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    // Progress breakdowns and state values
    const [progressLevel, setProgressLevel] = useState(1);
    const [levelProgress, setLevelProgress] = useState(0); // 0-100% toward next level
    const [completedLessonsCount, setCompletedLessonsCount] = useState(0);

    // Create section sub-metrics
    const [wordsTyped, setWordsTyped] = useState(0);
    const [recordingMinutes, setRecordingMinutes] = useState(0);

    // Practice section sub-metrics
    const [practiceMinutes, setPracticeMinutes] = useState(0);

    // Community section sub-metrics (projects shared in Connect)
    const [communityCount, setCommunityCount] = useState(0);

    // Focus timer (simple on/off stopwatch shown in the Mind Power panel)
    const [focusSeconds, setFocusSeconds] = useState(0);
    const [isFocusRunning, setIsFocusRunning] = useState(false);
    const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Level milestone criteria (Level 1 → Level 2)
    const L1_WORDS   = 200;  // words
    const L1_LESSONS = 2;    // chapters checked
    const L1_PRACTICE = 30;  // minutes
    const L1_COMMUNITY = 2;  // projects shared

    const [showTooltip, setShowTooltip] = useState(false);
    const [activeQuote, setActiveQuote] = useState('Remember, small actions makes progress');
    const [showConfettiOverlay, setShowConfettiOverlay] = useState(false);
    const [showProgressGlow, setShowProgressGlow] = useState(false);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        setCompletedLessonsCount(lCount);
        setWordsTyped(words);
        setRecordingMinutes(recMins);
        setPracticeMinutes(pracMins);
    };

    // Community: how many projects the user has shared in Connect (Firestore-backed)
    const fetchCommunityCount = async () => {
        if (!user) return;
        try {
            const snapshot = await getCountFromServer(
                query(collection(db, 'connect_posts'), where('authorId', '==', user.uid))
            );
            setCommunityCount(snapshot.data().count);
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

    // Fetch the real Community count once the user is available
    useEffect(() => {
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
                // Show tooltip automatically
                setShowTooltip(true);
                if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = setTimeout(() => {
                    setShowTooltip(false);
                }, 6000);

                // Trigger the achievement glow border on every progress update
                setShowProgressGlow(true);
                if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
                glowTimeoutRef.current = setTimeout(() => {
                    setShowProgressGlow(false);
                }, 3400);

                // Confetti overlay trigger
                const isConfetti = localStorage.getItem('songwriting-progress-confetti');
                if (isConfetti === 'true') {
                    setShowConfettiOverlay(true);
                    safeLocalStorageSetItem('songwriting-progress-confetti', 'false');
                }
            }
        };

        window.addEventListener('songwriting-progress-updated', handleProgressUpdate);
        return () => {
            window.removeEventListener('songwriting-progress-updated', handleProgressUpdate);
            if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
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

    // Focus timer — simple on/off stopwatch, persisted across navigation/reloads
    useEffect(() => {
        const storedSeconds = parseInt(localStorage.getItem('mep-focus-timer-seconds') || '0');
        const storedRunning = localStorage.getItem('mep-focus-timer-running') === 'true';
        setFocusSeconds(storedSeconds);
        setIsFocusRunning(storedRunning);
    }, []);

    useEffect(() => {
        if (isFocusRunning) {
            focusIntervalRef.current = setInterval(() => {
                setFocusSeconds(prev => {
                    const next = prev + 1;
                    safeLocalStorageSetItem('mep-focus-timer-seconds', next.toString());
                    return next;
                });
            }, 1000);
        }
        return () => {
            if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
        };
    }, [isFocusRunning]);

    const toggleFocusTimer = () => {
        setIsFocusRunning(prev => {
            const next = !prev;
            safeLocalStorageSetItem('mep-focus-timer-running', next.toString());
            return next;
        });
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/signin');
        }
    }, [user, loading, router]);

    const [showWelcomeVideoModal, setShowWelcomeVideoModal] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [hasEnded, setHasEnded] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            const seen = localStorage.getItem('mep-welcome-video-seen');
            if (!seen) {
                setShowWelcomeVideoModal(true);
                if (pathname === '/platform') {
                    setIsRedirecting(true);
                    router.push('/platform/create');
                }
            }
        }
    }, [user, loading, pathname, router]);

    useEffect(() => {
        if (showWelcomeVideoModal && videoRef.current) {
            const playTimeout = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                        setHasEnded(false);
                    }).catch(err => {
                        console.log("Autoplay unmuted blocked, showing overlay:", err);
                        setIsPlaying(false);
                    });
                }
            }, 250);
            return () => clearTimeout(playTimeout);
        }
    }, [showWelcomeVideoModal]);

    const handleCloseWelcomeModal = () => {
        setShowWelcomeVideoModal(false);
        safeLocalStorageSetItem('mep-welcome-video-seen', 'true');
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
        setHasEnded(false);
    };

    const handleReplay = () => {
        setHasEnded(false);
        setIsPlaying(true);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(err => {
                console.error("Replay play failed:", err);
            });
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (hasEnded) {
                handleReplay();
                return;
            }
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play().then(() => {
                    setIsPlaying(true);
                    setHasEnded(false);
                }).catch(err => {
                    console.error("Video play failed:", err);
                });
            }
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#E4E4DF]">
            <div className="w-12 h-12 border-t-2 border-stone-900 rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    const firstName = (user.displayName || '').trim().split(' ')[0] || t('navigation.my_profile');

    return (
        <div className={`min-h-screen flex text-stone-900 font-sans selection:bg-stone-900/10 selection:text-stone-900 transition-colors duration-200 ${
            pathname?.startsWith('/platform/create') ? 'bg-[#FAF9F5] md:bg-[#E4E4DF]' : 'bg-[#E4E4DF]'
        }`}>

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
                            <h3 className="text-2xl font-bold text-stone-850">Outstanding effort!</h3>
                            <p className="text-sm text-stone-500 leading-normal">
                                You have achieved 100% of your songwriting progress. Your daily dedication to building visual stories and lyric concepts is paying off. Keep up this momentum!
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
                            Start next journey ➔
                        </button>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <MaestroSidebar 
                isMobileOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
                onSupportClick={() => setIsSupportOpen(true)}
                onFeedbackClick={() => setIsFeedbackOpen(true)}
            />

            <SupportModal 
                isOpen={isSupportOpen} 
                onClose={() => setIsSupportOpen(false)} 
            />

            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {/* Main Content Area */}
            <div className={`
                flex-1 flex flex-col min-w-0
                ${pathname?.startsWith('/platform/create')
                    ? 'p-0 md:p-8'
                    : 'p-4 md:p-8'
                }
            `}>
                {/* Mobile Top Header */}
                <header className={`flex md:hidden items-center justify-between px-6 pt-6 pb-4 text-stone-655 font-sans z-40 mb-0 relative transition-colors duration-205 ${
                    pathname?.startsWith('/platform/create') ? 'bg-[#F5F4EE] border-none' : 'bg-[#E4E4DF] border-b border-stone-250/20'
                }`}>
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 rounded-full hover:bg-stone-200/40 active:scale-95 transition-all text-stone-700 hover:text-stone-955"
                    >
                        <Menu size={22} className="stroke-[2.2]" />
                    </button>
                    
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
                        <Link href="/platform/create">
                            <Logo size="md" showBeta />
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/platform/profile"
                            className="p-2 -mr-2 rounded-full hover:bg-stone-200/40 active:scale-95 transition-all text-stone-700 hover:text-stone-955 flex items-center justify-center"
                        >
                            <User size={22} className="stroke-[2.2]" />
                        </Link>
                    </div>
                </header>

                {/* Mobile Progress Bar Bar */}
                <div className={`flex md:hidden items-center justify-center w-full px-6 pb-4 z-40 transition-colors duration-205 ${
                    pathname?.startsWith('/platform/create') ? 'bg-[#F5F4EE] border-none mb-0' : 'bg-[#E4E4DF] border-b border-stone-250/10 mb-4'
                }`}>
                    <div className="relative flex flex-col items-center w-full" ref={popupRef}>
                        {showProgressGlow && <div className="mind-power-glow-ring" />}
                        <div
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="relative flex items-center gap-3 w-full bg-white/50 border border-stone-200/40 px-5 py-3 rounded-[20px] select-none cursor-pointer transition-all active:scale-[0.99] shadow-2xs font-sans text-xs text-stone-500 font-medium normal-case"
                        >
                            <Brain size={16} className="text-stone-600 shrink-0" strokeWidth={1.5} />
                            <span className="font-semibold text-stone-600 shrink-0">{t('progress.mind_power_label')}</span>
                            <div className="flex-1 h-2.5 bg-stone-200/70 rounded-full overflow-hidden relative">
                                <div
                                    className="h-full bg-[#86BE7F] rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${levelProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Mind Power panel — appears below the progress pill */}
                        {showTooltip && (
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-top-1.5 duration-200 z-50">
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#F5F4EE] border-l border-t border-stone-200/70 rotate-45 z-10" />
                                <MindPowerPanel
                                    t={t}
                                    progressLevel={progressLevel}
                                    levelProgress={levelProgress}
                                    wordsTyped={wordsTyped}
                                    recordingMinutes={recordingMinutes}
                                    wordsGoal={L1_WORDS}
                                    completedLessonsCount={completedLessonsCount}
                                    lessonsGoal={L1_LESSONS}
                                    practiceMinutes={practiceMinutes}
                                    practiceGoal={L1_PRACTICE}
                                    communityCount={communityCount}
                                    communityGoal={L1_COMMUNITY}
                                    activeQuote={activeQuote}
                                    isFocusRunning={isFocusRunning}
                                    focusSeconds={focusSeconds}
                                    onToggleFocus={toggleFocusTimer}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Top Header */}
                <header className="hidden md:flex items-center justify-between px-8 pb-6 text-stone-600/70 font-sans text-xs tracking-wider z-40">
                    {/* Spacer */}
                    <div></div>
                    
                    {/* Centered navigation items: Progress Bar Capsule & Tooltip */}
                    <div className="flex items-center gap-3 font-medium">
                        <div className="relative flex flex-col items-center" ref={popupRef}>
                            {showProgressGlow && <div className="mind-power-glow-ring" />}
                            <div
                                onClick={() => setShowTooltip(!showTooltip)}
                                className="relative flex items-center gap-3 bg-white/50 hover:bg-white/70 border border-stone-200/80 px-6 py-3 rounded-full select-none cursor-pointer transition-all active:scale-95 shadow-2xs font-sans text-sm text-stone-650 font-bold normal-case tracking-normal"
                            >
                                <Brain size={19} className="text-stone-600 shrink-0" strokeWidth={1.5} />
                                <span className="font-semibold text-stone-600">{t('progress.mind_power_label')}</span>
                                <div className="w-28 h-3.5 bg-stone-200/70 rounded-full overflow-hidden relative">
                                    <div
                                        className="h-full bg-[#86BE7F] rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${levelProgress}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Mind Power panel — appears below the progress pill */}
                            {showTooltip && (
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-top-1.5 duration-200 z-50">
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#F5F4EE] border-l border-t border-stone-200/70 rotate-45 z-10" />
                                    <MindPowerPanel
                                        t={t}
                                        progressLevel={progressLevel}
                                        levelProgress={levelProgress}
                                        wordsTyped={wordsTyped}
                                        recordingMinutes={recordingMinutes}
                                        wordsGoal={L1_WORDS}
                                        completedLessonsCount={completedLessonsCount}
                                        lessonsGoal={L1_LESSONS}
                                        practiceMinutes={practiceMinutes}
                                        practiceGoal={L1_PRACTICE}
                                        communityCount={communityCount}
                                        communityGoal={L1_COMMUNITY}
                                        activeQuote={activeQuote}
                                        isFocusRunning={isFocusRunning}
                                        focusSeconds={focusSeconds}
                                        onToggleFocus={toggleFocusTimer}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Profile link — user's name */}
                        <Link
                            href="/platform/profile"
                            className="flex items-center gap-1.5 bg-white/50 hover:bg-white/70 border border-stone-200/80 pl-5 pr-4 py-3 rounded-full transition-all active:scale-95 shadow-2xs text-stone-600 hover:text-stone-800 text-sm font-semibold normal-case tracking-normal"
                        >
                            {firstName}
                            <ChevronRight size={16} strokeWidth={1.5} />
                        </Link>
                    </div>
                </header>

                {/* Main panel container */}
                <div className={`
                    flex-1
                    ${pathname?.startsWith('/platform/create')
                        ? 'bg-transparent md:bg-[#FAF9F5] p-0 md:p-8 rounded-none md:rounded-[32px] shadow-none'
                        : 'overflow-y-auto bg-[#F0F0EA] rounded-[24px] md:rounded-[32px] p-4 md:p-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.015)]'
                    }
                `}>
                    {isRedirecting ? (
                        <div className="w-full max-w-6xl mx-auto mt-0 mb-20 flex flex-col gap-4 animate-pulse">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-full border border-stone-200/60 rounded-[20px] p-6 bg-white/40 flex justify-between items-center h-24" />
                            ))}
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </div>

            {/* Welcome Video Overlay Modal */}
            {showWelcomeVideoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF9F5]/10 backdrop-blur-[16px] p-0 md:p-12 transition-all duration-500">
                    <button
                        onClick={handleCloseWelcomeModal}
                        className="fixed top-4 right-4 md:top-8 md:right-8 p-2.5 md:p-3 bg-white/80 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none rounded-full text-stone-900 hover:opacity-75 transition-all duration-200 cursor-pointer active:scale-95 z-[110]"
                        aria-label="Close welcome video"
                    >
                        <X className="w-6 h-6 md:w-8 md:h-8 stroke-[1.5]" />
                    </button>
                    
                    <div className="relative w-full max-w-full md:w-[80%] md:max-w-[80%] aspect-video bg-white rounded-none md:rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.12)] overflow-hidden flex items-center justify-center border-none md:border md:border-white/40">
                        <video
                            ref={videoRef}
                            src="/videos/Welcome%20-%20onboarding/Welcome_V3.mp4"
                            className="w-full h-full block object-cover bg-white"
                            onClick={togglePlay}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => {
                                setIsPlaying(false);
                                setHasEnded(true);
                            }}
                            controls={isPlaying && !hasEnded}
                            playsInline
                        />
                        
                        {!isPlaying && !hasEnded && (
                            <div 
                                onClick={togglePlay}
                                className="absolute inset-0 flex items-center justify-center bg-white cursor-pointer group transition-all duration-300 z-10"
                            >
                                <Play className="w-24 h-24 md:w-32 md:h-32 fill-stone-200 text-stone-200 stroke-none group-hover:scale-105 transition-all duration-300" />
                            </div>
                        )}

                        {hasEnded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 p-8 text-center animate-in fade-in duration-300">
                                <button
                                    onClick={handleReplay}
                                    className="p-4 text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-all cursor-pointer active:scale-95 flex items-center justify-center mb-6 border border-stone-150 bg-stone-50/50 shadow-xs"
                                    aria-label="Replay video"
                                    title="Replay video"
                                >
                                    <RotateCcw className="w-8 h-8 stroke-[1.5]" />
                                </button>
                                
                                <button
                                    onClick={handleCloseWelcomeModal}
                                    className="w-full sm:w-auto px-16 py-4 bg-[#87b884] hover:bg-[#7cb378] active:bg-[#6fa06b] text-[#1c331a] text-base font-semibold rounded-full transition-all shadow-md hover:shadow-lg shadow-[#87b884]/20 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    Start now
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LanguageProvider>
            <PlatformLayoutInner>{children}</PlatformLayoutInner>
        </LanguageProvider>
    );
}