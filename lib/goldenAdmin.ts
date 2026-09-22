import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { listTickets, type GoldenTicket } from "@/lib/goldenTickets";

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
/**
 * What the console shows. The code itself is a lifetime grant, so it is
 * only included for a role that could also mint one; a support login that
 * can see the wall cannot walk away with a hundred lifetime accounts.
 */
export function consoleView(t: GoldenTicket, { withCode = true }: { withCode?: boolean } = {}) {
    const view: Omit<GoldenTicket, "code"> & { code?: string; pagePath: string } = { ...t, pagePath: `/golden/${t.slug}` };
    if (!withCode) delete view.code;
    return view;
}

/**
 * Lifetime accounts with no golden ticket.
 *
 * The two are meant to be halves of one thing, so this is the list of places
 * they have come apart: an account granted lifetime before the program
 * existed, one whose grant happened while the wall was full, or one whose
 * ticket an admin has since deleted. The console shows the count and offers
 * to close the gap.
 */
export interface UnticketedUser {
    uid: string;
    name: string | null;
    email: string | null;
    createdAt: string | null;
}

export async function listUnticketedLifetimeUsers(): Promise<UnticketedUser[]> {
    const [usersSnap, tickets] = await Promise.all([
        adminDb.collection("users").where("tier", "==", "comp").get(),
        listTickets(),
    ]);

    const liveSlugs = new Set(tickets.map((t) => t.slug));
    const holders = new Set(
        tickets.filter((t) => t.redeemedBy?.uid).map((t) => t.redeemedBy!.uid),
    );

    return usersSnap.docs
        .filter((doc) => {
            const d = doc.data() ?? {};
            const slug = typeof d.golden?.ticket === "string" ? d.golden.ticket : null;
            // A pointer to a ticket that no longer exists counts as missing.
            if (slug && liveSlugs.has(slug)) return false;
            return !holders.has(doc.id);
        })
        .map((doc) => {
            const d = doc.data() ?? {};
            return {
                uid: doc.id,
                name: typeof d.name === "string" ? d.name : null,
                email: typeof d.email === "string" ? d.email : null,
                createdAt: typeof d.createdAt === "string" ? d.createdAt : null,
            };
        })
        // Oldest first, so numbers follow the order people joined.
        .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
}
