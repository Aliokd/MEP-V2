"use client";

import { doc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
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

/** A recording placed in the flow. Matches Create's `AudioNote`. */
interface AudioNote {
    id: string;
    url: string;
    title: string;
    duration: number;
    groupId: string | null;
    phraseId?: string | null;
    createdAt?: number;
}

export interface CanvasAudio {
    blob: Blob;
    /** Length in seconds. Read from the recorder's timer, not the file: a webm
     *  from MediaRecorder reports Infinity until it has been seeked to the end. */
    seconds: number;
    title: string;
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
    /**
     * A recording to place in the flow alongside the lines. Uploaded to Storage
     * first — a blob: URL is meaningless to anyone but the tab that made it, so
     * writing one into the document would produce a card that plays for the
     * person who created it and is silent forever after.
     */
    audio?: CanvasAudio;
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

    /*
     * The recording, if there is one. It gets an empty phrase of its own to hold
     * its slot in the flow — that is how Create positions every non-lyric card,
     * audio included — and the upload has to land before the document is written,
     * or the canvas would reference a file that is not there yet.
     *
     * A failed upload is not a failed canvas: the words still travel, and losing
     * the take silently is better than throwing the whole thing away. It is only
     * reported to the console, the same as every other upload path here.
     */
    const audioNotes: AudioNote[] = [];
    let audioUrl: string | undefined;
    if (draft.audio) {
        const recId = `${stamp}`;
        const audioPhraseId = `p-${stamp}-audio`;
        try {
            const fileRef = storageRef(storage, `users/${uid}/recordings/${noteId}_RecId_${recId}.webm`);
            await uploadBytes(fileRef, draft.audio.blob);
            audioUrl = await getDownloadURL(fileRef);
            phrases.push({ id: audioPhraseId, text: '', groupId: group ? group.id : null });
            audioNotes.push({
                id: recId,
                url: audioUrl,
                title: draft.audio.title,
                duration: draft.audio.seconds,
                groupId: null,
                phraseId: audioPhraseId,
                createdAt: stamp,
            });
        } catch (err) {
            console.error('Error uploading the take; the canvas is written without it:', err);
        }
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
        ...(audioNotes.length ? { audioNotes, audioUrl } : {}),
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
