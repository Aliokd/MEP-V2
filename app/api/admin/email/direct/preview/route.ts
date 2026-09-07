import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { renderDirectEmail } from "@/lib/email/directMail";

export const dynamic = "force-dynamic";

/**
 * Renders a draft exactly as it will be sent, for the preview pane.
 *
 * Done on the server rather than with a second, lighter renderer in the
 * browser, so the preview cannot drift from the email: it is the same function
 * the send route calls, with a sample name in place of the recipient's.
 */
export const POST = withAdmin("announcements.read", async (request) => {
    const body = await request.json().catch(() => ({}));
    const { html, subject } = renderDirectEmail(
        { subject: String(body.subject || ""), body: String(body.body || "") },
        { name: String(body.sampleName || "Peter Nordberg") },
    );
    return NextResponse.json({ subject, html });
});
