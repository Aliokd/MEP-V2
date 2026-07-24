import "server-only";
import { tServer, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, emailButton, escapeHtml } from "@/lib/email/layout";

export interface WelcomeEmailParams {
    name: string;
    appUrl: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function welcomeEmail(locale: EmailLocale, { name, appUrl }: WelcomeEmailParams) {
    const t = (key: string) => interpolate(tServer(locale, `email.welcome.${key}`), { name });

    const subject = t("subject");
    const greeting = t("greeting");
    const body1 = t("body_1");
    const body2 = t("body_2");
    const cta = t("cta");
    const signoff = t("signoff");
    const team = t("team");

    const bodyHtml = `
      <p style="margin:0 0 20px; font-size:16px; color:#363636;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#363636;">${escapeHtml(body1)}</p>
      <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#363636;">${escapeHtml(body2)}</p>
      ${emailButton(cta, appUrl)}
      <p style="margin:28px 0 0; font-size:14px; color:#78716C;">${escapeHtml(signoff)}<br />${escapeHtml(team)}</p>
    `;

    return {
        subject,
        html: renderLayout({ preheader: body1, bodyHtml }),
        text: `${greeting}\n\n${body1}\n\n${body2}\n\n${cta}: ${appUrl}\n\n${signoff}\n${team}`,
    };
}
