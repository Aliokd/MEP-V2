import "server-only";
import { tServer, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, escapeHtml, emailButton, emailColors } from "@/lib/email/layout";

export interface TrialEndingEmailParams {
    /** The person's first name, or nothing. */
    name: string | null;
    /** When the trial ends, already formatted for the locale ("23 September"). */
    endsOn: string;
    /** Where to pick a plan. */
    plansUrl: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * The day before a no-card trial ends.
 *
 * Paddle sends its own reminder to anyone who entered a card; this one is
 * for the rest, who otherwise meet the plans screen with no warning. One
 * sentence of fact, one of reassurance (nothing is lost), one button.
 */
export function trialEndingEmail(
    locale: EmailLocale,
    { name, endsOn, plansUrl }: TrialEndingEmailParams,
    overrides?: EmailCopyOverrides,
) {
    const vars = { name: name ?? "", endsOn };
    const t = (key: string) => interpolate(tServer(locale, `email.trial_ending.${key}`, overrides), vars);

    const subject = t("subject");
    const greeting = name ? t("greeting_named") : t("greeting");
    const body = t("body");
    const keep = t("keep");
    const cta = t("cta");
    const team = t("team");

    const bodyHtml = `
      <p style="margin:0 0 20px; font-size:16px; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body)}</p>
      <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(keep)}</p>
      <p style="margin:0 0 32px;">${emailButton(cta, plansUrl)}</p>
      <p style="margin:0; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(team)}</p>
    `;

    return {
        subject,
        html: renderLayout({ preheader: body, bodyHtml }),
        text: `${greeting}\n\n${body}\n\n${keep}\n\n${cta}: ${plansUrl}\n\n${team}`,
    };
}
