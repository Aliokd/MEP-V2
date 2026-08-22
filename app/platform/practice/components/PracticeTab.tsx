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
import { PRACTICE_NAMES, getPractice, type PracticeDefinition } from '../data/practices';
import { ChevronLeft, ChevronRight, ChevronDown, Check, ArrowLeft, ArrowRight, PenLine, Loader2 } from 'lucide-react';
import { SECTION_TEXT, TAG_BG, WRONG_TEXT } from '../data/sections';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createCanvasFromLines } from '@/lib/createCanvasFromLines';
import { motion, AnimatePresence } from 'framer-motion';

/** Starting points for Composing verses. */
const THEMES = [
    'Nature', 'Sports', 'Urban life', 'Solitude', 'Memory', 'Ambition', 'Conflict', 'Harmony',
    'Velocity', 'Starlight', 'The deep', 'Whispers', 'Machines', 'Ritual', 'Digital soul', 'The harvest',
] as const;

/** The two columns of the linking step, left to right. */
const NOUN_VERB_SIDES = ['n', 'v'] as const;

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
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [nouns, setNouns] = useState<string[]>(Array(5).fill(''));
    const [verbs, setVerbs] = useState<string[]>(Array(5).fill(''));
    const [connections, setConnections] = useState<{ n: number; v: number }[]>([]);
    const [pendingNounIndex, setPendingNounIndex] = useState<number | null>(null);
    const [sentences, setSentences] = useState<string[]>(Array(5).fill(''));
    // 'sending' outlives the click: the canvas route takes a moment to mount.
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');

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

    const isStepComplete = (step: number) => {
        if (step === 1) return selectedTheme !== null;
        if (step === 2) return nouns.every(n => n.trim() !== '');
        if (step === 3) return verbs.every(v => v.trim() !== '');
        if (step === 4) return connections.length === 5;
        if (step === 5) return sentences.filter(s => s && s.trim() !== '').length === connections.length;
        return true;
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
                <div className={`items-center justify-center gap-2 md:gap-4 mb-6 relative z-30 select-none ${openedPractice ? 'hidden' : 'flex'}`}>
                    {/* Previous Button */}
                    <button 
                        onClick={handlePrevPractice}
                        // Solid white, not bg-white/50 at opacity-60. Against the beige
                        // panel that half-transparent fill read as a faint smudge at the
                        // edge of the screen rather than a control; with the panel gone on
                        // a phone it had almost nothing to sit against at all.
                        className="w-10 h-10 md:w-9 md:h-9 shrink-0 rounded-full border border-stone-200 bg-white shadow-[0_1.5px_4px_rgba(0,0,0,0.06)] hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center text-stone-600 hover:text-stone-900"
                        aria-label={t('practice.previous_practice')}
                    >
                        <ChevronLeft size={18} className="stroke-[2.2]" />
                    </button>
 
                    {/* Active Title + Dropdown Selector */}
                    <div ref={dropdownRef} className="relative flex-1 min-w-0 md:flex-none">
                        {/* Fills whatever the two arrows leave on a phone, rather than
                            claiming a fixed 76vw — at that width the pill plus the two
                            40px arrows and their gaps came to more than the row, so the
                            arrows were pushed off both edges. Still one constant width,
                            so they don't move when the title changes; it is just derived
                            from the row now instead of guessed. Fixed width from md up. */}
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center justify-center gap-2.5 w-full md:w-[min(76vw,430px)] bg-white hover:bg-stone-50 border border-stone-200/80 text-stone-900 font-serif text-lg md:text-2xl font-normal tracking-wide py-2.5 px-4 md:px-6 rounded-full transition-colors"
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
                                                    className={`w-full text-left px-5 py-3 rounded-[12px] flex items-center justify-between gap-4 font-serif font-normal text-base sm:text-lg transition-colors
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
                        className="w-10 h-10 md:w-9 md:h-9 shrink-0 rounded-full border border-stone-200 bg-white shadow-[0_1.5px_4px_rgba(0,0,0,0.06)] hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center text-stone-600 hover:text-stone-900"
                        aria-label={t('practice.next_practice')}
                    >
                        <ChevronRight size={18} className="stroke-[2.2]" />
                    </button>
                </div>
 
                {/* Inside a practice the header selector gives way to this row: the way
                    back, and the practice you're in. */}
                {openedPractice && (
                    <div className="flex items-center gap-4 mb-8 select-none">
                        <button
                            onClick={() => setOpenedPractice(null)}
                            className="flex items-center gap-2 text-sm font-sans text-stone-500 hover:text-stone-900 transition-colors shrink-0"
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
                                <div className="flex items-center gap-3 min-w-0 select-none">
                                    <p className="text-sm font-sans font-medium text-stone-900 truncate">
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
                                                className="verse-card h-24 rounded-[20px] flex items-center justify-center text-sm font-sans text-stone-700"
                                            >
                                                {theme}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Steps 2 and 3 — five words, one on top of the other, reading
                                    down like the verse lines they will become, on a card as
                                    wide as every other card here. */}
                                {(currentStep === 2 || currentStep === 3) && (
                                    <div className="verse-card is-static rounded-[20px] px-6 md:px-8 py-6 flex flex-col gap-2 animate-in fade-in duration-300">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 border-b border-stone-300/50 focus-within:border-stone-800 transition-colors py-2.5"
                                            >
                                                <span className="text-[11px] font-sans tabular-nums text-stone-400 w-4 shrink-0">
                                                    {i + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    placeholder={currentStep === 2 ? t('practice.enter_noun') : t('practice.enter_verb')}
                                                    value={currentStep === 2 ? nouns[i] : verbs[i]}
                                                    onChange={(e) => handleWordChange(currentStep === 2 ? 'noun' : 'verb', i, e.target.value)}
                                                    className="bg-transparent border-none outline-none w-full font-serif text-lg text-stone-900 placeholder:text-stone-400"
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
                                                        y1={`${conn.n * 19.4 + 9.7}%`}
                                                        x2="70%"
                                                        y2={`${conn.v * 19.4 + 9.7}%`}
                                                        stroke="#1C1917"
                                                        strokeWidth="1.4"
                                                        strokeOpacity="0.45"
                                                    />
                                                ))}
                                            </svg>

                                            {NOUN_VERB_SIDES.map(side => {
                                                const words = side === 'n' ? nouns : verbs;
                                                return (
                                                    <div key={side} className="flex flex-col gap-3 w-1/2 max-w-[260px] z-10">
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
                                                                    className={`verse-card h-14 w-full px-5 rounded-[16px] flex items-center font-serif text-base text-stone-800 truncate
                                                                        ${armed ? 'is-armed' : ''} ${linked ? 'is-linked' : ''}`}
                                                                >
                                                                    {word}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {connections.length > 0 && (
                                            <button
                                                onClick={() => { setConnections([]); setPendingNounIndex(null); }}
                                                className="mt-5 mx-auto block text-xs font-sans text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                                            >
                                                {t('common.reset')}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Step 5 — write the lines */}
                                {currentStep === 5 && (
                                    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                                        {connections.map((conn, idx) => (
                                            <div
                                                key={idx}
                                                className="verse-card is-static rounded-[20px] px-6 md:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
                                            >
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {[nouns[conn.n], verbs[conn.v]].map((word, w) => (
                                                        <button
                                                            key={w}
                                                            onClick={() => {
                                                                const next = [...sentences];
                                                                const current = (next[idx] || '').trim();
                                                                next[idx] = current === '' ? word : `${current} ${word}`;
                                                                setSentences(next);
                                                            }}
                                                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                                                            className="rounded-full px-3.5 py-1 text-xs font-sans hover:brightness-95 transition-all cursor-pointer"
                                                        >
                                                            {word}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={sentences[idx] || ''}
                                                    onChange={(e) => {
                                                        const next = [...sentences];
                                                        next[idx] = e.target.value;
                                                        setSentences(next);
                                                    }}
                                                    placeholder={t('practice.sentence_placeholder')}
                                                    className="flex-1 min-w-0 bg-transparent border-b border-stone-300/60 focus:border-stone-800 outline-none py-1.5 font-serif text-lg text-stone-900 placeholder:text-stone-400 transition-colors"
                                                />
                                                {(sentences[idx] || '').trim() !== '' && (
                                                    <Check size={16} className="shrink-0 text-stone-700 stroke-[2.5]" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Step 6 — the verse */}
                                {currentStep === 6 && (
                                    <div className="verse-card is-static rounded-[20px] px-6 md:px-10 py-8 flex flex-col gap-4 animate-in fade-in duration-300">
                                        {verseLines.map((sentence, i) => (
                                            <p key={i} className="font-serif text-xl md:text-2xl leading-relaxed text-stone-800">
                                                {sentence}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {/* The way through, gathered in the middle: back, the six
                                    step dots, and Next as one centred group. The flanks get
                                    equal halves so the dots sit on the true centre line even
                                    though Next is wider than the back circle. */}
                                <div className="flex items-center gap-6">
                                    <div className="flex-1 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                                        disabled={currentStep === 1}
                                        aria-label={t('practice.previous_step')}
                                        title={t('practice.previous_step')}
                                        className="w-11 h-11 shrink-0 rounded-full bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                    >
                                        <ArrowLeft className="w-4 h-4 stroke-[2]" />
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

                                    <div className="flex-1 flex justify-start items-center gap-3">
                                    {currentStep === 6 ? (
                                        <>
                                            {/* Going round again is the quiet option now — the
                                                verse only survives the practice if it leaves it. */}
                                            <button
                                                // Without a key React reuses the black Next button
                                                // sitting in this slot and transitions it to white.
                                                key="start-new"
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
                                                className="whitespace-nowrap px-6 py-3.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 text-[15px] font-sans font-medium active:scale-[0.99] transition-colors cursor-pointer"
                                            >
                                                {t('practice.start_new_practice')}
                                            </button>
                                            {/* relative: the error sits under the button without
                                                growing the row and nudging the step dots. */}
                                            <div className="relative flex flex-col items-start">
                                                <button
                                                    type="button"
                                                    onClick={handleSendToCanvas}
                                                    disabled={sendState === 'sending' || verseLines.length === 0}
                                                    className="flex items-center gap-2.5 whitespace-nowrap pl-6 pr-7 py-3.5 rounded-full bg-stone-900 text-[#FAF9F5] text-[15px] font-sans font-medium hover:bg-stone-800 active:scale-[0.99] transition-colors disabled:bg-stone-200 disabled:text-stone-400 disabled:pointer-events-none cursor-pointer"
                                                >
                                                    {sendState === 'sending'
                                                        ? <Loader2 className="w-4 h-4 stroke-[2] animate-spin" />
                                                        : <PenLine className="w-4 h-4 stroke-[2]" />}
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
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(prev => prev + 1)}
                                            disabled={!isStepComplete(currentStep)}
                                            className="flex items-center gap-2.5 pl-7 pr-6 py-3.5 rounded-full bg-stone-900 text-[#FAF9F5] text-[15px] font-sans font-medium hover:bg-stone-800 active:scale-[0.99] transition-colors disabled:bg-stone-200 disabled:text-stone-400 disabled:pointer-events-none cursor-pointer"
                                        >
                                            {t('common.next')}
                                            <ArrowRight className="w-4 h-4 stroke-[2]" />
                                        </button>
                                    )}
                                    </div>
                                </div>
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

                /*
                 * Composing verses borrows the lyric card from Master song
                 * structure: a half-veil of white on the beige panel, no border,
                 * deepening a shade under the cursor. "is-static" marks the ones
                 * that are containers rather than choices.
                 */
                .verse-card {
                    background-color: rgba(255, 255, 255, 0.5);
                    transition: background-color 0.2s;
                }
                .verse-card:not(.is-static) {
                    cursor: pointer;
                }
                .verse-card:not(.is-static):hover {
                    background-color: #E7E6DF;
                }
                /* Picked, waiting for the verb that completes the pair */
                .verse-card.is-armed,
                .verse-card.is-armed:hover {
                    background-color: #DCDDD4;
                }
                /* Paired up — the same green a named section wears next door */
                .verse-card.is-linked,
                .verse-card.is-linked:hover {
                    background-color: rgba(134, 190, 127, 0.85);
                }
            `}</style>
        </div>
    );
}
