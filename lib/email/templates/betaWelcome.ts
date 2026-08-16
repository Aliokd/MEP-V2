import "server-only";
import { tServer, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, emailButton, emailLogo, escapeHtml, emailColors } from "@/lib/email/layout";

export interface BetaWelcomeEmailParams {
    /** Display name of the tester. */
    name: string;
    /** The address the account signs in with — not necessarily the address we send to. */
    loginEmail: string;
    /** The temporary password an admin generated when creating the account. */
    password: string;
    /** Where the CTA points, e.g. https://veinote.com/signin */
    signInUrl: string;
}

const TASK_COUNT = 4;

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * The email a hand-picked beta tester gets when we create their account for them.
 *
 * Unlike welcomeEmail(), this one carries the credentials, because nobody signed
 * up here — we made the account on their behalf and they have no other way in.
 * The password is therefore passed in by the caller at send time and, as
 * everywhere else, never read back from storage: the admin console shows it once
 * and this email is the only other place it exists.
 *
 * The tasks are the point of the email. A tester told only "here's your account"
 * opens it, clicks around and reports nothing; a tester given four concrete jobs
 * exercises the create → learn → practice → connect loop end to end, which is
 * exactly the path we need broken before launch.
 */
export function betaWelcomeEmail(
    locale: EmailLocale,
    { name, loginEmail, password, signInUrl }: BetaWelcomeEmailParams,
    /** Admin-authored wording, when an editor has changed this email. */
    overrides?: EmailCopyOverrides,
) {
    const t = (key: string) => interpolate(tServer(locale, `email.beta_welcome.${key}`, overrides), { name });

    const subject = t("subject");
    const preheader = t("preheader");
    const greeting = t("greeting");
    const body1 = t("body_1");
    const body2 = t("body_2");
    const credentialsTitle = t("credentials_title");
    const emailLabel = t("credentials_email_label");
    const passwordLabel = t("credentials_password_label");
    const credentialsNote = t("credentials_note");
    const cta = t("cta");
    const tasksTitle = t("tasks_title");
    const feedback = t("feedback");
    const signoff = t("signoff");
    const team = t("team");
    const contact = t("contact");

    const tasks = Array.from({ length: TASK_COUNT }, (_, i) => ({
        title: t(`task_${i + 1}_title`),
        body: t(`task_${i + 1}_body`),
    }));

    // Credentials sit in their own bordered block so they survive being forwarded,
    // screenshotted or read out loud. Monospace on the password only — the reader
    // has to retype it character for character.
    const credentialsHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px; background-color:${emailColors.BG}; border:1px solid ${emailColors.BORDER}; border-radius:14px;">
        <tr>
          <td style="padding:20px 22px;">
            <p style="margin:0 0 14px; font-size:13px; font-weight:600; color:${emailColors.MUTED};">${escapeHtml(credentialsTitle)}</p>
            <p style="margin:0 0 4px; font-size:12px; color:${emailColors.MUTED};">${escapeHtml(emailLabel)}</p>
            <p style="margin:0 0 14px; font-size:15px; color:${emailColors.INK}; word-break:break-all;">${escapeHtml(loginEmail)}</p>
            <p style="margin:0 0 4px; font-size:12px; color:${emailColors.MUTED};">${escapeHtml(passwordLabel)}</p>
            <p style="margin:0; font-size:15px; font-family:Consolas,Menlo,Monaco,'Courier New',monospace; color:${emailColors.INK}; word-break:break-all;">${escapeHtml(password)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 28px; font-size:13px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(credentialsNote)}</p>
    `;

    // Numbered rows as a table rather than <ol>: Outlook reflows list markup and
    // loses the alignment between the number and its paragraph.
    const tasksHtml = tasks
        .map(
            (task, index) => `
      <tr>
        <td valign="top" style="padding:0 12px 18px 0; font-size:15px; font-weight:600; line-height:1.5; color:${emailColors.ACCENT};">${index + 1}</td>
        <td valign="top" style="padding:0 0 18px;">
          <p style="margin:0 0 4px; font-size:15px; font-weight:600; line-height:1.5; color:${emailColors.INK};">${escapeHtml(task.title)}</p>
          <p style="margin:0; font-size:14px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(task.body)}</p>
        </td>
      </tr>`,
        )
        .join("");

    const bodyHtml = `
      <p style="margin:0 0 20px; font-size:16px; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body1)}</p>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body2)}</p>
      ${credentialsHtml}
      ${emailButton(cta, signInUrl)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0 0;">
        <tr><td colspan="2" style="padding:0 0 14px; font-size:13px; font-weight:600; color:${emailColors.MUTED};">${escapeHtml(tasksTitle)}</td></tr>
        ${tasksHtml}
      </table>
      <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(feedback)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0; border-top:1px solid ${emailColors.BORDER}; width:100%;">
        <tr>
          <td style="padding:24px 0 0;">
            <p style="margin:0 0 14px; font-size:14px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(signoff)}</p>
            ${emailLogo()}
            <p style="margin:12px 0 0; font-size:13px; line-height:1.7; color:${emailColors.MUTED};">
              ${escapeHtml(team)}<br />
              <a href="mailto:support@veinote.com" style="color:${emailColors.MUTED};">support@veinote.com</a><br />
              <a href="https://veinote.com" style="color:${emailColors.MUTED};">${escapeHtml(contact)}</a>
            </p>
          </td>
        </tr>
      </table>
    `;

    const text = [
        greeting,
        "",
        body1,
        "",
        body2,
        "",
        credentialsTitle,
        `${emailLabel}: ${loginEmail}`,
        `${passwordLabel}: ${password}`,
        "",
        credentialsNote,
        "",
        `${cta}: ${signInUrl}`,
        "",
        tasksTitle,
        ...tasks.flatMap((task, index) => [`${index + 1}. ${task.title}`, `   ${task.body}`, ""]),
        feedback,
        "",
        signoff,
        team,
        `support@veinote.com · ${contact}`,
    ].join("\n");

    return { subject, html: renderLayout({ preheader, bodyHtml }), text };
}
