"use client";

import { createContext, useContext } from 'react';

/**
 * The Mind Power numbers, as the platform layout computes them.
 *
 * The layout owns these — it reads the localStorage counters, runs the Firestore
 * community count, and folds them into a level — because the header pill needs
 * them on every route. The full Mind Power page needs the same numbers, and
 * re-deriving them there would mean two copies of the level formula that could
 * drift. So the layout publishes what it already has, and the page reads it.
 */
export interface MindPowerProgress {
    /** One per week spent in Veinote, never below 1. */
    progressLevel: number;
    /** Distinct weeks with time recorded — what the level is counted from. */
    activeWeeks: number;
    /** 0–100: the four category counters against their goals, averaged. */
    levelProgress: number;

    wordsTyped: number;
    recordingMinutes: number;
    songsCompleted: number;
    wordsGoal: number;

    completedLessonsCount: number;
    lessonsGoal: number;

    practiceMinutes: number;
    practiceGoal: number;

    communityCount: number;
    communityGoal: number;

    activeQuote: string;
}

const MindPowerProgressContext = createContext<MindPowerProgress | null>(null);

export const MindPowerProgressProvider = MindPowerProgressContext.Provider;

export function useMindPowerProgress(): MindPowerProgress {
    const value = useContext(MindPowerProgressContext);
    if (!value) {
        throw new Error('useMindPowerProgress must be used inside the platform layout');
    }
    return value;
}
