import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * The six-digit codes that finish an onboarding signup.
 *
 * One document per account at onboarding_codes/{uid}, holding a hash of the
 * code rather than the code: the collection is Admin-SDK-only (no client rule
 * matches it in firestore.rules), but a leaked export should still not be a
 * list of live codes. The code itself exists in exactly two places, the email
 * and the boxes the person types it into.
 *
 * Both routes that touch this (start and verify) go through here so the
 * lifetime, the attempt ceiling and the resend cooldown are one set of numbers.
 */
export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 15;
/** Wrong tries before the code is burned and a fresh one has to be sent. */
export const MAX_ATTEMPTS = 5;
/** Matches RESEND_COOLDOWN_S on the code screen, so the server never refuses
 *  a press the screen allowed. */
export const RESEND_COOLDOWN_S = 30;

const COLLECTION = "onboarding_codes";

interface CodeDoc {
    codeHash: string;
    email: string;
    expiresAt: string;
    sentAt: string;
    attempts: number;
}

function hashCode(uid: string, code: string): string {
    // Salted with the uid so two accounts sent the same six digits do not
    // share a hash, which would otherwise let one document verify another.
    return createHash("sha256").update(`${uid}:${code}`).digest("hex");
}

export function newCode(): string {
    // randomInt is unbiased over the range, unlike Math.random() scaled up.
    return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export type IssueResult =
    | { ok: true; code: string }
    | { ok: false; reason: "cooldown"; retryAfterSeconds: number };

/**
 * Mints a code for the account and records its hash, replacing any earlier
 * one. Refuses inside the cooldown: a second press on "send it again" must
 * not put two live codes in one inbox.
 */
export async function issueCode(uid: string, email: string): Promise<IssueResult> {
    const ref = adminDb.collection(COLLECTION).doc(uid);
    const existing = (await ref.get()).data() as CodeDoc | undefined;

    if (existing?.sentAt) {
        const elapsed = (Date.now() - Date.parse(existing.sentAt)) / 1000;
        if (elapsed >= 0 && elapsed < RESEND_COOLDOWN_S) {
            return { ok: false, reason: "cooldown", retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_S - elapsed) };
        }
    }

    const code = newCode();
    const now = Date.now();
    const doc: CodeDoc = {
        codeHash: hashCode(uid, code),
        email,
        expiresAt: new Date(now + CODE_TTL_MINUTES * 60_000).toISOString(),
        sentAt: new Date(now).toISOString(),
        attempts: 0,
    };
    await ref.set(doc);

    return { ok: true, code };
}

/**
 * Whether an account is one the onboarding flow made and has not finished:
 * unverified in Auth, and marked as an onboarding signup with no verifiedAt
 * on its user doc. Only such an account may be resumed by typing its address
 * again; every other kind belongs to someone who already signed in as it.
 */
export async function isPendingOnboarding(uid: string, emailVerified: boolean): Promise<boolean> {
    if (emailVerified) return false;
    const snap = await adminDb.doc(`users/${uid}`).get();
    const signup = snap.data()?.signup;
    return signup?.method === "onboarding" && !signup?.verifiedAt;
}

/**
 * Forgets a code that never reached anyone. Called when the email fails to
 * send: the cooldown exists to stop two live codes landing in one inbox, and
 * a code that landed nowhere must not hold the next attempt to that rule.
 */
export async function clearCode(uid: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(uid).delete();
}

export type CheckResult =
    | { ok: true }
    | { ok: false; reason: "expired" | "invalid" | "locked" };

/**
 * Checks a code against the account's record and consumes it on success.
 *
 * A wrong code counts against the ceiling; the ceiling burns the code. An
 * expired or missing code is "expired" either way, since the fix is the same
 * (send a new one) and telling the two apart would only say whether an
 * account is mid-signup.
 */
export async function checkCode(uid: string, code: string, email?: string | null): Promise<CheckResult> {
    const ref = adminDb.collection(COLLECTION).doc(uid);
    const snap = await ref.get();
    const stored = snap.data() as CodeDoc | undefined;

    if (!stored || Date.parse(stored.expiresAt) < Date.now()) {
        if (stored) await ref.delete();
        return { ok: false, reason: "expired" };
    }

    // A code proves possession of the inbox it was sent to. If the account's
    // address moved after the code went out, the code no longer speaks for the
    // address on the account, and is treated as expired: the fix (send a new
    // one, to the current address) is the same.
    if (email && stored.email.toLowerCase() !== email.toLowerCase()) {
        await ref.delete();
        return { ok: false, reason: "expired" };
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
        await ref.delete();
        return { ok: false, reason: "locked" };
    }

    const expected = Buffer.from(stored.codeHash, "hex");
    const given = Buffer.from(hashCode(uid, code), "hex");
    const matches = expected.length === given.length && timingSafeEqual(expected, given);

    if (!matches) {
        const attempts = stored.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
            await ref.delete();
            return { ok: false, reason: "locked" };
        }
        await ref.update({ attempts });
        return { ok: false, reason: "invalid" };
    }

    await ref.delete();
    return { ok: true };
}
