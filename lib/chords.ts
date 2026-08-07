import { Chord } from 'tonal';

/**
 * Chord helpers for the writing canvas.
 *
 * Deliberately local — `tonal` is MIT, offline, and derives everything from
 * music theory, so there is no chord API to call. That is not an accident of
 * convenience: every third-party lookup this app has depended on (Datamuse for
 * rhymes, Gemini for the lexicon) eventually failed in production for reasons
 * that could not be fixed from this side — quota, egress, timeouts. Chord data
 * is finite and unchanging, so shipping it beats fetching it.
 *
 * A useful consequence: because these are parsed rather than matched against a
 * fixed list, transposing a whole song later is `Chord.transpose`, not a new
 * dataset.
 */

export interface ChordMark {
    id: string;
    /** Display symbol as the writer typed it, e.g. "Am7", "F#m7b5". */
    symbol: string;
    /** Line the chord is pinned to. */
    phraseId: string;
    /** Index of the word within that line's token list. */
    wordIndex: number;
}

/** Starting palette in the picker — the chords most songs are actually built from,
 *  in the order a guitarist or pianist would recognise them. Anything outside this
 *  is still reachable through the free-text field. */
export const COMMON_CHORDS = [
    'C', 'G', 'Am', 'F',
    'D', 'Em', 'A', 'E',
    'Dm', 'Bm', 'B', 'Bb',
    'G7', 'C7', 'D7', 'E7',
    'Cmaj7', 'Am7', 'Dm7', 'Em7',
    'Csus4', 'Dsus4', 'Asus2', 'Esus4',
] as const;

/** True when `tonal` can parse the symbol as a real chord. Guards the free-text
 *  field so a typo never gets pinned above a lyric. */
export function isValidChord(symbol: string): boolean {
    const trimmed = symbol.trim();
    if (!trimmed) return false;
    return !Chord.get(trimmed).empty;
}

/** The notes a chord is built from ("Am" -> ["A","C","E"]), for the card's
 *  subtitle. Empty when the symbol doesn't parse. */
export function chordNotes(symbol: string): string[] {
    const chord = Chord.get(symbol.trim());
    return chord.empty ? [] : chord.notes;
}

/** Human-readable quality ("Minor", "Major"), or '' when tonal can't classify it —
 *  suspended and added-tone chords legitimately come back "Unknown", so this
 *  returns nothing rather than showing the word "Unknown" to a songwriter. */
export function chordQuality(symbol: string): string {
    const chord = Chord.get(symbol.trim());
    if (chord.empty) return '';
    return chord.quality && chord.quality !== 'Unknown' ? chord.quality : '';
}

/** Normalises casing/spacing without inventing a chord: "am7 " -> "Am7".
 *  Returns the original trimmed input when it doesn't parse, so the caller can
 *  reject it rather than silently storing something the writer didn't type. */
export function normalizeChord(symbol: string): string {
    const trimmed = symbol.trim();
    const chord = Chord.get(trimmed);
    return chord.empty ? trimmed : (chord.symbol || trimmed);
}

// ── Guitar voicings ──────────────────────────────────────────────────────────
// Fingerings come from @tombatossals/chords-db (MIT, ~2000 chords, bundled). Each
// position carries a `midi` array of the notes actually sounded, which is what
// makes playback possible without shipping a single audio file — see chordPitches.

import guitarDbImport from '@tombatossals/chords-db/lib/guitar.json';

// A JSON import lands either as the object itself or wrapped in `.default`,
// depending on the interop the bundler applies — lib/lexicon unwraps its data the
// same way. Doing it once here means a config change can't silently turn every
// chord into "no diagram available".
const guitarDb: any = (guitarDbImport as any)?.default ?? guitarDbImport;

export interface ChordPosition {
    /** Fret per string, low E first. 0 = open, -1 = muted. */
    frets: number[];
    /** Fretting finger per string; 0 = open/muted. */
    fingers: number[];
    baseFret: number;
    barres: number[];
    /** MIDI note numbers actually sounded, low to high. */
    midi: number[];
}

/** The database keys sharps as "Csharp"/"Fsharp" and prefers flats elsewhere, so
 *  every enharmonic spelling a writer might type has to be folded onto its one
 *  stored name — otherwise "Db" or "A#" would look like chords we simply don't have. */
const DB_KEY_BY_PITCH_CLASS: Record<string, string> = {
    'C': 'C',
    'C#': 'Csharp', 'Db': 'Csharp',
    'D': 'D',
    'D#': 'Eb', 'Eb': 'Eb',
    'E': 'E', 'Fb': 'E',
    'F': 'F', 'E#': 'F',
    'F#': 'Fsharp', 'Gb': 'Fsharp',
    'G': 'G',
    'G#': 'Ab', 'Ab': 'Ab',
    'A': 'A',
    'A#': 'Bb', 'Bb': 'Bb',
    'B': 'B', 'Cb': 'B',
};

/** tonal's aliases are already close to the database's suffixes ("m7", "maj7",
 *  "sus4"), but the two most common chords in any song are exactly where they
 *  disagree: tonal calls a plain triad "" and a minor triad "m". */
const SUFFIX_OVERRIDES: Record<string, string> = {
    '': 'major',
    'M': 'major',
    'm': 'minor',
    'min': 'minor',
    'maj': 'major',
};

/**
 * Guitar voicings for a chord symbol, best-known position first.
 *
 * Returns [] when the chord is real but not in the database — a legitimate
 * outcome for exotic voicings, and the caller shows the symbol without a diagram
 * rather than pretending the chord is invalid.
 */
export function chordPositions(symbol: string): ChordPosition[] {
    const chord = Chord.get(symbol.trim());
    if (chord.empty || !chord.tonic) return [];

    const dbKey = DB_KEY_BY_PITCH_CLASS[chord.tonic];
    if (!dbKey) return [];

    const entries = guitarDb?.chords?.[dbKey];
    if (!Array.isArray(entries)) return [];

    // Try every alias tonal knows for this chord type, plus the overrides above.
    const candidates = [
        ...(chord.aliases || []).map(a => SUFFIX_OVERRIDES[a] ?? a),
        ...(chord.aliases || []),
    ];
    for (const suffix of candidates) {
        const match = entries.find((e: any) => e.suffix === suffix);
        if (match?.positions?.length) return match.positions as ChordPosition[];
    }
    return [];
}

/**
 * Frequencies (Hz) for one voicing, for Web Audio playback.
 *
 * Built from the position's own MIDI notes rather than the chord's theoretical
 * pitch classes, so what you hear is the actual voicing on the diagram — right
 * octaves, doubled notes, open strings and all — instead of an abstract triad.
 */
export function chordPitches(position: ChordPosition): number[] {
    if (!position?.midi?.length) return [];
    // A4 = MIDI 69 = 440Hz; twelve equal steps to the octave.
    return position.midi.map(m => 440 * Math.pow(2, (m - 69) / 12));
}
