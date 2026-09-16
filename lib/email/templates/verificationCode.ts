import "server-only";
import { tServer, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, escapeHtml, emailColors } from "@/lib/email/layout";

export interface VerificationCodeEmailParams {
    /** The six digits, as typed into the boxes on the code screen. */
    code: string;
    /** How long the code is good for, in minutes. */
    minutes: number;
}

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * The code that finishes an onboarding signup.
 *
 * Short on purpose. The person reading this is mid-flow on another tab with
 * six empty boxes waiting; every sentence between the subject line and the
 * digits is a sentence they have to scroll past. The code is in the subject
 * too, so a notification preview is enough on a phone.
 */
export function verificationCodeEmail(
    locale: EmailLocale,
    { code, minutes }: VerificationCodeEmailParams,
    /** Admin-authored wording, when an editor has changed this email. */
    overrides?: EmailCopyOverrides,
) {
    const vars = { code, minutes: String(minutes) };
    const t = (key: string) => interpolate(tServer(locale, `email.verify_code.${key}`, overrides), vars);

    const subject = t("subject");
    const greeting = t("greeting");
    const body = t("body");
    const expiry = t("expiry");
    const ignore = t("ignore");
    const team = t("team");

    // Spaced in threes so it reads as a code rather than a number, and set in
    // a monospace face so the digits line up with the boxes they go into.
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;

    const bodyHtml = `
      <p style="margin:0 0 20px; font-size:16px; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body)}</p>
      <p style="margin:0 0 20px; padding:18px 24px; background:${emailColors.BG}; border-radius:16px; text-align:center; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:34px; font-weight:700; letter-spacing:6px; color:${emailColors.INK};">${escapeHtml(spaced)}</p>
      <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(expiry)}</p>
      <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(ignore)}</p>
      <p style="margin:0; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(team)}</p>
    `;

    return {
        subject,
        html: renderLayout({ preheader: `${code}`, bodyHtml }),
        text: `${greeting}\n\n${body}\n\n${spaced}\n\n${expiry}\n${ignore}\n\n${team}`,
    };
}
