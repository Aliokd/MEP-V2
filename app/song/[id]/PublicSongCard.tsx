"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { waitlistJoinPath } from '@/lib/uiFlags';

export interface PublicSong {
    id: string;
    projectName: string;
    author: string;
    lyrics: string[];
    /** Only ever an http(s) URL — see the note in page.tsx about blob attachments. */
    audioUrl: string | null;
}

/**
 * A shared song, as the song card in Connect draws it: the title and who wrote
 * it, a play button when there is a melody, and the lyrics in the serif with
 * one line lit and the rest held back.
 *
 * The reading is the card's, not the feed's: no hearts, no comments, no menu.
 * Someone arriving from a link is here to read a song, and every one of those
 * controls would need an account they don't have.
 */
export default function PublicSongCard({ song }: { song: PublicSong }) {
    const { t, language } = useLanguage();
    const [activeLineIndex, setActiveLineIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    /**
     * The record follows the audio element's own events, not the promise
     * `play()` returns.
     *
     * That promise settles when sound actually starts, which on a cold buffer
     * is seconds after the press — so a version that waited for it left the
     * button dead and the record behind the sleeve while the file loaded. The
     * `play` event fires the moment playback is requested, which is when the
     * record should start coming out. Listening for `pause` and `ended` also
     * means anything else that stops the audio, a phone call or another tab
     * taking the audio focus, puts the record back where it belongs.
     */
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onPlay = () => setIsPlaying(true);
        const onStop = () => setIsPlaying(false);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onStop);
        audio.addEventListener('ended', onStop);
        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onStop);
            audio.removeEventListener('ended', onStop);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
        else audio.pause();
    };

    return (
        <main className="min-h-screen bg-[#E6E3DB] text-[#363636] font-sans selection:bg-[#86BE7F]/30">
            <div className="mx-auto w-full max-w-[820px] px-4 pb-16 pt-24 sm:pt-28">
                {/* Under the centred wordmark the site header draws for this route:
                    what Veinote is, said once, before the song. */}
                <p className="mb-8 text-center text-[13.5px] leading-relaxed text-stone-500">
                    {t('connect.share_tagline')}
                </p>

                {/* The record and the sleeve. The card carries no overflow clip so
                    the record can rise out from behind it; the rounded corners are
                    the card's own, and nothing needs cropping to them. */}
                <div className="relative">
                    {/* The vinyl, drawn as in the feed's song card: a conic gradient
                        for the sweep of light across the grooves, rings on top of
                        it, and a paper label at the spindle. It sits behind the
                        sleeve until the melody starts, then rises out of the top
                        edge and turns. */}
                    {song.audioUrl && (
                        <div
                            aria-hidden="true"
                            // Out to the left, the way the sleeve opens in the feed,
                            // rather than up: the line about Veinote sits directly
                            // above this card and a record rising into it would
                            // cover the one sentence explaining where you are.
                            className={`
                                absolute z-0 top-6 select-none pointer-events-none
                                w-[150px] h-[150px] sm:w-[230px] sm:h-[230px]
                                transition-all duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)]
                                ${isPlaying ? '-left-5 sm:-left-16 opacity-100 scale-100' : 'left-6 opacity-0 scale-75'}
                            `}
                        >
                            <div
                                className={`w-full h-full rounded-full flex items-center justify-center relative shadow-[0_4px_24px_rgba(0,0,0,0.3)] bg-[conic-gradient(from_0deg,#070605_0%,#4c4a46_12.5%,#070605_25%,#4c4a46_37.5%,#070605_50%,#4c4a46_62.5%,#070605_75%,#4c4a46_87.5%,#070605_100%)] ${
                                    isPlaying ? 'animate-spin-reverse' : ''
                                }`}
                                style={{ animationDuration: '4.5s' }}
                            >
                                <div className="absolute inset-5 rounded-full border border-stone-700/15" />
                                <div className="absolute inset-10 rounded-full border border-stone-700/20" />
                                <div className="absolute inset-16 rounded-full border border-stone-700/15" />
                                <div className="absolute inset-[88px] rounded-full border border-stone-700/20" />
                                <div className="w-14 h-14 bg-[#FAF9F5] rounded-full flex items-center justify-center border border-stone-300 relative z-10">
                                    <div className="w-2 h-2 bg-stone-900 rounded-full" />
                                </div>
                            </div>
                        </div>
                    )}

                {/* The sleeve slides the other way as the record comes out. */}
                <div className={`relative z-10 bg-white border border-stone-200/60 rounded-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden transition-transform duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${
                    isPlaying && song.audioUrl ? 'translate-x-2 sm:translate-x-3' : 'translate-x-0'
                }`}>
                    <div className="p-6 sm:p-8">
                        {/* Header: the song, who wrote it, and the melody if there is one */}
                        <div className="flex items-start justify-between gap-3 mb-6">
                            <div className="flex flex-col min-w-0">
                                <h1 className="font-sans text-[20px] sm:text-[26px] font-medium text-[#2c2a29] tracking-tight leading-snug break-words">
                                    {song.projectName}
                                </h1>
                                <span className="text-[13px] sm:text-[14px] text-stone-400 font-sans mt-0.5 font-normal truncate">
                                    {song.author}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {song.audioUrl && (
                                    <button
                                        onClick={togglePlay}
                                        type="button"
                                        aria-label={isPlaying ? t('connect.share_pause') : t('connect.share_play')}
                                        className={`${btn.iconPrimary('bare')} aspect-square h-12 w-12 cursor-pointer md:h-10 md:w-10`}
                                    >
                                        {/* Drawn rather than borrowed, so the corners stay hard —
                                            the same two glyphs the feed's card uses. */}
                                        {isPlaying ? (
                                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-stone-900">
                                                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-stone-900">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                                <span className="hidden sm:inline bg-[#F6F6F0] text-stone-500 px-3 py-1 rounded-full text-[13px] font-normal font-sans select-none leading-none">
                                    {song.audioUrl ? t('connect.share_lyrics_melody') : t('connect.share_lyrics_only')}
                                </span>
                            </div>
                        </div>

                        {song.audioUrl && (
                            <audio ref={audioRef} src={song.audioUrl} preload="metadata" className="hidden" />
                        )}

                        {/* The lyrics, read the way the card reads them: the line under
                            the pointer at full weight, the rest stepped back so the eye
                            has somewhere to be. Every line stays selectable and in the
                            page's text, so the words can be copied and read aloud by a
                            screen reader whatever is lit. */}
                        <div className="flex flex-col gap-4 sm:gap-6 py-2 text-left">
                            {song.lyrics.map((line, idx) => (
                                <p
                                    key={idx}
                                    onMouseEnter={() => setActiveLineIndex(idx)}
                                    onFocus={() => setActiveLineIndex(idx)}
                                    tabIndex={0}
                                    className={`
                                        outline-none tracking-normal leading-[35px] sm:leading-[37px] md:leading-[53px]
                                        font-lyrics text-[25px] sm:text-[29px] md:text-[40px] font-medium
                                        transition-all duration-300 origin-left text-[#5C5C5C]
                                        ${idx === activeLineIndex ? 'opacity-100 translate-x-1' : 'opacity-25 hover:opacity-60'}
                                    `}
                                >
                                    {line}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
                </div>

                {/* A way in, the same road every other public CTA takes. */}
                <div className="mt-10 text-center">
                    <Link href={waitlistJoinPath('song', language)} className={btn.primary('md')}>
                        {t('connect.share_cta')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
