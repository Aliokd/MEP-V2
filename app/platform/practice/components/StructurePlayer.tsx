"use client";

import { safeLocalStorageSetItem } from '@/lib/storage';
import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Info, Music4, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import SongTimeline from './SongTimeline';
import StructureDemo from './StructureDemo';
import { KIND_LABEL_KEY, SECTION_TEXT, SOLVED_BG, SOLVED_BG_PLAYING, SOLVED_TEXT, TAG_BG, sectionOrdinals, type SectionKind } from '../data/sections';
import type { AuthoredSection } from '../data/practiceSongs';
import { analyzeSongUrl } from '../lib/analyzeSong';
import { CONFETTI_MS } from '@/app/onboarding/components/Confetti';
import { haptic } from '@/lib/haptics';


/**
 * Skeleton of the practice while audio buffers or the analyser listens: the
 * ghost of the timeline and three ghost parts, with one quiet line saying why.
 * The song pill stays real so "change song" keeps working during the wait.
 */
function PracticeSkeleton({ header, caption }: { header?: ReactNode; caption: string }) {
    const segments = [6, 16, 10, 18, 12, 14, 24];
    // Ghosts are drawn in the panel's own beiges, not greys on white: a white
    // card here would be a shape the loaded page never shows.
    const GHOST = TAG_BG;
    const GHOST_SOFT = 'rgba(220, 221, 212, 0.55)';
    return (
        <div className="w-full flex flex-col gap-6" data-practice-skeleton>
            <section className="w-full max-w-6xl mx-auto flex flex-col gap-3 select-none">
                {/* Transport and song pill, laid out as they will be once loaded */}
                <div className="flex items-center justify-between gap-6 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 shrink-0 rounded-full animate-pulse" style={{ backgroundColor: GHOST }} />
                        <div className="min-w-0">{header}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: GHOST_SOFT }} />
                </div>

                <div className="w-full">
                    <div className="h-11 flex animate-pulse">
                        {segments.map((w, i) => (
                            <div
                                key={i}
                                style={{ width: `${w}%`, backgroundColor: i % 2 === 0 ? GHOST_SOFT : GHOST }}
                                className={`h-full ${i > 0 ? 'border-l-[3px] border-[#F0F0EA]' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="relative h-9 mt-1.5">
                        <div className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: GHOST }} />
                        <div className="flex justify-between pt-2 animate-pulse">
                            <span className="h-3 w-8 rounded" style={{ backgroundColor: GHOST_SOFT }} />
                            <span className="h-3 w-8 rounded" style={{ backgroundColor: GHOST_SOFT }} />
                        </div>
                    </div>
                </div>

                <p className="text-sm font-sans text-stone-400">{caption}</p>
            </section>

            {/* Ghost parts, in the same translucent card the real ones wear */}
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="rounded-[20px] pl-6 md:pl-8 pr-28 md:pr-32 py-5 md:py-6"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                    >
                        <div className="space-y-3 animate-pulse">
                            <div className="h-4 rounded" style={{ width: `${56 - i * 8}%`, backgroundColor: GHOST }} />
                            <div className="h-4 rounded" style={{ width: `${40 + i * 6}%`, backgroundColor: GHOST_SOFT }} />
                            <div className="h-4 rounded" style={{ width: `${30 + i * 4}%`, backgroundColor: GHOST_SOFT }} />
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
    /** Move through the playable library once this song is finished. */
    onPrevSong?: () => void;
    onNextSong?: () => void;
}

/**
 * The identify exercise on top of an authored song map: the timeline is the
 * palette of sections, and the unlabelled parts below — listed in playing
 * order — are the answers. Hearing the part is how you're meant to solve it,
 * so the part under the playhead is highlighted as the song runs.
 *
 * Mounted with `key={songId}` so a song switch starts the exercise clean.
 */
export default function StructurePlayer({ songId, headerSlot, audioUrl, sections, isPlaying, onTogglePlay, onPrevSong, onNextSong }: StructurePlayerProps) {
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
     * The task: one unsolved section, drawn at random, that the user has to find
     * among the lyrics. Index into resolvedSections; null once every part is
     * placed. Chosen in an effect rather than during render — Math.random on the
     * server would disagree with the client and blow up hydration.
     */
    const [targetIdx, setTargetIdx] = useState<number | null>(null);
    const [identified, setIdentified] = useState<number[]>([]);
    const [wrongIdx, setWrongIdx] = useState<number | null>(null);

    /** Index of the section the playhead is inside, or -1 between/outside. */
    const currentIdx = (resolvedSections ?? []).findIndex(
        s => currentTime >= s.start && currentTime < s.end,
    );
    const allNamed = !!resolvedSections
        && resolvedSections.length > 0
        && identified.length === resolvedSections.length;

    /*
     * With the whole song named there is nothing left to search for, so the list
     * becomes a read-along: it follows the playhead from part to part. Held back
     * until then — scrolling to the playing part mid-task would point straight at
     * the answer.
     */
    useEffect(() => {
        if (!allNamed || !isPlaying || currentIdx < 0) return;
        const el = blockRefs.current.get(currentIdx);
        const list = el?.parentElement;
        if (!el || !list) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Scroll the list itself rather than scrollIntoView, which would also
        // nudge the window and drag the timeline out of view.
        list.scrollTo({
            top: Math.max(0, el.offsetTop - list.offsetTop - 16),
            behavior: reduced ? 'auto' : 'smooth',
        });
    }, [currentIdx, allNamed, isPlaying]);
    /** True from a correct answer until the burst has landed. */
    const [celebrating, setCelebrating] = useState(false);
    /** Set when an answer lands, so the next draw retires the ask it satisfied. */
    const answeredRef = useRef(false);
    const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (burstTimerRef.current) clearTimeout(burstTimerRef.current); }, []);

    // Draw the next task whenever the current one is answered — but not until
    // the celebration for the last one is over.
    useEffect(() => {
        if (celebrating) return;
        if (!resolvedSections || resolvedSections.length === 0) return;
        const remaining = resolvedSections
            .map((_, i) => i)
            .filter(i => !identified.includes(i));

        /*
         * An accepted answer retires its ask even when the exact occurrence is
         * still open — answers are checked by kind, so "Find Verse 2" can be
         * satisfied by the Verse 1 card. Without this the same ask would come
         * straight back, reading as though the answer had not counted.
         */
        const answered = answeredRef.current;
        answeredRef.current = false;

        setTargetIdx(prev => {
            if (remaining.length === 0) return null;
            if (!answered && prev !== null && remaining.includes(prev)) return prev;
            const pool = answered && prev !== null && remaining.length > 1
                ? remaining.filter(i => i !== prev)
                : remaining;
            return pool[Math.floor(Math.random() * pool.length)];
        });
    }, [identified, resolvedSections, celebrating]);

    const targetSection = targetIdx === null ? null : resolvedSections?.[targetIdx] ?? null;
    const targetName = targetSection
        ? (() => {
            const kind = t(KIND_LABEL_KEY[targetSection.kind]);
            const n = targetIdx === null ? null : ordinals[targetIdx];
            return n ? `${kind} ${n}` : kind;
        })()
        : null;

    // Naming every part completes the practice for this song.
    useEffect(() => {
        if (!resolvedSections || resolvedSections.length === 0 || identified.length < resolvedSections.length) return;
        const completed = JSON.parse(localStorage.getItem('mep-completed-practices') || '[]');
        if (completed.includes(songId)) return;

        completed.push(songId);
        safeLocalStorageSetItem('mep-completed-practices', JSON.stringify(completed));

        /*
         * Two events, because they do different jobs. The progress one recounts
         * the metrics — flagged as a major task, since mapping a whole song is
         * one — and the celebrate one lights the Mind Power ring. Without the
         * second, finishing a practice would only glow when it happened to be
         * the first thing done that day.
         */
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
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

    /**
     * Clicking a band on the timeline: jump there and play it. Seeking alone
     * would leave the user to find the play button before hearing anything,
     * and hearing the part is the whole point of picking it out.
     */
    const handleSeekToSegment = (start: number) => {
        handleSeek(start);
        if (!isPlaying) onTogglePlay();
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
        setIdentified(prev => [...prev, originalIdx]);
        answeredRef.current = true;
        // Two quick beats on Android; a no-op where the platform has no vibration.
        haptic('success');
        /*
         * Hold the answered ask on screen while the burst plays, instead of
         * flipping to the next one the moment the card turns green. The effect
         * that draws the next target sits out this window.
         */
        setCelebrating(true);
        if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
        burstTimerRef.current = setTimeout(() => setCelebrating(false), CONFETTI_MS);
    };

    /**
     * Clear the board and go again on the same song. The completion already
     * recorded for this song stays — it was earned — this only resets the round.
     */
    const startOver = () => {
        if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
        answeredRef.current = false;
        setCelebrating(false);
        setWrongIdx(null);
        setIdentified([]);
        // Null rather than a fresh pick: the effect draws the first ask once the
        // cleared board has rendered, so it can choose from every section again.
        setTargetIdx(null);
        handleSeek(0);
        if (isPlaying) onTogglePlay();
    };

    const missAt = (originalIdx: number) => {
        setWrongIdx(originalIdx);
        setTimeout(() => setWrongIdx(null), 450);
    };

    /*
     * The task names a section; the answer is the lyrics card it belongs to.
     *
     * Checked by kind rather than by the exact occurrence asked for. Repeats
     * carry the same words — this song's three choruses are identical — so
     * insisting on "that chorus, not this one" would come down to guessing
     * between cards the user has no way to tell apart.
     */
    const handleBlockClick = (section: AuthoredSection, originalIdx: number) => {
        if (identified.includes(originalIdx) || !targetSection) return;
        if (section.kind === targetSection.kind) markIdentified(originalIdx);
        else missAt(originalIdx);
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
        <div className="w-full flex flex-col gap-6">

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
                    trailing={
                        <div className="flex items-center gap-2">
                            {/* Only once there is something to clear. Placed before the
                                info icon so that icon keeps its spot at the right edge. */}
                            {identified.length > 0 && (
                                <button
                                    type="button"
                                    data-start-over
                                    onClick={startOver}
                                    aria-label={t('practice.start_over')}
                                    title={t('practice.start_over')}
                                    className="w-8 h-8 shrink-0 text-stone-400 hover:text-stone-900 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                data-demo-replay
                                onClick={() => setShowDemo(true)}
                                aria-label={t('practice.demo_title')}
                                title={t('practice.demo_title')}
                                className="w-8 h-8 shrink-0 text-stone-400 hover:text-stone-900 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                    }
                    authored={resolvedSections}
                    duration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTogglePlay={onTogglePlay}
                    onSeek={handleSeek}
                    onScrub={handleScrub}
                    hideLabels
                    celebrate={celebrating}
                    targetStart={targetSection?.start ?? null}
                    promptLabel={targetName ? t('practice.find_section').replace('{section}', targetName) : null}
                    onSeekToSegment={handleSeekToSegment}
                    solvedStarts={identified.map(i => resolvedSections[i].start)}
                />
            </div>

            {/* The parts in playing order, unnamed until identified */}
            {/* Sized to land just short of the viewport bottom: the subtracted rem
                cover the platform header, the panel padding, the back row and the
                timeline above. Anything larger and the page itself starts to
                scroll, which pulls the timeline out of view. */}
            {/* dvh, not vh: iOS Safari resolves 100vh to the height the page would have
                with the URL bar hidden, so a vh-capped scroller runs taller than the
                visible screen and its last lines sit under the browser chrome. */}
            {/*
             * Two boxes on purpose. The outer one matches the timeline exactly, so
             * the cards line up with the bar at both edges however wide the screen
             * gets. The scroller inside reaches past both edges and pads itself
             * back, which parks the scrollbar out in the margin instead of eating
             * into the cards. The gutter is symmetric so the scroller stays
             * centred on its own, without depending on the wrapper to do it.
             */}
            <div className="w-full max-w-6xl mx-auto">
            <div className="parts-scroll flex flex-col gap-6 overflow-y-auto min-h-[280px] max-h-[calc(100dvh-22rem)] px-4 -mx-4">
                {/* The read-along only runs on a finished song, and only while it plays */}
                {parts.map(({ section, originalIdx }) => {
                    const readAlong = allNamed && isPlaying;
                    const isIdentified = identified.includes(originalIdx);
                    const isWrong = wrongIdx === originalIdx;
                                    const isCurrent = currentTime >= section.start && currentTime < section.end;

                    return (
                        <div
                            key={originalIdx}
                            data-section-block
                            ref={(el) => {
                                if (el) blockRefs.current.set(originalIdx, el);
                                else blockRefs.current.delete(originalIdx);
                            }}
                            /* Named parts follow the playhead; unnamed ones cannot,
                               or the song itself would give the answer away. */
                            style={isIdentified
                                ? {
                                    backgroundColor: isCurrent ? SOLVED_BG_PLAYING : SOLVED_BG,
                                    color: SOLVED_TEXT,
                                }
                                : undefined}
                            onClick={() => handleBlockClick(section, originalIdx)}
                            className={`
                                part-card relative rounded-[20px] pl-6 md:pl-8 pr-28 md:pr-32 py-5 md:py-6 transition-colors duration-200
                                ${isIdentified ? '' : 'is-pickable cursor-pointer'}
                                ${isWrong ? 'is-wrong animate-shake' : ''}
                                ${isCurrent ? 'is-playing' : ''}
                            `}
                        >
                            {/* Named once placed. Nothing marks an unsolved part —
                                the task above already says what is being looked for. */}
                            {isIdentified && (
                                <div className="absolute top-4 right-5 md:right-6">
                                    <span
                                        style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-sans"
                                    >
                                        {ordinals[originalIdx]
                                            ? `${t(KIND_LABEL_KEY[section.kind])} ${ordinals[originalIdx]}`
                                            : t(KIND_LABEL_KEY[section.kind])}
                                        <Check size={12} className="stroke-[3]" />
                                    </span>
                                </div>
                            )}


                            {/* One colour for every part, words or note alike. A solved
                                card sets its own text colour, so these inherit there. */}
                            {section.lines ? (
                                <div className="space-y-2">
                                    {section.lines.map((line, i) => {
                                        /*
                                         * The line being sung, once the part is named.
                                         * Before that the read-along stays off: following
                                         * the words would say which part this is.
                                         */
                                        const times = section.lineTimes;
                                        const isSinging = readAlong && isCurrent && !!times
                                            && currentTime >= times[i]
                                            && (i + 1 >= times.length || currentTime < times[i + 1]);
                                        return (
                                            <p
                                                key={i}
                                                data-line-current={isSinging ? '' : undefined}
                                                className={`font-serif font-normal text-lg md:text-xl leading-relaxed transition-colors duration-200
                                                    ${isIdentified ? '' : 'text-stone-700'}
                                                    ${isSinging ? 'font-medium' : readAlong && isCurrent ? 'opacity-45' : ''}`}
                                            >
                                                {line}
                                            </p>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Music with no words: a note stands in for the lyrics,
                                   in the colour the lyrics would have been. The sentence
                                   it replaces lives on as the accessible name. */
                                <p
                                    data-instrumental
                                    className={`select-none ${isIdentified ? '' : 'text-stone-700'}`}
                                    aria-label={t('practice.instrumental_part')}
                                >
                                    <Music4 className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />
                                </p>
                            )}
                        </div>
                    );
                })}

                {/* The song is done: the way on to the next one, at the end of the
                    lyrics rather than over them. */}
                {allNamed && (onPrevSong || onNextSong) && (
                    <div data-song-nav className="flex items-center justify-between gap-4 pt-2 pb-1">
                        <button
                            type="button"
                            onClick={onPrevSong}
                            aria-label={t('practice.prev_song')}
                            title={t('practice.prev_song')}
                            className="w-11 h-11 shrink-0 rounded-full bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 stroke-[2]" />
                        </button>

                        <button
                            type="button"
                            onClick={onNextSong}
                            aria-label={t('practice.next_song')}
                            className="flex items-center gap-2.5 pl-7 pr-6 py-3.5 rounded-full bg-stone-900 text-[#FAF9F5] text-[15px] font-sans font-medium hover:bg-stone-800 active:scale-[0.99] transition-colors cursor-pointer"
                        >
                            {t('common.next')}
                            <ArrowRight className="w-4 h-4 stroke-[2]" />
                        </button>
                    </div>
                )}
            </div>
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
                .part-card.is-pickable:hover {
                    background-color: #E7E6DF;
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
