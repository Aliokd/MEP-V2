import type { CoreVoice } from '../lib/rhythmSynth';

/*
 * The feels Developing a rhythm hands out: one bar each, as steps 0–15 per
 * voice, with the tempo the feel lives at. Written rather than generated — a
 * feel is a pattern people recognise, and a random bar is none of them.
 *
 * High is the hat, mid the snare, low the kick. Five feels, none exotic: the
 * exercise is what you do to one, not knowing them.
 */

export interface RhythmFeel {
    id: string;
    bpm: number;
    hits: Record<CoreVoice, number[]>;
}

export const RHYTHM_FEELS: RhythmFeel[] = [
    {
        // Eighths on the hat, kick on one and three, snare on two and four.
        id: 'straight', bpm: 100,
        hits: { high: [0, 2, 4, 6, 8, 10, 12, 14], mid: [4, 12], low: [0, 8] },
    },
    {
        // The same, with the kick pushing on the "and" of two and three.
        id: 'rock', bpm: 110,
        hits: { high: [0, 2, 4, 6, 8, 10, 12, 14], mid: [4, 12], low: [0, 6, 8, 10] },
    },
    {
        // Sixteenths on the hat, the kick syncopated, a ghost before the four.
        id: 'funk', bpm: 100,
        hits: { high: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], mid: [4, 11, 12], low: [0, 3, 6, 10] },
    },
    {
        // Quarters on the hat, room to breathe, the kick leaning into three.
        id: 'ballad', bpm: 80,
        hits: { high: [0, 4, 8, 12], mid: [4, 12], low: [0, 8, 10] },
    },
    {
        // A 3-2 clave on the snare, offbeat hats, the kick on every beat.
        id: 'latin', bpm: 105,
        hits: { high: [2, 6, 10, 14], mid: [0, 3, 6, 8, 10], low: [0, 4, 8, 12] },
    },
];
