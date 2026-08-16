import type { SectionKind } from './sections';

/**
 * The practice song library: our own recordings under public/Practice/Songs,
 * with their structure authored by hand from "Song Structure Time Mapping_.docx"
 * in that folder. Times are seconds into the master.
 *
 * A song without `sections` can be listened to but not decomposed yet — the
 * practice shows the analysis-pending state for it, the same one uploaded songs
 * get until the automatic decomposition pipeline exists.
 */

export interface AuthoredSection {
    kind: SectionKind;
    start: number;
    end: number;
    /** Lyric lines sung in this section, when we have them. Display only. */
    lines?: string[];
}

export interface PracticeSong {
    id: string;
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl?: string;
    sections?: AuthoredSection[];
}

const DIR = '/Practice/Songs/Beginner%20level';

export const PRACTICE_SONGS: PracticeSong[] = [
    {
        id: 'do-you-love',
        title: 'Do You Love',
        artist: 'Peter Nordberg',
        audioUrl: `${DIR}/Do%20You%20Love/Do%20You%20Love%20-%20Peter%20Nordberg.mp3`,
        coverUrl: `${DIR}/Do%20You%20Love/DoYouLove.jpg`,
        sections: [
            { kind: 'intro', start: 0, end: 7 },
            {
                kind: 'verse', start: 7, end: 41,
                lines: [
                    'You',
                    "I want to spend a day with you",
                    "And I don't care just we do",
                    "It's true",
                    'Tonight',
                    'We stay at home turn down the light',
                    'And maybe hold each other tight',
                    'All night',
                ],
            },
            {
                kind: 'chorus', start: 41, end: 65,
                lines: [
                    'Do you love',
                    'Do you feel it from above',
                    'Is it coming from below',
                    'From the deepest of you soul',
                ],
            },
            {
                kind: 'verse', start: 65, end: 102,
                lines: [
                    'Stay',
                    'And try to find another way',
                    "Just don't swipe and like and play",
                    'All day',
                    'You know',
                    "Don't let them say I told you so",
                    'Just let it out and let it flow',
                    'Let go',
                ],
            },
            {
                kind: 'chorus', start: 102, end: 123,
                lines: [
                    'Do you love',
                    'Do you feel it from above',
                    'Is it coming from below',
                    'From the deepest of you soul',
                ],
            },
            {
                kind: 'bridge', start: 123, end: 142,
                lines: [
                    'Do you love Do you love Do you love',
                    'Do you love Do you love Do you love',
                ],
            },
            {
                kind: 'chorus', start: 142, end: 168,
                lines: [
                    'Do you love',
                    'Do you feel it from above',
                    'Is it coming from below',
                    'From the deepest of you soul',
                ],
            },
        ],
    },
    {
        id: 'closer',
        title: 'Closer',
        artist: 'Peter Nordberg',
        audioUrl: `${DIR}/Closer/Closer_Master%202026.mp3`,
        coverUrl: `${DIR}/Closer/Closer.jpg`,
        sections: [
            { kind: 'intro', start: 0, end: 12 },
            { kind: 'verse', start: 12, end: 29 },
            { kind: 'chorus', start: 29, end: 52 },
            { kind: 'verse', start: 52, end: 70 },
            { kind: 'chorus', start: 70, end: 92 },
            { kind: 'solo', start: 92, end: 132 },
            { kind: 'chorus', start: 132, end: 190 },
        ],
    },
    {
        id: 'beautiful-day',
        title: 'Beautiful Day',
        artist: 'Peter Nordberg',
        audioUrl: `${DIR}/Beautiful%20Day/Beautiful.mp3`,
        coverUrl: `${DIR}/Beautiful%20Day/Beautiful.jpg`,
        sections: [
            { kind: 'intro', start: 0, end: 7 },
            { kind: 'verse', start: 7, end: 37 },
            { kind: 'chorus', start: 37, end: 51 },
            { kind: 'verse', start: 51, end: 80 },
            { kind: 'chorus', start: 80, end: 96 },
            { kind: 'verse', start: 96, end: 110 },
            { kind: 'bridge', start: 110, end: 141 },
            { kind: 'chorus', start: 141, end: 179 },
        ],
    },
    {
        // No structure mapping yet — listen-only until it gets one (or the
        // automatic analysis pipeline lands).
        id: 'another-ride',
        title: 'Another Ride',
        artist: 'Peter Nordberg',
        audioUrl: `${DIR}/Another%20Ride/Another%20Ride%20-%20master.mp3`,
    },
];
