import 'server-only';
import { NextResponse } from 'next/server';

/**
 * Per-client rate limiting for the paid AI endpoints.
 *
 * These routes are unauthenticated and every call costs money at Gemini, so
 * without a ceiling a single runaway client — a retry loop, a scraper, or one
 * very enthusiastic songwriter — can run up the bill or starve everyone else of
 * throughput. While the project was on Gemini's free tier the quota provided an
 * accidental ceiling; enabling billing removed it, which is what makes this
 * necessary rather than nice to have.
 *
 * Limits are deliberately generous: they are an abuse ceiling, not a product
 * constraint. Normal use should never see one.
 *
 * Caveat worth knowing: counters live in the instance's memory, so an app
 * running N instances allows up to N times these numbers, and a deploy resets
 * them. That is a deliberate trade — a shared Firestore counter would add a
 * read and a write to every AI request, which costs more than the abuse it
 * prevents at this scale. It bounds runaway usage by orders of magnitude, which
 * is the point; it is not an exact quota.
 */

export interface RateLimitRule {
    /** Maximum requests allowed inside the window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
}

/** Tuned by how expensive the underlying call is, not by how it feels to use.
 *  Audio is billed per second of input and is by far the priciest, so it gets
 *  the tightest ceiling; spellcheck is trivially cheap but fires on every word
 *  the user clicks, so it needs the loosest. */
export const AI_RATE_LIMITS: Record<string, RateLimitRule> = {
    transcribe: { limit: 12, windowMs: 60_000 },
    'transcribe-image': { limit: 24, windowMs: 60_000 },
    'extract-text': { limit: 24, windowMs: 60_000 },
    'classify-instrument': { limit: 24, windowMs: 60_000 },
    spellcheck: { limit: 90, windowMs: 60_000 },
    // Not an AI route and not billed, but it makes the server fetch and return
    // bytes on the caller's behalf, so it gets a ceiling too. Loading a studio
    // session decodes every track at once, hence the roomy limit.
    'download-audio': { limit: 60, windowMs: 60_000 },
    // The whole invite flow in one call. Tight, because the server resolves the
    // address to an account internally — the response is uniform, but timing or
    // volume could still be probed, and 10/min is enough to invite a band while
    // being nowhere near enough to sweep a leaked address list.
    'collab-invite': { limit: 10, windowMs: 60_000 },
    // The onboarding flow asking whether an invite link is good. Unauthenticated
    // by necessity (the caller has no account yet), read-only, and answered with
    // the same `valid: false` for every miss — the ceiling is against sweeping
    // for ids, not against a person reloading the page a few times.
    'collab-invite-lookup': { limit: 30, windowMs: 60_000 },
    // Unauthenticated by design (see app/api/health/ai), so it gets the tightest
    // ceiling of all — enough to debug with, not enough to prod upstreams for free.
    health: { limit: 10, windowMs: 60_000 },
    // Not an AI route, but the same guard: the waitlist is a public write that
    // sends an email on every call, so an unbounded loop means both a Firestore
    // write flood and an inbox flood. A person signs up once; a handful of
    // attempts covers typos and a re-submit.
    waitlist: { limit: 6, windowMs: 60_000 },
    // The feedback and support forms are public writes that each create an
    // inbox thread and send a mail to support@. They accept anonymous callers
    // by design — a locked-out user still needs a way in — which is exactly
    // why they cannot be unbounded: anonymous means keyed by IP, and an IP with
    // no ceiling can fill the console and the mailbox in one loop. A person
    // writes once; a few covers a re-send after a typo.
    feedback: { limit: 5, windowMs: 60_000 },
    support: { limit: 5, windowMs: 60_000 },
};

// Bounded so a flood of distinct clients can't grow this without limit.
const MAX_TRACKED_CLIENTS = 5_000;
const buckets = new Map<string, number[]>();

/** Best-effort client identity. Behind Firebase Hosting / Cloud Run the original
 *  address is the first entry of x-forwarded-for; the rest is proxy chain. */
export function clientKey(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Records a hit and reports whether it should be allowed.
 * Returns the number of seconds to wait when the caller is over its limit.
 */
export function checkRateLimit(
    key: string,
    rule: RateLimitRule,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    const hits = (buckets.get(key) ?? []).filter(time => time > windowStart);

    if (hits.length >= rule.limit) {
        // Room frees up when the oldest hit in the window expires.
        const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + rule.windowMs - now) / 1000));
        buckets.set(key, hits);
        return { allowed: false, retryAfterSeconds };
    }

    hits.push(now);
    buckets.set(key, hits);

    if (buckets.size > MAX_TRACKED_CLIENTS) evictStaleClients(windowStart);

    return { allowed: true };
}

