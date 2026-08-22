"use client";

import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeLocalStorageSetItem } from '@/lib/storage';

/**
 * Creating a canvas from somewhere that is not the Create page.
 *
 * Create owns `handleCreateNote`, but it is a closure inside that page's
 * component — unreachable from Practice, Learn or Connect. Rather than have
 * each caller hand-roll the document (Connect's duplicate did, and drifted:
 * a `n-dup-` id that the profile's createdAt parser cannot read, and a
 * locale-formatted `updatedAt` where every other path writes ISO), the shape
 * lives here once.
 */

/** A single lyric line. Matches Create's `Phrase`. */
interface Phrase {
    id: string;
    text: string;
    groupId: string | null;
}

/** A named section. Matches Create's `VerseGroup`. */
interface VerseGroup {
    id: string;
    name: string;
}

export interface CanvasDraft {
    title: string;
    /** One entry per lyric line, in order. Blank entries are dropped. */
    lines: string[];
    /**
     * Wraps the lines in a named section — "Verse 1", "Chorus" — so they land
     * in the canvas as a block rather than as loose lines. Omit for loose lines.
     */
    sectionName?: string;
}

/**
 * Writes a new project and returns its id, or null if it could not be written.
 *
 * The id format is load-bearing: the profile derives a song's creation date by
 * parsing the epoch out of `n-<ms>` (app/platform/profile/useMySongs.ts), so
 * anything else shows up there dateless.
 */
export async function createCanvasFromLines(
    uid: string | null | undefined,
    draft: CanvasDraft,
): Promise<string | null> {
    if (!uid) return null;

    const stamp = Date.now();
    const noteId = `n-${stamp}`;

    const lines = draft.lines.map(l => l.trim()).filter(l => l !== '');
    const group: VerseGroup | null = draft.sectionName
        ? { id: `v-${stamp}`, name: draft.sectionName }
        : null;

    // A section with real lines in it needs no placeholder phrase — Create only
    // adds one to hold an empty section open (cleanupAndEnsurePlaceholders).
    const phrases: Phrase[] = lines.map((text, i) => ({
        id: `p-${stamp}-${i}`,
        text,
        groupId: group ? group.id : null,
    }));

    // Never write a canvas with no line to type on.
    if (phrases.length === 0) {
        phrases.push({ id: `p-${stamp}-0`, text: '', groupId: group ? group.id : null });
    }

    const project = {
        id: noteId,
        title: draft.title,
        // `content` is the derived newline-joined mirror of `phrases`; Create
        // keeps both and falls back to it when `phrases` is empty.
        content: phrases.map(p => p.text).join('\n'),
        folderId: null,
        updatedAt: new Date(stamp).toISOString(),
        ownerId: uid,
        collaborators: [] as string[],
        verses: group ? [group] : [],
        phrases,
    };

    try {
        await setDoc(doc(db, 'projects', noteId), project);
    } catch (err) {
        console.error('Error creating canvas:', err);
        return null;
    }

    /*
     * Create paints from this cache before Firestore answers, so seeding it is
     * what makes the new canvas openable on arrival rather than a beat later.
     * It is also what `?noteId=` needs: that effect only opens an id already
     * present in `notes`.
     */
    try {
        const cacheKey = `veinote-create-notes-${uid}`;
        const raw = localStorage.getItem(cacheKey);
        const cached: unknown = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(cached) ? cached : [];
        safeLocalStorageSetItem(cacheKey, JSON.stringify([project, ...list]));
    } catch (e) {
        console.error('Error seeding the canvas cache:', e);
    }

    // Belt and braces with `?noteId=`: the query param is dropped if the note
    // has not loaded yet, this key is re-checked when the snapshot lands.
    safeLocalStorageSetItem(`veinote-selected-note-id-${uid}`, noteId);

    return noteId;
}
