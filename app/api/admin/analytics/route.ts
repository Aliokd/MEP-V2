import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

async function safeCount(query: FirebaseFirestore.Query): Promise<number> {
    try {
        return (await query.count().get()).data().count;
    } catch (err) {
        console.warn("[analytics] count failed:", (err as Error).message);
        return 0;
    }
}

/**
 * Growth view: the signup → first song → first share → paid funnel, plus weekly
 * signup and retention cohorts.
 *
 * Everything is derived from documents that already exist — no event pipeline.
 * That makes "first song" mean "owns at least one project", which is close
 * enough to be useful and honest about what it measures.
 */
export const GET = withAdmin("analytics.read", async (request) => {
    const url = new URL(request.url);
    const windowDays = Math.min(Number(url.searchParams.get("days")) || 30, 180);
    const now = Date.now();
    const since = new Date(now - windowDays * DAY).toISOString();

    const users = await adminDb.collection("users").where("createdAt", ">=", since).get();

    const cohortUids = users.docs.map((doc) => doc.id);
    const cohortSize = cohortUids.length;

    // Firestore caps `in` at 30 values, so ownership is resolved by scanning the
    // projects and posts created in the window and intersecting with the cohort.
    const cohortSet = new Set(cohortUids);

    const [projectsSnap, postsSnap] = await Promise.all([
        adminDb.collection("projects").select("ownerId", "audioNotes").get(),
        adminDb.collection("connect_posts").select("authorId").get(),
    ]);

    const withSong = new Set<string>();
    // Recording depth comes from the same scan: a project whose audioNotes
    // array is non-empty means its owner has actually pressed REC, which is a
    // very different level of commitment than typing a line of lyrics.
    const withRecording = new Set<string>();
    projectsSnap.docs.forEach((doc) => {
        const d = doc.data();
        const ownerId = d.ownerId;
        if (!ownerId || !cohortSet.has(ownerId)) return;
        withSong.add(ownerId);
        if (Array.isArray(d.audioNotes) && d.audioNotes.length > 0) withRecording.add(ownerId);
    });

    const withShare = new Set<string>();
    postsSnap.docs.forEach((doc) => {
        const authorId = doc.data().authorId;
        if (authorId && cohortSet.has(authorId)) withShare.add(authorId);
    });

    let paid = 0;
    let onboarded = 0;
    // Came back on a later day — the cheapest honest signal that the first
    // visit wasn't the last. Distinct from the cohort panel's 7-day retention:
    // this catches the day-2 return that pre-launch products live or die by.
    let returned = 0;
    const byLocale: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    const weekly: Record<string, { signups: number; retained: number }> = {};

    users.docs.forEach((doc) => {
        const d = doc.data();
        if (d.tier === "pro" || d.tier === "max") paid += 1;
        if (d.answers && Object.keys(d.answers).length > 0) onboarded += 1;
        {
            const created = Date.parse(d.createdAt || "");
            const lastActive = Date.parse(d.lastActiveAt || "");
            if (!Number.isNaN(created) && !Number.isNaN(lastActive) && lastActive - created > DAY) {
                returned += 1;
            }
        }

        const locale = d.locale || "unknown";
        byLocale[locale] = (byLocale[locale] || 0) + 1;
        const tier = d.tier || "none";
        byTier[tier] = (byTier[tier] || 0) + 1;

        const created = Date.parse(d.createdAt || "");
        if (!Number.isNaN(created)) {
            const weekStart = new Date(created);
            weekStart.setUTCHours(0, 0, 0, 0);
            weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
            const key = weekStart.toISOString().slice(0, 10);
            weekly[key] = weekly[key] || { signups: 0, retained: 0 };
            weekly[key].signups += 1;

            // Retained = active at least a week after signing up.
            const lastActive = Date.parse(d.lastActiveAt || "");
            if (!Number.isNaN(lastActive) && lastActive - created > 7 * DAY) {
                weekly[key].retained += 1;
            }
        }
    });

    // Who was in the app most recently, name and all — the roster the funnel
    // bars can't show. Ordering on lastActiveAt silently excludes docs missing
    // the field (Firestore omits docs without the orderBy field), which is the
    // right behaviour for a list titled "recently active".
    const recentSnap = await adminDb
        .collection("users")
        .orderBy("lastActiveAt", "desc")
        .limit(12)
        .select("name", "email", "tier", "lastActiveAt")
        .get();
    const recentlyActive = recentSnap.docs.map((doc) => {
        const d = doc.data();
        return {
            uid: doc.id,
            name: d.name || null,
            email: d.email || null,
            tier: d.tier || null,
            lastActiveAt: d.lastActiveAt || null,
        };
    });

    const [totalUsers, totalProjects, totalPosts] = await Promise.all([
        safeCount(adminDb.collection("users")),
        safeCount(adminDb.collection("projects")),
        safeCount(adminDb.collection("connect_posts")),
    ]);

    return NextResponse.json({
        windowDays,
        funnel: [
            { step: "Signed up", count: cohortSize },
            { step: "Completed onboarding", count: onboarded },
            { step: "Started a song", count: withSong.size },
            { step: "Recorded a take", count: withRecording.size },
            { step: "Came back another day", count: returned },
            { step: "Shared to Connect", count: withShare.size },
            { step: "Paid", count: paid },
        ],
        recentlyActive,
        cohorts: Object.entries(weekly)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, v]) => ({ week, ...v })),
        byLocale,
        byTier,
        totals: { users: totalUsers, projects: totalProjects, posts: totalPosts },
    });
});
