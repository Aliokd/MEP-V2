import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { rateLimitGuard } from "@/lib/rateLimit";
import { sendMail } from "@/lib/email/send";
import { verificationCodeEmail } from "@/lib/email/templates/verificationCode";
import { resolveLocale } from "@/lib/email/locale";
import { getCopyOverrides } from "@/lib/siteCopy";
import { newUserProfile, nameFromEmail } from "@/lib/userProfileShape";
import { issueCode, clearCode, CODE_TTL_MINUTES } from "@/lib/onboardingCodes";
import { SIGNUPS_OPEN } from "@/lib/uiFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The onboarding email step, server side.
 *
 * Creates the account the rest of the flow needs. The Paddle webhook ties a
 * subscription to a user through `customData.uid` and nothing else, so a real
 * uid has to exist before the checkout opens, and the checkout comes before
 * the code. That ordering is the whole reason this route exists: the address
 * is taken, an account is made for it with no password and the address
 * unverified, and the caller is handed a custom token so the browser is
 * signed in as that account for the checkout. The code that arrives by email
 * is checked at the end by /api/onboarding/verify, which is what turns the
 * account into a finished one.
 *
 * Three cases, one route:
 *
 *   - No account for the address: create it, send a code, sign the caller in.
 *   - An account this flow made earlier and never verified: send a fresh
 *     code, sign the caller in. This is both "send it again" and "I closed
 *     the tab yesterday", and it is why a stale unverified account is never
 *     a dead end.
 *   - Any other account (verified, Google, made by an admin): refuse with
 *     `account-exists`. The sign-in page is the way in for those.
 *
 * A signed-in pending account can also ask for a different address: the
 * "wrong address? change it" path on the code screen. With a bearer token for
 * an unverified onboarding account, the email is moved on that account rather
 * than a second one being made.
 *
 * Unauthenticated by necessity (there is no account yet), so it is rate
 * limited by IP, and the code issuer refuses a resend inside its cooldown.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ANSWER_VALUES = 8;
const MAX_ANSWER_LENGTH = 200;
const KNOWN_QUESTIONS = new Set(["songwriter_type", "creation_method", "struggle", "dream_outcome", "emotional_inspiration"]);

function sanitizeAnswers(raw: unknown): Record<string, string | string[]> {
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!KNOWN_QUESTIONS.has(key)) continue;
        if (typeof value === "string") {
            out[key] = value.slice(0, MAX_ANSWER_LENGTH);
        } else if (Array.isArray(value)) {
            out[key] = value
                .filter((v): v is string => typeof v === "string")
                .slice(0, MAX_ANSWER_VALUES)
                .map((v) => v.slice(0, MAX_ANSWER_LENGTH));
        }
    }
    return out;
}

function sanitizeSource(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
    return cleaned || null;
}

/**
 * Whether an existing account is one this flow made and has not finished.
 * Only such an account may be resumed by anyone who types its address; every
 * other kind belongs to someone who already signed in as it.
 */
async function isPendingOnboarding(uid: string, emailVerified: boolean): Promise<boolean> {
    if (emailVerified) return false;
    const snap = await adminDb.doc(`users/${uid}`).get();
    const signup = snap.data()?.signup;
    return signup?.method === "onboarding" && !signup?.verifiedAt;
}

/** Firebase Admin errors carry their meaning in `code`; everything else has none. */
function errorCode(err: unknown): string | null {
    return typeof err === "object" && err !== null && typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : null;
}

