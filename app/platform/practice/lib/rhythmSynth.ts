"use client";

import { encodeWav, liveAudioContext } from './wav';

/*
 * The drums behind Rhythm, Developing a rhythm and Build a beat: one bar of
 * sixteen steps, played live as the grid is edited and rendered to a file
 * when the bar leaves for the canvas.
 *
 * As with Melody, one scheduling function serves both the live context and
 * the OfflineAudioContext that renders the file, so what was heard is what
 * lands. Every drum is synthesised — a pitched sine dropping fast for the
 * low one, bursts of band-passed noise for the high ones — because a sample
 * would be a file to ship, and more decisions (which kick, which clap) on
 * practices about one thing.
 *
 * Two kits. Acoustic is the sound the first two rhythm practices have always
 * had; Electronic is the same five voices as a drum machine would make them,
 * which Build a beat offers as its first choice. A kit changes the sound of
 * a hit, never where it falls.
 */

/** One bar of four, in sixteenths. */
export const STEPS = 16;

/**
 * Low is the kick, high the hat; mid is the snare, which Developing a rhythm
 * adds. Clap and tom are Build a beat's, and only its.
 */
export type Voice = 'low' | 'mid' | 'high' | 'clap' | 'tom';
/** The three voices the first two rhythm practices are written in. */
export type CoreVoice = 'low' | 'mid' | 'high';

export interface RhythmHit {
    /** 0-based sixteenth the hit falls on. */
    step: number;
    voice: Voice;
}

export const KITS = [
    { id: 'acoustic' },
    { id: 'electronic' },
] as const;
export type Kit = (typeof KITS)[number]['id'];

/**
 * The three tempos on offer. A dial would be a second instrument; three
 * cards is a musical choice, and eighty to a hundred and twenty covers a
 * ballad to a dance floor.
 */
export const TEMPOS = [
    { id: 'slow', bpm: 80 },
    { id: 'medium', bpm: 100 },
    { id: 'fast', bpm: 120 },
] as const;
export type TempoId = (typeof TEMPOS)[number]['id'];

export const stepSeconds = (bpm: number) => 60 / bpm / 4;
export const barSeconds = (bpm: number) => stepSeconds(bpm) * STEPS;

/** A buffer of white noise, `seconds` long, shaped by `envelope(t)` if given. */
function noise(ctx: BaseAudioContext, seconds: number, envelope?: (t: number) => number): AudioBufferSourceNode {
    const length = Math.ceil(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
        const sample = Math.random() * 2 - 1;
        data[i] = envelope ? sample * envelope(i / ctx.sampleRate) : sample;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
}

/** A sine that starts at `from` and falls to `to` in `glide` seconds: a drum, not a tone. */
function drop(ctx: BaseAudioContext, from: number, to: number, glide: number, at: number, type: OscillatorType = 'sine'): OscillatorNode {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + glide);
    return osc;
}

