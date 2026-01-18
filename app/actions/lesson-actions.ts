"use server";

import { getUserConstellation as fetchUserConstellation, getLessonDetails as fetchLessonDetails, connectorConfig } from '@mep/dataconnect';
import { getDataConnect } from 'firebase/data-connect';
import app from '@/lib/firebase';

// Helper to get Data Connect instance (singleton-ish)
const dc = getDataConnect(app, connectorConfig);

// Re-export SDK types or map them if necessary. 
// For now, we'll return the SDK specific types or mapped versions.
// Since the frontend expects specific shapes, we might need to map.

export interface Lesson {
    id: string;
    title: string;
    videoUrl: string;
    midiDataUrl?: string | null;
    durationSeconds: number;
    order: number;
    movement?: {
        title: string;
    };
    prerequisites?: {
        prerequisiteId: string;
        prerequisite?: {
            id: string;
            title: string;
        };
    }[];
}

export interface UserProgress {
    lessonId: string;
    status: 'LOCKED' | 'STARTED' | 'MASTERED';
    accuracyScore?: number | null; // SDK type allows null
}

export interface ConstellationData {
    user: {
        id: string;
        displayName?: string | null;
        lessonProgress: UserProgress[];
    };
    lessonsList: Lesson[];
    movements: { id: string; title: string; order: number }[];
}

/**
 * Fetch the user's progress and the lesson constellation.
 */
export async function getUserConstellation(uid: string): Promise<ConstellationData> {
    try {
        const response = await fetchUserConstellation(dc, { uid });
        const data = response.data;

        // Map SDK data to our interface if structurally different, or just cast
        // SDK 'status' is enum ProgressStatus (LOCKED, STARTED, MASTERED). Matches string union.

        if (!data.user) {
            // Fallback for non-existent user (first login?) or return partial
            return {
                user: { id: uid, displayName: null, lessonProgress: [] },
                lessonsList: data.lessonsList.map(l => ({
                    ...l,
                    videoUrl: "", // Not fetched
                    movement: { title: "Unknown" }, // SDK might not return movement title joined if not requested? 
                    // We need to map movementId to title using the movements list if available, but here we just fallback.
                })),
                movements: data.movements
            };
        }

        const movementMap = new Map(data.movements.map(m => [m.id, m.title]));

        return {
            user: {
                id: data.user.id,
                displayName: data.user.displayName,
                lessonProgress: data.user.lessonProgress.map(p => ({
                    lessonId: p.lessonId,
                    status: p.status as 'LOCKED' | 'STARTED' | 'MASTERED', // Cast enum string
                    accuracyScore: p.accuracyScore
                }))
            },
            lessonsList: data.lessonsList.map(l => ({
                id: l.id,
                title: l.title,
                videoUrl: "", // Not fetched in summary
                durationSeconds: l.durationSeconds,
                order: l.order,
                movement: {
                    title: movementMap.get(l.movementId) || "Unknown"
                },
                prerequisites: l.prerequisites.map(p => ({
                    prerequisiteId: p.prerequisiteId
                }))
            })),
            movements: data.movements
        };
    } catch (error) {
        console.error("Data Connect Error:", error);
        // Fallback to mock data for dev continuity if DB is empty/unreachable
        return {
            user: {
                id: uid,
                displayName: "Masquerade (Mock)",
                lessonProgress: [
                    { lessonId: "1", status: "MASTERED", accuracyScore: 98 },
                    { lessonId: "2", status: "STARTED", accuracyScore: 45 },
                ]
            },
            lessonsList: [
                { id: "1", title: "The Resonance of Silence", videoUrl: "", durationSeconds: 300, order: 1, movement: { title: "The Foundation" } },
                { id: "2", title: "Harmonic Architecture", videoUrl: "", durationSeconds: 450, order: 2, prerequisites: [{ prerequisiteId: "1" }], movement: { title: "The Foundation" } },
                { id: "3", title: "Rhythmic Geometry", videoUrl: "", durationSeconds: 600, order: 3, prerequisites: [{ prerequisiteId: "2" }], movement: { title: "The Fluency" } },
                { id: "4", title: "The Velvet Legato", videoUrl: "", durationSeconds: 500, order: 4, prerequisites: [{ prerequisiteId: "2" }], movement: { title: "The Fluency" } },
            ],
            movements: [
                { id: "m1", title: "Foundation", order: 1 }
            ]
        };
    }
}

/**
 * Fetch details for a specific lesson.
 */
export async function getLessonDetails(lessonId: string): Promise<Lesson> {
    try {
        const response = await fetchLessonDetails(dc, { lessonId });
        const data = response.data;

        if (!data.lesson) {
            throw new Error("Lesson not found");
        }

        return {
            id: data.lesson.id,
            title: data.lesson.title,
            videoUrl: data.lesson.videoUrl,
            midiDataUrl: data.lesson.midiDataUrl,
            durationSeconds: data.lesson.durationSeconds,
            order: 0, // Not in query detail
            movement: {
                title: data.lesson.movement.title
            },
            prerequisites: data.lesson.prerequisites.map(p => ({
                // prerequisiteId: "unknown", // Removed
                // schema: prerequisites: lessonPrerequisites_on_lesson { prerequisite { id, title } }
                // generated: prerequisites: ({ prerequisite: { id, title } ... })[]
                prerequisiteId: p.prerequisite.id,
                prerequisite: {
                    id: p.prerequisite.id,
                    title: p.prerequisite.title
                }
            }))
        };
    } catch (error) {
        console.error("Data Connect Lesson Detail Error:", error);
        // Mock fallback
        return {
            id: lessonId,
            title: "The Resonance of Silence (Mock)",
            videoUrl: "https://player.vimeo.com/video/824804225",
            midiDataUrl: "/mock-midi-path.json",
            durationSeconds: 300,
            order: 1,
            movement: { title: "Foundation" },
        };
    }
}
