/**
 * The words on the Golden program pages, in one place.
 *
 * English only by design: every page here is a link sent to a named person,
 * and the founders write to those people in English. No locale keys, no CMS
 * overrides; changing a line is a code change, like the guidelines page.
 */

import { GOLDEN_INVITES_PER_TICKET, GOLDEN_TICKETS_TOTAL } from '@/lib/uiFlags';

export const GOLDEN = {
    programName: 'Golden program',
    wallTitle: 'Golden program',
    wallSubtitle: `${GOLDEN_TICKETS_TOTAL} songwriters, chosen by hand. One ticket each, for life.`,
    backLabel: `The ${GOLDEN_TICKETS_TOTAL} golden tickets`,
    cta: 'Take my ticket',

    /** {name} is the first name on the ticket. */
    heroTitle: 'Hey {name}, you have been chosen to be part of Veinote.',
    heroBody: 'We are building the home of human songwriting, and we are opening it first to a hundred people whose work we admire. You are one of them.',

    benefitsTitle: 'What you get, exclusively',
    benefits: [
        'Lifetime access to every part of Veinote',
        `${GOLDEN_INVITES_PER_TICKET} exclusive invites for friends or family, each with a discount for life`,
        'Free access to every Veinote event in the Nordics',
        'The ability to organize and host events with us',
        'Perks and goodies along the way',
    ],
    perks: [
        { id: 'tee', title: 'The golden tee', body: 'One per ticket, numbered.' },
        { id: 'box', title: 'The welcome box', body: 'Sent to your door when we meet.' },
    ],

    missionTitle: 'Join the mission',
    missionBody: 'In a world where hobbies and human connection will matter more than ever, we are on a mission to empower human songwriters and musicians to reach their full potential and live healthier. Backed by science and by working songwriters.',
    mindPower: {
        eyebrow: 'Mind power',
        title: 'Empower the songwriter mind',
        body: 'Every minute you spend creating, learning and practicing is counted. A full week earns a golden mind.',
    },

    togetherTitle: 'We bring humans together, online and offline',
    together: [
        {
            id: 'collab',
            title: 'Collab and Rooms',
            body: 'Write a song with someone across the table or across the sea. Rooms are where the bands of tomorrow meet.',
        },
        {
            id: 'events',
            title: 'Offline events',
            body: 'Writing nights, listening sessions and stage time across the Nordics. Golden ticket holders walk in free.',
        },
    ],

    createTitle: 'Create: consolidate your craft and publish real songs',
    createBody: 'A canvas built for lyrics, chords and melody. Record a demo in the studio, share the song with a page of its own, and keep every draft along the way.',
    pillars: [
        { id: 'learn', title: 'Learn', body: 'Fundamentals, deep dives and a bank of ideas.' },
        { id: 'practice', title: 'Practice', body: 'Short sessions that build the muscle.' },
        { id: 'connect', title: 'Connect', body: 'Songwriters near you and far away.' },
    ],

    visionTitle: 'Long-term vision',
    visionBody: 'We are taking the lead in the Nordics. Then the US, the EU and the Arab world. Then everywhere a song is written.',
    visionSteps: ['Nordics', 'US and EU', 'Arab world', 'Global'],

    longTermTitle: 'What is in it for you, long term?',
    longTerm: [
        'Priority to join the Creator program, and earn money while creating in Veinote',
        'A seat at the table as the product grows: your voice shapes what we build next',
        'Your name on the wall, first among a hundred',
    ],

    claim: {
        title: 'Your ticket is waiting',
        body: 'Leave the address you want it sent to. The ticket arrives by email, with a code that opens Veinote for life, and we will write to you personally after that.',
        emailLabel: 'Your email',
        emailPlaceholder: 'you@example.com',
        messageLabel: 'Anything you want to tell us? (optional)',
        messagePlaceholder: 'A line about you, or a question for us.',
        sending: 'Sending your ticket',
        doneTitle: 'Your ticket is on its way',
        doneBody: 'We sent it to {email}. Open the email and press the button inside when you are ready; the code in it is yours alone.',
        takenTitle: 'This ticket has been taken',
        takenBody: 'If that was you, check your inbox. If it was not, write to us and we will sort it out.',
        revokedTitle: 'This ticket is no longer available',
        revokedBody: 'Write to us if you think that is a mistake.',
        contact: 'contact@veinote.com',
        errors: {
            email: 'That does not look like an email address.',
            taken: 'Someone took this ticket a moment ago.',
            mail: 'Your ticket is saved, but the email did not go out. We will send it by hand.',
            generic: 'Something went wrong. Please try again.',
        },
    },

    footnotePhotos: 'Photos have been picked from the public internet.',
    footnoteTerms: 'Read terms and conditions',

    teamTitle: 'People behind Veinote',
    teamMore: 'And more',
} as const;

export interface TeamMember {
    name: string;
    role: string;
    photoUrl: string | null;
}

/**
 * The founders and the people around them. Photos are paths under /public;
 * null draws the placeholder. Fill in the real names and pictures here.
 */
export const TEAM: TeamMember[] = [
    { name: 'Founder', role: 'Product and songwriting', photoUrl: null },
    { name: 'Co-founder', role: 'Growth and community', photoUrl: null },
    { name: 'Pro songwriter', role: 'Craft advisor', photoUrl: null },
    { name: 'Scientist', role: 'Mind Power research', photoUrl: null },
    { name: 'Designer', role: 'Brand and canvas', photoUrl: null },
];

export function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
}
