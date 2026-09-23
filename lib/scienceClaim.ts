/**
 * The one science claim the product makes, and how it is marked.
 *
 * Onboarding's science step and the Golden program's "Backed by science"
 * section both show it: "Active music-making truly engages your entire
 * brain.", with the second half highlighted and linked to its source. The
 * wording lives in the locale files (`onboarding.intro.slides.psychology.
 * science.claim_*`); the source and the marker live here, so the claim has one
 * citation and one look wherever it appears.
 */

/** Harvard Health Publishing, the same institution as the mark shown with it. */
export const SCIENCE_SOURCE = 'https://www.health.harvard.edu/blog/why-is-music-good-for-the-brain-2020100721062';

// The highlighter that draws itself across the claim.
//
// A background gradient whose width is animated, not an SVG stroke: the phrase
// is live text that rewraps with the language and the viewport, and a drawn
// path would have to be re-measured every time it did. A background follows
// the text for free, and clips to each line if the phrase ever wraps.
//
// The band sits across the lower part of the line rather than behind all of
// it, which is where a real marker lands, and is held back from full strength
// so the words stay the thing being read.
export const MARKER_COLOR = 'rgba(220, 242, 60, 0.55)';
export const MARKER_BAND = `linear-gradient(transparent 22%, ${MARKER_COLOR} 22%, ${MARKER_COLOR} 100%)`;
/** Long enough to read as a hand drawing it rather than a box appearing. */
export const MARKER_SWEEP_MS = 900;
/** A beat after the claim arrives, so the eye has landed before the mark moves. */
export const MARKER_DELAY_MS = 650;