/** Schedules one hit on any context at `at` (context time). */
export function scheduleHit(ctx: BaseAudioContext, voice: Voice, at: number, kit: Kit = 'acoustic'): AudioScheduledSourceNode {
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const electronic = kit === 'electronic';

    if (voice === 'low') {
        // Acoustic: 160Hz falling to 45Hz in a tenth of a second; the pitch
        // drop is what reads as a drum rather than a tone. Electronic: lower,
        // slower and longer — the boom of a drum machine's kick.
        const osc = electronic ? drop(ctx, 110, 38, 0.2, at) : drop(ctx, 160, 45, 0.1, at);
        const ring = electronic ? 0.5 : 0.28;
        gain.gain.setValueAtTime(electronic ? 1 : 0.9, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
        osc.connect(gain);
        osc.start(at);
        osc.stop(at + ring + 0.02);
        return osc;
    }

    if (voice === 'mid') {
        // A snare: a short pitched body under a burst of noise. Acoustic has
        // the body dropping 190Hz to 120Hz in fifty milliseconds and the
        // noise sitting low and ringing a touch; electronic is a click under
        // brighter, shorter noise.
        const body = electronic ? drop(ctx, 250, 100, 0.03, at) : drop(ctx, 190, 120, 0.05, at);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0.5, at);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, at + (electronic ? 0.05 : 0.12));
        body.connect(bodyGain);
        bodyGain.connect(ctx.destination);
        body.start(at);
        body.stop(at + 0.13);

        const src = noise(ctx, 0.2);
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = electronic ? 3000 : 1800;
        band.Q.value = electronic ? 0.4 : 0.7;
        gain.gain.setValueAtTime(0.5, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + (electronic ? 0.11 : 0.16));
        src.connect(band);
        band.connect(gain);
        src.start(at);
        src.stop(at + 0.2);
        return src;
    }

    if (voice === 'clap') {
        // Three bursts eight milliseconds apart, then a short tail: hands
        // never land together. Electronic claps are the same idea through a
        // narrower band, one burst more.
        const bursts = electronic ? 4 : 3;
        const env = (t: number) => {
            if (t < bursts * 0.01) return (t % 0.01) < 0.006 ? 1 : 0.15;
            return Math.exp(-(t - bursts * 0.01) * (electronic ? 22 : 28));
        };
        const src = noise(ctx, 0.25, env);
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = electronic ? 1000 : 1400;
        band.Q.value = electronic ? 1.5 : 1;
        gain.gain.setValueAtTime(0.7, at);
        src.connect(band);
        band.connect(gain);
        src.start(at);
        src.stop(at + 0.25);
        return src;
    }

    if (voice === 'tom') {
        // A tom: a kick's shape an octave up, ringing longer. Electronic is a
        // touch higher and cleaner, the way a machine's toms are.
        const osc = electronic ? drop(ctx, 260, 130, 0.2, at) : drop(ctx, 200, 100, 0.12, at);
        const ring = electronic ? 0.45 : 0.35;
        gain.gain.setValueAtTime(0.8, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
        osc.connect(gain);
        osc.start(at);
        osc.stop(at + ring + 0.02);
        return osc;
    }

    if (electronic) {
        // A drum machine's hat: two square waves a fifth apart through a
        // high-pass, over in fifty milliseconds. Metal, not air.
        const a = ctx.createOscillator();
        a.type = 'square';
        a.frequency.value = 7000;
        const b = ctx.createOscillator();
        b.type = 'square';
        b.frequency.value = 9300;
        const high = ctx.createBiquadFilter();
        high.type = 'highpass';
        high.frequency.value = 6500;
        gain.gain.setValueAtTime(0.2, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
        a.connect(high);
        b.connect(high);
        high.connect(gain);
        a.start(at);
        b.start(at);
        a.stop(at + 0.06);
        b.stop(at + 0.06);
        return a;
    }

    // A short burst of noise through a band-pass: a hat without the room.
    const src = noise(ctx, 0.15);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2600;
    band.Q.value = 0.9;
    gain.gain.setValueAtTime(0.55, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    src.connect(band);
    band.connect(gain);
    src.start(at);
    src.stop(at + 0.15);
    return src;
}

/**
 * Plays one bar from now on the live context. Returns a stop, which lets the
 * last hit finish rather than cutting it: a drum stopped dead clicks.
 */
export function playRhythm(hits: RhythmHit[], bpm: number, kit: Kit = 'acoustic'): () => void {
    const ctx = liveAudioContext();
    if (!ctx) return () => {};
    const now = ctx.currentTime + 0.02;
    const started = hits.map(h => scheduleHit(ctx, h.voice, now + h.step * stepSeconds(bpm), kit));
    return () => {
        const t = ctx.currentTime;
        started.forEach(s => {
            try { s.stop(t + 0.05); } catch { /* already stopped */ }
        });
    };
}

/** One hit, now — the sound a square makes when it is tapped. */
export function soundHit(voice: Voice, kit: Kit = 'acoustic'): void {
    const ctx = liveAudioContext();
    if (!ctx) return;
    scheduleHit(ctx, voice, ctx.currentTime + 0.01, kit);
}

/**
 * Renders the bar to a WAV, offline. Two passes rather than one: a single
 * bar at a hundred is two and a half seconds, and a rhythm needs to come
 * round once to be heard as a rhythm.
 */
export async function renderRhythmWav(hits: RhythmHit[], bpm: number, passes = 2, kit: Kit = 'acoustic'): Promise<{ blob: Blob; seconds: number }> {
    const rate = 44100;
    const seconds = barSeconds(bpm) * passes + 0.35;
    const ctx = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
    for (let pass = 0; pass < passes; pass++) {
        const offset = 0.02 + pass * barSeconds(bpm);
        hits.forEach(h => scheduleHit(ctx, h.voice, offset + h.step * stepSeconds(bpm), kit));
    }
    const buffer = await ctx.startRendering();
    return { blob: encodeWav(buffer), seconds: Math.round(seconds) };
}
