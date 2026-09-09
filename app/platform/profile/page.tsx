"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Music, Users, ArrowRight, Camera, LogOut, PlayCircle, LifeBuoy, SlidersHorizontal, Pencil, X, Eye } from 'lucide-react';
import SupportModal from '../components/SupportModal';
import MaxUpgradeModal from '../components/MaxUpgradeModal';
import VerifiedMark from '../components/VerifiedMark';
import VerifyModal from './components/VerifyModal';
import { useIsVerified, useVerificationRequest } from '@/lib/verification';
import { useUserPlan } from '@/lib/useUserPlan';
import SongCards from './components/SongCards';
import ConnectionList, { PendingRequests, useConnectionPeople } from './components/ConnectionList';
import { useMySongs, leaveProfileTo, openSongInCreate, formatSongDate } from './useMySongs';
import { resetGuide } from '@/lib/onboardingGuide';
import { writePublicProfile, fetchPublicProfiles } from '@/lib/publicProfile';
import * as btn from '@/app/platform/components/buttonStyles';

/** How many recent songs / connections the profile shelf shows before "More". */
const RECENT_SONGS = 4;
const RECENT_CONNECTIONS = 4;

/** The panels this page is built from — white cards on the platform's ground. */
const CARD = 'rounded-[16px] bg-white/40 border border-stone-200/70';

/**
 * The profile: who you are, what you've made, who you know, and the four things
 * you might want to do next.
 *
 * Everything adjustable — your name and email, verification, display size,
 * subscription, language — lives in Settings. This page had grown into a
 * settings screen with an avatar on top; the split keeps it about the person.
 */
