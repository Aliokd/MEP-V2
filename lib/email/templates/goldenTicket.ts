import "server-only";
import { tServer, tServerList, type EmailCopyOverrides, type EmailLocale } from "@/lib/email/locale";
import { renderLayout, escapeHtml, emailColors } from "@/lib/email/layout";
import { GOLDEN } from "@/app/golden/content";

/**
 * The email that carries a golden ticket.
 *
 * Sent once when someone takes their ticket on their page (/golden/{slug}),
 * and again from the console when an admin sends it by hand. It holds the
 * one thing the website never shows, the code, and the link that uses it.
 *
 * It is the golden page, in an inbox: the same opening, the same four
 * showcase sections with their pictures, the six benefit cards, the founders,
 * the globe and the film, in the page's order, and it ends where the page
 * does, on the Activate card with the year of Pro struck through to nothing.
 * The code sits in that card, which is what the card on the page is for.
 *
 * The page's visuals are drawn by script and SVG, and an inbox runs neither,
 * so the pictures here are captures of the page itself, into
 * public/assets/email/golden: the four showcase demos as looping GIFs
 * (scripts/capture-golden-email-animations.mjs), everything else as stills
 * (scripts/capture-golden-email-assets.mjs). Re-run them when the page
 * changes, and deploy, for the email to follow.
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
 * email, under the opening, in the founders' voice.
 */
export type GoldenEmailMode = "invite" | "granted";

/** A year of Veinote Pro, in whole units of its currency (lib/paddle/proYearlyPrice.ts). */
export interface GoldenEmailPrice {
    amount: number;
    currency: string;
}

/** One founder's card: their newest post, or a quiet "coming soon" when there is none. */
export interface GoldenEmailFounder {
    role: string;
    title: string;
    url: string | null;
    imageUrl: string | null;
}

export interface GoldenTicketEmailParams {
    name: string;
    code: string;
    /** The onboarding link with the code already on it. */
    redeemUrl: string;
    /** The person's own page, for the "read it again" line. */
    pageUrl: string;
    invites: number;
    /** The ticket's place on the wall, printed under the seal. */
    number?: number | null;
    mode?: GoldenEmailMode;
    /** A line the admin wrote for this person. Plain text; never HTML. */
    personalNote?: string | null;
    /** Replaces the template's subject when the admin wrote their own. */
    subject?: string | null;
    /** What the Activate card strikes through. No price, no value line. */
    price?: GoldenEmailPrice | null;
    /** From lib/email/goldenEmailExtras.ts. Empty leaves the section out. */
    founders?: GoldenEmailFounder[];
    /**
     * Where the pictures are served from. Production unless a preview asks
     * otherwise: an email is opened days later, from anywhere, and a
     * localhost image is a broken one.
     */
    assetOrigin?: string;
}

const GOLD = "#C5A059";
// The page's gradient (app/golden/goldPalette.ts), and its middle stop as the
// flat colour for the clients that drop gradients (Outlook, some Gmail).
const GOLD_BRIGHT = "#F1D066";
const GOLD_MID = "#DCAE3C";
const GOLD_PRESS = "#9E8047";
const CARD_TINT = "#F7F6F2";
const TICKET_TINT = "#FFFBF0";

/**
 * Bump whenever the pictures in public/assets/email/golden are re-captured.
 * veinote.com serves them with a week's cache, and Gmail's image proxy keeps
 * its own copy by address, so a file replaced under the same name keeps
 * showing the old one; a new version makes it a new address.
 */
const ASSET_VERSION = 2;

const SHOWCASE = ["collab", "tools", "publish", "science"] as const;
const BENEFIT_ICONS = ["lifetime", "vouchers", "events", "host", "perks"] as const;

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/** "$468", the way the page's Activate card writes it, whole units only. */
function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * The page's golden button: the gradient where the client draws one, the
 * middle gold where it does not, and a darker bottom edge for the press
 * shadow the page draws with a box-shadow no inbox honours.
 */
