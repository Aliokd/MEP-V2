import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { sendMail } from "@/lib/email/send";
import { collabInviteEmail } from "@/lib/email/templates/collabInvite";
import { resolveLocale } from "@/lib/email/locale";
import { SIGNUPS_OPEN, inviteLandingPath } from "@/lib/uiFlags";
import { localizePath } from "@/lib/i18n";
import { TRIAL_DAYS } from "@/lib/paddle/config";

// Re-sends of the same invitation are ignored inside this window. Without it,
// "Invite" is a button that mails a stranger on every click — the invitee can be
// buried by a single impatient sender, and the sending domain pays for it.
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Mails a collaboration invitation to someone who has no Veinote account yet.
 *
 * The recipient address is never taken from the request. The client writes the
 * invitation document first, then names it here; this route reads that document
 * and mails whoever it says, but only if the caller's verified uid is the sender
 * on it. That is what keeps the route from being an open relay for sending
 * Veinote-branded mail to arbitrary addresses.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    try {
        const { inviteId, locale } = await request.json();

        if (!inviteId || typeof inviteId !== "string") {
            return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });
        }

        const inviteRef = adminDb.doc(`invitations/${inviteId}`);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists) {
            return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
        }

        const invite = inviteSnap.data() as {
            senderId?: string;
            senderName?: string;
            inviteeEmail?: string;
            inviteeId?: string;
            projectTitle?: string;
            status?: string;
            inviteEmailSentAt?: string;
        };

        if (invite.senderId !== auth.uid) {
            return NextResponse.json({ error: "Not your invitation" }, { status: 403 });
        }
        if (!invite.inviteeEmail) {
            return NextResponse.json({ success: true, skipped: "no invitee email" });
        }
        // An invitation that already resolved to an account gets the in-app notice
        // instead; this email is only for people who have nowhere to see it.
        if (invite.inviteeId) {
            return NextResponse.json({ success: true, skipped: "invitee already has an account" });
        }
        if (invite.status && invite.status !== "pending") {
            return NextResponse.json({ success: true, skipped: `status is ${invite.status}` });
        }

        const lastSent = Date.parse(invite.inviteEmailSentAt || "");
        if (!isNaN(lastSent) && Date.now() - lastSent < RESEND_COOLDOWN_MS) {
            return NextResponse.json({ success: true, skipped: "sent recently" });
        }

        // The sender's name comes off their own user document rather than out of the
        // invitation, which the client wrote — this name is the most persuasive line
        // in the email and appears in the subject, so it should not be spoofable.
        const senderSnap = await adminDb.doc(`users/${auth.uid}`).get();
        const senderData = senderSnap.data() as { name?: string; displayName?: string } | undefined;
        const inviter = (senderData?.name || senderData?.displayName || invite.senderName || "A songwriter").trim();

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
        const emailLocale = resolveLocale(locale);
        // The landing page is language-prefixed the same way every other link into it
        // is, so an invite written in Norwegian doesn't drop the reader onto English.
        const landing = inviteLandingPath(inviteId);
        const [path, search] = landing.split("?");
        const { subject, html, text } = collabInviteEmail(emailLocale, {
            inviter,
            project: invite.projectTitle || "a new song",
            joinUrl: `${appUrl}${localizePath(path, emailLocale)}?${search}`,
            trialDays: TRIAL_DAYS,
            waitlistMode: !SIGNUPS_OPEN,
        });

        await sendMail({ to: invite.inviteeEmail, subject, html, text });
        await inviteRef.set({ inviteEmailSentAt: new Date().toISOString() }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error sending collaboration invite email:", error);
        return NextResponse.json(
            { error: error.message || "Failed to send invitation email" },
            { status: 500 },
        );
    }
}
