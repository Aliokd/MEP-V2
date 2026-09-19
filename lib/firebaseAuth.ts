import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/*
 * The Firebase app and Auth, and nothing else.
 *
 * Every page, marketing ones included, mounts the AuthProvider and the
 * Navigation, so whatever this module imports is downloaded by every visitor.
 * Firestore and Storage are a quarter of a megabyte between them and nothing
 * before sign-in reads either, so they live in lib/firebase.ts, which only
 * the platform, sign-in and onboarding code imports. lib/firebase.ts
 * re-exports everything here, so both modules share the one app instance and
 * the one Auth singleton; nothing changes for code that imports from there.
 */
const firebaseConfig = {
    apiKey: "AIzaSyDakTEN2xkmYPR6ZAUUq3e1fXojAuY3E7M",
    authDomain: "mep-v2.firebaseapp.com",
    projectId: "mep-v2",
    storageBucket: "mep-v2.firebasestorage.app",
    messagingSenderId: "828311508339",
    appId: "1:828311508339:web:720ef081a08fe3d3372106",
    measurementId: "G-PRRRT1N7LQ"
};

// Initialize Firebase for Next.js (client-side safe)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Firebase Analytics (GA4).
 *
 * Deliberately not started on import. It used to be, which meant _ga cookies
 * were set on every page load before anyone saw the consent bar — and nothing
 * in the app ever consumed the result, so it was tracking with no reader.
 * AnalyticsGate calls this only after an explicit "accept all".
 *
 * The SDK itself is fetched on that first call rather than bundled: it is
 * consent-gated, so most visitors never need it downloaded at all.
 */
let analyticsPromise: Promise<unknown> | null = null;

export function initFirebaseAnalytics(): Promise<unknown> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!analyticsPromise) {
        analyticsPromise = import("firebase/analytics")
            .then(({ getAnalytics, isSupported }) =>
                isSupported().then(supported => (supported ? getAnalytics(app) : null)),
            )
            .catch(() => null);
    }
    return analyticsPromise;
}

export default app;
