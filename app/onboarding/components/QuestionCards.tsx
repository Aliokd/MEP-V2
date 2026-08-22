"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// Compressed clips live under /public/onboarding-cards, named after the answer
// value they belong to. Each has a matching .webp poster frame — the card shows
// only that until the user hovers, so nothing loads 1.8MB of video up front.
const MEDIA_DIR = '/onboarding-cards';

// Where each clip should start (and rewind back to on leave). Every poster was
// extracted at this same timestamp, so the poster-to-video handoff is always
// the same frame — no visual pop. Most clips are fine at 0; `producer` opens
// on a fade-in still visibly brightening until ~0.7s (checked via ffmpeg
// signalstats — re-verify this if the clip is ever replaced again).
const CLIP_START: Record<string, number> = { producer: 0.7 };

const REVEAL_FADE_MS = 300;

// How long a card takes to come into colour, and to fall back out of it. Slow
// enough to read as the card warming up rather than as a state toggling.
const COLOR_TRANSITION = 'filter 700ms cubic-bezier(0.33, 1, 0.68, 1)';

// Rotation only — the cards stack squarely on one another rather than scattering.
const PILE_ROTATION = [-9, -3, 5, -5, 8];

// How long the chosen card takes to grow into the full-width card, and to
// shrink back into the grid on the way out. Shared by the animation and by
// the z-index hold below, which has to outlast it in both directions.
const MORPH_MS = 450;

// A true progressive blur isn't a single CSS property — it's stacked
// backdrop-filter layers, each masked to a shorter band than the last. Near the
// top every layer applies and the blur is heaviest; by the bottom of the band
// none do. Roughly the top fifth of the card is affected, leaving the rest of
// the footage untouched.
const BLUR_LAYERS = [
    { blur: 1, solid: 100, fade: 100 },
    { blur: 2, solid: 60, fade: 85 },
    { blur: 4, solid: 35, fade: 60 },
    { blur: 8, solid: 16, fade: 38 },
    { blur: 16, solid: 4, fade: 20 },
];

interface QuestionCardsProps {
    questionId: string;
    options: { value: string }[];
    selectedOption: string | null;
    onSelect: (value: string) => void;
    /**
     * A second question, asked inside the card that was chosen.
     *
     * Picking a type doesn't move the visitor on — the four cards not chosen
     * leave, the chosen one takes the whole width, and the next question is
     * asked on the face of it. Two questions in one step, and the second one
     * arrives already framed by the answer to the first: you are not being
     * asked how songs begin in the abstract, you are being asked as the
     * Lyricist you just said you were.
     */
    nested?: {
        questionId: string;
        options: { value: string }[];
        value: string | null;
        onSelect: (value: string) => void;
    };
}

