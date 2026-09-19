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
     * The clip at `videoUrl` is not this practice's own walkthrough — it is a
     * Learn chapter standing in. The card still shows its play button, and the
     * button still presses; what it does is say the clip is coming rather than
     * open the stand-in. Set this rather than clearing videoUrl: the placeholder
     * URL is what the real recording will replace, and losing it loses the note
     * of where it goes.
     *
     * A practice with no videoUrl at all behaves identically, so this only
     * needs setting where there is a URL to suppress.
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
        // A Learn chapter standing in, not a walkthrough of this exercise, so
        // the play button says the clip is coming rather than opening it.
        videoPending: true,
        available: true,
    },
    {
        name: 'Composing verses',
        nameKey: 'practice.composing_verses',
        goalKey: 'practice.goal_composing_verses',
        level: 'beginner',
        progress: 30,
        score: 95,
        time: '18 min',
        videoUrl: `${VIDEO_DIR}/verse.compressed.mp4`,
        posterUrl: `${VIDEO_DIR}/verse-poster.jpg`,
        // Likewise borrowed from Learn until this practice has its own.
        videoPending: true,
        available: true,
    },
    {
        // Renamed from "Melody & harmony" now the exercise exists and is about
        // varying a melody rather than fitting chords to one. Harmony is still
        // worth its own practice later; this slot is no longer it.
        name: 'Melody variations',
        nameKey: 'practice.melody_variations',
        goalKey: 'practice.goal_melody_variations',
        level: 'beginner',
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
        // Moved up from ninth to be the fourth practice built. It needs no
        // content: chords come from theory and the sound from the canvas's
        // strum synth, so there was nothing to wait for.
        name: 'Chord progressions',
        nameKey: 'practice.chord_progressions',
        goalKey: 'practice.goal_chord_progressions',
        level: 'beginner',
        progress: 0,
        score: 0,
        time: '10 min',
        // No walkthrough shot yet, and no placeholder clip borrowed either. The
        // card still carries a play button, which says the clip is coming —
        // no videoPending needed, a missing videoUrl reads the same way.
        available: true,
    },
    {
        // Moved up from eighth to be the fifth practice built. Like Chord
        // progressions it needs no content: both drums are synthesised.
        name: 'Rhythm and phrasing',
        nameKey: 'practice.rhythm_and_phrasing',
        goalKey: 'practice.goal_rhythm_and_phrasing',
        level: 'beginner',
        progress: 0,
        score: 0,
        time: '10 min',
        available: true,
    },
    {
        // Moved up from the tail of the roadmap to be the sixth practice
        // built: a theme, a pile of notes, and the notes tapped into lines.
        // Draws its themes from the same console library Composing verses does.
        name: 'Writing from a feeling',
        nameKey: 'practice.writing_from_a_feeling',
        goalKey: 'practice.goal_writing_from_a_feeling',
        level: 'beginner',
        progress: 0,
        score: 0,
        time: '15 min',
        available: true,
    },
    {
        // New to the catalogue, the seventh built: a given phrase and the
        // phrase that answers it, on Melody's grid. The sixteenth entry
        // overall, so the menu, capped at fifteen, now stops one short of
        // the roadmap's tail.
        name: 'Developing a melody',
        nameKey: 'practice.developing_a_melody',
        goalKey: 'practice.goal_developing_a_melody',
        // From here on the practices build on the first six, and are
        // labelled for it.
        level: 'intermediate',
        progress: 0,
        score: 0,
        time: '10 min',
        available: true,
    },
    {
        // New to the catalogue, the eighth built: a plain progression given,
        // and the sevenths, suspensions and borrowed chords to develop it
        // with, on Chord progressions' bars. The seventeenth entry overall.
        name: 'Developing a progression',
        nameKey: 'practice.developing_a_progression',
        goalKey: 'practice.goal_developing_a_progression',
        level: 'intermediate',
        progress: 0,
        score: 0,
        time: '10 min',
        available: true,
    },
    {
        // New to the catalogue, the ninth built: a feel given — pattern and
        // tempo — and the bar changed until it moves your way, on Rhythm's
        // grid with a snare row added. The eighteenth entry overall.
        name: 'Developing a rhythm',
        nameKey: 'practice.developing_a_rhythm',
        goalKey: 'practice.goal_developing_a_rhythm',
        level: 'intermediate',
        progress: 0,
        score: 0,
        time: '10 min',
        available: true,
    },
    {
        // New to the catalogue, the tenth built: a beginning given — two
        // lines — and the lines that follow written on Writing from a
        // feeling's line builder, with a row of words to reach for. The
        // nineteenth entry overall.
        name: 'Finishing a verse',
        nameKey: 'practice.finishing_a_verse',
        goalKey: 'practice.goal_finishing_a_verse',
        level: 'intermediate',
        progress: 0,
        score: 0,
        time: '15 min',
        available: true,
    },
    {
        // New to the catalogue, the eleventh built: four bars of chords given
        // and a melody written over them on Melody's grid, the two heard and
        // rendered together. The twentieth entry overall.
        name: 'Melody over chords',
        nameKey: 'practice.melody_over_chords',
        goalKey: 'practice.goal_melody_over_chords',
        level: 'intermediate',
        progress: 0,
        score: 0,
        time: '10 min',
        available: true,
    },
    {
        // New to the catalogue, the twelfth built: a whole kit — hat, snare,
        // kick, clap, tom — in one of two sounds, on Rhythm's grid, with a
        // bar dealt on request. The twenty-first entry overall.
        name: 'Build a beat',
        nameKey: 'practice.build_a_beat',
        goalKey: 'practice.goal_build_a_beat',
        level: 'intermediate',
        progress: 0,
        score: 0,
        time: '10 min',
        available: true,
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
        // Its promised day (15 September 2026) has come and gone with the
        // practice unbuilt, so, like the one in front of it, it says "soon"
        // rather than counting to a day nothing ships on. It keeps its slot,
        // so the dates behind it hold.
        undated: true,
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
    ...planned('Telling a story', 'telling_a_story', 'intermediate'),
    ...planned('Imagery and detail', 'imagery_and_detail', 'intermediate'),
    ...planned('Titles that stick', 'titles_that_stick', 'beginner'),
    ...planned('Bridges that turn', 'bridges_that_turn', 'advanced'),
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
