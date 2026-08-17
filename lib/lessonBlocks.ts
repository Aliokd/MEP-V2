import type { LocalizedText } from "@/lib/content";

/**
 * Structured content for a lesson: prose, images, audio snippets, video and
 * embeds, in whatever order the author arranges them.
 *
 * A block list rather than one Markdown string, because Markdown cannot express
 * an audio player or a provider embed without falling back to raw HTML — and raw
 * HTML typed into an admin form is exactly the thing that must never reach a
 * learner's browser. Every block here is a closed shape the renderer knows how
 * to draw, so there is no path from the editor to arbitrary markup.
 *
 * No React and no server imports: shared by the admin editor and the platform
 * renderer alike.
 */

export type LessonBlockType = "text" | "image" | "audio" | "video" | "embed" | "callout";

export interface LessonBlockBase {
    /** Stable per block, so React keys survive reordering. */
    id: string;
    type: LessonBlockType;
}

export interface TextBlock extends LessonBlockBase {
    type: "text";
    /** Plain text. Blank lines split paragraphs; **bold**, *italic* and [link](url) work. */
    body: LocalizedText;
}

export interface ImageBlock extends LessonBlockBase {
    type: "image";
    url: string;
    alt: LocalizedText;
    caption?: LocalizedText;
}

export interface AudioBlock extends LessonBlockBase {
    type: "audio";
    url: string;
    title?: LocalizedText;
}

export interface VideoBlock extends LessonBlockBase {
    type: "video";
    url: string;
    posterUrl?: string | null;
}

export interface EmbedBlock extends LessonBlockBase {
    type: "embed";
    /** The URL the author pasted, kept for editing. */
    url: string;
}

export type CalloutTone = "note" | "tip" | "warning";

export interface CalloutBlock extends LessonBlockBase {
    type: "callout";
    tone: CalloutTone;
    body: LocalizedText;
}

export type LessonBlock =
    | TextBlock
    | ImageBlock
    | AudioBlock
    | VideoBlock
    | EmbedBlock
    | CalloutBlock;

export const BLOCK_LABELS: Record<LessonBlockType, string> = {
    text: "Text",
    image: "Image",
    audio: "Audio snippet",
    video: "Video",
    embed: "Embed",
    callout: "Callout",
};

export function newBlockId(): string {
    return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyBlock(type: LessonBlockType): LessonBlock {
    const id = newBlockId();
    switch (type) {
        case "image":
            return { id, type, url: "", alt: {} };
        case "audio":
            return { id, type, url: "", title: {} };
        case "video":
            return { id, type, url: "", posterUrl: null };
        case "embed":
            return { id, type, url: "" };
        case "callout":
            return { id, type, tone: "note", body: {} };
        default:
            return { id, type: "text", body: {} };
    }
}

/* ------------------------------------------------------------------------ */
/* Link and embed safety                                                     */
/* ------------------------------------------------------------------------ */

/**
 * True only for URLs safe to put in an href or src.
 *
 * The point is to exclude `javascript:` and `data:` — a link is the one place a
 * content editor can otherwise smuggle in script, and "the admin is trusted" is
 * not an answer when the admin's account is what gets phished.
 */
export function isSafeUrl(url: string): boolean {
    const trimmed = (url || "").trim();
    if (!trimmed) return false;
    // Relative links within the app are fine.
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
        return false;
    }
}

export interface ResolvedEmbed {
    provider: "youtube" | "vimeo" | "spotify";
    /** The iframe src, rebuilt by us — never the pasted string. */
    src: string;
    title: string;
    /** Height as a percentage of width, for the aspect-ratio box. */
    aspect: string;
}

/**
 * Turns a pasted URL into an embed we know how to render.
 *
 * The src is *rebuilt* from the extracted id rather than passed through, so a
 * crafted URL cannot carry extra parameters — or a different host — into the
 * iframe. Anything not recognised returns null and is shown as a plain link,
 * which is the safe default rather than an error.
 */
