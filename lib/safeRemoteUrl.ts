import 'server-only';

/**
 * Allowlist for URLs the server is willing to fetch on a caller's behalf.
 *
 * Two routes take a URL from the request and fetch it server-side:
 * /api/download-audio (a CORS bypass for our own Storage audio) and
 * /api/classify-instrument (same audio, sent on to Gemini). Both previously
 * passed the string straight to fetch(), which is a textbook SSRF: the caller
 * chose the scheme, the host and the port, so the server could be pointed at
 * the metadata service, at anything else inside the VPC, or at an arbitrary
 * third party with our IP as the source address.
 *
 * The allowlist is the fix rather than a blocklist of private ranges. A
 * blocklist has to anticipate every encoding of "localhost" — decimal IPs,
 * IPv6-mapped IPv4, DNS names that resolve inward, redirects that land
 * somewhere else — and it only takes one miss. These routes only ever need
 * our own buckets, so naming them is both safer and simpler.
 */

/** Hosts that serve this project's own uploaded audio. */
const ALLOWED_HOSTS = new Set([
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
    'mep-v2.firebasestorage.app',
    'mep-v2.appspot.com',
]);

/** Suffix match for the per-bucket Storage domains Firebase hands out. */
const ALLOWED_HOST_SUFFIXES = ['.firebasestorage.app'];

export interface SafeUrlResult {
    ok: boolean;
    url?: URL;
    reason?: string;
}

/**
 * Parses and vets a caller-supplied URL.
 *
 * Rejects anything that is not https to a known Storage host. http is refused
 * even for allowed hosts: it would let a network-position attacker swap the
 * response, and nothing we fetch is served over plaintext anyway.
 */
export function vetRemoteUrl(raw: unknown): SafeUrlResult {
    if (typeof raw !== 'string' || !raw.trim()) {
        return { ok: false, reason: 'Missing url' };
    }

    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return { ok: false, reason: 'Malformed url' };
    }

    if (url.protocol !== 'https:') {
        return { ok: false, reason: 'Only https urls are allowed' };
    }

    // Credentials in the URL are never legitimate here and are a known way to
    // confuse host parsing (https://allowed.host@evil.example).
    if (url.username || url.password) {
        return { ok: false, reason: 'Credentials are not allowed in the url' };
    }

    const host = url.hostname.toLowerCase();
    const allowed =
        ALLOWED_HOSTS.has(host) ||
        ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));

    if (!allowed) {
        return { ok: false, reason: 'That host is not allowed' };
    }

    return { ok: true, url };
}

/**
 * fetch() restricted to vetted URLs, with redirects disabled.
 *
 * `redirect: 'manual'` matters as much as the allowlist: Storage could
 * otherwise 302 us somewhere unvetted and the check above would have been
 * done on a URL we no longer follow.
 */
export async function fetchAllowedUrl(
    url: URL,
    { timeoutMs = 15_000 }: { timeoutMs?: number } = {},
): Promise<Response> {
    return fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
    });
}
