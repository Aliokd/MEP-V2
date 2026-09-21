"use client";

import { Check, Heart, Play } from 'lucide-react';
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
 * PLACEHOLDER ART: the lesson tile uses a poster frame of the real
 * fundamentals lesson, which is honest as far as it goes: that is the lesson,
 * and the teacher. It is a still, not the video. The videos are 5-17MB each,
 * which is not something to autoplay behind copy; a short compressed loop cut
 * from one would be the real answer. The collaborator on the community tile is
 * a drawn cursor with a first name on it, the way one appears in the canvas,
 * and claims nothing about anyone.
 */

/** A poster frame from the fundamentals lesson, cut with ffmpeg and committed
    under /onboarding-cards; /videos is gitignored and never deploys. */
const LESSON_POSTER = '/onboarding-cards/lesson-intro.webp';

/** The space between typed words. A plain space would collapse at a span
    boundary the moment its neighbour was invisible. */
const NBSP = '\u00a0';

/** "Mara L." to "ML": what a name looks like without a portrait. */
const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

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

/**
 * A lesson finishing a song. The lesson plays on the left; on the right the
 * song's structure fills in a part at a time as the play head advances, and
 * when the last part lands the song is marked finished. The title says lessons
 * finish songs, so the picture shows exactly that and nothing else.
 */
const LecturesArt = () => {
    const { t } = useLanguage();
    const parts = t('onboarding.verdict.sections.lectures.parts').split('|');

    return (
        <div aria-hidden="true" className="relative h-full w-full overflow-hidden rounded-[18px] border border-white/60 bg-white/80 p-3">
            <div className="flex items-start gap-3">
                <div className="relative h-[56px] w-[84px] shrink-0 overflow-hidden rounded-[10px] bg-stone-900 shadow-sm">
                    {/* Eager, not lazy. It is small and it is the lesson: a
                        lazy image that decides it is out of view leaves a
                        black rectangle where the teacher should be. */}
                    <img src={LESSON_POSTER} alt="" className="h-full w-full object-cover opacity-90" />
                    <span className="absolute inset-0 grid place-items-center">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/85 text-stone-900">
                            <Play size={10} className="ml-[1px] fill-current" />
                        </span>
                    </span>
                    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
                        <span className="plan-anim-lesson-play block h-full origin-left bg-[#86BE7F]" />
                    </span>
                </div>
                {/* The lesson's title, as bars. Legible words here would be a
                    second thing to read beside the parts that matter. */}
                <div className="flex-1 space-y-2 pt-1.5">
                    <div className="h-2 w-[82%] rounded-full bg-stone-900/10" />
                    <div className="h-2 w-[54%] rounded-full bg-stone-900/10" />
                </div>
            </div>

            {/* The song, as its parts. Each fills as the lesson reaches it. */}
            <div className="mt-3 flex gap-1.5">
                {parts.map((part, i) => (
                    <span
                        key={part}
                        className={`plan-anim-part-${i + 1} flex-1 rounded-[7px] bg-stone-900/[0.07] py-1.5 text-center text-[10px] font-semibold leading-none text-stone-500`}
                    >
                        {part}
                    </span>
                ))}
            </div>

            <span className="plan-anim-done absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                <Check size={11} className="stroke-[3px]" />
                {t('onboarding.verdict.sections.lectures.done')}
            </span>
        </div>
    );
};

/**
 * Someone else writing on the same canvas. A second cursor arrives with a name
 * on it, a line appears under the first one a word at a time, and a reaction
 * lands on it. Two people and one song, which is what the title promises.
 *
 * The cursor sits inline after the last word rather than at fixed coordinates,
 * so it lands at the end of the line in every language; the words are in the
 * flow at zero opacity, which is what keeps that end where it is.
 */
const CommunityArt = () => {
    const { t } = useLanguage();
    const typed = t('onboarding.verdict.sections.community.typed').split('|');
    const name = t('onboarding.verdict.sections.community.name');

    return (
        <div aria-hidden="true" className="relative h-full w-full overflow-hidden rounded-[18px] border border-white/60 bg-white/80 p-4">
            {/* Who is in the room, top right. The second face joins as the
                cursor arrives. */}
            <span className="absolute right-3 top-3 flex -space-x-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#EFF0E7] text-[9px] font-semibold text-stone-500 ring-2 ring-white">
                    {t('onboarding.verdict.sections.community.you')}
                </span>
                <span className="plan-anim-join grid h-6 w-6 place-items-center rounded-full bg-[#86BE7F] text-[9px] font-semibold text-stone-900 ring-2 ring-white">
                    {initialsOf(name)}
                </span>
            </span>

            <div className="space-y-2.5 pr-14">
                <div className="h-2 w-[64%] rounded-full bg-stone-900/10" />
                <p className="text-[13px] font-medium leading-none text-stone-700">
                    {t('onboarding.verdict.sections.community.line')}
                </p>
                <p className="whitespace-nowrap text-[13px] font-medium leading-none text-stone-700">
                    {typed.map((word, i) => (
                        <span
                            key={word}
                            className="plan-anim-type inline-block"
                            style={{ animationDelay: `${i * 0.45}s` }}
                        >
                            {word}
                            {i < typed.length - 1 ? NBSP : null}
                        </span>
                    ))}
                    <span className="plan-anim-collab-cursor relative -top-[2px] ml-0.5 inline-flex items-start">
                        <svg width="14" height="16" viewBox="0 0 16 18" fill="none">
                            <path d="M1 1L1 14.5L4.8 11.2L7.2 16.5L9.6 15.4L7.2 10.2L12 10.2L1 1Z" fill="#5F9857" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                        <span className="ml-0.5 mt-2.5 rounded-full bg-[#86BE7F] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-stone-900">
                            {name}
                        </span>
                    </span>
                </p>
            </div>

            <span className="plan-anim-react absolute bottom-3 left-4 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-1 text-[10px] font-semibold text-stone-700 shadow-sm">
                <Heart size={10} className="fill-[#f0a8c9] stroke-[#f0a8c9]" />
                {t('onboarding.verdict.sections.community.reaction')}
            </span>
        </div>
    );
};

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
