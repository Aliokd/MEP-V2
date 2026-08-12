import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { INBOX_COLLECTION, type InboxSource } from "@/lib/inbox";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ source: string; id: string }> };

const VALID_STATUS = ["new", "open", "pending", "resolved", "closed"];
const VALID_PRIORITY = ["low", "normal", "high", "urgent"];

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

function resolveSource(source: string): InboxSource {
    if (source !== "feedback" && source !== "support") {
        throw new Error(`Unknown inbox source "${source}"`);
    }
    return source;
}

export const GET = withAdmin("inbox.read", async (_request, _admin, ctx: Ctx) => {
    const { source, id } = await ctx.params;
    const collection = INBOX_COLLECTION[resolveSource(source)];

    const ref = adminDb.collection(collection).doc(id);
    const [snap, notesSnap, repliesSnap] = await Promise.all([
        ref.get(),
        ref.collection("internal_notes").orderBy("createdAt", "asc").get(),
        ref.collection("replies").orderBy("createdAt", "asc").get(),
    ]);

    if (!snap.exists) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const d = snap.data() || {};

    // The person behind the thread, so support has context without a second lookup.
    let profile: Record<string, unknown> | null = null;
    if (d.userId && d.userId !== "anonymous") {
        const userSnap = await adminDb.collection("users").doc(d.userId).get();
        if (userSnap.exists) {
            const u = userSnap.data() || {};
            profile = {
                uid: d.userId,
                name: u.name || null,
                email: u.email || null,
                tier: u.tier || null,
                createdAt: toMillis(u.createdAt),
                lastActiveAt: toMillis(u.lastActiveAt),
                plan: u.billing?.plan || null,
                subscriptionStatus: u.billing?.subscriptionStatus || null,
                trialEndsAt: u.billing?.trialEndsAt || null,
            };
        }
    }

    return NextResponse.json({
        thread: {
            id: snap.id,
            source,
            ...d,
            createdAt: toMillis(d.createdAt),
            updatedAt: toMillis(d.updatedAt),
            lastMessageAt: toMillis(d.lastMessageAt),
            firstResponseAt: toMillis(d.firstResponseAt),
            resolvedAt: toMillis(d.resolvedAt),
        },
        profile,
        notes: notesSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toMillis(doc.data().createdAt),
        })),
        replies: repliesSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toMillis(doc.data().createdAt),
        })),
    });
});

export const PATCH = withAdmin("inbox.write", async (request, admin, ctx: Ctx) => {
    const { source, id } = await ctx.params;
    const collection = INBOX_COLLECTION[resolveSource(source)];
    const body = await request.json();

    const ref = adminDb.collection(collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const current = snap.data() || {};
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (body.status !== undefined) {
        if (!VALID_STATUS.includes(body.status)) {
            return NextResponse.json({ error: `Invalid status "${body.status}"` }, { status: 400 });
        }
        update.status = body.status;
        before.status = current.status;
        after.status = body.status;

        if (body.status === "resolved" || body.status === "closed") {
            // Stamp the time once, so resolution-time metrics stay honest if a
            // thread is reopened and resolved again — but always record who,
            // since the list credits whoever actually dealt with it last.
            if (!current.resolvedAt) update.resolvedAt = FieldValue.serverTimestamp();
            update.resolvedByUid = admin.uid;
            update.resolvedByName = admin.name;
            update.resolvedBy = admin.email;
        }
        if (body.status === "open" || body.status === "new" || body.status === "pending") {
            update.resolvedAt = null;
            update.resolvedBy = null;
            update.resolvedByUid = null;
            update.resolvedByName = null;
        }
    }

    if (body.priority !== undefined) {
        if (!VALID_PRIORITY.includes(body.priority)) {
            return NextResponse.json({ error: `Invalid priority "${body.priority}"` }, { status: 400 });
        }
        update.priority = body.priority;
        before.priority = current.priority;
        after.priority = body.priority;
    }

    if (body.category !== undefined) {
        update.category = body.category || null;
        before.category = current.category;
        after.category = body.category;
    }

    if (body.tags !== undefined) {
        update.tags = Array.isArray(body.tags) ? body.tags.slice(0, 12) : [];
        before.tags = current.tags;
        after.tags = update.tags;
    }

    if (body.assign !== undefined) {
        // "me" assigns to the caller; null clears it.
        if (body.assign === "me") {
            update.assigneeUid = admin.uid;
            update.assigneeName = admin.name;
        } else if (body.assign === null) {
            update.assigneeUid = null;
            update.assigneeName = null;
        } else {
            const assigneeSnap = await adminDb.collection("admins").doc(body.assign).get();
            if (!assigneeSnap.exists) {
                return NextResponse.json({ error: "Assignee is not an admin" }, { status: 400 });
            }
            update.assigneeUid = body.assign;
            update.assigneeName = assigneeSnap.data()?.name || assigneeSnap.data()?.email || body.assign;
        }
        before.assigneeUid = current.assigneeUid;
        after.assigneeUid = update.assigneeUid;
    }

    await ref.update(update);

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: `inbox.${source}.update`,
        targetType: "inbox_thread",
        targetId: id,
        targetLabel: current.subject || id,
        before,
        after,
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
