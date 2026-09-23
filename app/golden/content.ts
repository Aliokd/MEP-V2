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
    /** On a wall ticket nobody holds yet. */
    wallAvailable: 'Available',

    /**
     * The tickets nobody holds yet, at /golden/ticket/{number}. The same
     * pitch as a named person's page, with the hero and the ask changed:
     * there is no name on the ticket, so it says what the ticket is and
     * invites the reader to put their hand up for it.
     */
    free: {
        /** The headline over a free ticket's first screen. */
        heading: 'Golden ticket',
        eyebrow: 'Still available',
        body: 'We believe songwriters build the best tools for songwriters, and that is why we are building Veinote. A hundred of you get a golden ticket, chosen by hand. We would love you to be part of this mission.',
        askTitle: 'Want this ticket?',
        askBody: 'Leave your email and a line about what you write. We read every one, and we reach out to the songwriters we want beside us.',
        askAbout: 'One line about you (optional)',
        askAboutPlaceholder: 'What you write, or where we can hear it.',
        askSending: 'Sending',
        askDoneTitle: 'We have you',
        askDoneBody: 'Thank you. We read these ourselves, and we will write to {email} if this ticket is yours.',
        askError: 'Something went wrong. Please try again.',
        askInvalid: 'That does not look like an email address.',
        takenTitle: 'This ticket has been taken',
        takenBody: 'Every ticket goes to one songwriter. Look at the wall to see which are still open.',
    },

    /**
     * The card at the end of a ticket page. Closed, it shows what the ticket
     * is worth; pressed, the price is struck through to nothing and the
     * ticket unfolds into what it holds and the two fields that take it.
     *
     * The figure is a year of Veinote Pro at Paddle's current price, read on
     * the server (lib/paddle/proYearlyPrice.ts), not written here.
     */
    /** The two buttons under a ticket page's opening lines. */
    hero: {
        learnMore: 'Learn more',
    },

    activate: {
        button: 'Activate',
        valueLabel: 'Total value of the package',
        period: '/year',
        /** After the press, on a ticket with a name on it. */
        activeTitle: 'Active',
        /** After the press, on a free ticket: nobody is handed one from a page anyone can open. */
        requestTitle: 'Unlocking full Veinote access',
        nameLabel: 'Your name',
        emailLabel: 'Your email',
        save: 'Save',
        saving: 'Saving',
        nameMissing: 'Tell us your name.',
    },

    /** {name} is the first name on the ticket. */
    heroTitle: 'Hey {name}, you have been chosen to be part of Veinote.',
    heroBody: 'We are building the home of human songwriting, and we are opening it first to a hundred people whose work we admire. You are one of them.',

    benefitsTitle: 'Your benefits as a golden member',
    /** The sixth card after the five benefits: the list is not closed. */
    benefitsMore: 'And more to come',
    /**
     * The five things a ticket holds, each drawn as a card with its own icon
     * (ProgramSections) and listed again when the activation card opens. The
     * id picks the icon; the order is the order on the page.
     */
    benefits: [
        { id: 'lifetime', text: 'Lifetime access to every part of Veinote' },
        { id: 'vouchers', text: `${GOLDEN_INVITES_PER_TICKET} exclusive invites for friends or family, each with a 30% discount forever` },
        { id: 'events', text: 'Discounts on Veinote local events' },
        { id: 'host', text: 'The ability to organize and host events with us' },
        { id: 'perks', text: 'Perks and goodies along the way' },
    ],

    /**
     * Example pins for the globe on this page.
     *
     * Invented songwriters in real cities. The Connect map draws from
     * `publicProfiles`, which is signed-in only and holds people who chose to
     * say where they are; a visitor with no account must not be shown them, so
     * these stand in for the shape of the thing rather than its contents.
     *
     * Names are first names only and no photographs are attached, so a pin
     * reads as an illustration rather than as a claim that this person exists.
     */
    mapPins: [
        // Spread deliberately, roughly one to a region. Clustered pins read as
        // one blob at globe zoom, and their cards land on each other, which the
        // map answers by holding all but the first back: four Nordic capitals
        // showed a single name between them.
        { key: 'sthlm', name: 'Elin', city: 'Stockholm', lat: 59.3293, lng: 18.0686 },
        { key: 'ldn', name: 'Rhys', city: 'London', lat: 51.5072, lng: -0.1276 },
        { key: 'lisbon', name: 'Inês', city: 'Lisbon', lat: 38.7223, lng: -9.1393 },
        { key: 'nyc', name: 'Marcus', city: 'New York', lat: 40.7128, lng: -74.006 },
        { key: 'la', name: 'Theo', city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
        { key: 'mexico', name: 'Sofia', city: 'Mexico City', lat: 19.4326, lng: -99.1332 },
        { key: 'saopaulo', name: 'Bia', city: 'São Paulo', lat: -23.5505, lng: -46.6333 },
        { key: 'lagos', name: 'Ada', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
        { key: 'nairobi', name: 'Otieno', city: 'Nairobi', lat: -1.2921, lng: 36.8219 },
        { key: 'mumbai', name: 'Riya', city: 'Mumbai', lat: 19.076, lng: 72.8777 },
        { key: 'seoul', name: 'Haneul', city: 'Seoul', lat: 37.5665, lng: 126.978 },
        { key: 'syd', name: 'Nia', city: 'Sydney', lat: -33.8688, lng: 151.2093 },
    ],

    foundersTitle: 'Hear from the founders of Veinote',
    foundersRead: 'Read the post',
    foundersSoon: 'Coming soon',
    /**
     * The two founders, and the name to find each one's post by.
     *
     * `match` is compared against a post's author, case-insensitively and as a
     * substring, so "Peter" finds "Peter Nordberg" without this file tracking
     * how a byline is written. A card shows whatever that founder published
     * most recently, so renaming a post never leaves a link pointing nowhere.
     *
     * `soonTitle` stands in until a founder's post exists, and that card is not
     * a link. The array's order is the display order.
     */
    founders: [
        { match: 'Peter', role: 'Co-founder', soonTitle: 'A word from Peter, Co-founder' },
        { match: 'Ali', role: 'Co-founder', soonTitle: 'A word from Ali, Co-founder' },
    ],


    /**
     * The showcase, as four sections: a title and a paragraph beside each
     * visual. The onboarding titles are written for someone already inside the
     * flow, a step at a time; these are written for one scroll of a page, so
     * each says what the visual beside it is proving rather than naming a
     * feature.
     */
    showcase: {
        collab: {
            title: 'Write it together, in the same canvas',
            body: 'Open a song with someone and you are both inside it: the words down one side, the takes down the other, their cursor moving while you type. No files going back and forth, no two versions to reconcile afterwards.',
        },
        tools: {
            title: 'One canvas for the whole song',
            body: 'Type a line, sing the idea before it goes, photograph a verse off a notebook page. Words, voice notes and recordings stay in one place, with rhymes and a demo studio a click away instead of in another app.',
        },
        publish: {
            title: 'The song stays yours',
            body: 'Finish it, then share it as a link anyone can open, with no account and no app to install. Your lyrics, your recording, your name on it, and nothing signed away to us to put it out.',
        },
        science: {
            title: 'Backed by science',
            body: 'Writing is not one skill but several at once, and each of them is a different part of the mind doing work. Veinote counts the minutes you spend on it, and a full week of them turns the whole thing gold.',
        },
    },

    /**
     * One line per region, on what songwriting in particular does for it.
     *
     * The product's own `progress.regions.*` strings are a label and a couple
     * of clinical sentences, written for a member reading their own week. A
     * reader here has no week and no context, so each area gets a single plain
     * line about the benefit, drawn from the same descriptions rather than
     * invented beside them.
     */
    regionBenefits: {
        prefrontal: 'Writing quietens the inner critic, so the bigger ideas get room to form.',
        hippocampus: 'Tying words to a melody is what makes a song stick, for you and for a listener.',
        reward: 'Building tension and then resolving it trains your ear for what actually lands.',
        auditory: 'Hearing a part before you play it is a skill, and writing is how it sharpens.',
        callosum: 'Weaving words, pitch and rhythm together thickens the bridge between logic and feeling.',
        language: 'Hunting for the right phrase, stress and rhyme sharpens the language network itself.',
    } as Record<string, string>,

    togetherTitle: 'We bring human writers together',

    videoTitle: 'See Veinote in action',
    /** On the still, before the player is loaded. */
    videoPlay: 'Play the video',

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

} as const;

export function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
}
