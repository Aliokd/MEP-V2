import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { CONTENT_STATUSES } from "@/lib/content";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ collection: string }> };

/** Only these collections are editable through the CMS. */
const EDITABLE = {
    chapters: { collection: "learn_chapters", label: "chapter", orderBy: "order" },
    lessons: { collection: "learn_lessons", label: "lesson", orderBy: "order" },
    ideas: { collection: "ideas", label: "idea", orderBy: "order" },
    songs: { collection: "practice_songs", label: "song", orderBy: "order" },
    melodies: { collection: "practice_melodies", label: "melody", orderBy: "order" },
    pages: { collection: "site_pages", label: "page", orderBy: "order" },
    faqs: { collection: "faqs", label: "faq", orderBy: "order" },
    copy: { collection: "site_copy", label: "copy", orderBy: "order" },
} as const;

type EditableKey = keyof typeof EDITABLE;

function resolve(collection: string) {
    const entry = EDITABLE[collection as EditableKey];
    if (!entry) throw new Error(`Unknown content collection "${collection}"`);
    return entry;
}

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value === "number") return value;
    return null;
}

export const GET = withAdmin("content.read", async (request, _admin, ctx: Ctx) => {
    const { collection } = await ctx.params;
    const entry = resolve(collection);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query: FirebaseFirestore.Query = adminDb.collection(entry.collection);
    if (status) query = query.where("status", "==", status);

    const snap = await query.get();
    const items = snap.docs
        .map((doc) => ({
            ...doc.data(),
            id: doc.id,
            updatedAt: toMillis(doc.data().updatedAt),
        }))
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    return NextResponse.json({ items });
});

export const POST = withAdmin("content.write", async (request, admin, ctx: Ctx) => {
    const { collection } = await ctx.params;
    const entry = resolve(collection);
    const body = await request.json();

    if (body.status && !CONTENT_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status "${body.status}"` }, { status: 400 });
    }

    const ref = body.id
        ? adminDb.collection(entry.collection).doc(String(body.id))
        : adminDb.collection(entry.collection).doc();

    const { id: _ignored, ...fields } = body;

    await ref.set(
        {
            ...fields,
            id: ref.id,
            // New content starts as a draft — publishing is a separate, permissioned act.
            status: body.status || "draft",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            updatedByEmail: admin.email,
        },
        { merge: true },
    );

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `content.${entry.label}.create`,
        targetType: entry.label,
        targetId: ref.id,
        targetLabel: fields.title?.en || fields.title || ref.id,
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, id: ref.id });
});