export function resolveEmbed(rawUrl: string): ResolvedEmbed | null {
    if (!isSafeUrl(rawUrl)) return null;

    let parsed: URL;
    try {
        parsed = new URL(rawUrl.trim());
    } catch {
        return null;
    }

    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
        const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
        if (/^[\w-]{6,20}$/.test(id)) {
            return {
                provider: "youtube",
                // nocookie host: no tracking cookie unless the learner presses play.
                src: `https://www.youtube-nocookie.com/embed/${id}`,
                title: "YouTube video",
                aspect: "56.25%",
            };
        }
        return null;
    }
    if (host === "youtu.be") {
        const id = parsed.pathname.split("/").filter(Boolean)[0] || "";
        if (/^[\w-]{6,20}$/.test(id)) {
            return {
                provider: "youtube",
                src: `https://www.youtube-nocookie.com/embed/${id}`,
                title: "YouTube video",
                aspect: "56.25%",
            };
        }
        return null;
    }

    // Vimeo: vimeo.com/ID
    if (host === "vimeo.com" || host === "player.vimeo.com") {
        const id = parsed.pathname.split("/").filter(Boolean).pop() || "";
        if (/^\d{6,12}$/.test(id)) {
            return {
                provider: "vimeo",
                src: `https://player.vimeo.com/video/${id}`,
                title: "Vimeo video",
                aspect: "56.25%",
            };
        }
        return null;
    }

    // Spotify: open.spotify.com/track|album|playlist|episode/ID
    if (host === "open.spotify.com") {
        const parts = parsed.pathname.split("/").filter(Boolean);
        const kind = parts[0];
        const id = parts[1] || "";
        if (["track", "album", "playlist", "episode", "show"].includes(kind) && /^[\w]{10,40}$/.test(id)) {
            return {
                provider: "spotify",
                src: `https://open.spotify.com/embed/${kind}/${id}`,
                title: "Spotify",
                // Spotify's own embed is a fixed-height card, not 16:9.
                aspect: kind === "track" ? "152px" : "352px",
            };
        }
        return null;
    }

    return null;
}

/* ------------------------------------------------------------------------ */
/* Inline text rendering                                                     */
/* ------------------------------------------------------------------------ */

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Renders one paragraph's inline marks: **bold**, *italic*, [text](url).
 *
 * Everything is escaped first, so the marks are applied to text that can no
 * longer contain markup. Links are dropped to plain text unless the URL passes
 * isSafeUrl, which is what stops `[click](javascript:…)` from becoming an href.
 *
 * Deliberately not a Markdown library: this runs in the platform bundle, and a
 * full parser is a lot of kilobytes for bold, italic and links. The trade is
 * that headings and tables are not available inside a text block — use separate
 * blocks instead, which is the structure this editor is built around anyway.
 */
export function renderInline(text: string): string {
    return escapeHtml(text)
        // The URL pattern allows one level of nested parentheses so links like
        // en.wikipedia.org/wiki/Bridge_(music) survive intact — a plain [^)]+
        // stops at the inner bracket and mangles them.
        .replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (_match, label: string, url: string) => {
            // The URL came through escapeHtml, so &amp; must be undone before parsing.
            const href = url.replace(/&amp;/g, "&");
            if (!isSafeUrl(href)) return label;
            const external = /^https?:\/\//i.test(href);
            return `<a href="${escapeHtml(href)}"${
                external ? ' target="_blank" rel="noopener noreferrer"' : ""
            } class="underline underline-offset-2 hover:opacity-70">${label}</a>`;
        })
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

/** Splits a body into paragraphs, each already inline-rendered. */
export function renderParagraphs(text: string): string[] {
    return (text || "")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => renderInline(p).replace(/\n/g, "<br />"));
}

/** Drops blocks that would render as nothing, so an empty row can't ship. */
export function isBlockRenderable(block: LessonBlock, locale: "en" | "no" | "sv"): boolean {
    switch (block.type) {
        case "text":
            return Boolean((block.body[locale] || block.body.en || "").trim());
        case "callout":
            return Boolean((block.body[locale] || block.body.en || "").trim());
        case "image":
        case "audio":
        case "video":
            return isSafeUrl(block.url);
        case "embed":
            return resolveEmbed(block.url) !== null || isSafeUrl(block.url);
        default:
            return false;
    }
}
