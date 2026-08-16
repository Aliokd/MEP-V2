/**
 * Automatic song decomposition, entirely in the browser.
 *
 * The pipeline is classic music-structure analysis, scaled to run in a few
 * seconds of main-thread time (with periodic yields so the UI never freezes):
 *
 *   1. Decode and downsample to mono ~22kHz.
 *   2. FFT frames → log-spaced band energies (a coarse timbre fingerprint).
 *   3. Average frames into half-second blocks.
 *   4. Novelty curve: cosine distance between the sound just before and just
 *      after each moment. Peaks are section boundaries.
 *   5. Cluster segments by timbre similarity; repetition + loudness decide
 *      which cluster is the chorus, which the verses, and position decides
 *      intro / outro / bridge.
 *
 * Accuracy is honest-heuristic: boundaries land well, labels are a good first
 * guess. The function signature is the contract — when the GPU model pipeline
 * (SongFormer) lands, it replaces this implementation and nothing above it
 * changes.
 */

import type { AuthoredSection } from '../data/practiceSongs';
import type { SectionKind } from '../data/sections';

export class AnalysisFailed extends Error {
    constructor(public reason: 'fetch' | 'decode' | 'too-short' | 'too-flat') {
        super(`analysis failed: ${reason}`);
    }
}

/** Analyses are expensive; remember them per URL for the session. */
const cache = new Map<string, AuthoredSection[]>();

export async function analyzeSongUrl(url: string): Promise<AuthoredSection[]> {
    const hit = cache.get(url);
    if (hit) return hit;

    let data: ArrayBuffer;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        data = await res.arrayBuffer();
    } catch {
        throw new AnalysisFailed('fetch');
    }

    const sections = await analyzeAudioData(data);
    cache.set(url, sections);
    return sections;
}

// ---------------------------------------------------------------------------

const TARGET_SR = 22050;
const FRAME = 2048;
const HOP = 1024;
const N_BANDS = 24;
const BLOCK_SECONDS = 0.5;
const KERNEL_BLOCKS = 8;      // 4s of context on each side of the novelty kernel
const MIN_GAP_BLOCKS = 14;    // no two boundaries within 7s
const MIN_SEGMENT = 6;        // seconds; shorter segments merge into a neighbour
const MAX_BOUNDARIES = 11;

