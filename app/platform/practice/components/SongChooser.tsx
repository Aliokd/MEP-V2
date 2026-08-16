"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play, Upload } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PRACTICE_SONGS, type PracticeSong } from '../data/practiceSongs';

/** What the chooser hands back: one of ours, or a file the user brought. */
export type ChosenSong =
    | { source: 'library'; song: PracticeSong }
    | { source: 'upload'; title: string; audioUrl: string };

interface SongChooserProps {
    onNext: (choice: ChosenSong) => void;
}

/**
 * The pre-step of Master song structure: listen through our songs or bring your
 * own, then go. One shared audio element previews whatever was last tapped.
 */
export default function SongChooser({ onNext }: SongChooserProps) {
    const { t } = useLanguage();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [upload, setUpload] = useState<{ name: string; url: string } | null>(null);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    /*
     * No unmount revoke on purpose: when Next hands the object URL to the
     * practice player, this component unmounts first — revoking here would
     * kill the audio before the player ever loads it. The URL for a replaced
     * file is released in handleFile; the last one lives until page unload.
     */

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

    const handleFile = (file: File | undefined) => {
        if (!file) return;
        if (upload) URL.revokeObjectURL(upload.url);
        audioRef.current?.pause();
        setPreviewingId(null);
        const url = URL.createObjectURL(file);
        setUpload({ name: file.name.replace(/\.[^.]+$/, ''), url });
        setSelectedId('upload');
    };

    const choice: ChosenSong | null =
        selectedId === 'upload' && upload
            ? { source: 'upload', title: upload.name, audioUrl: upload.url }
            : selectedId
                ? (() => {
                    const song = PRACTICE_SONGS.find(s => s.id === selectedId);
                    return song ? { source: 'library' as const, song } : null;
                })()
                : null;

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
            <p className="text-sm font-sans text-stone-500 select-none">{t('practice.pick_song')}</p>

            {/* Our songs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {PRACTICE_SONGS.map(song => {
                    const isSelected = selectedId === song.id;
                    const isPreviewing = previewingId === song.id;

                    return (
                        <div
                            key={song.id}
                            data-song-choice={song.id}
                            onClick={() => setSelectedId(song.id)}
                            className={`relative rounded-[20px] border bg-white overflow-hidden cursor-pointer transition-colors
                                ${isSelected ? 'border-stone-900' : 'border-stone-200 hover:border-stone-400'}
                            `}
                        >
                            <div className="relative aspect-square bg-stone-100">
                                {song.coverUrl && (
                                    <img src={song.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                )}
                                {/* Listen without selecting */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); togglePreview(song.id, song.audioUrl); }}
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
                                </button>
                            </div>
                            <div className="p-4">
                                <p className="text-sm font-sans font-medium text-stone-900 truncate">{song.title}</p>
                                <p className="text-xs font-sans text-stone-500 truncate">{song.artist}</p>
                            </div>
                        </div>
                    );
                })}

                {/* Bring your own */}
                <div
                    data-song-choice="upload"
                    onClick={() => (upload ? setSelectedId('upload') : fileInputRef.current?.click())}
                    className={`relative rounded-[20px] border bg-white overflow-hidden cursor-pointer transition-colors flex flex-col
                        ${selectedId === 'upload' ? 'border-stone-900' : 'border-dashed border-stone-300 hover:border-stone-500'}
                    `}
                >
                    <div className="relative aspect-square bg-stone-50 flex flex-col items-center justify-center gap-3 text-stone-400 px-4">
                        <Upload size={22} className="stroke-[1.8]" />
                        <span className="text-xs font-sans text-center leading-relaxed">
                            {upload ? t('practice.upload_replace') : t('practice.upload_song')}
                        </span>
                        {upload && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); togglePreview('upload', upload.url); }}
                                aria-label={`${previewingId === 'upload' ? t('practice.pause_preview') : t('practice.play_preview')}: ${upload.name}`}
                                className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                            >
                                {previewingId === 'upload' ? (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-stone-900">
                                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                    </svg>
                                ) : (
                                    <Play className="w-4 h-4 fill-stone-900 text-stone-900 stroke-none ml-0.5" />
                                )}
                            </button>
                        )}
                    </div>
                    <div className="p-4">
                        <p className="text-sm font-sans font-medium text-stone-900 truncate">
                            {upload ? upload.name : t('practice.your_song')}
                        </p>
                        <p className="text-xs font-sans text-stone-500 truncate">{t('practice.upload_hint')}</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
                    />
                </div>
            </div>

            {/* Onwards */}
            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={!choice}
                    onClick={() => {
                        audioRef.current?.pause();
                        setPreviewingId(null);
                        if (choice) onNext(choice);
                    }}
                    className={`flex items-center gap-3 pl-10 pr-8 py-4 rounded-full text-base font-sans font-medium transition-colors
                        ${choice
                            ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 active:scale-[0.99]'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed'}
                    `}
                >
                    {t('common.next')}
                    <ArrowRight size={18} className="stroke-[2]" />
                </button>
            </div>
        </div>
    );
}
