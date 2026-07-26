import "server-only";

/**
 * Server-side kill switches for the AI endpoints.
 *
 * These exist so a runaway Gemini bill, a provider outage or an abuse incident
 * can be stopped from the admin console without a deploy. A flag that is off
 * returns 503 from the route rather than failing deeper in the stack.
 */
export const FEATURE_FLAGS = {
    transcribe: "Audio transcription (Google Speech)",
    transcribe_image: "Image-to-text (Tesseract / Gemini)",
    extract_text: "Document text extraction (Gemini)",
    spellcheck: "Spellcheck",
    lexicon: "Lexicon lookups",
    classify_instrument: "Instrument classification",
    connect_posting: "Posting to the Connect feed",
    signups: "New account signups",
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// Flags change rarely and are read on hot paths, so a short in-process cache
// keeps this from becoming a Firestore read per request.
const CACHE_TTL_MS = 30_000;
let cache: { at: number; values: Record<string, boolean> } | null = null;

async function loadFlags(): Promise<Record<string, boolean>> {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;

    try {
        // Imported here rather than at module scope on purpose. A top-level import
        // that fails to resolve throws while the *module* loads, which no try/catch
        // in this file can catch — it takes down every route that imports this one.
        // That is exactly what happened in production when firebase-admin was
        // bundled instead of externalised: every AI route returned a bare 500 while
        // working fine locally. Loading it here means even a broken admin SDK
        // degrades to "flag unset", which is the fail-open behaviour intended below.
        const { adminDb } = await import("@/lib/firebaseAdmin");
        const snap = await adminDb.collection("feature_flags").get();
        const values: Record<string, boolean> = {};
        snap.docs.forEach((doc) => {
            values[doc.id] = doc.data().enabled !== false;
        });
        cache = { at: Date.now(), values };
        return values;
    } catch (err) {
        console.error("[flags] Failed to load feature flags, failing open:", err);
        return {};
    }
}

/**
 * Flags fail *open*: an unset flag, or Firestore being unreachable, means the
 * feature stays on. Turning something off has to be a deliberate act, not a
 * side effect of infrastructure trouble.
 */
export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
    const flags = await loadFlags();
    return flags[flag] !== false;
}

/** Guard for a route handler. Returns a 503 Response when the flag is off. */
export async function featureGuard(flag: FeatureFlag): Promise<Response | null> {
    if (await isFeatureEnabled(flag)) return null;
    return new Response(
        JSON.stringify({
            error: "This feature is temporarily unavailable. We're working on it.",
            flag,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
    );
}

/** Clears the cache so a console toggle takes effect immediately in this process. */
export function invalidateFlagCache(): void {
    cache = null;
}
