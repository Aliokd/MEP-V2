import "server-only";
import type { GoldenTicket } from "@/lib/goldenTickets";

/**
 * Input cleaning and the console's view of a ticket, shared by the
 * /api/admin/golden routes. Route files may export only their handlers,
 * which is why this lives here rather than beside them.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_NAME = 80;
export const MAX_TAGLINE = 120;
export const MAX_NOTE = 600;

export function cleanText(value: unknown, max: number): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim().slice(0, max);
    return trimmed || null;
}

export function cleanPhotoUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    // A path under /public, or an https URL (the Storage bucket, or a public
    // picture the founders chose). Nothing else can be an image source.
    if (trimmed.startsWith("/")) return trimmed.slice(0, 500);
    try {
        const url = new URL(trimmed);
        return url.protocol === "https:" ? trimmed.slice(0, 1000) : null;
    } catch {
        return null;
    }
}

export function cleanEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const email = value.trim().toLowerCase();
    return EMAIL_PATTERN.test(email) && email.length <= 254 ? email : null;
}

/**
 * The console's view of a ticket: everything, code included. The console is
 * where a code is copied to resend by hand or read out over a call, which is
 * the reason the code is stored as written.
 */
export function consoleView(t: GoldenTicket) {
    return { ...t, pagePath: `/golden/${t.slug}` };
}
