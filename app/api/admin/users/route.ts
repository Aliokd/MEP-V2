import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

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

function shape(doc: FirebaseFirestore.DocumentSnapshot) {
    const d = doc.data() || {};
    return {
        uid: doc.id,
        name: d.name || null,
        email: d.email || null,
        tier: d.tier || null,
        locale: d.locale || null,
        createdAt: toMillis(d.createdAt),
        lastActiveAt: toMillis(d.lastActiveAt),
        plan: d.billing?.plan || null,
        subscriptionStatus: d.billing?.subscriptionStatus || null,
        trialEndsAt: d.billing?.trialEndsAt || null,
        sanctioned: Boolean(d.sanction?.active),
    };
}

type ShapedUser = ReturnType<typeof shape> & { lastSignInAt?: number | null; activeAt?: number | null };

/**
 * Folds Firebase Auth's last-sign-in into each row.
 *
 * `lastActiveAt` in Firestore only began being maintained when the heartbeat was
 * added, so on its own it reports the signup date for everyone who has not been
 * back since. Auth has recorded a real sign-in time for every account since the
 * day it was made, which is exactly the question the column is asked. Taking the
 * later of the two means the answer is right for old accounts immediately and
 * gets finer for anyone who visits, without a backfill.
 *
 * getUsers takes 100 identifiers per call, so a page costs one round trip and
 * the wider recent-activity scan costs a handful.
 */
async function withEffectiveActivity(users: ShapedUser[]): Promise<ShapedUser[]> {
    const signInByUid = new Map<string, number | null>();

    for (let i = 0; i < users.length; i += 100) {
        const chunk = users.slice(i, i + 100).map((u) => ({ uid: u.uid }));
        try {
            const result = await adminAuth.getUsers(chunk);
            result.users.forEach((record) => {
                const at = record.metadata.lastSignInTime ? Date.parse(record.metadata.lastSignInTime) : null;
                signInByUid.set(record.uid, Number.isNaN(at as number) ? null : at);
            });
        } catch (err) {
            // A directory that loses its activity column is better than one that
            // fails to load, so this degrades to the Firestore value alone.
            console.warn("[users] auth lookup failed:", (err as Error).message);
        }
    }

    return users.map((u) => {
        const lastSignInAt = signInByUid.get(u.uid) ?? null;
        return {
            ...u,
            lastSignInAt,
            activeAt: Math.max(u.lastActiveAt ?? 0, lastSignInAt ?? 0) || null,
        };
    });
}

/**
 * User directory.
 *
 * Firestore has no substring search, so `q` is resolved in the order a support
 * person actually types: a uid pastes exactly, an address with "@" matches the
 * email field exactly, anything else runs a prefix range on name then email.
 * Anything fuzzier than that needs a search index — noted rather than faked.
 */
export const GET = withAdmin("users.read", async (request) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const tier = url.searchParams.get("tier");
    const filter = url.searchParams.get("filter");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    if (q) {
        const byId = await adminDb.collection("users").doc(q).get();
        if (byId.exists) {
            return NextResponse.json({ users: await withEffectiveActivity([shape(byId)]), exact: true });
        }

        if (q.includes("@")) {
            // Two attempts, because the stored case is not consistent. Accounts
            // made in the console are lowercased on the way in; accounts that
            // signed themselves up keep whatever Firebase Auth returned, which
            // is the case the person typed at registration. An equality match is
            // case-sensitive, so a single lowercased lookup silently fails to
            // find anyone whose address was stored with a capital in it.
            const lowered = q.toLowerCase();
            let snap = await adminDb.collection("users").where("email", "==", lowered).limit(limit).get();
            if (snap.empty && q !== lowered) {
                snap = await adminDb.collection("users").where("email", "==", q).limit(limit).get();
            }
            return NextResponse.json({ users: await withEffectiveActivity(snap.docs.map(shape)), exact: true });
        }

        // U+F8FF sorts above any ordinary character, so [q, q + U+F8FF] is a
        // prefix range. Built with fromCharCode to keep an invisible
        // private-use character out of the source.
        const end = q + String.fromCharCode(0xf8ff);
        const [byName, byEmail] = await Promise.all([
            adminDb.collection("users").orderBy("name").startAt(q).endAt(end).limit(limit).get(),
            adminDb.collection("users").orderBy("email").startAt(q.toLowerCase()).endAt(end.toLowerCase()).limit(limit).get(),
        ]);

        const merged = new Map<string, ReturnType<typeof shape>>();
        [...byName.docs, ...byEmail.docs].forEach((doc) => merged.set(doc.id, shape(doc)));
        return NextResponse.json({ users: await withEffectiveActivity([...merged.values()]), exact: false });
    }

    let query: FirebaseFirestore.Query = adminDb.collection("users");

    if (tier) query = query.where("tier", "==", tier);

    // Which field the chosen order sorts on. Firestore drops any document that
    // does not carry the ordering field — it is not an error and nothing is
    // reported, the row simply is not in the answer. That is counted below so
    // the console can say who it is not showing instead of quietly showing less.
    let sortField = "createdAt";

    if (filter === "trial-expiring") {
        const now = Date.now();
        sortField = "billing.trialEndsAt";
        query = query
            .where("billing.trialEndsAt", ">=", new Date(now).toISOString())
            .where("billing.trialEndsAt", "<=", new Date(now + 7 * DAY).toISOString())
            .orderBy("billing.trialEndsAt", "asc");
    } else if (filter === "inactive") {
        sortField = "lastActiveAt";
        query = query
            .where("lastActiveAt", "<=", new Date(Date.now() - 30 * DAY).toISOString())
            .orderBy("lastActiveAt", "desc");
    } else if (filter === "recent") {
        // Ordered in memory, not by Firestore. `lastActiveAt` only started being
        // maintained recently, so ordering on it would rank everyone by the day
        // they signed up and call it activity. Firebase Auth has recorded a real
        // last-sign-in for every account since the beginning, and withEffectiveActivity
        // below folds it in — so this scans a slice and sorts on the truth.
        sortField = "createdAt";
        query = query.orderBy("createdAt", "desc");
    } else {
        query = query.orderBy("createdAt", "desc");
    }

    // The recent-activity order needs a pool bigger than one page to sort, since
    // the most recently active person may be one of the oldest accounts.
    const scanCap = filter === "recent" ? Math.max(limit, 500) : limit;
    const snap = await query.limit(scanCap).get();

    // Two aggregations, both cheap: how many accounts exist, and how many carry
    // the field this order needs. The difference is exactly the set of people
    // this view cannot show.
    const [total, sortable] = await Promise.all([
        adminDb.collection("users").count().get().then((s) => s.data().count).catch(() => 0),
        adminDb.collection("users").orderBy(sortField).count().get().then((s) => s.data().count).catch(() => 0),
    ]);

    let users = await withEffectiveActivity(snap.docs.map(shape));

    if (filter === "recent") {
        users = users
            .sort((a, b) => (b.activeAt ?? 0) - (a.activeAt ?? 0))
            .slice(0, limit);
    }

    return NextResponse.json({
        users,
        exact: false,
        total,
        hiddenBySort: Math.max(0, total - sortable),
        sortField,
        // True when the recent-activity order could not see every account.
        partialScan: filter === "recent" && total > snap.size,
    });
});
