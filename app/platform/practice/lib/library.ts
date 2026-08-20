"use client";

import { useEffect, useState } from 'react';
import { fetchPracticeSongs } from '@/lib/contentClient';
import { sortSections } from '@/lib/practiceLibrary';
import { PRACTICE_SONGS, type PracticeSong } from '../data/practiceSongs';

/**
 * The song library Practice 1 works through.
 *
 * Songs are authored in the admin console — audio, cover and the section map —
 * and the bundled list in ../data/practiceSongs.ts is the fallback. Until now
 * that module *was* the library: the CMS collection existed, the console wrote
 * to it, and nothing on the platform ever read it, so editing a song there
 * changed nothing anyone could see.
 *
 * Falling back rather than showing an empty shelf: a failed fetch, an offline
 * moment or an empty collection all leave Practice exactly as it was.
 */
export async function fetchPracticeLibrary(): Promise<PracticeSong[]> {
    const docs = await fetchPracticeSongs();

    return docs
        // A song with no audio cannot be practised with, whatever else is filled in.
        .filter((doc) => Boolean(doc.audioUrl))
        .map((doc) => ({
            id: doc.id,
            title: doc.title,
            artist: doc.artist,
            audioUrl: doc.audioUrl,
            coverUrl: doc.coverUrl || undefined,
            sections: doc.sections?.length ? sortSections(doc.sections) : undefined,
            // Unset means not ready: a song reaches the chooser as soon as it is
            // published, and stays greyed out until someone says it is mapped.
            available: doc.available === true && Boolean(doc.sections?.length),
        }));
}

/**
 * Starts from the bundled library and swaps in the CMS one when it lands.
 *
 * Seeded rather than empty because every caller reads this synchronously to pick
 * a starting song — an empty first render would flash "no songs" and, worse,
 * leave the practice with nothing selected.
 */
export function usePracticeLibrary(): PracticeSong[] {
    const [songs, setSongs] = useState<PracticeSong[]>(PRACTICE_SONGS);

    useEffect(() => {
        let cancelled = false;
        fetchPracticeLibrary()
            .then((list) => {
                if (!cancelled && list.length > 0) setSongs(list);
            })
            .catch((err) => console.warn('Falling back to the bundled practice songs:', err));
        return () => { cancelled = true; };
    }, []);

    return songs;
}
