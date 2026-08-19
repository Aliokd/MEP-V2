import { SITE_URL } from "@/lib/i18n";

/**
 * IndexNow — push-notify search engines the moment a page changes, instead of
 * waiting for a crawl.
 *
 * One POST reaches Bing, Yandex, Seznam, Naver and Yep at once (they share the
 * protocol and forward submissions between themselves). Google does not
 * participate — it still finds changes through the sitemap and normal crawling,
 * so this is additive, never a replacement.
 *
 * The key is deliberately a public constant, not a secret in the environment:
 * the protocol works by serving the same value at a public URL
 * (`/{key}.txt`) to prove control of the domain. It must stay in sync with
 * `public/ef768f626d16103bee75fc557202539c.txt` — that file IS the proof, so
 * changing one without the other silently breaks every submission with a 403.
 */
export const INDEXNOW_KEY = "ef768f626d16103bee75fc557202539c";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** IndexNow accepts at most 10,000 URLs per request. */
const MAX_URLS = 10_000;

export interface IndexNowResult {
    submitted: number;
    status: number | null;
    ok: boolean;
    skipped?: string;
    error?: string;
}

/**
 * Submits URLs for re-crawling. Never throws — a failed SEO ping must not break
 * the admin action that triggered it.
 *
 * Submissions are skipped unless the site is running on its real domain: the
 * API rejects URLs that don't match the verified host, so pinging from a dev
 * machine or a preview deploy would only produce noise in the logs.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
    const host = new URL(SITE_URL).host;

    const unique = [...new Set(urls)].filter((url) => {
        try {
            return new URL(url).host === host;
        } catch {
            return false;
        }
    });

    if (unique.length === 0) {
        return { submitted: 0, status: null, ok: true, skipped: "no valid URLs" };
    }

    if (process.env.NODE_ENV !== "production" && process.env.INDEXNOW_FORCE !== "1") {
        console.info(`[indexnow] skipped (non-production): would submit ${unique.length} URL(s)`);
        return { submitted: 0, status: null, ok: true, skipped: "non-production" };
    }

    try {
        const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
                host,
                key: INDEXNOW_KEY,
                keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
                urlList: unique.slice(0, MAX_URLS),
            }),
        });

        // 200 = accepted, 202 = accepted but the key file hasn't been verified
        // yet. Anything else is worth seeing in the logs: 403 means the key file
        // is missing or mismatched, 422 that a URL didn't belong to the host.
        const ok = res.status === 200 || res.status === 202;
        if (!ok) {
            console.error(`[indexnow] submission rejected with ${res.status}: ${await res.text()}`);
        }

        return { submitted: ok ? unique.length : 0, status: res.status, ok };
    } catch (err) {
        console.error("[indexnow] submission failed:", err);
        return { submitted: 0, status: null, ok: false, error: String(err) };
    }
}

/**
 * Every locale URL for a public path, since /no and /sv are separate documents
 * in a search index and change at the same moment the English one does.
 */
export function localeUrlsFor(path: string): string[] {
    // The homepage's canonical URL has no trailing slash, so "/" contributes an
    // empty suffix rather than a "/" that would submit a second, non-canonical form.
    const raw = path.startsWith("/") ? path : `/${path}`;
    const suffix = raw === "/" ? "" : raw;
    return [`${SITE_URL}${suffix}`, `${SITE_URL}/no${suffix}`, `${SITE_URL}/sv${suffix}`];
}
