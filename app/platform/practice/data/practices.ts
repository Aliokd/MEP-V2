/**
 * The practice catalogue.
 *
 * `name` is the stable English string the rest of the tab switches on — the
 * translated label lives behind `nameKey`, so renaming a practice in the UI
 * never breaks the logic that keys off it.
 */

import { MELODY_VARIATIONS_ENABLED } from '@/lib/uiFlags';

export type PracticeLevel = 'beginner' | 'intermediate' | 'advanced' | 'all levels';

export interface PracticeDefinition {
    name: string;
    /** i18n key for the display name. */
    nameKey: string;
    /** i18n key for the one-line goal shown on the card. */
    goalKey: string;
    level: PracticeLevel;
    /** Session metrics shown in the stats row. Static until we track them for real. */
    progress: number;
    score: number;
    time: string;
    /**
     * Intro clip opened by the card's play button. These currently point at the
     * Learn "Master fundamentals" recordings as placeholders — swap each one for
     * its own practice walkthrough once those are shot.
     */
    videoUrl?: string;
    posterUrl?: string;
    /**
     * The intro clip has not been recorded. The card still shows its play
     * button — the clip is coming, and dropping the control would move the
     * title every time one lands — but the button is inert and says so. Set
     * this rather than clearing videoUrl: the placeholder URL is what the real
     * recording will replace, and losing it loses the note of where it goes.
     */
    videoPending?: boolean;
    /** false → the card shows "coming soon" and cannot be started. */
    available: boolean;
    /**
     * ISO date (yyyy-mm-dd) an unbuilt practice is promised for. Assigned
     * below from the release cadence; set it by hand to pin a specific date.
     */
    releaseAt?: string;
    /**
     * Built but held back by a flag rather than waiting to be written. A gated
     * practice sits outside the release cadence below entirely — it takes no
     * slot, because locking it must not shift anybody else's date when it can
     * unlock at any moment without a schedule change — and shows a plain
     * "Coming soon".
     */
    gated?: boolean;
    /**
     * Planned, but not promised for a particular day. It keeps its place in the
     * cadence — so the practices behind it hold the dates they already had —
     * and shows a plain "Coming soon" instead of a countdown. What this is for
     * is the practice at the front of the queue, whose date the anchor has
     * caught up with: "Coming in 1 day" on something nobody is shipping
     * tomorrow is a promise the card cannot keep.
     */
    undated?: boolean;
}

const VIDEO_DIR = '/videos/Master%20fundamentals';

/** A practice that is on the roadmap but not built yet. */
function planned(name: string, key: string, level: PracticeLevel): [PracticeDefinition] {
    return [{
        name,
        nameKey: `practice.${key}`,
        goalKey: `practice.goal_${key}`,
        level,
        progress: 0,
        score: 0,
        time: '0 min',
        available: false,
    }];
}

