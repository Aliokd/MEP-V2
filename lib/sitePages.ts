import "server-only";
import MarkdownIt from "markdown-it";
import { adminDb } from "@/lib/firebaseAdmin";
import { pickLocale, type Locale, type SitePage } from "@/lib/content";

/**
 * Server-side reads for CMS-managed website pages (privacy, terms, and anything
 * else editorial on the marketing site).
 *
 * Everything here runs through the Admin SDK in a server component, so Firestore
 * rules aren't in the path and there's no client bundle cost for markdown-it.
 */

// html: false is the security boundary. Page bodies are written by admins, but an
// admin account is exactly what gets phished — rendering raw HTML from the
// database would turn one compromised console login into stored XSS on the
// public site. Markdown covers everything a policy page needs.
const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
});

// Outbound links from CMS copy open in a new tab and can't reach back into the
// opener. Applied as a renderer rule so authors don't have to think about it.
const defaultLinkOpen =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet("href") || "";
    if (/^https?:\/\//i.test(href)) {
        tokens[idx].attrSet("target", "_blank");
        tokens[idx].attrSet("rel", "noopener noreferrer");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
};

function shape(doc: FirebaseFirestore.DocumentSnapshot): SitePage {
    const d = doc.data() || {};
    return {
        id: doc.id,
        slug: d.slug || doc.id,
        title: d.title || {},
        description: d.description || {},
        body: d.body || {},
        parentId: d.parentId || null,
        order: d.order ?? 0,
        status: d.status || "draft",
        showInFooter: d.showInFooter === true,
        updatedAt: d.updatedAt?.toMillis?.() ?? null,
        updatedByEmail: d.updatedByEmail || null,
    };
}

/** One published page by slug, or null. Drafts are invisible to the public site. */
export async function getPublishedPage(slug: string): Promise<SitePage | null> {
    try {
        const doc = await adminDb.collection("site_pages").doc(slug).get();
        if (!doc.exists) return null;
        const page = shape(doc);
        return page.status === "published" ? page : null;
    } catch (err) {
        console.error(`[pages] Failed to load "${slug}":`, err);
        return null;
    }
}

export async function listPublishedPages(): Promise<SitePage[]> {
    try {
        const snap = await adminDb.collection("site_pages").where("status", "==", "published").get();
        return snap.docs.map(shape).sort((a, b) => a.order - b.order);
    } catch (err) {
        console.error("[pages] Failed to list published pages:", err);
        return [];
    }
}

/**
 * Pages that asked for a footer link, in display order.
 *
 * Read on every page render through the root layout, so it keeps a short
 * in-process cache — footer links change about once a quarter, and a Firestore
 * round trip on every request to the marketing site isn't worth paying for.
 */
const FOOTER_CACHE_TTL_MS = 60_000;
let footerCache: { at: number; pages: SitePage[] } | null = null;

export async function getFooterPages(): Promise<SitePage[]> {
    if (footerCache && Date.now() - footerCache.at < FOOTER_CACHE_TTL_MS) {
        return footerCache.pages;
    }

    const pages = (await listPublishedPages()).filter((page) => page.showInFooter);
    footerCache = { at: Date.now(), pages };
    return pages;
}

/** Direct children of a page, for the basic one-level hierarchy. */
export async function getChildPages(parentSlug: string): Promise<SitePage[]> {
    const all = await listPublishedPages();
    return all.filter((page) => page.parentId === parentSlug);
}

/** Renders a page body to HTML in the reader's language. */
export function renderPageBody(page: SitePage, locale: Locale): string {
    return md.render(pickLocale(page.body, locale));
}

/**
 * Renders a raw markdown string through the same hardened pipeline (html: false,
 * safe external links). For pages that carry a built-in fallback body next to
 * their CMS document — a legal page must never 404, so /terms ships its text in
 * the repo and prefers the CMS version once one is published.
 */
export function renderMarkdownBody(markdown: string): string {
    return md.render(markdown);
}
