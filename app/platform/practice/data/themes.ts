/**
 * The starting points Practice 2 (Composing verses) offers before a verse is
 * written. A theme is a label and nothing more: nothing downstream is keyed by
 * it, it is shown on the card, in the pill above the steps, and in the title of
 * the canvas the finished verse lands in.
 *
 * Authored in the admin console (practice_themes); this list is the bundled
 * fallback, the same arrangement as the songs and melodies. The ids are stable
 * slugs so an import into the CMS lands on the same documents every time.
 */
export interface PracticeTheme {
    id: string;
    label: string;
}

const LABELS = [
    'Nature', 'Sports', 'Urban life', 'Solitude', 'Memory', 'Ambition', 'Conflict', 'Harmony',
    'Velocity', 'Starlight', 'The deep', 'Whispers', 'Machines', 'Ritual', 'Digital soul', 'The harvest',
] as const;

export const PRACTICE_THEMES: PracticeTheme[] = LABELS.map((label) => ({
    id: `theme-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label,
}));
