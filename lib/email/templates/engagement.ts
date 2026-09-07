import "server-only";
import { tServer, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, emailButton, escapeHtml, emailColors } from "@/lib/email/layout";

/**
 * The two emails a songwriter gets when the community answers a post of theirs:
 * someone liked it, or someone commented on it.
 *
 * Short by design. The news is one line and the button is the rest; the
 * comment email carries the comment itself so the reader knows whether to
 * open the app now or later. Wording lives under `email.song_liked.*` and
 * `email.song_commented.*`, edited from the console like every other email.
 */

export interface EngagementEmailParams {
    /** The recipient, the person who posted the song. */
    name: string;
    /** Who liked or commented, from their own user document. */
    actor: string;
    /** The post's title. Empty means the template's own "your song" wording. */
    song: string;
    /** Where the button goes: the community feed in the reader's language. */
    postUrl: string;
}

export interface CommentEmailParams extends EngagementEmailParams {
    comment: string;
}

/** Opening and closing quotation marks, as each language sets a title. */
const QUOTES: Record<EmailLocale, [string, string]> = {
    en: ["“", "”"],
    no: ["«", "»"],
    sv: ["”", "”"],
};

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function build(
    prefix: "song_liked" | "song_commented",
    locale: EmailLocale,
    params: EngagementEmailParams,
    overrides: EmailCopyOverrides | undefined,
    quoted?: string,
) {
    // The title is quoted here, in the language's own marks, rather than in the
    // copy: a post with no title then reads "liked your song", not "liked
    // “your song”".
    const title = params.song.trim();
    const song = title
        ? `${QUOTES[locale][0]}${title}${QUOTES[locale][1]}`
        : tServer(locale, `email.${prefix}.untitled`, overrides);
    const vars = { name: params.name, actor: params.actor, song };
    const t = (key: string) => interpolate(tServer(locale, `email.${prefix}.${key}`, overrides), vars);

    const subject = t("subject");
    const preheader = t("preheader");
    const greeting = t("greeting");
    const body1 = t("body_1");
    const body2 = t("body_2");
    const cta = t("cta");
    const signoff = t("signoff");
    const team = t("team");

    // The comment sits in its own quiet block, as text, never as markup: it was
    // typed by another member, and an email is the last place to trust it.
    const quotedHtml = quoted
        ? `<blockquote style="margin:0 0 20px; padding:12px 16px; border-left:3px solid ${emailColors.BORDER}; background:${emailColors.BG}; border-radius:0 12px 12px 0; font-size:15px; line-height:1.6; color:${emailColors.INK}; white-space:pre-wrap;">${escapeHtml(quoted)}</blockquote>`
        : "";

    const bodyHtml = `
      <p style="margin:0 0 20px; font-size:16px; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body1)}</p>
      ${quotedHtml}
      <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body2)}</p>
      ${emailButton(cta, params.postUrl)}
      <p style="margin:28px 0 0; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(signoff)}<br />${escapeHtml(team)}</p>
    `;

    const text = [
        greeting,
        "",
        body1,
        ...(quoted ? ["", quoted.split("\n").map((line) => `> ${line}`).join("\n")] : []),
        "",
        body2,
        "",
        `${cta}: ${params.postUrl}`,
        "",
        signoff,
        team,
    ].join("\n");

    return { subject, html: renderLayout({ preheader, bodyHtml }), text };
}

export function songLikedEmail(locale: EmailLocale, params: EngagementEmailParams, overrides?: EmailCopyOverrides) {
    return build("song_liked", locale, params, overrides);
}

export function songCommentedEmail(locale: EmailLocale, params: CommentEmailParams, overrides?: EmailCopyOverrides) {
    // Long comments are cut for the email; the full one is one click away.
    const comment = params.comment.trim();
    const excerpt = comment.length > 600 ? `${comment.slice(0, 600).trimEnd()}…` : comment;
    return build("song_commented", locale, params, overrides, excerpt);
}
