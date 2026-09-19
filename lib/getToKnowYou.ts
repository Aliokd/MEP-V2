"use client";

import { useCallback, useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { writePublicProfile } from './publicProfile';
import { answeredCount, sanitizeAnswers, type Answers } from './onboardingQuestions';

/**
 * Write the whole set of answers at once, replacing what was there.
 *
 * The onboarding quiz calls this on every change while a signed-in person
 * is taking it (a returning account, a golden ticket), so an answer given
 * there is on the account the moment it is given rather than only at signup.
 * `updateDoc` rather than a merge: a map merged keeps keys that were cleared,
 * and a question un-answered on the way through has to read as un-answered.
 */
export async function saveAllAnswers(uid: string, answers: Answers): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', uid), { answers });
        const type = answers.songwriter_type;
        void writePublicProfile(uid, { songwriterType: typeof type === 'string' ? type : null });
    } catch (err) {
        console.warn('[getToKnowYou] Could not save the answers:', err);
    }
}

/**
 * The onboarding answers, live from users/{uid}, and a way to change them.
 *
 * Onboarding writes them once at signup; this is the door left open after.
 * The profile's "Get to know you" reads and writes through here, and Mind Power
 * reads through here to know what the person is aiming for.
 */
export function useOnboardingAnswers(uid: string | null) {
    const [answers, setAnswers] = useState<Answers>({});
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!uid) return;
        const unsubscribe = onSnapshot(
            doc(db, 'users', uid),
            snap => {
                setAnswers(sanitizeAnswers(snap.data()?.answers));
                setLoaded(true);
            },
            err => {
                // An account that cannot read its own document (the Playwright
                // mock) is an account with nothing answered; it is not an error
                // the page can do anything about.
                console.warn('[getToKnowYou] Could not read the answers:', err);
                setLoaded(true);
            },
        );
        // Deferred: an unsubscribe in the same tick as the subscribe (StrictMode's
        // double mount) trips an SDK assertion when the listen is rules-rejected.
        return () => {
            setTimeout(unsubscribe, 0);
        };
    }, [uid]);

    /**
     * Change one answer. Optimistic: the page shows the new value at once, and
     * the document catches up. An empty answer removes the key, so "unanswered"
     * stays one state rather than two.
     */
    const save = useCallback(
        async (id: string, value: string | string[] | null) => {
            if (!uid) return;
            const empty = value === null || (Array.isArray(value) && value.length === 0);
            setAnswers(prev => {
                const next = { ...prev };
                if (empty) delete next[id];
                else next[id] = value as string | string[];
                return next;
            });
            try {
                await setDoc(doc(db, 'users', uid), { answers: { [id]: empty ? deleteField() : value } }, { merge: true });
                // The type is the one answer other people see: it is what the
                // Connect roster and a collaborator's card show under the name.
                if (id === 'songwriter_type') {
                    void writePublicProfile(uid, { songwriterType: typeof value === 'string' ? value : null });
                }
            } catch (err) {
                console.error('[getToKnowYou] Could not save the answer:', err);
            }
        },
        [uid],
    );

    return { answers, loaded, save, progress: answeredCount(answers) };
}
