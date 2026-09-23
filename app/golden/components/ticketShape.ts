import { GOLDEN_TICKETS_TOTAL } from '@/lib/uiFlags';
import { GOLD } from '../goldPalette';

/**
 * The ticket's measurements and the two surfaces it is drawn on, kept beside
 * the component rather than inside it so the cards that lay HTML over the
 * artwork can line up with its stub without guessing.
 */

export const W = 400;
export const H = 240;
/** Where the stub is torn off, in viewBox units. */
export const STUB_X = 296;
export const NOTCH_R = 13;
export const RADIUS = 18;

/** `gold` is the website's paper wall; `ink` is the dark admin console. */
export type TicketTone = 'gold' | 'ink';

/** The background the notches are "cut" with, per surface. */
export const CUT: Record<TicketTone, string> = {
    gold: '#E6E3DB',
    ink: '#0B0B0C',
};

export const BODY: Record<TicketTone, { issued: [string, string, string]; empty: [string, string] }> = {
    gold: {
        // The golden mind's own gradient, end to end. A taken ticket is the
        // same gold as a full week.
        issued: [GOLD.bright, GOLD.mid, GOLD.deep],
        // An open place is the pale half of the same family, not a different
        // gold: paler paper, waiting to be printed.
        empty: [GOLD.pale, GOLD.light],
    },
    ink: {
        issued: ['#26282C', '#1A1B1E', '#141416'],
        empty: ['#161719', '#111214'],
    },
};

/** Ink on gold paper; gold on a black ticket. */
export const MARK: Record<TicketTone, string> = {
    gold: '#1F1F1F',
    ink: GOLD.bright,
};

export function padTicketNumber(number: number): string {
    return String(number).padStart(String(GOLDEN_TICKETS_TOTAL).length, '0');
}
