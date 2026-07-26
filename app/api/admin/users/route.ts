import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

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
        if (byId.exists) return NextResponse.json({ users: [shape(byId)], exact: true });

        if (q.includes("@")) {
            const snap = await adminDb.collection("users").where("email", "==", q.toLowerCase()).limit(limit).get();
            return NextResponse.json({ users: snap.docs.map(shape), exact: true });
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
        return NextResponse.json({ users: [...merged.values()], exact: false });
    }

    let query: FirebaseFirestore.Query = adminDb.collection("users");

    if (tier) query = query.where("tier", "==", tier);

    if (filter === "trial-expiring") {
        const now = Date.now();
        query = query
            .where("billing.trialEndsAt", ">=", new Date(now).toISOString())
            .where("billing.trialEndsAt", "<=", new Date(now + 7 * DAY).toISOString())
            .orderBy("billing.trialEndsAt", "asc");
    } else if (filter === "inactive") {
        query = query
            .where("lastActiveAt", "<=", new Date(Date.now() - 30 * DAY).toISOString())
            .orderBy("lastActiveAt", "desc");
    } else {
        query = query.orderBy("createdAt", "desc");
    }

    const snap = await query.limit(limit).get();
    return NextResponse.json({ users: snap.docs.map(shape), exact: false });
});
