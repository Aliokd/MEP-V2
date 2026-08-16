"use client";

import { safeLocalStorageSetItem } from '@/lib/storage';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Check, Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import SongTimeline from './SongTimeline';
import { KIND_BG, KIND_LABEL_KEY, SECTION_TEXT, type SectionKind } from '../data/sections';
import type { AuthoredSection } from '../data/practiceSongs';
import { analyzeSongUrl } from '../lib/analyzeSong';

interface StructurePlayerProps {
    /** Stable id for completion tracking; uploads get an unstable one, which is fine. */
    songId: string;
    title: string;
    audioUrl: string;
    /** The song's authored structure. Absent → the analyser maps it by ear. */
    sections?: AuthoredSection[];
    isPlaying: boolean;
    onTogglePlay: () => void;
}

/**
 * The identify exercise on top of an authored song map: the timeline is the
 * palette of section types, and the shuffled, unlabelled parts below are the
 * answers — each with its own listen button, since hearing the part is how
 * you're meant to solve it.
 *
 * Mounted with `key={songId}` so a song switch starts the exercise clean.
 */
export default function StructurePlayer({ songId, title, audioUrl, sections, isPlaying, onTogglePlay }: StructurePlayerProps) {
    const { t } = useLanguage();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [duration, setDuration] = useState(0);
    const requestRef = useRef<number | undefined>(undefined);
    const updateProgressRef = useRef<(() => void) | null>(null);
    // When set, playback halts there — used by the per-part listen buttons.
    const stopAtRef = useRef<number | null>(null);

    /*
     * Without an authored map, the analyser listens through the file and draws
     * one. 'running' keeps a quiet card up meanwhile; 'failed' owns the "we
     * couldn't map this" state.
     */
    const [analyzed, setAnalyzed] = useState<AuthoredSection[] | null>(null);
    const [analysis, setAnalysis] = useState<'idle' | 'running' | 'failed'>(sections ? 'idle' : 'running');

    // 'running' is already the initial state when there's no map, and the
    // component remounts per song (key={songId/url}), so the effect only has
    // to deliver the verdict.
    useEffect(() => {
        if (sections) return;
        let cancelled = false;
        analyzeSongUrl(audioUrl)
            .then(found => { if (!cancelled) { setAnalyzed(found); setAnalysis('idle'); } })
            .catch(() => { if (!cancelled) setAnalysis('failed'); });
        return () => { cancelled = true; };
    }, [sections, audioUrl]);

    const resolvedSections = sections ?? analyzed ?? undefined;

    // Exercise state. Parts are shuffled so their order doesn't mirror the bar —
    // deterministically, seeded by the song, so render stays pure.
    const shuffled = useMemo(() => {
        const items = (resolvedSections ?? []).map((section, originalIdx) => ({ section, originalIdx }));
        let seed = 2166136261;
        for (let i = 0; i < songId.length; i++) seed = (seed ^ songId.charCodeAt(i)) * 16777619 | 0;
        for (let i = items.length - 1; i > 0; i--) {
            seed = (seed * 1664525 + 1013904223) | 0;
            const j = Math.abs(seed) % (i + 1);
            [items[i], items[j]] = [items[j], items[i]];
        }
        return items;
    }, [resolvedSections, songId]);
    const [selectedKind, setSelectedKind] = useState<SectionKind | null>(null);
    const [identified, setIdentified] = useState<number[]>([]);
    const [wrongIdx, setWrongIdx] = useState<number | null>(null);

    // Naming every part completes the practice for this song.
    useEffect(() => {
        if (!resolvedSections || resolvedSections.length === 0 || identified.length < resolvedSections.length) return;
        const completed = JSON.parse(localStorage.getItem('mep-completed-practices') || '[]');
        if (!completed.includes(songId)) {
            completed.push(songId);
            safeLocalStorageSetItem('mep-completed-practices', JSON.stringify(completed));
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }
    }, [identified, songId, resolvedSections]);

    // Audio progress polling, honouring a pending stop point.
    const updateProgress = useCallback(() => {
        const audio = audioRef.current;
        if (audio && isPlaying) {
            if (stopAtRef.current !== null && audio.currentTime >= stopAtRef.current) {
                stopAtRef.current = null;
                audio.pause();
                onTogglePlay();
                return;
            }
            setCurrentTime(audio.currentTime);
            requestRef.current = requestAnimationFrame(() => updateProgressRef.current?.());
        }
    }, [isPlaying, onTogglePlay]);

    useEffect(() => {
        updateProgressRef.current = updateProgress;
    }, [updateProgress]);

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, updateProgress]);

    // HTML5 Audio lifecycle
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;

        const onEnded = () => {
            if (isPlaying) onTogglePlay();
        };
        const onCanPlay = () => {
            setIsLoaded(true);
            setLoadError(false);
            if (audio.duration) setDuration(audio.duration);
        };
        const onError = (e: Event) => {
            console.error('Audio failed to load:', audioUrl, e);
            if (!isLoaded && audio.networkState === 3) {
                audio.load();
            } else {
                setLoadError(true);
            }
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('error', onError);

        audio.src = audioUrl;
        audio.preload = 'auto';
        audio.load();

        return () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, [audioUrl, isLoaded, isPlaying, onTogglePlay]);

    // Play/pause sync
    useEffect(() => {
        if (audioRef.current && isLoaded) {
            if (isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('Playback prevented:', error);
                        if (isPlaying) onTogglePlay();
                    });
                }
            } else {
                audioRef.current.pause();
                setCurrentTime(audioRef.current.currentTime);
            }
        }
    }, [isPlaying, isLoaded, onTogglePlay]);

    const handleSeek = (time: number) => {
        stopAtRef.current = null; // a manual seek cancels any pending part-stop
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    /** Listen to one part: jump to its start, stop at its end. */
    const playPart = (section: AuthoredSection) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = section.start;
        setCurrentTime(section.start);
        stopAtRef.current = section.end;
        if (!isPlaying) onTogglePlay();
    };

    const handleGuess = (section: AuthoredSection, originalIdx: number) => {
        if (!selectedKind || identified.includes(originalIdx)) return;
        if (section.kind === selectedKind) {
            setIdentified(prev => [...prev, originalIdx]);
            setSelectedKind(null);
        } else {
            setWrongIdx(originalIdx);
            setTimeout(() => setWrongIdx(null), 450);
        }
    };

    if (loadError) {
        return (
            <div className="w-full h-[250px] flex flex-col items-center justify-center border border-red-100 rounded-[24px] bg-red-50/10 px-6">
                <p className="text-red-700 font-sans font-semibold text-lg mb-2">{t('practice.audio_unavailable')}</p>
                <p className="text-stone-500 text-xs mb-6 text-center">{t('practice.localhost_warning')}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-stone-900 text-[#FAF9F5] hover:opacity-90 rounded-full text-sm font-medium transition-colors"
                >
                    {t('practice.retry_connection')}
                </button>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-[250px] flex flex-col items-center justify-center border border-stone-200/50 rounded-[24px] bg-white/30">
                <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin mb-3" />
                <p className="text-stone-500 font-sans text-sm">{t('practice.tuning')}</p>
            </div>
        );
    }

    // No map yet: the analyser is either still listening, or gave up on this file.
    if (!resolvedSections || resolvedSections.length === 0) {
        return (
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onTogglePlay}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        className="w-11 h-11 shrink-0 rounded-full bg-stone-900 hover:bg-stone-800 flex items-center justify-center text-[#FAF9F5] active:scale-95 transition-all cursor-pointer"
                    >
                        {isPlaying ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                        ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>
                    <span className="text-sm font-sans text-stone-800">{title}</span>
                </div>

                {analysis === 'failed' ? (
                    <div className="w-full min-h-[220px] rounded-[20px] border border-stone-200 bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <p className="font-serif text-lg text-stone-900">{t('practice.mapping_pending')}</p>
                        <p className="text-sm font-sans text-stone-500 max-w-md leading-relaxed">
                            {t('practice.mapping_pending_desc')}
                        </p>
                    </div>
                ) : (
                    <div className="w-full min-h-[220px] rounded-[20px] border border-stone-200 bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <div className="w-7 h-7 border-t-2 border-stone-900 rounded-full animate-spin" />
                        <p className="font-serif text-lg text-stone-900">{t('practice.analyzing')}</p>
                        <p className="text-sm font-sans text-stone-500 max-w-md leading-relaxed">
                            {t('practice.analyzing_desc')}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-10">

            {/* The timeline is the player, and the palette of section types */}
            <SongTimeline
                title={title}
                authored={resolvedSections}
                duration={duration}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTogglePlay={onTogglePlay}
                onSeek={handleSeek}
                selectedKind={selectedKind}
                onSelectKind={(kind) => setSelectedKind(prev => (prev === kind ? null : kind))}
            />

            {/* The parts, shuffled and unnamed until identified */}
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
                {shuffled.map(({ section, originalIdx }) => {
                    const isIdentified = identified.includes(originalIdx);
                    const isWrong = wrongIdx === originalIdx;
                    const answering = !!selectedKind && !isIdentified;
                    const isCurrent = currentTime >= section.start && currentTime < section.end;

                    return (
                        <div
                            key={originalIdx}
                            data-section-block
                            onClick={() => handleGuess(section, originalIdx)}
                            className={`
                                relative rounded-[20px] border p-6 md:p-8 transition-colors duration-200
                                ${isIdentified
                                    ? 'border-[#86BE7F] bg-[#EAF7E8]/25'
                                    : isWrong
                                        ? 'border-[#F59E0B] bg-[#FEF3C7]/25 animate-shake'
                                        : answering
                                            ? 'border-stone-300 bg-white hover:border-stone-500 cursor-pointer'
                                            : 'border-stone-200 bg-white'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                {isIdentified ? (
                                    <span
                                        style={{ backgroundColor: KIND_BG[section.kind], color: SECTION_TEXT }}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-sans"
                                    >
                                        {t(KIND_LABEL_KEY[section.kind])}
                                        <Check size={12} className="stroke-[3]" />
                                    </span>
                                ) : (
                                    <span className="inline-block rounded-full bg-stone-100 text-stone-400 px-3.5 py-1 text-xs font-sans">
                                        ?
                                    </span>
                                )}

                                {/* Hear this part — how the exercise is meant to be solved */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); playPart(section); }}
                                    aria-label={t('practice.listen_part')}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors active:scale-95 cursor-pointer
                                        ${isCurrent && isPlaying
                                            ? 'border-stone-900 bg-stone-900 text-[#FAF9F5]'
                                            : 'border-stone-200 hover:border-stone-400 text-stone-700'}
                                    `}
                                >
                                    {isCurrent && isPlaying ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                        </svg>
                                    ) : (
                                        <Play className="w-3 h-3 fill-current stroke-none ml-0.5" />
                                    )}
                                </button>
                            </div>

                            {section.lines ? (
                                <div className="space-y-2">
                                    {section.lines.map((line, i) => (
                                        <p
                                            key={i}
                                            style={{ fontWeight: 300 }}
                                            className={`font-serif text-lg md:text-xl leading-relaxed transition-opacity duration-300 ${isCurrent ? 'text-stone-900' : 'text-stone-700'}`}
                                        >
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm font-sans text-stone-400 select-none">
                                    {t('practice.instrumental_part')}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Keyframes for the wrong-answer shake */}
            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.45s ease-in-out;
                }
            `}</style>
        </div>
    );
}
