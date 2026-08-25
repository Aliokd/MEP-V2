import { NextResponse } from "next/server";
import { getCopyOverrides } from "@/lib/siteCopy";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { sendMail } from "@/lib/email/send";
import { collabInviteEmail } from "@/lib/email/templates/collabInvite";
import { resolveLocale } from "@/lib/email/locale";
import { SIGNUPS_OPEN, inviteLandingPath, COLLAB_EMAIL_INVITES_ENABLED } from "@/lib/uiFlags";
import { localizePath } from "@/lib/i18n";
import { TRIAL_DAYS } from "@/lib/paddle/config";
import { MAX_COLLABORATORS, MAX_PROJECT_MEMBERS } from "@/lib/collabLimits";

export const dynamic = "force-dynamic";

// Same shape the waitlist route uses: rejects the mistakes people actually
// make, leaves real verification to the invite being claimed.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

// Re-sends of the same invitation are ignored inside this window, mirroring
// the standalone email route — "Invite" must not mail a stranger per click.
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Invites a collaborator by email — the whole flow in one server call.
 *
 * This endpoint replaced the client-side pair of "look the address up, then
 * branch". The lookup response (`found: true/false`) was visible to the
 * sender's browser, and the two branches produced different messages — so any
 * signed-in user could test whether an arbitrary address had a Veinote
 * account. The privacy policy now promises they cannot.
 *
 * The uniformity rules, and why each response is safe to give:
 *
 *  - Registered and unregistered addresses get the byte-identical response:
 *    the invitation is recorded either way (against the uid, or against the
 *    email so it can be claimed at signup), and the sender always receives the
 *    same message plus a shareable landing link.
 *  - An address that is already a member of THIS project also gets that same
 *    response, as a silent no-op — anything distinct would confirm the address
 *    belongs to a face the sender can already see in the member list.
 *  - "You can't invite yourself" only reflects the sender's own address back
 *    at them, and the member cap is a property of the project, not of the
 *    address — both may error honestly.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const limited = rateLimitGuard(request, "collab-invite", auth.uid);
    if (limited) return limited;

    let projectId: unknown;
    let email: unknown;
    let locale: unknown;
    try {
        ({ projectId, email, locale } = await request.json());
    } catch {
        return NextResponse.json({ error: "Malformed request" }, { status: 400 });
    }

    if (typeof projectId !== "string" || !projectId.trim()) {
        return NextResponse.json({ error: "Missing project" }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim()) || email.length > MAX_EMAIL_LENGTH) {
        return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
    }
    const cleanedEmail = email.toLowerCase().trim();

    try {
        const projectSnap = await adminDb.collection("projects").doc(projectId).get();
        if (!projectSnap.exists) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }
        const project = projectSnap.data() || {};
        const collaborators: string[] = Array.isArray(project.collaborators) ? project.collaborators : [];

        // Only people in the project may grow it.
        if (project.ownerId !== auth.uid && !collaborators.includes(auth.uid)) {
            return NextResponse.json({ error: "Only project members can invite collaborators." }, { status: 403 });
        }

        // The cap is about the project, not the address — checked before the
        // lookup so the error genuinely cannot depend on registration status.
        if (collaborators.length >= MAX_COLLABORATORS) {
            return NextResponse.json({
                error: `This project already has the maximum of ${MAX_PROJECT_MEMBERS} members.`,
            }, { status: 400 });
        }

        const projectTitle = project.title || "Untitled Song";

        // The sender's display name comes off their own user document, not the
        // request — it is the most persuasive line in the invitation.
        const senderSnap = await adminDb.collection("users").doc(auth.uid).get();
        const sender = senderSnap.data() as { name?: string; email?: string } | undefined;
        const senderName = (sender?.name || "A collaborator").trim();

        if ((sender?.email || "").toLowerCase() === cleanedEmail) {
            return NextResponse.json({ error: "You cannot invite yourself as a collaborator." }, { status: 400 });
        }

        // Server-side only. Neither this result nor anything derived from it
        // may reach the response — see the uniformity rules above.
        const matchSnap = await adminDb
            .collection("users")
            .where("email", "==", cleanedEmail)
            .limit(1)
            .get();
        const inviteeId = matchSnap.empty ? "" : matchSnap.docs[0].id;

        const alreadyMember =
            inviteeId !== "" && (project.ownerId === inviteeId || collaborators.includes(inviteeId));

        // Deterministic id, same scheme the client always used: re-inviting the
        // same person overwrites one document instead of stacking duplicates.
        const inviteId = inviteeId
            ? `${projectId}_${inviteeId}`
            : `${projectId}_pending_${cleanedEmail.replace(/[@.]/g, "_")}`;

        if (!alreadyMember) {
            await adminDb.collection("invitations").doc(inviteId).set({
                id: inviteId,
                projectId,
                projectTitle,
                senderId: auth.uid,
                senderName,
                inviteeId,
                inviteeEmail: cleanedEmail,
                status: "pending",
                createdAt: new Date().toISOString(),
            }, { merge: true });

            // Someone with an account sees the invite in their workspace; the
            // email is only for people who have nowhere else to see it.
            if (!inviteeId && COLLAB_EMAIL_INVITES_ENABLED) {
                await mailInvitation(inviteId, cleanedEmail, senderName, projectTitle, locale);
            }
        }

        // One response for every successful path. The link works for anyone:
        // an existing account claims the invite on sign-in, a newcomer lands on
        // signup with the invitation attached.
        return NextResponse.json({
            success: true,
            message: `Invitation sent to ${cleanedEmail}.`,
            invitePath: inviteLandingPath(inviteId),
        });
    } catch (error: any) {
        console.error("Error inviting collaborator:", error);
        return NextResponse.json({ error: "Failed to invite collaborator." }, { status: 500 });
    }
}

/**
 * Best-effort invitation mail for an address with no account. A failure costs
 * the notification, never the invite — the document is already written, so the
 * project appears for them the moment they sign up with this address.
 */
async function mailInvitation(
    inviteId: string,
    inviteeEmail: string,
    inviter: string,
    projectTitle: string,
    locale: unknown,
): Promise<void> {
    try {
        const inviteRef = adminDb.collection("invitations").doc(inviteId);
        const existing = (await inviteRef.get()).data() as { inviteEmailSentAt?: string } | undefined;
        const lastSent = Date.parse(existing?.inviteEmailSentAt || "");
        if (!isNaN(lastSent) && Date.now() - lastSent < RESEND_COOLDOWN_MS) return;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
        const emailLocale = resolveLocale(typeof locale === "string" ? locale : null);
        const landing = inviteLandingPath(inviteId);
        const [path, search] = landing.split("?");
        const { subject, html, text } = collabInviteEmail(
            emailLocale,
            {
                inviter,
                project: projectTitle,
                joinUrl: `${appUrl}${localizePath(path, emailLocale)}?${search}`,
                trialDays: TRIAL_DAYS,
                waitlistMode: !SIGNUPS_OPEN,
            },
            await getCopyOverrides(),
        );

        await sendMail({ to: inviteeEmail, subject, html, text });
        await inviteRef.set({ inviteEmailSentAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
        console.warn("Invitation email not sent:", err);
    }
}
