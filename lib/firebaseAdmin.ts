import "server-only";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// applicationDefault() resolves credentials from GOOGLE_APPLICATION_CREDENTIALS locally,
// or from the attached service account automatically on Firebase App Hosting / Cloud Run.
//
// The reuse check looks for the DEFAULT app by name, not for "any app". This used
// to be `getApps().length > 0 ? getApp() : initializeApp(...)`, which assumes the
// only app that can exist is ours. On deployed Firebase Hosting the web-frameworks
// server harness registers its own *named* admin app before our code runs, so the
// list was non-empty, the getApp() branch fired, and getApp() — which returns only
// the app named "[DEFAULT]" — threw "The default Firebase app does not exist"
// while this module was being evaluated. Every route importing it died at import
// time, and only in production: locally no harness app exists, so the broken
// branch was never taken.
const app =
    getApps().find((existing) => existing.name === "[DEFAULT]") ??
    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
    });

export const adminApp = app;
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
