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
            },
            {
                kind: 'chorus', start: 29, end: 52,
                lines: [
                    'Come on baby closer',
                    'Come on hold me tight',
                    'Come on hold me stronger',
                    'Come on do it right',
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
            },
            {
                kind: 'chorus', start: 70, end: 92,
                lines: [
                    'Come on baby closer',
                    'Come on hold me tight',
                    'Come on hold me stronger',
                    'Come on do it right',
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
            },
            {
                kind: 'chorus', start: 37, end: 51,
                lines: [
                    "It's a beautiful beautiful day",
                    "I wouldn't like it any other way",
                    "It's a beautiful beautiful day",
                    "I couldn't take it any other way",
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
            },
            {
                kind: 'chorus', start: 80, end: 96,
                lines: [
                    "It's a beautiful beautiful day",
                    "I wouldn't like it any other way",
                    "It's a beautiful beautiful day",
                    "I couldn't take it any other way",
                ],
            },
            {
                kind: 'verse', start: 96, end: 110,
                lines: [
                    "Hey you, tell me what you're longing for",
                    "I wonder what you're dreaming of",
                    'What is it that you most dearly love',
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
