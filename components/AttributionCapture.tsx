"use client";

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

/**
 * Runs once per page load and keeps the ad tags the URL arrived with, so a
 * signup a few pages later can say which campaign it came from. Renders
 * nothing. See lib/attribution.ts.
 */
export default function AttributionCapture() {
    useEffect(() => {
        captureAttribution();
    }, []);
    return null;
}
