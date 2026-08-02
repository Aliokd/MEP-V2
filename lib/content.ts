/**
 * Shared model for editorial content (Learn chapters and lessons, Bank of Ideas,
 * Practice songs). No firebase imports — used by the admin console, the platform
 * read path and the migration script alike.
 *
 * Everything editorial lives in Firestore. Lessons previously came from Firebase
 * Data Connect (Postgres) and ideas/songs were hardcoded TypeScript modules; both
 * meant a deploy to change a sentence.
 */

export type Locale = "en" | "no" | "sv";
export const LOCALES: Locale[] = ["en", "no", "sv"];
export const LOCALE_LABELS: Record<Locale, string> = {
    en: "English",
    no: "Norsk",
    sv: "Svenska",
};

/** A string in every language we ship. `en` is the fallback and must be present. */
export type LocalizedText = Partial<Record<Locale, string>>;

export type ContentStatus = "draft" | "scheduled" | "published" | "archived";

export const CONTENT_STATUSES: ContentStatus[] = ["draft", "scheduled", "published", "archived"];

export interface LearnChapter {
    id: string;
    title: LocalizedText;
    description?: LocalizedText;
    order: number;
    status: ContentStatus;
    publishAt?: string | null;
}

export interface LearnLesson {
    id: string;
    chapterId: string;
    title: LocalizedText;
    summary?: LocalizedText;
    videoUrl: string;
    posterUrl?: string | null;
    midiDataUrl?: string | null;
    durationSeconds: number;
    order: number;
    prerequisiteIds: string[];
    status: ContentStatus;
    publishAt?: string | null;
}

export interface MaestroNote {
    id: string;
    lessonId: string;
    /** Seconds into the lesson video where the note appears. */
    timestamp: number;
    body: LocalizedText;
}

export type IdeaCategory = "lyrics" | "melody" | "chords" | "vibe";
export const IDEA_CATEGORIES: IdeaCategory[] = ["lyrics", "melody", "chords", "vibe"];

export interface IdeaDoc {
    id: string;
    category: IdeaCategory;
    order: number;
    status: ContentStatus;
    title: LocalizedText;
    description: LocalizedText;
    whyItHelps?: LocalizedText;
    example?: LocalizedText;
}

export interface PracticeWord {
    text: string;
    start: number;
    end: number;
}
export interface PracticeLine {
    words: PracticeWord[];
}
export interface PracticeSection {
    title: string;
    lines: PracticeLine[];
}

export interface PracticeSongDoc {
    id: string;
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl?: string | null;
    lyrics: PracticeSection[];
    order: number;
    status: ContentStatus;
    /**
     * Practice ships real commercial songs, so every row carries its rights
     * position. An empty licence is a takedown waiting to happen.
     */
    rights?: {
        licence?: string | null;
        holder?: string | null;
        notes?: string | null;
    };
}

/**
 * A standalone website page — privacy policy, terms, and anything else editorial
 * that lives on the marketing site rather than inside the platform.
 *
 * The document id IS the slug, which makes uniqueness free: two pages can't claim
 * /terms because they'd be the same document.
 */
export interface SitePage {
    /** Same as the slug. URL is /{slug}, or /no/{slug} and /sv/{slug}. */
    id: string;
    slug: string;
    title: LocalizedText;
    /** Meta description and the standfirst under the page title. */
    description: LocalizedText;
    /** Markdown. Rendered with HTML disabled — see lib/sitePages.ts. */
    body: LocalizedText;
    /** Slug of the parent page, or null for a top-level page. One level deep. */
    parentId: string | null;
    order: number;
    status: ContentStatus;
    /** Whether the page gets a link in the site footer. */
    showInFooter?: boolean;
    updatedAt?: number | null;
    updatedByEmail?: string | null;
}

/** Reads a localized field, falling back to English, then to any language present. */
export function pickLocale(text: LocalizedText | undefined | null, locale: Locale): string {
    if (!text) return "";
    return text[locale] || text.en || Object.values(text).find(Boolean) || "";
}

/**
 * How much of a record is translated, as a 0–1 fraction per locale. Drives the
 * completeness indicators in the CMS so a half-translated lesson is obvious
 * before it ships to Norwegian or Swedish users.
 */
export function localeCompleteness(
    fields: (LocalizedText | undefined | null)[],
): Record<Locale, number> {
    const present = fields.filter(Boolean) as LocalizedText[];
    if (present.length === 0) return { en: 0, no: 0, sv: 0 };

    const result = {} as Record<Locale, number>;
    for (const locale of LOCALES) {
        const filled = present.filter((f) => Boolean(f[locale]?.trim())).length;
        result[locale] = filled / present.length;
    }
    return result;
}

/** True when a record is live for readers right now. */
export function isLive(status: ContentStatus, publishAt?: string | null): boolean {
    if (status === "published") return true;
    if (status === "scheduled" && publishAt) return Date.parse(publishAt) <= Date.now();
    return false;
}
