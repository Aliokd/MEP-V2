"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { IdeaDoc, LearnChapter, LearnLesson, PracticeSongDoc } from "@/lib/content";

/**
 * Platform-side reads of CMS content.
 *
 * Every query filters on status == "published" — not for tidiness, but because
 * firestore.rules gates these collections on the document's status, and Firestore
 * fails an entire list query when any document in the result set fails the rule.
 * An unfiltered read here breaks the page as soon as an editor saves a draft.
 */

async function fetchPublished<T>(collectionName: string): Promise<T[]> {
    const snap = await getDocs(
        query(collection(db, collectionName), where("status", "==", "published")),
    );
    return snap.docs.map((doc) => ({ ...(doc.data() as T), id: doc.id }));
}

function byOrder<T extends { order?: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function fetchIdeas(): Promise<IdeaDoc[]> {
    return byOrder(await fetchPublished<IdeaDoc>("ideas"));
}

export async function fetchPracticeSongs(): Promise<PracticeSongDoc[]> {
    return byOrder(await fetchPublished<PracticeSongDoc>("practice_songs"));
}

export async function fetchLearnChapters(): Promise<LearnChapter[]> {
    return byOrder(await fetchPublished<LearnChapter>("learn_chapters"));
}

export async function fetchLearnLessons(): Promise<LearnLesson[]> {
    return byOrder(await fetchPublished<LearnLesson>("learn_lessons"));
}

/** Chapters with their lessons attached, in reading order. */
export async function fetchCurriculum(): Promise<(LearnChapter & { lessons: LearnLesson[] })[]> {
    const [chapters, lessons] = await Promise.all([fetchLearnChapters(), fetchLearnLessons()]);
    return chapters.map((chapter) => ({
        ...chapter,
        lessons: lessons.filter((lesson) => lesson.chapterId === chapter.id),
    }));
}
