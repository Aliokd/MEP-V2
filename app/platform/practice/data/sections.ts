/**
 * The shared vocabulary of song sections: how a lyric section's title maps to a
 * kind, what that kind is called, and what colour it wears. The timeline and the
 * lyric list both read from here so a section can never be a "Bridge" in one and
 * a "Pre-chorus" in the other.
 */

export type SectionKind = 'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'outro' | 'other';

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
    chorus: '#B0AD9A',
};

/** One colour and one weight for every label on the timeline. */
export const SECTION_TEXT = '#44403C';

export const KIND_LABEL_KEY: Record<SectionKind, string> = {
    intro: 'practice.section_intro',
    verse: 'practice.section_verse',
    prechorus: 'practice.section_prechorus',
    chorus: 'practice.section_chorus',
    bridge: 'practice.section_bridge',
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
    if (lower.includes('outro')) return 'outro';
    return 'other';
}

export function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
