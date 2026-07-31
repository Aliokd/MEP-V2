"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

/**
 * The mood question, answered by picking a feeling rather than reading a list.
 * Each option is a stadium-shaped pill filled with a photograph of that mood —
 * pink fog over pines, hills in evening light, a wall of cloud — washed pale
 * enough that the label sits on top of it without a scrim.
 *
 * Point at one and that photograph takes the whole page: the pill's own band
 * comes up to full strength while the other four fade back to glass, and the
 * page behind them turns into the same picture, full bleed. Which mood the
 * page is wearing is reported up via `onPreview` — the backdrop itself is
 * painted by the page, since a `fixed` layer under a component that framer
 * transforms would be anchored to that transform rather than the viewport.
 *
 * The pill photographs are pre-cropped to a wide band rather than being
 * object-cover'd out of a tall original: the source frames are portrait, so
 * cropping in the browser would mean fetching ten times the pixels that are
 * ever shown. Bands 64KB for the set, backdrops 450KB.
 *
 * Both are encoded at the source's own resolution at quality 92, and neither is
 * upscaled or sharpened first. Both of those were tried: they cost bits that
 * webp then takes back out of the branch texture, which is the one thing in
 * these frames that reads as detail — smeared into blobs it looks worse at any
 * size than a clean image the browser scales up itself. The sources are only
 * ~960px wide, so a full-bleed backdrop is soft on a large screen no matter
 * what; soft is the ceiling here, and blotchy is what to avoid.
 */
const MEDIA_DIR = '/onboarding-moods';

// The wash over each photograph — heaviest on the left, where the label sits,
// thinning to the right so the imagery is legible where nothing covers it.
// This is what makes a photograph read as one of the page's own pastels.
const WASH =
    'linear-gradient(90deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.58) 42%, rgba(255,255,255,0.34) 100%)';

interface MoodOptionsProps {
    questionId: string;
    options: { value: string }[];
    selectedOption: string | null;
    onSelect: (value: string) => void;
    /** Which mood the page should be wearing, or null for none. */
    onPreview?: (value: string | null) => void;
}

export default function MoodOptions({ questionId, options, selectedOption, onSelect, onPreview }: MoodOptionsProps) {
    const { t } = useLanguage();
    const [hovered, setHovered] = useState<string | null>(null);

    // An answer, once given, outranks the pointer: hovering the other four
    // stops doing anything at all. Before there is an answer, pointing at a mood
    // previews it. The rule is what makes a chosen page stay still — otherwise
    // reaching for Next drags the whole backdrop through two more moods on the
    // way past, and the screen argues with the choice just made on it.
    const active = selectedOption ?? hovered;

    useEffect(() => {
        onPreview?.(active);
    }, [active, onPreview]);

    // Leaving the question takes the picture with it.
    useEffect(() => () => onPreview?.(null), [onPreview]);

    return (
        // Half the width of the column the headline gets. It also brings the
        // pill's own shape (336×62) within a hair of the band's 5.14:1 crop, so
        // object-cover has almost nothing left to throw away.
        <div className="mx-auto flex w-full max-w-[336px] flex-col gap-2 md:gap-2.5">
            {options.map((option) => {
                const isActive = active === option.value;
                // Another mood has the page. This one steps back to let it.
                const isDimmed = active !== null && !isActive;

                return (
                    <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => onSelect(option.value)}
                        onMouseEnter={() => setHovered(option.value)}
                        onMouseLeave={() => setHovered((current) => (current === option.value ? null : current))}
                        onFocus={() => setHovered(option.value)}
                        onBlur={() => setHovered((current) => (current === option.value ? null : current))}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.995 }}
                        // No shadow on any of the three states. These pills lie
                        // flat on the page — and once a mood takes the backdrop,
                        // a drop shadow under a pane of glass is a lie about
                        // what's behind it.
                        //
                        // Short enough that all five and the quiz controls below
                        // them sit on one screen; the pill is a line of type on
                        // a photograph, and it only needs to be as tall as that.
                        //
                        // No outline and no tick when chosen. The chosen mood is
                        // already the only one at full strength, holding the
                        // page's backdrop, with the other four at half beside it
                        // — a ring and a checkmark on top of all that are saying
                        // a third and fourth time what the screen has already
                        // said.
                        // The white ring is on every pill, chosen or not — it is
                        // an edge on the shape, not a mark of state. At half
                        // opacity it lifts each pill off the paper and off the
                        // photograph behind it without reading as a border.
                        className="group relative h-[58px] w-full overflow-hidden rounded-full text-left ring-1 ring-white/50 md:h-[62px]"
                    >
                        {/* Every layer of the pill except its label, faded as one
                            when another mood has the page. Half opacity on the
                            group rather than a different number on each layer:
                            what steps back is the pill, and the words on it are
                            deliberately not part of that — they stay outside
                            this wrapper at full strength. */}
                        <span
                            aria-hidden="true"
                            className={`absolute inset-0 transition-opacity duration-500 ${
                                isDimmed ? 'opacity-50' : 'opacity-100'
                            }`}
                        >
                            <img
                                src={`${MEDIA_DIR}/${option.value}.webp`}
                                alt=""
                                // Anchored to the bottom of the band, not its middle.
                                // The pill is far wider than the crop's own ratio, so
                                // something has to go — and what's at the bottom of
                                // every one of these frames is the thing you can
                                // actually read as a place: treetops, a ridgeline.
                                className="absolute inset-0 h-full w-full object-cover object-bottom"
                            />

                            {/* Lifts off the picture when this mood has the page. */}
                            <span
                                className={`absolute inset-0 transition-opacity duration-500 ${
                                    isActive ? 'opacity-45' : 'opacity-100'
                                }`}
                                style={{ background: WASH }}
                            />
                        </span>

                        {/* No tick to leave room for on the right any more, so
                            the label gets the pill's own symmetry back.

                            Full black on all five, including the ones stepping
                            back. What dims is the picture behind the words, not
                            the words: a mood you haven't chosen still has to be
                            readable enough to choose. */}
                        <span className="relative flex h-full items-center px-6 md:px-8">
                            <span className="text-[18px] font-sans font-medium leading-snug tracking-tight text-[#363636] md:text-[20px]">
                                {t(`onboarding.questions.${questionId}.options.${option.value}`)}
                            </span>
                        </span>

                    </motion.button>
                );
            })}
        </div>
    );
}
