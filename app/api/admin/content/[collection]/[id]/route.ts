import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { roleHasPermission } from "@/lib/admin/roles";
import { CONTENT_STATUSES } from "@/lib/content";
import { localeUrlsFor, submitToIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/**
 * Which public URLs a content change invalidates, for the IndexNow ping.
 *
 * Only the collections that actually render on the public marketing site are
 * listed — lessons, ideas and songs live behind auth in /platform, which is
 * noindex, so pinging for them would submit URLs no crawler is allowed to see.
 */
function publicUrlsFor(collection: string, doc: Record<string, any>): string[] {
    switch (collection) {
        case "site_pages": {
            const slug = doc.slug || doc.id;
            return slug ? localeUrlsFor(`/${slug}`) : [];
        }
        // The Q&A accordion and the code-page copy overrides both render on the
        // homepage, so a change to either is a change to "/".
        case "faqs":
        case "site_copy":
            return localeUrlsFor("/");
        default:
            return [];
    }
}

type Ctx = { params: Promise<{ collection: string; id: string }> };

const EDITABLE = {
    chapters: { collection: "learn_chapters", label: "chapter" },
    lessons: { collection: "learn_lessons", label: "lesson" },
    ideas: { collection: "ideas", label: "idea" },
    songs: { collection: "practice_songs", label: "song" },
    pages: { collection: "site_pages", label: "page" },
    faqs: { collection: "faqs", label: "faq" },
    copy: { collection: "site_copy", label: "copy" },
} as const;

function resolve(collection: string) {
    const entry = EDITABLE[collection as keyof typeof EDITABLE];
    if (!entry) throw new Error(`Unknown content collection "${collection}"`);
    return entry;
}

export const PATCH = withAdmin("content.write", async (request, admin, ctx: Ctx) => {
    const { collection, id } = await ctx.params;
    const entry = resolve(collection);
    const body = await request.json();

    const ref = adminDb.collection(entry.collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const current = snap.data() || {};

    if (body.status !== undefined) {
        if (!CONTENT_STATUSES.includes(body.status)) {
            return NextResponse.json({ error: `Invalid status "${body.status}"` }, { status: 400 });
        }
        // Writing a draft and making it live for every user are different acts,
        // so publishing needs its own permission.
        const goingLive = body.status === "published" || body.status === "scheduled";
        if (goingLive && !roleHasPermission(admin.role, "content.publish")) {
            return NextResponse.json({ error: "Your role cannot publish content" }, { status: 403 });
        }
    }

    const { id: _ignored, createdAt: _created, ...fields } = body;

    // Snapshot the previous version before overwriting, so an edit can be traced
    // and rolled back without keeping every field in the audit log.
    await adminDb.collection("content_versions").add({
        collection: entry.collection,
        documentId: id,
        snapshot: current,
        replacedAt: FieldValue.serverTimestamp(),
        replacedByEmail: admin.email,
    });

    await ref.set(
        {
            ...fields,
            updatedAt: FieldValue.serverTimestamp(),
            updatedByEmail: admin.email,
            ...(body.status === "published" && current.status !== "published"
                ? { publishedAt: FieldValue.serverTimestamp(), publishedByEmail: admin.email }
                : {}),
        },
        { merge: true },
    );

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: body.status && body.status !== current.status
            ? `content.${entry.label}.${body.status}`
            : `content.${entry.label}.update`,
        targetType: entry.label,
        targetId: id,
        targetLabel: current.title?.en || current.title || id,
        before: { status: current.status },
        after: { status: body.status ?? current.status, fields: Object.keys(fields) },
        ...auditContext(request),
    });

    // Tell Bing/Yandex/Seznam/Naver to re-crawl what just changed. Awaited (not
    // fire-and-forget) because a serverless instance can be frozen the moment
    // the response is returned, which would drop a detached promise — but the
    // helper swallows its own failures, so a slow or broken IndexNow can only
    // cost this request a little latency, never its success.
    if (body.status === "published" || current.status === "published") {
        const urls = publicUrlsFor(entry.collection, { ...current, ...fields, id });
        if (urls.length > 0) await submitToIndexNow(urls);
    }

    return NextResponse.json({ success: true });
});

export const DELETE = withAdmin("content.publish", async (request, admin, ctx: Ctx) => {
    const { collection, id } = await ctx.params;
    const entry = resolve(collection);

    const ref = adminDb.collection(entry.collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const current = snap.data() || {};

    // Archive rather than delete: a lesson someone is halfway through shouldn't
    // vanish from under them, and progress records point at these ids.
    await ref.update({
        status: "archived",
        archivedAt: FieldValue.serverTimestamp(),
        archivedByEmail: admin.email,
    });

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `content.${entry.label}.archive`,
        targetType: entry.label,
        targetId: id,
        targetLabel: current.title?.en || current.title || id,
        before: { status: current.status },
        after: { status: "archived" },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
