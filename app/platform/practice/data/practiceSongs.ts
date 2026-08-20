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
    /**
     * When each line starts, in seconds into the master — one per entry in
     * `lines`, always increasing and always inside the section. Derived from the
     * vocal stem's word timestamps, so the read-along follows the singer rather
     * than dividing the section evenly. Absent means no read-along for the part.
     */
    lineTimes?: number[];
}

export interface PracticeSong {
    id: string;
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl?: string;
    sections?: AuthoredSection[];
    /**
     * Whether the song can be practised yet. The locked ones still appear in the
     * chooser, greyed and marked "coming soon", so the library reads as a
     * library rather than a single lonely card.
     */
    available: boolean;
}

const DIR = '/Practice/Songs/Beginner%20level';

/**
 * One folder per song under public/, named "<Title> - <Artist>". Kept here as
 * constants because the artist is part of the path: renaming a folder to credit
 * a different act silently 404s the audio otherwise.
 */
const FOLDER = {
    doYouLove: `${DIR}/Do%20You%20Love%20-%20Peter%20Nordberg`,
    closer: `${DIR}/Closer%20-%20Lounge%20Club`,
    beautifulDay: `${DIR}/Beautiful%20Day%20-%20Lounge%20Club%20feat.%20Lucas%20Kay`,
    anotherRide: `${DIR}/Another%20Ride%20-%20Lounge%20Club`,
};

