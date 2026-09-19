import { Key, Note } from 'tonal';

/*
 * The keys the practices offer, shared by Chord progressions and Melody so a
 * songwriter meets the same nine in both. Derived from `tonal` at call time,
 * for the reasons lib/chords.ts gives: a key's contents are a fact, not
 * content, and a tenth key is one line here rather than a dataset.
 */

export type KeyMode = 'major' | 'minor';

export interface PracticeKey {
    /** Stable id, doubles as the display symbol ("C", "Am"). */
    id: string;
    tonic: string;
    mode: KeyMode;
}

/**
 * In the order a guitarist would recognise them: the open major keys first,
 * then the three minors most songs in them lean on. Nine is enough to make
 * the choice real without turning the first step into a lesson.
 */
export const PRACTICE_KEYS: PracticeKey[] = [
    { id: 'C', tonic: 'C', mode: 'major' },
    { id: 'G', tonic: 'G', mode: 'major' },
    { id: 'D', tonic: 'D', mode: 'major' },
    { id: 'A', tonic: 'A', mode: 'major' },
    { id: 'E', tonic: 'E', mode: 'major' },
    { id: 'F', tonic: 'F', mode: 'major' },
    { id: 'Am', tonic: 'A', mode: 'minor' },
    { id: 'Em', tonic: 'E', mode: 'minor' },
    { id: 'Dm', tonic: 'D', mode: 'minor' },
];

/** The seven intervals of the key's scale, tonic first. */
function scaleIntervals(key: PracticeKey): string[] {
    return key.mode === 'major'
        ? [...Key.majorKey(key.tonic).intervals]
        : [...Key.minorKey(key.tonic).natural.intervals];
}

/**
 * The seven scale degrees as pitches, tonic in octave 4 and the rest stepping
 * up from it. Transposed from the tonic rather than read off the scale's note
 * names, because the names alone do not say which octave a degree is in — in
 * B major, C# is above B, not below it.
 */
export function keyScale(key: PracticeKey): { name: string; midi: number; freq: number }[] {
    const root = `${key.tonic}4`;
    return scaleIntervals(key).map(interval => {
        const pitch = Note.transpose(root, interval);
        return {
            name: Note.pitchClass(pitch),
            midi: Note.midi(pitch) ?? 60,
            freq: Note.freq(pitch) ?? 261.63,
        };
    });
}
