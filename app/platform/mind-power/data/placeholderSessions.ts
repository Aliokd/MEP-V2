import type { StayAheadSessionDoc } from '@/lib/content';

/**
 * Stand-in Stay ahead sessions, shown ONLY in development and ONLY while the
 * CMS has none of its own.
 *
 * The sheet is built before the content is, and there is no way to feel whether
 * a sequence reads well without walking through one. These give every track
 * something to open: a title, a standfirst, and no video, so the grey frame
 * stands where the film will go.
 *
 * `process.env.NODE_ENV` is substituted at build time, so the import below is
 * dead code in a production build and none of this reaches a songwriter. Delete
 * this file once real sessions are published.
 */
export const PLACEHOLDER_SESSIONS: StayAheadSessionDoc[] = [
    {
        id: 'placeholder-yoga-1',
        track: 'yoga',
        order: 0,
        status: 'published',
        title: { en: 'Relaxation fundamentals' },
        description: {
            en: 'Relaxation fundamentals description Relaxation fundamentals description Relaxation fundamentals description Relaxation fundamentals description Relaxation fundamentals description.',
        },
    },
    {
        id: 'placeholder-yoga-2',
        track: 'yoga',
        order: 1,
        status: 'published',
        title: { en: 'Breathing into the shoulders' },
        description: { en: 'A short sequence for the neck and shoulders after a long session at the desk.' },
        // One session carries blocks, so the prose, the callout and the way they
        // sit under the film can be judged alongside the plain ones.
        blocks: [
            {
                id: 'placeholder-b1',
                type: 'text',
                body: {
                    en: 'Sit upright with both feet flat on the floor and let the hands rest in your lap.\n\nRoll the shoulders back three times, slowly, and let the breath follow rather than lead.',
                },
            },
            {
                id: 'placeholder-b2',
                type: 'callout',
                tone: 'tip',
                body: { en: 'If anything pinches, stop and shake the arms out. Nothing here should be worked at.' },
            },
        ],
    },
    {
        id: 'placeholder-yoga-3',
        track: 'yoga',
        order: 2,
        status: 'published',
        title: { en: 'Winding down' },
        description: { en: 'Closing the writing day so the song stops following you to bed.' },
    },
    {
        id: 'placeholder-finger-1',
        track: 'finger',
        order: 0,
        status: 'published',
        title: { en: 'Waking the hands' },
        description: { en: 'Two minutes before you play, so the first take is not the warm-up.' },
    },
    {
        id: 'placeholder-finger-2',
        track: 'finger',
        order: 1,
        status: 'published',
        title: { en: 'Between takes' },
        description: { en: 'What to do with the hands while the last idea settles.' },
    },
    {
        id: 'placeholder-holistic-1',
        track: 'holistic',
        order: 0,
        status: 'published',
        title: { en: 'Rest is part of the work' },
        description: { en: 'Why the song is often finished on the walk rather than at the desk.' },
    },
];
