import "server-only";
import { randomBytes } from "node:crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { GOLDEN_TICKETS_TOTAL } from "@/lib/uiFlags";

/**
 * The Golden program: one hundred hand-picked songwriters, each with a page of
 * their own on the website and a ticket that opens Veinote for life.
 *
 * One document per ticket at golden_tickets/{slug}. The collection is
 * Admin-SDK-only: no client rule matches it in firestore.rules, so every read
 * and write goes through a server route. The public pages read it with the
 * Admin SDK on the server and hand the browser only the fields it shows.
 *
 * The lifecycle is a straight line:
 *
 *   open      the ticket is listed, nobody has pressed "Take my ticket"
 *   claimed   someone did, gave an address, and the code went to that inbox
 *   redeemed  the code was used in onboarding; the account is on the comp tier
 *   revoked   pulled by an admin; the page says the ticket is not available
 *
 * The code is stored as written rather than hashed, unlike the onboarding
 * codes: an admin has to be able to resend it, and the person who holds it can
 * ask for it again months later. What protects it is the collection being
 * closed to browsers, and that redeeming it takes the whole onboarding flow.
 */

export const COLLECTION = "golden_tickets";

export type GoldenStatus = "open" | "claimed" | "redeemed" | "revoked";

export interface GoldenClaim {
    email: string;
    message: string | null;
    locale: string;
    claimedAt: string;
}

export interface GoldenTicket {
    /** The document id, and the path segment of the page: /golden/{slug}. */
    slug: string;
    /** 1..GOLDEN_TICKETS_TOTAL, the ticket's place on the wall. */
    number: number;
    name: string;
    /** One line under the name: what they do, where they are. */
    tagline: string | null;
    /** A personal line from the founders, shown on the page: why this person. */
    note: string | null;
    photoUrl: string | null;
    /** Known before the claim, when the founders have it. Never shown on the page. */
    email: string | null;
    code: string;
    status: GoldenStatus;
    claim: GoldenClaim | null;
    redeemedBy: { uid: string; at: string } | null;
    /** How many people this ticket may bring in, once invites exist. */
    invites: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
}

/** What the website shows about a ticket. No email, no code. */
export interface PublicGoldenTicket {
    slug: string;
    number: number;
    name: string;
    tagline: string | null;
    note: string | null;
    photoUrl: string | null;
    status: GoldenStatus;
}

export function toPublic(ticket: GoldenTicket): PublicGoldenTicket {
    return {
        slug: ticket.slug,
        number: ticket.number,
        name: ticket.name,
        tagline: ticket.tagline,
        note: ticket.note,
        photoUrl: ticket.photoUrl,
        status: ticket.status,
    };
}

export function shapeTicket(doc: FirebaseFirestore.DocumentSnapshot): GoldenTicket {
    const d = doc.data() ?? {};
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
    return {
        slug: doc.id,
        number: typeof d.number === "number" ? d.number : 0,
        name: str(d.name) ?? "Songwriter",
        tagline: str(d.tagline),
        note: str(d.note),
        photoUrl: str(d.photoUrl),
        email: str(d.email),
        code: str(d.code) ?? "",
        status: isStatus(d.status) ? d.status : "open",
        claim: d.claim && typeof d.claim === "object"
            ? {
                email: String(d.claim.email ?? ""),
                message: str(d.claim.message),
                locale: String(d.claim.locale ?? "en"),
                claimedAt: String(d.claim.claimedAt ?? ""),
            }
            : null,
        redeemedBy: d.redeemedBy && typeof d.redeemedBy === "object"
            ? { uid: String(d.redeemedBy.uid ?? ""), at: String(d.redeemedBy.at ?? "") }
            : null,
        invites: typeof d.invites === "number" ? d.invites : 0,
        createdAt: str(d.createdAt) ?? "",
        updatedAt: str(d.updatedAt) ?? "",
        createdBy: str(d.createdBy),
    };
}

export function isStatus(value: unknown): value is GoldenStatus {
    return value === "open" || value === "claimed" || value === "redeemed" || value === "revoked";
}

/** Path segments: lowercase letters, digits and single dashes, nothing else. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(name: string): string {
    return name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

/**
 * The code on a ticket: GOLD, then two groups of four from an alphabet with
 * no 0/O or 1/I, so it survives being read aloud over a phone.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_PATTERN = /^GOLD-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export function newGoldenCode(): string {
    const bytes = randomBytes(8);
    let out = "";
    for (let i = 0; i < 8; i++) {
        out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
        if (i === 3) out += "-";
    }
    return `GOLD-${out}`;
}

/** Whatever someone typed or pasted, in the shape the pattern expects. */
export function normalizeCode(raw: string): string {
    const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const body = compact.startsWith("GOLD") ? compact.slice(4) : compact;
    if (body.length !== 8) return "";
    return `GOLD-${body.slice(0, 4)}-${body.slice(4)}`;
}

export async function listTickets(): Promise<GoldenTicket[]> {
    const snap = await adminDb.collection(COLLECTION).orderBy("number", "asc").get();
    return snap.docs.map(shapeTicket);
}

/** The wall as the website shows it: every listed ticket, public fields only. */
export async function listPublicTickets(): Promise<PublicGoldenTicket[]> {
    const tickets = await listTickets();
    return tickets.filter((t) => t.status !== "revoked").map(toPublic);
}

export async function getTicket(slug: string): Promise<GoldenTicket | null> {
    if (!SLUG_PATTERN.test(slug)) return null;
    const snap = await adminDb.collection(COLLECTION).doc(slug).get();
    return snap.exists ? shapeTicket(snap) : null;
}

export async function findTicketByCode(code: string): Promise<GoldenTicket | null> {
    const normalized = normalizeCode(code);
    if (!CODE_PATTERN.test(normalized)) return null;
    const snap = await adminDb.collection(COLLECTION).where("code", "==", normalized).limit(1).get();
    return snap.empty ? null : shapeTicket(snap.docs[0]);
}

/** The lowest number no ticket holds yet, or null when the wall is full. */
export async function nextFreeNumber(): Promise<number | null> {
    const taken = new Set((await listTickets()).map((t) => t.number));
    for (let n = 1; n <= GOLDEN_TICKETS_TOTAL; n++) {
        if (!taken.has(n)) return n;
    }
    return null;
}

/** A slug nobody holds: the name's, or the name's with a number behind it. */
export async function freeSlug(name: string): Promise<string> {
    const base = slugify(name) || "songwriter";
    let candidate = base;
    for (let i = 2; i < 100; i++) {
        const snap = await adminDb.collection(COLLECTION).doc(candidate).get();
        if (!snap.exists) return candidate;
        candidate = `${base}-${i}`;
    }
    return `${base}-${randomBytes(3).toString("hex")}`;
}
