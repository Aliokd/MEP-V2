"use client";

/**
 * Loads the Google Maps JavaScript API once per page.
 *
 * Keyed by NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. That key has to be minted in Google
 * Cloud on a project with billing enabled and the "Maps JavaScript API" turned
 * on — restrict it by HTTP referrer to the app's domains, since it ships to the
 * browser. Until it is set, `isGoogleMapsConfigured()` is false and the map
 * surfaces render a quiet "not configured" state instead of erroring.
 *
 * The script is injected rather than pulled in through a loader package: it is
 * one tag, and the CSP in proxy.ts allow-lists maps.googleapis.com for it.
 */

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export function isGoogleMapsConfigured(): boolean {
    return GOOGLE_MAPS_API_KEY.length > 0;
}

let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Google Maps can only load in the browser'));
    }
    if (!isGoogleMapsConfigured()) {
        return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'));
    }
    if (window.google?.maps) return Promise.resolve(window.google);
    if (loadPromise) return loadPromise;

    loadPromise = new Promise<typeof google>((resolve, reject) => {
        const callbackName = '__veinoteGoogleMapsReady';
        (window as unknown as Record<string, unknown>)[callbackName] = () => {
            delete (window as unknown as Record<string, unknown>)[callbackName];
            resolve(window.google);
        };

        const script = document.createElement('script');
        const params = new URLSearchParams({
            key: GOOGLE_MAPS_API_KEY,
            v: 'weekly',
            loading: 'async',
            callback: callbackName,
        });
        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
        script.async = true;
        script.onerror = () => {
            loadPromise = null;
            reject(new Error('Google Maps script failed to load'));
        };
        document.head.appendChild(script);
    });

    return loadPromise;
}

/**
 * "Google, with less detail."
 *
 * Google's default map is a road atlas. This keeps its colours and its
 * typography and takes away everything that isn't geography: points of
 * interest, transit, road labels, and roads themselves below the arterial
 * level. What is left reads as a clean map of *places* — which is what a map
 * of where songwriters live needs.
 */
export const QUIET_MAP_STYLE: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.local', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.arterial', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ visibility: 'simplified' }, { saturation: -60 }, { lightness: 30 }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.man_made', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

/**
 * The same map, drained for the minimised banner — where it sits as a panel
 * on a beige page rather than as the page itself.
 */
export const BANNER_MAP_STYLE: google.maps.MapTypeStyle[] = [
    ...QUIET_MAP_STYLE,
    { elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 20 }] },
    { elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d9d8cf' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f1ea' }] },
];
