"use client";

import { useEffect, useSyncExternalStore } from 'react';
import {
    initPostHog,
    enablePersistentTracking,
    disablePersistentTracking,
    enableSessionReplay,
    disableSessionReplay,
} from '@/lib/posthog';
import { initFirebaseAnalytics } from '@/lib/firebaseAuth';
import { initGoogleAds, disableGoogleAds } from '@/lib/googleAds';
import { initMetaPixel, disableMetaPixel } from '@/lib/metaPixel';
import { getConsentSnapshot, getServerConsentSnapshot, subscribeConsent } from '@/lib/cookieConsent';

/**
 * Two-tier analytics, keyed off the consent bar.
 *
 * PostHog starts for every visitor — but in its anonymous tier: memory-only
 * persistence, nothing written to the device, no identity across visits, no
 * replay (lib/posthog.ts documents why that is the pre-consent line). Allowing
 * the analytics category upgrades it in place — durable identity, no reload
 * needed — and withdrawing downgrades it the same way.
 *
 * The two consent categories map to different vendors, which is why they are
 * two effects rather than one: analytics turns on PostHog's identified tier and
 * Firebase Analytics; session recording turns on PostHog replay. Someone who
 * agreed to be counted but not filmed gets exactly the first set.
 *
 * Firebase Analytics has no storage-free mode, so it stays fully consent-gated
 * and cannot be unloaded again once running: on withdrawal it persists until
 * the next full page load, at which point this component simply doesn't start
 * it. Microsoft Clarity used to ride on the replay category too; it was
 * removed on 2026-09-20 (PostHog replay covers it, and one recorder of
 * what people type is enough to keep an eye on).
 *
 * Marketing is a third, independent category: it starts the ad-measurement
 * tags, Google Ads (lib/googleAds.ts) and the Meta Pixel (lib/metaPixel.ts),
 * which go to different companies for a different purpose, so it neither needs
 * nor implies the other two.
 *
 * Renders nothing: the whole job is the effects.
 */
export default function AnalyticsGate() {
    // The stored choice is external state, so it is read through the store API
    // rather than mirrored into component state: no cascading render on mount,
    // and a choice made in another tab settles this one too.
    const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
    const counted = consent?.analytics === true;
    const recorded = consent?.replay === true;
    const marketed = consent?.marketing === true;

    // Anonymous tier for everyone, before and regardless of any answer.
    useEffect(() => {
        initPostHog();
    }, []);

    useEffect(() => {
        if (counted) {
            enablePersistentTracking();
            initFirebaseAnalytics();
        } else {
            // No-op unless a previous grant is being withdrawn — the function
            // guards itself, so the initial unanswered state costs nothing.
            // It takes replay down with it, so the effects can't disagree.
            disablePersistentTracking();
        }
    }, [counted]);

    useEffect(() => {
        // Ordered after the effect above by declaration order, which is what
        // lets enableSessionReplay() find the persistent tier already up when
        // both categories are allowed in the same pass.
        if (recorded) enableSessionReplay();
        else disableSessionReplay();
    }, [recorded]);

    useEffect(() => {
        if (marketed) {
            initGoogleAds();
            initMetaPixel();
        } else {
            disableGoogleAds();
            disableMetaPixel();
        }
    }, [marketed]);

    return null;
}
