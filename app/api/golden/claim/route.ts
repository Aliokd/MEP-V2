import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { rateLimitGuard } from "@/lib/rateLimit";
import { sendMail, isMailDryRun } from "@/lib/email/send";
import { goldenTicketEmail } from "@/lib/email/templates/goldenTicket";
import { resolveLocale } from "@/lib/email/locale";
import { getCopyOverrides } from "@/lib/siteCopy";
import { COLLECTION, getTicket, SLUG_PATTERN } from "@/lib/goldenTickets";
import { goldenLandingPath } from "@/lib/uiFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 600;

/** "jo***@example.com": enough to recognise one's own inbox, not enough to copy. */
function maskEmail(address: string): string {
    const [local, domain] = address.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * "Take my ticket", server side.
 *
 * The page names a person; anyone can open it. What makes the claim theirs is
 * not the page but the address they give: the code goes to that inbox and
 * nowhere else, and the console shows the founders who claimed which ticket
 * before anyone is written to. A ticket can be taken once. A second press,
 * from the same person or anyone else, is answered with `taken` and nothing
 * is sent; the console can reset a claim that turns out to be wrong.
 *
 * Unauthenticated by necessity (the person has no account yet), so it is
 * rate-limited by IP, and the transaction is what stops two presses in the
 * same second from both winning.
 */
export async function POST(request: Request) {
    const throttled = rateLimitGuard(request, "golden-claim");
    if (throttled) return throttled;

    let body: Record<string, unknown>;
    try {
        const parsed: unknown = await request.json();
        body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return NextResponse.json({ error: "invalid-body" }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    // The name they typed on the activation card. Kept beside the claim so
    // the console can greet them as they wrote it; the ticket's own name is
    // the founders' spelling and is not touched.
    const typedName = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const locale = resolveLocale(body.locale);

    if (!SLUG_PATTERN.test(slug)) return NextResponse.json({ error: "not-found" }, { status: 404 });
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return NextResponse.json({ error: "invalid-email" }, { status: 400 });
    }

    const dryRun = isMailDryRun();
    const canMail = Boolean(process.env.SMTP_PASS) && !dryRun;
    if (!canMail && process.env.NODE_ENV === "production") {
        console.error("[golden/claim] SMTP_PASS is not set; refusing a claim whose code could not be delivered.");
        return NextResponse.json({ error: "mail-unavailable" }, { status: 503 });
    }

    const ref = adminDb.collection(COLLECTION).doc(slug);
    const claimedAt = new Date().toISOString();

    // The founders usually know the address of the person a ticket names.
    // When they do, the code goes there and only there, whatever the page
    // was given: the wall is public, and a ticket must not be collectable by
    // whoever reaches its page first. Only a ticket without an address on
    // file trusts the one typed, and the console shows who claimed it.
    const onFile = (await getTicket(slug))?.email?.trim().toLowerCase() || null;
    const recipient = onFile ?? email;
    if (onFile && onFile !== email) {
        console.warn(`[golden/claim] ${slug}: typed address differs from the one on file; sending to the one on file`);
    }

    // The claim is taken inside a transaction so the status check and the
    // write are one step; a ticket that is not open when the write lands is
    // not written.
    let outcome: "claimed" | "taken" | "not-found" | "revoked";
    try {
        outcome = await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return "not-found" as const;
            const status = snap.data()?.status;
            if (status === "revoked") return "revoked" as const;
            if (status !== "open") return "taken" as const;
            tx.update(ref, {
                status: "claimed",
                claim: { email: recipient, message: message || null, name: typedName || null, locale, claimedAt, typedEmail: email },
                updatedAt: claimedAt,
            });
            return "claimed" as const;
        });
    } catch (error) {
        console.error("[golden/claim] transaction failed:", error);
        return NextResponse.json({ error: "claim-failed" }, { status: 500 });
    }

    if (outcome === "not-found") return NextResponse.json({ error: "not-found" }, { status: 404 });
    if (outcome === "revoked") return NextResponse.json({ error: "revoked" }, { status: 410 });
    if (outcome === "taken") return NextResponse.json({ error: "taken" }, { status: 409 });

    const ticket = await getTicket(slug);
    if (!ticket) return NextResponse.json({ error: "not-found" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
    const { subject, html, text } = goldenTicketEmail(
        locale,
        {
            name: ticket.name,
            code: ticket.code,
            redeemUrl: `${appUrl}${goldenLandingPath(ticket.code)}`,
            pageUrl: `${appUrl}/golden/${ticket.slug}`,
            invites: ticket.invites,
        },
        await getCopyOverrides(),
    );

    if (canMail || dryRun) {
        try {
            await sendMail({ to: recipient, subject, html, text });
        } catch (error) {
            // The claim stands: the console shows it, and the ticket can be
            // resent from there. Losing the claim because the relay hiccuped
            // would be the worse outcome.
            console.error("[golden/claim] ticket email failed:", error);
            return NextResponse.json({ error: "mail-failed", claimed: true }, { status: 502 });
        }
    } else {
        console.info(`[golden/claim] (dev, no SMTP) golden code for ${recipient}: ${ticket.code}`);
    }

    return NextResponse.json({
        success: true,
        // The address the code went to, masked when it was not the one typed:
        // the page says where to look without handing out the address.
        email: onFile && onFile !== email ? maskEmail(onFile) : email,
        // Only ever in a dry run, which only exists outside production: the
        // code that would have been mailed, so the flow can be walked with no
        // inbox. The page shows it.
        ...(dryRun ? { devCode: ticket.code } : {}),
    });
}
