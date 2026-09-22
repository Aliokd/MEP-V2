import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { nameFromEmail } from "@/lib/userProfileShape";
import { GOLDEN_INVITES_PER_TICKET, GOLDEN_TICKETS_TOTAL } from "@/lib/uiFlags";
import {
    COLLECTION,
    freeSlug,
    getTicket,
    listTickets,
    newGoldenCode,
    nextFreeNumber,
    shapeTicket,
    type GoldenOrigin,
    type GoldenStatus,
    type GoldenTicket,
} from "@/lib/goldenTickets";

/**
 * The bridge between lifetime access and the wall.
 *
 * The golden ticket and the `comp` tier are two halves of one thing: the
 * ticket is what lifetime access looks like, and lifetime access is what the
 * ticket is worth. The program can start from either end.
 *
 * From the website the ticket comes first. Someone takes it on their page,
 * the code reaches their inbox, and onboarding redeems it and writes the
 * tier (/api/golden/redeem).
 *
 * From the console the grant comes first. An admin sets somebody's tier to
 * Lifetime Pro and this issues the ticket that goes with it, already
 * redeemed, in that person's name, so they appear on the wall among the
 * hundred with their ticket marked taken.
 *
 * Either way an account on `comp` holds a ticket, and a redeemed ticket has
 * an account behind it. Neither half may fail the other: issuing is best
 * effort, so a grant still lands when the wall is full, and the caller says
 * what happened.
 */

export interface IssueForUserInput {
    uid: string;
    /** The name on the ticket. Falls back to the account's own. */
    name?: string | null;
    email?: string | null;
    photoUrl?: string | null;
    tagline?: string | null;
    note?: string | null;
    /**
     * Whether it goes on the public wall, where it reads as taken. True by
     * default: a lifetime holder is one of the hundred, and the wall is how
     * a visitor sees how many are gone. The console can hide any one ticket,
     * which is what the team's own accounts want.
     */
    listed?: boolean;
    /** The admin's uid, or the name of the script that issued it. */
    issuedBy?: string | null;
    /**
     * A particular place on the wall, when an admin picked one rather than
     * taking the next. Refused if that number is already held, so two admins
     * pressing the same empty ticket cannot both win it.
     */
    number?: number | null;
}

export type IssueForUserOutcome = "issued" | "existing" | "wall-full" | "no-account" | "number-taken";

export interface IssueForUserResult {
    outcome: IssueForUserOutcome;
    ticket: GoldenTicket | null;
}

/**
 * Gives an account that already exists the ticket its lifetime access stands
 * for.
 *
 * Idempotent from both sides: an account already pointing at a live ticket
 * keeps it, and a ticket already redeemed by this account is adopted rather
 * than duplicated. That second case is someone who redeemed a campaign
 * ticket on the website and whose tier an admin then re-saves.
 */
