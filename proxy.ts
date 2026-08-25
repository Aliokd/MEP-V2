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
 * THE WHOLE POLICY LIVES HERE. It used to be split — the directives needing no
 * per-request value (frame-ancestors, base-uri, object-src, form-action) were
 * declared in next.config.ts `headers()` so they would also cover the paths this
 * proxy skips, on the assumption that a browser receiving two CSP headers
 * enforces each independently. That assumption never survived the deployment:
 * firebase-tools translates next.config `headers()` into Firebase Hosting header
 * rules, and Hosting *replaces* the header the backend set rather than appending
 * to it. Production therefore served the four static directives and nothing
 * else — script-src, connect-src, frame-src, media-src and worker-src were
 * silently unenforced for as long as the split existed. One header, built in one
 * place, is the only arrangement Hosting cannot quietly undo.
 *
 * The paths this proxy skips (API routes, static files, anything with an
 * extension) now get no CSP at all. That costs little: those responses are JSON
 * and assets, where base-uri/object-src/form-action have nothing to act on, and
 * `X-Frame-Options: DENY` — still declared in next.config.ts, still applied by
 * Hosting to every path — covers the framing that frame-ancestors was buying.
 *
 * The nonce is what forces this to be built per request, and Next reads it back
 * out of the header we set here: middleware response headers are copied onto the
 * request before the render (resolve-routes.js), and app-render parses
 * `script-src` for a `'nonce-…'` to stamp on every script tag it emits. So the
 * nonce must stay inside the `script-src` directive of this exact header — move
 * it and Next's own chunks lose their nonce, which under 'strict-dynamic' means
 * a blank page.
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
            // Paddle. frame-src already allows the checkout iframe, but Paddle.js
            // runs in *our* page: initializePaddle pulls cdn.paddle.com and the
            // checkout talks to checkout-service.paddle.com from here, not from
            // inside the frame. Listed now because the policy was never enforced
            // before — an omission that would have surfaced as a checkout that
            // opens an empty box the first time this header actually applied.
            'https://*.paddle.com',
            // Reverse geocoding for "detect my location" (handleDetectLocation in
            // app/platform/create/page.tsx). Currently unreachable in production:
            // the Permissions-Policy in next.config.ts sends `geolocation=()`, so
            // getCurrentPosition never resolves and this fetch never fires. Kept
            // so re-enabling that permission is a one-line change rather than a
            // one-line change plus a CSP violation nobody connects to it.
            'https://nominatim.openstreetmap.org',
        ].join(' '),
        // The lesson embeds (YouTube, Vimeo, Spotify) and the Paddle checkout
        // overlay are the only things allowed to frame inside our pages —
        // plus the Firebase Auth helper iframe. That last one is not optional:
        // signInWithPopup/signInWithRedirect/getRedirectResult all load
        // https://mep-v2.firebaseapp.com/__/auth/iframe (authDomain in
        // lib/firebase.ts) to broker the handshake, so omitting it blocks the
        // frame and Google sign-in fails — and it bites hardest on mobile, where
        // popups are commonly blocked and the redirect path is the fallback.
        "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com https://*.paddle.com https://mep-v2.firebaseapp.com https://*.firebaseapp.com",
        "worker-src 'self' blob:",
        // The directives that need no per-request value. They were the "static
        // half" declared in next.config.ts until Firebase Hosting turned that
        // into a header that replaced this one — see the note above.
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
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

/**
 * The terms lived at /terms-of-use as a CMS page before the canonical /terms
 * route existed; that document is unpublished now, and one terms URL is a legal
 * hygiene matter, not just tidiness. Enumerated like the waitlist paths above,
 * and for the same reason.
 */
const OLD_TERMS_PATHS = new Set([
    '/terms-of-use',
    '/no/terms-of-use',
    '/sv/terms-of-use',
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

    if (OLD_TERMS_PATHS.has(pathname)) {
        const url = req.nextUrl.clone();
        url.pathname = pathname.replace(/\/terms-of-use$/, '/terms');
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
