"use client";

import { safeLocalStorageSetItem } from '@/lib/storage';
import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import SongTimeline from './SongTimeline';
import StructureDemo from './StructureDemo';
import { KIND_LABEL_KEY, SECTION_TEXT, SOLVED_BG, SOLVED_TEXT, TAG_BG, sectionOrdinals, type SectionKind } from '../data/sections';
import type { AuthoredSection } from '../data/practiceSongs';
import { analyzeSongUrl } from '../lib/analyzeSong';


/**
 * Skeleton of the practice while audio buffers or the analyser listens: the
 * ghost of the timeline and three ghost parts, with one quiet line saying why.
 * The song pill stays real so "change song" keeps working during the wait.
 */
function PracticeSkeleton({ header, caption }: { header?: ReactNode; caption: string }) {
    const segments = [6, 16, 10, 18, 12, 14, 24];
    return (
        <div className="w-full flex flex-col gap-10" data-practice-skeleton>
            <section className="w-full max-w-6xl mx-auto flex flex-col gap-3 select-none">
                <div className="flex items-center justify-between gap-6 flex-wrap">
                    <div className="min-w-0">{header}</div>
                    <div className="flex items-center gap-5 animate-pulse">
                        {[0, 1, 2, 3].map(i => (
                            <span key={i} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                                <span className="h-3 w-12 rounded bg-stone-200" />
                            </span>
                        ))}
                    </div>
                </div>

                <div className="w-full flex items-start gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-stone-200 animate-pulse" />
                    <div className="flex-1 min-w-0">
                        <div className="h-11 rounded-[12px] overflow-hidden flex animate-pulse">
                            {segments.map((w, i) => (
                                <div
                                    key={i}
                                    style={{ width: `${w}%` }}
                                    className={`h-full ${i % 2 === 0 ? 'bg-stone-200/70' : 'bg-stone-200'}`}
                                />
                            ))}
                        </div>
                        <div className="relative h-9 mt-1.5">
                            <div className="absolute inset-x-0 top-0 h-px bg-stone-200" />
                            <div className="flex justify-between pt-2 animate-pulse">
                                <span className="h-3 w-8 rounded bg-stone-200" />
                                <span className="h-3 w-8 rounded bg-stone-200" />
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-sm font-sans text-stone-400">{caption}</p>
            </section>

            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
                {[0, 1, 2].map(i => (
                    <div key={i} className="rounded-[20px] border border-stone-200 bg-white p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5 animate-pulse">
                            <span className="h-6 w-10 rounded-full bg-stone-100" />
                            <span className="w-8 h-8 rounded-full bg-stone-100" />
                        </div>
                        <div className="space-y-3 animate-pulse">
                            <div className="h-4 rounded bg-stone-100" style={{ width: `${56 - i * 8}%` }} />
                            <div className="h-4 rounded bg-stone-100" style={{ width: `${40 + i * 6}%` }} />
                            <div className="h-4 rounded bg-stone-100" style={{ width: `${30 + i * 4}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface StructurePlayerProps {
    /** Stable id for completion tracking; uploads get an unstable one, which is fine. */
    songId: string;
    /** The song pill (title, artist, change-song) shown above the timeline. */
    headerSlot?: ReactNode;
    audioUrl: string;
    /** The song's authored structure. Absent → the analyser maps it by ear. */
    sections?: AuthoredSection[];
    isPlaying: boolean;
    onTogglePlay: () => void;
}

/**
 * The identify exercise on top of an authored song map: the timeline is the
 * palette of sections, and the unlabelled parts below — listed in playing
 * order — are the answers. Hearing the part is how you're meant to solve it,
 * so the part under the playhead is highlighted as the song runs.
 *
 * Mounted with `key={songId}` so a song switch starts the exercise clean.
 */
export default function StructurePlayer({ songId, headerSlot, audioUrl, sections, isPlaying, onTogglePlay }: StructurePlayerProps) {
    const { t } = useLanguage();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [duration, setDuration] = useState(0);
    const requestRef = useRef<number | undefined>(undefined);
    const updateProgressRef = useRef<(() => void) | null>(null);
    /*
     * The audio element outlives every render, so the play state and the toggle
     * reach its listeners through refs. Reading them from the closure instead
     * would put them in the lifecycle effect's deps, and a parent re-render
     * would then tear down the element mid-song.
     */
    /*
     * The first-run how-to. Decided in an effect rather than the initializer so
     * the server render and the first client render agree on "hidden".
     */
    const [showDemo, setShowDemo] = useState(false);
    useEffect(() => {
        if (localStorage.getItem('mep-structure-demo-seen') !== 'true') setShowDemo(true);
    }, []);

    // True between pointer-down and pointer-up on the scrub track.
    const scrubbingRef = useRef(false);
    const isPlayingRef = useRef(isPlaying);
    const onTogglePlayRef = useRef(onTogglePlay);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { onTogglePlayRef.current = onTogglePlay; }, [onTogglePlay]);
    // Each part's node, so a solved one can hand the view to the next.
    const blockRefs = useRef(new Map<number, HTMLDivElement>());
    const scrollToRef = useRef<number | null>(null);

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

    // Occurrence numbers in playing order, indexed the same as resolvedSections
    const ordinals = useMemo(
        () => sectionOrdinals((resolvedSections ?? []).map(s => s.kind)),
        [resolvedSections],
    );

    /*
     * The parts in playing order, so the list reads down the song the way the
     * timeline reads across it. They were shuffled once, to stop the order
     * itself from giving the answer away, but following along matters more
     * here than making the match hard to guess.
     */
    const parts = useMemo(
        () => (resolvedSections ?? []).map((section, originalIdx) => ({ section, originalIdx })),
        [resolvedSections],
    );
    /*
     * The one band armed on the timeline, held as its start time so arming
     * "Verse 2" highlights that band alone. Its kind rides along because that
     * is what an answer is checked against.
     */
    const [armedSegment, setArmedSegment] = useState<{ start: number; kind: SectionKind } | null>(null);
    // A lyric block armed first, waiting for its timeline match.
    const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
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

    /*
     * Audio progress polling. The loop keeps asking for frames for as long as
     * the effect below is alive, even across a frame where the element is
     * momentarily missing — bailing out there used to strand the playhead while
     * the song played on.
     */
    const updateProgress = useCallback(() => {
        const audio = audioRef.current;
        // While scrubbing, the pointer owns the time — otherwise the still-playing
        // audio would yank the highlight back on every frame of the drag.
        if (audio && !scrubbingRef.current) setCurrentTime(audio.currentTime);
        requestRef.current = requestAnimationFrame(() => updateProgressRef.current?.());
    }, []);

    useEffect(() => {
        updateProgressRef.current = updateProgress;
    }, [updateProgress]);

    useEffect(() => {
        if (!isPlaying) return;
        requestRef.current = requestAnimationFrame(() => updateProgressRef.current?.());
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying]);

    // HTML5 Audio lifecycle
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;

        let retried = false;
        const onEnded = () => {
            if (isPlayingRef.current) onTogglePlayRef.current();
        };
        // Infinity until the file's length is known; NaN before metadata lands.
        const takeDuration = () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
        };
        const onCanPlay = () => {
            setIsLoaded(true);
            setLoadError(false);
            takeDuration();
        };
        const onError = (e: Event) => {
            console.error('Audio failed to load:', audioUrl, e);
            if (!retried && audio.networkState === 3) {
                retried = true;
                audio.load();
            } else {
                setLoadError(true);
            }
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('error', onError);
        // The length often arrives late, or is corrected once the file is whole
        audio.addEventListener('loadedmetadata', takeDuration);
        audio.addEventListener('durationchange', takeDuration);

        audio.src = audioUrl;
        audio.preload = 'auto';
        audio.load();

        return () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('loadedmetadata', takeDuration);
            audio.removeEventListener('durationchange', takeDuration);
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, [audioUrl]);

    // Play/pause sync
    useEffect(() => {
        if (audioRef.current && isLoaded) {
            if (isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('Playback prevented:', error);
                        if (isPlayingRef.current) onTogglePlayRef.current();
                    });
                }
            } else {
                audioRef.current.pause();
                setCurrentTime(audioRef.current.currentTime);
            }
        }
    }, [isPlaying, isLoaded]);

    const handleSeek = (time: number) => {
        scrubbingRef.current = false;
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    /** Live position during a drag: moves the highlight without seeking the audio. */
    const handleScrub = (time: number | null) => {
        if (time === null) {
            scrubbingRef.current = false;
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            return;
        }
        scrubbingRef.current = true;
        setCurrentTime(time);
    };

    const markIdentified = (originalIdx: number) => {
        const done = [...identified, originalIdx];
        // Queue the next unsolved part, continuing from the one just named
        // and wrapping around, so the user never has to hunt for their place.
        const order = parts.map(b => b.originalIdx);
        const pos = order.indexOf(originalIdx);
        const rotated = [...order.slice(pos + 1), ...order.slice(0, pos)];
        scrollToRef.current = rotated.find(i => !done.includes(i)) ?? null;

        setIdentified(done);
        setArmedSegment(null);
        setSelectedBlock(null);
    };

    useEffect(() => {
        const target = scrollToRef.current;
        scrollToRef.current = null;
        if (target === null) return;
        const el = blockRefs.current.get(target);
        const list = el?.parentElement;
        if (!el || !list) return;
        // Scroll the list itself rather than scrollIntoView, which would also
        // nudge the window and drag the timeline out of view.
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        list.scrollTo({
            top: Math.max(0, el.offsetTop - list.offsetTop - (list.clientHeight - el.clientHeight) / 2),
            behavior: reduced ? 'auto' : 'smooth',
        });
    }, [identified]);

    const missAt = (originalIdx: number) => {
        setWrongIdx(originalIdx);
        setTimeout(() => setWrongIdx(null), 450);
    };

    /*
     * Matching works from either side: arm a band on the timeline and answer
     * with a block, or arm a block and answer on the timeline.
     *
     * An answer is checked by kind, not by which occurrence was armed. Repeats
     * of a section carry the same words — this song's three choruses are
     * identical — so demanding "that chorus, not this one" would come down to
     * guessing between cards the user has no way to tell apart.
     */
    const handleBlockClick = (section: AuthoredSection, originalIdx: number) => {
        if (identified.includes(originalIdx)) return;
        if (armedSegment) {
            if (section.kind === armedSegment.kind) markIdentified(originalIdx);
            else missAt(originalIdx);
            return;
        }
        setSelectedBlock(prev => (prev === originalIdx ? null : originalIdx));
    };

    const handleSegmentSelect = (start: number, kind: SectionKind) => {
        if (selectedBlock !== null) {
            const section = resolvedSections?.[selectedBlock];
            if (section && section.kind === kind) markIdentified(selectedBlock);
            else missAt(selectedBlock);
            return;
        }
        setArmedSegment(prev => (prev?.start === start ? null : { start, kind }));
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
        return <PracticeSkeleton header={headerSlot} caption={t('practice.tuning')} />;
    }

    // Still listening through the file → the same skeleton, different caption.
    if ((!resolvedSections || resolvedSections.length === 0) && analysis === 'running') {
        return <PracticeSkeleton header={headerSlot} caption={t('practice.analyzing')} />;
    }

    // No map and no analysis running: the analyser gave up on this file.
    if (!resolvedSections || resolvedSections.length === 0) {
        return (
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onTogglePlay}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        className="w-11 h-11 shrink-0 rounded-full bg-white hover:bg-stone-50 text-stone-900 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                        {isPlaying ? (
                            <svg width="15" height="17" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
                                <rect x="0" y="0" width="5" height="18" rx="1" />
                                <rect x="11" y="0" width="5" height="18" rx="1" />
                            </svg>
                        ) : (
                            <svg
                                width="15" height="17" viewBox="0 0 16 18"
                                fill="currentColor" stroke="currentColor"
                                strokeWidth="3" strokeLinejoin="round"
                                className="translate-x-[1px]" aria-hidden="true"
                            >
                                <path d="M1.75 1.75 L14.25 9 L1.75 16.25 Z" />
                            </svg>
                        )}
                    </button>
                    <div className="min-w-0">{headerSlot}</div>
                </div>

                {analysis === 'failed' ? (
                    <div className="w-full min-h-[220px] rounded-[20px] border border-stone-200 bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <p className="font-serif text-lg text-stone-900">{t('practice.mapping_pending')}</p>
                        <p className="text-sm font-sans text-stone-500 max-w-md leading-relaxed">
                            {t('practice.mapping_pending_desc')}
                        </p>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-10">

            {/* First time on the exercise: the five-second how-to, once per account */}
            {showDemo && (
                <StructureDemo
                    onDone={() => {
                        setShowDemo(false);
                        safeLocalStorageSetItem('mep-structure-demo-seen', 'true');
                    }}
                />
            )}

            {/*
             * The timeline holds its place at the top while the parts scroll in
             * their own region below. Sticky can't do this here: the platform's
             * content wrapper is overflow-y-auto but never actually scrolls (the
             * window does), which leaves a sticky child with a scrollport that
             * never moves. Giving the list its own scroller is self-contained
             * and doesn't touch the shared layout.
             */}
            <div className="shrink-0">
                <SongTimeline
                    heading={headerSlot}
                    authored={resolvedSections}
                    duration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTogglePlay={onTogglePlay}
                    onSeek={handleSeek}
                    onScrub={handleScrub}
                    selectedStart={armedSegment?.start ?? null}
                    onSelectSegment={handleSegmentSelect}
                    solvedStarts={identified.map(i => resolvedSections[i].start)}
                />
            </div>

            {/* The parts in playing order, unnamed until identified */}
            <div className="parts-scroll w-full max-w-6xl mx-auto flex flex-col gap-6 overflow-y-auto min-h-[280px] max-h-[calc(100vh-26rem)] pr-3 -mr-3">
                {parts.map(({ section, originalIdx }) => {
                    const isIdentified = identified.includes(originalIdx);
                    const isWrong = wrongIdx === originalIdx;
                    const isArmed = selectedBlock === originalIdx;
                    const isCurrent = currentTime >= section.start && currentTime < section.end;

                    return (
                        <div
                            key={originalIdx}
                            data-section-block
                            ref={(el) => {
                                if (el) blockRefs.current.set(originalIdx, el);
                                else blockRefs.current.delete(originalIdx);
                            }}
                            style={isIdentified ? { backgroundColor: SOLVED_BG, color: SOLVED_TEXT } : undefined}
                            onClick={() => handleBlockClick(section, originalIdx)}
                            className={`
                                part-card relative rounded-[20px] pl-6 md:pl-8 pr-28 md:pr-32 py-5 md:py-6 transition-colors duration-200
                                ${isIdentified ? '' : 'is-pickable cursor-pointer'}
                                ${isArmed ? 'is-armed' : ''}
                                ${isWrong ? 'is-wrong animate-shake' : ''}
                                ${isCurrent ? 'is-playing' : ''}
                            `}
                        >
                            {/* Its name, or the blank waiting for one, out of the lyrics' way */}
                            <div className="absolute top-4 right-5 md:right-6">
                                {isIdentified ? (
                                    <span
                                        style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-sans"
                                    >
                                        {ordinals[originalIdx]
                                            ? `${t(KIND_LABEL_KEY[section.kind])} ${ordinals[originalIdx]}`
                                            : t(KIND_LABEL_KEY[section.kind])}
                                        <Check size={12} className="stroke-[3]" />
                                    </span>
                                ) : (
                                    <span
                                        style={{ backgroundColor: TAG_BG }}
                                        className="inline-block rounded-full text-stone-500 px-3.5 py-1 text-xs font-sans"
                                    >
                                        ?
                                    </span>
                                )}
                            </div>

                            {section.lines ? (
                                <div className="space-y-2">
                                    {section.lines.map((line, i) => (
                                        <p
                                            key={i}
                                            className={`font-serif font-normal text-lg md:text-xl leading-relaxed transition-opacity duration-300
                                                ${isIdentified ? '' : isCurrent ? 'text-stone-900' : 'text-stone-700'}`}
                                        >
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <p className={`text-sm font-sans select-none ${isIdentified ? 'opacity-70' : 'text-stone-400'}`}>
                                    {t('practice.instrumental_part')}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                /* The parts scroller: a hairline of beige, no track, no steppers. */
                .parts-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #DCDDD4 transparent;
                }
                .parts-scroll::-webkit-scrollbar {
                    width: 3px;
                }
                .parts-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .parts-scroll::-webkit-scrollbar-thumb {
                    background-color: #DCDDD4;
                    border-radius: 999px;
                }
                .parts-scroll::-webkit-scrollbar-button {
                    display: none;
                    height: 0;
                    width: 0;
                }

                /*
                 * The parts themselves: a half-veil of white over the page, going
                 * a shade of beige deeper under the cursor and deeper still once
                 * armed. Solved parts paint green inline, which outranks these.
                 */
                .part-card {
                    background-color: rgba(255, 255, 255, 0.5);
                }
                /* The part being played lifts toward white. Listed before the
                   states below so hover, armed and wrong all still win. */
                .part-card.is-playing {
                    background-color: rgba(255, 255, 255, 0.95);
                }
                .part-card.is-pickable:hover {
                    background-color: #E7E6DF;
                }
                /* Paired with :hover so the armed shade outranks the hover shade */
                .part-card.is-armed,
                .part-card.is-armed:hover {
                    background-color: #DCDDD4;
                }
                .part-card.is-wrong,
                .part-card.is-wrong:hover {
                    background-color: #F7E4C4;
                }

                /* Keyframes for the wrong-answer shake */
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
