/**
 * Shared model for editorial content (Learn chapters and lessons, Bank of Ideas,
 * Practice songs). No firebase imports — used by the admin console, the platform
 * read path and the migration script alike.
 *
 * Everything editorial lives in Firestore. Lessons previously came from Firebase
 * Data Connect (Postgres) and ideas/songs were hardcoded TypeScript modules; both
 * meant a deploy to change a sentence.
 */

// Type-only, so this is erased at compile time and the fact that lessonBlocks
// imports LocalizedText back from here stays a paper cycle rather than a real one.
import type { LessonBlock } from "./lessonBlocks";
import type { CmsPracticeSection } from "./practiceLibrary";

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
    /** Ordered lesson content authored in the admin: prose, images, audio,
     *  video and embeds. Absent on lessons written before the block editor. */
    blocks?: LessonBlock[];
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
    /**
     * Word-level lyric timings from the original migration. Practice 1 no longer
     * reads these — it works in sections — but they are the only copy, so they
     * are left in place rather than dropped.
     */
    lyrics?: PracticeSection[];
    /**
     * The structure Practice 1 asks the songwriter to name: where each part of
     * the recording begins and ends. A song without these can be listened to but
     * not decomposed.
     */
    sections?: CmsPracticeSection[];
    /** Length of the recording, filled in from the file on upload. */
    durationSeconds?: number | null;
    /** false → the chooser shows it greyed out as "coming soon". */
    available?: boolean;
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
 * A melody for Practice 3 — Melody variations.
 *
 * A short single-note idea, played on piano or guitar, that a songwriter listens
 * to and then answers with a variation of their own. The exercise never inspects
 * the audio — the comparison is done by ear — so the file and a title are very
 * nearly the whole model.
 */
export interface PracticeMelodyDoc {
    id: string;
    title: string;
    /** So someone can pick the one they can actually play back on. */
    instrument: "piano" | "guitar";
    audioUrl: string;
    /** false → the melody is not offered. A card with no audio is a dead end. */
    available?: boolean;
    order: number;
    status: ContentStatus;
}

/**
 * A standalone website page — privacy policy, terms, and anything else editorial
 * that lives on the marketing site rather than inside the platform.
 *
 * The document id IS the slug, which makes uniqueness free: two pages can't claim
 * /terms because they'd be the same document.
 */
/**
 * The shelves the console files website pages under.
 *
 * "seo" is the name this started under and is still accepted on the way in, so
 * documents written before the blog existed keep working; everything reading
 * it normalises through `pageKind()`.
 */
export type SitePageKind = "legal" | "blog";

/**
 * Links the site footer always carries, whatever the CMS says.
 *
 * These are fixed because the site has to keep them reachable: the legal pages
 * for their own reasons, and the cookie panel because the privacy copy promises
 * a link "at the bottom of the page". Their `showInFooter` flag is therefore
 * beside the point — ticking or unticking it changes nothing.
 *
 * Shared so the footer and the console cannot disagree. The console reads it to
 * decide whether to show the footer badge, which is how "Privacy Policy is in
 * the footer but not marked as such" came about.
 */
export const FIXED_FOOTER_LINKS = [
    { path: "/blog", labelKey: "blog.title" },
    { path: "/privacy", labelKey: "privacy.title" },
    { path: "/terms", labelKey: "terms.title" },
    { path: "/cookies", labelKey: "cookies.page_title" },
    { path: "/guidelines", labelKey: "guidelines.title" },
] as const;

/** True when the footer links this slug regardless of the page's own flag. */
export function isAlwaysInFooter(slug: string): boolean {
    const path = `/${(slug || "").replace(/^\//, "")}`;
    return FIXED_FOOTER_LINKS.some((link) => link.path === path);
}

/** Whether a page appears in the footer at all — fixed link or ticked flag. */
export function appearsInFooter(page: { slug: string; showInFooter?: boolean }): boolean {
    return isAlwaysInFooter(page.slug) || page.showInFooter === true;
}

/**
 * What a blog post is for, which is the question that decides who writes it and
 * where it belongs — not what it is about.
 */
export type BlogCategory = "marketing" | "product" | "business";

export const BLOG_CATEGORIES: { id: BlogCategory; label: string; description: string }[] = [
    {
        id: "marketing",
        label: "Marketing",
        description: "Written to be found — guides and answers that bring songwriters to Veinote.",
    },
    {
        id: "product",
        label: "Product",
        description: "What is new and how to use it — releases, features and walkthroughs.",
    },
    {
        id: "business",
        label: "Business",
        description: "The company — announcements, partnerships, and how Veinote is run.",
    },
];

/**
 * Normalises a stored category.
 *
 * Marketing is the default because every post written before the split was
 * written to be found, and because a post filed nowhere would vanish from a
 * tabbed list entirely — the shelf has to hold everything.
 */
export function blogCategory(value: unknown): BlogCategory {
    return value === "product" || value === "business" ? value : "marketing";
}

/** Normalises a stored kind, including the retired "seo" spelling. */
export function pageKind(value: unknown): SitePageKind {
    return value === "blog" || value === "seo" ? "blog" : "legal";
}

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
    /**
     * Which shelf of the console the page sits on. Absent means "legal" — every
     * page that predates the split is a policy document, and defaulting that way
     * keeps them where their editors expect to find them.
     */
    kind?: SitePageKind;
    /** Blog posts only. Which shelf of the Blog tab the post sits on. */
    category?: BlogCategory;
    /** Blog posts only. The cover shown on the index and at the top of the post. */
    coverUrl?: string | null;
    /** Blog posts only. Who wrote it — shown under the title. */
    author?: string | null;
    /**
     * Blog posts only. The date the post is presented as carrying, which is not
     * the same as when the document was last saved: fixing a typo should not
     * move a post back to the top of the index.
     */
    publishedAt?: string | null;
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
