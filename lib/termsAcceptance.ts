import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TERMS_VERSION } from "@/lib/legalVersions";

/**
 * Records that this account has accepted the current Terms & Conditions.
 *
 * Called from the sign-in page after a successful sign-in — the page displays
 * the "By continuing, you agree to our Terms & Conditions" notice next to every
 * way in, so continuing past it is the acceptance being recorded. New signups
 * get the same fields written by createUserProfile; this call is what covers
 * accounts that predate the field, accounts created by an admin on the user's
 * behalf, and everyone after a version bump.
 *
 * Best-effort by design: a failure to write this must never block a sign-in.
 * The write is skipped when the stored version is already current, so the
 * common case costs one read.
 */
export async function recordTermsAcceptance(uid: string): Promise<void> {
    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        const accepted = snap.exists() ? (snap.data()?.terms?.acceptedVersion as string | undefined) : undefined;
        if (accepted && accepted >= TERMS_VERSION) return;

        await setDoc(userRef, {
            terms: {
                acceptedVersion: TERMS_VERSION,
                acceptedAt: new Date().toISOString(),
            },
        }, { merge: true });
    } catch (err) {
        console.warn("Could not record terms acceptance:", err);
    }
}
