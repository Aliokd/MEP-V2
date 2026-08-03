"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * The goals question: a grid of cards and a box to put them in. Tapping a card
 * takes it out of the grid and drops it into the box; tapping the card sitting
 * in the box's opening takes it back out again. A visitor who wants something
 * we didn't think of writes it on a card of their own.
 *
 * Like the struggle deck, this question takes as many answers as it is given —
 * the box is meant to fill up. Only the newest card shows in the opening, so
 * once there is more than one in there the slider across the box front scrubs
 * back through the rest.
 */

// A goal the visitor wrote themselves is stored as its own text behind this
// marker, so it stays distinguishable from the option ids without needing a
// second field on the answer. Everything downstream that resolves a label has
// to know about it — see `isCustom`/`customText`.
export const CUSTOM_PREFIX = 'custom:';

export const isCustom = (value: string) => value.startsWith(CUSTOM_PREFIX);
export const customText = (value: string) => value.slice(CUSTOM_PREFIX.length);

// Written on a card, so it has a card's worth of room and no more. Measured
// against the smallest that card ever gets — the part of it standing clear of
// the box's rim — where this many characters still fit without being cut off.
const CUSTOM_MAX_LENGTH = 38;

// The recessed face of the write-your-own cell: the one shape on the table
// that is a hole rather than an object.
const SLOT = 'rounded-[22px] bg-[#C6C7BB]/25 shadow-[inset_0_1px_4px_rgba(84,80,55,0.05)] ring-1 ring-inset ring-[#C6C7BB]/25';

/**
 * One pale ramp per brand hue, for the goal cards.
 *
 * The hues are the brand's own accents — the four in the scan gradient
 * (#86BE7F green, #8ec9f0 sky, #b79df0 purple, #f0a8c9 pink) plus the lime and
 * yellow used elsewhere in the flow. Each is mixed toward white at roughly
 * 10/22/38%, so what lands on the card is a tint of the colour rather than the
 * colour: these carry `text-stone-900` at 19px, and a card saturated enough to
 * read as "the green one" from across the room is a card you cannot read the
 * words on. The 160° angle is shared with every other card surface here, so
 * the light keeps coming from the same corner across the whole set.
 *
 * Deliberately NOT in spectral order. These are walked in sequence (see
 * `tintFor`), so listing them green→sky→purple→pink would lay a rainbow across
 * the row and read as a scale rather than as an assortment. Jumping around the
 * wheel is what makes consecutive cards look unrelated.
 *
 * Applied as an inline `backgroundImage` rather than a `bg-[…]` class: Tailwind
 * compiles its arbitrary values at build time, so a class name assembled from a
 * runtime value produces no CSS at all.
 */
const CARD_TINTS = [
    'linear-gradient(160deg,#F3F9F2 0%,#E4F1E3 55%,#D1E6CE 100%)', // green
    'linear-gradient(160deg,#FEF6FA 0%,#FCECF3 55%,#F9DEEA 100%)', // pink
    'linear-gradient(160deg,#F4FAFD 0%,#E6F3FC 55%,#D4EAF9 100%)', // sky
    'linear-gradient(160deg,#FFFCED 0%,#FFF8D6 55%,#FEF3B9 100%)', // yellow
    'linear-gradient(160deg,#F8F5FD 0%,#EFEAFC 55%,#E4DAF9 100%)', // purple
    'linear-gradient(160deg,#FDFFF4 0%,#FBFFE6 55%,#F8FFD4 100%)', // lime
] as const;

/**
 * The soft edge over whatever is still off to the right.
 *
 * A mask rather than a panel of #DCDDD4 laid on top. Both look the same on a
 * flat ground, but the page carries a painted backdrop and a solid gradient
 * would show as a dull rectangle wherever the art behind it isn't that exact
 * grey. Masking fades the cards themselves to transparent, so whatever is
 * behind them is what shows through — the background colour by construction
 * rather than by matching.
 */
