import "server-only";
import MarkdownIt from "markdown-it";
import { renderLayout, escapeHtml, emailColors } from "@/lib/email/layout";

/**
 * A direct email: one admin writing to one person, or a handful of people,
 * by hand. Not a campaign — no audience query, no unsubscribe footer, no batch
 * scheduler. The nearest thing to it is a support reply, and it is treated the
 * same way: personal correspondence from the company, sent because someone
 * chose to write it.
 *
 * The body is Markdown, rendered here with HTML disabled. That is the same
 * boundary the website pages sit behind, and for the same reason: an admin
 * account is exactly what gets phished, and an email is a worse place than a
 * web page for a stored payload to land.
 */

export const MAX_DIRECT_RECIPIENTS = 50;

export interface DirectEmailInput {
    subject: string;
    /** Markdown. `{{name}}` is replaced with the recipient's first name. */
    body: string;
}

export interface DirectRecipient {
    uid: string;
    name: string;
    email: string;
}

// Email clients ignore stylesheets, so every element carries its own style.
// Applied after rendering; html:false means every tag here is one we emitted.
const TAG_STYLES: Record<string, string> = {
    p: `margin:0 0 16px; font-size:15px; line-height:1.6; color:${emailColors.INK};`,
    h1: `margin:0 0 16px; font-size:22px; line-height:1.3; font-weight:600; color:${emailColors.INK};`,
    h2: `margin:24px 0 12px; font-size:18px; line-height:1.35; font-weight:600; color:${emailColors.INK};`,
    h3: `margin:20px 0 8px; font-size:16px; line-height:1.4; font-weight:600; color:${emailColors.INK};`,
    ul: `margin:0 0 16px; padding-left:20px; font-size:15px; line-height:1.6; color:${emailColors.INK};`,
    ol: `margin:0 0 16px; padding-left:20px; font-size:15px; line-height:1.6; color:${emailColors.INK};`,
    li: `margin:0 0 6px;`,
    blockquote: `margin:0 0 16px; padding:4px 0 4px 16px; border-left:3px solid ${emailColors.BORDER}; color:${emailColors.MUTED};`,
    a: `color:${emailColors.ACCENT};`,
    hr: `border:0; border-top:1px solid ${emailColors.BORDER}; margin:24px 0;`,
};

const md = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: true });

// Images are the one thing an email needs that a policy page does not. They
// must be absolute http(s) URLs — a relative path means nothing in an inbox —
// and they get the sizing an email client will otherwise ignore.
md.renderer.rules.image = (tokens, idx) => {
    const token = tokens[idx];
    const src = token.attrGet("src") || "";
    if (!/^https?:\/\//i.test(src)) return "";
    const alt = token.content || "";
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="display:block; max-width:100%; height:auto; border-radius:12px; margin:0 0 16px;" />`;
};

function styleTags(html: string): string {
    return html.replace(/<(p|h1|h2|h3|ul|ol|li|blockquote|a|hr)(\s[^>]*)?>/g, (match, tag: string, attrs = "") => {
        const style = TAG_STYLES[tag];
        if (!style) return match;
        return `<${tag}${attrs} style="${style}">`;
    });
}

/** The first word of a display name, which is how one person addresses another. */
export function firstName(name: string): string {
    return (name || "").trim().split(/\s+/)[0] || "there";
}

export function renderDirectEmail(
    input: DirectEmailInput,
    recipient: Pick<DirectRecipient, "name">,
): { subject: string; html: string; text: string } {
    const fill = (value: string) => value.replace(/\{\{name\}\}/g, firstName(recipient.name));

    const subject = fill(input.subject).trim();
    const body = fill(input.body);

    const bodyHtml = styleTags(md.render(body));

    // Plain-text alternative: the markdown itself reads fine as text, once the
    // image syntax is reduced to its URL.
    const text = body.replace(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g, "$1").trim();

    // The preheader is the first line of the body, which is what a person
    // writing a personal email would want previewed.
    const preheader = text.split("\n").map((l) => l.trim()).find(Boolean) || subject;

    return { subject, html: renderLayout({ preheader, bodyHtml }), text };
}
