import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import type { ContentStatus, LocalizedText } from "@/lib/content";

/**
 * The Q&A accordion on the homepage (/#qa).
 *
 * Kept separate from site_pages because the shape is different: a page is one
 * markdown body, while this is an ordered list of question/answer pairs that the
 * homepage renders as an accordion. Forcing it into a page would have meant
 * losing the accordion.
 */
export interface FaqItem {
    id: string;
    question: LocalizedText;
    answer: LocalizedText;
    order: number;
    status: ContentStatus;
    updatedAt?: number | null;
    updatedByEmail?: string | null;
}

const CACHE_TTL_MS = 60_000;
let cache: { at: number; items: FaqItem[] } | null = null;

function shape(doc: FirebaseFirestore.DocumentSnapshot): FaqItem {
    const d = doc.data() || {};
    return {
        id: doc.id,
        question: d.question || {},
        answer: d.answer || {},
        order: d.order ?? 0,
        status: d.status || "draft",
        updatedAt: d.updatedAt?.toMillis?.() ?? null,
        updatedByEmail: d.updatedByEmail || null,
    };
}

/**
 * Published Q&A items in display order. Returns an empty array on any failure,
 * which the homepage treats as "fall back to the copy in the locale files" —
 * so a Firestore outage costs the accordion nothing.
 */
export async function getPublishedFaqs(): Promise<FaqItem[]> {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.items;

    try {
        const snap = await adminDb.collection("faqs").where("status", "==", "published").get();
        const items = snap.docs.map(shape).sort((a, b) => a.order - b.order);
        cache = { at: Date.now(), items };
        return items;
    } catch (err) {
        console.error("[faqs] Failed to load:", err);
        cache = { at: Date.now(), items: [] };
        return [];
    }
}