const SCROLL_FADE = 'linear-gradient(to right, #000 calc(100% - 32px), transparent 100%)';

/**
 * The trip between the table and the box, in both directions.
 *
 * Stated rather than left to framer's default spring, and stated identically on
 * both ends: a card leaving and the same card coming back should take the same
 * time and the same curve, or the two halves of one gesture read as two
 * different animations. It also covers the pile re-settling in the box when one
 * card is pulled out of it.
 */
const FLIGHT = { duration: 0.42, ease: [0.22, 1, 0.36, 1] } as const;

interface GoalBoxProps {
    questionId: string;
    options: { value: string }[];
    /** What's in the box, oldest first. */
    picked: string[];
    onChange: (picked: string[]) => void;
}

export default function GoalBox({ questionId, options, picked, onChange }: GoalBoxProps) {
    const { t } = useLanguage();

    const [writing, setWriting] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * Every goal the visitor has written, whether or not it is currently in the
     * box.
     *
     * The five fixed options get their seat in the grid from `options`, which is
     * what lets a card come back out of the box and land somewhere. A written
     * goal has no such list — it existed only inside `picked` — so taking one
     * back removed it from the only place it was recorded and the visitor's own
     * words were destroyed, with nothing on screen to click to get them back.
     * Holding them here gives them the same seat every other card has.
     *
     * Seeded from `picked` rather than starting empty: the step unmounts when
     * the quiz moves on and the answer outlives it, so a visitor coming back to
     * this question would otherwise find their written goal in the box with no
     * seat to return to — the same loss, one navigation later.
     */
    const [customs, setCustoms] = useState<string[]>(() => picked.filter(isCustom));

    // Fixed options first, in their authored order, then written ones in the
    // order they were added. One list, so a card is a card wherever it came
    // from — the grid below doesn't need to know the difference.
    const seats = [...options.map((option) => option.value), ...customs];

    /**
     * Which tint a given goal wears — fixed per goal, for the life of the step.
     *
     * Keyed on the goal's index in `seats`, which is the one ordering here that
     * never moves: the authored options keep their places and written ones only
     * ever append. `onTable` was the obvious thing to index instead and is
     * exactly wrong — it shrinks as goals go into the box, so every remaining
     * card would change colour each time one was picked.
     *
     * Walking the palette rather than hashing the value. A hash reads as more
     * "random", but over a fixed set of nine goals it is just an arbitrary draw
     * that happens once at authoring time: every constant tried left at least
     * one brand hue unused and doubled up another three times. Walking
     * guarantees all six appear, spreads them as evenly as nine into six
     * allows, and — because the palette above is not in spectral order — still
     * looks scattered rather than sequential.
     *
     * Stable is the requirement underneath all of this. A card keeps its colour
     * when it flies into the box and back, which is the whole premise of the
     * shared `layoutId`: a card that changed colour mid-flight would read as a
     * different card arriving. `Math.random()` would also differ between the
     * server render and the client's, which is a hydration mismatch.
     */
    const tintFor = (value: string) => {
        const seat = seats.indexOf(value);
        return CARD_TINTS[(seat < 0 ? 0 : seat) % CARD_TINTS.length];
    };

    useEffect(() => {
        if (writing) inputRef.current?.focus();
    }, [writing]);

    /**
     * The whole table, one row wide, scrolling sideways rather than wrapping.
     *
     * Every goal is reachable — there are nine now, and a grid capped to a
     * screenful meant a visitor could only meet the ones that happened to fit.
     * A single row that scrolls needs no measuring: unlike a block, which grows
     * downward without limit, a row's width is already fixed by the container
     * around it, so the browser clips it the moment the cards outrun that
     * width. Nothing here has to compute a ceiling the way the vertical
     * version of this table once did.
     *
     * A goal already in the box leaves the table rather than holding its seat.
     * The list is what is still on offer, and a stretch of dead slots in a
     * scrolling row is just distance between the things that can be picked.
     */
    const onTable = seats.filter((value) => !picked.includes(value));

    /**
     * Whether the table is scrolled all the way to its right edge — the fade
     * has to come off there.
     *
     * Left on permanently it would dissolve the last card once there was
     * nothing past it to hint at, and the same effect that reads as "there is
     * more this way" mid-scroll reads as "this card is broken" at the end.
     */
    const [atEnd, setAtEnd] = useState(false);
    const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const el = event.currentTarget;
        // A pixel or two of slack: scrollLeft is fractional on a trackpad and
        // on a display that isn't at 1x, so an exact comparison never fires.
        setAtEnd(el.scrollWidth - el.scrollLeft - el.clientWidth < 4);
    };

    /**
     * Click-and-hold and the row follows the hand — drag left and the cards
     * travel left with it, bringing the ones off the right edge into view.
     * The one way to scroll this row a mouse doesn't already have: touch pans
     * it and a trackpad scrolls it, but a plain mouse does neither on an
     * `overflow-x-auto` box, so without this the row is unreachable past its
     * own width to anyone without one of those.
     *
     * `- dx`, not `+ dx`. Subtracting is what makes the content stick to the
     * cursor, the way a sheet of paper pushed across a desk goes where the
     * hand goes; adding scrolls the VIEWPORT in the drag direction instead,
     * which moves the cards the opposite way to the hand and is the reason
     * this felt backwards.
     *
     * `dragRef` rather than state: this updates on every pixel of mouse
     * movement, and a re-render per pixel is the wrong tool for moving a
     * scroll position that never needs to be read back by anything else.
     */
    const scrollerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // The primary button only, and not when the press lands inside the
        // write-your-own field — that field has its own cursor and its own
        // selection to manage, and hijacking its mousedown would make the
        // text inside it impossible to click into.
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('input')) return;

        const el = scrollerRef.current;
        if (!el) return;

        dragRef.current = { active: true, startX: e.clientX, startScrollLeft: el.scrollLeft, moved: false };

        // On `window`, not the element: the pointer can leave the row
        // entirely mid-drag — over the box below it, say — and the drag has
        // to keep tracking it there. Removed on mouseup wherever that lands,
        // captured or not.
        const onMove = (moveEvent: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag.active) return;
            const dx = moveEvent.clientX - drag.startX;
            // A few pixels of slack before this counts as a drag rather than
            // a click that trembled slightly — otherwise every ordinary tap
            // on a card would register as a (zero-distance, but non-zero)
            // scroll attempt.
            if (Math.abs(dx) > 4) drag.moved = true;
            el.scrollLeft = drag.startScrollLeft - dx;
        };
        const onUp = () => {
            dragRef.current.active = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    // Fires in the capture phase — before a card's own onClick, which runs in
    // the bubble phase — so a drag that just ended can swallow the click it
    // would otherwise leave behind. Without this, releasing the mouse over a
    // card after dragging across it both scrolls the row AND puts that card
    // in the box: the click is a side effect of the mouseup, not a real tap.
    const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragRef.current.moved) return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current.moved = false;
    }, []);

    const label = (value: string) =>
        isCustom(value) ? customText(value) : t(`onboarding.questions.${questionId}.options.${value}`);


    const put = (value: string) => {
        onChange([...picked, value]);
    };

    const takeBack = (value: string) => {
        onChange(picked.filter((entry) => entry !== value));
    };

    const commitDraft = () => {
        const text = draft.trim().slice(0, CUSTOM_MAX_LENGTH);
        if (!text) return;

        const value = `${CUSTOM_PREFIX}${text}`;
        // Writing out a goal that already has a seat — most likely one taken
        // back out of the box and typed again — reuses that seat rather than
        // laying down a second identical card.
        setCustoms((prev) => (prev.includes(value) ? prev : [...prev, value]));
        // Writing the same goal twice would put two identical cards in the box.
        if (!picked.includes(value)) put(value);

        setDraft('');
        setWriting(false);
    };

    return (
        <div className="space-y-3 md:space-y-5">
            {/* The cards still on the table, in a single row that scrolls
                sideways instead of a grid that wraps. `layoutId` is what
                carries a card from here into the box's opening and back —
                the same element in two places, so the trip is animated rather
                than a swap.

                The scroller and the row are separate elements on purpose:
                the bleed that gives the cards' shadows somewhere to fall
                belongs to the frame around the row, not to the row itself,
                which has to stay free to lay its cards out. */}
            <div className="mx-auto w-full max-w-[820px]">
            <motion.div
                ref={scrollerRef}
                /**
                 * The reason the drag did nothing and the reason a card
                 * returning from the box jumped are the same reason.
                 *
                 * Every card in this row carries `layout`, and framer measures
                 * those with `getBoundingClientRect` — viewport coordinates. A
                 * scroll container moves its children through the viewport
                 * without changing their layout at all, so the moment anything
                 * re-rendered mid-scroll (this component re-renders whenever
                 * `atEnd` flips, and again on every put/takeBack) framer read
                 * the scrolled-away distance as a layout change and animated
                 * every card back toward where it had last seen them. Dragging
                 * fought that spring the whole way and lost.
                 *
                 * `layoutScroll` is framer's own answer: it tells the
                 * projection that this element scrolls, so the offset is read
                 * and subtracted before children are compared. It only works on
                 * a `motion` element — which is the only reason this div became
                 * one.
                 */
                layoutScroll
                onScroll={onScroll}
                onMouseDown={onMouseDown}
                onClickCapture={onClickCapture}
                // The bleed used to be a flat 16px top/bottom and 24px each
                // side, and the card's own shadow was still getting cut —
                // `0 8px 24px` reaches 32px past the card on the underside
                // (offset + blur) against only 16px above it (blur − offset),
                // and the HOVER shadow, `0 14px 32px`, reaches further still:
                // 46px below, 18px above, 32px to each side. Sized to the
                // larger of the two states in every direction, so neither the
                // resting nor the hovered shadow ever meets the clip.
                //
                // Still paired padding + negative margin, the same technique
                // as before: the pair cancels in the surrounding layout, so
                // this element's footprint on the page is exactly what it
                // would be without any of it, and the room it buys is only
                // ever used inside `overflow-y-hidden`, before the clip.
                //
                // `cursor-grab` / `active:cursor-grabbing` name the row as
                // draggable before a hand ever touches it; `select-none` is
                // what stops the browser reading the drag as a text
                // selection instead of a scroll.
                className="no-scrollbar -mx-8 -mb-12 -mt-5 cursor-grab select-none overflow-x-auto overflow-y-hidden px-8 pb-12 pt-5 [overflow-anchor:none] active:cursor-grabbing"
                style={
                    !atEnd
                        ? // Both spellings: Safari still wants the prefix, and
                          // this is the one property here that has to work
                          // everywhere, since without it the row ends on a hard
                          // cut instead of a fade.
                          { maskImage: SCROLL_FADE, WebkitMaskImage: SCROLL_FADE }
                        : undefined
                }
            >
            <div className="flex w-fit gap-4">
                {/* Write your own, as the first seat at the table.

                    Drawn as an empty holder rather than as a card: it is not a
                    goal, it is the space where one you haven't said yet would
                    go, and the dashed outline it used to wear made it the
                    loudest thing in a row of quiet cards. Same shape, same
                    recessed tone as the seats a taken card leaves behind, so
                    the row reads as filled seats and empty ones — with the
                    plus marking the one empty seat you can do something with. */}
                {writing ? (
                    <div className={`flex aspect-[5/4] w-[176px] shrink-0 items-center px-5 sm:w-[211px] ${SLOT}`}>
                        <input
                            ref={inputRef}
                            value={draft}
                            maxLength={CUSTOM_MAX_LENGTH}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitDraft();
                                } else if (e.key === 'Escape') {
                                    setDraft('');
                                    setWriting(false);
                                }
                            }}
                            onBlur={commitDraft}
                            placeholder={t('onboarding.questions.goals.custom_placeholder')}
                            className="w-full bg-transparent text-center text-[14px] font-sans font-normal leading-snug text-[#363636] outline-none placeholder:font-normal placeholder:text-stone-400/80 md:text-[15px]"
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setWriting(true)}
                        className={`flex aspect-[5/4] w-[176px] shrink-0 flex-col items-center justify-center gap-1.5 text-[14px] font-sans font-medium text-stone-600 transition-colors hover:bg-[#C6C7BB]/45 hover:text-[#363636] sm:w-[211px] md:text-[15px] ${SLOT}`}
                    >
                        <Plus className="h-4 w-4 stroke-[2.5px]" />
                        {t('onboarding.questions.goals.add_custom')}
                    </button>
                )}

                {onTable.map((value) => (
                    <motion.button
                        key={value}
                        layoutId={`goal-${value}`}
                        // Slides into the gap the card ahead of it left, rather
                        // than appearing in its place. `layout` is what animates
                        // the shift: `layoutId` alone carries a card between the
                        // table and the box, but this one never unmounts — it
                        // just changes position in the row.
                        layout
                        transition={{ layout: FLIGHT }}
                        type="button"
                        onClick={() => put(value)}
                        // Nothing that moves the card outside its own box. It
                        // used to lift 4px on hover, which reads well on an open
                        // page and not at all inside a scroller: the table is a
                        // clipping window now, so a card rising toward an edge
                        // gets its top sliced off — and mid-scroll every card is
                        // near an edge, so no amount of padding fixes it. The
                        // hover lives in the ring and the shadow instead, both
                        // of which the card can afford to lose a few pixels of.
                        // `whileTap` scales inward, so it is safe.
                        whileTap={{ scale: 0.98 }}
                        // The same card as the one standing in the box: same
                        // cream-green paper, same corner, same ring. It used to
                        // be white here and green in there, so the card appeared
                        // to change identity at the moment it moved — the one
                        // moment it has to stay recognisably itself.
                        style={{ backgroundImage: tintFor(value) }}
                        className="aspect-[5/4] w-[176px] shrink-0 overflow-hidden rounded-[22px] p-5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.07)] ring-1 ring-stone-300/40 transition-all hover:shadow-[0_14px_32px_rgba(0,0,0,0.10)] hover:ring-stone-400/70 sm:w-[211px]"
                    >
                        <span className="flex h-full items-center text-[19px] font-sans font-medium leading-snug tracking-tight text-stone-900 md:text-[21px]">
                            {label(value)}
                        </span>
                    </motion.button>
                ))}
            </div>
            </motion.div>
            </div>

            {/* The box. A white carton in even light: built from flat tones
                and three soft gradients, no outlines — the cards stay the
                loudest thing on the screen. */}
            <div className="relative mx-auto aspect-[860/460] w-full max-w-[588px]">
                {/* Everything behind the card: the cavity and the two flaps.
                    The cavity darkens toward its floor and its corners darken
                    again where the side walls turn away from the light — depth
                    is tone here, not outline. The flaps are the full wings of
                    the reference rather than the slivers they used to be, each
                    with the darker underside edge that says folded card, not
                    drawn line. */}
                <svg viewBox="0 0 860 460" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
                    <defs>
                        {/* The near rim catches the most light along its fold and
                            falls away toward the viewer. */}
                        <linearGradient id="goalbox-rim" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FEFEFD" />
                            <stop offset="100%" stopColor="#EDEDE8" />
                        </linearGradient>
                        <linearGradient id="goalbox-front" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ECECE7" />
                            <stop offset="100%" stopColor="#F5F5F1" />
                        </linearGradient>
                        {/* Sits under the rim's fold, on the front face. */}
                        <linearGradient id="goalbox-shade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C9C9C2" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#C9C9C2" stopOpacity="0" />
                        </linearGradient>
                        {/* Dark at the far edge, lightening towards the near
                            one. The opening is a hole, so the deepest part of it
                            is the part furthest from the light — running it the
                            other way lit the back of the box and made the cavity
                            read as a raised panel rather than a recess.

                            Kept well below the front face's own range
                            (#ECECE7..#F5F5F1) rather than tucked just under it.
                            Lightening it to within a few levels of the face was
                            tried and lost the box: with every plane at almost
                            one tone the carton flattened into a white shape,
                            and the opening — the part the cards go into, and so
                            the only part that has to be legible at a glance —
                            stopped reading as an opening at all. The contrast
                            here is doing structural work, not decorative. */}
                        <linearGradient id="goalbox-cavity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C2C2BA" />
                            <stop offset="100%" stopColor="#D8D8D1" />
                        </linearGradient>
                        <linearGradient id="goalbox-flap" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FCFCFA" />
                            <stop offset="100%" stopColor="#F1F1EC" />
                        </linearGradient>
                        <filter id="goalbox-blur" x="-40%" y="-300%" width="180%" height="700%">
                            <feGaussianBlur stdDeviation="9" />
                        </filter>
                    </defs>

                    {/* The cavity. */}
                    <polygon points="222,104 638,104 700,152 160,152" fill="url(#goalbox-cavity)" />


                    {/* The flaps. Each hinges along the WHOLE top edge of its
                        side wall — the line from the cavity's far corner
                        (222,104) down to the rim's near corner (160,150) — and
                        folds outward from that line, the way the cardboard
                        actually creases. They used to hinge on the vertical at
                        x=222 alone, which left the wing floating beside the
                        carton; the wedge of bare page under it, and the notch
                        patches that chased it, all came from that one wrong
                        hinge.

                        The cut edge of each wing runs along its LOWER outer
                        edge, not the upper: the light here comes from above, so
                        the top silhouette stays paper-bright and the underside
                        is where the board's thickness shows. It sat on top
                        before and read as a crack across the wing. The strip's
                        inner end tucks 2px under the rim so the join overlaps
                        instead of seaming. */}
                    {/* Each wing is a true parallelogram: both hinge ends are
                        pushed out along the SAME fold vector (-150,-66), so the
                        outer silhouette runs parallel to the hinge and the two
                        long edges run parallel to each other — which is the
                        whole of what makes a folded rectangle read as one in
                        this projection. The old corners were placed by eye and
                        splayed a few degrees, so the flap looked warped. */}
                    {/* Static. These briefly lifted and settled each time a
                        card went in; the carton is the one fixed thing on a
                        screen where the cards are already flying, and giving it
                        a tic of its own made the placement harder to follow
                        rather than livelier. */}
                    <polygon points="222,104 72,38 10,84 160,150" fill="url(#goalbox-flap)" />
                    <polygon points="160,150 10,84 6,93 156,159" fill="#E3E3DD" />
                    <polygon points="638,104 788,38 850,84 700,150" fill="url(#goalbox-flap)" />
                    <polygon points="700,150 850,84 854,93 704,159" fill="#E3E3DD" />
                </svg>
                {/* Every card that has gone in, not just the newest. A box
                    that shows one card cannot be read at a glance — the answer
                    is "how many, and which", and hiding all but the last makes
                    the visitor take the top one out to remember what is under
                    it.

                    They fan out from the middle: each is offset sideways and
                    tilted a little more the further it sits from centre, the way
                    a handful of cards dropped into a carton would settle. The
                    newest sits on top and squarest, so the one just added is
                    always the readable one.

                    Tapping any of them takes that one back to the list. */}
                {picked.map((value, i) => {
                    // The newest card sits dead centre, on top; older ones
                    // peek out from behind it on alternating sides, a step
                    // further out per pair. Fanning the whole pile around its
                    // own midpoint — the previous scheme — centred the group's
                    // bounding box but pushed the top card, the only one fully
                    // visible, off to one side: the pile measured as centred
                    // and read as drifting right. What has to sit on the middle
                    // is the card the eye actually sees.
                    const age = picked.length - 1 - i; // 0 = newest, on top
                    const side = age % 2 === 1 ? -1 : 1;
                    const stepOut = Math.ceil(age / 2);
                    // One step out is all the room there is: the front face
                    // spans 17.7%..82.3% of the container and a 46%-wide card
                    // centred at 27% can slide at most ~8% before its edge — or
                    // a tilted corner — leaves the carton. So every elder peeks
                    // the same ±8 and only the tilt deepens with age, which is
                    // enough: cards past the second are nearly covered anyway.
                    const offset = age === 0 ? 0 : side * 8;
                    const tilt = age === 0 ? 0 : side * Math.min(5, 3 * stepOut);
                    return (
                        <motion.button
                            key={value}
                            layoutId={`goal-${value}`}
                            /**
                             * `layout` as well as `layoutId`, so the pile
                             * itself re-settles rather than snapping. Pulling
                             * one card out changes every remaining card's `age`
                             * — and with it its offset and tilt — so without
                             * this, taking one card back jumps the other three
                             * to new places in a single frame.
                             */
                            layout
                            transition={{ layout: FLIGHT }}
                            type="button"
                            onClick={() => takeBack(value)}
                            whileHover={{ y: -6 }}
                            whileTap={{ scale: 0.97 }}
                            aria-label={t('onboarding.questions.goals.take_back')}
                            style={{
                                // Centred by `left`, not by transform. This card
                                // has a layoutId, and framer's layout projection
                                // owns the transform of anything it animates —
                                // percentage x values are exactly what its docs
                                // rule out. The transform centring that sat here
                                // before silently never applied, which is why
                                // every card drifted to the box's right: the
                                // card's left edge was landing on `left-1/2`
                                // with nothing pulling it back. Plain `left` is
                                // layout, which the projection measures instead
                                // of overwriting. 50 - width/2 is the centring;
                                // the spread term fans the pile around it.
                                left: `${50 - 23 + offset}%`,
                                rotate: tilt,
                                zIndex: 10 + i,
                                // The same tint it wore on the table — see
                                // `tintFor`. This is the one property that has
                                // to agree across the two places a card lives,
                                // or the flight between them stops reading as
                                // one card moving.
                                backgroundImage: tintFor(value),
                            }}
                            // The grid's card, unchanged: same aspect, same
                            // padding, same corner, same shadow. `w-[46%]` is not
                            // a resize — it translates the grid cell's ~192px
                            // into this container's own percentage (192 of the
                            // box's 420), so the card that lands in the carton is
                            // the size of the one that left the table and stops
                            // appearing to grow on the way in.
                            // `aspect-[5/4]`, matching the card on the table
                            // exactly. This is what was squeezing the card
                            // mid-flight: a shared `layoutId` animates the
                            // source rect into the destination rect with a
                            // scale transform, and when the two rects have
                            // different proportions that scale is different on
                            // each axis — the card is literally stretched on one
                            // side and compressed on the other for the length of
                            // the trip. It read as 4/3 here and 16/9 from `sm`
                            // up, against 5/4 on the table: a 42% disagreement
                            // between the axes at the widest. Matched, the scale
                            // is uniform and the card only grows.
                            className="absolute bottom-[34%] aspect-[5/4] w-[46%] overflow-hidden rounded-[22px] p-5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.07)] ring-1 ring-stone-300/40"
                        >
                            {/* Top-aligned: only the upper part of the card
                                clears the rim, so centred text would read as half
                                a sentence disappearing into the box.

                                `bottom-34%` rather than the 54% this sat at.
                                Measured against the carton: the rim is painted
                                over the card from y=150 of the 460-tall viewBox
                                down, and at 54% the card's top edge cleared the
                                box entirely and stood 52px up into the scrolling
                                row above it — which is what was covering the
                                cards still on the table. At 34% it clears that
                                row by 11px and still shows a 111px band above
                                the rim, against the 78px the longest goal needs
                                at this width. Deeper than ~30% and the card
                                starts disappearing into the carton; shallower
                                than ~37% and it is back in the row's way. */}
                            {/* The same size it is on the table. framer scales
                                the whole card through the flight, type included,
                                so a card that declares 21px at one end and 23px
                                at the other snaps by that difference on the
                                frame the animation finishes. */}
                            <span className="block text-[19px] font-sans font-medium leading-snug tracking-tight text-stone-900 md:text-[21px]">
                                {label(value)}
                            </span>
                        </motion.button>
                    );
                })}

                {/* The near rim and the front face, over the card. */}
                <svg viewBox="0 0 860 460" aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 h-full w-full">
                    {/* The ground the box stands on — without this it floats. */}
                    <ellipse cx="430" cy="443" rx="290" ry="12" fill="#5B5B54" opacity="0.16" filter="url(#goalbox-blur)" />
                    {/* The front face, its floor corners rounded the way a
                        carton's really are. Solid to the bottom now: it used to
                        fade out, and a box whose front dissolves reads as
                        unfinished rather than lit. */}
                    <path d="M152 296 H708 V436 Q708 452 692 452 H168 Q152 452 152 436 Z" fill="url(#goalbox-front)" />
                    <rect x="152" y="296" width="556" height="60" fill="url(#goalbox-shade)" />
                    {/* Veinote's V, debossed into the cardboard — the reference
                        carries its own mark here; this one carries ours.
                        Tone-on-tone, so it reads as pressed in, not printed. */}
                    <g transform="translate(430 384) scale(2.5) translate(-17.1 -20.6)" opacity="0.5" aria-hidden="true">
                        <path d="M26.8756 9.80365C27.7045 8.52842 28.0552 7.52417 27.9276 6.79091C27.832 6.05765 27.4016 5.51568 26.6365 5.16499C25.8713 4.8143 24.8671 4.59113 23.6237 4.49549L23.8628 3.53906C24.1816 3.57094 24.7555 3.60282 25.5844 3.6347C26.4452 3.6347 27.3538 3.65064 28.3102 3.68252C29.2985 3.68252 30.0796 3.68252 30.6535 3.68252C31.323 3.68252 31.9606 3.66658 32.5663 3.6347C33.172 3.60282 33.73 3.57094 34.2401 3.53906L34.0009 4.49549C33.2358 4.71865 32.5344 5.02152 31.8968 5.40409C31.2911 5.75478 30.6535 6.3127 29.984 7.07784C29.3145 7.8111 28.5493 8.84723 27.6885 10.1862L9.85119 37.6357C9.24545 37.5719 8.63972 37.54 8.03398 37.54C7.46012 37.54 6.87033 37.5719 6.26459 37.6357L2.48671 7.55605C2.35918 6.40834 2.02444 5.62726 1.48246 5.21281C0.940486 4.76647 0.446332 4.52737 0 4.49549L0.239107 3.53906C1.16365 3.57094 2.35918 3.60282 3.8257 3.6347C5.32411 3.66658 6.80657 3.68252 8.27309 3.68252C9.99465 3.68252 11.5728 3.66658 13.0074 3.6347C14.4739 3.60282 15.6694 3.57094 16.594 3.53906L16.3549 4.49549C15.3347 4.52737 14.5217 4.65489 13.916 4.87806C13.3103 5.10122 12.8958 5.48379 12.6726 6.02577C12.4814 6.56774 12.4335 7.39665 12.5292 8.51248L14.8246 29.6017L12.6726 31.6102L26.8756 9.80365Z" fill="#D2D2CA" />
                    </g>
                    <polygon points="160,150 700,150 782,298 78,298" fill="url(#goalbox-rim)" />
                </svg>

            </div>

        </div>
    );
}
