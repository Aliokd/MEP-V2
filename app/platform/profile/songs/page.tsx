"use client";
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Music } from 'lucide-react';
import SongCards from '../components/SongCards';
import { useMySongs, leaveProfileTo, openSongInCreate, formatSongDate } from '../useMySongs';
import * as btn from '@/app/platform/components/buttonStyles';

/**
 * The full song collection. Lives under /platform/profile so the layout gives it
 * the same focused treatment as the profile itself: no sidebar, back button
 * top-left, slide transitions.
 */
export default function MySongsPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();

    const { songs, songsLoaded } = useMySongs(user, t);

    if (!user) return null;

    return (
        <div className="space-y-8 text-stone-900 font-sans">
            <header className="space-y-2">
                <h1 className="text-3xl font-sans font-light tracking-tight text-stone-900">
                    {t('profile.my_songs')}
                    {songsLoaded && songs.length > 0 && (
                        <span className="ml-3 text-base font-normal text-stone-400">{songs.length}</span>
                    )}
                </h1>
                <p className="text-stone-500 font-sans max-w-2xl text-sm font-normal">
                    {t('profile.my_songs_subtitle')}
                </p>
            </header>

            {!songsLoaded && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="h-44 rounded-[20px] bg-stone-200/40 animate-pulse" />
                    ))}
                </div>
            )}

            {songsLoaded && songs.length === 0 && (
                <div className="py-6 flex flex-col items-start gap-3">
                    <p className="text-xs text-stone-500">{t('profile.no_songs')}</p>
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
                    songs={songs}
                    t={t}
                    formatDate={(ms) => formatSongDate(language, ms)}
                    onOpenInCreate={(songId) => openSongInCreate(user.uid, songId)}
                    gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    ownerName={user.displayName || user.email || ''}
                />
            )}
        </div>
    );
}
