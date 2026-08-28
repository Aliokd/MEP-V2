"use client";

import { useEffect, useSyncExternalStore } from 'react';
import Script from 'next/script';
import {
    initPostHog,
    enablePersistentTracking,
    disablePersistentTracking,
    enableSessionReplay,
    disableSessionReplay,
} from '@/lib/posthog';
import { initFirebaseAnalytics } from '@/lib/firebase';
import { getConsentSnapshot, getServerConsentSnapshot, subscribeConsent } from '@/lib/cookieConsent';

const CLARITY_PROJECT_ID = 'xovh69ah42';

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
 * Firebase Analytics; session recording turns on PostHog replay and Clarity.
 * Someone who agreed to be counted but not filmed gets exactly the first set.
 *
 * Clarity and Firebase Analytics have no storage-free mode, so they stay fully
 * consent-gated. Neither can be unloaded again once running: on withdrawal they
 * persist until the next full page load, at which point this component simply
 * doesn't start them.
 */
/**
 * `nonce` comes from the root layout, which reads it off the request header
 * proxy.ts sets. It cannot be read here: this is a client component, and the
 * nonce is per-request server state.
 *
 * Passed explicitly rather than relied upon. script-src is
 * `'nonce-…' 'strict-dynamic'`, and next/script injects the Clarity tag from
 * already-trusted bundle code, so strict-dynamic arguably covers it — but
 * "arguably" is the wrong footing for a tag that fails silently when it is
 * wrong. With the nonce attached it is allowed under the nonce rule directly,
 * whichever way that argument goes.
 */
export default function AnalyticsGate({ nonce }: { nonce?: string }) {
    // The stored choice is external state, so it is read through the store API
    // rather than mirrored into component state: no cascading render on mount,
    // and a choice made in another tab settles this one too.
    const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
    const counted = consent?.analytics === true;
    const recorded = consent?.replay === true;

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

    if (!recorded) return null;

    return (
        <Script id="microsoft-clarity" strategy="afterInteractive" nonce={nonce}>
            {`
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
            `}
        </Script>
    );
}
