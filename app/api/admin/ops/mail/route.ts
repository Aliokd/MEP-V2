import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { mailConfigStatus, sendMail, verifyMailer } from "@/lib/email/send";
import { auditContext, writeAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/**
 * Mail diagnostics for the Ops page.
 *
 * A failed notification only ever said "FAILED to send", which is true but
 * useless — the fix is different depending on whether the password is missing,
 * the login is rejected, or the host is unreachable. GET separates those three
 * without sending anything; POST proves the whole path by sending a real message
 * to the admin running the check.
 */
export const GET = withAdmin("ops.read", async () => {
    const config = mailConfigStatus();
    const verified = await verifyMailer();

    return NextResponse.json({
        config: {
            host: config.host,
            port: config.port,
            user: config.user,
            passwordSet: config.passwordSet,
        },
        verified: verified.ok,
        error: verified.error || null,
    });
});

/** Sends a real message to the admin's own address. */
export const POST = withAdmin("ops.write", async (request, admin) => {
    if (!admin.email) {
        return NextResponse.json({ error: "Your admin record has no email address" }, { status: 400 });
    }

    try {
        await sendMail({
            to: admin.email,
            subject: "Veinote mail test",
            text: `This is a test from the Veinote admin console.

If you're reading it, outbound email works: the SMTP login succeeded and the message was accepted for delivery.

Sent by ${admin.name} at ${new Date().toUTCString()}.`,
        });
    } catch (err: any) {
        // sendMail already turned this into a described error.
        return NextResponse.json({ error: err.message }, { status: 502 });
    }

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "ops.mail.test",
        targetType: "system",
        targetId: "mail",
        targetLabel: `test email to ${admin.email}`,
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, sentTo: admin.email });
});
