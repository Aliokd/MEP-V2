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

export async function sendMail({ to, subject, html, text, replyTo, fromName }: SendMailOptions): Promise<void> {
    if (!process.env.SMTP_PASS) {
        throw new Error("SMTP_PASS is not configured — cannot send email.");
    }

    await getTransporter().sendMail({
        from: `"${fromName || FROM_NAME}" <${FROM_ADDRESS}>`,
        replyTo,
        to,
        subject,
        html,
        text,
    });
}
