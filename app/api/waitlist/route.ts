import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendMail } from "@/lib/email/send";
import { rateLimitGuard } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Pre-launch waitlist capture.
 *
 * Deliberately unauthenticated — the whole point is that these people have no
 * account and cannot make one yet. That makes it the only public write path in
 * the app, so it is narrow on purpose: one field, validated, rate limited by IP,
 * and written with the Admin SDK so no client can read the list back.
 *
 * The address is stored *and* emailed. Either alone is a single point of loss:
 * SMTP has failed before (a missing SMTP_PASS takes every send down), and an
 * inbox is not a database you can export from.
 */

// Not RFC 5322 — that regex is famously unusable. This rejects the mistakes
// people actually make (missing @, no dot, stray spaces) and lets the
// confirmation of a real address happen when we invite them.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254; // the practical ceiling from RFC 5321

/** Where the signup came from, for reading which surface actually converts. */
const KNOWN_SOURCES = new Set(["hero", "nav", "footer", "about", "signin", "onboarding", "direct"]);

export async function POST(request: Request) {
    const limited = rateLimitGuard(request, "waitlist");
    if (limited) return limited;

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email = String(body?.email ?? "").trim().toLowerCase();
    const locale = ["en", "no", "sv"].includes(body?.locale) ? body.locale : null;
    const source = KNOWN_SOURCES.has(body?.source) ? body.source : "direct";

    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ error: "invalid-email" }, { status: 400 });
    }

    // The address is the document id, so signing up twice updates one row
    // instead of leaving duplicates for someone to de-dupe by hand later.
    const ref = adminDb.collection("waitlist").doc(email);

    let position: number | null = null;
    let alreadyOnList = false;
    let stored = true;

    try {
        const existing = await ref.get();

        if (existing.exists) {
            alreadyOnList = true;
            position = existing.data()?.position ?? null;
            await ref.update({
                lastSignupAt: FieldValue.serverTimestamp(),
                signupCount: FieldValue.increment(1),
                // Someone re-submitting from a different page still tells us
                // something, so the latest locale and source win.
                locale: locale ?? existing.data()?.locale ?? null,
                source,
            });
        } else {
            // Their number on the list. Counted before the write, so it's the
            // count of people who got here first — approximate under a burst of
            // simultaneous signups, which is a fine trade for a friendly touch.
            const count = await adminDb.collection("waitlist").count().get();
            position = count.data().count + 1;

            await ref.set({
                email,
                locale,
                source,
                position,
                createdAt: FieldValue.serverTimestamp(),
                lastSignupAt: FieldValue.serverTimestamp(),
                signupCount: 1,
                invitedAt: null,
                userAgent: request.headers.get("user-agent") || null,
                referer: request.headers.get("referer") || null,
            });
        }
    } catch (err) {
        // Losing the email as well would mean losing the person entirely, so a
        // storage failure doesn't stop the notification going out.
        stored = false;
        console.error("[waitlist] Failed to store signup:", err);
    }

    try {
        await sendMail({
            to: "support@veinote.com",
            replyTo: email,
            subject: alreadyOnList
                ? `[Waitlist] ${email} signed up again`
                : `[Waitlist] ${email}`,
            text: `${alreadyOnList ? "Someone already on the waitlist submitted again." : "A new person joined the Veinote waitlist."}

Email:    ${email}
Language: ${locale || "unknown"}
From:     ${source}
Position: ${position ?? "unknown"}
${stored ? "" : "\nWARNING: this address could NOT be written to Firestore — it exists only in this email.\n"}
The full list is in the admin console: https://veinote.com/admin/waiting-list

(Reply to this email to reach them directly.)`,
        });
    } catch (err) {
        console.error("[waitlist] Failed to notify support:", err);
        // Only a total loss is an error the visitor needs to see. If the row was
        // written, we have their address and the notification is a convenience.
        if (!stored) {
            return NextResponse.json({ error: "save-failed" }, { status: 500 });
        }
    }

    // `alreadyOnList` is intentionally not returned. Telling an anonymous caller
    // whether an address is on the list turns this into an email lookup oracle,
    // and the person gets the same reassuring message either way.
    return NextResponse.json({ success: true, position });
}