async function analyzeAudioData(data: ArrayBuffer): Promise<AuthoredSection[]> {
    const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    let audio: AudioBuffer;
    try {
        audio = await ac.decodeAudioData(data);
    } catch {
        throw new AnalysisFailed('decode');
    } finally {
        void ac.close();
    }

    const duration = audio.duration;
    if (duration < 45) throw new AnalysisFailed('too-short');

    // Mono mixdown, decimated toward the target rate.
    const ch0 = audio.getChannelData(0);
    const ch1 = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
    const decim = Math.max(1, Math.floor(audio.sampleRate / TARGET_SR));
    const sr = audio.sampleRate / decim;
    const n = Math.floor(ch0.length / decim);
    const mono = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const s = i * decim;
        mono[i] = ch1 ? (ch0[s] + ch1[s]) * 0.5 : ch0[s];
    }

    // Hann window and log-spaced band edges, set up once.
    const hann = new Float32Array(FRAME);
    for (let i = 0; i < FRAME; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));

    const fMin = 55;
    const fMax = Math.min(8000, sr / 2 * 0.95);
    const edges: number[] = [];
    for (let b = 0; b <= N_BANDS; b++) {
        const f = fMin * Math.pow(fMax / fMin, b / N_BANDS);
        edges.push(Math.max(1, Math.min(FRAME / 2 - 1, Math.round((f / sr) * FRAME))));
    }

    // Per-frame features.
    const frames = Math.max(0, Math.floor((n - FRAME) / HOP));
    if (frames < 40) throw new AnalysisFailed('too-short');
    const bandFeats: Float32Array[] = [];
    const rmsArr = new Float32Array(frames);
    const re = new Float32Array(FRAME);
    const im = new Float32Array(FRAME);

    for (let f = 0; f < frames; f++) {
        const off = f * HOP;
        let sq = 0;
        for (let i = 0; i < FRAME; i++) {
            const v = mono[off + i];
            sq += v * v;
            re[i] = v * hann[i];
            im[i] = 0;
        }
        rmsArr[f] = Math.sqrt(sq / FRAME);
        fft(re, im);

        const bands = new Float32Array(N_BANDS);
        for (let b = 0; b < N_BANDS; b++) {
            let e = 0;
            for (let k = edges[b]; k < edges[b + 1]; k++) e += re[k] * re[k] + im[k] * im[k];
            bands[b] = Math.log1p(e);
        }
        bandFeats.push(bands);

        // Keep the tab responsive on long songs.
        if (f % 400 === 399) await new Promise(r => setTimeout(r, 0));
    }

    // Half-second blocks.
    const frameRate = sr / HOP;
    const perBlock = Math.max(1, Math.round(BLOCK_SECONDS * frameRate));
    const nBlocks = Math.floor(frames / perBlock);
    if (nBlocks < KERNEL_BLOCKS * 2 + 4) throw new AnalysisFailed('too-short');

    const blocks: Float32Array[] = [];
    const blockRms = new Float32Array(nBlocks);
    for (let t = 0; t < nBlocks; t++) {
        const acc = new Float32Array(N_BANDS);
        let rms = 0;
        for (let f = t * perBlock; f < (t + 1) * perBlock; f++) {
            for (let b = 0; b < N_BANDS; b++) acc[b] += bandFeats[f][b];
            rms += rmsArr[f];
        }
        for (let b = 0; b < N_BANDS; b++) acc[b] /= perBlock;
        blocks.push(acc);
        blockRms[t] = rms / perBlock;
    }

    if (maxOf(blockRms) < 1e-4) throw new AnalysisFailed('too-flat');

    /*
     * Centre every block on the song's average timbre before normalising.
     * Raw band energies all point roughly the same way — the mix's overall
     * envelope — so cosine similarity saturates near 1 and every section
     * clusters together. What separates a verse from a chorus is how it
     * *differs* from the song's average sound, so compare those differences.
     */
    const meanVec = new Float32Array(N_BANDS);
    for (const blk of blocks) for (let b = 0; b < N_BANDS; b++) meanVec[b] += blk[b];
    for (let b = 0; b < N_BANDS; b++) meanVec[b] /= nBlocks;
    for (const blk of blocks) {
        for (let b = 0; b < N_BANDS; b++) blk[b] -= meanVec[b];
        normalize(blk);
    }

    // Novelty: how differently does the music behave before vs after t?
    const novelty = new Float32Array(nBlocks);
    for (let t = KERNEL_BLOCKS; t < nBlocks - KERNEL_BLOCKS; t++) {
        const past = new Float32Array(N_BANDS);
        const future = new Float32Array(N_BANDS);
        for (let k = 1; k <= KERNEL_BLOCKS; k++) {
            for (let b = 0; b < N_BANDS; b++) {
                past[b] += blocks[t - k][b];
                future[b] += blocks[t + k - 1][b];
            }
        }
        normalize(past);
        normalize(future);
        novelty[t] = 1 - dot(past, future);
    }

    // Boundary picking: strongest peaks first, keeping their distance.
    const mean = avg(novelty, KERNEL_BLOCKS, nBlocks - KERNEL_BLOCKS);
    const sd = std(novelty, mean, KERNEL_BLOCKS, nBlocks - KERNEL_BLOCKS);
    const threshold = mean + 0.5 * sd;

    const candidates: { t: number; v: number }[] = [];
    for (let t = KERNEL_BLOCKS + 1; t < nBlocks - KERNEL_BLOCKS - 1; t++) {
        if (novelty[t] >= threshold && novelty[t] >= novelty[t - 1] && novelty[t] >= novelty[t + 1]) {
            candidates.push({ t, v: novelty[t] });
        }
    }
    candidates.sort((a, b) => b.v - a.v);

    const chosen: number[] = [];
    for (const c of candidates) {
        if (chosen.length >= MAX_BOUNDARIES) break;
        if (chosen.every(x => Math.abs(x - c.t) >= MIN_GAP_BLOCKS)) chosen.push(c.t);
    }
    chosen.sort((a, b) => a - b);

    // Blocks → seconds, with tiny segments folded into their neighbour.
    const blockDur = perBlock / frameRate;
    let bounds = [0, ...chosen.map(t => t * blockDur), duration];
    bounds = mergeShort(bounds, MIN_SEGMENT);
    if (bounds.length < 4) throw new AnalysisFailed('too-flat'); // fewer than 3 sections heard

    // Segment features for clustering and labelling.
    const segs = [] as { start: number; end: number; feat: Float32Array; energy: number }[];
    for (let i = 0; i < bounds.length - 1; i++) {
        const b0 = Math.min(nBlocks - 1, Math.floor(bounds[i] / blockDur));
        const b1 = Math.max(b0 + 1, Math.min(nBlocks, Math.floor(bounds[i + 1] / blockDur)));
        const feat = new Float32Array(N_BANDS);
        let energy = 0;
        for (let t = b0; t < b1; t++) {
            for (let b = 0; b < N_BANDS; b++) feat[b] += blocks[t][b];
            energy += blockRms[t];
        }
        normalize(feat);
        segs.push({ start: bounds[i], end: bounds[i + 1], feat, energy: energy / (b1 - b0) });
    }

    // Greedy timbre clustering.
    const clusterOf = new Array<number>(segs.length).fill(-1);
    const centroids: Float32Array[] = [];
    for (let i = 0; i < segs.length; i++) {
        let best = -1;
        let bestSim = 0.52;
        for (let c = 0; c < centroids.length; c++) {
            const sim = dot(segs[i].feat, centroids[c]);
            if (sim > bestSim) { bestSim = sim; best = c; }
        }
        if (best === -1) {
            centroids.push(Float32Array.from(segs[i].feat));
            clusterOf[i] = centroids.length - 1;
        } else {
            clusterOf[i] = best;
            const c = centroids[best];
            for (let b = 0; b < N_BANDS; b++) c[b] = (c[b] + segs[i].feat[b]) / 2;
            normalize(c);
        }
    }

    // Who is the chorus? The cluster that repeats and hits hardest.
    const eMin = Math.min(...segs.map(s => s.energy));
    const eMax = Math.max(...segs.map(s => s.energy));
    const eNorm = (e: number) => (e - eMin) / (eMax - eMin + 1e-9);

    const clusterIds = [...new Set(clusterOf)];
    const stats = clusterIds.map(id => {
        const members = segs.filter((_, i) => clusterOf[i] === id);
        return {
            id,
            count: members.length,
            energy: members.reduce((a, s) => a + eNorm(s.energy), 0) / members.length,
        };
    });

    const repeated = stats.filter(s => s.count >= 2);
    const chorusId = (repeated.length > 0 ? repeated : stats)
        .reduce((a, b) => (a.count + 2 * a.energy >= b.count + 2 * b.energy ? a : b)).id;
    const verseCandidates = repeated.filter(s => s.id !== chorusId);
    const verseId = verseCandidates.length > 0
        ? verseCandidates.reduce((a, b) => (a.count >= b.count ? a : b)).id
        : -1;

    const kinds: SectionKind[] = segs.map((_, i) =>
        clusterOf[i] === chorusId ? 'chorus' : clusterOf[i] === verseId ? 'verse' : 'other');

    // If one cluster swallowed the song, timbre alone couldn't tell the
    // sections apart — fall back to loudness: the louder half is the chorus.
    const chorusShare = kinds.filter(k => k === 'chorus').length / segs.length;
    if (chorusShare > 0.6 && segs.length >= 4) {
        const members = segs
            .map((s, i) => ({ i, e: eNorm(s.energy) }))
            .filter(({ i }) => kinds[i] === 'chorus');
        // A chorus is about a third of a song, not half — cut at the 65th percentile.
        const cut = [...members].sort((a, b) => a.e - b.e)[Math.min(members.length - 1, Math.floor(members.length * 0.65))].e;
        for (const { i, e } of members) kinds[i] = e >= Math.max(cut, 0.55) ? 'chorus' : 'verse';
    }

    // Position refines the leftovers.
    for (let i = 0; i < segs.length; i++) {
        if (kinds[i] !== 'other') continue;
        const e = eNorm(segs[i].energy);
        if (i === 0) kinds[i] = 'intro';
        else if (i === segs.length - 1) kinds[i] = e < 0.55 ? 'outro' : kinds[i];
        else kinds[i] = e >= 0.5 ? 'bridge' : 'other';
    }

    // A short opener is an intro whatever it clusters with; a quiet longer one too.
    if (segs[0].end - segs[0].start <= 16 || (kinds[0] !== 'chorus' && eNorm(segs[0].energy) < 0.4)) {
        kinds[0] = 'intro';
    }

    /*
     * A song has one bridge, not five. Keep the candidate nearest the classic
     * spot (two-thirds in) and hear the rest as verses or choruses by weight.
     */
    const bridgeIdxs = kinds.map((k, i) => (k === 'bridge' ? i : -1)).filter(i => i >= 0);
    if (bridgeIdxs.length > 1) {
        const sweetSpot = duration * 0.66;
        const keep = bridgeIdxs.reduce((a, b) => {
            const midA = (segs[a].start + segs[a].end) / 2;
            const midB = (segs[b].start + segs[b].end) / 2;
            return Math.abs(midA - sweetSpot) <= Math.abs(midB - sweetSpot) ? a : b;
        });
        for (const i of bridgeIdxs) {
            if (i !== keep) kinds[i] = eNorm(segs[i].energy) >= 0.6 ? 'chorus' : 'verse';
        }
    }

    return segs.map((s, i) => ({
        kind: kinds[i],
        start: Math.round(s.start * 10) / 10,
        end: Math.round(s.end * 10) / 10,
    }));
}

