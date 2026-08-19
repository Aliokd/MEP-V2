"use client";

import { useEffect, useSyncExternalStore } from 'react';
import Script from 'next/script';
import { initPostHog } from '@/lib/posthog';
import { initFirebaseAnalytics } from '@/lib/firebase';
import { getConsentSnapshot, getServerConsentSnapshot, subscribeConsent } from '@/lib/cookieConsent';

const CLARITY_PROJECT_ID = 'xovh69ah42';

/**
 * Loads PostHog and Clarity only after an explicit "accept all".
 *
 * Both used to boot unconditionally in the root layout, which made the consent
 * bar decorative — the tracking had already started by the time anyone read it.
 * Nothing here runs until consent is granted, and granting it starts both
 * without a reload (the banner dispatches, this listens).
 *
 * Declining is permanent for the session and the browser: there is no path that
 * initialises either SDK without `hasAnalyticsConsent()` being true first.
 */
export default function AnalyticsGate() {
    // The stored choice is external state, so it is read through the store API
    // rather than mirrored into component state: no cascading render on mount,
    // and a choice made in another tab settles this one too.
    const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
    const allowed = consent === 'all';

    useEffect(() => {
        if (!allowed) return;
        initPostHog();
        initFirebaseAnalytics();
    }, [allowed]);

    if (!allowed) return null;

    return (
        <Script id="microsoft-clarity" strategy="afterInteractive">
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
