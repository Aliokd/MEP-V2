import "server-only";
import { tServer, tServerList, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, emailButton, escapeHtml, emailColors } from "@/lib/email/layout";

/**
 * The email that carries a golden ticket.
 *
 * Sent once when someone takes their ticket on their page (/golden/{slug}),
 * and again from the console when an admin sends it by hand. It holds the
 * one thing the website never shows, the code, and the link that uses it.
 *
 * Two modes, because the ticket reaches people at two different moments.
 * `invite` is the usual one: they have no account, the code is what makes
 * it, and the button opens onboarding with the code already in place.
 * `granted` is for a ticket an admin activated on an account that already
 * exists, where telling them to redeem a code would send them in a circle;
 * the ticket is already theirs, so the button simply opens Veinote.
 *
 * `personalNote` is whatever the admin wrote in the console. It is the point
 * of sending this by hand rather than automatically, so it sits high in the
 * email, above the benefits, in the founders' voice.
 */
export type GoldenEmailMode = "invite" | "granted";

export interface GoldenTicketEmailParams {
    name: string;
    code: string;
    /** The onboarding link with the code already on it. */
    redeemUrl: string;
    /** The person's own page, for the "read it again" line. */
    pageUrl: string;
    invites: number;
    mode?: GoldenEmailMode;
    /** A line the admin wrote for this person. Plain text; never HTML. */
    personalNote?: string | null;
    /** Replaces the template's subject when the admin wrote their own. */
    subject?: string | null;
}

const GOLD = "#C5A059";
const GOLD_SOFT = "#FBF4E3";

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function goldenTicketEmail(
    locale: EmailLocale,
    { name, code, redeemUrl, pageUrl, invites, mode = "invite", personalNote = null, subject: subjectOverride = null }: GoldenTicketEmailParams,
    overrides?: EmailCopyOverrides,
) {
    const vars = { name, code, invites: String(invites) };
    const t = (key: string) => interpolate(tServer(locale, `email.golden_ticket.${key}`, overrides), vars);
    const benefits = tServerList(locale, "email.golden_ticket.benefits").map((line) => interpolate(line, vars));

    const granted = mode === "granted";
    const subject = (subjectOverride ?? "").trim() || t("subject");
    const preheader = t("preheader");
    const greeting = t("greeting");
    const body1 = granted ? t("body_1_granted") : t("body_1");
    const codeLabel = granted ? t("code_label_granted") : t("code_label");
    const body2 = granted ? t("body_2_granted") : t("body_2");
    const cta = granted ? t("cta_granted") : t("cta");
    const ctaUrl = granted ? t("app_url") : redeemUrl;
    const note = (personalNote ?? "").trim();
    const benefitsTitle = t("benefits_title");
    const pageLine = t("page_line");
    const keep = t("keep");
    const signoff = t("signoff");
    const team = t("team");

    const benefitsHtml = benefits
        .map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`)
        .join("");

    // Escaped line by line, so the admin's paragraph breaks survive without
    // any of their text being able to become markup.
    const noteHtml = note
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br />");

    const bodyHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
        <td style="width:44px; height:44px; border-radius:22px; background-color:${GOLD}; text-align:center; vertical-align:middle; color:#FFFFFF; font-size:22px; font-weight:700; line-height:44px;">&#10003;</td>
        <td style="padding-left:14px; font-size:13px; color:${emailColors.MUTED}; letter-spacing:0.02em;">${escapeHtml(t("badge"))}</td>
      </tr></table>
      <p style="margin:0 0 20px; font-size:22px; line-height:1.3; font-weight:600; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body1)}</p>
      ${note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
        <td style="border-left:3px solid ${GOLD}; padding:2px 0 2px 16px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${noteHtml}</td>
      </tr></table>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
        <td style="background-color:${GOLD_SOFT}; border:1px solid ${GOLD}; border-radius:16px; padding:20px 24px; text-align:center;">
          <p style="margin:0 0 6px; font-size:12px; color:${emailColors.MUTED};">${escapeHtml(codeLabel)}</p>
          <p style="margin:0; font-size:26px; letter-spacing:0.12em; font-weight:700; color:${emailColors.INK}; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${escapeHtml(code)}</p>
        </td>
      </tr></table>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body2)}</p>
      ${emailButton(cta, ctaUrl)}
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
        ...(note ? ["", note] : []),
        "",
        `${codeLabel}: ${code}`,
        "",
        body2,
        `${cta}: ${ctaUrl}`,
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
