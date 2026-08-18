"use client";

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PRACTICE_SONGS, type PracticeSong } from '../data/practiceSongs';

/**
 * What the chooser hands back. The upload variant is dormant while the
 * bring-your-own tile is hidden, but the player and analyser downstream
 * support it — restoring uploads is a UI change here only.
 */
export type ChosenSong =
    | { source: 'library'; song: PracticeSong }
    | { source: 'upload'; title: string; audioUrl: string };

interface SongChooserProps {
    onNext: (choice: ChosenSong) => void;
}

/**
 * The pre-step of Master song structure: listen through our songs, and click
 * the one to practise with — the click is the choice, no confirm step. One
 * shared audio element previews whatever was last tapped.
 */
export default function SongChooser({ onNext }: SongChooserProps) {
    const { t } = useLanguage();

    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // One preview player for the whole screen.
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;
        const onEnded = () => setPreviewingId(null);
        audio.addEventListener('ended', onEnded);
        return () => {
            audio.removeEventListener('ended', onEnded);
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, []);

    const togglePreview = (id: string, url: string) => {
        const audio = audioRef.current;
        if (!audio) return;
        if (previewingId === id) {
            audio.pause();
            setPreviewingId(null);
            return;
        }
        audio.src = url;
        audio.play().catch(() => setPreviewingId(null));
        setPreviewingId(id);
    };

    const choose = (song: PracticeSong) => {
        audioRef.current?.pause();
        setPreviewingId(null);
        onNext({ source: 'library', song });
    };

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
            <p className="text-sm font-sans text-stone-500 select-none">{t('practice.pick_song')}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {PRACTICE_SONGS.map(song => {
                    const isPreviewing = previewingId === song.id;

                    return (
                        <button
                            key={song.id}
                            type="button"
                            data-song-choice={song.id}
                            onClick={() => choose(song)}
                            className="relative rounded-[20px] border border-stone-200 bg-white overflow-hidden cursor-pointer transition-colors hover:border-stone-400 text-left"
                        >
                            <span className="relative block aspect-square bg-stone-100">
                                {song.coverUrl && (
                                    <img src={song.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                )}
                                {/* Listen without choosing */}
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); togglePreview(song.id, song.audioUrl); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            togglePreview(song.id, song.audioUrl);
                                        }
                                    }}
                                    aria-label={`${isPreviewing ? t('practice.pause_preview') : t('practice.play_preview')}: ${song.title}`}
                                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/95 shadow-[0_2px_10px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                >
                                    {isPreviewing ? (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-stone-900">
                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                        </svg>
                                    ) : (
                                        <Play className="w-4 h-4 fill-stone-900 text-stone-900 stroke-none ml-0.5" />
                                    )}
                                </span>
                            </span>
                            <span className="block p-4">
                                <span className="block text-sm font-sans font-medium text-stone-900 truncate">{song.title}</span>
                                <span className="block text-xs font-sans text-stone-500 truncate">{song.artist}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
