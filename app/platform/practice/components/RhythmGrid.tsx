"use client";

import { useLanguage } from '@/context/LanguageContext';
import { STEPS, type Voice } from '../lib/rhythmSynth';

/*
 * The rhythm grid: one row per voice, sixteen steps across, counted 1 e & a
 * with the beats bolder than their subdivisions. Shared by Rhythm (two rows,
 * all yours), Developing a rhythm (three rows, the feel given) and Build a
 * beat (five rows, a whole kit), so the three cannot drift apart.
 *
 * Each beat's four steps are a group; the gaps between groups are narrow
 * columns of their own, so the bar reads as four beats rather than sixteen
 * squares.
 */

/** The step under the playhead. The take-cream the other practices use for "live". */
const LIVE_BG = '#FBFFED';
/** A placed hit: the linked green the practices use for "chosen". */
const HIT_BG = '#86BE7F';
const HIT_LIVE_BG = '#5F9857';
/** A hit that was given rather than placed: the melody purple, as on the melody grid. */
const GIVEN_BG = '#B79DF0';
const GIVEN_LIVE_BG = '#9B7BE0';
/** The counts — 1 e & a — for the header. */
const SUBDIVISIONS = ['', 'e', '&', 'a'] as const;

/** A row per voice drawn; a practice that draws fewer voices carries fewer rows. */
export type RhythmCells = Partial<Record<Voice, boolean[]>>;

interface RhythmGridProps {
    /** Rows, top to bottom. */
    voices: Voice[];
    grid: RhythmCells;
    /** Which hits are given rather than the songwriter's. Optional. */
    given?: (voice: Voice, step: number) => boolean;
    playingStep: number | null;
    interactive: boolean;
    onToggle?: (voice: Voice, step: number) => void;
    /**
     * What each row is called. The default names are the two-row practice's
     * (High, Low); a whole kit names its drums.
     */
    labels?: Partial<Record<Voice, string>>;
}

export default function RhythmGrid({ voices, grid, given, playingStep, interactive, onToggle, labels }: RhythmGridProps) {
    const { t } = useLanguage();
    const columns = `2.5rem ${[0, 1, 2, 3].map(() => 'repeat(4, minmax(0, 1fr))').join(' 0.5rem ')}`;
    const label = (voice: Voice) => labels?.[voice] ?? t(`practice.rb_${voice}`);

    return (
        <div className="verse-card is-static mx-auto w-full max-w-[40rem] rounded-[20px] px-3 py-4 sm:px-5" data-rb-grid>
            <div className="grid gap-1" style={{ gridTemplateColumns: columns }}>
                {/* The count */}
                <span />
                {Array.from({ length: STEPS }, (_, s) => {
                    const sub = s % 4;
                    const label = sub === 0 ? String(s / 4 + 1) : SUBDIVISIONS[sub];
                    const head = (
                        <span
                            key={`h-${s}`}
                            className={`pb-1 text-center font-sans text-[11px] tabular-nums ${sub === 0 ? 'font-semibold text-stone-600' : 'text-stone-400'}`}
                        >
                            {label}
                        </span>
                    );
                    return sub === 0 && s > 0 ? [<span key={`hg-${s}`} />, head] : head;
                })}

                {voices.map(voice => [
                    <span
                        key={`label-${voice}`}
                        className="flex items-center justify-end pr-2 font-sans text-xs text-stone-500"
                    >
                        {label(voice)}
                    </span>,
                    ...Array.from({ length: STEPS }, (_, s) => {
                        const on = grid[voice]?.[s] ?? false;
                        const live = playingStep === s;
                        const isGiven = on && !!given?.(voice, s);
                        const bg = on
                            ? (isGiven ? (live ? GIVEN_LIVE_BG : GIVEN_BG) : (live ? HIT_LIVE_BG : HIT_BG))
                            : live ? LIVE_BG : 'rgba(255,255,255,0.55)';
                        // No colour transition: a step is 150ms at a hundred, the same
                        // as the transition's default, so the playhead never settled on
                        // a square before leaving it and read as a smear, not a step.
                        const cls = 'h-10 w-full rounded-[7px]';
                        const cell = interactive ? (
                            <button
                                key={`${voice}-${s}`}
                                type="button"
                                data-rb-cell={`${voice}-${s}`}
                                data-rb-given={isGiven ? '' : undefined}
                                aria-pressed={on}
                                aria-label={`${label(voice)}, ${s / 4 + 1}`}
                                onClick={() => onToggle?.(voice, s)}
                                className={`${cls} cursor-pointer hover:brightness-95`}
                                style={{ backgroundColor: bg }}
                            />
                        ) : (
                            <span
                                key={`${voice}-${s}`}
                                data-rb-cell={`${voice}-${s}`}
                                aria-hidden="true"
                                className={cls}
                                style={{ backgroundColor: bg }}
                            />
                        );
                        return s % 4 === 0 && s > 0 ? [<span key={`g-${voice}-${s}`} />, cell] : cell;
                    }),
                ])}
            </div>
        </div>
    );
}
