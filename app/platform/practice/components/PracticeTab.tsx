"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PracticeCard from './PracticeCard';
import PracticeVideoModal from './PracticeVideoModal';
// SongChooser itself is retired — Start lands straight in the exercise — but its
// ChosenSong shape still names what is being practised, uploads included.
import { type ChosenSong } from './SongChooser';
import SongPill from './SongPill';
import { usePracticeLibrary } from '../lib/library';
import StructurePlayer from './StructurePlayer';
import VerseDemo from './VerseDemo';
import MelodyVariation from './MelodyVariation';
import { PRACTICE_NAMES, getPractice, type PracticeDefinition } from '../data/practices';
import { ChevronLeft, ChevronRight, ChevronDown, Check, ArrowLeft, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { SECTION_TEXT, TAG_BG, WRONG_TEXT } from '../data/sections';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createCanvasFromLines } from '@/lib/createCanvasFromLines';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackDismiss } from '@/hooks/useBackDismiss';

/** Starting points for Composing verses. */
const THEMES = [
    'Nature', 'Sports', 'Urban life', 'Solitude', 'Memory', 'Ambition', 'Conflict', 'Harmony',
    'Velocity', 'Starlight', 'The deep', 'Whispers', 'Machines', 'Ritual', 'Digital soul', 'The harvest',
] as const;

/** The two columns of the linking step, left to right. */
const NOUN_VERB_SIDES = ['n', 'v'] as const;

/*
 * One type scale across the whole practice, so a card means the same thing on
 * every step. A single word is set larger than a whole line — a line is four or
 * five times as long and would wrap at the word size. Both came down 20%
 * together: shrinking only the word cards would have left the sentence cards
 * of step 5 set larger than them and inverted the rule.
 */
const WORD_SIZE = 'text-[1.4rem]';
const LINE_SIZE = 'text-[1.2rem]';
/**
 * The step's instruction. Grows on a wide screen, where the row of cards below
 * it is wide enough that an 18px line reads as a caption rather than the thing
 * being asked. Stone-700 rather than -900: it is a prompt, not the content.
 */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';

/*
 * The footer's controls. Every one of them — the back circle, the quiet option
 * and the primary — is built from `bare` plus these, so they come out the same
 * height and the same weight. Taking them from different named sizes is what
 * left the last step with a 56px secondary beside a 60px primary.
 */
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;

/*
 * The last step's burst lands on two grounds at once — over the green button and
 * out onto the beige panel — so every colour has to read against both. That
 * rules out the default palette's #86BE7F, which disappears into the button, and
 * equally rules out white, which would disappear into the panel. Dark greens and
 * a charcoal are what is left, and they hold on either.
 */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;
/** Every card that holds one word or one line stands this tall. */
const ROW_H = 80;
/** The gap between them, matching Tailwind's gap-3. */
const ROW_GAP = 12;

/**
 * Vertical centre of row `i` in a five-row column, as a percentage of the
 * column's height — where the linking step's connectors have to land. Derived
 * rather than tuned by eye: the two magic numbers that used to sit here were
 * both a little off, and drifted further every time a card changed height.
 */
const rowCentrePct = (i: number) =>
    (((ROW_H + ROW_GAP) * i + ROW_H / 2) / (ROW_H * 5 + ROW_GAP * 4)) * 100;

/*
 * The nudge shake, as keyframes rather than a class. Same gesture and same
 * timing as `.animate-nudge-shake` in globals.css — a head shake, not a
 * rejection — kept in step with it by hand because a field cannot use the class:
 * replaying a CSS animation means remounting the element, and remounting a field
 * loses the caret. Translate only, so it never reflows the rows around it.
 */
const NUDGE_SHAKE: Keyframe[] = [
    { transform: 'translateX(0)', offset: 0 },
    { transform: 'translateX(-6px)', offset: 0.15 },
    { transform: 'translateX(5px)', offset: 0.30 },
    { transform: 'translateX(-4px)', offset: 0.45 },
    { transform: 'translateX(3px)', offset: 0.60 },
    { transform: 'translateX(-2px)', offset: 0.75 },
    { transform: 'translateX(0)', offset: 1 },
];
const NUDGE_SHAKE_TIMING: KeyframeAnimationOptions = {
    duration: 420,
    easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
};

/**
 * Carousel slide for the practice card. Direction is +1 when moving forward
 * through the list and -1 when moving back. Position only — the card never
 * fades, it just travels.
 */
const CARD_SLIDE = {
    enter: (direction: number) => ({ x: direction >= 0 ? '100%' : '-100%' }),
    center: { x: 0 },
    exit: (direction: number) => ({ x: direction >= 0 ? '-100%' : '100%' }),
};

