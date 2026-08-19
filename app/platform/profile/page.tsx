"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { User, Mail, PlayCircle, Music, Users, ArrowRight, ArrowUpRight, Camera } from 'lucide-react';
import SupportModal from '../components/SupportModal';
import MaxUpgradeModal from '../components/MaxUpgradeModal';
import { useUserPlan } from '@/lib/useUserPlan';
import SongCards from './components/SongCards';
import ConnectionList, { useConnectionPeople } from './components/ConnectionList';
import { useMySongs, leaveProfileTo, openSongInCreate, formatSongDate } from './useMySongs';
import { resetGuide } from '@/lib/onboardingGuide';
import { writePublicProfile } from '@/lib/publicProfile';

/** How many recent songs / connections the profile shelf shows before "See all". */
const RECENT_SONGS = 6;
const RECENT_CONNECTIONS = 5;

export default function ProfilePage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [verificationState, setVerificationState] = useState<'idle' | 'pending' | 'success'>('idle');
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [showMaxUpgrade, setShowMaxUpgrade] = useState(false);
    const { hasMax } = useUserPlan();
    const [notification, setNotification] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    // Separate from `notification` (which renders down in the details form) so
    // photo feedback appears beside the avatar it concerns.
    const [photoNotice, setPhotoNotice] = useState('');
    const photoInputRef = useRef<HTMLInputElement>(null);
    const photoNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);

    const showPhotoNotice = (msg: string) => {
        setPhotoNotice(msg);
        if (photoNoticeTimerRef.current) clearTimeout(photoNoticeTimerRef.current);
        photoNoticeTimerRef.current = setTimeout(() => setPhotoNotice(''), 4000);
    };
    const { songs, songsLoaded } = useMySongs(user, t);
    const { people, peopleLoaded, disconnect } = useConnectionPeople(user);

    // Warm the Create route so the swap after the slide-out isn't a cold load.
    useEffect(() => { router.prefetch('/platform/create'); }, [router]);

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setEmail(user.email || '');
            setPhotoUrl(user.photoURL || '');
        }
    }, [user]);

    const leaveTo = leaveProfileTo;
    const handleOpenSong = (songId: string) => {
        if (user) openSongInCreate(user.uid, songId);
    };
    const formatDate = (ms: number) => formatSongDate(language, ms);

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

    // Safety check just in case, though layout handles it
    if (!user) return null;

    const hasNameChanged = name !== (user.displayName || '');
    const hasEmailChanged = email !== (user.email || '');
    const hasChanges = hasNameChanged || hasEmailChanged;

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(''), 4000);
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
        leaveTo('/platform/create');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (hasEmailChanged) {
            setPendingEmail(email);
            setVerificationState('pending');
            if (hasNameChanged) {
                await updateDisplayName(name);
            }
        } else if (hasNameChanged) {
            await updateDisplayName(name);
            showNotification('Display name updated successfully.');
        }
    };

    const updateDisplayName = async (newDisplayName: string) => {
        try {
            const mockUserJson = localStorage.getItem('playwright_mock_user');
            if (mockUserJson) {
                const mockUser = JSON.parse(mockUserJson);
                mockUser.displayName = newDisplayName;
                safeLocalStorageSetItem('playwright_mock_user', JSON.stringify(mockUser));
                return;
            }

            const { updateProfile } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase');
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newDisplayName });
                // Keep the name other people see in step with the one this user
                // just set — the collaborator list and Connect roster read the
                // public profile, not the Auth record.
                void writePublicProfile(auth.currentUser.uid, { name: newDisplayName });
            }
        } catch (error) {
            console.error("Error updating display name:", error);
            showNotification('Failed to update display name.');
        }
    };

    const handleCompleteVerification = async () => {
        try {
            const mockUserJson = localStorage.getItem('playwright_mock_user');
            if (mockUserJson) {
                const mockUser = JSON.parse(mockUserJson);
                mockUser.email = pendingEmail;
                safeLocalStorageSetItem('playwright_mock_user', JSON.stringify(mockUser));
            } else {
                const { updateEmail } = await import('firebase/auth');
                const { auth } = await import('@/lib/firebase');
                if (auth.currentUser) {
                    await updateEmail(auth.currentUser, pendingEmail);
                }
            }

            setVerificationState('success');
            setEmail(pendingEmail);
            showNotification('Email updated successfully.');
            
            setTimeout(() => {
                setVerificationState('idle');
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error("Error updating email:", error);
            showNotification(t('profile.error_update_email'));
        }
    };

    return (
        <div className="space-y-10 text-stone-900 font-sans">
            <div className="grid lg:grid-cols-3 gap-12">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Identity */}
                    <div className="flex items-center gap-5">
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
                            className="relative w-20 h-20 rounded-full overflow-hidden bg-stone-900 flex items-center justify-center text-3xl font-sans text-[#DCDDD4] font-medium shrink-0 group/avatar cursor-pointer"
                        >
                            {photoUrl ? (
                                // Absolutely positioned to fill the circle — as a flex child the
                                // img could get sized by its intrinsic dimensions instead.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                            ) : (
                                name.charAt(0) || 'M'
                            )}
                            {/* Hover veil with camera — the only hint needed that this is editable */}
                            <span className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity duration-200 ${
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
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl font-sans font-semibold text-stone-900">{name || 'Maestro'}</h2>
                                {/* Plan badge — the plan card's job moved up here; Pro/Max are
                                    brand names and stay untranslated. */}
                                <span className="rounded-full bg-[#86BE7F]/20 px-2.5 py-1 text-[10px] font-bold text-[#3f6b3a] leading-none shrink-0">
                                    {hasMax ? 'Max' : 'Pro'}
                                </span>
                            </div>
                            <p className="text-stone-500 text-xs font-medium mt-1">{email}</p>
                            {photoNotice && (
                                <p className="text-xs text-stone-500 font-medium mt-1 animate-in fade-in duration-200">{photoNotice}</p>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-stone-200/60" />

                    {/* My songs — the most recent few; the arrow opens the full collection */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-sans font-semibold text-stone-700">
                                {t('profile.my_songs')}
                                {songsLoaded && songs.length > 0 && (
                                    <span className="ml-2 text-xs font-medium text-stone-400">{songs.length}</span>
                                )}
                            </h3>
                            {songsLoaded && songs.length > 0 && (
                                <button
                                    onClick={() => router.push('/platform/profile/songs')}
                                    className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer group/all"
                                >
                                    {t('profile.see_all')}
                                    <ArrowRight size={13} strokeWidth={2.2} className="group-hover/all:translate-x-0.5 transition-transform" />
                                </button>
                            )}
                        </div>

                        {!songsLoaded && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-1">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="h-44 rounded-[20px] bg-stone-200/40 animate-pulse" />
                                ))}
                            </div>
                        )}

                        {songsLoaded && songs.length === 0 && (
                            <div className="py-6 flex flex-col items-start gap-3">
                                <p className="text-xs text-stone-500">{t('profile.no_songs')}</p>
                                <button
                                    onClick={() => leaveTo('/platform/create')}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-xs font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
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
                                formatDate={formatDate}
                                onOpenInCreate={handleOpenSong}
                            />
                        )}
                    </div>

                    <div className="h-px bg-stone-200/60" />

                    {/* Connections — the most recent few; the arrow opens the full list */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-sans font-semibold text-stone-700">
                                {t('profile.connections')}
                                {peopleLoaded && people.length > 0 && (
                                    <span className="ml-2 text-xs font-medium text-stone-400">{people.length}</span>
                                )}
                            </h3>
                            {peopleLoaded && people.length > 0 && (
                                <button
                                    onClick={() => router.push('/platform/profile/connections')}
                                    className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer group/all"
                                >
                                    {t('profile.see_all')}
                                    <ArrowRight size={13} strokeWidth={2.2} className="group-hover/all:translate-x-0.5 transition-transform" />
                                </button>
                            )}
                        </div>

                        {!peopleLoaded && (
                            <div className="space-y-3 py-1">
                                {[0, 1].map(i => (
                                    <div key={i} className="h-12 rounded-[12px] bg-stone-200/40 animate-pulse" />
                                ))}
                            </div>
                        )}

                        {peopleLoaded && people.length === 0 && (
                            <div className="py-6 flex flex-col items-start gap-3">
                                <p className="text-xs text-stone-500">{t('profile.no_connections')}</p>
                                <button
                                    onClick={() => leaveTo('/platform/connect')}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-xs font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
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
                    </div>

                    <div className="h-px bg-stone-200/60" />

                    {/* Details form */}
                    {verificationState === 'idle' && (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs text-stone-400 font-medium">{t('profile.display_name')}</label>
                                    <div className="flex items-center gap-2.5 border-b border-stone-300 focus-within:border-stone-500 transition-colors py-2">
                                        <User size={15} className="text-stone-400" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('profile.placeholder_name')}
                                            className="bg-transparent border-none outline-none w-full font-medium text-stone-800 p-0 focus:ring-0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-stone-400 font-medium">{t('profile.email')}</label>
                                    <div className="flex items-center gap-2.5 border-b border-stone-300 focus-within:border-stone-500 transition-colors py-2">
                                        <Mail size={15} className="text-stone-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-transparent border-none outline-none w-full font-medium text-stone-800 p-0 focus:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>
                            {hasChanges && (
                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-stone-900 text-[#DCDDD4] hover:bg-stone-800 text-xs font-semibold rounded-full transition-all cursor-pointer"
                                    >
                                        {t('profile.save_details')}
                                    </button>
                                </div>
                            )}
                            {notification && (
                                <p className="text-xs text-stone-500 font-medium animate-in fade-in duration-200">{notification}</p>
                            )}
                        </form>
                    )}

                    {verificationState === 'pending' && (
                        <div className="space-y-4 py-2 border-l-2 border-stone-300 pl-4 animate-in fade-in duration-200">
                            <p className="text-sm font-semibold text-stone-800">{t('profile.verify_title')}</p>
                            <p className="text-xs text-stone-500 leading-relaxed font-medium">
                                {t('profile.verify_sent')} <span className="font-semibold text-stone-700">{pendingEmail}</span>{t('profile.verify_sent_end')}
                            </p>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <a
                                    href="https://mail.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 text-stone-700 text-xs font-semibold rounded-full transition-all"
                                >
                                    {t('profile.open_gmail')}
                                </a>
                                <button
                                    onClick={handleCompleteVerification}
                                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200/60 border border-stone-200 text-stone-700 text-xs font-semibold rounded-full transition-all cursor-pointer"
                                >
                                    {t('profile.simulate_click')}
                                </button>
                                <button
                                    onClick={() => {
                                        setVerificationState('idle');
                                        setEmail(user.email || '');
                                    }}
                                    className="px-4 py-2 text-stone-500 hover:text-stone-700 text-xs font-semibold transition-all cursor-pointer"
                                >
                                    {t('profile.cancel')}
                                </button>
                            </div>
                        </div>
                    )}

                    {verificationState === 'success' && (
                        <div className="py-2 border-l-2 border-emerald-500 pl-4 animate-in fade-in duration-200">
                            <p className="text-sm font-semibold text-emerald-700">✓ {t('profile.success_title')}</p>
                            <p className="text-xs text-emerald-600 font-medium mt-1">{t('profile.success_desc')} {email}{t('profile.returning_platform')}</p>
                        </div>
                    )}

                    <div className="h-px bg-stone-200/60" />

                    {/* Preferences */}
                    <div className="space-y-1">
                        <h3 className="text-sm font-sans font-semibold text-stone-700 mb-3">{t('profile.preferences')}</h3>
                        <div className="flex items-center justify-between py-4 border-b border-stone-200/60">
                            <div className="space-y-0.5">
                                <p className="font-sans text-sm font-medium text-stone-800">{t('profile.notifications_title')}</p>
                                <p className="text-xs text-stone-500">{t('profile.notifications_desc')}</p>
                            </div>
                            <div className="w-10 h-6 bg-stone-900/10 rounded-full relative shrink-0 ml-4">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-stone-900 rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-4 border-b border-stone-200/60">
                            <div className="space-y-0.5">
                                <p className="font-sans text-sm font-medium text-stone-800">{t('profile.public_profile_title')}</p>
                                <p className="text-xs text-stone-500">{t('profile.public_profile_desc')}</p>
                            </div>
                            <div className="w-10 h-6 bg-stone-200 rounded-full relative shrink-0 ml-4">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-stone-400 rounded-full" />
                            </div>
                        </div>
                        {/* One row, not two: the guide already opens with the welcome
                            video and continues into the Create tour. */}
                        <div className="flex items-center justify-between py-4 border-b border-stone-200/60">
                            <div className="space-y-0.5">
                                <p className="font-sans text-sm font-medium text-stone-800">{t('profile.demo_title')}</p>
                                <p className="text-xs text-stone-500">{t('profile.demo_desc')}</p>
                            </div>
                            <button
                                onClick={handleReplayGuide}
                                className="flex items-center gap-1.5 shrink-0 ml-4 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-xs font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
                            >
                                <PlayCircle size={14} />
                                {t('profile.demo_action')}
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-4 border-b border-stone-200/60">
                            <div className="space-y-0.5">
                                <p className="font-sans text-sm font-medium text-stone-800">{t('profile.manage_subscription')}</p>
                                <p className="text-xs text-stone-500">{t('profile.manage_subscription_desc')}</p>
                            </div>
                            <button
                                className="shrink-0 ml-4 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-xs font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
                            >
                                {t('profile.manage_action')}
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-4">
                            <div className="space-y-0.5">
                                <p className="font-sans text-sm font-medium text-stone-800">{t('profile.contact_concierge')}</p>
                                <p className="text-xs text-stone-500">{t('profile.support_desc')}</p>
                            </div>
                            <button
                                onClick={() => setIsSupportOpen(true)}
                                aria-haspopup="dialog"
                                className="shrink-0 ml-4 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-xs font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
                            >
                                {t('profile.support_action')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar — the plan badge lives beside the name and subscription/support
                    are options rows now, so this space only sells the upgrade. */}
                <div className="space-y-6">
                    {hasMax ? (
                        <div className="bg-white/60 border border-stone-200/70 p-7 rounded-[16px] space-y-1.5 text-center">
                            <p className="text-xs text-stone-400 font-medium">{t('profile.current_plan')}</p>
                            <h3 className="text-xl font-sans font-semibold text-stone-900">Max</h3>
                        </div>
                    ) : (
                        <>
                            {/* Max advert — opens the same upgrade popup as Connect */}
                            <button
                                type="button"
                                onClick={() => setShowMaxUpgrade(true)}
                                aria-haspopup="dialog"
                                className="group relative w-full rounded-[20px] overflow-hidden bg-[#1c1b1a] text-left p-7 transition-all duration-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)] active:scale-[0.995] cursor-pointer"
                            >
                                {/* Soft green glow anchoring the Max colour on the dark card */}
                                <div
                                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#86BE7F]/20 blur-3xl group-hover:bg-[#86BE7F]/30 transition-colors duration-500"
                                    aria-hidden="true"
                                />
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="rounded-full bg-[#86BE7F]/20 px-3 py-1 text-[11px] font-bold text-[#a8d8a2]">
                                            Max
                                        </span>
                                        <ArrowUpRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="text-lg font-sans font-medium text-white tracking-tight leading-snug">
                                            {t('profile.max_ad_title')}
                                        </h3>
                                        <p className="text-[13px] font-sans text-white/65 leading-relaxed">
                                            {t('profile.max_ad_desc')}
                                        </p>
                                    </div>
                                    <span className="inline-block rounded-full bg-[#86BE7F] px-4 py-2 text-[13px] font-semibold text-stone-900 group-hover:opacity-95 transition-opacity">
                                        {t('profile.upgrade_to_max')}
                                    </span>
                                </div>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
            {/* Same upgrade popup as Connect's PRO panel */}
            <MaxUpgradeModal
                isOpen={showMaxUpgrade}
                onClose={() => setShowMaxUpgrade(false)}
                reason={t('connect.pro.modal_subtitle')}
            />
        </div>
    );
}