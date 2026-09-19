import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/apiAuth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { getPaddle, type StoredBilling } from "@/lib/paddle/server";
import { isEntitled } from "@/lib/paddle/config";
import { sanitizeOffboardingInput, type OffboardingRecord } from "@/lib/offboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A person deleting their own account.
 *
 * Everything that is theirs alone goes: the account, the profile and its
 * public mirror, the songs nobody else is on, their side of every connection,
 * the Mind Power record, the verification request. What other people still
 * rely on stays and loses its author instead: a song written with a
 * co-writer keeps existing for the co-writer, a community post keeps its
 * replies under "Deleted account". The subscription is cancelled at once so
 * nothing is ever charged to an account that no longer exists.
 *
 * The reasons they gave are kept in `offboarding`, with the email, so the
 * console can see who left and why. That record is the one thing about the
 * person that outlives the account, and it is the business record of the
 * departure rather than a copy of anything they made.
 *
 * Order matters: the record and the cancellation first, while the account
 * can still be read; the Auth user last, so a failure halfway leaves an
 * account that can try again rather than a ghost that cannot sign in to.
 */
export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    const { uid } = auth;

    const throttled = rateLimitGuard(request, "account-delete", uid);
    if (throttled) return throttled;

    let body: Record<string, unknown> = {};
    try {
        const parsed: unknown = await request.json();
        if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
        // Leaving without a word is allowed.
    }
    const { reasons, note } = sanitizeOffboardingInput(body);

    const userRef = adminDb.doc(`users/${uid}`);
    const snap = await userRef.get();
    const data = snap.data() ?? {};
    const billing = (data.billing ?? {}) as Partial<StoredBilling>;

    const ownedSongs = await adminDb.collection("projects").where("ownerId", "==", uid).get();

    // 1. The subscription. Immediately, not at period end: there will be no
    //    account for the remaining days to belong to.
    let subscriptionCancelled: boolean | null = null;
    if (billing.paddleSubscriptionId && isEntitled(billing.subscriptionStatus)) {
        const paddle = getPaddle();
        if (paddle) {
            try {
                await paddle.subscriptions.cancel(billing.paddleSubscriptionId, { effectiveFrom: "immediately" });
                subscriptionCancelled = true;
            } catch (error: unknown) {
                // Logged loudly and recorded on the offboarding row: a
                // subscription left running after a deletion is the one
                // outcome here that costs the person money.
                console.error("[account/delete] Paddle cancel failed for", uid, error instanceof Error ? error.message : error);
                subscriptionCancelled = false;
            }
        } else {
            subscriptionCancelled = false;
        }
    }

    // 2. The record of the departure.
    const createdAt = Date.parse(typeof data.createdAt === "string" ? data.createdAt : "");
    const record: OffboardingRecord = {
        kind: "delete",
        uid,
        email: typeof data.email === "string" ? data.email : null,
        name: typeof data.name === "string" ? data.name : null,
        locale: typeof data.locale === "string" ? data.locale : null,
        tier: typeof data.tier === "string" ? data.tier : null,
        plan: billing.plan ?? null,
        subscriptionStatus: billing.subscriptionStatus ?? null,
        accountAgeDays: Number.isNaN(createdAt) ? null : Math.floor((Date.now() - createdAt) / 86_400_000),
        songs: ownedSongs.size,
        reasons,
        note,
        subscriptionCancelled,
        createdAt: new Date().toISOString(),
    };
    await adminDb.collection("offboarding").add(record);

    // 3. What they made, sorted into "theirs alone" and "shared".
    let songsDeleted = 0;
    let songsLeftToCowriters = 0;
    for (const doc of ownedSongs.docs) {
        const collaborators = Array.isArray(doc.data().collaborators) ? doc.data().collaborators : [];
        const others = collaborators.filter((c: unknown) => typeof c === "string" && c !== uid);
        if (others.length === 0) {
            // recursiveDelete takes the subcollections (comments, presence,
            // signaling) with it; a plain delete would orphan them.
            await adminDb.recursiveDelete(doc.ref);
            songsDeleted += 1;
        } else {
            await doc.ref.update({ ownerName: "Deleted account", ownerDeletedAt: FieldValue.serverTimestamp() });
            songsLeftToCowriters += 1;
        }
    }

    // Songs they co-wrote for someone else keep going without them.
    const cowritten = await adminDb.collection("projects").where("collaborators", "array-contains", uid).get();
    await commitInChunks(cowritten.docs.map((doc) => (batch) => batch.update(doc.ref, { collaborators: FieldValue.arrayRemove(uid) })));

    // Community posts stay for the people who answered them.
    const posts = await adminDb.collection("connect_posts").where("authorId", "==", uid).get();
    await commitInChunks(
        posts.docs.map((doc) => (batch) =>
            batch.update(doc.ref, {
                authorId: null,
                author: "Deleted account",
                avatarFallback: "–",
                anonymizedAt: FieldValue.serverTimestamp(),
            }),
        ),
    );

    // 4. Their side of every connection, in both directions.
    const [sent, received] = await Promise.all([
        adminDb.collection("connection_requests").where("fromUid", "==", uid).get(),
        adminDb.collection("connection_requests").where("toUid", "==", uid).get(),
    ]);
    await commitInChunks([...sent.docs, ...received.docs].map((doc) => (batch) => batch.delete(doc.ref)));

    // 5. The single documents keyed by uid. Best effort each: one that does
    //    not exist is not a failure.
    await commitInChunks(
        ["publicProfiles", "verification_requests", "onboarding_codes"].map((collection) => (batch) =>
            batch.delete(adminDb.collection(collection).doc(uid)),
        ),
    );

    // 6. The account document and everything under it (the Mind Power record).
    await adminDb.recursiveDelete(userRef);

    // 7. The sign-in itself, last.
    try {
        await adminAuth.deleteUser(uid);
    } catch (error: unknown) {
        const code = (error as { code?: string })?.code;
        if (code !== "auth/user-not-found") {
            console.error("[account/delete] Auth deletion failed after the data was removed:", uid, error);
            return NextResponse.json({ error: "auth-delete-failed" }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, songsDeleted, songsLeftToCowriters, postsAnonymized: posts.size });
}

/** Firestore takes at most 500 writes per batch; this feeds them through in slices. */
async function commitInChunks(writes: Array<(batch: FirebaseFirestore.WriteBatch) => void>): Promise<void> {
    for (let i = 0; i < writes.length; i += 400) {
        const batch = adminDb.batch();
        writes.slice(i, i + 400).forEach((write) => write(batch));
        await batch.commit();
    }
}
