import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { CONTENT_STATUSES } from "@/lib/content";

export const dynamic = "force-dynamic";

export const GET = withAdmin("announcements.read", async () => {
    const snap = await adminDb.collection("announcements").orderBy("createdAt", "desc").limit(100).get();
    return NextResponse.json({
        announcements: snap.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                createdAt: d.createdAt?.toMillis?.() ?? null,
                sentAt: d.sentAt?.toMillis?.() ?? null,
            };
        }),
    });
});

/**
 * Creates an in-app announcement. Audience is a tier/locale filter, evaluated on
 * the client when the banner renders — these are product messages, not personal
 * data, so there is nothing sensitive in shipping the whole published set.
 */
export const POST = withAdmin("announcements.write", async (request, admin) => {
    const body = await request.json();

    if (!body.title?.en?.trim()) {
        return NextResponse.json({ error: "An English title is required — it is the fallback" }, { status: 400 });
    }
    if (body.status && !CONTENT_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status "${body.status}"` }, { status: 400 });
    }

    const ref = adminDb.collection("announcements").doc();
    await ref.set({
        id: ref.id,
        title: body.title,
        body: body.body || {},
        kind: body.kind || "banner",
        audience: {
            tiers: Array.isArray(body.audience?.tiers) ? body.audience.tiers : [],
            locales: Array.isArray(body.audience?.locales) ? body.audience.locales : [],
        },
        ctaLabel: body.ctaLabel || null,
        ctaHref: body.ctaHref || null,
        status: body.status || "draft",
        publishAt: body.publishAt || null,
        expiresAt: body.expiresAt || null,
        createdAt: FieldValue.serverTimestamp(),
        createdByEmail: admin.email,
        sentAt: null,
        sentCount: 0,
    });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "announcement.create",
        targetType: "announcement",
        targetId: ref.id,
        targetLabel: body.title.en,
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, id: ref.id });
});

export const PATCH = withAdmin("announcements.write", async (request, admin) => {
    const { id, ...fields } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const ref = adminDb.collection("announcements").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await ref.set({ ...fields, updatedAt: FieldValue.serverTimestamp(), updatedByEmail: admin.email }, { merge: true });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: fields.status ? `announcement.${fields.status}` : "announcement.update",
        targetType: "announcement",
        targetId: id,
        targetLabel: snap.data()?.title?.en || id,
        before: { status: snap.data()?.status },
        after: { status: fields.status ?? snap.data()?.status },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
