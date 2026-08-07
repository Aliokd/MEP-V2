'use client';

import React, { useEffect, useRef, useState } from 'react';
import { chordPitches, type ChordPosition } from '@/lib/chords';

/**
 * The two things a chord symbol has to be able to do on this canvas: show its
 * fingering and play. Shared by the chord card (where a chord is chosen) and the
 * chord popover (where a chord already pinned to a word is inspected), so the two
 * can't drift apart. Both come from data bundled with the app — see lib/chords.
 */

// ── Playback ─────────────────────────────────────────────────────────────────
// One context for the whole app. Browsers cap how many can exist, and a fresh one
// per click would eventually stop producing sound with no error to explain why.
let sharedCtx: AudioContext | null = null;
function audioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedCtx) sharedCtx = new Ctor();
    return sharedCtx;
}

/** How long one strum rings out, in seconds. Long enough to hear the chord settle. */
export const RING_SECONDS = 2.6;
/** Gap between strings, in seconds — this is what makes it read as a strum rather
 *  than a stab. Roughly a medium downstroke. */
export const STRUM_SPACING = 0.035;

/**
 * Strums one voicing and returns a function that stops it early.
 *
 * Each string is two slightly detuned oscillators through their own envelope —
 * a plain sine per note sounds like a test tone, and the detuning plus the fast
 * attack and long decay is what makes it read as a plucked string.
 */
export function strum(frequencies: number[]): () => void {
    const ctx = audioContext();
    if (!ctx || !frequencies.length) return () => {};
    // Autoplay policy suspends the context until a gesture; this call happens
    // inside a click, so it is allowed to resume here.
    if (ctx.state === 'suspended') void ctx.resume();

    const master = ctx.createGain();
    // Divided across strings so a six-string chord doesn't clip where a
    // four-string one sits comfortably.
    master.gain.value = 0.9 / Math.max(frequencies.length, 1);
    master.connect(ctx.destination);

    const started: OscillatorNode[] = [];
    const now = ctx.currentTime;

    frequencies.forEach((freq, i) => {
        const at = now + i * STRUM_SPACING;
        const voice = ctx.createGain();
        voice.connect(master);
        voice.gain.setValueAtTime(0, at);
        voice.gain.linearRampToValueAtTime(1, at + 0.012);
        // Exponential, not linear: a string's decay is exponential, and a linear
        // fade to silence has an audible corner at the end.
        voice.gain.exponentialRampToValueAtTime(0.0001, at + RING_SECONDS);

        [0, 1].forEach(n => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            // A few cents apart so the two voices beat against each other.
            osc.detune.value = n === 0 ? -4 : 4;
            osc.connect(voice);
            osc.start(at);
            osc.stop(at + RING_SECONDS + 0.05);
            started.push(osc);
        });
    });

    return () => {
        const t = ctx.currentTime;
        // Short release rather than an immediate stop — cutting a ringing
        // oscillator dead produces a click.
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0, t + 0.06);
        started.forEach(o => {
            try { o.stop(t + 0.08); } catch { /* already stopped */ }
        });
    };
}

/** Play/stop for one voicing, with the button state and every teardown path
 *  (switching voicing, switching chord, unmounting) handled in one place so a
 *  chord can never be left ringing after the thing that started it is gone. */
export function useChordPlayback(position: ChordPosition | undefined) {
    const [playing, setPlaying] = useState(false);
    const stopRef = useRef<(() => void) | null>(null);
    const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stop = () => {
        stopRef.current?.();
        stopRef.current = null;
        if (endTimer.current) clearTimeout(endTimer.current);
        endTimer.current = null;
        setPlaying(false);
    };

    useEffect(() => stop, []);

    const play = () => {
        if (!position) return;
        stop();
        stopRef.current = strum(chordPitches(position));
        setPlaying(true);
        endTimer.current = setTimeout(() => {
            stopRef.current = null;
            setPlaying(false);
        }, (RING_SECONDS + (position.midi?.length || 0) * STRUM_SPACING) * 1000);
    };

    return { playing, play, stop };
}

// ── Diagram ──────────────────────────────────────────────────────────────────
const STRINGS = 6;
const FRETS_SHOWN = 5;
const PAD_TOP = 26;
const DOT_R = 7.5;

