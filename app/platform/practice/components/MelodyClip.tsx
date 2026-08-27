"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { setPlaybackAudioSession } from '@/lib/audioSession';
import * as btn from '@/app/platform/components/buttonStyles';

/**
 * One short clip with a play button and a line showing where it has got to.
 *
 * Playback is controlled from outside — the parent owns which clip is sounding,
 * because the whole point of the compare step is hearing one against the other
 * and two at once is just noise.
 *
 * A recorded take is the reason `duration` is read the careful way. A webm from
 * MediaRecorder reports its duration as Infinity until the file has been seeked
 * to the end, so anything that trusts `audio.duration` on load draws a progress
 * bar that never moves. The recorded length is passed in instead where it is
 * known, and the element's own duration is only used when it is a real number.
 */

interface MelodyClipProps {
    src: string;
    label: string;
    /** Beneath the label — the instrument, or how long the take ran. */
    meta?: string;
    isPlaying: boolean;
    onToggle: () => void;
    /** Known length in seconds, for sources whose metadata cannot be trusted. */
    knownSeconds?: number;
    /** Marks the take apart from the melody it answers. */
    tone?: 'original' | 'take';
}

const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export default function MelodyClip({
    src, label, meta, isPlaying, onToggle, knownSeconds, tone = 'original',
}: MelodyClipProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(knownSeconds ?? 0);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    /* The parent's toggle, held in a ref so the element's lifecycle effect can
       stay keyed on `src` alone — a parent re-render must not tear down a
       playing clip. */
    const onToggleRef = useRef(onToggle);
    useEffect(() => { onToggleRef.current = onToggle; }, [onToggle]);
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;
        // No state reset here: the parent keys this component on `src`, so a new
        // source is a new component and the initial state is already right.
        const takeDuration = () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
        };
        const onCanPlay = () => { setReady(true); takeDuration(); };
        const onEnded = () => { if (isPlayingRef.current) onToggleRef.current(); };
        const onError = () => setFailed(true);

        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('loadedmetadata', takeDuration);
        audio.addEventListener('durationchange', takeDuration);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        audio.src = src;
        audio.preload = 'auto';
        audio.load();

        return () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('loadedmetadata', takeDuration);
            audio.removeEventListener('durationchange', takeDuration);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, [src]);

    /* The loop reschedules itself through a ref rather than by name: a
       useCallback cannot reference itself, and the ref also means a new identity
       never orphans a frame that is already queued. */
    const tickRef = useRef<() => void>(() => {});
    const tick = useCallback(() => {
        const audio = audioRef.current;
        if (audio) setTime(audio.currentTime);
        rafRef.current = requestAnimationFrame(() => tickRef.current());
    }, []);
    useEffect(() => { tickRef.current = tick; }, [tick]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !ready) return;
        if (isPlaying) {
            // iOS routes to the earpiece after a recording unless the category
            // is put back; harmless everywhere else.
            setPlaybackAudioSession();
            audio.play().catch(() => { if (isPlayingRef.current) onToggleRef.current(); });
            rafRef.current = requestAnimationFrame(tick);
        } else {
            // A clip this short is easier to judge from the top every time than
            // resumed from the middle, so pausing rewinds.
            audio.pause();
            audio.currentTime = 0;
        }
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [isPlaying, ready, tick]);

    const total = duration || knownSeconds || 0;
    // Derived rather than stored: pausing rewinds, so a stopped clip is at zero
    // by definition and there is no stale `time` to clear.
    const pct = isPlaying && total > 0 ? Math.min(100, (time / total) * 100) : 0;

    return (
        <div
            className="verse-card is-static flex items-center gap-4 rounded-[20px] px-5 py-4"
            style={tone === 'take' ? { backgroundColor: '#FBFFED' } : undefined}
        >
            <button
                type="button"
                onClick={onToggle}
                disabled={failed}
                aria-label={label}
                className={`${btn.iconPrimary('bare')} h-12 w-12 shrink-0 cursor-pointer`}
            >
                {isPlaying
                    ? <Pause className="h-5 w-5 fill-current stroke-none" />
                    : <Play className="h-5 w-5 translate-x-[1px] fill-current stroke-none" />}
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-sans text-sm font-semibold text-stone-800">{label}</p>
                    <span className="shrink-0 font-sans text-xs tabular-nums text-stone-400">
                        {fmt(isPlaying ? time : total)}
                    </span>
                </div>
                {meta && <p className="truncate font-sans text-xs text-stone-500">{meta}</p>}
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-stone-900/10">
                    <div
                        className="h-full rounded-full bg-stone-700"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
