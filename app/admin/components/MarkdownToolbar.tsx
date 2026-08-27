"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Link2, Heading2, List } from "lucide-react";
import { Textarea } from "./ui";
import { applyMarkdown, type MarkdownAction } from "@/lib/markdownEdits";

/**
 * Puts the selection back after the field's value has been replaced.
 *
 * Not in a requestAnimationFrame: React commits the controlled textarea's new
 * value on its own schedule, and when that lands after the frame callback it
 * resets the DOM node and collapses the selection — the button worked, and the
 * highlight vanished. An effect keyed on the value runs after that commit, which
 * is the only moment the range is safe to set.
 */
function useSelectionRestore(
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    value: string,
) {
    const pending = useRef<[number, number] | null>(null);

    useEffect(() => {
        const range = pending.current;
        const field = textareaRef.current;
        if (!range || !field) return;
        pending.current = null;
        field.focus();
        field.setSelectionRange(range[0], range[1]);
    }, [value, textareaRef]);

    return (start: number, end: number) => {
        pending.current = [start, end];
    };
}

const ALL_BUTTONS: { action: MarkdownAction; Icon: React.ElementType; title: string }[] = [
    { action: "bold", Icon: Bold, title: "Bold  (Ctrl+B)" },
    { action: "italic", Icon: Italic, title: "Italic  (Ctrl+I)" },
    { action: "link", Icon: Link2, title: "Link  (Ctrl+K)" },
    { action: "heading", Icon: Heading2, title: "Heading" },
    { action: "list", Icon: List, title: "Bullet list" },
];

/**
 * Formatting buttons for a markdown field.
 *
 * They type the characters, nothing more — the field still holds markdown and
 * the page still renders it server-side. That keeps one storage format and one
 * idea of what the document is, which is the thing a WYSIWYG editor gives up.
 *
 * What it buys is discoverability: nobody guesses `**bold**` from a placeholder,
 * and asking an editor to learn a syntax before they can make a word bold is a
 * tax on every piece of copy they will ever write.
 */
export default function MarkdownToolbar({
    textareaRef,
    value,
    onChange,
    actions,
}: {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (next: string) => void;
    /** Defaults to all five. Lesson text blocks leave out headings and lists. */
    actions?: MarkdownAction[];
}) {
    const buttons = actions ? ALL_BUTTONS.filter((b) => actions.includes(b.action)) : ALL_BUTTONS;
    const restore = useSelectionRestore(textareaRef, value);

    const apply = (action: MarkdownAction) => {
        const field = textareaRef.current;
        // Without the element there is no selection to act on. Appending to the
        // end would be worse than doing nothing — it would put the markers
        // somewhere the person was not looking.
        if (!field) return;

        const result = applyMarkdown(value, field.selectionStart, field.selectionEnd, action);
        onChange(result.value);
        // Restoring focus and the selection is what makes the button feel like
        // part of the field rather than something that interrupts it.
        restore(result.selectionStart, result.selectionEnd);
    };

    return (
        <div className="flex items-center gap-0.5">
            {buttons.map(({ action, Icon, title }) => (
                <button
                    key={action}
                    type="button"
                    title={title}
                    aria-label={title}
                    // The field keeps its selection: without this the textarea
                    // blurs on press and selectionStart collapses before the
                    // click handler ever runs.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => apply(action)}
                    className="p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-700 transition-colors"
                >
                    <Icon className="w-3.5 h-3.5" />
                </button>
            ))}
        </div>
    );
}

/**
 * A markdown field that owns its own ref, toolbar and shortcuts.
 *
 * For the places where fields are produced in a loop — a lesson's blocks — and
 * a single ref in the parent would point at whichever one rendered last.
 */
export function MarkdownField({
    value,
    onChange,
    actions,
    hint,
    ...textareaProps
}: {
    value: string;
    onChange: (next: string) => void;
    actions?: MarkdownAction[];
    hint?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const onKeyDown = useMarkdownShortcuts(ref, value, onChange);

    return (
        <div className="flex flex-col gap-1.5">
            <MarkdownToolbar textareaRef={ref} value={value} onChange={onChange} actions={actions} />
            <Textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                {...textareaProps}
            />
            {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
        </div>
    );
}

/**
 * Ctrl/Cmd+B, I and K on a markdown field.
 *
 * The shortcuts people already have in their fingers from every other editor.
 * Returns a keydown handler to spread onto the textarea.
 */
export function useMarkdownShortcuts(
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    value: string,
    onChange: (next: string) => void,
) {
    const restore = useSelectionRestore(textareaRef, value);

    return (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!(event.metaKey || event.ctrlKey)) return;

        const action: MarkdownAction | null =
            event.key === "b" ? "bold" : event.key === "i" ? "italic" : event.key === "k" ? "link" : null;
        if (!action) return;

        event.preventDefault();
        const field = textareaRef.current;
        if (!field) return;

        const result = applyMarkdown(value, field.selectionStart, field.selectionEnd, action);
        onChange(result.value);
        restore(result.selectionStart, result.selectionEnd);
    };
}