export function Fretboard({ position, scale = 1 }: { position: ChordPosition; scale?: number }) {
    const STRING_GAP = 20 * scale;
    const FRET_GAP = 24 * scale;
    const PAD_X = 26 * scale;
    const padTop = PAD_TOP * scale;
    const dotR = DOT_R * scale;

    const gridW = (STRINGS - 1) * STRING_GAP;
    const gridH = FRETS_SHOWN * FRET_GAP;
    const svgW = gridW + PAD_X * 2;
    const svgH = gridH + padTop + 24 * scale;

    const stringX = (i: number) => PAD_X + i * STRING_GAP;
    const fretY = (f: number) => padTop + f * FRET_GAP;

    const { frets, fingers, baseFret, barres } = position;
    const openNut = baseFret === 1;

    // Strings held down by a barre, except the one that carries its label. A bar is
    // one finger, so repeating its number on every string it covers reads as three
    // separate fingers — chord charts label a bar once, at its low end.
    const barredSilently = new Set<number>();
    (barres || []).forEach(b => {
        const held = frets.map((f, i) => (f === b ? i : -1)).filter(i => i >= 0);
        if (held.length < 2) return;
        held.slice(1).forEach(i => barredSilently.add(i));
    });

    return (
        <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="select-none shrink-0"
            role="img"
            aria-label="Chord fingering diagram"
        >
            {/* Nut, when the shape is played at the top of the neck. Otherwise the
                grid just starts at a fret and the position label says which one. */}
            {openNut ? (
                <rect x={PAD_X - 1.5 * scale} y={padTop - 4 * scale} width={gridW + 3 * scale} height={4.5 * scale} rx={1.5 * scale} fill="#44403c" />
            ) : (
                <text
                    x={PAD_X - 9 * scale}
                    y={fretY(0) + FRET_GAP / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-stone-400"
                    style={{ fontSize: 10 * scale, fontWeight: 700 }}
                >
                    {baseFret}fr
                </text>
            )}

            {Array.from({ length: FRETS_SHOWN + 1 }).map((_, f) => (
                <line
                    key={`f${f}`}
                    x1={PAD_X} y1={fretY(f)} x2={PAD_X + gridW} y2={fretY(f)}
                    stroke="#e7e5e4" strokeWidth={f === 0 && openNut ? 0 : 1.5 * scale}
                    strokeLinecap="round"
                />
            ))}
            {Array.from({ length: STRINGS }).map((_, s) => (
                <line
                    key={`s${s}`}
                    x1={stringX(s)} y1={fretY(0)} x2={stringX(s)} y2={fretY(FRETS_SHOWN)}
                    stroke="#e7e5e4" strokeWidth={1.5 * scale} strokeLinecap="round"
                />
            ))}

            {/* Barres first, so the finger dots sit on top of the bar rather than under it. */}
            {(barres || []).map(b => {
                const held = frets.map((f, i) => (f === b ? i : -1)).filter(i => i >= 0);
                if (held.length < 2) return null;
                const from = stringX(Math.min(...held));
                const to = stringX(Math.max(...held));
                return (
                    <rect
                        key={`b${b}`}
                        x={from - dotR} y={fretY(b - 1) + FRET_GAP / 2 - dotR}
                        width={to - from + dotR * 2} height={dotR * 2}
                        rx={dotR} fill="#4f46e5"
                    />
                );
            })}

            {frets.map((f, i) => {
                const x = stringX(i);
                if (f === -1) {
                    // Muted string: an × above the nut, the standard chart notation.
                    const y = padTop - 12 * scale;
                    const r = 4 * scale;
                    return (
                        <g key={`m${i}`} stroke="#a8a29e" strokeWidth={1.8 * scale} strokeLinecap="round">
                            <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
                            <line x1={x + r} y1={y - r} x2={x - r} y2={y + r} />
                        </g>
                    );
                }
                if (f === 0) {
                    return (
                        <circle
                            key={`o${i}`}
                            cx={x} cy={padTop - 12 * scale} r={4.5 * scale}
                            fill="none" stroke="#a8a29e" strokeWidth={1.8 * scale}
                        />
                    );
                }
                const y = fretY(f - 1) + FRET_GAP / 2;
                const finger = barredSilently.has(i) ? 0 : fingers?.[i];
                return (
                    <g key={`d${i}`}>
                        <circle cx={x} cy={y} r={dotR} fill="#4f46e5" />
                        {finger ? (
                            <text
                                x={x} y={y + 0.5 * scale}
                                textAnchor="middle" dominantBaseline="middle"
                                fill="#ffffff"
                                style={{ fontSize: 9.5 * scale, fontWeight: 700 }}
                            >
                                {finger}
                            </text>
                        ) : null}
                    </g>
                );
            })}
        </svg>
    );
}
