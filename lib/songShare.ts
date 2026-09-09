"use client";

/**
 * Sharing a song: a link to /song/<id>.
 *
 * Share opens that page rather than only copying its address, so the person
 * sharing sees the thing they are about to send before they send it — a link
 * copied with nothing to show for it gives no way to check what is on the
 * other end of it.
 */

export type CopyOutcome = 'copied' | 'failed';

export function buildSongShareUrl(postId: string): string {
    return `${window.location.origin}/song/${encodeURIComponent(postId)}`;
}

/**
 * Opens the shared page in its own tab.
 *
 * Call this straight from the click, before anything is awaited: a window
 * opened after a promise settles is no longer attributable to the press and
 * browsers block it as a popup.
 */
export function openSongPreview(postId: string): void {
    window.open(buildSongShareUrl(postId), '_blank', 'noopener,noreferrer');
}

export async function copySongLink(postId: string): Promise<CopyOutcome> {
    try {
        await navigator.clipboard.writeText(buildSongShareUrl(postId));
        return 'copied';
    } catch {
        return 'failed';
    }
}
