"use client";

import { useLanguage } from '@/context/LanguageContext';

/*
 * The melody grid: scale degrees down, beats across, one note to a beat.
 * Shared by Melody (two bars, all yours) and Developing a melody (four bars,
 * the first two given), so the two cannot drift apart.
 *
 * Seventh at the top, tonic at the bottom, so up on the page is up in pitch.
 * Interactive while writing, a plain reading at the finish. The bar lines are
 * narrow columns of their own rather than margins on a cell: a margin pushed
 * the cell out of its track and left a sliver showing.
 */

/** The beat under the playhead. The take-cream the other practices use for "live". */
const LIVE_BG = '#FBFFED';
/** A placed note: the linked green the practices use for "chosen". */
const NOTE_BG = '#86BE7F';
const NOTE_LIVE_BG = '#5F9857';
/** A note that was given rather than placed: the melody purple. */
const GIVEN_BG = '#B79DF0';
const GIVEN_LIVE_BG = '#9B7BE0';

interface MelodyGridProps {
    /** The scale degrees, tonic first; only the names are drawn. */
    scale: { name: string }[];
    /** Row index per beat, tonic = 0; null is a rest. Length is the beat count. */
    notes: (number | null)[];
    /** Which beats are given rather than the songwriter's. Optional. */
    given?: (beat: number) => boolean;
    playingBeat: number | null;
    interactive: boolean;
    onToggle?: (beat: number, row: number) => void;
    /** Tailwind max-width for the card; wider for more bars. */
    maxWidthClass?: string;
}

const BAR = 4;

export default function MelodyGrid({
    scale, notes, given, playingBeat, interactive, onToggle, maxWidthClass = 'max-w-[34rem]',
}: MelodyGridProps) {
    const { t } = useLanguage();
    const beats = notes.length;
    const bars = Math.ceil(beats / BAR);
    // A label column, then each bar's four beats, with a narrow gap column
    // between bars.
    const columns = `2rem ${Array.from({ length: bars }, () => `repeat(${BAR}, minmax(0, 1fr))`).join(' 0.75rem ')}`;
    const gapBefore = (beat: number) => beat % BAR === 0 && beat > 0;

    return (
        // Capped in width and the squares in height: at full card width seven
        // square rows ran past the fold and took the transport with them. A
        // beat is a short wide bar here, as it is in any sequencer.
        <div className={`verse-card is-static mx-auto w-full ${maxWidthClass} rounded-[20px] px-3 py-4 sm:px-5`} data-mw-grid>
            <div className="grid gap-1" style={{ gridTemplateColumns: columns }}>
                {/* Beat numbers */}
                <span />
                {Array.from({ length: beats }, (_, beat) => [
                    gapBefore(beat) ? <span key={`gap-head-${beat}`} /> : null,
                    <span
                        key={beat}
                        className="pb-1 text-center font-sans text-[11px] tabular-nums text-stone-400"
                    >
                        {(beat % BAR) + 1}
                    </span>,
                ])}

                {[...scale].reverse().map((degree, fromTop) => {
                    const row = scale.length - 1 - fromTop;
                    return [
                        <span
                            key={`label-${row}`}
                            className="flex items-center justify-end pr-2 font-sans text-xs text-stone-500"
                        >
                            {degree.name}
                        </span>,
                        ...Array.from({ length: beats }, (_, beat) => {
                            const on = notes[beat] === row;
                            const live = playingBeat === beat;
                            const isGiven = on && !!given?.(beat);
                            const bg = on
                                ? (isGiven ? (live ? GIVEN_LIVE_BG : GIVEN_BG) : (live ? NOTE_LIVE_BG : NOTE_BG))
                                : live ? LIVE_BG : 'rgba(255,255,255,0.55)';
                            // No colour transition: at eight beats a step is long
                            // enough to settle, but a shared grid should not carry
                            // a smear the moment someone makes it faster.
                            const cls = 'h-9 w-full rounded-[7px]';
                            const cell = interactive ? (
                                <button
                                    key={`${beat}-${row}`}
                                    type="button"
                                    data-mw-cell={`${beat}-${row}`}
                                    data-mw-given={isGiven ? '' : undefined}
                                    aria-pressed={on}
                                    aria-label={`${degree.name}, ${t('practice.cp_bar').replace('{n}', String(Math.floor(beat / BAR) + 1))} ${(beat % BAR) + 1}`}
                                    onClick={() => onToggle?.(beat, row)}
                                    className={`${cls} cursor-pointer hover:brightness-95`}
                                    style={{ backgroundColor: bg }}
                                />
                            ) : (
                                <span
                                    key={`${beat}-${row}`}
                                    data-mw-cell={`${beat}-${row}`}
                                    aria-hidden="true"
                                    className={cls}
                                    style={{ backgroundColor: bg }}
                                />
                            );
                            return gapBefore(beat) ? [<span key={`gap-${beat}-${row}`} />, cell] : cell;
                        }),
                    ];
                })}
            </div>
        </div>
    );
}
