import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendMail } from "@/lib/email/send";
import { rateLimitGuard } from "@/lib/rateLimit";
import { FOUNDER_SPOTS_TAKEN, FOUNDER_SPOTS_TOTAL } from "@/lib/uiFlags";

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
const KNOWN_SOURCES = new Set([
    "hero", "nav", "footer", "urgency", "about", "signin",
    "onboarding", "invite", "direct",
    // Paid + social. One value per surface so the admin list reads cleanly:
    // yt-vsl is the YouTube VSL campaign; x-ads is paid X; x-organic is
    // Peter's own posts and replies there.
    "yt-vsl", "x-ads", "x-organic",
]);

/**
 * The campaign flow (`/onboarding?flow=waitlist`) sends the quiz answers along
 * with the address, so the list can be read by segment before launch — which
 * struggles and goals the ad traffic actually has.
 *
 * Public write path, so nothing is trusted: only the quiz's own question ids
 * survive, values are strings (or short lists of them) capped in length — long
 * enough for a goal someone typed themselves, too short to be a payload.
 */
const KNOWN_QUESTIONS = new Set([
    "songwriter_type",
    "creation_method",
    "struggle",
    "dream_outcome",
    "emotional_inspiration",
]);
const MAX_ANSWER_LENGTH = 120;
const MAX_ANSWER_ITEMS = 12;

function sanitizeAnswers(raw: unknown): Record<string, string | string[]> | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

    const out: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!KNOWN_QUESTIONS.has(key)) continue;
        if (typeof value === "string" && value.length > 0 && value.length <= MAX_ANSWER_LENGTH) {
            out[key] = value;
        } else if (Array.isArray(value)) {
            const items = value
                .filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_ANSWER_LENGTH)
                .slice(0, MAX_ANSWER_ITEMS);
            if (items.length) out[key] = items;
        }
    }
    return Object.keys(out).length ? out : null;
}

/** Firestore document ids: no slashes, and nothing long enough to be a payload. */
const INVITE_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * Resolves the collaboration invitation a visitor arrived with into something a
 * human reading the list can act on.
 *
 * The invite email tells the recipient we'll let them in "with the invite
 * attached", and this is what makes that true rather than a turn of phrase: the
 * row records who wanted them and for which song. Read server-side from the
 * invitation itself, never trusted from the query string, and best-effort —
 * nobody loses their place on the list because a lookup failed.
 */
async function resolveInvite(inviteId: unknown): Promise<{
    inviteId: string;
    inviterName: string | null;
    projectId: string | null;
    projectTitle: string | null;
} | null> {
    if (typeof inviteId !== "string" || !INVITE_ID_PATTERN.test(inviteId)) return null;

    try {
        const snap = await adminDb.doc(`invitations/${inviteId}`).get();
        if (!snap.exists) return null;
        const data = snap.data() ?? {};
        return {
            inviteId,
            inviterName: data.senderName ?? null,
            projectId: data.projectId ?? null,
            projectTitle: data.projectTitle ?? null,
        };
    } catch (err) {
        console.error("[waitlist] Could not resolve invitation:", err);
        return null;
    }
}

/**
 * The founders counter, live. The number both surfaces show is
 * FOUNDER_SPOTS_TAKEN — the marketing anchor the campaign opened at — plus
 * every real signup since the moment the counter went live, so a join
 * genuinely takes a seat. Rows from before the anchor (the team, smoke tests,
 * the pre-campaign trickle) are considered part of the anchor, not additions
 * to it.
 *
 * Clamped one short of full: a counter at 100/100 over a form that still
 * accepts signups is a contradiction on screen. If the list genuinely fills,
 * closing the offer is a decision for a person, not this endpoint.
 */
const SPOTS_COUNTER_LIVE_SINCE = new Date("2026-08-22T07:55:00Z");

export async function GET() {
    let taken = FOUNDER_SPOTS_TAKEN;
    try {
        const since = await adminDb
            .collection("waitlist")
            .where("createdAt", ">", SPOTS_COUNTER_LIVE_SINCE)
            .count()
            .get();
        taken = Math.min(FOUNDER_SPOTS_TOTAL - 1, FOUNDER_SPOTS_TAKEN + since.data().count);
    } catch (err) {
        // The static anchor is a fine answer; a broken counter endpoint is not.
        console.error("[waitlist] Could not count live signups:", err);
    }
    return NextResponse.json(
        { taken, total: FOUNDER_SPOTS_TOTAL },
        // One minute of CDN grace: every landing view calls this, and the
        // counter moving within a minute is indistinguishable from moving now.
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
}

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

    const invite = await resolveInvite(body?.invite);
    const answers = sanitizeAnswers(body?.answers);

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
                // Only overwritten when they actually arrived with one, so a later
                // plain visit doesn't erase the invite that first brought them.
                ...(invite ? { invite } : {}),
                // Same rule: a re-signup without the quiz doesn't erase the
                // answers a first pass through it recorded.
                ...(answers ? { answers } : {}),
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
                invite,
                answers,
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
                : invite
                    ? `[Waitlist] ${email}: invited to collaborate`
                    : `[Waitlist] ${email}`,
            text: `${alreadyOnList ? "Someone already on the waitlist submitted again." : "A new person joined the Veinote waitlist."}

Email:    ${email}
Language: ${locale || "unknown"}
From:     ${source}
Position: ${position ?? "unknown"}
${answers ? `Quiz:     ${JSON.stringify(answers)}\n` : ""}${invite ? `\nSomeone is waiting to write with them:\nInvited by: ${invite.inviterName || "unknown"}\nProject:    ${invite.projectTitle || "untitled"} (${invite.projectId || "unknown id"})\nThey can't accept it until they have an account.\n` : ""}${stored ? "" : "\nWARNING: this address could NOT be written to Firestore. It exists only in this email.\n"}
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