export default function QuestionCards({ questionId, options, selectedOption, onSelect, nested }: QuestionCardsProps) {
    const { t } = useLanguage();

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

    // True once a card's video is actually flowing frames (the `playing` event,
    // not just `play()` having been called). Until then the poster stays on
    // top, so a cold network fetch or decoder warm-up is never visible — the
    // clip only appears once it can play smoothly.
    const [revealed, setRevealed] = useState<boolean[]>(() => options.map(() => false));

    // Distance each card travels from the pile to its grid slot. Measured rather
    // than hard-coded, so the pile still converges correctly when the grid
    // reflows to 2-up or 1-up on smaller screens.
    const [offsets, setOffsets] = useState<{ x: number; y: number }[] | null>(null);
    const [spread, setSpread] = useState(false);

    // `spread` flips the moment the fly-to-grid animation is *triggered* — it's
    // still 1.15s from actually arriving. Hover was wired to `spread`, so
    // pointing at a card mid-flight fired the color/video reveal on top of a
    // card that was still moving, which read as a glitch. `settled` only goes
    // true once that motion has genuinely finished.
    const [settled, setSettled] = useState(false);

    // The card that is on its way back into the grid. Raising the z-index on
    // `isSelected` alone covers the growth but not the return: Back clears the
    // selection immediately, so the card dropped to its ordinary layer while it
    // was still shrinking and passed underneath its neighbours on the way home.
    // This holds it up until the morph has finished.
    const [collapsing, setCollapsing] = useState<string | null>(null);
    const previousSelection = useRef<string | null>(selectedOption);

    useEffect(() => {
        const leaving = previousSelection.current;
        previousSelection.current = selectedOption;
        if (!leaving || selectedOption) return;

        setCollapsing(leaving);
        // Slightly longer than the morph, so the drop back down happens after
        // the card has landed rather than on its last frame.
        const id = setTimeout(() => setCollapsing(null), MORPH_MS + 80);
        return () => clearTimeout(id);
    }, [selectedOption]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            // Measure-then-commit, which is what an effect is actually for: the
            // branch above reads `matchMedia` and the one below reads laid-out
            // rects, and neither answer exists during render. The lint rule
            // cannot tell that apart from state derived from props, which is
            // the pattern it means to catch. The extra render this costs is one
            // per mount, before anything has been painted.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOffsets(options.map(() => ({ x: 0, y: 0 })));
            setSpread(true);
            return;
        }

        // Transforms don't affect layout, so these rects are the final grid slots.
        const bounds = container.getBoundingClientRect();
        const originX = bounds.left + bounds.width / 2;
        const originY = bounds.top + bounds.height / 2;

        setOffsets(
            cardRefs.current.map((el) => {
                if (!el) return { x: 0, y: 0 };
                const rect = el.getBoundingClientRect();
                return {
                    x: originX - (rect.left + rect.width / 2),
                    y: originY - (rect.top + rect.height / 2),
                };
            }),
        );
    }, [options.length]);

    useEffect(() => {
        if (!offsets || spread) return;
        // Fires on the next tick rather than synchronously in the same effect,
        // so the pile position actually commits and paints one frame before the
        // spread animation starts interpolating away from it — without that, the
        // browser would never render the pile at all. A timer rather than rAF,
        // so a backgrounded tab can never leave the cards stranded in the pile.
        const id = setTimeout(() => setSpread(true), 0);
        return () => clearTimeout(id);
    }, [offsets, spread]);

    // Which card the pointer (or focus) is on.
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    /**
     * The one card being considered, if there is one: what the pointer is on,
     * or failing that the answer already given.
     *
     * `??` rather than `||` — index 0 is a real card, and `||` would fall
     * through it to the selection every time the pointer was on the first one.
     */
    const selectedIndex = options.findIndex((option) => option.value === selectedOption);
    const active = hoveredIndex ?? (selectedIndex >= 0 ? selectedIndex : null);

    const handlePlaying = (index: number) => {
        setRevealed((prev) => {
            if (prev[index]) return prev;
            const next = [...prev];
            next[index] = true;
            return next;
        });
    };

    /**
     * Every clip runs, all the time, in black and white — until one card is
     * singled out, at which point it is the only one still moving and the only
     * one in colour.
     *
     * This is the inverse of what was here before, where a card was dead until
     * pointed at. A grid of five still photographs asks to be looked at one at
     * a time; five clips all running is a room with five people working in it,
     * and picking one out of that is a stronger gesture than waking one up.
     * Freezing the other four is what does the picking: the stillness around
     * the live card is the highlight, before the colour even arrives.
     *
     * Frozen, not rewound. A paused clip holds the frame it was on, so the four
     * cards you are not looking at stay the scene you just saw rather than
     * snapping back to a start frame — which would read as four cards resetting
     * every time the pointer moved.
     *
     * Held until `settled`. Five clips beginning to decode inside the fly-out
     * is the same main-thread contention the blur band used to cause, and it
     * lands on exactly the frames that can least afford it.
     *
     * What's tracked is the instruction given to each clip, not the state of
     * the element. `video.paused` looks like the same thing and isn't: the
     * browser pauses media on its own — a backgrounded tab, a clip reaching its
     * end — so a card paused out from under us would never be told to resume.
     */
    const running = useRef<boolean[]>([]);

    useEffect(() => {
        options.forEach((option, index) => {
            const video = videoRefs.current[index];
            if (!video) return;

            const shouldRun = settled && (active === null || active === index);
            if (shouldRun === !!running.current[index]) return;

            running.current[index] = shouldRun;
            // Playback can still be refused; the poster underneath is a fine
            // fallback, and a frozen frame is the intended resting state
            // anyway.
            if (shouldRun) video.play().catch(() => {});
            else video.pause();
        });
    }, [active, options, settled]);

    // Once a card is chosen it is the only one on screen, at full width, with
    // the second question on its face. Rendered as its own branch rather than
    // as a variant of the grid: the grid's whole machinery — the pile, the
    // measured offsets, the fly-to-slot, the per-card hover — exists to get
    // five cards into place, and none of it applies to one card standing alone.
    const chosen = nested && selectedOption
        ? options.find((option) => option.value === selectedOption)
        : undefined;

    if (chosen && nested) {
        return (
            // `layoutId` is what makes this a growth rather than a swap: the
            // grid card and this one are the same element as far as framer is
            // concerned, so it measures where the chosen card was, where this
            // one lands, and animates between the two. Without it the grid
            // would simply vanish and a full-width card appear in its place.
            <motion.div
                layoutId={`card-${chosen.value}`}
                transition={{ duration: MORPH_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
                // z-30 for the duration of the growth: it starts at the
                // chosen card's place in the grid and has to pass over its
                // neighbours to get to full size. Without it the cards that
                // happen to come later in source order paint on top, and the
                // card being chosen slides underneath them.
                className="relative z-30 flex h-full w-full flex-1"
            >
                {/* No shadow. Lifted off the page it read as a dialog sitting
                    on top of the step; flat, it *is* the step. */}
                <div className="relative flex w-full flex-col overflow-hidden rounded-[26px] bg-[#EFF0E7]">
                    {/* The poster holds the frame until the clip is flowing,
                        the same handoff the grid cards use. */}
                    <img
                        src={`${MEDIA_DIR}/${chosen.value}.webp`}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* Still running. The footage is the answer they just gave,
                        and freezing it the moment it is chosen turns a card that
                        was alive into a photograph of one. */}
                    <video
                        src={`${MEDIA_DIR}/${chosen.value}.mp4`}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover"
                    />

                    {/* Glass, not a white wash. The wash held the text up by
                        painting out the picture underneath — which is most of
                        the way to not having a video at all. Blurring what is
                        behind the words instead leaves the movement and the
                        colour visible while still giving the type a surface to
                        sit on. */}
                    <div className="relative flex flex-1 flex-col justify-center gap-7 bg-stone-950/45 p-6 backdrop-blur-xl md:p-10">
                        {/* The name alone. The description said what the card
                            meant while it was one of five and there was a
                            choice to make; once chosen, it is answering a
                            question nobody is asking any more. */}
                        <h3 className="text-lg font-sans font-bold tracking-tight text-[#DCDDD4] md:text-[21px]">
                            {t(`onboarding.questions.${questionId}.options.${chosen.value}.title`)}
                        </h3>

                        {/* No rule between the two. The gap already separates
                            them, and a line across the card cut the footage in
                            half for no gain. */}
                        <div className="space-y-3">
                            <p className="text-[22px] font-sans font-medium leading-snug text-[#DCDDD4] md:text-[27px]">
                                {t(`onboarding.questions.${nested.questionId}.question`)}
                            </p>

                            {/* A list, like every other question that offers a
                                column of answers — the pills read as tags to be
                                collected rather than as one choice among five. */}
                            <div className="space-y-2.5">
                                {nested.options.map((option) => {
                                    const picked = nested.value === option.value;
                                    // Once something is chosen the rest step
                                    // back to half strength. Selection here is
                                    // carried by weight rather than colour, and
                                    // a brighter row among four equals reads far
                                    // less clearly than one full row among four
                                    // faded ones.
                                    const dimmed = Boolean(nested.value) && !picked;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => nested.onSelect(option.value)}
                                            aria-pressed={picked}
                                            className={`flex w-full items-center justify-between rounded-2xl px-5 py-[22px] text-left text-[17px] font-medium text-[#DCDDD4] transition-all md:text-[19px] ${
                                                picked ? 'bg-white/25' : 'bg-white/10 hover:bg-white/[0.18]'
                                            } ${dimmed ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
                                        >
                                            {t(`onboarding.questions.${nested.questionId}.options.${option.value}`)}
                                            {picked && <Check size={17} className="shrink-0 stroke-[3] text-[#DCDDD4]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        // Tighter side to side than top to bottom: three cards in a row read as
        // one row when the columns are close, and the vertical gap is what keeps
        // the two rows from running together.
        <div ref={containerRef} className="flex flex-wrap justify-center gap-x-3 gap-y-4 md:gap-y-5">
            {options.map((option, i) => {
                const isSelected = selectedOption === option.value;
                const offset = offsets?.[i];

                // Three phases: invisible while measuring, then the pile, then
                // the grid. Only the last one animates.
                const animate = !offset
                    ? { opacity: 0 }
                    : spread
                      ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }
                      : {
                            opacity: 1,
                            x: offset.x,
                            y: offset.y,
                            rotate: PILE_ROTATION[i % PILE_ROTATION.length],
                            scale: 0.97,
                        };

                return (
                    <motion.button
                        key={option.value}
                        // Pairs with the expanded card, so choosing one
                        // grows it into place instead of replacing the
                        // grid outright.
                        layoutId={`card-${option.value}`}
                        ref={(el) => {
                            cardRefs.current[i] = el;
                        }}
                        type="button"
                        onClick={() => onSelect(option.value)}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex((current) => (current === i ? null : current))}
                        // Keyboard users get the same reveal as pointer users.
                        onFocus={() => setHoveredIndex(i)}
                        onBlur={() => setHoveredIndex((current) => (current === i ? null : current))}
                        // Not settled yet ⇒ not interactive: no hover/focus reveal,
                        // no click, and (via pointer-events-none below) no CSS
                        // :hover match either, so nothing can trigger the color/video
                        // reveal while the card is still animating into place.
                        disabled={!settled}
                        initial={false}
                        animate={animate}
                        // No per-card delay — every card starts, moves, and lands
                        // together rather than fanning out one after another.
                        transition={
                            spread
                                ? { duration: 1.15, ease: [0.22, 1, 0.36, 1] }
                                : { duration: 0 }
                        }
                        onAnimationComplete={() => {
                            // Only the fly-to-grid animation should mark the card
                            // settled — not the instant, zero-duration snap into
                            // the pile that happens before it.
                            if (spread) setSettled(true);
                        }}
                        // Nothing moves on hover. The card already answers a
                        // pointer by starting its clip and coming into colour —
                        // lifting it as well is a second, louder answer to the
                        // same gesture, and it pulls the eye off the footage
                        // that is the actual reply.
                        // Keeps the pile layered while stacked, then flat so no
                        // card sits above its neighbour in the grid.
                        style={{ zIndex: isSelected || collapsing === option.value ? 30 : spread ? 0 : options.length - i }}
                        // Widths track the 0.75rem column gap: two gaps shared
                        // across three cards is 0.5rem off each.
                        //
                        // Two per row on a phone, not one. Full width meant two
                        // cards on screen and three below the fold, so the
                        // question read as a list to scroll rather than a set to
                        // choose from — and the fifth option was never seen at
                        // all before someone picked from the two that were. At
                        // half width all five fit above the controls, in the
                        // 2-2-1 the wrap falls into on its own.
                        className={`group w-[calc(50%-0.375rem)] text-left md:w-[calc(33.333%-0.5rem)] ${
                            settled ? 'cursor-pointer' : 'pointer-events-none'
                        }`}
                    >
                        <div
                            // Half the height they used to be, at the same
                            // width: 3:4 portrait made a grid two rows deep
                            // that pushed the quiz controls under the fold.
                            // Cream rather than grey behind the footage: at 55%
                            // the card's own colour is half of what you see.
                            // No ring when chosen, and no tick in the corner
                            // either. The answer is the one card left running
                            // and in colour once the pointer has gone; a green
                            // outline around it is a second answer to a question
                            // the picture has already answered.
                            className="relative aspect-[3/2] w-full overflow-hidden rounded-[26px] bg-[#EFF0E7] shadow-[0_12px_34px_rgba(0,0,0,0.08)]"
                        >
                            {/* Poster is always present and always the thing that's
                                actually visible while cold — the video only fades in
                                once `onPlaying` confirms it's flowing smoothly, so a
                                slow first fetch or decoder warm-up is never on screen.

                                Grayscale, always — hovering used to lift this to full
                                colour, which meant "awake" and "in colour" were the
                                same signal. They're pulled apart now: black and white
                                is the card's resting AND its running state, so a hand
                                moving across the grid doesn't set off a wave of five
                                cards flashing to colour and back as it passes. Only
                                one thing marks the card under the pointer once colour
                                can't: the video fading in under this poster, moving
                                where the rest of the grid is still. */}
                            <img
                                src={`${MEDIA_DIR}/${option.value}.webp`}
                                alt=""
                                aria-hidden="true"
                                // Decoded off the main thread. Five posters landing
                                // synchronously is a decode on the same thread that
                                // owns the fly-out, and it lands right as the cards
                                // start moving.
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover grayscale"
                            />

                            <video
                                ref={(el) => {
                                    videoRefs.current[i] = el;
                                }}
                                src={`${MEDIA_DIR}/${option.value}.mp4`}
                                muted
                                playsInline
                                // Every clip runs from the moment the cards
                                // land, so every clip has to be fetched — the
                                // `none` that was here was right when a clip
                                // only loaded on hover and is wrong now.
                                preload="auto"
                                // Explicit rather than a #t= URL fragment — fragment
                                // seeking isn't reliably honored across browsers, this is.
                                onLoadedMetadata={(e) => {
                                    e.currentTarget.currentTime = CLIP_START[option.value] ?? 0;
                                }}
                                onPlaying={() => handlePlaying(i)}
                                // Looped by hand rather than with `loop`, which
                                // always restarts at 0 and would drag `producer`
                                // back through its fade-in every pass. A chosen
                                // card has to keep running: reaching the end and
                                // freezing on its last frame would read as the
                                // card going still the moment you picked it.
                                onEnded={() => {
                                    if (!running.current[i]) return;
                                    const video = videoRefs.current[i];
                                    if (!video) return;
                                    video.currentTime = CLIP_START[option.value] ?? 0;
                                    video.play().catch(() => {});
                                }}
                                // Black and white unless this is the card being
                                // considered. Colour is the reward for singling one
                                // out, and it only means that while everything
                                // around it stays grey — which is why the poster
                                // underneath never takes it.
                                className={`absolute inset-0 h-full w-full object-cover ${
                                    active === i ? '' : 'grayscale'
                                } ${revealed[i] ? 'opacity-100' : 'opacity-0'}`}
                                style={{
                                    transition: `opacity ${REVEAL_FADE_MS}ms ease-out, ${COLOR_TRANSITION}`,
                                }}
                            />

                            {/* Progressive blur band across the top of the footage —
                                pure optical blur, no color wash, so it reads correctly
                                over any hue the clip happens to show. Given as a
                                percentage of a card that is now half as tall, so the
                                band still has to reach past the bottom of the
                                description: the same words over a shorter card sit
                                proportionally much further down it.

                                Switched off until the cards have landed, and this is
                                the whole of the stutter that used to run for the
                                length of the fly-out. `backdrop-filter` samples
                                whatever is painted behind the element and blurs it
                                again every frame; inside an ancestor that is being
                                translated, rotated and scaled, "behind" is different
                                on every one of those frames, so nothing can be
                                cached. Five layers on each of five cards is
                                twenty-five of those running at once against a moving
                                target — enough to miss frames on hardware that has no
                                trouble with the same twenty-five sitting still.

                                `none` rather than `blur(0px)`: a zero blur is still a
                                filter, and still forces the backdrop root that costs
                                the money. The band is invisible during the flight
                                either way — it fades up with the opacity below, and
                                the titles carry their own text shadow, so nothing is
                                unreadable in the meantime.

                                Flush with the card's edges, and it has to stay
                                that way. It was briefly bled 8px past the top
                                and sides on the theory that the filter needed
                                neighbouring pixels to sample; the opposite is
                                true. `backdrop-filter` samples the backdrop
                                image, and where nothing is painted the backdrop
                                is transparent black — so an overhanging band
                                blurs that nothing INTO the picture and pulls the
                                edge toward dark and toward transparent, which is
                                the murky rim that bleed produced. Kept inside
                                the card, every pixel under this band is opaque
                                footage and there is nothing to mix in. */}
                            <div
                                className={`pointer-events-none absolute inset-x-0 top-0 h-[62%] transition-opacity duration-500 ${
                                    settled ? 'opacity-100' : 'opacity-0'
                                }`}
                            >
                                {BLUR_LAYERS.map((layer) => {
                                    const mask = `linear-gradient(to bottom, #000 0%, #000 ${layer.solid}%, transparent ${layer.fade}%)`;
                                    return (
                                        <div
                                            key={layer.blur}
                                            className="absolute inset-0"
                                            style={{
                                                backdropFilter: settled ? `blur(${layer.blur}px)` : 'none',
                                                WebkitBackdropFilter: settled ? `blur(${layer.blur}px)` : 'none',
                                                maskImage: mask,
                                                WebkitMaskImage: mask,
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Black over the resting card, white over the awake
                                one. Not a style choice: the clips are dark, and
                                at full strength black type on them measures about
                                1.2:1 — invisible. At rest, over footage held at
                                55% on cream, white is the one that disappears
                                instead. So the words swap with the picture, on
                                the same 400ms, and the shadow comes back only
                                when there is footage under them to be held apart
                                from. */}
                            {/* Tighter inset and smaller type below `sm`: the
                                card is half the width it used to be there, and
                                the desk-sized label filled it edge to edge. */}
                            <div className="absolute inset-x-0 top-0 p-3.5 sm:p-5 md:p-6">
                                <h3
                                    className="text-[17px] font-sans font-bold leading-tight tracking-tight text-[#DCDDD4] sm:text-[24px] md:text-[26px]"
                                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.45), 0 1px 16px rgba(0,0,0,0.35)' }}
                                >
                                    {t(`onboarding.questions.${questionId}.options.${option.value}.title`)}
                                </h3>
                                {/* Full strength, both states. The picture behind
                                    it is what fades; holding the words back to
                                    85% as well only made them harder to read
                                    against footage that had already dimmed. */}
                                <p
                                    className="mt-1 text-[12.5px] font-sans font-normal leading-snug text-[#DCDDD4]/90 sm:text-[16px] md:text-[17px]"
                                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.45), 0 1px 14px rgba(0,0,0,0.3)' }}
                                >
                                    {t(`onboarding.questions.${questionId}.options.${option.value}.desc`)}
                                </p>
                            </div>

                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}
