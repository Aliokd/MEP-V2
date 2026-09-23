import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * The link that brings an unfinished signup back to where it stopped.
 *
 * Sent in the day-after reminder (lib/email/signupNudges.ts). The link
 * carries 32 random bytes; only their sha256 is stored, in
 * `onboarding_resume/{uid}`, the same way the six-digit codes are kept.
 * Opening it is proof of the inbox, exactly as typing a code is, so the
 * resume route treats it as the verification and signs the browser in.
 *
 * One link per account at a time, good for LINK_TTL_DAYS, used once.
 */

export const LINK_TTL_DAYS = 7;
const COLLECTION = "onboarding_resume";

/** The steps a resumed signup can land on, in flow order. */
export const RESUMABLE_STEPS = ["verdict", "offer", "paywall"] as const;
export type ResumableStep = (typeof RESUMABLE_STEPS)[number];

export function hashToken(token: string): string {
    return createHash("sha256").update(`resume:${token}`).digest("hex");
}

/** Makes (or replaces) the account's link and returns the raw token for the email. */
export async function issueResumeToken(uid: string, email: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const now = Date.now();
    await adminDb.collection(COLLECTION).doc(uid).set({
        uid,
        email,
        tokenHash: hashToken(token),
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        usedAt: null,
    });
    return token;
}

export type ResumeLookup =
    | { ok: true; uid: string; email: string; ref: FirebaseFirestore.DocumentReference }
    | { ok: false; reason: "invalid" | "expired" | "used" };

export async function findResumeToken(token: string): Promise<ResumeLookup> {
    if (typeof token !== "string" || token.length < 20 || token.length > 100) return { ok: false, reason: "invalid" };
    const snap = await adminDb.collection(COLLECTION).where("tokenHash", "==", hashToken(token)).limit(1).get();
    if (snap.empty) return { ok: false, reason: "invalid" };
    const doc = snap.docs[0];
    const d = doc.data();
    if (d.usedAt) return { ok: false, reason: "used" };
    if (Date.parse(d.expiresAt) < Date.now()) return { ok: false, reason: "expired" };
    return { ok: true, uid: d.uid, email: d.email, ref: doc.ref };
}

/** Clamps a stored step to one a resumed signup can land on. */
export function resumeStep(lastStep: unknown): ResumableStep {
    return RESUMABLE_STEPS.includes(lastStep as ResumableStep) ? (lastStep as ResumableStep) : "verdict";
}
