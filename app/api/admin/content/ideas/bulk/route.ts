import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { IDEA_CATEGORIES, LOCALES } from "@/lib/content";

export const dynamic = "force-dynamic";

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 400;
const MAX_ROWS = 2000;

const LOCALIZED_FIELDS = ["title", "description", "whyItHelps", "example"] as const;

/** Keeps only the locales we ship, and drops blanks so they don't mask a fallback. */
function cleanLocalized(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object") return {};
    const out: Record<string, string> = {};
    for (const locale of LOCALES) {
        const text = (value as Record<string, unknown>)[locale];
        if (typeof text === "string" && text.trim()) out[locale] = text.trim();
    }
    return out;
}

/**
 * Bulk upsert of Bank of Ideas cards.
 *
 * Revalidates every row rather than trusting the client's check — the browser
 * validation exists so the admin sees problems before uploading, not as the
 * gate. A row that fails here is reported and skipped; the rest still land,
 * because failing 300 good cards over one bad one helps nobody.
 */
export const POST = withAdmin("content.write", async (request, admin) => {
    const { ideas, status = "draft" } = await request.json();

    if (!Array.isArray(ideas) || ideas.length === 0) {
        return NextResponse.json({ error: "No cards to import" }, { status: 400 });
    }
    if (ideas.length > MAX_ROWS) {
        return NextResponse.json(
            { error: `That's ${ideas.length} cards — the limit is ${MAX_ROWS} per upload` },
            { status: 400 },
        );
    }
    if (!["draft", "published"].includes(status)) {
        return NextResponse.json({ error: `Invalid status "${status}"` }, { status: 400 });
    }

    // Publishing is a separate act from writing, same as the single-card editor.
    if (status === "published" && admin.role !== "superadmin" && admin.role !== "editor") {
        return NextResponse.json({ error: "Your role cannot publish content" }, { status: 403 });
    }

    const rejected: { id: string; reason: string }[] = [];
    const valid: Record<string, any>[] = [];
    const seen = new Set<string>();

    for (const raw of ideas) {
        const id = String(raw?.id || "").trim();

        if (!id) {
            rejected.push({ id: "(blank)", reason: "missing id" });
            continue;
        }
        if (seen.has(id)) {
            rejected.push({ id, reason: "duplicate id in this upload" });
            continue;
        }
        if (!IDEA_CATEGORIES.includes(raw?.category)) {
            rejected.push({ id, reason: `invalid category "${raw?.category}"` });
            continue;
        }

        const doc: Record<string, any> = {
            id,
            category: raw.category,
            order: Number(raw.order) || 0,
            status,
        };
        for (const field of LOCALIZED_FIELDS) {
            doc[field] = cleanLocalized(raw[field]);
        }

        if (!doc.title.en) {
            rejected.push({ id, reason: "English title is required" });
            continue;
        }
        if (!doc.description.en) {
            rejected.push({ id, reason: "English description is required" });
            continue;
        }

        seen.add(id);
        valid.push(doc);
    }

    if (valid.length === 0) {
        return NextResponse.json(
            { error: "Every row was rejected", created: 0, updated: 0, rejected },
            { status: 400 },
        );
    }

    // Which ids already exist, so the result can say created vs updated rather
    // than a single opaque number.
    const existing = new Set<string>();
    for (let i = 0; i < valid.length; i += 30) {
        const slice = valid.slice(i, i + 30);
        const snaps = await adminDb.getAll(
            ...slice.map((doc) => adminDb.collection("ideas").doc(doc.id)),
        );
        snaps.forEach((snap) => {
            if (snap.exists) existing.add(snap.id);
        });
    }

    for (let i = 0; i < valid.length; i += BATCH_LIMIT) {
        const batch = adminDb.batch();
        valid.slice(i, i + BATCH_LIMIT).forEach((doc) => {
            batch.set(
                adminDb.collection("ideas").doc(doc.id),
                { ...doc, updatedAt: FieldValue.serverTimestamp(), updatedByEmail: admin.email },
                { merge: true },
            );
        });
        await batch.commit();
    }

    const created = valid.filter((doc) => !existing.has(doc.id)).length;
    const updated = valid.length - created;

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "content.idea.bulk_import",
        targetType: "idea",
        targetId: "bulk",
        targetLabel: `${valid.length} cards`,
        after: { created, updated, rejected: rejected.length, status },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, created, updated, rejected });
});
