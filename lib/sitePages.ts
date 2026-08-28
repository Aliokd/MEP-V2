import "server-only";
import MarkdownIt from "markdown-it";
import { adminDb } from "@/lib/firebaseAdmin";
import { pageKind, pickLocale, type Locale, type SitePage } from "@/lib/content";

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
        // This maps an explicit list rather than spreading the document, so a
        // field the console writes reaches the site only once it is named here.
        // Leaving these out is why /blog rendered an empty index: every page
        // came back as "legal" because its `kind` was dropped on the way through.
        kind: pageKind(d.kind),
        coverUrl: d.coverUrl || null,
        author: d.author || null,
        publishedAt: d.publishedAt || null,
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
 * Published blog posts, newest first.
 *
 * Ordered by the date on the post rather than by `order` or by when the
 * document was last written — a blog is a chronology, and correcting a typo in
 * an old post should not lift it above this week's.
 */
export async function listPublishedPosts(): Promise<SitePage[]> {
    const pages = await listPublishedPages();
    return pages
        .filter((page) => pageKind(page.kind) === "blog")
        .sort((a, b) => {
            const at = Date.parse(a.publishedAt || "") || a.updatedAt || 0;
            const bt = Date.parse(b.publishedAt || "") || b.updatedAt || 0;
            return bt - at;
        });
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
