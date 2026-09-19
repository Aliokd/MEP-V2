import "server-only";
import { tServer, tServerList, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, emailButton, escapeHtml, emailColors } from "@/lib/email/layout";

/**
 * The email that carries a golden ticket.
 *
 * Sent once when someone takes their ticket on their page (/golden/{slug}),
 * and again from the console when an admin resends it. It holds the one
 * thing the website never shows, the code, and the link that uses it.
 */
export interface GoldenTicketEmailParams {
    name: string;
    code: string;
    /** The onboarding link with the code already on it. */
    redeemUrl: string;
    /** The person's own page, for the "read it again" line. */
    pageUrl: string;
    invites: number;
}

const GOLD = "#C5A059";
const GOLD_SOFT = "#FBF4E3";

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function goldenTicketEmail(
    locale: EmailLocale,
    { name, code, redeemUrl, pageUrl, invites }: GoldenTicketEmailParams,
    overrides?: EmailCopyOverrides,
) {
    const vars = { name, code, invites: String(invites) };
    const t = (key: string) => interpolate(tServer(locale, `email.golden_ticket.${key}`, overrides), vars);
    const benefits = tServerList(locale, "email.golden_ticket.benefits").map((line) => interpolate(line, vars));

    const subject = t("subject");
    const preheader = t("preheader");
    const greeting = t("greeting");
    const body1 = t("body_1");
    const codeLabel = t("code_label");
    const body2 = t("body_2");
    const cta = t("cta");
    const benefitsTitle = t("benefits_title");
    const pageLine = t("page_line");
    const keep = t("keep");
    const signoff = t("signoff");
    const team = t("team");

    const benefitsHtml = benefits
        .map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`)
        .join("");

    const bodyHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
        <td style="width:44px; height:44px; border-radius:22px; background-color:${GOLD}; text-align:center; vertical-align:middle; color:#FFFFFF; font-size:22px; font-weight:700; line-height:44px;">&#10003;</td>
        <td style="padding-left:14px; font-size:13px; color:${emailColors.MUTED}; letter-spacing:0.02em;">${escapeHtml(t("badge"))}</td>
      </tr></table>
      <p style="margin:0 0 20px; font-size:22px; line-height:1.3; font-weight:600; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body1)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
        <td style="background-color:${GOLD_SOFT}; border:1px solid ${GOLD}; border-radius:16px; padding:20px 24px; text-align:center;">
          <p style="margin:0 0 6px; font-size:12px; color:${emailColors.MUTED};">${escapeHtml(codeLabel)}</p>
          <p style="margin:0; font-size:26px; letter-spacing:0.12em; font-weight:700; color:${emailColors.INK}; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${escapeHtml(code)}</p>
        </td>
      </tr></table>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body2)}</p>
      ${emailButton(cta, redeemUrl)}
      <p style="margin:32px 0 10px; font-size:15px; font-weight:600; color:${emailColors.INK};">${escapeHtml(benefitsTitle)}</p>
      <ul style="margin:0 0 24px; padding-left:20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${benefitsHtml}</ul>
      <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(pageLine)} <a href="${escapeHtml(pageUrl)}" style="color:${emailColors.INK};">${escapeHtml(pageUrl)}</a></p>
      <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(keep)}</p>
      <p style="margin:0; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(signoff)}<br />${escapeHtml(team)}</p>
    `;

    const text = [
        greeting,
        "",
        body1,
        "",
        `${codeLabel}: ${code}`,
        "",
        body2,
        `${cta}: ${redeemUrl}`,
        "",
        benefitsTitle,
        ...benefits.map((line) => `- ${line}`),
        "",
        `${pageLine} ${pageUrl}`,
        keep,
        "",
        signoff,
        team,
    ].join("\n");

    return { subject, html: renderLayout({ preheader, bodyHtml }), text };
}