function goldButton(label: string, url: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>
  <td bgcolor="${GOLD_MID}" style="border-radius:999px; background-color:${GOLD_MID}; background-image:linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD_MID} 55%, ${GOLD} 100%); border-bottom:4px solid ${GOLD_PRESS};">
    <a href="${escapeHtml(url)}" style="display:inline-block; padding:15px 34px; font-size:16px; font-weight:700; color:#1C1917; text-decoration:none; border-radius:999px;">${escapeHtml(label)}</a>
  </td>
</tr></table>`;
}

/** A picture at the column's width. Width is an attribute as well, for Outlook. */
function picture(src: string, alt: string, href?: string): string {
    const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="440" style="display:block; width:100%; max-width:440px; height:auto; border:0; outline:none; text-decoration:none; border-radius:16px;" />`;
    return href ? `<a href="${escapeHtml(href)}" style="text-decoration:none;">${img}</a>` : img;
}

function sectionTitle(text: string): string {
    return `<p style="margin:0 0 20px; font-size:24px; line-height:1.25; font-weight:500; letter-spacing:-0.01em; text-align:center; color:${emailColors.INK};">${escapeHtml(text)}</p>`;
}

const divider = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:40px 0;"><tr>
  <td style="border-top:1px solid ${emailColors.BORDER}; font-size:0; line-height:0;">&nbsp;</td>
