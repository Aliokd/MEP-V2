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
             * This is the STATIC half of the Content-Security-Policy — the
             * directives that need no per-request value, so they can be stated
             * here and therefore also cover the paths proxy.ts skips (API routes,
             * static files). script-src and the rest are built per request in
             * proxy.ts, because a nonce is only worth anything if it is fresh
             * each time. Both policies are sent; a browser enforces each one
             * independently, and they cover disjoint directives so neither
             * loosens the other.
             */
            {
                source: '/:path*',
                headers: [
                    // frame-ancestors is the modern control; X-Frame-Options is
                    // kept alongside it for older browsers that ignore CSP.
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    // Stops a proxied file being re-interpreted as script/HTML
                    // because the browser guessed a type we did not send.
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    // Full URLs of authenticated pages must not leak to third
                    // parties in the Referer header; project ids live in paths.
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // Recording needs the microphone. Nothing here uses the
                    // camera, geolocation, or payment APIs, so they stay off —
                    // including for any third-party iframe the lesson embeds.
                    { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)' },
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                ],
            },
        ];
    },
};

export default nextConfig;
