import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import type { LocalizedText } from "@/lib/content";

/**
 * Per-string overrides for the pages that are built in code.
 *
 * The homepage and /about are bespoke layouts — hero, sections, animation —
 * that Markdown would flatten, so they can't become CMS pages. This is the
 * alternative: the layout stays in code, and every piece of text inside it
 * becomes editable. A document here overrides one translation key; anything not
 * overridden falls through to locales/*.json exactly as before.
 *
 * The document id IS the translation key ("home.hero.title"), which makes the
 * lookup a plain map access and uniqueness automatic.
 */
export type CopyOverrides = Record<string, LocalizedText>;

const CACHE_TTL_MS = 60_000;
let cache: { at: number; overrides: CopyOverrides } | null = null;

export async function getCopyOverrides(): Promise<CopyOverrides> {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.overrides;

    try {
        const snap = await adminDb.collection("site_copy").where("status", "==", "published").get();
        const overrides: CopyOverrides = {};
        snap.docs.forEach((doc) => {
            const value = doc.data().value;
            // A blank override must not blank the site — treat empty as "no override".
            if (value && Object.values(value).some((v) => typeof v === "string" && v.trim())) {
                overrides[doc.id] = value;
            }
        });
        cache = { at: Date.now(), overrides };
        return overrides;
    } catch (err) {
        // Falling back to the locale files is the correct failure mode: the site
        // reads exactly as it did before anyone touched the CMS.
        console.error("[siteCopy] Failed to load overrides:", err);
        cache = { at: Date.now(), overrides: {} };
        return {};
    }
}