export async function issueTicketForUser({
    uid,
    name,
    email,
    photoUrl,
    tagline,
    note,
    listed = true,
    issuedBy = null,
    number: wanted = null,
}: IssueForUserInput): Promise<IssueForUserResult> {
    const userRef = adminDb.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return { outcome: "no-account", ticket: null };
    const user = userSnap.data() ?? {};

    const held = typeof user.golden?.ticket === "string" ? (user.golden.ticket as string) : null;
    if (held) {
        const existing = await getTicket(held);
        if (existing) return { outcome: "existing", ticket: existing };
    }

    // Redeemed a ticket without the pointer ever being written, or the
    // pointer names a ticket that has since been deleted.
    const byUid = await adminDb.collection(COLLECTION).where("redeemedBy.uid", "==", uid).limit(1).get();
    if (!byUid.empty) {
        const existing = shapeTicket(byUid.docs[0]);
        await userRef.set(
            {
                golden: {
                    ticket: existing.slug,
                    redeemedAt: existing.redeemedBy?.at || new Date().toISOString(),
                    invites: existing.invites,
                },
            },
            { merge: true },
        );
        return { outcome: "existing", ticket: existing };
    }

    let number: number;
    if (wanted != null) {
        if (!Number.isInteger(wanted) || wanted < 1 || wanted > GOLDEN_TICKETS_TOTAL) {
            return { outcome: "number-taken", ticket: null };
        }
        const held = (await listTickets()).some((t) => t.number === wanted && t.status !== "revoked");
        if (held) return { outcome: "number-taken", ticket: null };
        number = wanted;
    } else {
        const next = await nextFreeNumber();
        if (next === null) return { outcome: "wall-full", ticket: null };
        number = next;
    }

    const accountEmail = typeof user.email === "string" ? user.email : null;
    const resolvedName =
        (name ?? (typeof user.name === "string" ? user.name : "") ?? "").trim() ||
        (accountEmail ? nameFromEmail(accountEmail) : "") ||
        "Songwriter";
    const slug = await freeSlug(resolvedName);
    const now = new Date().toISOString();

    const doc = {
        number,
        name: resolvedName,
        tagline: tagline ?? null,
        note: note ?? null,
        photoUrl: photoUrl ?? (typeof user.photoURL === "string" ? user.photoURL : null),
        email: email ?? accountEmail,
        code: newGoldenCode(),
        // Born redeemed: the account it belongs to already exists, so the
        // code can never be spent by anyone else. It is kept, and shown in
        // the console, because the holder may ask what their ticket says.
        status: "redeemed" as GoldenStatus,
        claim: null,
        redeemedBy: { uid, at: now, email: email ?? accountEmail },
        invites: GOLDEN_INVITES_PER_TICKET,
        listed,
        origin: "grant" as GoldenOrigin,
        createdAt: now,
        updatedAt: now,
        createdBy: issuedBy,
    };

    const ticketRef = adminDb.collection(COLLECTION).doc(slug);
    const written = await adminDb.runTransaction(async (tx) => {
        const [freshUser, freshTicket] = await Promise.all([tx.get(userRef), tx.get(ticketRef)]);
        // Someone else got there between the reads above and here.
        if (typeof freshUser.data()?.golden?.ticket === "string") return false;
        if (freshTicket.exists) return false;
        tx.set(ticketRef, doc);
        tx.set(userRef, { golden: { ticket: slug, redeemedAt: now, invites: doc.invites } }, { merge: true });
        return true;
    });

    if (!written) {
        // The loser of that race reports whatever the winner left behind.
        const after = await userRef.get();
        const other = typeof after.data()?.golden?.ticket === "string"
            ? await getTicket(after.data()!.golden.ticket as string)
            : null;
        return other ? { outcome: "existing", ticket: other } : { outcome: "wall-full", ticket: null };
    }

    return { outcome: "issued", ticket: { ...doc, slug } as GoldenTicket };
}

export interface ReleaseResult {
    outcome: "revoked" | "none";
    slug: string | null;
    number: number | null;
}

/**
 * Takes the ticket back when the lifetime access behind it is taken away.
 *
 * Revoked rather than deleted: the number it held and the record of who held
 * it outlive the grant, and the console can reopen or delete it deliberately.
 * The account's pointer is cleared, so a later grant issues a fresh ticket
 * instead of resurrecting this one. It leaves the wall either way, because a
 * page that shows a ticket as taken by someone who no longer holds one is
 * simply wrong.
 */
export async function releaseTicketForUser(
    uid: string,
    releasedBy: string | null = null,
): Promise<ReleaseResult> {
    const userRef = adminDb.doc(`users/${uid}`);
    const snap = await userRef.get();
    const held = typeof snap.data()?.golden?.ticket === "string" ? (snap.data()!.golden.ticket as string) : null;

    const ticket = held ? await getTicket(held) : null;
    if (!ticket) {
        if (held) await userRef.set({ golden: FieldValue.delete() }, { merge: true });
        return { outcome: "none", slug: held, number: null };
    }

    const now = new Date().toISOString();
    await adminDb.collection(COLLECTION).doc(ticket.slug).update({
        status: "revoked",
        listed: false,
        releasedAt: now,
        releasedBy,
        updatedAt: now,
    });
    await userRef.set({ golden: FieldValue.delete() }, { merge: true });

    return { outcome: "revoked", slug: ticket.slug, number: ticket.number };
}
