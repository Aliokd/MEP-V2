/**
 * The shared vocabulary of song sections: how a lyric section's title maps to a
 * kind, what that kind is called, and what colour it wears. The timeline and the
 * lyric list both read from here so a section can never be a "Bridge" in one and
 * a "Pre-chorus" in the other.
 */

export type SectionKind = 'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'outro' | 'other';

/**
 * Drawn from the platform's green ramp plus the stone neutrals: the more a
 * section carries the song, the greener it gets, with the chorus on the accent
 * green itself. Instrumental stretches stay stone.
 */
export const KIND_STYLE: Record<SectionKind, { bg: string; text: string }> = {
    intro: { bg: '#E4E4DF', text: '#57534E' },
    verse: { bg: '#D1ECD4', text: '#292524' },
    prechorus: { bg: '#A1D1A1', text: '#1F2E1D' },
    chorus: { bg: '#86BE7F', text: '#1C2B1A' },
    bridge: { bg: '#6CA365', text: '#FAF9F5' },
    outro: { bg: '#C9C8BE', text: '#44403C' },
    other: { bg: '#EFEFEA', text: '#78716C' },
};

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
