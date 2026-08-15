import { auth } from "@/lib/firebase";

/**
 * fetch() with the signed-in user's Firebase ID token attached, so the server can
 * verify who is calling instead of trusting a uid sent in the request body.
 * Falls back to an unauthenticated request when nobody is signed in.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    // Only a string body is assumed to be JSON. Binary bodies (Blob/ArrayBuffer for
    // audio uploads) and FormData must keep the Content-Type the browser derives —
    // FormData needs its multipart boundary, and mislabelling audio as JSON makes
    // the receiving route try to parse it as JSON.
    if (typeof init.body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const current = auth.currentUser;
    if (current) {
        try {
            headers.set("Authorization", `Bearer ${await current.getIdToken()}`);
        } catch (err) {
            console.error("Failed to attach ID token to request:", err);
        }
    }

    return fetch(input, { ...init, headers });
}

/** A failure worth trying again by itself, rather than one the user has to act on.
 *  429 is the upstream asking us to wait; 5xx covers both a genuine server error
 *  and the CDN's own gateway timeout, which is the transient one that matters. */
function isTransientStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

/** Roughly how many bytes this request will put on the wire, where that is knowable. */
function bodyBytes(body: BodyInit | null | undefined): number {
    if (!body) return 0;
    if (typeof body === 'string') return body.length;
    if (body instanceof Blob) return body.size;
    if (body instanceof ArrayBuffer) return body.byteLength;
    if (ArrayBuffer.isView(body)) return body.byteLength;
    return 0;
}

/**
 * Past this, a timeout is a verdict rather than bad luck.
 *
 * Retrying a small request that timed out is worth it — the next one may catch a
 * warm function. Retrying a several-megabyte upload is not: the upload itself is
 * what consumed the server's window, so every attempt spends the same minute
 * getting to the same failure, and the user waits three times as long to be told
 * the same thing. 2MB is comfortably above the JSON these routes normally exchange
 * and well below an audio file.
 */
const RETRY_TIMEOUT_MAX_BYTES = 2 * 1024 * 1024;

/**
 * authedFetch that retries itself before giving up.
 *
 * The AI routes fail transiently more often than they fail for real — a cold
 * function, an upstream 429, a request that ran just past the edge timeout. Every
 * one of those succeeds on a second attempt seconds later, which is why scanning a
 * photo or transcribing a take so often "worked the second time". Making the user
 * be the retry loop is the worst version of this: it reads as the feature being
 * broken, and they have to notice the failure to recover from it.
 *
 * Only transient statuses and network errors are retried. A 400 or a 403 means the
 * request itself is wrong, and repeating it just makes the user wait longer for the
 * same answer.
 *
 * Safe with the bodies these routes use — strings and Blobs can be sent again. A
 * streaming body could not be, so this must not be used with one.
 */
export async function authedFetchRetrying(
    input: string,
    init: RequestInit = {},
    { attempts = 3, baseDelayMs = 800 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<Response> {
    let lastError: unknown;
    // A heavy body makes a timeout deterministic — see RETRY_TIMEOUT_MAX_BYTES.
    // 429 still retries at any size: that one is the upstream asking us to wait,
    // and waiting is exactly what fixes it.
    const heavy = bodyBytes(init.body) > RETRY_TIMEOUT_MAX_BYTES;

    for (let attempt = 0; attempt < attempts; attempt++) {
        const isLast = attempt === attempts - 1;
        try {
            const response = await authedFetch(input, init);
            const worthRepeating = isTransientStatus(response.status)
                && !(heavy && response.status !== 429);
            if (response.ok || isLast || !worthRepeating) return response;

            // Honour an explicit Retry-After when the server sent one; it knows how
            // long its own window is better than any guess here.
            const retryAfter = Number(response.headers.get('Retry-After'));
            const wait = Number.isFinite(retryAfter) && retryAfter > 0
                ? Math.min(retryAfter * 1000, 5_000)
                : baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
            await new Promise(resolve => setTimeout(resolve, wait));
        } catch (err) {
            // Network-level failure: no response at all. Same treatment.
            lastError = err;
            if (isLast) throw err;
            await new Promise(resolve =>
                setTimeout(resolve, baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs),
            );
        }
    }

    throw lastError ?? new Error('Request failed after retries');
}
