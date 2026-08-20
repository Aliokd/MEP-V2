/**
 * The shared vocabulary of song sections: how a lyric section's title maps to a
 * kind, what that kind is called, and what colour it wears. The timeline and the
 * lyric list both read from here so a section can never be a "Bridge" in one and
 * a "Pre-chorus" in the other.
 */

export type SectionKind = 'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'solo' | 'outro' | 'other';

/**
 * A single beige ramp: the more a section carries the song, the deeper the
 * shade. Green is deliberately absent here — it belongs to success states, so
 * a correctly named section can read as green without competing with its own
 * colour. Every shade stays light enough for one shared text colour.
 */
export const KIND_BG: Record<SectionKind, string> = {
    other: '#F0F0EA',
    intro: '#E4E4DF',
    outro: '#DCDDD4',
    verse: '#D2D2C6',
    prechorus: '#C9C8BE',
    bridge: '#BDBBAC',
    solo: '#B7B3A3',
    chorus: '#B0AD9A',
};

/** One colour and one weight for every label on the timeline. */
export const SECTION_TEXT = '#44403C';

/**
 * The one beige every name tag wears, named or still blank. The per-kind ramp
 * above belongs to the timeline bands, where the shades do the distinguishing;
 * on a tag the words already say which section it is.
 */
export const TAG_BG = '#E4E4DF';

/** Success: a section the user has correctly named, in the platform's green. */
export const SOLVED_BG = '#86BE7F';
export const SOLVED_TEXT = '#1C2B1A';

/**
 * A named section that the playhead is inside. Only named ones follow along —
 * lighting an unnamed part as the song reaches it would answer the task for the
 * user. A deeper cut of the same green, so it reads as the same state, further on.
 */
export const SOLVED_BG_PLAYING = '#6BA862';

/**
 * How solid a named band's green sits, by kind. Once everything is named the bar
 * is one long stretch of the same colour; leaning on the same ordering as the
 * beige ramp above keeps neighbours reading apart, and keeps the weight
 * meaningful — a chorus lands heavier than an intro.
 */
const SOLVED_ALPHA: Record<SectionKind, number> = {
    other: 0.74,
    intro: 0.76,
    outro: 0.80,
    verse: 0.84,
    prechorus: 0.88,
    bridge: 0.91,
    solo: 0.95,
    chorus: 1,
};

/** The green a named band wears — the success colour, at that kind's weight. */
export function solvedFill(kind: SectionKind): string {
    return `rgba(134, 190, 127, ${SOLVED_ALPHA[kind]})`;
}

/**
 * The "armed, waiting for its match" outline. A deep greige from the same warm
 * family as the section fills — black read as an error state on these panels.
 */
export const ARMED_LINE = '#8C8878';

/**
 * Occurrence numbers for a song's sections, in playing order: the first verse
 * is 1, the second is 2. A kind that only happens once stays unnumbered — a
 * lone "Intro 1" reads as though a second one went missing.
 */
export function sectionOrdinals(kinds: SectionKind[]): (number | null)[] {
    const totals = new Map<SectionKind, number>();
    for (const kind of kinds) totals.set(kind, (totals.get(kind) ?? 0) + 1);

    const seen = new Map<SectionKind, number>();
    return kinds.map(kind => {
        if ((totals.get(kind) ?? 0) < 2) return null;
        const n = (seen.get(kind) ?? 0) + 1;
        seen.set(kind, n);
        return n;
    });
}

export const KIND_LABEL_KEY: Record<SectionKind, string> = {
    intro: 'practice.section_intro',
    verse: 'practice.section_verse',
    prechorus: 'practice.section_prechorus',
    chorus: 'practice.section_chorus',
    bridge: 'practice.section_bridge',
    solo: 'practice.section_solo',
    outro: 'practice.section_outro',
    other: 'practice.section_other',
};

export function classifySection(title: string): SectionKind {
    const lower = title.toLowerCase();
    if (lower.includes('intro')) return 'intro';
    if (lower.includes('pre-chorus') || lower.includes('pre chorus')) return 'prechorus';
    if (lower.includes('chorus')) return 'chorus';
    if (lower.includes('verse')) return 'verse';
    if (lower.includes('bridge') || lower.includes('build')) return 'bridge';
    if (lower.includes('solo')) return 'solo';
    if (lower.includes('outro')) return 'outro';
    return 'other';
}

export function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
