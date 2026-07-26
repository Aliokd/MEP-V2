import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { INBOX_COLLECTION, type InboxSource } from "@/lib/inbox";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ source: string; id: string }> };

function resolveSource(source: string): InboxSource {
    if (source !== "feedback" && source !== "support") {
        throw new Error(`Unknown inbox source "${source}"`);
    }
    return source;
}

/**
 * Internal notes are team-only context on a thread. They are never emailed and
 * Firestore rules make them unreadable to the user the thread belongs to.
 */
export const POST = withAdmin("inbox.write", async (request, admin, ctx: Ctx) => {
    const { source, id } = await ctx.params;
    const collection = INBOX_COLLECTION[resolveSource(source)];
    const { body } = await request.json();

    if (!body || !String(body).trim()) {
        return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });
    }

    const ref = adminDb.collection(collection).doc(id);
    if (!(await ref.get()).exists) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const note = await ref.collection("internal_notes").add({
        body: String(body).trim(),
        authorUid: admin.uid,
        authorName: admin.name,
        createdAt: FieldValue.serverTimestamp(),
    });

    await ref.update({ updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ success: true, id: note.id });
});
