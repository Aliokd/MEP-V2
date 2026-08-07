"use client";

import { Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * The three things Veinote does about the problem the verdict has just named,
 * shown rather than described.
 *
 * This replaced a column of prose: one paragraph per struggle explaining, in
 * words, what the product would do about it. Every one of those sentences was
 * true and none of them were evidence — and they were the longest text on the
 * screen at the exact point the visitor has already read two blocks about
 * themselves. A picture of the canvas being used says "this is a real tool"
 * in less time than a sentence claiming it takes to read.
 *
 * Each tile is a loop authored in CSS (see the `plan-*` keyframes in
 * globals.css). Nothing here is timed from React: there is no state to keep in
 * step, three unrelated pictures do not need to agree on a clock, and a tab
 * that stops compositing pauses them all rather than stranding one half-drawn.
 *
 * PLACEHOLDER ART, in two of the three:
 *
 * — Lectures uses the poster frames of the real fundamentals lessons, which is
 *   honest as far as it goes: those are the lessons. It is not the video, and
 *   the videos are 5-17MB each, which is not something to autoplay behind copy.
 *   A short, compressed loop cut from a lesson would be the real answer.
 * — Community draws monograms, not faces. There is no licensed set of member
 *   portraits in the project, and inventing people to populate a community
 *   screen is the same misrepresentation as inventing the testimonials above
 *   it. Fill COMMUNITY_FACES with real member portraits and they will be drawn
 *   instead — the shape is the same as the testimonials' `image`.
 */

/** Poster frames from the fundamentals lessons, used at thumbnail size. */
const LESSONS = [
    { poster: '/videos/Master%20fundamentals/intro-v2-poster.jpg' },
    { poster: '/videos/Master%20fundamentals/verse-poster.jpg' },
] as const;

/**
 * The community bubbles. `image` is a path under /public when there is a real
 * portrait to show; without one the initials are drawn in its place.
 *
 * The drift is per-bubble on purpose — one duration for all six would read as a
 * carousel of avatars rather than as people milling about.
 */
const COMMUNITY_FACES = [
    { initials: 'AE', image: undefined as string | undefined, size: 52, x: 4, y: 18, dur: 5.5, delay: 0 },
    { initials: 'JK', image: undefined as string | undefined, size: 44, x: 26, y: 52, dur: 6.5, delay: 0.6 },
    { initials: 'MR', image: undefined as string | undefined, size: 60, x: 44, y: 8, dur: 7.2, delay: 1.1 },
    { initials: 'PS', image: undefined as string | undefined, size: 46, x: 62, y: 56, dur: 6, delay: 0.3 },
    { initials: 'TB', image: undefined as string | undefined, size: 40, x: 82, y: 24, dur: 8, delay: 1.6 },
    { initials: 'LN', image: undefined as string | undefined, size: 36, x: 16, y: 4, dur: 6.8, delay: 2.1 },
] as const;

/** The canvas being used: a word picked, and its rhymes opening under it. */
const ToolsArt = () => {
    const { t } = useLanguage();
    const rhymes = t('onboarding.verdict.sections.tools.rhymes').split('|');

    return (
        <div aria-hidden="true" className="relative h-full w-full overflow-hidden rounded-[18px] border border-white/60 bg-white/80 p-4">
            {/* Three lines of a verse, the middle one carrying the word that
                gets picked. Bars rather than sentences for the outer two: this
                is a picture of a canvas, and a legible lyric in it would be one
                more thing to read on a screen already full of reading. */}
            <div className="space-y-2.5">
                <div className="h-2 w-[70%] rounded-full bg-stone-900/10" />
                <p className="text-[13px] font-medium leading-none text-stone-700">
                    <span className="opacity-70">{t('onboarding.verdict.sections.tools.line_before')} </span>
                    <span className="plan-anim-word rounded-[4px] px-1 py-0.5">
                        {t('onboarding.verdict.sections.tools.word')}
                    </span>
                </p>
                <div className="h-2 w-[52%] rounded-full bg-stone-900/10" />
            </div>

            {/* The lexicon, opening under the word it was asked about. */}
            <div className="plan-anim-lexicon absolute left-[18%] right-4 top-[46%] rounded-[14px] border border-stone-200 bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                <p className="text-[10px] font-semibold tracking-wide text-stone-400">
                    {t('onboarding.verdict.sections.tools.lexicon_label')}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {rhymes.map((rhyme, i) => (
                        <span
                            key={rhyme}
                            className="plan-anim-rhyme rounded-full bg-[#EFF0E7] px-2 py-0.5 text-[11px] font-medium text-stone-700"
                            style={{ animationDelay: `${i * 0.18}s` }}
                        >
                            {rhyme}
                        </span>
                    ))}
                </div>
            </div>

            {/* The pointer. Two animations on two elements rather than one on
                both: the travel and the tap are different clocks, and a single
                keyframe trying to carry both ends up doing neither cleanly. */}
            <span className="plan-anim-cursor absolute left-[18%] top-[26%]">
                <span className="plan-anim-cursor-tap block">
                    <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                        <path d="M1 1L1 14.5L4.8 11.2L7.2 16.5L9.6 15.4L7.2 10.2L12 10.2L1 1Z" fill="#363636" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                </span>
            </span>
        </div>
    );
};

/** Two lessons, one playing at a time. */
const LecturesArt = () => (
    <div aria-hidden="true" className="flex h-full w-full items-center gap-3 overflow-hidden rounded-[18px] border border-white/60 bg-white/80 p-4">
        {LESSONS.map((lesson, i) => (
            <div
                key={lesson.poster}
                className={`relative flex-1 overflow-hidden rounded-[12px] bg-stone-900 shadow-sm ${
                    i === 0 ? 'plan-anim-lesson-a' : 'plan-anim-lesson-b'
                }`}
            >
                {/* Eager, not lazy. They are 78KB between them and they are
                    the whole tile: a lazy image that decides it is out of view
                    leaves a black rectangle where the lessons should be. */}
                <img
                    src={lesson.poster}
                    alt=""
                    className="h-[86px] w-full object-cover opacity-90"
                />
                <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/85 text-stone-900">
                        <Play size={12} className="ml-[1px] fill-current" />
                    </span>
                </span>
                {/* The play head, filling from the left edge of its own card. */}
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
                    <span
                        className={`block h-full origin-left bg-[#86BE7F] ${
                            i === 0 ? 'plan-anim-playhead-a' : 'plan-anim-playhead-b'
                        }`}
                    />
                </span>
            </div>
        ))}
    </div>
);

/** People, drifting. */
const CommunityArt = () => (
    <div aria-hidden="true" className="relative h-full w-full overflow-hidden rounded-[18px] border border-white/60 bg-white/80">
        {COMMUNITY_FACES.map((face) => (
            <span
                key={face.initials}
                className="plan-anim-drift absolute grid place-items-center overflow-hidden rounded-full bg-[#EFF0E7] ring-1 ring-stone-300/70"
                style={{
                    left: `${face.x}%`,
                    top: `${face.y}%`,
                    width: face.size,
                    height: face.size,
                    animationDuration: `${face.dur}s`,
                    animationDelay: `${face.delay}s`,
                }}
            >
                {face.image ? (
                    <img src={face.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <span className="text-[11px] font-semibold tracking-wide text-stone-500">
                        {face.initials}
                    </span>
                )}
            </span>
        ))}
    </div>
);

const SECTIONS = [
    { id: 'tools', Art: ToolsArt },
    { id: 'lectures', Art: LecturesArt },
    { id: 'community', Art: CommunityArt },
] as const;

export default function PlanSections() {
    const { t } = useLanguage();

    return (
        <div className="space-y-4">
            <p className="text-[15px] font-medium text-[#3f6b3a]">
                {t('onboarding.verdict.fix_label')}
            </p>

            {/* One under another, picture beside words. Three abreast made each
                tile a third of the column: the canvas was too narrow to read as
                a canvas, the two lessons were postage stamps, and every title
                broke onto two lines. Stacked, each one gets the full measure —
                the art at a size where you can see what is happening in it, and
                a line of copy that stays a line.

                Picture above words below `sm`, where a 200px pane beside text
                would leave the text in a gutter. */}
            <div className="flex flex-col gap-3">
                {SECTIONS.map(({ id, Art }) => (
                    <div
                        key={id}
                        className="flex flex-col gap-4 rounded-[24px] border border-white/50 bg-white/40 p-3 text-left backdrop-blur-xl backdrop-saturate-150 sm:flex-row sm:items-center sm:gap-5"
                    >
                        <div className="h-[132px] w-full shrink-0 sm:w-[236px]">
                            <Art />
                        </div>
                        <div className="space-y-1.5 px-1 pb-1 sm:pb-0 sm:pr-3">
                            <p className="text-[17px] font-semibold leading-snug text-stone-900 md:text-[19px]">
                                {t(`onboarding.verdict.sections.${id}.title`)}
                            </p>
                            <p className="text-[14px] font-medium leading-relaxed text-stone-900/70 md:text-[15px]">
                                {t(`onboarding.verdict.sections.${id}.desc`)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