export default function ProfilePage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoNotice, setPhotoNotice] = useState('');
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [showMaxUpgrade, setShowMaxUpgrade] = useState(false);
    const [showVerify, setShowVerify] = useState(false);
    // Per visit, deliberately not remembered: the pitch opens in full every time
    // the profile is loaded, and closing it only collapses it for this visit.
    const [verifyPitchMinimized, setVerifyPitchMinimized] = useState(false);
    // Whether this account is listed in Connect. Null until the public profile
    // answers, so the switch never flickers from a guessed position.
    const [isDiscoverable, setIsDiscoverable] = useState<boolean | null>(null);

    const photoInputRef = useRef<HTMLInputElement>(null);
    const photoNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { hasMax, hasPro } = useUserPlan();
    const isVerified = useIsVerified(user?.uid ?? null);
    const { request: verification } = useVerificationRequest(user?.uid ?? null);
    const { songs, songsLoaded } = useMySongs(user, t);
    const { people, peopleLoaded, disconnect, requesters, accept, decline } = useConnectionPeople(user);

    // Warm the Create route so the swap after the slide-out isn't a cold load.
    useEffect(() => { router.prefetch('/platform/create'); }, [router]);

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setEmail(user.email || '');
            setPhotoUrl(user.photoURL || '');
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            try {
                const profiles = await fetchPublicProfiles([user.uid]);
                if (!cancelled) setIsDiscoverable(profiles[user.uid]?.discoverable ?? true);
            } catch {
                if (!cancelled) setIsDiscoverable(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const showPhotoNotice = (msg: string) => {
        setPhotoNotice(msg);
        if (photoNoticeTimerRef.current) clearTimeout(photoNoticeTimerRef.current);
        photoNoticeTimerRef.current = setTimeout(() => setPhotoNotice(''), 4000);
    };

    /**
     * Centre-crop to a square and downscale before upload — the avatar renders
     * at 80px, so shipping a camera-sized original would waste storage and
     * every later page load.
     */
    const resizeAvatar = (file: File, size = 512): Promise<Blob> =>
        new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const side = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = Math.min(size, side);
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('no canvas context')); return; }
                ctx.drawImage(
                    img,
                    (img.width - side) / 2, (img.height - side) / 2, side, side,
                    0, 0, canvas.width, canvas.height
                );
                canvas.toBlob(
                    blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
                    'image/jpeg',
                    0.85
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('image load failed'));
            };
            img.src = objectUrl;
        });

    const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Allow re-selecting the same file after a failed attempt.
        e.target.value = '';
        if (!file || !user) return;
        if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
            showPhotoNotice(t('profile.photo_invalid'));
            return;
        }

        setIsUploadingPhoto(true);
        try {
            const blob = await resizeAvatar(file);

            // Playwright mock accounts have no Storage access — keep the photo
            // local, same as the mocked name/email updates.
            const mockUserJson = localStorage.getItem('playwright_mock_user');
            if (mockUserJson) {
                const dataUrl: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(blob);
                });
                const mockUser = JSON.parse(mockUserJson);
                mockUser.photoURL = dataUrl;
                safeLocalStorageSetItem('playwright_mock_user', JSON.stringify(mockUser));
                setPhotoUrl(dataUrl);
                showPhotoNotice(t('profile.photo_updated'));
                return;
            }

            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const { updateProfile } = await import('firebase/auth');
            const { doc, setDoc } = await import('firebase/firestore');
            const { auth, storage, db } = await import('@/lib/firebase');
            if (!auth.currentUser) return;

            // A fixed path per user: re-uploading replaces the old file, so
            // stale avatars don't pile up in the bucket.
            const avatarRef = ref(storage, `users/${user.uid}/profile/avatar.jpg`);
            await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
            const url = await getDownloadURL(avatarRef);

            await updateProfile(auth.currentUser, { photoURL: url });
            // Mirror onto the users doc (like name/email) so other surfaces —
            // connections, collab — can show the avatar without an Auth lookup.
            setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true }).catch(console.error);
            // And onto the public profile, which is what those other surfaces
            // actually read now that users/{uid} is private.
            void writePublicProfile(user.uid, { photoURL: url });

            setPhotoUrl(url);
            showPhotoNotice(t('profile.photo_updated'));
        } catch (error) {
            console.error('Error updating profile photo:', error);
            showPhotoNotice(t('profile.photo_error'));
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    if (!user) return null;

    /*
     * The pitch only runs when there is something to pitch: not already verified
     * and nothing under review (they have applied — telling them to apply reads
     * as the app forgetting). A declined request brings it back, since trying
     * again is the point.
     */
    const showVerifyPitch = !isVerified && verification?.status !== 'pending';

    /* "Ali, you aren't verified yet" — the phrase carries no capital of its own,
       so it takes one when there is no name to put in front of it. */
    const verifyPhrase = t('profile.verify_banner_title');
    const firstName = (name || '').trim().split(/\s+/)[0];
    const verifyHeadline = firstName
        ? `${firstName}, ${verifyPhrase}`
        : verifyPhrase.charAt(0).toUpperCase() + verifyPhrase.slice(1);

    /* Closing it doesn't end the offer, it just stops it taking the page: the
       pitch collapses to a single line that still carries the way in, and comes
       back in full on the next visit. */
    const dismissVerifyBanner = () => setVerifyPitchMinimized(true);

    /** Listed or not in Connect's roster. Optimistic — it is one boolean. */
    const togglePublicProfile = async () => {
        if (isDiscoverable === null) return;
        const next = !isDiscoverable;
        setIsDiscoverable(next);
        try {
            await writePublicProfile(user.uid, { discoverable: next });
        } catch (error) {
            console.error('Error updating profile visibility:', error);
            setIsDiscoverable(!next);
        }
    };

    /*
     * Replaying the guide slides the profile away to reveal the Create canvas the
     * guide runs on, rather than hard-cutting to it.
     *
     * resetGuide only touches local storage (see its note on why it deliberately
     * leaves the account's "seen" stamp alone), so the slide can start immediately.
     */
    const handleReplayGuide = () => {
        void resetGuide(user.uid);
        leaveProfileTo('/platform/create');
    };

    const handleSignOut = async () => {
        try {
            const { signOut } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase');
            await signOut(auth);
            router.push('/signin');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    /** The four things to do next, each its own card with an arrow. */
    const ActionRow = ({
        label,
        icon,
        onClick,
        muted = false,
    }: { label: string; icon: React.ReactNode; onClick: () => void; muted?: boolean }) => (
        <button
            onClick={onClick}
            className={`${CARD} group w-full flex items-center justify-between gap-4 px-5 md:px-6 py-4 text-left transition-all hover:bg-white hover:shadow-[0_2px_10px_rgba(0,0,0,0.04)] active:scale-[0.997] cursor-pointer`}
        >
            <span className={`flex items-center gap-3 font-sans text-[15px] font-medium ${muted ? 'text-stone-500' : 'text-stone-800'}`}>
                <span className={muted ? 'text-stone-400' : 'text-stone-500'}>{icon}</span>
                {label}
            </span>
            <ArrowRight
                size={17}
                strokeWidth={2}
                className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${muted ? 'text-stone-300' : 'text-stone-400'}`}
            />
        </button>
    );

    return (
        <div className="space-y-4 px-5 md:px-0 text-stone-900 font-sans">

            {/* Not verified yet — the pitch, on the brand's paper beige rather
                than a dark slab, so it sits in the page instead of interrupting
                it. Hidden once the seal is theirs and while a request is under
                review; closing it leaves the one-line version below. */}
            {showVerifyPitch && verifyPitchMinimized && (
                <section className="rounded-[16px] bg-[#E6E3DB] text-stone-900 px-5 md:px-6 py-3 flex items-center justify-between gap-4">
                    <p className="text-[14.5px] font-sans font-medium tracking-tight flex items-center gap-2 min-w-0">
                        <span className="truncate">{verifyHeadline}</span>
                        <VerifiedMark size={16} label={t('profile.verified_label')} />
                    </p>
                    <button
                        onClick={() => setShowVerify(true)}
                        aria-haspopup="dialog"
                        className="shrink-0 whitespace-nowrap rounded-full bg-[#86BE7F] px-4 py-2 text-[13px] font-semibold text-stone-900 hover:bg-[#7cb378] transition-colors cursor-pointer active:scale-[0.98]"
                    >
                        {t('profile.get_verified_action')}
                    </button>
                </section>
            )}

            {showVerifyPitch && !verifyPitchMinimized && (
                <section className="relative rounded-[16px] bg-[#E6E3DB] text-stone-900 p-6 md:p-8 overflow-hidden">
                    <button
                        onClick={dismissVerifyBanner}
                        aria-label={t('common.close')}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-900/5 transition-colors cursor-pointer"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>

                    <h3 className="text-xl md:text-2xl font-sans font-semibold tracking-tight pr-10 flex items-center gap-2 flex-wrap">
                        {verifyHeadline}
                        <VerifiedMark size={20} label={t('profile.verified_label')} />
                    </h3>
                    <p className="mt-2 text-[14.5px] text-stone-600 leading-relaxed max-w-xl">
                        {t('profile.verify_banner_desc')}
                    </p>
                    {/* Green fill, dark ink on top — the platform's primary button. */}
                    <button
                        onClick={() => setShowVerify(true)}
                        aria-haspopup="dialog"
                        className="mt-5 rounded-full bg-[#86BE7F] px-6 py-3 text-[15px] font-semibold text-stone-900 hover:bg-[#7cb378] transition-colors cursor-pointer active:scale-[0.98]"
                    >
                        {t('profile.get_verified_action')}
                    </button>
                </section>
            )}

            {/* Identity */}
            {/* A thin frame, so the photo carries the card rather than floating in
                it. Literal 5% padding would resolve against the card's *width* —
                about 50px on a full-width card, the opposite of thin — so this is
                the same slim proportion expressed against its height. */}
            <section className={`${CARD} p-3 md:p-4`}>
                <div className="flex items-start gap-4 md:gap-5">
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelected}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        aria-label={t('profile.change_photo')}
                        title={t('profile.change_photo')}
                        className={`relative w-24 h-24 md:w-[120px] md:h-[120px] rounded-[20px] overflow-hidden flex items-center justify-center text-4xl font-sans text-[#DCDDD4] font-medium shrink-0 group/avatar cursor-pointer ${
                            // The dark tile is the backdrop for the initial. With a photo
                            // the card shows through the frame instead.
                            photoUrl ? '' : 'bg-stone-900'
                        }`}
                    >
                        {photoUrl ? (
                            // A 5% frame on three sides only — top, left and bottom — with
                            // the photo running out to the right edge, where the tile's own
                            // rounded corner clips it. The width and height are spelled out
                            // because insets alone do not size a replaced element: an <img>
                            // keeps its intrinsic size and overflows the box instead
                            // (measured: 4px past the corner at 80px).
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={photoUrl} alt="" className="absolute top-[5%] bottom-[5%] left-[5%] right-0 w-[95%] h-[90%] rounded-[14px] object-cover pointer-events-none" />
                        ) : (
                            (name || email).charAt(0).toUpperCase() || '·'
                        )}
                        {/* Hover veil with camera — the only hint needed that this is
                            editable. Sits exactly over the photo, frame included out. */}
                        <span className={`absolute flex items-center justify-center transition-opacity duration-200 ${
                            photoUrl
                                ? 'top-[5%] bottom-[5%] left-[5%] right-0 rounded-[14px]'
                                : 'inset-0 rounded-[18px]'
                        } ${
                            isUploadingPhoto
                                ? 'bg-stone-950/60 opacity-100'
                                : 'bg-stone-950/45 opacity-0 group-hover/avatar:opacity-100'
                        }`}>
                            {isUploadingPhoto ? (
                                <span className="w-5 h-5 border-2 border-[#DCDDD4]/40 border-t-[#DCDDD4] rounded-full animate-spin" />
                            ) : (
                                <Camera size={20} strokeWidth={2} className="text-[#DCDDD4]" />
                            )}
                        </span>
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl md:text-2xl font-sans font-medium tracking-tight text-stone-900 truncate">
                                        {name || email}
                                    </h2>
                                    {isVerified && <VerifiedMark size={18} label={t('profile.verified_label')} />}
                                </div>
                                <p className="text-stone-600 text-[13px] mt-0.5 truncate">{email}</p>
                            </div>

                            {/* Plan, and the way up from it. Pro and Max are brand names
                                and stay untranslated; the badge is hidden entirely for an
                                account that holds neither. */}
                            <div className="flex items-center gap-3 shrink-0">
                                {(hasMax || hasPro) && (
                                    <span className="rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-bold text-[#DCDDD4] leading-none">
                                        {hasMax ? 'Max' : 'Pro'}
                                    </span>
                                )}
                                {!hasMax && (
                                    <button
                                        onClick={() => setShowMaxUpgrade(true)}
                                        aria-haspopup="dialog"
                                        className="group flex items-center gap-1 text-[13px] font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                                    >
                                        {t('profile.upgrade_short')}
                                        <ArrowRight size={13} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                            <button
                                onClick={() => router.push('/platform/profile/settings')}
                                className="flex items-center gap-1.5 text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                            >
                                <Pencil size={13} strokeWidth={2} />
                                {t('profile.edit_action')}
                            </button>

                            {/* A real switch: off takes this account out of Connect's
                                roster. Disabled until the stored value has arrived. */}
                            <button
                                role="switch"
                                aria-checked={isDiscoverable === true}
                                aria-label={t('profile.public_profile_switch')}
                                disabled={isDiscoverable === null}
                                onClick={togglePublicProfile}
                                className="flex items-center gap-2 text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
                            >
                                <span className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                                    isDiscoverable ? 'bg-[#86BE7F]' : 'bg-stone-300'
                                }`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                                        isDiscoverable ? 'left-[18px]' : 'left-0.5'
                                    }`} />
                                </span>
                                {t('profile.public_profile_switch')}
                            </button>

                            {/* The switch says whether people can find you; this says
                                what they find. Their view of you, not yours. */}
                            <button
                                onClick={() => router.push(`/platform/profile/u/${user.uid}`)}
                                className="flex items-center gap-1.5 text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                            >
                                <Eye size={13} strokeWidth={2} />
                                {t('profile.view_action')}
                            </button>
                        </div>

                        {photoNotice && (
                            <p className="text-[13px] text-stone-600 font-medium mt-2 animate-in fade-in duration-200">{photoNotice}</p>
                        )}
                    </div>
                </div>
            </section>

            {/* My songs */}
            <section className={`${CARD} p-5 md:p-6 space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[15px] font-sans font-medium text-stone-800">
                        {t('profile.my_songs')}
                        {songsLoaded && songs.length > 0 && (
                            <span className="ml-2 text-[13px] font-normal text-stone-400">{songs.length}</span>
                        )}
                    </h3>
                    {songsLoaded && songs.length > 0 && (
                        <button
                            onClick={() => router.push('/platform/profile/songs')}
                            className="group flex items-center gap-1 text-[13px] font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                        >
                            {t('profile.see_more')}
                            <ArrowRight size={13} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>

                {!songsLoaded && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="h-36 rounded-[14px] bg-stone-200/40 animate-pulse" />
                        ))}
                    </div>
                )}

                {songsLoaded && songs.length === 0 && (
                    <div className="py-2 flex flex-col items-start gap-3">
                        <p className="text-[13px] text-stone-600">{t('profile.no_songs')}</p>
                        <button
                            onClick={() => leaveProfileTo('/platform/create')}
                            className={`${btn.secondary('xs')} cursor-pointer`}
                        >
                            <Music size={14} />
                            {t('profile.no_songs_cta')}
                        </button>
                    </div>
                )}

                {songsLoaded && songs.length > 0 && (
                    <SongCards
                        songs={songs.slice(0, RECENT_SONGS)}
                        t={t}
                        formatDate={(ms) => formatSongDate(language, ms)}
                        onOpenInCreate={(songId) => openSongInCreate(user.uid, songId)}
                        gridClassName="grid-cols-2 sm:grid-cols-4"
                        ownerName={user.displayName || user.email || ''}
                    />
                )}
            </section>

            {/* My connections */}
            <section className={`${CARD} p-5 md:p-6 space-y-3`}>
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[15px] font-sans font-medium text-stone-800">
                        {t('profile.connections')}
                        {peopleLoaded && people.length > 0 && (
                            <span className="ml-2 text-[13px] font-normal text-stone-400">{people.length}</span>
                        )}
                    </h3>
                    {peopleLoaded && people.length > 0 && (
                        <button
                            onClick={() => router.push('/platform/profile/connections')}
                            className="group flex items-center gap-1 text-[13px] font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                        >
                            {t('profile.see_more')}
                            <ArrowRight size={13} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>

                {/* Anyone waiting on an answer comes first — it's the only thing
                    in this section that needs acting on. */}
                <PendingRequests requesters={requesters} t={t} onAccept={accept} onDecline={decline} />

                {!peopleLoaded && (
                    <div className="space-y-3 py-1">
                        {[0, 1].map(i => (
                            <div key={i} className="h-12 rounded-[12px] bg-stone-200/40 animate-pulse" />
                        ))}
                    </div>
                )}

                {peopleLoaded && people.length === 0 && requesters.length === 0 && (
                    <div className="py-2 flex flex-col items-start gap-3">
                        <p className="text-[13px] text-stone-600">{t('profile.no_connections')}</p>
                        <button
                            onClick={() => leaveProfileTo('/platform/connect')}
                            className={`${btn.secondary('xs')} cursor-pointer`}
                        >
                            <Users size={14} />
                            {t('profile.no_connections_cta')}
                        </button>
                    </div>
                )}

                {peopleLoaded && people.length > 0 && (
                    <ConnectionList
                        connections={people.slice(0, RECENT_CONNECTIONS)}
                        t={t}
                        onDisconnect={disconnect}
                    />
                )}
            </section>

            <ActionRow
                label={t('profile.demo_title')}
                icon={<PlayCircle size={17} strokeWidth={2} />}
                onClick={handleReplayGuide}
            />
            <ActionRow
                label={t('profile.support_row_title')}
                icon={<LifeBuoy size={17} strokeWidth={2} />}
                onClick={() => setIsSupportOpen(true)}
            />
            <ActionRow
                label={t('profile.settings_title')}
                icon={<SlidersHorizontal size={17} strokeWidth={2} />}
                onClick={() => router.push('/platform/profile/settings')}
            />
            <ActionRow
                label={t('navigation.logout')}
                icon={<LogOut size={17} strokeWidth={2} />}
                onClick={handleSignOut}
                muted
            />

            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
            <VerifyModal
                isOpen={showVerify}
                onClose={() => setShowVerify(false)}
                uid={user.uid}
                name={name}
                photoURL={photoUrl}
                initialBio={verification?.bio}
                t={t}
            />
            <MaxUpgradeModal
                isOpen={showMaxUpgrade}
                onClose={() => setShowMaxUpgrade(false)}
                reason={t('connect.pro.modal_subtitle')}
            />
        </div>
    );
}