export default function PracticeTab() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    // Authored in the admin console; falls back to the bundled list.
    const songs = usePracticeLibrary();

    const getTranslatedPracticeName = (name: string) => t(getPractice(name).nameKey);

    /**
     * The promise an unbuilt practice carries: its release date and the days
     * until it. Null once the date has slipped past — better a plain "coming
     * soon" than a countdown standing at zero.
     */
    // Sampled once per mount: the countdown ticks in days, not seconds.
    const [now] = useState(() => Date.now());

    const releaseInfo = (p: PracticeDefinition) => {
        if (p.available || !p.releaseAt) return null;
        const date = new Date(`${p.releaseAt}T00:00:00Z`);
        const days = Math.ceil((date.getTime() - now) / 86400000);
        if (days <= 0) return null;

        const day = date.getUTCDate();
        const sameYear = date.getUTCFullYear() === new Date(now).getFullYear();
        const year = sameYear ? '' : ` ${date.getUTCFullYear()}`;

        // "Sep, 1st" in English. The Nordic locales keep their own shape —
        // an English ordinal reads as a foreign body in "1. sep".
        let dateLabel: string;
        if (language === 'no' || language === 'sv') {
            dateLabel = new Intl.DateTimeFormat(language === 'no' ? 'nb-NO' : 'sv-SE', {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
                ...(sameYear ? {} : { year: 'numeric' }),
            }).format(date);
        } else {
            // en-US, not en-GB: the latter abbreviates September to "Sept".
            const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date);
            const tens = day % 100;
            const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][day % 10] ?? 'th');
            dateLabel = `${month}, ${day}${suffix}${year}`;
        }
        return { dateLabel, days };
    };

    /** The menu's date stamp: "Coming Sep, 1st". */
    const comingLabel = (p: PracticeDefinition) => {
        const info = releaseInfo(p);
        return info ? t('practice.coming_on').replace('{date}', info.dateLabel) : t('common.coming_soon');
    };

    /** The card's countdown: "Coming in 14 days". */
    const countdownLabel = (p: PracticeDefinition) => {
        const info = releaseInfo(p);
        if (!info) return t('common.coming_soon');
        return info.days === 1
            ? t('practice.coming_in_one_day')
            : t('practice.coming_in_days').replace('{days}', String(info.days));
    };

    const getTranslatedLevel = (lvl: string) => {
        switch(lvl) {
            case 'beginner': return t('practice.level_beginner');
            case 'intermediate': return t('practice.level_intermediate');
            case 'advanced': return t('practice.level_advanced');
            case 'all levels': return t('practice.level_all');
            default: return lvl;
        }
    };

    const practices = PRACTICE_NAMES;

    const [selectedPractice, setSelectedPractice] = useState(practices[0]);
    // null → the card gallery. Set to a practice name once it has been started.
    const [openedPractice, setOpenedPractice] = useState<string | null>(null);
    const [videoPractice, setVideoPractice] = useState<PracticeDefinition | null>(null);
    // Which way the card carousel should travel on the next switch.
    const [direction, setDirection] = useState(1);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    // Master song structure: null → the chooser pre-step; set once Next is clicked.
    const [chosenSong, setChosenSong] = useState<ChosenSong | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Composing Verses (Practice 2) State
    const [currentStep, setCurrentStep] = useState(1);

    /**
     * Android's Back, inside an exercise: one step back, and out to the practice
     * card from step one — rather than leaving Practice for Create.
     *
     * currentStep is the depth key, so the entry is re-armed on every step and
     * Back keeps working all the way down instead of only once.
     */
    useBackDismiss(
        !!openedPractice,
        () => {
            if (currentStep > 1) setCurrentStep(prev => prev - 1);
            else setOpenedPractice(null);
        },
        currentStep,
    );
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [nouns, setNouns] = useState<string[]>(Array(5).fill(''));
    const [verbs, setVerbs] = useState<string[]>(Array(5).fill(''));
    const [connections, setConnections] = useState<{ n: number; v: number }[]>([]);
    const [pendingNounIndex, setPendingNounIndex] = useState<number | null>(null);
    const [sentences, setSentences] = useState<string[]>(Array(5).fill(''));
    // 'sending' outlives the click: the canvas route takes a moment to mount.
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    // Next is never disabled; pressing it early shakes it and says what to do.
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();
    /*
     * Every field of the current typing step, in order. [0] is the one the caret
     * starts in; the empty ones are what an early Next shakes.
     */
    const fieldRefs = useRef<(HTMLInputElement | null)[]>([]);
    /*
     * The how-to guides, one per practice that has one. They appear on EVERY
     * opening of their practice — the guide's own "don't show this again" is
     * the only thing that writes the seen-key and retires the auto-show. State
     * lives here rather than in the exercises because StructurePlayer is keyed
     * by song: kept there, the guide would re-pop on every song switch instead
     * of once per visit. Decided in an effect so the server render and the
     * first client render agree on "hidden"; leaving a practice closes its
     * guide, so a re-open is a fresh decision.
     */
    const [showStructureDemo, setShowStructureDemo] = useState(false);
    const [showVerseDemo, setShowVerseDemo] = useState(false);
    useEffect(() => {
        setShowStructureDemo(
            openedPractice === 'Master song structure' &&
            localStorage.getItem('mep-structure-demo-seen') !== 'true',
        );
        setShowVerseDemo(
            openedPractice === 'Composing verses' &&
            localStorage.getItem('mep-verse-demo-seen') !== 'true',
        );
    }, [openedPractice]);

    /** Close a guide, and on "don't show again" make that stick. */
    const closeDemo = (key: string, set: (v: boolean) => void) => (neverAgain: boolean) => {
        set(false);
        if (neverAgain) safeLocalStorageSetItem(key, 'true');
    };

    const currentMeta = getPractice(selectedPractice);

    /**
     * Switching practice from the header. Staying inside a practice only makes
     * sense when the target has one to show — otherwise fall back to the card
     * for the one just picked.
     */
    const selectPractice = (name: string, dir?: number) => {
        // A menu pick slides toward wherever that practice sits in the list.
        setDirection(dir ?? (practices.indexOf(name) >= practices.indexOf(selectedPractice) ? 1 : -1));
        setSelectedPractice(name);
        setDropdownOpen(false);
        setOpenedPractice(prev => (prev && getPractice(name).available ? name : null));
    };

    // Stop playback when moving between practices or back to the overview card,
    // and forget the song choice so the next run starts on the default again.
    useEffect(() => {
        setIsPlaying(false);
        setChosenSong(null);
    }, [selectedPractice, openedPractice]);

    /*
     * There is no pick-a-song pre-step: Start lands straight in the exercise on
     * the first playable song, and the song pill's dropdown does the switching.
     */
    const activeSong: ChosenSong | null = chosenSong
        ?? (() => {
            const first = songs.find(s => s.available);
            return first ? { source: 'library' as const, song: first } : null;
        })();

    /*
     * Stepping through the library once a song is finished. Only the playable
     * ones are in the ring, and it wraps — the end of the list should send you
     * back to the start rather than to a dead button.
     */
    const stepSong = (delta: number) => {
        const playable = songs.filter(s => s.available);
        if (playable.length === 0) return;
        const current = activeSong?.source === 'library'
            ? playable.findIndex(s => s.id === activeSong.song.id)
            : -1;
        const next = playable[(current + delta + playable.length) % playable.length];
        setIsPlaying(false);
        setChosenSong({ source: 'library', song: next });
    };

    // Handle cycling practices
    const handlePrevPractice = () => {
        const currentIndex = practices.indexOf(selectedPractice);
        selectPractice(practices[(currentIndex - 1 + practices.length) % practices.length], -1);
    };

    const handleNextPractice = () => {
        const currentIndex = practices.indexOf(selectedPractice);
        selectPractice(practices[(currentIndex + 1) % practices.length], 1);
    };

    // Stable across renders: the player keys its audio element off this.
    const handleTogglePlay = useCallback(() => {
        setIsPlaying(playing => !playing);
    }, []);

    const handleWordChange = (type: 'noun' | 'verb', index: number, value: string) => {
        if (type === 'noun') {
            const newNouns = [...nouns];
            newNouns[index] = value;
            setNouns(newNouns);
        } else {
            const newVerbs = [...verbs];
            newVerbs[index] = value;
            setVerbs(newVerbs);
        }
    };

    /**
     * One line per step, and the only copy each step carries. What used to sit
     * above these — a small-caps eyebrow and a sentence of description — said
     * nothing the controls beneath it did not already say.
     */
    const STEP_ASKS: Record<number, string> = {
        1: t('practice.choose_theme'),
        2: t('practice.type_5_nouns'),
        3: t('practice.type_5_verbs'),
        4: t('practice.link_nouns_verbs'),
        5: t('practice.complete_sentences'),
        6: t('practice.story_ready'),
    };

    /** The finished verse, top to bottom — what step 6 shows and what leaves here. */
    const verseLines = sentences.filter(s => s && s.trim() !== '');

    /**
     * The last step's real ending: the verse becomes a canvas and the user is
     * standing in Create with it, rather than reading it once and losing it to
     * "Start a new practice".
     */
    const handleSendToCanvas = async () => {
        if (sendState === 'sending' || verseLines.length === 0) return;
        setSendState('sending');


        const noteId = await createCanvasFromLines(user?.uid, {
            title: selectedTheme
                ? t('practice.canvas_title').replace('{theme}', selectedTheme)
                : t('practice.composing_verses'),
            lines: verseLines,
            sectionName: 'Verse 1',
        });

        // A canvas that exists only in this browser would look saved and never
        // sync, so a failed write stays a failed write — say so and let them retry.
        if (!noteId) {
            setSendState('failed');
            return;
        }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    /*
     * A step that asks for typing puts the caret in its first field, so the
     * answer starts where the eye already is. preventScroll because the panel
     * is taller than the viewport on a phone and focusing must not jump it.
     */
    useEffect(() => {
        if (openedPractice !== 'Composing verses') return;
        if (currentStep !== 2 && currentStep !== 3 && currentStep !== 5) return;
        const id = requestAnimationFrame(() => {
            fieldRefs.current[0]?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(id);
    }, [currentStep, openedPractice]);

    /** What is still missing on this step, said as the thing to do next. */
    const STEP_NUDGES: Record<number, string> = {
        1: t('practice.nudge_theme'),
        2: t('practice.nudge_nouns'),
        3: t('practice.nudge_verbs'),
        4: t('practice.nudge_links'),
        5: t('practice.nudge_lines'),
    };

    const isStepComplete = (step: number) => {
        if (step === 1) return selectedTheme !== null;
        if (step === 2) return nouns.every(n => n.trim() !== '');
        if (step === 3) return verbs.every(v => v.trim() !== '');
        if (step === 4) return connections.length === 5;
        if (step === 5) return sentences.filter(s => s && s.trim() !== '').length === connections.length;
        return true;
    };

    /*
     * A nudge belongs to the step that earned it, and only for as long as it is
     * still true. It goes on the way into a step, and the moment the step is
     * satisfied — a prompt left standing over work already done is nagging.
     */
    const stepSatisfied = isStepComplete(currentStep);
    useEffect(() => { clearNudge(); }, [currentStep, stepSatisfied, clearNudge]);

    /**
     * The same head shake the button does, on the fields that are still empty.
     *
     * Driven through the Web Animations API rather than the CSS class the button
     * uses: restarting that class needs the element remounted, and remounting a
     * field takes the caret and the focus with it. `animate()` just replays.
     */
    const shakeEmptyFields = () => {
        if (typeof window === 'undefined') return;
        // The CSS class opts out through a media query; this has to ask.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (const el of fieldRefs.current) {
            if (!el || el.value.trim() !== '') continue;
            el.animate(NUDGE_SHAKE, NUDGE_SHAKE_TIMING);
        }
    };

    /** Pressing on. The one place that decides whether the step may be left. */
    const goNext = () => {
        if (!isStepComplete(currentStep)) {
            nudge();
            shakeEmptyFields();
            // Land the caret in the first thing that is missing, so the answer
            // to "which one" is somewhere to type rather than somewhere to look.
            fieldRefs.current.find(el => el && el.value.trim() === '')
                ?.focus({ preventScroll: true });
            return;
        }
        clearNudge();
        setCurrentStep(prev => prev + 1);
    };

    /**
     * Enter from any field does what Next does — nothing new to learn, and no
     * reaching for the mouse after typing the fifth word. Incomplete, it nudges
     * exactly as the button would, so Enter never means two different things.
     */
    const nextOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        goNext();
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        // px-4 below md: the beige panel that used to supply this page's edge
        // gutter is gone on a phone (see isBareMobilePanel in the platform layout),
        // so Practice carries its own.
        <div className="w-full px-4 md:px-0">

            {/* Full-width content column */}
            <div className="w-full bg-transparent pb-6 relative overflow-visible">

                {/* Top Practice Selector Header — swapped for the back row once a practice is open */}
                {/* One height for all three controls. The pill's is padding-and-type
                    derived — 50px on a phone, 54 from md up — and the arrows used to
                    carry their own sizes, which is how they ended up as 36px circles
                    beside a 54px pill. Now every control reads the same variable, so
                    they cannot drift apart again. */}
                <div className={`[--ctl-h:50px] md:[--ctl-h:54px] items-center justify-center gap-2 md:gap-4 mb-6 relative z-30 select-none ${openedPractice ? 'hidden' : 'flex'}`}>
                    {/* Previous Button */}
                    <button 
                        onClick={handlePrevPractice}
                        // Solid white, not bg-white/50 at opacity-60. Against the beige
                        // panel that half-transparent fill read as a faint smudge at the
                        // edge of the screen rather than a control; with the panel gone on
                        // a phone it had almost nothing to sit against at all.
                        // 'bare' brings the circle's look with no size of its own.
                        className={`${btn.icon('bare')} h-[var(--ctl-h)] w-[var(--ctl-h)]`}
                        aria-label={t('practice.previous_practice')}
                    >
                        <ChevronLeft size={22} className="stroke-[2.2]" />
                    </button>
 
                    {/* Active Title + Dropdown Selector */}
                    <div ref={dropdownRef} className="relative flex-1 min-w-0 max-w-[430px]">
                        {/* Takes whatever the two arrows leave, at every width — the
                            arrows are the fixed part and the title is the elastic one,
                            because a control you cannot reach is worse than a title you
                            cannot read in full.

                            It used to claim a fixed md:w-[min(76vw,430px)]. 76vw measures
                            the VIEWPORT, but this row sits inside a panel the sidebar has
                            already taken ~260px out of — so on a medium screen the pill
                            asked for more than the row had and pushed the arrows off both
                            edges. flex-1 against shrink-0 arrows cannot do that; max-w
                            keeps the old ceiling on a wide screen. */}
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className={`${btn.secondary('bare')} h-[var(--ctl-h)] w-full gap-2.5 px-4 font-serif text-lg font-normal tracking-wide text-stone-900 md:px-6 md:text-2xl`}
                        >
                            <span className="truncate">{getTranslatedPracticeName(selectedPractice)}</span>
                            <ChevronDown size={16} className={`shrink-0 stroke-[2.2] transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
 
                        {/* Dropdown Menu — the wrapper owns the horizontal centering, because
                            framer-motion writes an inline transform on the animated element that
                            would override a -translate-x-1/2 utility and shift the panel right. */}
                        <AnimatePresence>
                            {dropdownOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50">
                                    <motion.div
                                        data-practice-menu
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                        className="w-[min(88vw,540px)] max-h-[min(60vh,520px)] overflow-y-auto no-scrollbar bg-white/95 backdrop-blur-md border border-stone-200/60 rounded-[24px] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.10)]"
                                    >
                                        {practices.map((p) => {
                                            const isSelected = p === selectedPractice;
                                            const meta = getPractice(p);
                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => selectPractice(p)}
                                                    className={`${btn.menuItem()} justify-between gap-4 px-5 py-3 font-serif text-base font-normal sm:text-lg
                                                        ${isSelected
                                                            ? 'bg-stone-100 text-stone-900'
                                                            : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                                        }
                                                    `}
                                                >
                                                    <span className="truncate">{getTranslatedPracticeName(p)}</span>
                                                    {!meta.available && (
                                                        <span className="shrink-0 whitespace-nowrap rounded-full bg-stone-100 text-stone-400 px-3 py-0.5 text-xs font-sans">
                                                            {comingLabel(meta)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Next Button */}
                    <button 
                        onClick={handleNextPractice}
                        // Solid white, not bg-white/50 at opacity-60. Against the beige
                        // panel that half-transparent fill read as a faint smudge at the
                        // edge of the screen rather than a control; with the panel gone on
                        // a phone it had almost nothing to sit against at all.
                        className={`${btn.icon('bare')} h-[var(--ctl-h)] w-[var(--ctl-h)]`}
                        aria-label={t('practice.next_practice')}
                    >
                        <ChevronRight size={22} className="stroke-[2.2]" />
                    </button>
                </div>
 
                {/* Inside a practice the header selector gives way to this row: the way
                    back, and the practice you're in. */}
                {openedPractice && (
                    <div className="flex items-center gap-4 mb-8 select-none">
                        <button
                            onClick={() => setOpenedPractice(null)}
                            className={btn.ghost('sm')}
                        >
                            <ArrowLeft size={16} className="stroke-[2]" />
                            {t('practice.back')}
                        </button>

                        <span className="w-px h-4 bg-stone-300 shrink-0" />

                        {/* Set to match the Back button beside it, colour included — the
                            two read as one quiet breadcrumb, not a link and a heading. */}
                        <h2 className="text-sm font-sans font-medium text-stone-500 truncate">
                            {getTranslatedPracticeName(openedPractice)}
                        </h2>

                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* One practice at a time — the header arrows and menu cycle through them */}
                    {!openedPractice && (
                        <motion.div
                            key="card-area"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="w-full pb-8 relative overflow-hidden"
                        >
                            {/* Cards slide past each other in the direction you asked for.
                                popLayout takes the outgoing card out of flow so both move
                                at once instead of one waiting for the other. */}
                            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                                <motion.div
                                    key={selectedPractice}
                                    custom={direction}
                                    variants={CARD_SLIDE}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
                                >
                                    <PracticeCard
                                        practice={currentMeta}
                                        name={t(currentMeta.nameKey)}
                                        goal={t(currentMeta.goalKey)}
                                        level={getTranslatedLevel(currentMeta.level)}
                                        startLabel={t('practice.start_practice')}
                                        comingSoonLabel={countdownLabel(currentMeta)}
                                        videoLabel={t('practice.why_practice').replace('{practice}', t(currentMeta.nameKey))}
                                        onStart={() => setOpenedPractice(currentMeta.name)}
                                        onPlayVideo={() => setVideoPractice(currentMeta)}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {openedPractice === 'Master song structure' && (
                        <motion.div
                            key="song-structure"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="w-full"
                        >
                            {activeSong && (
                                <StructurePlayer
                                    key={activeSong.source === 'library' ? activeSong.song.id : activeSong.audioUrl}
                                    songId={activeSong.source === 'library' ? activeSong.song.id : 'upload'}
                                    audioUrl={activeSong.source === 'library' ? activeSong.song.audioUrl : activeSong.audioUrl}
                                    sections={activeSong.source === 'library' ? activeSong.song.sections : undefined}
                                    isPlaying={isPlaying}
                                    onTogglePlay={handleTogglePlay}
                                    onPrevSong={() => stepSong(-1)}
                                    onNextSong={() => stepSong(1)}
                                    showDemo={showStructureDemo}
                                    onDemoClose={closeDemo('mep-structure-demo-seen', setShowStructureDemo)}
                                    onReplayDemo={() => setShowStructureDemo(true)}
                                    headerSlot={
                                        /* The song pill opens the library in place — switching
                                           songs never leaves the exercise */
                                        <SongPill
                                            title={activeSong.source === 'library' ? activeSong.song.title : activeSong.title}
                                            artist={activeSong.source === 'library' ? activeSong.song.artist : undefined}
                                            currentId={activeSong.source === 'library' ? activeSong.song.id : undefined}
                                            onSelect={(song) => {
                                                setIsPlaying(false);
                                                setChosenSong({ source: 'library', song });
                                            }}
                                        />
                                    }
                                />
                            )}
                        </motion.div>
                    )}

                    {/* Practice 3 lives in its own file, the way Master song structure
                        does. Composing verses below is the one still inlined here, and
                        it is the reason this component is as long as it is. */}
                    {openedPractice === 'Melody variations' && (
                        <MelodyVariation key="melody-variations" onBack={() => setOpenedPractice(null)} />
                    )}

                    {openedPractice === 'Composing verses' && showVerseDemo && (
                        <VerseDemo
                            onDone={() => setShowVerseDemo(false)}
                            onNeverAgain={() => closeDemo('mep-verse-demo-seen', setShowVerseDemo)(true)}
                        />
                    )}

                    {openedPractice === 'Composing verses' && (
                        <motion.div
                            key="composing-verses"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="w-full"
                        >
                            {/*
                             * Same shape as Master song structure: one line saying what
                             * to do, the work below it on translucent cards, and the way
                             * forward at the bottom. That instruction is the only copy —
                             * the eyebrow and the paragraph under each heading were
                             * restating what the controls already show.
                             */}
                            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
                                <div className="flex items-center justify-center gap-3 min-w-0 select-none">
                                    <p className={`${ASK_SIZE} font-sans font-semibold text-stone-700 truncate`}>
                                        {STEP_ASKS[currentStep]}
                                    </p>
                                    {selectedTheme && currentStep > 1 && (
                                        <span
                                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                                            className="shrink-0 rounded-full px-3 py-1 text-xs font-sans"
                                        >
                                            {selectedTheme}
                                        </span>
                                    )}
                                </div>

                                {/* Step 1 — pick a theme */}
                                {currentStep === 1 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                                        {THEMES.map(theme => (
                                            <button
                                                key={theme}
                                                onClick={() => { setSelectedTheme(theme); setCurrentStep(2); }}
                                                // A theme is one word, so it takes the word size
                                                // like every other single-word card. The padding
                                                // and tight leading keep the longer names ("Urban
                                                // life", "Digital soul") on one line in the narrow
                                                // two-column grid.
                                                className={`verse-card h-24 rounded-[20px] flex items-center justify-center px-4 text-center leading-tight ${WORD_SIZE} font-sans text-stone-700`}
                                            >
                                                {theme}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Steps 2 and 3 — five words, each on its own card the size of
                                    a theme card, reading down like the verse lines they will
                                    become. The count sits outside the field: it numbers the row,
                                    it is not something anyone types. No placeholder either — the
                                    instruction above already said what goes here, and five
                                    repetitions of "Enter noun..." only got in the way. */}
                                {(currentStep === 2 || currentStep === 3) && (
                                    <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <span className="w-5 shrink-0 text-right text-sm font-sans tabular-nums text-stone-400 select-none">
                                                    {i + 1}
                                                </span>
                                                <input
                                                    ref={el => { fieldRefs.current[i] = el; }}
                                                    type="text"
                                                    aria-label={currentStep === 2 ? t('practice.enter_noun') : t('practice.enter_verb')}
                                                    value={currentStep === 2 ? nouns[i] : verbs[i]}
                                                    onChange={(e) => handleWordChange(currentStep === 2 ? 'noun' : 'verb', i, e.target.value)}
                                                    onKeyDown={nextOnEnter}
                                                    style={{ height: ROW_H }}
                                                    className={`verse-card verse-input is-static ${currentStep === 3 ? 'is-verb' : ''} flex-1 min-w-0 rounded-[20px] px-6 md:px-8 border-none outline-none font-serif ${WORD_SIZE} text-stone-900`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Step 4 — link them up */}
                                {currentStep === 4 && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="relative flex justify-between items-start gap-10 md:gap-32 px-2 md:px-16">
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
                                                {connections.map((conn, idx) => (
                                                    <line
                                                        key={idx}
                                                        x1="30%"
                                                        y1={`${rowCentrePct(conn.n)}%`}
                                                        x2="70%"
                                                        y2={`${rowCentrePct(conn.v)}%`}
                                                        stroke="#1C1917"
                                                        strokeWidth="1.4"
                                                        strokeOpacity="0.45"
                                                    />
                                                ))}
                                            </svg>

                                            {NOUN_VERB_SIDES.map(side => {
                                                const words = side === 'n' ? nouns : verbs;
                                                return (
                                                    <div key={side} className="flex flex-col gap-3 w-1/2 max-w-[320px] z-10">
                                                        {words.map((word, i) => {
                                                            const linked = connections.some(c => (side === 'n' ? c.n : c.v) === i);
                                                            const armed = side === 'n' && pendingNounIndex === i;
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        const existing = connections.find(c => (side === 'n' ? c.n : c.v) === i);
                                                                        if (existing) {
                                                                            setConnections(connections.filter(c => c !== existing));
                                                                            return;
                                                                        }
                                                                        if (side === 'n') {
                                                                            setPendingNounIndex(armed ? null : i);
                                                                        } else if (pendingNounIndex !== null) {
                                                                            setConnections([...connections, { n: pendingNounIndex, v: i }]);
                                                                            setPendingNounIndex(null);
                                                                        }
                                                                    }}
                                                                    style={{ height: ROW_H }}
                                                                    className={`verse-card w-full px-6 rounded-[20px] flex items-center font-serif ${WORD_SIZE} text-stone-800 truncate
                                                                        ${side === 'v' ? 'is-verb' : ''} ${armed ? 'is-armed' : ''} ${linked ? 'is-linked' : ''}`}
                                                                >
                                                                    {word}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* No Reset. Clicking a linked card already breaks that
                                            one pair, so the only thing a Reset offered was
                                            throwing away four good links to redo the fifth. */}
                                    </div>
                                )}

                                {/* Step 5 — write the lines. Same row as steps 2 and 3: the count
                                    outside, one card per line. The pair that seeded the line rides
                                    inside the card as two chips, still clickable to drop the word
                                    into the field. */}
                                {currentStep === 5 && (
                                    <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                                        {connections.map((conn, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                <span className="w-5 shrink-0 text-right text-sm font-sans tabular-nums text-stone-400 select-none">
                                                    {idx + 1}
                                                </span>
                                                {/* The pair, outside the field. A fixed column from
                                                    sm up so every line's card starts at the same x —
                                                    sized to the words, the cards would come out
                                                    ragged. Stacked above the field on a phone. */}
                                                <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                                                    {[nouns[conn.n], verbs[conn.v]].map((word, w) => {
                                                        // Spent or not is read back off the line
                                                        // rather than remembered from the click, so
                                                        // deleting the word from the line brings its
                                                        // chip back rather than stranding it grey.
                                                        const used = (sentences[idx] || '')
                                                            .toLowerCase()
                                                            .includes(word.trim().toLowerCase());
                                                        return (
                                                            <button
                                                                key={w}
                                                                onClick={() => {
                                                                    const next = [...sentences];
                                                                    const current = (next[idx] || '').trim();
                                                                    next[idx] = current === '' ? word : `${current} ${word}`;
                                                                    setSentences(next);
                                                                }}
                                                                aria-pressed={used}
                                                                // neutral() carries the shape and
                                                                // hover but no colour of its own —
                                                                // exactly what a state-tinted token
                                                                // wants — and its sm padding matches
                                                                // primary's, so greying does not
                                                                // resize the chip. Losing the green
                                                                // depth is the point: spent, flat.
                                                                style={used ? { backgroundColor: TAG_BG } : undefined}
                                                                className={`${used ? `${btn.neutral('sm')} text-stone-400` : btn.primary('sm')} min-w-0 max-w-[50%] cursor-pointer`}
                                                            >
                                                                <span className="truncate">{word}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div
                                                    style={{ minHeight: ROW_H }}
                                                    className="verse-card is-static flex-1 min-w-0 rounded-[20px] px-6 md:px-8 py-4 flex items-center gap-4"
                                                >
                                                    <input
                                                        ref={el => { fieldRefs.current[idx] = el; }}
                                                        type="text"
                                                        aria-label={t('practice.sentence_placeholder')}
                                                        value={sentences[idx] || ''}
                                                        onChange={(e) => {
                                                            const next = [...sentences];
                                                            next[idx] = e.target.value;
                                                            setSentences(next);
                                                        }}
                                                        onKeyDown={nextOnEnter}
                                                        className={`flex-1 min-w-0 bg-transparent border-none outline-none font-serif ${LINE_SIZE} text-stone-900`}
                                                    />
                                                    {(sentences[idx] || '').trim() !== '' && (
                                                        <Check size={18} className="shrink-0 text-stone-700 stroke-[2.5]" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Step 6 — the verse */}
                                {currentStep === 6 && (
                                    <div className="verse-card is-static rounded-[20px] px-6 md:px-10 py-8 flex flex-col gap-4 animate-in fade-in duration-300">
                                        {verseLines.map((sentence, i) => (
                                            <p key={i} className={`font-serif ${LINE_SIZE} leading-relaxed text-stone-800`}>
                                                {sentence}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {currentStep === 6 ? (
                                    /* The last step has nowhere further to go, so the six dots
                                       come off — they were counting toward a step that has now
                                       arrived. What is left is one centred cluster: the way back
                                       on the left, the two ways out on the right, all three the
                                       same height and cut from the same size. */
                                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(5)}
                                            aria-label={t('practice.previous_step')}
                                            title={t('practice.previous_step')}
                                            className={`${btn.icon('bare')} ${ACTION_H} w-14 shrink-0 cursor-pointer`}
                                        >
                                            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                                        </button>

                                        {/* Going round again is the quiet option — the verse only
                                            survives the practice if it leaves it. An outlined
                                            circle rather than a filled one, so it does not read
                                            as a second Back sitting next to the first. */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCurrentStep(1);
                                                setNouns(Array(5).fill(''));
                                                setVerbs(Array(5).fill(''));
                                                setConnections([]);
                                                setSentences(Array(5).fill(''));
                                                setSelectedTheme(null);
                                                setSendState('idle');
                                            }}
                                            aria-label={t('practice.start_new_practice')}
                                            title={t('practice.start_new_practice')}
                                            className={`${btn.secondary('bare')} ${ACTION_H} w-14 shrink-0 cursor-pointer`}
                                        >
                                            <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                                        </button>

                                        {/* relative: the error sits under the button rather than
                                            growing the row and shifting everything beside it, and
                                            the burst needs a positioned parent to escape from. */}
                                        <div className="relative flex flex-col items-start">
                                            {/*
                                              * Reaching the verse is the one moment in this
                                              * practice worth marking. It ends on opacity 0 with
                                              * `forwards`, so it plays once on mount and needs no
                                              * timer to take it away; leaving step 6 unmounts it
                                              * and coming back plays it again.
                                              *
                                              * `isolate` is load-bearing. Confetti's pieces sit at
                                              * -z-10 to burst from behind whatever they mark, and
                                              * without a stacking context of their own that puts
                                              * them behind the beige panel as well — animating
                                              * perfectly, visible to nobody. The span keeps them
                                              * in, and z-20 lifts the whole burst over the button
                                              * rather than out from behind it.
                                              */}
                                            <span className="pointer-events-none absolute inset-0 isolate z-20">
                                                <Confetti colors={BURST_ON_GREEN} />
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleSendToCanvas}
                                                disabled={sendState === 'sending' || verseLines.length === 0}
                                                className={`${btn.primary('bare')} ${ACTION_SIZE} whitespace-nowrap cursor-pointer`}
                                            >
                                                {/* No icon. The spinner is not decoration — while
                                                    the canvas is being written it is the only sign
                                                    the press was heard. */}
                                                {sendState === 'sending' && (
                                                    <Loader2 className="w-5 h-5 stroke-[2.5] animate-spin" />
                                                )}
                                                {t('practice.send_to_canvas')}
                                            </button>
                                            {sendState === 'failed' && (
                                                <span
                                                    role="alert"
                                                    style={{ color: WRONG_TEXT }}
                                                    className="absolute top-full left-1 mt-2 whitespace-nowrap text-xs font-sans"
                                                >
                                                    {t('practice.send_to_canvas_failed')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Stepping through: back, the step dots, and Next.

                                       From md the flanks take equal halves, which puts the DOTS on
                                       the true centre line. On a phone that reads as lopsided:
                                       Next is roughly three times the width of the back circle, so
                                       centring the dots pushes the group against the right edge and
                                       leaves a gap on the left. Below md the flanks collapse and
                                       the cluster as a whole centres instead. */
                                    <div className="flex items-center justify-center gap-6">
                                        <div className="flex-none md:flex-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                                                disabled={currentStep === 1}
                                                aria-label={t('practice.previous_step')}
                                                title={t('practice.previous_step')}
                                                className={`${btn.icon('bare')} ${ACTION_H} w-14 shrink-0 cursor-pointer disabled:opacity-30`}
                                            >
                                                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                                            </button>
                                        </div>

                                        <div
                                            className="flex items-center gap-1.5 shrink-0"
                                            aria-label={`${t('practice.step')} ${currentStep} ${t('practice.of')} 6`}
                                        >
                                            {[1, 2, 3, 4, 5, 6].map(n => (
                                                <span
                                                    key={n}
                                                    className="w-1.5 h-1.5 rounded-full transition-colors"
                                                    style={{ backgroundColor: n <= currentStep ? '#1C1917' : TAG_BG }}
                                                />
                                            ))}
                                        </div>

                                        <div className="flex-none md:flex-1 flex justify-start">
                                            <button
                                                // Never disabled. Pressing it early shakes it and
                                                // says what is missing — the same information a
                                                // grey button withholds, given when it was asked for.
                                                key={shakeKey}
                                                type="button"
                                                onClick={goNext}
                                                className={`${btn.primary('bare')} ${ACTION_SIZE} ${shakeClass} cursor-pointer`}
                                            >
                                                {t('common.next')}
                                                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <NudgeMessage count={nudgeCount}>
                                    {STEP_NUDGES[currentStep]}
                                </NudgeMessage>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

            </div>

            {/* Practice intro clip, played like the onboarding demo video */}
            {videoPractice?.videoUrl && (
                <PracticeVideoModal
                    src={videoPractice.videoUrl}
                    poster={videoPractice.posterUrl}
                    title={t(videoPractice.nameKey)}
                    onClose={() => setVideoPractice(null)}
                />
            )}

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

            `}</style>
        </div>
    );
}
