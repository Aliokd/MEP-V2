import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/** Counts docs matching a query without reading them. */
async function count(
    build: (col: FirebaseFirestore.CollectionReference) => FirebaseFirestore.Query,
    collection: string,
): Promise<number> {
    try {
        const snap = await build(adminDb.collection(collection)).count().get();
        return snap.data().count;
    } catch (err) {
        // A missing collection or missing composite index shouldn't take the
        // whole dashboard down — the tile just reads 0 and the reason is logged.
        console.warn(`[overview] count failed on ${collection}:`, (err as Error).message);
        return 0;
    }
}

export const GET = withAdmin("overview.read", async () => {
    const now = Date.now();
    const since = (days: number) => new Date(now - days * DAY).toISOString();

    // `users` and `projects` store their timestamps as ISO strings (see
    // lib/userProfile.ts) while connect_posts store epoch milliseconds. Both
    // forms appear below, and comparing the wrong one against a field matches
    // nothing without raising anything — a tile that reads 0 rather than fails.
    const [
        usersTotal,
        signups24h,
        signups7d,
        signups30d,
        active24h,
        active7d,
        active30d,
        trialUsers,
        proUsers,
        maxUsers,
        projectsTotal,
        projects7d,
        postsTotal,
        posts7d,
        feedbackOpen,
        feedbackNew,
        supportOpen,
        supportNew,
        reportsOpen,
        reportsUrgent,
        moderatedPosts,
        sanctionsActive,
    ] = await Promise.all([
        count((c) => c, "users"),
        count((c) => c.where("createdAt", ">=", since(1)), "users"),
        count((c) => c.where("createdAt", ">=", since(7)), "users"),
        count((c) => c.where("createdAt", ">=", since(30)), "users"),
        count((c) => c.where("lastActiveAt", ">=", since(1)), "users"),
        count((c) => c.where("lastActiveAt", ">=", since(7)), "users"),
        count((c) => c.where("lastActiveAt", ">=", since(30)), "users"),
        count((c) => c.where("tier", "==", "trial"), "users"),
        count((c) => c.where("tier", "==", "pro"), "users"),
        count((c) => c.where("tier", "==", "max"), "users"),
        count((c) => c, "projects"),
        // Projects carry `updatedAt` and no `createdAt` — a song is created in the
        // browser and only reaches Firestore once it is saved, so there is no
        // creation instant to record. This counts songs *touched* this week, and
        // the tile says so. The previous version filtered on a field that does
        // not exist, which is not an error in Firestore: it silently matched
        // nothing, so the tile read +0 no matter how much writing was going on.
        count((c) => c.where("updatedAt", ">=", since(7)), "projects"),
        count((c) => c, "connect_posts"),
        count((c) => c.where("createdAt", ">=", now - 7 * DAY), "connect_posts"),
        count((c) => c.where("status", "in", ["new", "open", "pending"]), "user_feedback"),
        count((c) => c.where("status", "==", "new"), "user_feedback"),
        count((c) => c.where("status", "in", ["new", "open", "pending"]), "support_tickets"),
        count((c) => c.where("status", "==", "new"), "support_tickets"),
        count((c) => c.where("status", "==", "open"), "reports"),
        count((c) => c.where("status", "==", "open").where("priority", "==", "urgent"), "reports"),
        count((c) => c, "moderated_posts"),
        count((c) => c.where("active", "==", true), "user_sanctions"),
    ]);

    // Trials about to lapse — the most actionable retention signal on the page.
    let trialsExpiring7d = 0;
    try {
        const snap = await adminDb
            .collection("users")
            .where("billing.trialEndsAt", ">=", new Date(now).toISOString())
            .where("billing.trialEndsAt", "<=", new Date(now + 7 * DAY).toISOString())
            .count()
            .get();
        trialsExpiring7d = snap.data().count;
    } catch (err) {
        console.warn("[overview] trial expiry count failed:", (err as Error).message);
    }

    const recentAudit = await adminDb
        .collection("admin_audit_log")
        .orderBy("createdAt", "desc")
        .limit(8)
        .get()
        .then((snap) =>
            snap.docs.map((doc) => {
                const d = doc.data();
                return {
                    id: doc.id,
                    action: d.action,
                    actorEmail: d.actorEmail,
                    targetType: d.targetType,
                    targetLabel: d.targetLabel || d.targetId,
                    createdAt: d.createdAt?.toMillis?.() ?? null,
                };
            }),
        )
        .catch(() => []);

    return NextResponse.json({
        generatedAt: now,
        users: {
            total: usersTotal,
            signups24h,
            signups7d,
            signups30d,
            active24h,
            active7d,
            active30d,
            trial: trialUsers,
            pro: proUsers,
            max: maxUsers,
            trialsExpiring7d,
        },
        content: { projectsTotal, projects7d, postsTotal, posts7d },
        inbox: {
            open: feedbackOpen + supportOpen,
            unread: feedbackNew + supportNew,
            feedbackOpen,
            supportOpen,
        },
        moderation: { reportsOpen, reportsUrgent, moderatedPosts, sanctionsActive },
        recentAudit,
    });
});
