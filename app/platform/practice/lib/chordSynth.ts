"use client";

import { chordPitches, chordPositions } from '@/lib/chords';
import { BEAT_SECONDS, BEATS, scheduleNote, type MelodyEvent } from './melodySynth';
import { encodeWav, liveAudioContext } from './wav';

/*
 * Chords under a melody, for Melody over chords: four bars strummed on the
 * downbeats while the grid's notes play over them, live and rendered to a
 * file by the same scheduling.
 *
 * The voice is the canvas strum's (chordVisuals.tsx) — two detuned triangles
 * per string, a fast attack, an exponential decay — re-stated here on any
 * BaseAudioContext, because the canvas's version owns a live context of its
 * own and cannot render offline. One function serves both, so what is heard
 * while writing is what lands on the canvas.
 */

/** A bar is four beats of the melody grid's clock. */
export const BAR_BEATS = 4;
export const BAR_SECONDS = BAR_BEATS * BEAT_SECONDS;
/** How long a strum rings. A shade under the bar, so the next one is clean. */
const RING_SECONDS = BAR_SECONDS * 0.95;
/** Gap between strings, in seconds — a medium downstroke. */
const STRUM_SPACING = 0.035;

/** Schedules one strummed chord on any context, starting at `at`. Quieter
 *  than the canvas strum: it sits under a melody rather than on its own. */
export function scheduleStrum(ctx: BaseAudioContext, symbol: string, at: number): OscillatorNode[] {
    const position = chordPositions(symbol)[0];
    if (!position) return [];
    const frequencies = chordPitches(position);

    const master = ctx.createGain();
    master.gain.value = 0.45 / Math.max(frequencies.length, 1);
    master.connect(ctx.destination);

    return frequencies.flatMap((freq, i) => {
        const start = at + i * STRUM_SPACING;
        const voice = ctx.createGain();
        voice.connect(master);
        voice.gain.setValueAtTime(0, start);
        voice.gain.linearRampToValueAtTime(1, start + 0.012);
        voice.gain.exponentialRampToValueAtTime(0.0001, start + RING_SECONDS);
        return [0, 1].map(n => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = n === 0 ? -4 : 4;
            osc.connect(voice);
            osc.start(start);
            osc.stop(start + RING_SECONDS + 0.05);
            return osc;
        });
    });
}

/** Schedules the chords, one to a bar, and the melody over them, from `at`. */
function scheduleAll(ctx: BaseAudioContext, chords: string[], events: MelodyEvent[], at: number): AudioScheduledSourceNode[] {
    const strums = chords.flatMap((symbol, bar) => scheduleStrum(ctx, symbol, at + bar * BAR_SECONDS));
    const notes = events.flatMap(e => scheduleNote(ctx, e.freq, at + e.beat * BEAT_SECONDS));
    return [...strums, ...notes];
}

/**
 * Plays chords and melody together once from now on the live context.
 * Returns a stop, which releases rather than cuts: a ringing string stopped
 * dead clicks.
 */
export function playMelodyOverChords(chords: string[], events: MelodyEvent[]): () => void {
    const ctx = liveAudioContext();
    if (!ctx) return () => {};
    const started = scheduleAll(ctx, chords, events, ctx.currentTime + 0.02);
    return () => {
        const t = ctx.currentTime;
        started.forEach(s => {
            try { s.stop(t + 0.06); } catch { /* already stopped */ }
        });
    };
}

/** Renders chords and melody together to a WAV, offline. */
export async function renderMelodyOverChordsWav(chords: string[], events: MelodyEvent[]): Promise<{ blob: Blob; seconds: number }> {
    const rate = 44100;
    const beats = chords.length * BAR_BEATS || BEATS;
    const seconds = beats * BEAT_SECONDS + 0.6;
    const ctx = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
    scheduleAll(ctx, chords, events, 0.02);
    const buffer = await ctx.startRendering();
    return { blob: encodeWav(buffer), seconds: Math.round(seconds) };
}