export const PRACTICE_SONGS: PracticeSong[] = [
    {
        id: 'do-you-love',
        available: true,
        title: 'Do You Love',
        artist: 'Peter Nordberg',
        audioUrl: `${FOLDER.doYouLove}/Do%20You%20Love%20-%20Peter%20Nordberg.mp3`,
        coverUrl: `${FOLDER.doYouLove}/DoYouLove.jpg`,
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
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    7.0, 9.34, 13.0, 17.8, 24.0, 27.18, 30.74, 36.96,
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
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    41.0, 46.0, 51.18, 56.12,
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
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    66.18, 67.48, 72.16, 77.32, 83.34, 86.58, 90.22, 95.64,
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
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    102.0, 105.3, 110.66, 115.62,
                ],
            },
            {
                kind: 'bridge', start: 123, end: 142,
                lines: [
                    'Do you love Do you love Do you love',
                    'Do you love Do you love Do you love',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    123.0, 138.32,
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
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    145.13, 148.26, 152.65, 157.04,
                ],
            },
        ],
    },
    {
        id: 'closer',
        available: true,
        title: 'Closer',
        artist: 'Lounge Club',
        audioUrl: `${FOLDER.closer}/Closer_Master%202026.mp3`,
        coverUrl: `${FOLDER.closer}/Closer.jpg`,
        /*
         * Lyrics transcribed from the master: Demucs vocal isolation, then
         * three Whisper models cross-checked (medium, large-v3-turbo,
         * large-v3), disagreements settled by large-v3 on clipped regions.
         */
        sections: [
            { kind: 'intro', start: 0, end: 12 },
            {
                kind: 'verse', start: 12, end: 29,
                lines: [
                    'Come on baby lock the door',
                    "Let's get down",
                    'Come over here drop your phone',
                    "Let's fool around",
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    12.0, 16.4, 18.88, 26.3,
                ],
            },
            {
                kind: 'chorus', start: 29, end: 52,
                lines: [
                    'Come on baby closer',
                    'Come on hold me tight',
                    'Come on hold me stronger',
                    'Come on do it right',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    29.0, 34.62, 39.48, 44.3,
                ],
            },
            {
                kind: 'verse', start: 52, end: 70,
                lines: [
                    'Come on baby let me in',
                    "Don't you hide",
                    'You know I love your velvet skin',
                    'And your smile',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    52.0, 57.42, 59.42, 65.32,
                ],
            },
            {
                kind: 'chorus', start: 70, end: 92,
                lines: [
                    'Come on baby closer',
                    'Come on hold me tight',
                    'Come on hold me stronger',
                    'Come on do it right',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    70.0, 74.96, 79.76, 84.7,
                ],
            },
            { kind: 'solo', start: 92, end: 132 },
            {
                // "CHORUS X2" in the mapping doc — sung twice, the second
                // round in shortened call-backs, as transcribed.
                kind: 'chorus', start: 132, end: 190,
                lines: [
                    'Come on baby closer',
                    'Come on hold me tight',
                    'Come on hold me stronger',
                    'Come on do it right',
                    'Baby closer',
                    'Hold me tight',
                    'Hold me stronger',
                    'Come on do it right',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    132.0, 132.84, 140.48, 145.26, 151.12, 156.2, 161.28, 165.56,
                ],
            },
        ],
    },
    {
        id: 'beautiful-day',
        available: true,
        title: 'Beautiful Day',
        artist: 'Lounge Club feat. Lucas Kay',
        audioUrl: `${FOLDER.beautifulDay}/Beautiful.mp3`,
        coverUrl: `${FOLDER.beautifulDay}/Beautiful.jpg`,
        // Lyrics transcribed the same way as Closer's — see that note.
        sections: [
            { kind: 'intro', start: 0, end: 7 },
            {
                kind: 'verse', start: 7, end: 37,
                lines: [
                    'Hey you, do you have another one',
                    'Of those days you wish never begun',
                    "Tell me what you're hiding from",
                    'Hey you, tell me what is on your mind',
                    "Don't travel down too far inside",
                    'It is out here that the world resides',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    7.0, 12.5, 15.86, 19.08, 27.88, 30.42,
                ],
            },
            {
                kind: 'chorus', start: 37, end: 51,
                lines: [
                    "It's a beautiful beautiful day",
                    "I wouldn't like it any other way",
                    "It's a beautiful beautiful day",
                    "I couldn't take it any other way",
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    37.0, 38.8, 42.96, 46.54,
                ],
            },
            {
                kind: 'verse', start: 51, end: 80,
                lines: [
                    'Hey you, listen to the king that said',
                    'Let that light inside you bring',
                    "Out the passion you've been hiding",
                    'Hey you, bring joy to this heart of mine',
                    'Let me see it in your eyes',
                    'All we really have is time',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    51.0, 56.52, 60.12, 63.0, 72.18, 75.2,
                ],
            },
            {
                kind: 'chorus', start: 80, end: 96,
                lines: [
                    "It's a beautiful beautiful day",
                    "I wouldn't like it any other way",
                    "It's a beautiful beautiful day",
                    "I couldn't take it any other way",
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    80.01, 83.11, 87.29, 90.59,
                ],
            },
            {
                kind: 'verse', start: 96, end: 110,
                lines: [
                    "Hey you, tell me what you're longing for",
                    "I wonder what you're dreaming of",
                    'What is it that you most dearly love',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    96.0, 101.57, 103.55,
                ],
            },
            {
                kind: 'bridge', start: 110, end: 141,
                lines: [
                    'Wake up in the early morning',
                    'And be with me when the sun goes up',
                    'Take a breath and feel this life is flowing',
                    'Right through your lungs',
                    'Feel the earth beneath your feet',
                    'And the blood flowing through your veins',
                    'If you look at the world this way',
                    "You'll never feel the same",
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    110.19, 111.91, 117.05, 120.15, 124.47, 126.69, 132.37, 134.85,
                ],
            },
            {
                // "CHORUS X2" in the mapping doc, bookended by "Hey you"
                kind: 'chorus', start: 141, end: 179,
                lines: [
                    'Hey you',
                    "It's a beautiful beautiful day",
                    "I wouldn't like it any other way",
                    "It's a beautiful beautiful day",
                    "I couldn't take it any other way",
                    "It's a beautiful beautiful day",
                    "I wouldn't like it any other way",
                    "It's a beautiful beautiful day",
                    "I couldn't take it any other way",
                    'Hey you',
                ],
                // Line onsets, from the vocal stem's word timestamps
                lineTimes: [
                    141.0, 143.41, 145.73, 149.95, 153.29, 157.88, 160.67, 164.81, 168.13,
                    172.53,
                ],
            },
        ],
    },
    {
        /*
         * The only song missing from "Song Structure Time Mapping_.docx", so it
         * has no hand-authored map. The analyser's attempt is not usable as a
         * stand-in — it reads this track as eight choruses against one verse —
         * so it stays locked until a real mapping is written for it.
         */
        id: 'another-ride',
        available: false,
        title: 'Another Ride',
        artist: 'Lounge Club',
        audioUrl: `${FOLDER.anotherRide}/Another%20Ride%20-%20master.mp3`,
    },
];
