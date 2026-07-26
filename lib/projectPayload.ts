/**
 * Keeps a project document inside Firestore's size limit.
 *
 * Firestore rejects any document over 1 MiB. Images and documents were being
 * stored as base64 data URLs inside the project document, and a 1400px JPEG is
 * roughly 200-500 KB before base64 inflates it by a third — so two of them push
 * the document over the limit. Every write after that point failed, and because
 * the rejection was only logged, the user's lyrics silently stopped saving and
 * were gone on the next refresh.
 *
 * Media belongs in Firebase Storage (which is already how audio is handled), and
 * new uploads go there. This module is the safety net for everything else:
 * projects created before that change, and any future payload that grows
 * unexpectedly. Losing an inline image preview is recoverable; losing the words
 * someone wrote is not, so when something has to give, the media gives.
 */

/** Firestore's hard limit is 1 MiB. Leave room for the field-name overhead and
 *  metadata Firestore adds on top of the values we can measure. */
const FIRESTORE_MAX_BYTES = 1_048_576;
const SAFE_BYTES = 900_000;

/** UTF-8 byte length, which is what Firestore actually counts. */
export function byteSize(value: unknown): number {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

function isInlineData(url: unknown): url is string {
    return typeof url === 'string' && url.startsWith('data:');
}

/**
 * Returns a payload guaranteed to fit, dropping inline media only if it has to.
 *
 * Media already uploaded to Storage is an https URL and costs almost nothing, so
 * it is never touched. Only base64 blobs are candidates, largest first, and the
 * entry itself is kept — just without its inline data — so the card still exists
 * and can be re-pointed at a Storage URL later rather than vanishing.
 */
export function fitToFirestore<T extends Record<string, any>>(
    payload: T,
): { payload: T; strippedMedia: number; bytes: number } {
    let bytes = byteSize(payload);
    if (bytes <= SAFE_BYTES) return { payload, strippedMedia: 0, bytes };

    const next: Record<string, any> = { ...payload };
    let strippedMedia = 0;

    // Largest first, so the fewest possible previews are sacrificed.
    const candidates: Array<{ field: string; index: number; size: number }> = [];
    for (const field of ['images', 'documents', 'audioNotes']) {
        const list = next[field];
        if (!Array.isArray(list)) continue;
        list.forEach((item: any, index: number) => {
            if (isInlineData(item?.url)) {
                candidates.push({ field, index, size: item.url.length });
            }
        });
    }
    candidates.sort((a, b) => b.size - a.size);

    for (const { field, index } of candidates) {
        if (bytes <= SAFE_BYTES) break;
        next[field] = [...next[field]];
        next[field][index] = { ...next[field][index], url: '', inlineDropped: true };
        strippedMedia++;
        bytes = byteSize(next);
    }

    return { payload: next as T, strippedMedia, bytes };
}

/** True when a payload cannot be saved even after stripping every inline blob. */
export function exceedsFirestoreLimit(bytes: number): boolean {
    return bytes > FIRESTORE_MAX_BYTES;
}
