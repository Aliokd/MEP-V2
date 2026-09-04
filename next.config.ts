import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        unoptimized: true,
    },
    typescript: {
        // Was true, which shipped type errors straight to production. The tree is
        // clean, so this now fails the build instead of hiding the problem — the
        // point of a typed codebase is that a bad deploy stops here.
        ignoreBuildErrors: false,
    },
    /**
     * Declared for clarity; firebase-admin is auto-externalised anyway. The actual
     * fix for the production failure was switching the build to webpack — see the
     * note on the "build" script in package.json.
     */
    serverExternalPackages: ['firebase-admin'],
    /**
     * robots.ts only stops crawling; a disallowed URL can still be indexed bare
     * if something links to it. This header is the actual "stay out of the
     * index" signal for the authenticated app surfaces.
     */
    async headers() {
        return [
            {
                source: '/(platform|admin)/:path*',
                headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
            },
            {
                source: '/(platform|admin)',
                headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
            },
            /**
             * Baseline security headers for every response. The site shipped with
             * none of these, which left the authenticated app framable by any
             * origin — a click on an invisible overlay lands on whatever control
             * sits under it, and the platform has destructive ones.
             *
             * DO NOT declare Content-Security-Policy here. It was, once: the
             * static directives (frame-ancestors, base-uri, object-src,
             * form-action) sat in this block while proxy.ts built the rest per
             * request, on the assumption that both headers would be delivered and
             * enforced side by side. On Firebase Hosting they are not.
             * firebase-tools reads this list out of the routes manifest and emits
             * it as Hosting header rules, and Hosting REPLACES the same-named
             * header coming back from the Next backend. The static four were the
             * only policy production ever saw; the nonce, 'strict-dynamic', the
             * connect-src allowlist and frame-src were all dead letters. The
             * whole policy now lives in buildCsp() in proxy.ts, and anything
             * added back here would silently delete it again.
             *
             * Everything else in this block is safe precisely because proxy.ts
             * does not also set it — one owner per header.
             */
            {
                source: '/:path*',
                headers: [
                    // Carries the framing ban onto the paths proxy.ts skips (API
                    // routes, static files), which get no CSP at all, and covers
                    // older browsers that ignore frame-ancestors.
                    { key: 'X-Frame-Options', value: 'DENY' },
                    // Stops a proxied file being re-interpreted as script/HTML
                    // because the browser guessed a type we did not send.
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    // Full URLs of authenticated pages must not leak to third
                    // parties in the Referer header; project ids live in paths.
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // Recording needs the microphone; the songwriter map's "use my
                    // location" needs geolocation. Both are `(self)`: our own
                    // origin only, so every third-party iframe the lessons embed
                    // still can't ask for either. Camera, payment and USB stay off
                    // — nothing uses them.
                    //
                    // Note geolocation was `()` for a long time, and that silently
                    // killed the Create page's "detect my location" too. Opening it
                    // here brings that back as well.
                    { key: 'Permissions-Policy', value: 'camera=(), geolocation=(self), payment=(), usb=(), microphone=(self)' },
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                ],
            },
        ];
    },
};

export default nextConfig;
