/**
 * Stand-in audio for Practice 3, until the real piano and guitar takes exist.
 *
 * The exercise is unusable and untestable without something to listen to, and
 * these are deliberately plain: one note at a time, no chords, no backing — the
 * same constraint the real recordings have, so the UI is being exercised against
 * the shape of the eventual material rather than against silence.
 *
 * They are WAVs, which .gitignore already keeps out of `public/Practice/**`, so
 * they never reach the repo. Drop the real files in beside them and point each
 * melody's `audioUrl` at the mp3.
 *
 *   node scripts/generate-placeholder-melodies.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 22050;
const OUT = join(process.cwd(), 'public', 'Practice', 'Melodies');

/** Semitones above A4, so the melodies can be written in note names. */
const SEMITONE = {
    C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0, B4: 2,
    C5: 3, D5: 5, E5: 7, F5: 8, G5: 10, A5: 12,
};
const hz = (note) => 440 * Math.pow(2, SEMITONE[note] / 12);

/**
 * One note. A plucked-ish envelope — instant attack, exponential decay — plus a
 * quiet second and third harmonic, which is the least a sine can have and still
 * read as an instrument rather than a test tone.
 */
function renderNote(buf, startSec, durSec, note, gain = 0.5) {
    if (note === null) return;
    const f = hz(note);
    const start = Math.floor(startSec * RATE);
    // Let the tail ring past the note's slot rather than cutting it dead.
    const len = Math.floor(Math.min(durSec * 1.9, durSec + 0.5) * RATE);
    for (let i = 0; i < len; i++) {
        const idx = start + i;
        if (idx >= buf.length) break;
        const tt = i / RATE;
        const attack = Math.min(1, tt / 0.008);
        const decay = Math.exp(-tt * 3.2);
        const s =
            Math.sin(2 * Math.PI * f * tt) +
            0.28 * Math.sin(2 * Math.PI * f * 2 * tt) +
            0.12 * Math.sin(2 * Math.PI * f * 3 * tt);
        buf[idx] += s * attack * decay * gain * 0.45;
    }
}

function toWav(samples) {
    const data = Buffer.alloc(samples.length * 2);
    for (let i = 0; i < samples.length; i++) {
        const clipped = Math.max(-1, Math.min(1, samples[i]));
        data.writeInt16LE(Math.round(clipped * 32767), i * 2);
    }
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);           // PCM
    header.writeUInt16LE(1, 22);           // mono
    header.writeUInt32LE(RATE, 24);
    header.writeUInt32LE(RATE * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(data.length, 40);
    return Buffer.concat([header, data]);
}

/** [note, beats] — null is a rest. */
const MELODIES = [
    {
        id: 'morning-line',
        bpm: 92,
        notes: [['G4', 1], ['A4', 1], ['B4', 1], ['D5', 1], ['C5', 2], ['B4', 1], ['G4', 1], ['A4', 4]],
    },
    {
        id: 'slow-turn',
        bpm: 66,
        notes: [['E4', 2], ['G4', 2], ['A4', 1], ['G4', 1], ['E4', 2], [null, 1], ['D4', 1], ['E4', 4]],
    },
    {
        id: 'little-runner',
        bpm: 118,
        notes: [
            ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 1],
            ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['G4', 2],
        ],
    },
    {
        id: 'open-question',
        bpm: 80,
        // Ends on the second, unresolved — the one built for "change the ending"
        // and for "write an answering phrase".
        notes: [['F4', 1], ['A4', 1], ['C5', 2], ['B4', 1], ['G4', 1], ['D5', 3]],
    },
];

mkdirSync(OUT, { recursive: true });

for (const m of MELODIES) {
    const beat = 60 / m.bpm;
    const totalBeats = m.notes.reduce((n, [, b]) => n + b, 0);
    const samples = new Float32Array(Math.ceil((totalBeats * beat + 1.6) * RATE));
    let at = 0.25;
    for (const [note, beats] of m.notes) {
        renderNote(samples, at, beats * beat, note);
        at += beats * beat;
    }
    const file = join(OUT, `${m.id}.wav`);
    writeFileSync(file, toWav(samples));
    console.log(`${m.id}.wav  ${(totalBeats * beat + 1.6).toFixed(1)}s`);
}
console.log(`\nWritten to ${OUT}`);