</tr></table>`;

export function goldenTicketEmail(
    locale: EmailLocale,
    {
        name,
        code,
        redeemUrl,
        pageUrl,
        invites,
        number = null,
        mode = "invite",
        personalNote = null,
        subject: subjectOverride = null,
        price = null,
        founders = [],
        assetOrigin = "https://veinote.com",
    }: GoldenTicketEmailParams,
    overrides?: EmailCopyOverrides,
) {
    const vars = { name, code, invites: String(invites), number: number ? String(number) : "" };
    const t = (key: string) => interpolate(tServer(locale, `email.golden_ticket.${key}`, overrides), vars);
    const benefits = tServerList(locale, "email.golden_ticket.benefits").map((line) => interpolate(line, vars));
    const asset = (file: string) => `${assetOrigin.replace(/\/$/, "")}/assets/email/golden/${file}?v=${ASSET_VERSION}`;
    const filmUrl = `https://www.youtube.com/watch?v=${GOLDEN.videoId}`;

    const granted = mode === "granted";
    const subject = (subjectOverride ?? "").trim() || t("subject");
    const preheader = t("preheader");
    const eyebrow = number ? `${t("badge")} · ${t("ticket_label")}` : t("badge");
    const greeting = t("greeting");
    const intro = t("intro");
    const cta = granted ? t("cta_granted") : t("cta");
    const ctaUrl = granted ? t("app_url") : redeemUrl;
    const note = (personalNote ?? "").trim();
    const showcase = SHOWCASE.map((id) => ({ id, title: t(`${id}_title`), body: t(`${id}_body`) }));
    const benefitsTitle = t("benefits_title");
    const benefitsMore = t("benefits_more");
    const foundersTitle = t("founders_title");
    const foundersRead = t("founders_read");
    const foundersSoon = t("founders_soon");
    const togetherTitle = t("together_title");
    const videoTitle = t("video_title");
    const videoCta = t("video_cta");
    const activateTitle = granted ? t("activate_title_granted") : t("activate_title");
    const valueLabel = t("value_label");
    const period = t("period");
    const body1 = granted ? t("body_1_granted") : t("body_1");
    const codeLabel = granted ? t("code_label_granted") : t("code_label");
    const body2 = granted ? t("body_2_granted") : t("body_2");
    const pageLine = t("page_line");
    const keep = t("keep");
    const signoff = t("signoff");
    const team = t("team");

    const was = price ? formatPrice(price.amount, price.currency) : null;
    const now = price ? formatPrice(0, price.currency) : null;

    // Escaped line by line, so the admin's paragraph breaks survive without
    // any of their text being able to become markup.
    const noteHtml = note
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br />");

    // The four demos move, as they do on the page: looping GIFs recorded from
    // it (scripts/capture-golden-email-animations.mjs). GIF because an inbox
    // plays no video; Outlook on Windows shows the first frame as a still. The
    // .jpg stills beside them stay deployed for emails already sent.
    const showcaseHtml = showcase
        .map(
            ({ id, title, body }, i) => `
      ${picture(asset(`showcase-${id}.gif`), title)}
      <p style="margin:20px 0 8px; font-size:20px; line-height:1.3; font-weight:500; letter-spacing:-0.01em; color:${emailColors.INK};">${escapeHtml(title)}</p>
      <p style="margin:0 0 ${i === showcase.length - 1 ? 0 : 40}px; font-size:15px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(body)}</p>`,
        )
        .join("");

    // Six cards, two to a row, as on the page: the five benefits and a sixth,
    // dashed and quieter, saying the list is still growing. Cells in a row
    // share a height by being table cells, which is the page's auto-rows-fr.
    const benefitCell = (icon: string, text: string, more = false) => `
        <td width="50%" valign="top" style="width:50%; padding:18px; border-radius:18px; ${
            more ? `border:1px dashed #C9C5BA;` : `background-color:${CARD_TINT}; border:1px solid ${emailColors.BORDER};`
        }">
          <img src="${escapeHtml(asset(`benefit-${icon}.png`))}" alt="" width="44" height="45" style="display:block; width:44px; height:45px; border:0;" />
          <p style="margin:14px 0 0; font-size:15px; line-height:1.35; font-weight:600; color:${more ? emailColors.MUTED : emailColors.INK};">${escapeHtml(text)}</p>
        </td>`;
    const cells = [
        ...benefits.map((text, i) => benefitCell(BENEFIT_ICONS[i] ?? "perks", text)),
        benefitCell("more", benefitsMore, true),
    ];
    const benefitRows: string[] = [];
    for (let i = 0; i < cells.length; i += 2) benefitRows.push(`<tr>${cells[i]}${cells[i + 1] ?? `<td width="50%"></td>`}</tr>`);
    const benefitsHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="10" style="border-collapse:separate; border-spacing:10px; margin:0 -10px;">${benefitRows.join("")}</table>`;

    const founderCell = ({ role, title, url, imageUrl }: GoldenEmailFounder) => {
        const cover = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="" width="200" style="display:block; width:100%; height:auto; border:0; border-radius:14px 14px 0 0;" />`
            : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td height="110" align="center" style="height:110px; background-color:#EFEDE7; border-radius:14px 14px 0 0; font-size:12px; color:${emailColors.MUTED};">${escapeHtml(foundersSoon)}</td></tr></table>`;
        const inner = `${cover}
          <div style="padding:14px 16px 16px;">
            <p style="margin:0 0 6px; font-size:12px; font-weight:600; color:${GOLD};">${escapeHtml(role)}</p>
            <p style="margin:0 0 10px; font-size:15px; line-height:1.35; color:${emailColors.INK};">${escapeHtml(title)}</p>
            <p style="margin:0; font-size:13px; font-weight:600; color:${url ? emailColors.INK : emailColors.MUTED};">${escapeHtml(url ? `${foundersRead} →` : foundersSoon)}</p>
          </div>`;
        return `<td width="50%" valign="top" style="width:50%; padding:0; border:1px solid ${emailColors.BORDER}; border-radius:16px; background-color:#FFFFFF;">${
            url ? `<a href="${escapeHtml(url)}" style="display:block; text-decoration:none; color:inherit;">${inner}</a>` : inner
        }</td>`;
    };
    const foundersHtml = founders.length
        ? `${divider}
      ${sectionTitle(foundersTitle)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="10" style="border-collapse:separate; border-spacing:10px; margin:0 -10px;"><tr>${founders
          .slice(0, 2)
          .map(founderCell)
          .join("")}</tr></table>`
        : "";

    const bodyHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <img src="${escapeHtml(asset("seal.png"))}" alt="" width="64" height="64" style="display:block; margin:0 auto; width:64px; height:64px; border:0;" />
        <p style="margin:18px 0 0; font-size:13px; color:${emailColors.MUTED};">${escapeHtml(eyebrow)}</p>
        <p style="margin:14px 0 0; font-size:30px; line-height:1.2; font-weight:300; letter-spacing:-0.02em; color:${emailColors.INK};">${escapeHtml(greeting)}</p>
        <p style="margin:18px 0 0; font-size:16px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(intro)}</p>
      </td></tr></table>
      ${note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr>
        <td style="border-left:3px solid ${GOLD}; padding:2px 0 2px 16px; font-size:15px; line-height:1.6; color:${emailColors.INK};">${noteHtml}</td>
      </tr></table>` : ""}
      <div style="height:32px; line-height:32px; font-size:0;">&nbsp;</div>
      ${goldButton(cta, ctaUrl)}
      ${divider}
      ${showcaseHtml}
      ${divider}
      ${sectionTitle(benefitsTitle)}
      ${benefitsHtml}
      ${foundersHtml}
      ${divider}
      ${sectionTitle(togetherTitle)}
      ${picture(asset("together.jpg"), togetherTitle)}
      ${divider}
      ${sectionTitle(videoTitle)}
      ${picture(asset("film.jpg"), videoTitle, filmUrl)}
      <p style="margin:14px 0 0; font-size:14px; text-align:center;"><a href="${escapeHtml(filmUrl)}" style="color:${emailColors.INK}; font-weight:600;">&#9654;&nbsp; ${escapeHtml(videoCta)}</a></p>

      <!-- The Activate card: what the page ends on, with the code inside. -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:44px 0 32px;"><tr>
        <td align="center" style="background-color:${TICKET_TINT}; border:1px solid ${GOLD}; border-radius:24px; padding:36px 24px;">
          <p style="margin:0; font-size:24px; line-height:1.25; font-weight:500; color:${emailColors.INK};">${escapeHtml(activateTitle)}</p>
          ${was && now ? `
          <p style="margin:18px 0 6px; font-size:13px; color:${emailColors.MUTED};">${escapeHtml(valueLabel)}</p>
          <p style="margin:0; line-height:1;">
            <span style="font-size:40px; font-weight:500; color:#A8A29E; text-decoration:line-through;">${escapeHtml(was)}</span><span style="font-size:15px; color:#A8A29E;">${escapeHtml(period)}</span>
            &nbsp;&nbsp;<span style="font-size:48px; font-weight:600; color:#1C1917;">${escapeHtml(now)}</span>
          </p>` : ""}
          <p style="margin:22px 0 0; font-size:15px; line-height:1.6; color:${emailColors.INK};">${escapeHtml(body1)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
            <td align="center" style="background-color:#FFFFFF; border:1px dashed ${GOLD}; border-radius:14px; padding:16px;">
              <p style="margin:0 0 6px; font-size:12px; color:${emailColors.MUTED};">${escapeHtml(codeLabel)}</p>
              <p style="margin:0; font-size:24px; letter-spacing:0.12em; font-weight:700; color:${emailColors.INK}; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${escapeHtml(code)}</p>
            </td>
          </tr></table>
          <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(body2)}</p>
          ${goldButton(cta, ctaUrl)}
        </td>
      </tr></table>

      <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(pageLine)} <a href="${escapeHtml(pageUrl)}" style="color:${emailColors.INK};">${escapeHtml(pageUrl)}</a></p>
      <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${emailColors.MUTED};">${escapeHtml(keep)}</p>
      <p style="margin:0; font-size:14px; color:${emailColors.MUTED};">${escapeHtml(signoff)}<br />${escapeHtml(team)}</p>
    `;

    const text = [
        eyebrow,
        "",
        greeting,
        "",
        intro,
        ...(note ? ["", note] : []),
        "",
        `${cta}: ${ctaUrl}`,
        "",
        ...showcase.flatMap(({ title, body }) => [title, body, ""]),
        benefitsTitle,
        ...benefits.map((line) => `- ${line}`),
        `- ${benefitsMore}`,
        "",
        ...(founders.length
            ? [foundersTitle, ...founders.map((f) => `- ${f.role}: ${f.title}${f.url ? ` ${f.url}` : ""}`), ""]
            : []),
        `${videoTitle}: ${filmUrl}`,
        "",
        activateTitle,
        ...(was && now ? [`${valueLabel}: ${was}${period} → ${now}`] : []),
        body1,
        "",
        `${codeLabel}: ${code}`,
        body2,
        `${cta}: ${ctaUrl}`,
        "",
        `${pageLine} ${pageUrl}`,
        keep,
        "",
        signoff,
        team,
    ].join("\n");

    return { subject, html: renderLayout({ preheader, bodyHtml }), text };
}
