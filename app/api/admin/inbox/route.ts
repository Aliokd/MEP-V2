import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { INBOX_COLLECTION, type InboxSource } from "@/lib/inbox";

export const dynamic = "force-dynamic";

const SOURCES: InboxSource[] = ["feedback", "support"];

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

/**
 * Lists inbox threads across both collections as one queue.
 *
 * Feedback and support live in separate collections (different rules, different
 * retention), so the merge happens here: each side is fetched with the same
 * filters, then sorted together and paginated by cursor timestamp.
 */
export const GET = withAdmin("inbox.read", async (request) => {
    const url = new URL(request.url);
    const sourceParam = url.searchParams.get("source");
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const assignee = url.searchParams.get("assignee");
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    const before = Number(url.searchParams.get("before")) || null;
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    const sources = sourceParam && SOURCES.includes(sourceParam as InboxSource)
        ? [sourceParam as InboxSource]
        : SOURCES;

    const perSource = await Promise.all(
        sources.map(async (source) => {
            let query: FirebaseFirestore.Query = adminDb.collection(INBOX_COLLECTION[source]);

            if (status === "unresolved") {
                query = query.where("status", "in", ["new", "open", "pending"]);
            } else if (status) {
                query = query.where("status", "==", status);
            }
            if (priority) query = query.where("priority", "==", priority);
            if (assignee === "unassigned") {
                query = query.where("assigneeUid", "==", null);
            } else if (assignee) {
                query = query.where("assigneeUid", "==", assignee);
            }

            query = query.orderBy("lastMessageAt", "desc");
            if (before) query = query.startAfter(new Date(before));

            // Over-fetch so the merged, search-filtered result can still fill a page.
            const snap = await query.limit(limit).get();
            return snap.docs.map((doc) => {
                const d = doc.data();
                return {
                    id: doc.id,
                    source,
                    userId: d.userId,
                    userName: d.userName,
                    userEmail: d.userEmail,
                    verified: d.verified === true,
                    subject: d.subject,
                    // Enough to preview in the list without shipping whole message bodies.
                    excerpt: (d.message || "").slice(0, 160),
                    status: d.status || "new",
                    priority: d.priority || "normal",
                    category: d.category || null,
                    tags: d.tags || [],
                    assigneeUid: d.assigneeUid || null,
                    assigneeName: d.assigneeName || null,
                    // Who marked it done — shown on the row so the queue says who
                    // dealt with each thread, not just that something happened.
                    resolvedByName: d.resolvedByName || null,
                    hasAttachment: Boolean(d.attachmentUrl),
                    replyCount: d.replyCount || 0,
                    locale: d.locale || null,
                    createdAt: toMillis(d.createdAt),
                    lastMessageAt: toMillis(d.lastMessageAt) ?? toMillis(d.createdAt),
                    firstResponseAt: toMillis(d.firstResponseAt),
                    resolvedAt: toMillis(d.resolvedAt),
                };
            });
        }),
    );

    let threads = perSource.flat();

    if (search) {
        threads = threads.filter((t) =>
            [t.subject, t.excerpt, t.userName, t.userEmail]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(search)),
        );
    }

    threads.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    const page = threads.slice(0, limit);

    return NextResponse.json({
        threads: page,
        nextCursor: page.length === limit ? page[page.length - 1].lastMessageAt : null,
    });
});
