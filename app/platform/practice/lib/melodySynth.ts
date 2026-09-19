"use client";

import { encodeWav, liveAudioContext } from './wav';

/*
 * The voice behind Melody: eight beats of single notes, played live as the
 * grid is edited and rendered to a file when the melody leaves for the canvas.
 *
 * One scheduling function serves both. It takes any BaseAudioContext, so the
 * live AudioContext and the OfflineAudioContext that renders the file run the
 * identical code — what you heard while writing is, by construction, what
 * lands on the canvas. The voice is the canvas strum's (chordVisuals.tsx):
 * two detuned triangles, fast attack, exponential decay, a plucked string
 * rather than a test tone, cut shorter here to sit inside a beat.
 */

/** One hundred to the minute, fixed. A tempo control would be a second
 *  instrument on a practice about one thing. */
export const BPM = 100;
export const BEAT_SECONDS = 60 / BPM;
/** Two bars of four. */
export const BEATS = 8;
/** How long a note sounds. A little under the beat, so repeated notes separate. */
const NOTE_SECONDS = BEAT_SECONDS * 0.85;

export interface MelodyEvent {
    /** 0-based beat the note starts on. */
    beat: number;
    freq: number;
}

/** A melody of `beats` beats, in seconds: the last beat plus the tail of its note. */
export const melodySeconds = (beats = BEATS) => (beats - 1) * BEAT_SECONDS + NOTE_SECONDS;

/**
 * Schedules one note on any context, starting at `at` (context time). Returns
 * the oscillators so a live pass can be cut short.
 */
export function scheduleNote(ctx: BaseAudioContext, freq: number, at: number, seconds = NOTE_SECONDS): OscillatorNode[] {
    const voice = ctx.createGain();
    voice.connect(ctx.destination);
    voice.gain.setValueAtTime(0, at);
    voice.gain.linearRampToValueAtTime(0.42, at + 0.008);
    // Exponential, not linear: a string's decay is exponential, and a linear
    // fade to silence has an audible corner at the end.
    voice.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

    return [0, 1].map(n => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        // A few cents apart so the two voices beat against each other.
        osc.detune.value = n === 0 ? -4 : 4;
        osc.connect(voice);
        osc.start(at);
        osc.stop(at + seconds + 0.05);
        return osc;
    });
}

/**
 * Plays the melody once from now on the live context. Returns a stop, which
 * releases rather than cuts: a ringing oscillator stopped dead clicks.
 */
export function playMelody(events: MelodyEvent[]): () => void {
    const ctx = liveAudioContext();
    if (!ctx) return () => {};
    // Autoplay policy suspends the context until a gesture; this runs inside
    // a click, so it may resume here.
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime + 0.02;
    const started = events.flatMap(e => scheduleNote(ctx, e.freq, now + e.beat * BEAT_SECONDS));
    return () => {
        const t = ctx.currentTime;
        started.forEach(o => {
            try { o.stop(t + 0.06); } catch { /* already stopped */ }
        });
    };
}

/** One note, now — the sound a square makes when it is tapped. */
export function soundNote(freq: number): void {
    const ctx = liveAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    scheduleNote(ctx, freq, ctx.currentTime + 0.01);
}

/**
 * Renders the melody to a WAV blob, offline and faster than real time.
 *
 * WAV rather than anything compressed: it is a few hundred kilobytes for
 * five seconds, every browser plays it, and encoding it is forty lines with
 * no dependency. The canvas's audio card takes any audio the browser can play.
 */
export async function renderMelodyWav(events: MelodyEvent[], beats = BEATS): Promise<{ blob: Blob; seconds: number }> {
    const rate = 44100;
    const seconds = melodySeconds(beats) + 0.4;
    const ctx = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
    events.forEach(e => scheduleNote(ctx, e.freq, 0.02 + e.beat * BEAT_SECONDS));
    const buffer = await ctx.startRendering();
    return { blob: encodeWav(buffer), seconds: Math.round(seconds) };
}

