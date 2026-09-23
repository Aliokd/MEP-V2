import "server-only";
import { tServer, tServerList, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, escapeHtml, emailButton, emailColors } from "@/lib/email/layout";

export interface SignupNudgeEmailParams {
    /** First name, when the account has one worth using. */
    name: string | null;
    /** Length of the free trial the card starts. */
    days: number;
    /** The one-time link back into onboarding, at the step they left. */
    resumeUrl: string;
    /** Their own unsubscribe link: this is a reminder, not a receipt. */
    unsubscribeUrl: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * The day after someone typed their email into onboarding and left.
 *
 * What it has to do, in order: say where they stopped, say what is waiting
 * (the benefits, as a short list), say the trial is free and starts with a
 * card they can cancel, and give one button that puts them back at the
 * same step with their answers. The link is the verification too, so no
 * code is asked for on the way back.
 *
 * The benefit list can be rewritten in the console like any list field:
 * an edited version is stored one line per benefit.
 */
export function signupNudgeEmail(
    locale: EmailLocale,
    { name, days, resumeUrl, unsubscribeUrl }: SignupNudgeEmailParams,
    overrides?: EmailCopyOverrides,
) {
    const vars = { name: name ?? "", days: String(days) };
    const t = (key: string) => interpolate(tServer(locale, `email.signup_nudge.${key}`, overrides), vars);

    const benefitsKey = "email.signup_nudge.benefits";
    const edited = overrides?.[benefitsKey]?.[locale] || overrides?.[benefitsKey]?.en;
    const benefits = (typeof edited === "string" && edited.trim()
        ? edited.split("\n").map((line) => line.trim()).filter(Boolean)
        : tServerList(locale, benefitsKey)
    ).map((line) => interpolate(line, vars));

    const subject = t("subject");
    const preheader = t("preheader");
    const greeting = name ? t("greeting_named") : t("greeting");
    const body = t("body");
    const benefitsTitle = t("benefits_title");
    const trialLine = t("trial_line");
    const cta = t("cta");
    const savedNote = t("saved_note");
    const ignore = t("ignore");
    const team = t("team");
    const unsubscribe = t("unsubscribe");

    const benefitsHtml = benefits
        .map(
            (b) => `
        <tr>
          <td style="width:22px; vertical-align:top; padding:0 0 10px; font-size:15px; color:${emailColors.ACCENT}; font-weight:700;">&#10003;</td>
          <td style="padding:0 0 10px; font-size:15px; line-height:1.5; color:${emailColors.INK};">${escapeHtml(b)}</td>
        </tr>`,
        )
        .join("");

    const bodyHtml = `
      <p style="margin:0 0 20px; font-size:16px; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body)}</p>
      <p style="margin:0 0 12px; font-size:15px; font-weight:600; color:${emailColors.INK};">${escapeHtml(benefitsTitle)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">${benefitsHtml}</table>
      <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(trialLine)}</p>
      <p style="margin:0 0 20px;">${emailButton(cta, resumeUrl)}</p>
      <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(savedNote)}</p>
      <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(ignore)}</p>
      <p style="margin:0 0 28px; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(team)}</p>
      <p style="margin:0; font-size:12px; color:${emailColors.MUTED};"><a href="${escapeHtml(unsubscribeUrl)}" style="color:${emailColors.MUTED};">${escapeHtml(unsubscribe)}</a></p>
    `;

    const text = [
        greeting,
        body,
        `${benefitsTitle}\n${benefits.map((b) => `- ${b}`).join("\n")}`,
        trialLine,
        `${cta}: ${resumeUrl}`,
        savedNote,
        ignore,
        team,
        `${unsubscribe}: ${unsubscribeUrl}`,
    ].join("\n\n");

    return { subject, html: renderLayout({ preheader, bodyHtml }), text };
}