function evictStaleClients(windowStart: number) {
    for (const [key, hits] of buckets) {
        if (hits.length === 0 || hits[hits.length - 1] <= windowStart) buckets.delete(key);
    }
    // Still oversized means every tracked client is currently active; drop the
    // oldest entries rather than let the map grow without bound.
    if (buckets.size > MAX_TRACKED_CLIENTS) {
        const excess = buckets.size - MAX_TRACKED_CLIENTS;
        let removed = 0;
        for (const key of buckets.keys()) {
            buckets.delete(key);
            if (++removed >= excess) break;
        }
    }
}

/**
 * Guard for a route handler. Returns a 429 Response when the caller is over its
 * limit, or null to proceed — same shape as featureGuard so routes read the same.
 *
 * Pass the verified `uid` where one is available. Identity is a far better key
 * than IP: it survives mobile networks reassigning addresses, and it stops one
 * user on a shared or corporate IP from throttling everyone behind it. IP is the
 * fallback for routes that run before authentication.
 */
export function rateLimitGuard(
    request: Request,
    route: keyof typeof AI_RATE_LIMITS | string,
    uid?: string,
): Response | null {
    const rule = AI_RATE_LIMITS[route];
    if (!rule) return null;

    const identity = uid ? `uid:${uid}` : `ip:${clientKey(request)}`;
    const result = checkRateLimit(`${route}:${identity}`, rule);
    if (result.allowed) return null;

    console.warn(`[rateLimit] ${route} throttled ${identity}`);
    return NextResponse.json(
        {
            error: 'Too many requests. Please wait a moment and try again.',
            retryAfter: result.retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
    );
}

/**
 * Retries a Gemini call when the upstream rate-limits us.
 *
 * A 429 from Google is transient — the paid tier's per-minute cap can still be
 * clipped by a burst — so a couple of backed-off retries turn a user-visible
 * failure into a slightly slower success. Anything that is not a 429 is thrown
 * straight through, since retrying a malformed request just wastes time.
 */
export async function withGeminiRetry<T>(
    operation: () => Promise<T>,
    { attempts = 3, baseDelayMs = 400 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            if (error?.status !== 429 || attempt === attempts - 1) throw error;
            // Exponential backoff with jitter so concurrent callers don't retry in lockstep.
            const delay = baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/** Marks an error as an upstream 429 so withGeminiRetry knows to back off. */
export function quotaError(message: string): Error & { status: number } {
    return Object.assign(new Error(message), { status: 429 });
}

/**
 * Time budget for a route that tries several Gemini models in sequence.
 *
 * Without one, a slow upstream call has no bound: three models tried back to
 * back can outlive the platform's own request timeout, and Cloud Run then kills
 * the request and returns an HTML gateway error. The client cannot parse that as
 * JSON, so it loses the real reason and shows a generic failure instead — which
 * is exactly how "Failed to scan image text" reaches the user with no detail.
 *
 * Budgeting the work ourselves means we always return our own JSON error, and
 * always in time to be useful.
 */
/**
 * HARD CEILING — read before raising this. Requests reach these routes through
 * Firebase Hosting's CDN, whose backend rewrites time out at ~60 seconds no matter
 * what frameworksBackend.timeoutSeconds says. The WHOLE request has to finish
 * inside that, upload included — and the upload is not free here: a photo or a
 * take is sent in the same 60s window before the model is even called.
 *
 * This default used to be 45s. That fit the ceiling on paper and missed it in
 * practice: a first scan of a large photo spent long enough uploading that 45s of
 * model time pushed the request past the edge cutoff, the CDN answered with its
 * own non-JSON error page, and the client — which can only parse JSON — reported
 * a generic failure. Trying again usually worked, because by then the image was
 * warm, which is exactly what "it fails the first time" looked like from the
 * outside. /api/transcribe had already been walked down to 40s for this reason;
 * the default is now the same, so a new route inherits the safe number instead of
 * the trap.
 */
export const GEMINI_TOTAL_BUDGET_MS = 40_000;
export const GEMINI_ATTEMPT_TIMEOUT_MS = 20_000;

export interface CallBudget {
    /** Abort signal for the next attempt, or null when the budget is spent. */
    next(): AbortSignal | null;
    expired(): boolean;
}

/** Creates a budget shared across every model attempt in one request. */
export function createCallBudget(
    totalMs: number = GEMINI_TOTAL_BUDGET_MS,
    attemptMs: number = GEMINI_ATTEMPT_TIMEOUT_MS,
): CallBudget {
    const deadline = Date.now() + totalMs;
    return {
        expired: () => Date.now() >= deadline,
        next() {
            const remaining = deadline - Date.now();
            // Too little left to be worth starting another upstream round trip.
            if (remaining < 2_000) return null;
            return AbortSignal.timeout(Math.min(attemptMs, remaining));
        },
    };
}