/** The caller's uid when the request carries a valid token, else null. Never a 401: this route is open. */
async function optionalUid(request: Request): Promise<string | null> {
    const header = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) return null;
    try {
        const decoded = await adminAuth.verifyIdToken(match[1], true);
        return decoded.uid;
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    if (!SIGNUPS_OPEN) {
        return NextResponse.json({ error: "signups-closed" }, { status: 403 });
    }

    const throttled = rateLimitGuard(request, "onboarding-start");
    if (throttled) return throttled;

    let body: Record<string, unknown>;
    try {
        const parsed: unknown = await request.json();
        body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return NextResponse.json({ error: "invalid-body" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return NextResponse.json({ error: "invalid-email" }, { status: 400 });
    }

    // Without mail there is no code, and without a code the account can never
    // be finished. Better to refuse the step than to create accounts nobody
    // can verify. Development still gets through: the code is logged instead.
    const canMail = Boolean(process.env.SMTP_PASS);
    if (!canMail && process.env.NODE_ENV === "production") {
        console.error("[onboarding/start] SMTP_PASS is not set; refusing to create an account that cannot be verified.");
        return NextResponse.json({ error: "mail-unavailable" }, { status: 503 });
    }

    const locale = resolveLocale(body.locale);
    const answers = sanitizeAnswers(body.answers);
    const source = sanitizeSource(body.source);
    const callerUid = await optionalUid(request);

    let uid: string | null = null;
    let resumed = false;

    try {
        // A signed-in pending account changing its address. The old address
        // was never verified, so moving it is safe; a taken address surfaces
        // as `account-exists` below, like any other.
        if (callerUid) {
            const caller = await adminAuth.getUser(callerUid);
            if (caller.email?.toLowerCase() !== email && (await isPendingOnboarding(callerUid, caller.emailVerified))) {
                await adminAuth.updateUser(callerUid, { email, emailVerified: false });
                await adminDb.doc(`users/${callerUid}`).set({ email }, { merge: true });
                uid = callerUid;
                resumed = true;
            }
        }

        if (!resumed) {
            const existing = await adminAuth.getUserByEmail(email).catch((err: unknown) => {
                if (errorCode(err) === "auth/user-not-found") return null;
                throw err;
            });

            if (existing) {
                if (!(await isPendingOnboarding(existing.uid, existing.emailVerified))) {
                    return NextResponse.json({ error: "account-exists" }, { status: 409 });
                }
                uid = existing.uid;
                resumed = true;
                // The answers may be better this time round; the first pass
                // through the quiz is not more true than the second.
                if (Object.keys(answers).length) {
                    await adminDb.doc(`users/${uid}`).set({ answers }, { merge: true });
                }
            } else {
                const name = nameFromEmail(email);
                const created = await adminAuth.createUser({
                    email,
                    emailVerified: false,
                    displayName: name,
                    // No password was asked for. A long random one satisfies
                    // Firebase and can never be guessed; the person sets their
                    // own on the welcome screen, or later through "forgot
                    // password", which works on any account with an address.
                    password: randomBytes(32).toString("base64url"),
                });
                uid = created.uid;

                const now = new Date().toISOString();
                const batch = adminDb.batch();
                batch.set(adminDb.doc(`users/${uid}`), newUserProfile({
                    uid,
                    name,
                    email,
                    answers,
                    signup: { method: "onboarding", source, verifiedAt: null },
                }));
                // The public slice, mirrored the way lib/userProfile.ts does
                // for client-made accounts.
                batch.set(adminDb.doc(`publicProfiles/${uid}`), {
                    uid,
                    name,
                    photoURL: null,
                    songwriterType: typeof answers.songwriter_type === "string" ? answers.songwriter_type : null,
                    createdAt: now,
                    lastActiveAt: now,
                }, { merge: true });
                await batch.commit();
            }
        }
    } catch (error: unknown) {
        if (errorCode(error) === "auth/email-already-exists") {
            return NextResponse.json({ error: "account-exists" }, { status: 409 });
        }
        console.error("[onboarding/start] account step failed:", error);
        return NextResponse.json({ error: "account-failed" }, { status: 500 });
    }

    if (!uid) {
        return NextResponse.json({ error: "account-failed" }, { status: 500 });
    }

    const issued = await issueCode(uid, email);
    if (!issued.ok) {
        return NextResponse.json(
            { error: "cooldown", retryAfter: issued.retryAfterSeconds },
            { status: 429, headers: { "Retry-After": String(issued.retryAfterSeconds) } },
        );
    }

    if (canMail) {
        try {
            const { subject, html, text } = verificationCodeEmail(
                locale,
                { code: issued.code, minutes: CODE_TTL_MINUTES },
                await getCopyOverrides(),
            );
            await sendMail({ to: email, subject, html, text });
        } catch (error) {
            // The account exists; only the mail failed. The code is forgotten
            // so the next attempt is not refused by the resend cooldown for a
            // code nobody received, and the screen says to try again.
            console.error("[onboarding/start] code email failed:", error);
            await clearCode(uid).catch(() => { /* the next issue overwrites it anyway */ });
            return NextResponse.json({ error: "mail-failed" }, { status: 502 });
        }
    } else {
        console.info(`[onboarding/start] (dev, no SMTP) verification code for ${email}: ${issued.code}`);
    }

    // The custom token signs the browser in as this account for the rest of
    // the flow. Short-lived by Firebase's own rules (one hour), and the verify
    // route revokes every session older than itself once the code is in, so
    // a token handed out here for an address someone else then claims does
    // not outlive their claim.
    let token: string;
    try {
        token = await adminAuth.createCustomToken(uid);
    } catch (error) {
        // On Cloud Run the Admin SDK signs custom tokens through the IAM
        // Credentials API, which needs the runtime service account to hold
        // roles/iam.serviceAccountTokenCreator on itself. Without it this is
        // the one line of the route that fails, after the account exists and
        // the code has gone out. Named so the log says what to grant rather
        // than surfacing as an anonymous 500.
        console.error("[onboarding/start] createCustomToken failed (grant roles/iam.serviceAccountTokenCreator to the runtime service account):", error);
        return NextResponse.json({ error: "token-failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, uid, token, resumed });
}
