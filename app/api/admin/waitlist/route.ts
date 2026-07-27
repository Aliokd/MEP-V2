import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === "number") return value;
    return null;
}

interface WaitlistEntry {
    email: string;
    locale: string | null;
    source: string | null;
    position: number | null;
    signupCount: number;
    createdAt: number | null;
    invitedAt: number | null;
}

function shape(doc: FirebaseFirestore.DocumentSnapshot): WaitlistEntry {
    const d = doc.data() || {};
    return {
        email: d.email || doc.id,
        locale: d.locale || null,
        source: d.source || null,
        position: typeof d.position === "number" ? d.position : null,
        signupCount: d.signupCount || 1,
        createdAt: toMillis(d.createdAt),
        invitedAt: toMillis(d.invitedAt),
    };
}

/** RFC 4180: quote every field, double any inner quote. */
function csvCell(value: unknown): string {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(entries: WaitlistEntry[]): string {
    const header = ["position", "email", "language", "source", "signups", "joined", "invited"];
    const rows = entries.map((e) => [
        e.position ?? "",
        e.email,
        e.locale ?? "",
        e.source ?? "",
        e.signupCount,
        e.createdAt ? new Date(e.createdAt).toISOString() : "",
        e.invitedAt ? new Date(e.invitedAt).toISOString() : "",
    ]);

    return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * The pre-launch waitlist.
 *
 * Read through this route rather than straight from the client, because
 * firestore.rules keeps the collection closed to every browser — it is a list of
 * strangers' email addresses, and the only thing standing between it and any
 * signed-in user would be a rule nobody re-reads.
 *
 * `?format=csv` downloads the list for a mail tool. Oldest first in both views:
 * a waitlist is an ordering, and the people who have waited longest go first.
 */
export const GET = withAdmin("waitlist.read", async (request) => {
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    // A CSV export is the whole list by design; the on-screen table is paged so
    // one enormous read can't stall the console.
    const limit = format === "csv" ? 10_000 : Math.min(Number(url.searchParams.get("limit")) || 200, 1_000);

    const snap = await adminDb.collection("waitlist").orderBy("createdAt", "asc").limit(limit).get();
    const entries = snap.docs.map(shape);

    if (format === "csv") {
        const stamp = new Date().toISOString().slice(0, 10);
        return new NextResponse(toCsv(entries), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="veinote-waitlist-${stamp}.csv"`,
            },
        });
    }

    return NextResponse.json({ entries, total: entries.length });
});
