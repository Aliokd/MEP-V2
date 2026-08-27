/**
 * What a formatting button does to a text field.
 *
 * Pure: takes the text and where the caret is, returns the new text and where
 * the caret should end up. No DOM, no React — the fiddly part of a toolbar is
 * the selection arithmetic, and it is much easier to be sure of when it can be
 * tested directly rather than by clicking.
 *
 * Markdown stays the storage format. These buttons type the characters a person
 * would otherwise have to remember, which is the whole of the problem worth
 * solving here — a WYSIWYG editor would mean maintaining a serialiser and a
 * second idea of what the document is.
 */

export type MarkdownAction = "bold" | "italic" | "link" | "heading" | "list";

export interface EditResult {
    value: string;
    /** Where the selection should sit afterwards, so typing continues naturally. */
    selectionStart: number;
    selectionEnd: number;
}

/** Actions that wrap the selection in markers. */
const WRAPPERS: Record<string, { before: string; after: string; placeholder: string }> = {
    bold: { before: "**", after: "**", placeholder: "bold text" },
    italic: { before: "*", after: "*", placeholder: "italic text" },
};

/** Actions that mark whole lines. */
const PREFIXES: Record<string, string> = {
    heading: "## ",
    list: "- ",
};

const LINK_URL_PLACEHOLDER = "https://";

/** The line boundaries containing [from, to], expanded to whole lines. */
function lineRange(value: string, from: number, to: number): { start: number; end: number } {
    const start = value.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
    const nextBreak = value.indexOf("\n", to);
    return { start, end: nextBreak === -1 ? value.length : nextBreak };
}

function applyWrapper(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    action: "bold" | "italic",
): EditResult {
    const { before, after, placeholder } = WRAPPERS[action];
    const selected = value.slice(selectionStart, selectionEnd);

    // Pressing bold on text that is already bold takes it off again. Without
    // this the button only ever adds, and undoing means hunting for asterisks.
    const wrappedOutside =
        value.slice(Math.max(0, selectionStart - before.length), selectionStart) === before &&
        value.slice(selectionEnd, selectionEnd + after.length) === after;

    if (wrappedOutside) {
        const start = selectionStart - before.length;
        return {
            value: value.slice(0, start) + selected + value.slice(selectionEnd + after.length),
            selectionStart: start,
            selectionEnd: start + selected.length,
        };
    }

    // Italic's marker is a single asterisk, which is also the first character of
    // bold's — so **bold** looks italic-wrapped to a naive check, and pressing
    // italic on bold text would strip it to *bold* instead of adding emphasis.
    // A longer run of the same character means this is not our wrapper.
    const markerChar = before[0];
    const looksLikeLongerMarker =
        selected.startsWith(markerChar.repeat(before.length + 1)) ||
        selected.endsWith(markerChar.repeat(after.length + 1));

    if (
        !looksLikeLongerMarker &&
        selected.startsWith(before) &&
        selected.endsWith(after) &&
        selected.length > before.length + after.length
    ) {
        const inner = selected.slice(before.length, selected.length - after.length);
        return {
            value: value.slice(0, selectionStart) + inner + value.slice(selectionEnd),
            selectionStart,
            selectionEnd: selectionStart + inner.length,
        };
    }

    const text = selected || placeholder;
    return {
        value: value.slice(0, selectionStart) + before + text + after + value.slice(selectionEnd),
        // The text lands selected, so typing replaces the placeholder and a real
        // selection stays highlighted for the next button.
        selectionStart: selectionStart + before.length,
        selectionEnd: selectionStart + before.length + text.length,
    };
}

function applyLink(value: string, selectionStart: number, selectionEnd: number): EditResult {
    const selected = value.slice(selectionStart, selectionEnd);
    const label = selected || "link text";
    const inserted = `[${label}](${LINK_URL_PLACEHOLDER})`;

    // The URL is what still has to be supplied, so that is what ends up selected
    // — paste replaces it in one motion.
    const urlStart = selectionStart + 1 + label.length + 2;
    return {
        value: value.slice(0, selectionStart) + inserted + value.slice(selectionEnd),
        selectionStart: urlStart,
        selectionEnd: urlStart + LINK_URL_PLACEHOLDER.length,
    };
}

function applyPrefix(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    action: "heading" | "list",
): EditResult {
    const prefix = PREFIXES[action];
    const { start, end } = lineRange(value, selectionStart, selectionEnd);
    const block = value.slice(start, end);
    const lines = block.split("\n");

    // Off if every line already carries it — matching how bold behaves, and how
    // a list button behaves everywhere else.
    const allPrefixed = lines.every((line) => line.startsWith(prefix));

    const nextLines = lines.map((line) => {
        if (allPrefixed) return line.slice(prefix.length);
        if (line.startsWith(prefix)) return line;
        // A line already marked as something else swaps rather than stacks:
        // "## - text" is not a thing anyone meant to write.
        const stripped = line.replace(/^(#{1,6} |- )/, "");
        return prefix + stripped;
    });
    const next = nextLines.join("\n");

    // The caret moves by what its *own* line gained or lost, which is not the
    // prefix length whenever one marker replaced another — turning "- item" into
    // "## item" is a net gain of one character, not three.
    const firstLineShift = nextLines[0].length - lines[0].length;
    const delta = next.length - block.length;

    const nextStart = Math.max(start, selectionStart + firstLineShift);
    return {
        value: value.slice(0, start) + next + value.slice(end),
        selectionStart: nextStart,
        // Never let the end fall behind the start: a reversed range renders as a
        // caret in the wrong place rather than as a selection.
        selectionEnd: Math.max(nextStart, selectionEnd + delta),
    };
}

export function applyMarkdown(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    action: MarkdownAction,
): EditResult {
    const from = Math.min(selectionStart, selectionEnd);
    const to = Math.max(selectionStart, selectionEnd);

    switch (action) {
        case "bold":
        case "italic":
            return applyWrapper(value, from, to, action);
        case "link":
            return applyLink(value, from, to);
        case "heading":
        case "list":
            return applyPrefix(value, from, to, action);
        default:
            return { value, selectionStart: from, selectionEnd: to };
    }
}
