/**
 * The Golden program's gold, taken from the one place the product already
 * draws it: the Mind Power visual.
 *
 * A golden ticket and a golden mind are meant to be the same gold. They were
 * not: the ticket had a gold of its own (#F3CF6F to #C9973A), the seal a third
 * (#E9B94F), and the two sat side by side on the same page. These are the
 * values Mind Power uses, listed once so the program cannot drift again.
 *
 * Where each comes from, so a change there can be followed here:
 *   PALE   the lightest confetti tone, GoldenMindStage CONFETTI_COLORS
 *   LIGHT  the golden tick and golden figures, StreakGrid / WeekRecap
 *   BRIGHT the end of the golden progress bar, platform/layout
 *   MID    a region at or past its target, MindPowerBrain
 *   DEEP   the start of that progress bar; tailwind's gold.500
 *
 * BRIGHT to MID to DEEP is the gradient a golden mind fills with, and now the
 * gradient a taken ticket is printed on.
 */

export const GOLD = {
    pale: '#FFF1AE',
    light: '#E8CC8C',
    bright: '#F1D066',
    mid: '#DCAE3C',
    deep: '#C5A059',
} as const;

/**
 * The golden mind's fill as a CSS gradient, for buttons printed on the same
 * gold as a taken ticket: Activate (top and card) and Save. The offset under
 * a pressed golden button is GOLD_PRESS, the gradient's shadow tone.
 */
export const GOLD_GRADIENT = `linear-gradient(135deg, ${GOLD.bright} 0%, ${GOLD.mid} 55%, ${GOLD.deep} 100%)`;
export const GOLD_PRESS = '#9E8047';
