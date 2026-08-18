import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        unoptimized: true,
    },
    typescript: {
        ignoreBuildErrors: true,
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
        ];
    },
};

export default nextConfig;
