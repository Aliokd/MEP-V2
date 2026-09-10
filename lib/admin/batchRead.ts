import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";

/** getAll takes a bounded argument list, so reads go out in chunks this size. */
const READ_CHUNK = 300;

/**
 * Reads many documents by id in as few round trips as possible.
 *
 * Missing documents are simply absent from the map rather than present and
 * empty, so a caller can tell "no such document" from "a document with nothing
 * in it" — the difference between an account that never had a profile and one
 * whose profile is blank.
 */
export async function readDocs(
    collection: string,
    ids: string[],
): Promise<Map<string, FirebaseFirestore.DocumentData>> {
    const found = new Map<string, FirebaseFirestore.DocumentData>();
    const unique = [...new Set(ids.filter(Boolean))];

    for (let i = 0; i < unique.length; i += READ_CHUNK) {
        const refs = unique.slice(i, i + READ_CHUNK).map((id) => adminDb.collection(collection).doc(id));
        const snaps = await adminDb.getAll(...refs);
        snaps.forEach((snap) => { if (snap.exists) found.set(snap.id, snap.data() || {}); });
    }

    return found;
}
