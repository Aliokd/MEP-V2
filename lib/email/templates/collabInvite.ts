import "server-only";
import { tServer, tServerList, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, emailButton, escapeHtml, emailColors } from "@/lib/email/layout";

export interface CollabInviteEmailParams {
    /** Display name of the person who sent the invite. */
    inviter: string;
    /** Title of the project they're being invited into. */
    project: string;
    /** Where the CTA points — onboarding once signups reopen, the waiting list before then. */
    joinUrl: string;
    /** Free-trial length, so the email can't drift away from what checkout actually gives. */
    trialDays: number;
    /** True while public signups are closed, which changes what the CTA can honestly promise. */
    waitlistMode: boolean;
}

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * The email a person who has no Veinote account receives when someone invites
 * them into a project.
 *
 * Two jobs, in this order: tell them a specific human wants them in a specific
 * song, then show them what joining opens up. The feature list is the whole
 * reason this email is longer than the notification it replaces — the recipient
 * has never heard of the product, so "X invited you" alone asks them to sign up
 * for nothing they can picture.
 */
export function collabInviteEmail(
    locale: EmailLocale,
    { inviter, project, joinUrl, trialDays, waitlistMode }: CollabInviteEmailParams,
    /** Admin-authored wording, when an editor has changed this email. */
    overrides?: EmailCopyOverrides,
) {
    const vars = { inviter, project, days: String(trialDays) };
    const t = (key: string) => interpolate(tServer(locale, `email.collab_invite.${key}`, overrides), vars);

    const subject = t("subject");
    const preheader = t("preheader");
    const greeting = t("greeting");
    const body1 = t("body_1");
    const body2 = t("body_2");
    const featuresTitle = t("features_title");
    const features = tServerList(locale, "email.collab_invite.features");
    const cta = t("cta");
    const waitlistNote = t("waitlist_note");
    const ignore = t("ignore");
    const signoff = t("signoff");
    const team = t("team");

    // A bulleted list rendered as table rows rather than <ul>: Outlook adds its own
    // margins to list markup, and the check glyph keeps the rows readable in the
    // plain-text clients that strip the colour.
    const featuresHtml = features
        .map(
            (feature) => `
      <tr>
        <td valign="top" style="padding:0 10px 10px 0; font-size:15px; line-height:1.5; color:${emailColors.ACCENT};">&#10003;</td>
        <td valign="top" style="padding:0 0 10px; font-size:15px; line-height:1.5; color:${emailColors.INK};">${escapeHtml(feature)}</td>
      </tr>`,
        )
        .join("");

    const bodyHtml = `
      <p style="margin:0 0 20px; font-size:16px; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body1)}</p>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body2)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
        <tr><td colspan="2" style="padding:0 0 12px; font-size:13px; font-weight:600; color:${emailColors.MUTED};">${escapeHtml(featuresTitle)}</td></tr>
        ${featuresHtml}
      </table>
      ${emailButton(cta, joinUrl)}
      ${waitlistMode ? `<p style="margin:20px 0 0; font-size:13px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(waitlistNote)}</p>` : ""}
      <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(ignore)}</p>
      <p style="margin:28px 0 0; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(signoff)}<br />${escapeHtml(team)}</p>
    `;

    const text = [
        greeting,
        "",
        body1,
        "",
        body2,
        "",
        featuresTitle,
        ...features.map((feature) => `- ${feature}`),
        "",
        `${cta}: ${joinUrl}`,
        ...(waitlistMode ? ["", waitlistNote] : []),
        "",
        ignore,
        "",
        signoff,
        team,
    ].join("\n");

    return { subject, html: renderLayout({ preheader, bodyHtml }), text };
}
