"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import PracticeCard from './PracticeCard';
import PracticeVideoModal from './PracticeVideoModal';
// SongChooser itself is retired — Start lands straight in the exercise — but its
// ChosenSong shape still names what is being practised, uploads included.
import { type ChosenSong } from './SongChooser';
import SongPill from './SongPill';
import { PRACTICE_SONGS } from '../data/practiceSongs';
import StructurePlayer from './StructurePlayer';
import { PRACTICE_NAMES, getPractice, type PracticeDefinition } from '../data/practices';
import { ChevronLeft, ChevronRight, ChevronDown, Check, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

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
            const first = PRACTICE_SONGS.find(s => s.available);
            return first ? { source: 'library' as const, song: first } : null;
        })();

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
        <div className="w-full">

            {/* Full-width content column */}
            <div className="w-full bg-transparent pb-6 relative overflow-visible">

                {/* Top Practice Selector Header — swapped for the back row once a practice is open */}
                <div className={`items-center justify-center gap-4 mb-6 relative z-30 select-none ${openedPractice ? 'hidden' : 'flex'}`}>
                    {/* Previous Button */}
                    <button 
                        onClick={handlePrevPractice}
                        className="w-9 h-9 rounded-full border border-stone-200/70 bg-white/50 opacity-60 hover:opacity-100 active:scale-95 transition-all flex items-center justify-center text-stone-500 hover:text-stone-900"
                        aria-label={t('practice.previous_practice')}
                    >
                        <ChevronLeft size={18} className="stroke-[2.2]" />
                    </button>
 
                    {/* Active Title + Dropdown Selector */}
                    <div ref={dropdownRef} className="relative">
                        {/* Fixed width, sized for the longest practice title, so the
                            arrows either side never move when the title changes. */}
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center justify-center gap-2.5 w-[min(76vw,430px)] bg-white hover:bg-stone-50 border border-stone-200/80 text-stone-900 font-serif text-xl md:text-2xl font-normal tracking-wide py-2.5 px-6 rounded-full transition-colors"
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
                        className="w-9 h-9 rounded-full border border-stone-200/70 bg-white/50 opacity-60 hover:opacity-100 active:scale-95 transition-all flex items-center justify-center text-stone-500 hover:text-stone-900"
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

                        <h2 className="font-serif text-base md:text-lg font-normal tracking-wide text-stone-900 truncate">
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
                            className="w-full flex flex-col items-center"
                        >
                            {/* Centered Step Navigation Bar */}
                            <div className="flex items-center justify-center gap-4 mb-10 select-none">
                                <button 
                                    disabled={currentStep === 1}
                                    onClick={() => setCurrentStep(prev => prev - 1)}
                                    className="w-8 h-8 rounded-full border border-stone-200 bg-white hover:bg-stone-50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center text-stone-500"
                                    aria-label={t('practice.previous_step')}
                                >
                                    <ChevronLeft size={16} className="stroke-[2.2]" />
                                </button>
                                <span className="text-sm font-sans text-stone-500">
                                    {t('practice.step')} {currentStep} {t('practice.of')} 6
                                </span>
                                <button 
                                    disabled={currentStep === 6 || !isStepComplete(currentStep)}
                                    onClick={() => setCurrentStep(prev => prev + 1)}
                                    className="w-8 h-8 rounded-full border border-stone-200 bg-white hover:bg-stone-50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center text-stone-500"
                                    aria-label={t('practice.next_step')}
                                >
                                    <ChevronRight size={16} className="stroke-[2.2]" />
                                </button>
                            </div>

                            {/* Step 1: Theme Selector */}
                            {currentStep === 1 && (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                                    <div className="text-center mb-10 space-y-2 select-none">
                                        <p className="text-stone-400 text-xs font-sans">{t('practice.step_1_header')}</p>
                                        <h2 className="text-3xl font-serif text-stone-900 font-normal">{t('practice.choose_theme')}</h2>
                                        <p className="text-stone-500 text-sm font-sans">{t('practice.select_theme_desc')}</p>
                                    </div>
                                    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                        {['Nature', 'Sports', 'Urban Life', 'Solitude', 'Memory', 'Ambition', 'Conflict', 'Harmony', 'Velocity', 'Starlight', 'The Deep', 'Whispers', 'Machines', 'Ritual', 'Digital Soul', 'The Harvest'].map((theme, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedTheme(theme);
                                                    setCurrentStep(2);
                                                }}
                                                className="group aspect-video bg-white border border-stone-200 hover:border-stone-400 transition-colors duration-200 rounded-[16px] flex items-center justify-center"
                                            >
                                                <span className="text-sm font-sans text-stone-600 group-hover:text-stone-900 transition-colors">
                                                    {theme}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 2 & 3: Drafting Nouns/Verbs */}
                            {(currentStep === 2 || currentStep === 3) && (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                                    <div className="text-center mb-10 space-y-2 select-none">
                                        <p className="text-stone-400 text-xs font-sans">
                                            {currentStep === 2 ? t('practice.step_2_header') : t('practice.step_3_header')}
                                        </p>
                                        <h2 className="text-3xl font-serif text-stone-900 font-normal">
                                            {currentStep === 2 ? t('practice.type_5_nouns') : t('practice.type_5_verbs')}
                                        </h2>
                                        <p className="text-stone-500 text-sm font-sans">
                                            Focus on sensory details related to {selectedTheme}
                                        </p>
                                    </div>

                                    <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
                                        {/* Sidebar Info card */}
                                        <div className="flex flex-col gap-4 w-full lg:w-60 shrink-0">
                                            <div className="p-5 bg-white border border-stone-200 rounded-[16px]">
                                                <span className="text-xs font-sans text-stone-400 block mb-1">{t('practice.theme')}</span>
                                                <span className="text-stone-800 font-serif text-lg font-normal">{selectedTheme}</span>
                                            </div>

                                            {currentStep === 3 && (
                                                <div className="p-5 bg-white border border-stone-200 rounded-[16px]">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-xs font-sans text-stone-400">{t('practice.nouns')}</span>
                                                        <button 
                                                            onClick={() => setCurrentStep(2)} 
                                                            className="text-xs font-sans text-stone-500 hover:text-stone-900 underline underline-offset-2 transition-colors"
                                                        >
                                                            {t('practice.edit')}
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {nouns.filter(n => n.trim() !== '').map((n, i) => (
                                                            <span 
                                                                key={i} 
                                                                className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-[8px] text-xs font-sans"
                                                            >
                                                                {n}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Input Panel */}
                                        <div className="flex-grow w-full bg-transparent overflow-hidden">
                                            <div className="p-8 md:p-10 space-y-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <div key={i} className="group relative">
                                                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[9px] text-stone-400 font-mono">
                                                                {(i + 1).toString().padStart(2, '0')}
                                                            </div>
                                                            <div className="flex items-center gap-4 border-b border-stone-300/60 group-focus-within:border-stone-800 transition-all duration-300 py-2.5">
                                                                <input
                                                                    type="text"
                                                                    placeholder={currentStep === 2 ? t('practice.enter_noun') : t('practice.enter_verb')}
                                                                    value={currentStep === 2 ? nouns[i] : verbs[i]}
                                                                    onChange={(e) => handleWordChange(currentStep === 2 ? 'noun' : 'verb', i, e.target.value)}
                                                                    className="bg-transparent border-none outline-none w-full font-serif text-stone-900 placeholder:text-stone-400 text-base"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                disabled={!isStepComplete(currentStep)}
                                                onClick={() => setCurrentStep(currentStep === 2 ? 3 : 4)}
                                                className={`
                                                    w-full py-4 rounded-[14px] flex items-center justify-center gap-3 group transition-colors duration-200
                                                    ${isStepComplete(currentStep)
                                                        ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 active:scale-[0.99]'
                                                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'}
                                                `}
                                            >
                                                <span className="text-sm font-sans font-medium">
                                                    {isStepComplete(currentStep) 
                                                        ? t('practice.next_movement') 
                                                        : `${t('practice.fill_more_prefix')} ${5 - (currentStep === 2 ? nouns : verbs).filter(x => x.trim() !== '').length} ${t('practice.fill_more_suffix')}`}
                                                </span>
                                                {isStepComplete(currentStep) && (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform duration-300">
                                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Link Nouns & Verbs */}
                            {currentStep === 4 && (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                                    <div className="w-full bg-transparent overflow-hidden relative">
                                        <div className="p-8 md:p-12 relative">
                                            <div className="text-center mb-12 space-y-2">
                                                <p className="text-stone-400 text-xs font-sans">{t('practice.step_4_header')}</p>
                                                <h2 className="text-3xl font-serif text-stone-900 font-normal">{t('practice.link_nouns_verbs')}</h2>
                                                <p className="text-stone-500 text-sm font-sans">{t('practice.link_desc')}</p>
                                            </div>

                                            <div className="flex justify-between items-start gap-12 md:gap-32 relative h-[480px] px-4 md:px-24 pt-10 pb-10 select-none">
                                                {/* SVG Connections Canvas */}
                                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                                    {connections.map((conn, idx) => {
                                                        const isActive = idx === connections.length - 1;
                                                        return (
                                                            <line
                                                                key={idx}
                                                                x1="32%"
                                                                y1={`${(conn.n * 15.83) + 15}%`}
                                                                x2="68%"
                                                                y2={`${(conn.v * 15.83) + 15}%`}
                                                                stroke="#1C1917"
                                                                strokeWidth={isActive ? "1.8" : "1.2"}
                                                                strokeOpacity={isActive ? "0.7" : "0.3"}
                                                                className="animate-in fade-in duration-500"
                                                            />
                                                        );
                                                    })}
                                                </svg>

                                                {/* Nouns Column (Left) */}
                                                <div className="flex flex-col gap-3 w-1/3 max-w-[220px] z-10">
                                                    {nouns.map((n, i) => {
                                                        const isConnected = connections.some(c => c.n === i);
                                                        const isSelected = pendingNounIndex === i;
                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    const existingConn = connections.find(c => c.n === i);
                                                                    if (existingConn) {
                                                                        setConnections(connections.filter(c => c.n !== i));
                                                                        return;
                                                                    }
                                                                    setPendingNounIndex(isSelected ? null : i);
                                                                }}
                                                                className={`
                                                                    group relative h-16 w-full px-4 md:px-6 transition-colors duration-200 rounded-[14px] flex items-center border
                                                                    ${isConnected
                                                                        ? 'bg-white border-stone-400 text-stone-900'
                                                                        : isSelected
                                                                            ? 'bg-stone-900 border-stone-900 text-[#FAF9F5]'
                                                                            : 'bg-white border-stone-200 hover:border-stone-400 text-stone-700'}
                                                                `}
                                                            >
                                                                <div className="flex items-center justify-between w-full pointer-events-none text-xs md:text-sm">
                                                                    <span className={`font-serif tracking-wide truncate ${isSelected ? 'text-[#FAF9F5]' : 'text-stone-800'}`}>{n}</span>
                                                                    <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-200 shrink-0 ml-2
                                                                        ${isConnected
                                                                            ? 'bg-stone-900 border-stone-900'
                                                                            : isSelected
                                                                                ? 'bg-white border-white scale-125'
                                                                                : 'bg-transparent border-stone-300 group-hover:border-stone-500'}`}
                                                                    />
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Verbs Column (Right) */}
                                                <div className="flex flex-col gap-3 w-1/3 max-w-[220px] z-10">
                                                    {verbs.map((v, i) => {
                                                        const isConnected = connections.some(c => c.v === i);
                                                        const canConnect = pendingNounIndex !== null;
                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    const existingConn = connections.find(c => c.v === i);
                                                                    if (existingConn) {
                                                                        setConnections(connections.filter(c => c.v !== i));
                                                                        return;
                                                                    }
                                                                    if (pendingNounIndex !== null) {
                                                                        setConnections([...connections, { n: pendingNounIndex, v: i }]);
                                                                        setPendingNounIndex(null);
                                                                    }
                                                                }}
                                                                className={`
                                                                    group relative h-16 w-full px-4 md:px-6 transition-colors duration-200 rounded-[14px] flex items-center border
                                                                    ${isConnected
                                                                        ? 'bg-white border-stone-400 text-stone-900'
                                                                        : canConnect
                                                                            ? 'bg-stone-50 border-stone-400 hover:border-stone-600 text-stone-700'
                                                                            : 'bg-white border-stone-200 hover:border-stone-400 text-stone-700'}
                                                                `}
                                                            >
                                                                <div className="flex items-center gap-2 w-full justify-between pointer-events-none text-xs md:text-sm">
                                                                    <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-200 shrink-0 mr-2
                                                                         ${isConnected
                                                                            ? 'bg-stone-900 border-stone-900'
                                                                            : canConnect
                                                                                ? 'bg-transparent border-stone-600 group-hover:scale-125'
                                                                                : 'bg-transparent border-stone-300'}`}
                                                                    />
                                                                    <span className="font-serif tracking-wide truncate text-stone-800">{v}</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Status bar */}
                                        <div className="p-6 md:p-8 bg-white border border-stone-200 flex flex-col md:flex-row gap-4 justify-between items-center px-8 md:px-10 rounded-[16px]">
                                            <div className="flex flex-col text-center md:text-left">
                                                <span className="text-xs font-sans text-stone-400 mb-0.5">{t('practice.status')}</span>
                                                <span className="text-stone-800 text-sm font-medium">{connections.length} of 5 links made</span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={() => { setConnections([]); setPendingNounIndex(null); }}
                                                    className="text-sm font-sans text-stone-500 hover:text-stone-900 transition-colors"
                                                >
                                                    {t('common.reset')}
                                                </button>
                                                <button
                                                    disabled={connections.length < 5}
                                                    onClick={() => setCurrentStep(5)}
                                                    className={`
                                                        px-8 py-3 rounded-full text-sm font-sans font-medium transition-colors
                                                        ${connections.length >= 5
                                                            ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 active:scale-98'
                                                            : 'bg-stone-100 text-stone-400 cursor-not-allowed'}
                                                    `}
                                                >
                                                    {t('practice.apply_connections')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Complete the Sentences */}
                            {currentStep === 5 && (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                                    <div className="w-full max-w-4xl">
                                        <div className="text-center mb-10 space-y-2">
                                            <p className="text-stone-400 text-xs font-sans">{t('practice.step_5_header')}</p>
                                            <h2 className="text-3xl font-serif text-stone-900 font-normal">{t('practice.complete_sentences')}</h2>
                                            <p className="text-stone-500 text-sm font-sans">(don't overthink, just connect them naturally)</p>
                                        </div>

                                        {/* Example Box */}
                                        <div className="bg-white border border-stone-200 rounded-[16px] p-6 mb-8 flex items-center justify-center gap-6 select-none">
                                            <span className="text-xs font-sans text-stone-400">{t('practice.example')}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-serif text-lg md:text-xl text-stone-400 italic">{t('practice.example_love')}</span>
                                                <div className="bg-stone-100 px-3 py-1 rounded-[8px] flex items-center">
                                                    <span className="text-stone-900 font-serif text-sm font-medium">{t('practice.example_noun')}</span>
                                                </div>
                                                <div className="bg-stone-900 px-3 py-1 rounded-[8px] flex items-center">
                                                    <span className="text-[#FAF9F5] font-serif text-sm font-medium">{t('practice.example_verb')}</span>
                                                </div>
                                                <span className="font-serif text-lg md:text-xl text-stone-400 italic">{t('practice.example_winter')}</span>
                                            </div>
                                        </div>

                                        {/* Scrollable list */}
                                        <div className="flex flex-col gap-6 mb-12 max-h-[640px] overflow-y-auto pr-2 no-scrollbar">
                                            {connections.map((conn, idx) => (
                                                <div key={idx} className="bg-transparent rounded-[24px] p-8 md:p-10 flex flex-col items-center gap-6">
                                                    <div className="flex items-center gap-4 select-none">
                                                        <button
                                                            onClick={() => {
                                                                const newSentences = [...sentences];
                                                                const current = newSentences[idx] || '';
                                                                const word = nouns[conn.n];
                                                                newSentences[idx] = current.trim() === '' ? word : `${current.trim()} ${word}`;
                                                                setSentences(newSentences);
                                                            }}
                                                            className="bg-white border border-stone-200 text-stone-800 px-5 py-2.5 rounded-[12px] min-w-[110px] hover:border-stone-400 transition-colors"
                                                        >
                                                            <span className="text-stone-900 font-serif text-base">{nouns[conn.n]}</span>
                                                        </button>
                                                        <div className="w-6 h-px bg-stone-300" />
                                                        <button
                                                            onClick={() => {
                                                                const newSentences = [...sentences];
                                                                const current = newSentences[idx] || '';
                                                                const word = verbs[conn.v];
                                                                newSentences[idx] = current.trim() === '' ? word : `${current.trim()} ${word}`;
                                                                setSentences(newSentences);
                                                            }}
                                                            className="bg-stone-900 text-[#FAF9F5] px-5 py-2.5 rounded-[12px] min-w-[110px] hover:bg-stone-800 transition-colors"
                                                        >
                                                            <span className="text-[#FAF9F5] font-serif text-base">{verbs[conn.v]}</span>
                                                        </button>
                                                    </div>

                                                    <div className="w-full max-w-xl relative group">
                                                        <input
                                                            type="text"
                                                            value={sentences[idx] || ''}
                                                            onChange={(e) => {
                                                                const newSentences = [...sentences];
                                                                newSentences[idx] = e.target.value;
                                                                setSentences(newSentences);
                                                            }}
                                                            placeholder={t('practice.sentence_placeholder')}
                                                            className="w-full bg-transparent border-b border-stone-300 py-3.5 px-4 text-lg font-serif text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800 text-center"
                                                        />
                                                        <div className="absolute right-2 bottom-3">
                                                            {(sentences[idx] || '').trim() !== '' && <Check size={18} className="text-stone-800 stroke-[2.2]" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Bottom Status bar */}
                                        <div className="p-6 md:p-8 bg-white border border-stone-200 rounded-[16px] flex flex-col md:flex-row gap-4 justify-between items-center px-8 md:px-10">
                                            <div className="flex flex-col text-center md:text-left">
                                                <span className="text-xs font-sans text-stone-400 mb-0.5">{t('practice.status')}</span>
                                                <span className="text-stone-800 text-sm font-medium">
                                                    {sentences.filter(s => s && s.trim() !== '').length} of {connections.length} sentences written
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentStep(6)}
                                                disabled={sentences.filter(s => s && s.trim() !== '').length < Math.min(5, connections.length)}
                                                className={`px-8 py-3 rounded-full text-sm font-sans font-medium transition-colors
                                                    ${sentences.filter(s => s && s.trim() !== '').length >= Math.min(5, connections.length)
                                                        ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 active:scale-98'
                                                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'}`}
                                            >
                                                {t('practice.finalize_lyrics')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 6: Story Revelation */}
                            {currentStep === 6 && (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                                    <div className="w-full max-w-3xl">
                                        <div className="text-center mb-10 space-y-2">
                                            <p className="text-stone-400 text-xs font-sans">{t('practice.step_6_header')}</p>
                                            <h2 className="text-3xl font-serif text-stone-900 font-normal">{t('practice.story_ready')}</h2>
                                        </div>

                                        <div className="bg-transparent rounded-[28px] p-10 md:p-14 mb-10 relative overflow-hidden group">
                                            {/* Abstract background icon */}
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] select-none pointer-events-none">
                                                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
                                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                                                    <path d="M2 17L12 22L22 17" />
                                                    <path d="M2 12L12 17L22 12" />
                                                </svg>
                                            </div>

                                            <div className="space-y-8 relative z-10 max-h-[500px] overflow-y-auto pr-4 no-scrollbar">
                                                {sentences.filter(s => s && s.trim() !== '').map((sentence, sIdx) => {
                                                    const conn = connections[sIdx];
                                                    const noun = nouns[conn?.n] || '';
                                                    const verb = verbs[conn?.v] || '';

                                                    return (
                                                        <div key={sIdx} className="flex flex-wrap items-center justify-center gap-x-2 md:gap-x-3 gap-y-2 text-center">
                                                            {sentence.split(' ').map((word, wIdx) => {
                                                                const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
                                                                const isNoun = cleanWord === noun.toLowerCase();
                                                                const isVerb = cleanWord === verb.toLowerCase();

                                                                if (isNoun) {
                                                                    return (
                                                                        <div key={wIdx} className="bg-stone-100 px-3 py-1 rounded-[8px] inline-flex items-center select-none">
                                                                            <span className="text-stone-900 font-serif text-sm font-medium">{word}</span>
                                                                        </div>
                                                                    );
                                                                }
                                                                if (isVerb) {
                                                                    return (
                                                                        <div key={wIdx} className="bg-stone-900 px-3 py-1 rounded-[8px] inline-flex items-center select-none">
                                                                            <span className="text-[#FAF9F5] font-serif text-sm font-medium">{word}</span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return <span key={wIdx} className="font-serif text-xl md:text-2xl text-stone-600 italic leading-snug">{word}</span>;
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex justify-center items-center gap-8 mb-12">
                                            <button className="text-sm font-sans text-stone-500 hover:text-stone-900 transition-colors">{t('practice.share_community')}</button>
                                            <div className="w-[1px] h-3 bg-stone-200" />
                                            <button className="text-sm font-sans text-stone-500 hover:text-stone-900 transition-colors">{t('practice.save_draft')}</button>
                                        </div>

                                        <div className="flex justify-center mb-8">
                                            <button 
                                                onClick={() => {
                                                    setCurrentStep(1);
                                                    setNouns(Array(5).fill(''));
                                                    setVerbs(Array(5).fill(''));
                                                    setConnections([]);
                                                    setSentences(Array(5).fill(''));
                                                    setSelectedTheme(null);
                                                }} 
                                                className="px-10 py-3.5 bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 rounded-full text-sm font-sans font-medium active:scale-98 transition-colors"
                                            >
                                                {t('practice.start_new_practice')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
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
