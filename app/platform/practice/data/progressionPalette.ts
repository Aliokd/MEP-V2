import { Key, Note } from 'tonal';
import { keyTriads, numeralOf } from './progressions';
import type { PracticeKey } from './keys';

/*
 * Practice 8 — developing a progression. What is given, and what it can be
 * developed with, both derived from `tonal` per key for the reasons the
 * other practice data files give: a key's chords are a fact, not content.
 */

export type PaletteGroup = 'plain' | 'sevenths' | 'colour';

export interface PaletteChord {
    symbol: string;
    /** Written the way songwriters write it: "V7", "iv", "bVII". */
    numeral: string;
    group: PaletteGroup;
}

/**
 * The plain progressions handed out, as scale degrees over the key's triads.
 * The ones everybody has heard, because the exercise is what you do to one,
 * not finding one.
 */
export const PLAIN_PROGRESSIONS: Record<PracticeKey['mode'], number[][]> = {
    major: [
        [0, 4, 5, 3],   // I V vi IV
        [0, 5, 3, 4],   // I vi IV V
        [5, 3, 0, 4],   // vi IV I V
        [0, 3, 4, 0],   // I IV V I
        [1, 4, 0, 0],   // ii V I I
        [0, 3, 5, 4],   // I IV vi V
    ],
    minor: [
        [0, 5, 2, 6],   // i VI III VII
        [0, 3, 4, 0],   // i iv v i
        [0, 6, 5, 6],   // i VII VI VII
        [0, 5, 3, 4],   // i VI iv v
    ],
};

/** A plain progression as chord symbols in the key. */
export function plainProgression(key: PracticeKey, example: number): string[] {
    const triads = keyTriads(key);
    return PLAIN_PROGRESSIONS[key.mode][example].map(d => triads[d]);
}

const SEVENTH_NUMERALS: Record<PracticeKey['mode'], string[]> = {
    major: ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'],
    minor: ['i7', 'iiø7', 'IIImaj7', 'iv7', 'v7', 'VImaj7', 'VII7'],
};

/**
 * Everything the given progression can be developed with, in three groups:
 * the key's own triads (for swapping one plain chord for another), their
 * sevenths, and a handful of colour — the two suspensions every song uses,
 * and the borrowed chords a key reaches for most.
 */
export function developPalette(key: PracticeKey): PaletteChord[] {
    const triads = keyTriads(key);
    const sevenths = key.mode === 'major'
        ? [...Key.majorKey(key.tonic).chords]
        : [...Key.minorKey(key.tonic).natural.chords];
    const t = key.tonic;
    const fifth = Note.transpose(t, '5P');

    const plain: PaletteChord[] = triads.map(symbol => ({
        symbol, numeral: numeralOf(key, symbol) ?? '', group: 'plain',
    }));
    const sevs: PaletteChord[] = sevenths.map((symbol, i) => ({
        symbol, numeral: SEVENTH_NUMERALS[key.mode][i], group: 'sevenths',
    }));
    const colour: PaletteChord[] = key.mode === 'major'
        ? [
            { symbol: `${t}sus4`, numeral: 'Isus4', group: 'colour' },
            { symbol: `${fifth}sus4`, numeral: 'Vsus4', group: 'colour' },
            { symbol: `${Note.transpose(t, '4P')}m`, numeral: 'iv', group: 'colour' },
            { symbol: Note.transpose(t, '7m'), numeral: 'bVII', group: 'colour' },
            { symbol: Note.transpose(t, '2M'), numeral: 'V/V', group: 'colour' },
        ]
        : [
            { symbol: `${t}sus4`, numeral: 'isus4', group: 'colour' },
            { symbol: `${fifth}sus4`, numeral: 'vsus4', group: 'colour' },
            { symbol: Note.transpose(t, '4P'), numeral: 'IV', group: 'colour' },
            { symbol: fifth, numeral: 'V', group: 'colour' },
        ];
    return [...plain, ...sevs, ...colour];
}

/** The numeral of any chord the palette offers, or the symbol itself for one it does not. */
export function paletteNumeral(palette: PaletteChord[], symbol: string): string {
    return palette.find(p => p.symbol === symbol)?.numeral ?? symbol;
}
