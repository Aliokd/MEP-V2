"use client";

import { useEffect, useSyncExternalStore } from 'react';
import Script from 'next/script';
import { initPostHog, enableFullTracking, disableFullTracking } from '@/lib/posthog';
import { initFirebaseAnalytics } from '@/lib/firebase';
import { getConsentSnapshot, getServerConsentSnapshot, subscribeConsent } from '@/lib/cookieConsent';

const CLARITY_PROJECT_ID = 'xovh69ah42';

/**
 * Two-tier analytics, keyed off the consent bar.
 *
 * PostHog starts for every visitor — but in its anonymous tier: memory-only
 * persistence, nothing written to the device, no identity across visits, no
 * replay (lib/posthog.ts documents why that is the pre-consent line). "Accept
 * all" upgrades it in place — durable identity plus session replay, no reload
 * needed — and withdrawing consent downgrades it the same way.
 *
 * Clarity and Firebase Analytics have no storage-free mode, so they stay fully
 * consent-gated and load only after "accept all". Neither can be unloaded
 * again once running: on withdrawal they persist until the next full page
 * load, at which point this component simply doesn't start them.
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
    const allowed = consent === 'all';

    // Anonymous tier for everyone, before and regardless of any answer.
    useEffect(() => {
        initPostHog();
    }, []);

    useEffect(() => {
        if (allowed) {
            enableFullTracking();
            initFirebaseAnalytics();
        } else {
            // No-op unless a previous grant is being withdrawn — the function
            // guards itself, so the initial unanswered state costs nothing.
            disableFullTracking();
        }
    }, [allowed]);

    if (!allowed) return null;

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
