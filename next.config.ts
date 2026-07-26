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
};

export default nextConfig;
