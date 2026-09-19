import { STEPS, type Voice } from './rhythmSynth';

/*
 * The bar Build a beat's Random button deals. Not noise: sixteen coin flips
 * per row is a bar nobody would keep, and the button is there to hand over
 * something worth changing. So every deal is a beat — the kick on one and
 * three, the snare on two and four — with the rest drawn from a few musical
 * choices: which hat pattern, where the extra kick pushes, whether the clap
 * doubles the snare, whether the toms answer at the end of the bar.
 *
 * Deterministic. The deal is a pure function of a count the practice keeps,
 * so the same press gives the same bar in a test as on a phone, and nothing
 * impure runs during a render.
 */

export type BeatCells = Record<Voice, boolean[]>;

/** A small, fast generator: mulberry32, seeded from the deal count. */
function rng(seed: number): () => number {
    let a = (seed * 0x9E3779B1 + 0x6D2B79F5) >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const HATS: number[][] = [
    [0, 2, 4, 6, 8, 10, 12, 14],                              // eighths
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],   // sixteenths
    [2, 6, 10, 14],                                           // offbeats
    [0, 4, 8, 12],                                            // quarters
];
/** Where an extra kick can push: the "and"s and the "a"s that lead somewhere. */
const KICK_PUSHES = [3, 6, 10, 11, 14];
/** A ghost before a snare, or after. */
const SNARE_GHOSTS = [7, 11, 14];
/** The last beat of the bar, where a fill lives. */
const TOM_STEPS = [12, 13, 14, 15];

const empty = (): boolean[] => Array.from({ length: STEPS }, () => false);
const on = (steps: number[]): boolean[] => {
    const row = empty();
    steps.forEach(s => { row[s] = true; });
    return row;
};

/** Picks `n` distinct entries from `from`, in `from`'s order. */
function some(next: () => number, from: number[], n: number): number[] {
    const pool = [...from];
    const picked: number[] = [];
    while (picked.length < n && pool.length > 0) {
        picked.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
    }
    return picked.sort((a, b) => a - b);
}

/** The bar for deal `n`. Every one has the kick on one and three and the snare on two and four. */
export function dealBeat(n: number): BeatCells {
    const next = rng(n);
    const hat = HATS[Math.floor(next() * HATS.length)];
    const kick = [0, 8, ...some(next, KICK_PUSHES, 1 + (next() < 0.5 ? 1 : 0))];
    const snare = [4, 12, ...(next() < 0.4 ? some(next, SNARE_GHOSTS, 1) : [])];
    const clapRoll = next();
    const clap = clapRoll < 0.35 ? [12] : clapRoll < 0.6 ? [4, 12] : [];
    const tom = next() < 0.6 ? some(next, TOM_STEPS, 1 + (next() < 0.5 ? 1 : 0)) : [];
    return { high: on(hat), mid: on(snare), low: on(kick), clap: on(clap), tom: on(tom) };
}
