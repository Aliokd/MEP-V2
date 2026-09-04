/**
 * One display name, three shapes.
 *
 * The account stores a single `displayName` ("Knut Roertveit") — Firebase Auth
 * has no first/last split and the public profile mirrors the same string. The
 * profile page edits it as two fields and Connect shows it abbreviated, so both
 * derive from the one value here rather than inventing stored fields that every
 * existing account would lack.
 */

export interface NameParts {
    first: string;
    last: string;
}

/** "Knut Roertveit Hansen" → { first: "Knut", last: "Roertveit Hansen" }. */
export function splitName(displayName: string): NameParts {
    const words = displayName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return { first: '', last: '' };
    return { first: words[0], last: words.slice(1).join(' ') };
}

/** The inverse — trims each side so stray spaces never reach the account. */
export function joinName(first: string, last: string): string {
    return [first.trim(), last.trim()].filter(Boolean).join(' ');
}

/**
 * How a songwriter is named on a card: first name and the initial of the last
 * word — "Knut R." A single-word name is shown as it is.
 */
export function shortName(displayName: string): string {
    const { first, last } = splitName(displayName);
    if (!first) return '';
    if (!last) return first;
    const initial = last.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? '';
    return initial ? `${first} ${initial}.` : first;
}
