import "server-only";
import { getApps, getApp, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// applicationDefault() resolves credentials from GOOGLE_APPLICATION_CREDENTIALS locally,
// or from the attached service account automatically on Firebase App Hosting / Cloud Run.
const app =
    getApps().length > 0
        ? getApp()
        : initializeApp({
              credential: applicationDefault(),
              projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
          });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