export const PRACTICES: PracticeDefinition[] = [
    {
        name: 'Master song structure',
        nameKey: 'practice.master_song_structure',
        goalKey: 'practice.goal_master_song_structure',
        level: 'beginner',
        progress: 65,
        score: 125,
        time: '25 min',
        videoUrl: `${VIDEO_DIR}/song-structure-v2.compressed.mp4`,
        posterUrl: `${VIDEO_DIR}/song-structure-v2-poster.jpg`,
        available: true,
    },
    {
        name: 'Composing verses',
        nameKey: 'practice.composing_verses',
        goalKey: 'practice.goal_composing_verses',
        level: 'intermediate',
        progress: 30,
        score: 95,
        time: '18 min',
        videoUrl: `${VIDEO_DIR}/verse.compressed.mp4`,
        posterUrl: `${VIDEO_DIR}/verse-poster.jpg`,
        available: true,
    },
    {
        // Renamed from "Melody & harmony" now the exercise exists and is about
        // varying a melody rather than fitting chords to one. Harmony is still
        // worth its own practice later; this slot is no longer it.
        name: 'Melody variations',
        nameKey: 'practice.melody_variations',
        goalKey: 'practice.goal_melody_variations',
        level: 'intermediate',
        progress: 10,
        score: 180,
        time: '15 min',
        videoUrl: `${VIDEO_DIR}/chorus.compressed.mp4`,
        posterUrl: `${VIDEO_DIR}/chorus-poster.jpg`,
        // Nothing has been shot for this one; the URL above is the placeholder
        // every card started with, and its play button stays inert until a real
        // walkthrough replaces it.
        videoPending: true,
        // Live. Read from the flag rather than written true here so there is one
        // switch to throw if it ever has to come back down — see
        // MELODY_VARIATIONS_ENABLED, which also records what it depends on.
        available: MELODY_VARIATIONS_ENABLED,
        // Redundant while available is true (the walk skips anything available),
        // and deliberately kept: it is what stops this slot claiming a release
        // date if the flag is ever flipped back.
        gated: true,
    },
    {
        name: 'Advanced structures',
        nameKey: 'practice.advanced_structures',
        goalKey: 'practice.goal_advanced_structures',
        // First in the queue, and the anchor has arrived: plain "Coming soon"
        // rather than a countdown to a day nothing ships on.
        undated: true,
        level: 'advanced',
        progress: 0,
        score: 0,
        time: '0 min',
        videoUrl: `${VIDEO_DIR}/bridge.compressed.mp4`,
        posterUrl: `${VIDEO_DIR}/bridge-poster.jpg`,
        available: false,
    },
    {
        name: 'Free hand session',
        nameKey: 'practice.free_hand_session',
        goalKey: 'practice.goal_free_hand_session',
        level: 'all levels',
        progress: 0,
        score: 0,
        time: '0 min',
        videoUrl: `${VIDEO_DIR}/from-idea-to-finished-song.compressed.mp4`,
        posterUrl: `${VIDEO_DIR}/from-idea-to-finished-song-poster.jpg`,
        available: false,
    },

    /*
     * The rest of the roadmap. They carry no video yet, so their cards show the
     * copy alone — fill in videoUrl/posterUrl as each one gets recorded, and flip
     * `available` when the practice itself is built.
     */
    ...planned('Finding hooks', 'finding_hooks', 'beginner'),
    ...planned('Rhyme without cliché', 'rhyme_without_cliche', 'intermediate'),
    ...planned('Rhythm and phrasing', 'rhythm_and_phrasing', 'intermediate'),
    ...planned('Telling a story', 'telling_a_story', 'intermediate'),
    ...planned('Chord progressions', 'chord_progressions', 'beginner'),
    ...planned('Imagery and detail', 'imagery_and_detail', 'intermediate'),
    ...planned('Titles that stick', 'titles_that_stick', 'beginner'),
    ...planned('Bridges that turn', 'bridges_that_turn', 'advanced'),
    ...planned('Writing from a feeling', 'writing_from_a_feeling', 'all levels'),
    ...planned('Co-writing session', 'co_writing_session', 'all levels'),
];

/*
 * The release schedule for everything not built yet: one new practice every
 * two weeks, in catalogue order, starting from the anchor below. Dates land
 * deterministically, so the promise shown to users never drifts day to day.
 */
const RELEASE_ANCHOR_UTC = Date.UTC(2026, 8, 1); // 1 September 2026
const RELEASE_CADENCE_DAYS = 14;

{
    let queue = 0;
    for (const practice of PRACTICES) {
        if (practice.available || practice.releaseAt || practice.gated) continue;
        // An undated one still spends its slot — skipping it outright would
        // hand its date to the practice behind it and simply move the too-soon
        // countdown one card along.
        if (!practice.undated) {
            practice.releaseAt = new Date(RELEASE_ANCHOR_UTC + queue * RELEASE_CADENCE_DAYS * 86400000)
                .toISOString()
                .slice(0, 10);
        }
        queue += 1;
    }
}

/** How many entries the header menu lists. */
export const MENU_LIMIT = 15;

export const PRACTICE_NAMES = PRACTICES.slice(0, MENU_LIMIT).map(p => p.name);

/** Falls back to the first practice so an unknown name can never blank the tab. */
export function getPractice(name: string): PracticeDefinition {
    return PRACTICES.find(p => p.name === name) || PRACTICES[0];
}
