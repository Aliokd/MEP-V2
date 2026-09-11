import { Key } from 'tonal';

/*
 * Practice 4 — chord progressions. The theory behind the exercise, kept apart
 * from the component so it can be read (and tested) without a screen.
 *
 * Everything is derived from `tonal` at call time rather than tabulated: the
 * chords of a key are a fact, not content, and deriving them means a new key
 * is one line here rather than a dataset. Same reasoning as lib/chords.ts.
 */

export type KeyMode = 'major' | 'minor';

export interface PracticeKey {
    /** Stable id, doubles as the display symbol ("C", "Am"). */
    id: string;
    tonic: string;
    mode: KeyMode;
}

/**
 * The keys on offer, in the order a guitarist would recognise them: the open
 * major keys first, then the three minors most songs in them lean on. Nine is
 * enough to make the choice real without turning step one into a lesson.
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

/** How many bars the progression runs. Four is the unit songs are built from. */
export const BAR_COUNT = 4;

/**
 * The seven diatonic triads of a key, tonic first. Triads rather than tonal's
 * default sevenths: "Cmaj7 Dm7 Em7" is correct and nobody's first progression.
 */
export function keyTriads(key: PracticeKey): string[] {
    return key.mode === 'major'
        ? [...Key.majorKey(key.tonic).triads]
        : [...Key.minorKey(key.tonic).natural.triads];
}

/**
 * Roman numerals by scale degree. Case carries quality (upper major, lower
 * minor), and the degree symbol marks the diminished chord, which is how a
 * progression is written down in every songwriting room.
 */
const NUMERALS: Record<KeyMode, string[]> = {
    major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
    minor: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
};

/** The numeral for one chord in a key, or null when it is not in the key. */
export function numeralOf(key: PracticeKey, chord: string): string | null {
    const idx = keyTriads(key).indexOf(chord);
    return idx === -1 ? null : NUMERALS[key.mode][idx];
}

/**
 * The progressions that have names. Matched on numerals rather than symbols so
 * C G Am F and G D Em C are recognised as the same thing, which is the point of
 * numerals. Kept to the handful every songwriter has actually heard of: a name
 * that has to be invented for the sake of a match teaches nothing.
 */
export const KNOWN_PROGRESSIONS: { numerals: string; labelKey: string }[] = [
    { numerals: 'I V vi IV', labelKey: 'practice.cp_known_four_chords' },
    { numerals: 'vi IV I V', labelKey: 'practice.cp_known_four_chords_minor_start' },
    { numerals: 'I vi IV V', labelKey: 'practice.cp_known_fifties' },
    { numerals: 'I IV V I', labelKey: 'practice.cp_known_three_chords' },
    { numerals: 'I IV V IV', labelKey: 'practice.cp_known_three_chords' },
    { numerals: 'i VI III VII', labelKey: 'practice.cp_known_minor_loop' },
    { numerals: 'i VII VI VII', labelKey: 'practice.cp_known_minor_climb' },
];

/** The label key of a named progression, or null for one that is simply yours. */
export function knownProgression(numerals: (string | null)[]): string | null {
    if (numerals.some(n => n === null)) return null;
    const pattern = numerals.join(' ');
    return KNOWN_PROGRESSIONS.find(p => p.numerals === pattern)?.labelKey ?? null;
}
