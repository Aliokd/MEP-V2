"use client";
import { useFocusTimer, formatFocusTime } from '@/lib/focusTimer';

/**
 * The one live slot in the Mind Power pill, between the brain icon and the bar.
 *
 * The pill no longer carries a static "Mind Power" label — that word never changed and
 * so never earned its space. This slot instead stays empty until there is something
 * worth saying, then appears to say it:
 *
 *   1. "Saving progress ..."  — a short confirmation of an action just taken
 *   2. the focus countdown    — only while a session is actually running; a
 *                                finished timer leaves rather than sitting at 00:00
 *
 * Saving outranks the timer because it is brief and tied to something the user did a
 * moment ago; when it clears, the slot falls back to the countdown if one is running.
 *
 * Subscribes to the timer store itself so the per-second tick re-renders this node
 * alone rather than the whole platform layout.
 *
 * Deliberately mounts/unmounts rather than animating an measured width: a width
 * transition here needs a JS-measured pixel value, and setting that on mount did not
 * reliably trigger layout — the slot stayed collapsed until something else forced a
 * reflow. A fade on a self-sizing element has no such dependency.
 */
export default function MindPowerStatus({
    t,
    isSaving = false,
    size = 'md',
}: {
    t: (key: string) => string;
    isSaving?: boolean;
    size?: 'sm' | 'md';
}) {
    const { remainingSeconds, isRunning } = useFocusTimer();

    const mode: 'saving' | 'timer' | 'idle' = isSaving
        ? 'saving'
        : isRunning
          ? 'timer'
          : 'idle';

    if (mode === 'idle') return null;

    return (
        <span
            className={`flex items-center gap-1.5 shrink-0 whitespace-nowrap font-medium tabular-nums animate-in fade-in duration-300 ${
                size === 'sm' ? 'text-[11px]' : 'text-xs'
            } ${
                mode === 'saving' ? 'text-[#5f8f58]' : 'text-stone-600'
            }`}
            aria-live="polite"
        >
            {mode === 'saving' ? t('progress.progress_saved') : formatFocusTime(remainingSeconds)}
        </span>
    );
}
