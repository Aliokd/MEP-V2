import "server-only";
import nodemailer from "nodemailer";

const FROM_NAME = "Veinote";
const FROM_ADDRESS = "support@veinote.com"; // must be support@veinote.com for One.com sending authorization

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "send.one.com",
            port: parseInt(process.env.SMTP_PORT || "465"),
            secure: true, // true for port 465
            auth: {
                user: process.env.SMTP_USER || "support@veinote.com",
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
}

export interface SendMailOptions {
    to: string;
    subject: string;
    html?: string;
    text: string;
    replyTo?: string;
    fromName?: string;
}

/**
 * Turns a nodemailer failure into something a human can act on.
 *
 * Its errors carry the useful part in `code` and `responseCode` rather than the
 * message, so the raw message alone ("Invalid login") rarely says what to change.
 */
export function describeMailError(err: any): string {
    const code = err?.code;
    const responseCode = err?.responseCode;
    const response = typeof err?.response === "string" ? err.response.trim() : "";

    if (code === "EAUTH" || responseCode === 535) {
        return `SMTP rejected the login for ${process.env.SMTP_USER || "support@veinote.com"}. The password is wrong, expired, or the mailbox requires an app-specific password.${response ? ` Server said: ${response}` : ""}`;
    }
    if (code === "ECONNECTION" || code === "ESOCKET") {
        return `Could not open a connection to ${process.env.SMTP_HOST || "send.one.com"}:${process.env.SMTP_PORT || "465"}. The host or port may be wrong, or outbound SMTP is blocked.`;
    }
    if (code === "ETIMEDOUT" || code === "ECONNRESET") {
        return `The connection to ${process.env.SMTP_HOST || "send.one.com"} timed out. The mail host may be unreachable from the server.`;
    }
    if (responseCode === 550 || responseCode === 553) {
        return `The mail server refused the recipient or the From address.${response ? ` Server said: ${response}` : ""}`;
    }
    if (code === "EENVELOPE") {
        return `The From or To address was rejected as invalid.${response ? ` Server said: ${response}` : ""}`;
    }
    return err?.message || "Unknown mail error";
}

/** True when every setting the transport needs is present. */
export function mailConfigStatus(): {
    ok: boolean;
    host: string;
    port: string;
    user: string;
    passwordSet: boolean;
} {
    return {
        ok: Boolean(process.env.SMTP_PASS),
        host: process.env.SMTP_HOST || "send.one.com",
        port: process.env.SMTP_PORT || "465",
        user: process.env.SMTP_USER || "support@veinote.com",
        passwordSet: Boolean(process.env.SMTP_PASS),
    };
}

/**
 * Opens a connection and authenticates without sending anything. This is the
 * check that separates "the password is wrong" from "the host is unreachable"
 * from "the message itself was rejected".
 */
export async function verifyMailer(): Promise<{ ok: boolean; error?: string }> {
    if (!process.env.SMTP_PASS) {
        return { ok: false, error: "SMTP_PASS is not set on the server, so no mail can be sent at all." };
    }
    try {
        await getTransporter().verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: describeMailError(err) };
    }
}

export async function sendMail({ to, subject, html, text, replyTo, fromName }: SendMailOptions): Promise<void> {
    if (!process.env.SMTP_PASS) {
        throw new Error("SMTP_PASS is not configured — cannot send email.");
    }

    try {
        await getTransporter().sendMail({
            from: `"${fromName || FROM_NAME}" <${FROM_ADDRESS}>`,
            replyTo,
            to,
            subject,
            html,
            text,
        });
    } catch (err) {
        // Rethrow with the diagnosis attached — callers log this, and a bare
        // "Invalid login" in a log nobody reads is how this went unnoticed.
        const described = describeMailError(err);
        console.error("[mail] Send failed:", described, err);
        throw new Error(described);
    }
}
