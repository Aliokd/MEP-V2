import { NextRequest, NextResponse } from 'next/server';
import {
    LANG_HEADER,
    LOCALE_COOKIE,
    NONCE_HEADER,
    PATH_HEADER,
    isLocalizedPath,
    isPrefixedLocale,
    splitLocale,
    type Language,
} from '@/lib/i18n';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Content-Security-Policy for document responses, with a fresh nonce per request.
 *
 * The static half of the policy (frame-ancestors, base-uri, object-src,
 * form-action) lives in next.config.ts so it also covers the paths this proxy
 * skips. What has to be built here is `script-src`: allowing inline scripts by
 * nonce is the whole point, and a nonce is only meaningful if it is unguessable
 * and never reused, so it cannot be a static config value.
 *
 * Notes on the specific relaxations, none of which are incidental:
 *
 * - 'strict-dynamic' lets Next's own bootstrap script load the chunks it needs.
 *   Without it every generated chunk URL would have to be enumerated, which is
 *   not knowable ahead of a build.
 * - style-src keeps 'unsafe-inline'. Framer Motion animates by writing inline
 *   styles on every frame, and nonces do not apply to style attributes — only to
 *   <style> elements — so there is no nonce-based version of this that works.
 *   Inline *style* is a far smaller lever than inline *script*.
 * - connect-src has to reach Firestore, Auth and Storage, which is where this
 *   app's data actually lives, plus the WebSocket transport Firestore falls back
 *   to. wss: is scoped to Google hosts rather than left open.
 * - media-src includes blob: because recordings are played back from an
 *   in-memory Blob before they are ever uploaded.
 */
function buildCsp(nonce: string): string {
    return [
        "default-src 'self'",
        // No 'unsafe-inline' here on purpose. A CSP2 browser that does not
        // understand 'strict-dynamic' still understands nonces (Safari 10+), so
        // it honours the nonce for our inline scripts and falls back to `https:`
        // for the chunk loads — which means the fallback path never needs to
        // blanket-allow inline script, the one relaxation that would give the
        // whole policy away.
        //
        // 'unsafe-eval' is added in development only: React's dev build uses
        // eval() to rebuild stack traces across environments, and without it the
        // console fills with failures on every render. The production build
        // never calls eval, so it never gets the exemption.
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${
            process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"
        }`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: data: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app",
        [
            "connect-src 'self'",
            // Firebase: Firestore, Auth, Storage, and the WebSocket transport
            // Firestore falls back to when long-polling is blocked.
            'https://*.googleapis.com',
            'https://*.firebaseio.com',
            'https://*.firebasestorage.app',
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
            'wss://*.firebaseio.com',
            'wss://*.googleapis.com',
            // Firebase Analytics (measurementId in lib/firebase.ts). gtag posts
            // to several hosts depending on consent and region, so all of them
            // are listed — a missed one silently drops analytics, which is the
            // kind of breakage nobody notices for a month.
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://*.google-analytics.com',
            'https://*.analytics.google.com',
            'https://www.google.com',
            // Microsoft Clarity (app/layout.tsx, and the identify call in
            // context/AuthContext.tsx).
            'https://*.clarity.ms',
            // PostHog (lib/posthog.ts). The wildcard covers both regions and
            // both roles: ingestion (eu/us.i.posthog.com) and the asset host the
            // SDK pulls remote config from (eu/us-assets.i.posthog.com). Getting
            // this wrong drops every event with nothing but a console warning,
            // so it is deliberately broader than a single pinned host.
            'https://*.posthog.com',
        ].join(' '),
        // The lesson embeds (YouTube, Vimeo, Spotify) and the Paddle checkout
        // overlay are the only things allowed to frame inside our pages.
        "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com https://*.paddle.com",
        "worker-src 'self' blob:",
    ].join('; ');
}

/** Attaches the nonce to the request (so the render can read it) and the policy
 *  to the response (so the browser enforces it). */
function withCsp(
    headers: Headers,
): { headers: Headers; nonce: string; csp: string } {
    const nonce = btoa(crypto.randomUUID());
    headers.set(NONCE_HEADER, nonce);
    return { headers, nonce, csp: buildCsp(nonce) };
}

/** Every path that served the waitlist under its old name, public and internal. */
const RENAMED_WAITLIST_PATHS = new Set([
    '/waitlist',
    '/no/waitlist',
    '/sv/waitlist',
    '/admin/waitlist',
]);

/** Passes the resolved locale and the un-prefixed path down to the server render. */
function withLocaleHeaders(req: NextRequest, language: Language, path: string) {
    const headers = new Headers(req.headers);
    headers.set(LANG_HEADER, language);
    headers.set(PATH_HEADER, path);
    return headers;
}

export default function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // "se" is Sweden's country code; the language code is "sv". People type both,
    // so redirect the country form to the canonical language form.
    if (pathname === '/se' || pathname.startsWith('/se/')) {
        const url = req.nextUrl.clone();
        url.pathname = '/sv' + pathname.slice(3);
        return NextResponse.redirect(url, 301);
    }

    // The waitlist page shipped at /waitlist and was renamed to /waiting-list.
    // It was live and in the sitemap, so the old path keeps working rather than
    // 404ing anyone who already has the link. Handled here rather than in
    // next.config so the locale prefix survives: /no/waitlist -> /no/waiting-list.
    //
    // Listed exhaustively rather than matched on a `/waitlist` suffix. The suffix
    // version also rewrote /admin/waitlist, which 404'd until the console's own
    // route was renamed to match — a redirect should only fire on paths it was
    // actually written for.
    if (RENAMED_WAITLIST_PATHS.has(pathname)) {
        const url = req.nextUrl.clone();
        url.pathname = pathname.replace(/\/waitlist$/, '/waiting-list');
        return NextResponse.redirect(url, 301);
    }

    const { locale, path } = splitLocale(pathname);

    if (locale) {
        // Locale prefixes only exist for the public pages. Anything else (a stray
        // /no/platform link) drops the prefix rather than 404ing.
        if (!isLocalizedPath(path)) {
            const url = req.nextUrl.clone();
            url.pathname = path;
            return NextResponse.redirect(url);
        }

        const url = req.nextUrl.clone();
        url.pathname = path;
        const { headers, csp } = withCsp(withLocaleHeaders(req, locale, path));
        const res = NextResponse.rewrite(url, { request: { headers } });
        res.headers.set('Content-Security-Policy', csp);
        res.cookies.set(LOCALE_COOKIE, locale, {
            path: '/',
            maxAge: COOKIE_MAX_AGE,
            sameSite: 'lax',
        });
        return res;
    }

    // No prefix. Send a returning Norwegian/Swedish visitor to their localized URL
    // so the address bar matches the language they're reading. Crawlers carry no
    // cookie, so they always get the English page and reach /no and /sv via hreflang.
    if (isLocalizedPath(pathname)) {
        const saved = req.cookies.get(LOCALE_COOKIE)?.value;
        if (isPrefixedLocale(saved)) {
            const url = req.nextUrl.clone();
            url.pathname = pathname === '/' ? `/${saved}` : `/${saved}${pathname}`;
            return NextResponse.redirect(url);
        }
    }

    const { headers, csp } = withCsp(withLocaleHeaders(req, 'en', pathname));
    const res = NextResponse.next({ request: { headers } });
    res.headers.set('Content-Security-Policy', csp);
    return res;
}

export const config = {
    // Skip API routes, Next internals, and anything with a file extension.
    matcher: ['/((?!api|_next/static|_next/image|.*\\.).*)'],
};
