"use server";

// Strictly typed interfaces based on schema.gql
export interface Lesson {
    id: string;
    title: string;
    videoUrl: string;
    midiDataUrl?: string;
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
    accuracyScore?: number;
}

export interface ConstellationData {
    user: {
        id: string;
        displayName: string;
        lessonProgress: UserProgress[];
    };
    lessonsList: Lesson[];
    movements: { id: string; title: string; order: number }[];
}

/**
 * Fetch the user's progress and the lesson constellation.
 */
export async function getUserConstellation(uid: string): Promise<ConstellationData> {
    // In a real implementation, this would call the Firebase Data Connect SDK:
    // const { data } = await executeQuery(getUserConstellationQuery, { uid });

    // Mock data for initial scaffold
    return {
        user: {
            id: uid,
            displayName: "Arturo Toscanini",
            lessonProgress: [
                { lessonId: "1", status: "MASTERED", accuracyScore: 98 },
                { lessonId: "2", status: "STARTED", accuracyScore: 45 },
            ]
        },
        lessonsList: [
            { id: "1", title: "The Resonance of Silence", videoUrl: "", durationSeconds: 300, order: 1 },
            { id: "2", title: "Harmonic Architecture", videoUrl: "", durationSeconds: 450, order: 2, prerequisites: [{ prerequisiteId: "1" }] },
            { id: "3", title: "Rhythmic Geometry", videoUrl: "", durationSeconds: 600, order: 3, prerequisites: [{ prerequisiteId: "2" }] },
            { id: "4", title: "The Velvet Legato", videoUrl: "", durationSeconds: 500, order: 4, prerequisites: [{ prerequisiteId: "2" }] },
        ],
        movements: [
            { id: "m1", title: "Foundation", order: 1 }
        ]
    };
}

/**
 * Fetch details for a specific lesson.
 */
export async function getLessonDetails(lessonId: string): Promise<Lesson> {
    // Mock implementation
    return {
        id: lessonId,
        title: "The Resonance of Silence",
        videoUrl: "https://player.vimeo.com/video/824804225", // Placeholder
        midiDataUrl: "/mock-midi-path.json",
        durationSeconds: 300,
        order: 1,
        movement: { title: "Foundation" },
    };
}
