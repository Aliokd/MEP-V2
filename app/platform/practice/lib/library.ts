"use client";

import { useEffect, useState } from 'react';
import { fetchPracticeMelodies, fetchPracticeSongs } from '@/lib/contentClient';
import { sortSections } from '@/lib/practiceLibrary';
import { PRACTICE_SONGS, type PracticeSong } from '../data/practiceSongs';
import { MELODIES, type PracticeMelody } from '../data/melodies';

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

/**
 * The melody library Practice 3 works through.
 *
 * Same arrangement as the songs above: authored in the admin console, with the
 * bundled module as the fallback. The fallback matters more here than it does
 * for songs — the four melodies in code point at placeholder WAVs that
 * .gitignore keeps out of the repo, so they 404 in production. Until real takes
 * are uploaded, Practice 3 has no working audio at all.
 */
export async function fetchMelodyLibrary(): Promise<PracticeMelody[]> {
    const docs = await fetchPracticeMelodies();

    return docs
        // No audio, no melody. The exercise is listen-then-answer.
        .filter((doc) => Boolean(doc.audioUrl))
        .map((doc) => ({
            id: doc.id,
            title: doc.title,
            instrument: doc.instrument,
            audioUrl: doc.audioUrl,
            available: doc.available === true,
        }));
}

export function useMelodyLibrary(): PracticeMelody[] {
    const [melodies, setMelodies] = useState<PracticeMelody[]>(MELODIES);

    useEffect(() => {
        let cancelled = false;
        fetchMelodyLibrary()
            .then((list) => {
                if (!cancelled && list.length > 0) setMelodies(list);
            })
            .catch((err) => console.warn('Falling back to the bundled melodies:', err));
        return () => { cancelled = true; };
    }, []);

    return melodies;
}
