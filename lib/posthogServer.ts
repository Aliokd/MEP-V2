import "server-only";

/**
 * Reading from PostHog, for the admin console.
 *
 * The browser writes events with the public project key (lib/posthog.ts);
 * that key cannot read anything back. Reading needs a personal API key,
 * which is a secret and lives on the server only: POSTHOG_PERSONAL_API_KEY
 * and POSTHOG_PROJECT_ID. Without them every function here reports
 * "not configured" and the console says so instead of showing zeros.
 *
 * Queries are HogQL through the Query API. The API host is the region's
 * app host (eu.posthog.com), not the ingestion host the browser talks to
 * (eu.i.posthog.com); it is derived from NEXT_PUBLIC_POSTHOG_HOST unless
 * POSTHOG_API_HOST says otherwise.
 */

export function isPostHogQueryConfigured(): boolean {
    return Boolean(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID);
}

function apiHost(): string {
    const explicit = process.env.POSTHOG_API_HOST;
    if (explicit) return explicit.replace(/\/$/, "");
    const ingest = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
    return ingest.replace(/\/$/, "").replace(".i.posthog.com", ".posthog.com");
}

export interface HogQLResult {
    columns: string[];
    results: unknown[][];
}

/** Runs one HogQL query. Throws with PostHog's message on refusal. */
export async function hogql(query: string, timeoutMs = 15_000): Promise<HogQLResult> {
    const key = process.env.POSTHOG_PERSONAL_API_KEY;
    const project = process.env.POSTHOG_PROJECT_ID;
    if (!key || !project) throw new Error("posthog-not-configured");

    const res = await fetch(`${apiHost()}/api/projects/${project}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PostHog ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as { columns?: string[]; results?: unknown[][] };
    return { columns: data.columns ?? [], results: data.results ?? [] };
}

/** One row per result, keyed by column name. */
export function rows<T = Record<string, unknown>>(r: HogQLResult): T[] {
    return r.results.map((values) => {
        const obj: Record<string, unknown> = {};
        r.columns.forEach((c, i) => { obj[c] = values[i]; });
        return obj as T;
    });
}

/** A string literal for HogQL: single-quoted, quotes and backslashes escaped. */
export function lit(value: string): string {
    return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * Pageviews that count: the dev server sends events with the same project
 * key, and they must not pass for visitors. Own hosts are also never a
 * "source"; a click from veinote.com to veinote.com is navigation.
 */
const REAL_VISIT = `event = '$pageview' AND properties.$host NOT LIKE 'localhost%' AND properties.$host NOT LIKE '127.0.0.1%'`;
const OWN_HOST = `(properties.$referring_domain = '$direct' OR properties.$referring_domain LIKE '%veinote.com' OR properties.$referring_domain LIKE '%firebaseapp.com' OR properties.$referring_domain LIKE 'localhost%')`;

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

export interface TrafficSummary {
    windowDays: number;
    visitors: number;
    pageviews: number;
    sessions: number;
    /** Daily visitors and pageviews, oldest first. */
    daily: { day: string; visitors: number; pageviews: number }[];
    topPages: { path: string; views: number; visitors: number }[];
    /** utm_source, or the referring domain when the visit carried no tags. */
    sources: { source: string; visitors: number }[];
    campaigns: { campaign: string; visitors: number }[];
    /** The onboarding funnel as the browser reports it. */
    funnel: { step: string; people: number }[];
}

/**
 * The traffic picture the console shows: who came, from where, what they
 * looked at, and how far into onboarding they got.
 */
export async function trafficSummary(windowDays: number): Promise<TrafficSummary> {
    const since = `now() - INTERVAL ${Math.max(1, Math.min(180, Math.floor(windowDays)))} DAY`;

    const [totals, daily, pages, sources, campaigns, funnel] = await Promise.all([
        hogql(`
            SELECT count() AS pageviews,
                   count(DISTINCT distinct_id) AS visitors,
                   count(DISTINCT properties.$session_id) AS sessions
            FROM events
            WHERE ${REAL_VISIT} AND timestamp >= ${since}
        `),
        hogql(`
            SELECT toDate(timestamp) AS day,
                   count(DISTINCT distinct_id) AS visitors,
                   count() AS pageviews
            FROM events
            WHERE ${REAL_VISIT} AND timestamp >= ${since}
            GROUP BY day ORDER BY day ASC
        `),
        hogql(`
            SELECT properties.$pathname AS path,
                   count() AS views,
                   count(DISTINCT distinct_id) AS visitors
            FROM events
            WHERE ${REAL_VISIT} AND timestamp >= ${since}
            GROUP BY path ORDER BY views DESC LIMIT 15
        `),
        hogql(`
            SELECT coalesce(nullIf(properties.utm_source, ''), if(${OWN_HOST}, NULL, nullIf(properties.$referring_domain, '')), '(direct)') AS source,
                   count(DISTINCT distinct_id) AS visitors
            FROM events
            WHERE ${REAL_VISIT} AND timestamp >= ${since}
            GROUP BY source ORDER BY visitors DESC LIMIT 12
        `),
        hogql(`
            SELECT properties.utm_campaign AS campaign,
                   count(DISTINCT distinct_id) AS visitors
            FROM events
            WHERE ${REAL_VISIT} AND timestamp >= ${since}
              AND properties.utm_campaign IS NOT NULL AND properties.utm_campaign != ''
            GROUP BY campaign ORDER BY visitors DESC LIMIT 12
        `),
        hogql(`
            SELECT event, count(DISTINCT distinct_id) AS people
            FROM events
            WHERE timestamp >= ${since}
              AND event IN ('onboarding_step', 'signup_started', 'signup_verified', 'checkout_completed')
            GROUP BY event
        `),
    ]);

    const t = rows(totals)[0] ?? {};
    const funnelMap = new Map(rows(funnel).map((r) => [str(r.event), num(r.people)]));
    // Visitors who opened onboarding at all, then each committed step, in
    // the order the flow runs them: the checkout comes before the code.
    const funnelSteps = [
        { step: "Opened onboarding", people: funnelMap.get("onboarding_step") ?? 0 },
        { step: "Entered an email", people: funnelMap.get("signup_started") ?? 0 },
        { step: "Completed checkout", people: funnelMap.get("checkout_completed") ?? 0 },
        { step: "Verified the code", people: funnelMap.get("signup_verified") ?? 0 },
    ];

    return {
        windowDays,
        visitors: num(t.visitors),
        pageviews: num(t.pageviews),
        sessions: num(t.sessions),
        daily: rows(daily).map((r) => ({ day: str(r.day), visitors: num(r.visitors), pageviews: num(r.pageviews) })),
        topPages: rows(pages).map((r) => ({ path: str(r.path) || "/", views: num(r.views), visitors: num(r.visitors) })),
        sources: rows(sources).map((r) => ({ source: str(r.source) || "(direct)", visitors: num(r.visitors) })),
        campaigns: rows(campaigns).map((r) => ({ campaign: str(r.campaign), visitors: num(r.visitors) })),
        funnel: funnelSteps,
    };
}

export interface UserActivity {
    /** True when PostHog holds any event for this account. Identified users only. */
    known: boolean;
    lastSeenAt: string | null;
    firstSeenAt: string | null;
    sessions30d: number;
    pageviews30d: number;
    topPages: { path: string; views: number }[];
    recent: { event: string; at: string; path: string | null }[];
    /** The first-touch tags PostHog recorded for this person, if any. */
    firstTouch: { source: string | null; medium: string | null; campaign: string | null; referrer: string | null };
}

/**
 * One account's footprint. Events are tied to the account through
 * `identify(uid)`, which the browser only calls once analytics consent is
 * given, so a person who declined shows as unknown here by design.
 */
export async function userActivity(uid: string): Promise<UserActivity> {
    const who = `distinct_id = ${lit(uid)}`;
    const [span, month, pages, recent, first] = await Promise.all([
        hogql(`SELECT min(timestamp) AS first_seen, max(timestamp) AS last_seen, count() AS n FROM events WHERE ${who}`),
        hogql(`
            SELECT count(DISTINCT properties.$session_id) AS sessions, countIf(event = '$pageview') AS pageviews
            FROM events WHERE ${who} AND timestamp >= now() - INTERVAL 30 DAY
        `),
        hogql(`
            SELECT properties.$pathname AS path, count() AS views
            FROM events WHERE ${who} AND event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY
            GROUP BY path ORDER BY views DESC LIMIT 8
        `),
        hogql(`
            SELECT event, timestamp, properties.$pathname AS path
            FROM events WHERE ${who} AND event NOT IN ('$pageleave', '$autocapture', '$set')
            ORDER BY timestamp DESC LIMIT 12
        `),
        hogql(`
            SELECT person.properties.$initial_utm_source AS source,
                   person.properties.$initial_utm_medium AS medium,
                   person.properties.$initial_utm_campaign AS campaign,
                   person.properties.$initial_referring_domain AS referrer
            FROM events WHERE ${who} LIMIT 1
        `),
    ]);

    const s = rows(span)[0] ?? {};
    const m = rows(month)[0] ?? {};
    const f = rows(first)[0] ?? {};
    const known = num(s.n) > 0;
    return {
        known,
        firstSeenAt: known ? str(s.first_seen) : null,
        lastSeenAt: known ? str(s.last_seen) : null,
        sessions30d: num(m.sessions),
        pageviews30d: num(m.pageviews),
        topPages: rows(pages).map((r) => ({ path: str(r.path) || "/", views: num(r.views) })),
        recent: rows(recent).map((r) => ({ event: str(r.event), at: str(r.timestamp), path: r.path ? str(r.path) : null })),
        firstTouch: {
            source: f.source ? str(f.source) : null,
            medium: f.medium ? str(f.medium) : null,
            campaign: f.campaign ? str(f.campaign) : null,
            referrer: f.referrer ? str(f.referrer) : null,
        },
    };
}