// ---------------------------------------------------------------------------

/** In-place radix-2 FFT. Lengths are powers of two by construction. */
function fft(re: Float32Array, im: Float32Array): void {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            const tr = re[i]; re[i] = re[j]; re[j] = tr;
            const ti = im[i]; im[i] = im[j]; im[j] = ti;
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = (-2 * Math.PI) / len;
        const wr = Math.cos(ang);
        const wi = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let cr = 1;
            let ci = 0;
            const half = len >> 1;
            for (let k = 0; k < half; k++) {
                const ur = re[i + k];
                const ui = im[i + k];
                const vr = re[i + k + half] * cr - im[i + k + half] * ci;
                const vi = re[i + k + half] * ci + im[i + k + half] * cr;
                re[i + k] = ur + vr;
                im[i + k] = ui + vi;
                re[i + k + half] = ur - vr;
                im[i + k + half] = ui - vi;
                const ncr = cr * wr - ci * wi;
                ci = cr * wi + ci * wr;
                cr = ncr;
            }
        }
    }
}

function normalize(v: Float32Array): void {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    const norm = Math.sqrt(s) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= norm;
}

function dot(a: Float32Array, b: Float32Array): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

function avg(v: Float32Array, from: number, to: number): number {
    let s = 0;
    for (let i = from; i < to; i++) s += v[i];
    return s / Math.max(1, to - from);
}

function std(v: Float32Array, mean: number, from: number, to: number): number {
    let s = 0;
    for (let i = from; i < to; i++) s += (v[i] - mean) * (v[i] - mean);
    return Math.sqrt(s / Math.max(1, to - from));
}

function maxOf(v: Float32Array): number {
    let m = -Infinity;
    for (let i = 0; i < v.length; i++) if (v[i] > m) m = v[i];
    return m;
}

/** Fold segments shorter than `min` seconds into the previous one. */
function mergeShort(bounds: number[], min: number): number[] {
    const out = [bounds[0]];
    for (let i = 1; i < bounds.length; i++) {
        if (bounds[i] - out[out.length - 1] < min && i < bounds.length - 1) continue;
        if (i === bounds.length - 1 && bounds[i] - out[out.length - 1] < min && out.length > 1) {
            out[out.length - 1] = bounds[i];
        } else {
            out.push(bounds[i]);
        }
    }
    return out;
}
