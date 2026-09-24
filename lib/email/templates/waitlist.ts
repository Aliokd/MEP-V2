import "server-only";
import { tServer, tServerList, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, emailButton, escapeHtml, emailColors } from "@/lib/email/layout";

/**
 * The email to the waiting list: the Golden program, told the way its pages
 * tell it.
 *
 * The words are the free-ticket page's (/golden/ticket/{number}), the one
 * written for someone who does not hold a ticket yet, which is exactly who is
 * on the list. Same order as that page: the mission line, the four things the
 * product proves, what a ticket holds, then the ask. The film and the globe
 * stay on the page; an email cannot play one and would only draw a picture of
 * the other, so the button takes the reader to both.
 *
 * The copy is a copy, not a reference. The Golden pages read
 * app/golden/content.ts, which is code; this reads `email.waitlist.*`, which
 * the console can edit. Changing one does not change the other.
 *
 * No name: a waiting-list entry is an address and a language, nothing more,
 * so there is no one to greet by name and it does not pretend otherwise.
 */
export interface WaitlistEmailParams {
    /** The Golden program wall, where the open tickets are. */
    goldenUrl: string;
    /** Tickets in the program, from uiFlags, so the email cannot drift from the wall. */
    total: number;
    /** Invites each ticket carries, likewise. */
    invites: number;
}

const GOLD = "#C5A059";

const SHOWCASE = ["collab", "tools", "publish", "science"] as const;

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function waitlistEmail(
    locale: EmailLocale,
    { goldenUrl, total, invites }: WaitlistEmailParams,
    overrides?: EmailCopyOverrides,
) {
    const vars = { total: String(total), invites: String(invites) };
    const t = (key: string) => interpolate(tServer(locale, `email.waitlist.${key}`, overrides), vars);
    const benefits = tServerList(locale, "email.waitlist.benefits").map((line) => interpolate(line, vars));

    const subject = t("subject");
    const preheader = t("preheader");
    const badge = t("badge");
    const heading = t("heading");
    const eyebrow = t("eyebrow");
    const intro = t("intro");
    const cta = t("cta");
    const benefitsTitle = t("benefits_title");
    const benefitsMore = t("benefits_more");
    const askTitle = t("ask_title");
    const askBody = t("ask_body");
    const signoff = t("signoff");
    const team = t("team");
    const reason = t("reason");

    const showcase = SHOWCASE.map((id) => ({ title: t(`${id}_title`), body: t(`${id}_body`) }));

    const showcaseHtml = showcase
        .map(
            ({ title, body }) => `
      <p style="margin:0 0 6px; font-size:16px; line-height:1.4; font-weight:600; color:${emailColors.INK};">${escapeHtml(title)}</p>
      <p style="margin:0 0 22px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body)}</p>`,
        )
        .join("");

    // The page ends its benefits on a sixth, quieter card; here it is the last
    // line of the list, set apart the same way.
    const benefitsHtml = [
        ...benefits.map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`),
        `<li style="margin:0 0 8px; color:${emailColors.MUTED};">${escapeHtml(benefitsMore)}</li>`,
    ].join("");

    const bodyHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
        <td style="width:44px; height:44px; border-radius:22px; background-color:${GOLD}; text-align:center; vertical-align:middle; color:#FFFFFF; font-size:22px; font-weight:700; line-height:44px;">&#10003;</td>
        <td style="padding-left:14px; font-size:13px; color:${emailColors.MUTED}; letter-spacing:0.02em;">${escapeHtml(badge)}</td>
      </tr></table>
      <p style="margin:0 0 8px; font-size:26px; line-height:1.25; font-weight:600; color:${emailColors.INK};">${escapeHtml(heading)}</p>
      <p style="margin:0 0 20px; font-size:13px; line-height:1.5; color:${GOLD};">${escapeHtml(eyebrow)}</p>
      <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(intro)}</p>
      ${emailButton(cta, goldenUrl)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0 28px;"><tr>
        <td style="border-top:1px solid ${emailColors.BORDER}; font-size:0; line-height:0;">&nbsp;</td>
      </tr></table>
      ${showcaseHtml}
      <p style="margin:12px 0 10px; font-size:16px; font-weight:600; color:${emailColors.INK};">${escapeHtml(benefitsTitle)}</p>
      <ul style="margin:0 0 28px; padding-left:20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${benefitsHtml}</ul>
      <p style="margin:0 0 6px; font-size:16px; font-weight:600; color:${emailColors.INK};">${escapeHtml(askTitle)}</p>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(askBody)}</p>
      ${emailButton(cta, goldenUrl)}
      <p style="margin:32px 0 0; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(signoff)}<br />${escapeHtml(team)}</p>
    `;

    const text = [
        badge,
        "",
        heading,
        eyebrow,
        "",
        intro,
        "",
        `${cta}: ${goldenUrl}`,
        "",
        ...showcase.flatMap(({ title, body }) => [title, body, ""]),
        benefitsTitle,
        ...benefits.map((line) => `- ${line}`),
        `- ${benefitsMore}`,
        "",
        askTitle,
        askBody,
        `${cta}: ${goldenUrl}`,
        "",
        signoff,
        team,
    ].join("\n");

    return { subject, html: renderLayout({ preheader, bodyHtml, footerNote: reason }), text };
}
