import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { renderLayout, emailButton, escapeHtml } from "@/lib/email/layout";
import type { EmailLocale } from "@/lib/email/locale";

/**
 * Bulk email to Veinote users.
 *
 * Three constraints shape this and are worth stating, because each one rules out
 * the obvious implementation:
 *
 * 1. Cloud Run caps a request at 120s (firebase.json). A thousand recipients
 *    cannot be sent in one call, so sending is batched and resumable — each
 *    request sends a slice and records where it got to.
 * 2. One SMTP connection to a shared mailbox will be throttled or blocked if
 *    driven flat out, so sends are sequential with a pause between them rather
 *    than fired in parallel.
 * 3. Marketing email to a list legally needs consent and a way out. Recipients
 *    who opted out are excluded, and every campaign email carries a working
 *    unsubscribe link. Transactional mail — welcome, replies, moderation
 *    notices — is not affected by the opt-out and must not be sent this way.
 */

export type CampaignStatus = "draft" | "sending" | "paused" | "sent" | "failed";

export interface CampaignAudience {
    /** Empty means every tier. */
    tiers: string[];
    /** Empty means every language. */
    locales: string[];
}

export interface EmailCampaign {
    id: string;
    name: string;
    subject: string;
    /** Plain text with blank-line paragraphs; rendered into the standard layout. */
    body: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    audience: CampaignAudience;
    status: CampaignStatus;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    /** uid of the last recipient processed — where a resumed run picks up. */
    cursor: string | null;
    createdByEmail: string;
    createdAt: number | null;
    startedAt: number | null;
    finishedAt: number | null;
    lastError: string | null;
}

/** How many recipients one request handles before returning. */
export const BATCH_SIZE = 25;

/** Pause between individual sends, to stay under the mail host's rate limit. */
const SEND_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Recipient {
    uid: string;
    email: string;
    name: string;
    locale: EmailLocale;
}

/**
 * One page of recipients, ordered by uid so a resumed run continues rather than
 * starting over. Ordering by uid (not by name or date) is what makes the cursor
 * stable: it is the document key, so it cannot change under us mid-campaign.
 */
export async function fetchRecipientPage(
    audience: CampaignAudience,
    afterUid: string | null,
    limit: number,
): Promise<Recipient[]> {
    let query: FirebaseFirestore.Query = adminDb.collection("users");

    // A single equality filter can be pushed to Firestore alongside the uid
    // ordering. More than one tier, or any locale filter, is applied in memory —
    // correctness over cleverness, and these lists are thousands, not millions.
    if (audience.tiers.length === 1) query = query.where("tier", "==", audience.tiers[0]);

    query = query.orderBy("__name__").limit(limit);
    if (afterUid) query = query.startAfter(afterUid);

    const snap = await query.get();

    return snap.docs
        .map((doc) => {
            const d = doc.data() || {};
            return {
                uid: doc.id,
                email: typeof d.email === "string" ? d.email : "",
                name: typeof d.name === "string" ? d.name : "there",
                locale: (d.locale === "no" || d.locale === "sv" ? d.locale : "en") as EmailLocale,
                tier: d.tier || null,
                optedOut: d.emailOptOut === true,
            };
        })
        .filter((r) => {
            if (!r.email) return false;
            // Opting out is absolute for campaign mail.
            if (r.optedOut) return false;
            if (audience.tiers.length > 0 && !audience.tiers.includes(r.tier)) return false;
            if (audience.locales.length > 0 && !audience.locales.includes(r.locale)) return false;
            return true;
        })
        .map(({ uid, email, name, locale }) => ({ uid, email, name, locale }));
}

/**
 * A stable per-user unsubscribe token.
 *
 * Derived from the uid and a secret already present in the environment rather
 * than stored, so it needs no extra write per recipient and no new secret to
 * manage. It is not guessable without that secret, and changing the secret
 * invalidates every old link — acceptable for an unsubscribe link.
 */
export function unsubscribeToken(uid: string): string {
    const secret = process.env.SMTP_PASS || process.env.GEMINI_API_KEY || "veinote-unsubscribe";
    return createHash("sha256").update(`${uid}:${secret}`).digest("hex").slice(0, 32);
}

export function unsubscribeUrl(uid: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
    return `${appUrl}/unsubscribe?uid=${encodeURIComponent(uid)}&t=${unsubscribeToken(uid)}`;
}

/** Renders a campaign for one recipient, in the standard Veinote email shell. */
export function renderCampaignEmail(
    campaign: Pick<EmailCampaign, "subject" | "body" | "ctaLabel" | "ctaUrl">,
    recipient: Pick<Recipient, "uid" | "name">,
): { subject: string; html: string; text: string } {
    const fill = (value: string) => value.replace(/\{\{name\}\}/g, recipient.name);

    const subject = fill(campaign.subject);
    const body = fill(campaign.body);
    const optOut = unsubscribeUrl(recipient.uid);

    const paragraphs = body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

    const bodyHtml = `
      ${paragraphs
          .map(
              (p) =>
                  `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#363636;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`,
          )
          .join("\n")}
      ${campaign.ctaLabel && campaign.ctaUrl ? emailButton(campaign.ctaLabel, campaign.ctaUrl) : ""}
      <p style="margin:28px 0 0; font-size:12px; color:#78716C;">
        You're receiving this because you have a Veinote account.
        <a href="${optOut}" style="color:#78716C;">Unsubscribe from updates like this</a>.
      </p>
    `;

    const text = `${paragraphs.join("\n\n")}${
        campaign.ctaLabel && campaign.ctaUrl ? `\n\n${campaign.ctaLabel}: ${campaign.ctaUrl}` : ""
    }\n\n--\nYou're receiving this because you have a Veinote account.\nUnsubscribe: ${optOut}`;

    return {
        subject,
        html: renderLayout({ preheader: paragraphs[0]?.slice(0, 120) || subject, bodyHtml }),
        text,
    };
}

/** Generates an id that reads sensibly in a URL and in the audit log. */
export function newCampaignId(name: string): string {
    const stem =
        name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || "campaign";
    return `${stem}-${randomBytes(3).toString("hex")}`;
}

export { sleep, SEND_DELAY_MS };
