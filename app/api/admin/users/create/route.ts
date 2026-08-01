import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates/welcome";
import { resolveLocale } from "@/lib/email/locale";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const VALID_TIERS = ["trial", "pro", "max", "comp"];
const VALID_LOCALES = ["en", "no", "sv"];

// Firebase itself only enforces 6 characters. An admin setting someone else's
// password should not be able to set a worse one than the user would pick.
const MIN_PASSWORD_LENGTH = 10;

/**
 * Creates a Veinote account from the admin console.
 *
 * The account is identical to one made through normal signup: the same
 * `users/{uid}` profile shape as lib/userProfile.ts, so every platform read path
 * (create canvas, tier gating, billing, collaborator lookups) works without
 * knowing the account came from here. The person signs in with the email and
 * password exactly as any other user.
 *
 * The password is never stored, logged or echoed back — it goes straight to
 * Firebase Auth, which hashes it. It is deliberately absent from the audit entry.
 */
export const POST = withAdmin("users.create", async (request, admin) => {
    const body = await request.json();
    const {
        email,
        password,
        name,
        tier = "trial",
        locale = "en",
        trialDays,
        sendWelcome = true,
        emailVerified = true,
    } = body;

    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
        return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }
    if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
            { status: 400 },
        );
    }
    if (!VALID_TIERS.includes(tier)) {
        return NextResponse.json({ error: `Invalid tier "${tier}"` }, { status: 400 });
    }
    if (!VALID_LOCALES.includes(locale)) {
        return NextResponse.json({ error: `Invalid locale "${locale}"` }, { status: 400 });
    }

    const existing = await adminAuth.getUserByEmail(cleanEmail).catch(() => null);
    if (existing) {
        return NextResponse.json(
            { error: `${cleanEmail} already has a Veinote account` },
            { status: 409 },
        );
    }

    const displayName = String(name || "").trim() || cleanEmail.split("@")[0];

    let user;
    try {
        user = await adminAuth.createUser({
            email: cleanEmail,
            password: String(password),
            displayName,
            // Marked verified by default: an admin creating the account has
            // confirmed the address out of band, and leaving it unverified
            // would put the person behind a verification email they never asked for.
            emailVerified: Boolean(emailVerified),
        });
    } catch (err: any) {
        // Firebase's own messages are clearer than anything generic here.
        const message =
            err?.code === "auth/invalid-password"
                ? "Firebase rejected that password"
                : err?.message || "Could not create the account";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const trialEndsAt =
        tier === "trial" && Number(trialDays) > 0
            ? new Date(Date.now() + Number(trialDays) * DAY).toISOString()
            : null;

    // Mirrors createUserProfile() in lib/userProfile.ts. If that shape changes,
    // change it here too — an account missing these fields breaks tier gating.
    try {
        await adminDb.collection("users").doc(user.uid).set({
            uid: user.uid,
            name: displayName,
            email: cleanEmail,
            answers: {},
            createdAt: now,
            tier,
            locale,
            lastActiveAt: now,
            // Recorded so support can tell an admin-made account from a self-signup.
            createdByAdmin: admin.email,
            billing: {
                plan: null,
                paddleCustomerId: null,
                paddleSubscriptionId: null,
                subscriptionStatus: null,
                trialEndsAt,
                currentPeriodEnd: null,
                welcomeEmailSent: false,
                trialReminderSentAt: null,
            },
        });
    } catch (err) {
        // Without a profile doc the account exists but the platform can't use it,
        // so roll the auth user back rather than leaving a half-made account.
        await adminAuth.deleteUser(user.uid).catch(() => {});
        console.error("[admin] Profile creation failed, rolled back auth user:", err);
        return NextResponse.json(
            { error: "Account could not be set up. Nothing was created." },
            { status: 500 },
        );
    }

    let welcomeSent = false;
    if (sendWelcome) {
        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
            const { subject, html, text } = welcomeEmail(resolveLocale(locale), {
                name: displayName,
                appUrl: `${appUrl}/platform/create`,
            });
            await sendMail({ to: cleanEmail, subject, html, text });
            await adminDb.collection("users").doc(user.uid).set(
                { billing: { welcomeEmailSent: true } },
                { merge: true },
            );
            welcomeSent = true;
        } catch (err) {
            // The account is fine; only the email failed. Say so rather than
            // failing the whole request.
            console.error("[admin] Welcome email failed for new account:", err);
        }
    }

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "user.create",
        targetType: "user",
        targetId: user.uid,
        targetLabel: cleanEmail,
        // No password field here, deliberately.
        after: { tier, locale, emailVerified: Boolean(emailVerified), welcomeSent },
        ...auditContext(request),
    });

    return NextResponse.json({
        success: true,
        uid: user.uid,
        email: cleanEmail,
        welcomeSent,
    });
});
