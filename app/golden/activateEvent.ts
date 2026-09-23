/**
 * The hero's Activate button and the activation card at the end of the page
 * are one action split across the page: the button takes the visitor down to
 * the card, and the card opens itself as it comes into view. They talk by
 * this one window event rather than by shared state, because they live in
 * separate client islands under a server-rendered page.
 */
export const ACTIVATE_EVENT = 'golden:activate';

/** The id every golden page's closing section carries, and the scroll target. */
export const ACTIVATE_ANCHOR = 'ticket';

/** Where the hero's Learn more lands: the first section after the hero. */
export const LEARN_MORE_ANCHOR = 'learn-more';
