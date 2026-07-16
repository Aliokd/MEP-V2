"use client";

import { useState, useRef, useEffect } from 'react';
import { SAMPLE_SONGS } from '../data/songs';
import LyricsPlayer from './LyricsPlayer';
import SongCard from './SongCard';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function PracticeTab() {
    const { t } = useLanguage();

    const getTranslatedPracticeName = (name: string) => {
        switch(name) {
            case 'Master song structure': return t('practice.master_song_structure');
            case 'Composing verses': return t('practice.composing_verses');
            case 'Melody & harmony': return t('practice.melody_harmony');
            case 'Advanced structures': return t('practice.advanced_structures');
            case 'Free hand session': return t('practice.free_hand_session');
            default: return name;
        }
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

    const practices = [
        'Master song structure',
        'Composing verses',
        'Melody & harmony',
        'Advanced structures',
        'Free hand session'
    ];

    const [selectedPractice, setSelectedPractice] = useState('Master song structure');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedSongId, setSelectedSongId] = useState('song-1');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Composing Verses (Practice 2) State
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [nouns, setNouns] = useState<string[]>(Array(5).fill(''));
    const [verbs, setVerbs] = useState<string[]>(Array(5).fill(''));
    const [connections, setConnections] = useState<{ n: number; v: number }[]>([]);
    const [pendingNounIndex, setPendingNounIndex] = useState<number | null>(null);
    const [sentences, setSentences] = useState<string[]>(Array(5).fill(''));

    // Dynamic practice-specific metadata
    const practiceMetadata = {
        'Master song structure': { progress: 65, level: 'beginner', time: '25 min', score: 125 },
        'Composing verses': { progress: 30, level: 'intermediate', time: '18 min', score: 95 },
        'Melody & harmony': { progress: 10, level: 'intermediate', time: '40 min', score: 180 },
        'Advanced structures': { progress: 0, level: 'advanced', time: '0 min', score: 0 },
        'Free hand session': { progress: 0, level: 'all levels', time: '0 min', score: 0 }
    };

    const currentMeta = practiceMetadata[selectedPractice as keyof typeof practiceMetadata] || practiceMetadata['Master song structure'];
    const currentSong = SAMPLE_SONGS.find(s => s.id === selectedSongId) || SAMPLE_SONGS[0];

    // Reset player states when changing practice module
    useEffect(() => {
        setIsFocused(false);
        setIsPlaying(false);
    }, [selectedPractice]);

    // Handle cycling practices
    const handlePrevPractice = () => {
        const currentIndex = practices.indexOf(selectedPractice);
        const prevIndex = (currentIndex - 1 + practices.length) % practices.length;
        setSelectedPractice(practices[prevIndex]);
        setDropdownOpen(false);
    };

    const handleNextPractice = () => {
        const currentIndex = practices.indexOf(selectedPractice);
        const nextIndex = (currentIndex + 1) % practices.length;
        setSelectedPractice(practices[nextIndex]);
        setDropdownOpen(false);
    };

    const handleTogglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const handleSongSelect = (id: string) => {
        setSelectedSongId(id);
        setIsPlaying(true);
        setIsFocused(true);
    };

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

    const currentProgress = selectedPractice === 'Composing verses'
        ? Math.round((currentStep / 6) * 100)
        : currentMeta.progress;

    return (
        <div className="w-full flex justify-center py-2 px-1 md:px-4">
            
            {/* White Rounded Main Panel */}
            <div className="w-full max-w-5xl bg-transparent p-6 md:p-10 relative overflow-visible">
                
                {/* Top Practice Selector Header */}
                <div className="flex items-center justify-center gap-6 mb-8 relative z-30 select-none">
                    {/* Previous Button */}
                    <button 
                        onClick={handlePrevPractice}
                        className="w-10 h-10 rounded-full border border-stone-200 bg-white hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center text-stone-600 hover:text-stone-900 shadow-2xs"
                        aria-label="Previous Practice"
                    >
                        <ChevronLeft size={18} className="stroke-[2.2]" />
                    </button>
 
                    {/* Active Title + Dropdown Selector */}
                    <div ref={dropdownRef} className="relative">
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 text-stone-850 hover:text-stone-950 font-serif text-xl md:text-2xl font-light tracking-wide py-1 px-4 rounded-full hover:bg-stone-100/40 transition-colors"
                        >
                            <span>{getTranslatedPracticeName(selectedPractice)}</span>
                            <ChevronDown size={16} className={`stroke-[2.2] transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
 
                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {dropdownOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border border-stone-200/80 rounded-[20px] p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)] z-50 overflow-hidden"
                                >
                                    {practices.map((p) => {
                                        const isSelected = p === selectedPractice;
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => {
                                                    setSelectedPractice(p);
                                                    setDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 rounded-[12px] text-xs font-sans font-semibold tracking-wide flex items-center justify-between transition-colors
                                                    ${isSelected 
                                                        ? 'bg-stone-900 text-[#FAF9F5]' 
                                                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                                                    }
                                                `}
                                            >
                                                <span>{getTranslatedPracticeName(p)}</span>
                                                {isSelected && <Check size={14} className="stroke-[2.5]" />}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
 
                    {/* Next Button */}
                    <button 
                        onClick={handleNextPractice}
                        className="w-10 h-10 rounded-full border border-stone-200 bg-white hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center text-stone-600 hover:text-stone-900 shadow-2xs"
                        aria-label="Next Practice"
                    >
                        <ChevronRight size={18} className="stroke-[2.2]" />
                    </button>
                </div>
 
                {/* Metrics / Info Row Pill */}
                <div className="w-full bg-[#DCDDD4]/40 border border-stone-300/50 rounded-full px-6 md:px-10 py-4.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-4 gap-x-6 text-xs text-stone-600 font-sans mb-12 select-none">
                    
                    {/* Progress Segment */}
                    <div className="flex items-center gap-4 min-w-[200px] flex-1">
                        <span className="font-semibold text-stone-400">{t('practice.progress')}</span>
                        <div className="flex-1 h-2.5 bg-stone-200/70 rounded-full overflow-hidden relative">
                            <motion.div 
                                className="h-full bg-[#86BE7F] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${currentProgress}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                        <span className="font-bold text-stone-700 min-w-[24px] text-right font-mono">{currentProgress}%</span>
                    </div>
 
                    {/* Divider for desktop */}
                    <div className="hidden md:block w-[1px] h-4 bg-stone-200" />
 
                    {/* Your Score Segment */}
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-400">{t('practice.your_score')}</span>
                        <span className="font-bold text-stone-800 text-sm">{currentMeta.score}</span>
                    </div>
 
                    {/* Divider for desktop */}
                    <div className="hidden md:block w-[1px] h-4 bg-stone-200" />
 
                    {/* Level Segment */}
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-400">{t('practice.level')}</span>
                        <span className="font-bold text-stone-850 capitalize">{getTranslatedLevel(currentMeta.level)}</span>
                    </div>
 
                    {/* Divider for desktop */}
                    <div className="hidden md:block w-[1px] h-4 bg-stone-200" />
 
                    {/* Time Spent Segment */}
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-400">Time spent:</span>
                        <span className="font-bold text-stone-800">{currentMeta.time}</span>
                    </div>
                </div>
 
                <AnimatePresence mode="wait">
                    {selectedPractice === 'Master song structure' && (
                        !isFocused ? (
                            <motion.div
                                key="menu"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="w-full flex gap-4 overflow-x-auto no-scrollbar pb-8 pt-2 justify-start md:justify-center relative z-10 px-1"
                            >
                                {SAMPLE_SONGS.map((song, idx) => (
                                    <SongCard
                                        key={song.id}
                                        song={song}
                                        index={idx}
                                        isSelected={selectedSongId === song.id}
                                        isPlaying={selectedSongId === song.id && isPlaying}
                                        onClick={() => handleSongSelect(song.id)}
                                    />
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="detail"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="w-full"
                            >
                                <LyricsPlayer
                                    song={currentSong}
                                    songIndex={SAMPLE_SONGS.findIndex(s => s.id === selectedSongId)}
                                    isPlaying={isPlaying}
                                    onTogglePlay={handleTogglePlay}
                                    onBack={() => {
                                        setIsFocused(false);
                                        setIsPlaying(false);
                                    }}
                                />
                            </motion.div>
                        )
                    )}

                    {selectedPractice === 'Composing verses' && (
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
                                    className="w-8 h-8 rounded-full border border-stone-250 bg-white hover:bg-stone-50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center text-stone-600 shadow-3xs"
                                    aria-label="Previous Step"
                                >
                                    <ChevronLeft size={16} className="stroke-[2.2]" />
                                </button>
                                <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-stone-400 uppercase">
                                    {t('practice.step')} 0{currentStep} {t('practice.of')} 06
                                </span>
                                <button 
                                    disabled={currentStep === 6 || !isStepComplete(currentStep)}
                                    onClick={() => setCurrentStep(prev => prev + 1)}
                                    className="w-8 h-8 rounded-full border border-stone-250 bg-white hover:bg-stone-50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center text-stone-600 shadow-3xs"
                                    aria-label="Next Step"
                                >
                                    <ChevronRight size={16} className="stroke-[2.2]" />
                                </button>
                            </div>

                            {/* Step 1: Theme Selector */}
                            {currentStep === 1 && (
                                <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                                    <div className="text-center mb-10 space-y-2 select-none">
                                        <p className="text-stone-400 text-[10px] font-sans uppercase tracking-[0.3em]">{t('practice.step_1_header')}</p>
                                        <h2 className="text-3xl font-serif text-stone-900 italic font-light">{t('practice.choose_theme')}</h2>
                                        <p className="text-stone-550 text-[10px] font-sans uppercase tracking-widest">{t('practice.select_theme_desc')}</p>
                                    </div>
                                    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['Nature', 'Sports', 'Urban Life', 'Solitude', 'Memory', 'Ambition', 'Conflict', 'Harmony', 'Velocity', 'Starlight', 'The Deep', 'Whispers', 'Machines', 'Ritual', 'Digital Soul', 'The Harvest'].map((theme, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedTheme(theme);
                                                    setCurrentStep(2);
                                                }}
                                                className="group relative aspect-video bg-[#DCDDD4]/20 hover:bg-[#DCDDD4]/50 transition-all duration-300 rounded-[16px] flex items-center justify-center overflow-hidden"
                                            >
                                                <div className="absolute inset-x-0 bottom-0 h-0 group-hover:h-full bg-stone-100/50 transition-all duration-500 ease-out" />
                                                <span className="relative z-10 text-[11px] font-sans font-semibold uppercase tracking-[0.2em] text-stone-550 group-hover:text-stone-850 group-hover:scale-105 transition-all duration-300">
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
                                        <p className="text-stone-400 text-[10px] font-sans uppercase tracking-[0.3em]">
                                            {currentStep === 2 ? t('practice.step_2_header') : t('practice.step_3_header')}
                                        </p>
                                        <h2 className="text-3xl font-serif text-stone-900 italic font-light">
                                            {currentStep === 2 ? t('practice.type_5_nouns') : t('practice.type_5_verbs')}
                                        </h2>
                                        <p className="text-stone-550 text-[10px] font-sans uppercase tracking-widest">
                                            Focus on sensory details related to {selectedTheme}
                                        </p>
                                    </div>

                                    <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
                                        {/* Sidebar Info card */}
                                        <div className="flex flex-col gap-4 w-full lg:w-60 shrink-0">
                                            <div className="p-5 bg-[#DCDDD4]/25 rounded-[20px]">
                                                <span className="text-[10px] font-sans uppercase tracking-widest text-stone-400 block mb-1">{t('practice.theme')}</span>
                                                <span className="text-stone-800 font-serif italic text-lg font-light">{selectedTheme}</span>
                                            </div>

                                            {currentStep === 3 && (
                                                <div className="p-5 bg-[#DCDDD4]/25 rounded-[20px]">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-sans uppercase tracking-widest text-stone-400">{t('practice.nouns')}</span>
                                                        <button 
                                                            onClick={() => setCurrentStep(2)} 
                                                            className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-500 hover:text-stone-850 transition-colors"
                                                        >
                                                            {t('practice.edit')}
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {nouns.filter(n => n.trim() !== '').map((n, i) => (
                                                            <span 
                                                                key={i} 
                                                                className="px-2.5 py-1 bg-white border border-stone-200 text-stone-600 rounded-[8px] text-[10px] uppercase font-sans font-semibold tracking-wide shadow-3xs"
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
                                                                    className="bg-transparent border-none outline-none w-full font-serif text-stone-855 placeholder:text-stone-400 text-base"
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
                                                    w-full py-5.5 flex items-center justify-center gap-4 group transition-all duration-300 border-t border-stone-300/50
                                                    ${isStepComplete(currentStep)
                                                        ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 active:scale-[0.99]'
                                                        : 'bg-[#DCDDD4]/40 text-stone-500 cursor-not-allowed'}
                                                `}
                                            >
                                                <span className="text-xs font-bold uppercase tracking-[0.3em]">
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
                                                <p className="text-stone-400 text-[10px] font-sans uppercase tracking-[0.3em]">{t('practice.step_4_header')}</p>
                                                <h2 className="text-3xl font-serif text-stone-900 italic font-light">{t('practice.link_nouns_verbs')}</h2>
                                                <p className="text-stone-550 text-[10px] font-sans uppercase tracking-widest">{t('practice.link_desc')}</p>
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
                                                                stroke={isActive ? "#86BE7F" : "#9E9E94"}
                                                                strokeWidth={isActive ? "2.5" : "1.2"}
                                                                strokeOpacity={isActive ? "0.85" : "0.45"}
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
                                                                    group relative h-16 w-full px-4 md:px-6 transition-all duration-300 rounded-[14px] flex items-center border
                                                                    ${isConnected 
                                                                        ? 'bg-white border-stone-300 text-stone-850 font-semibold shadow-sm' 
                                                                        : isSelected 
                                                                            ? 'bg-stone-900 border-stone-900 text-[#FAF9F5] shadow-sm' 
                                                                            : 'bg-white border-stone-200/80 hover:border-stone-400 hover:text-stone-850 text-stone-750 shadow-2xs'}
                                                                `}
                                                            >
                                                                <div className="flex items-center justify-between w-full pointer-events-none text-xs md:text-sm">
                                                                    <span className={`font-serif tracking-wide truncate ${isConnected ? 'text-stone-800 font-medium' : isSelected ? 'text-[#FAF9F5]' : 'text-stone-700 group-hover:text-stone-850'}`}>{n}</span>
                                                                    <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-300 shrink-0 ml-2
                                                                        ${isConnected 
                                                                            ? 'bg-stone-850 border-stone-850' 
                                                                            : isSelected 
                                                                                ? 'bg-white border-white scale-125' 
                                                                                : 'bg-transparent border-stone-350 group-hover:border-stone-500'}`} 
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
                                                                    group relative h-16 w-full px-4 md:px-6 transition-all duration-300 rounded-[14px] flex items-center border
                                                                    ${isConnected 
                                                                        ? 'bg-white border-stone-300 text-stone-850 font-semibold shadow-sm' 
                                                                        : canConnect 
                                                                            ? 'bg-[#EAF7E8]/60 border-[#86BE7F]/50 hover:border-[#86BE7F] text-stone-750 shadow-3xs' 
                                                                            : 'bg-white border-stone-200/80 hover:border-stone-400 hover:text-stone-850 text-stone-750 shadow-2xs'}
                                                                `}
                                                            >
                                                                <div className="flex items-center gap-2 w-full justify-between pointer-events-none text-xs md:text-sm">
                                                                    <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-300 shrink-0 mr-2
                                                                         ${isConnected 
                                                                            ? 'bg-[#86BE7F] border-[#86BE7F]' 
                                                                            : canConnect 
                                                                                ? 'bg-transparent border-[#86BE7F] group-hover:scale-125' 
                                                                                : 'bg-transparent border-stone-350'}`} 
                                                                    />
                                                                    <span className={`font-serif tracking-wide truncate ${isConnected ? 'text-stone-800 font-medium' : 'text-stone-750 group-hover:text-stone-855'}`}>{v}</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Status bar */}
                                        <div className="p-6 md:p-8 bg-[#DCDDD4]/35 flex flex-col md:flex-row gap-4 justify-between items-center px-8 md:px-12 rounded-[24px]">
                                            <div className="flex flex-col text-center md:text-left">
                                                <span className="text-[10px] font-sans uppercase tracking-widest text-stone-400 mb-0.5">{t('practice.status')}</span>
                                                <span className="text-stone-855 font-bold text-xs tracking-wider">{connections.length}/5 Links Forged</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => { setConnections([]); setPendingNounIndex(null); }} 
                                                    className="px-6 py-3 rounded-full border border-stone-300/50 bg-[#DCDDD4]/25 text-[10px] font-sans font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 active:scale-98 transition-all"
                                                >
                                                    Reset
                                                </button>
                                                <button
                                                    disabled={connections.length < 5}
                                                    onClick={() => setCurrentStep(5)}
                                                    className={`
                                                        px-10 py-3 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.2em] transition-all
                                                        ${connections.length >= 5 
                                                            ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 active:scale-98 shadow-sm' 
                                                            : 'bg-[#DCDDD4]/40 text-stone-500 cursor-not-allowed'}
                                                    `}
                                                >
                                                    Apply Connections
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
                                            <p className="text-stone-400 text-[10px] font-sans uppercase tracking-[0.3em]">{t('practice.step_5_header')}</p>
                                            <h2 className="text-3xl font-serif text-stone-900 italic font-light">{t('practice.complete_sentences')}</h2>
                                            <p className="text-stone-550 text-[10px] font-sans uppercase tracking-widest">(don't overthink, just connect them naturally)</p>
                                        </div>

                                        {/* Example Box */}
                                        <div className="bg-[#DCDDD4]/40 rounded-[20px] p-6 mb-8 flex items-center justify-center gap-6 select-none">
                                            <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold text-stone-400">{t('practice.example')}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-serif text-lg md:text-xl text-stone-400 italic">{t('practice.example_love')}</span>
                                                <div className="bg-white border border-stone-250 px-3 py-1 rounded-[8px] flex items-center shadow-3xs">
                                                    <span className="text-stone-850 font-serif text-sm font-semibold">{t('practice.example_noun')}</span>
                                                </div>
                                                <div className="bg-stone-900 border border-stone-900 px-3 py-1 rounded-[8px] flex items-center">
                                                    <span className="text-[#FAF9F5] font-serif text-sm font-semibold">{t('practice.example_verb')}</span>
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
                                                            className="bg-white border border-stone-250 text-stone-800 px-5 py-2.5 rounded-[12px] min-w-[110px] hover:bg-stone-50 transition-colors shadow-2xs"
                                                        >
                                                            <span className="text-stone-850 font-serif text-base">{nouns[conn.n]}</span>
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
                                                            className="bg-stone-900 text-[#FAF9F5] px-5 py-2.5 rounded-[12px] min-w-[110px] hover:bg-stone-850 transition-colors"
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
                                                            placeholder="Type your sentence here..."
                                                            className="w-full bg-transparent border-b border-stone-300 py-3.5 px-4 text-lg font-serif text-stone-855 placeholder:text-stone-400 focus:outline-none focus:border-stone-800 text-center"
                                                        />
                                                        <div className="absolute right-2 bottom-3">
                                                            {(sentences[idx] || '').trim() !== '' && <Check size={18} className="text-[#86BE7F] stroke-[2.5]" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Bottom Status bar */}
                                        <div className="p-6 md:p-8 bg-[#DCDDD4]/35 rounded-[20px] flex flex-col md:flex-row gap-4 justify-between items-center px-8 md:px-12">
                                            <div className="flex flex-col text-center md:text-left">
                                                <span className="text-[10px] font-sans uppercase tracking-widest text-stone-400 mb-0.5">{t('practice.status')}</span>
                                                <span className="text-stone-850 font-bold text-xs tracking-wider">
                                                    {sentences.filter(s => s && s.trim() !== '').length} / {connections.length} Sentences Built
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentStep(6)}
                                                disabled={sentences.filter(s => s && s.trim() !== '').length < Math.min(5, connections.length)}
                                                className={`px-12 py-3 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.2em] transition-all
                                                    ${sentences.filter(s => s && s.trim() !== '').length >= Math.min(5, connections.length)
                                                        ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 active:scale-98 shadow-sm'
                                                        : 'bg-[#DCDDD4]/40 text-stone-500 cursor-not-allowed'}`}
                                            >
                                                Finalize Lyrics
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
                                            <p className="text-stone-400 text-[10px] font-sans uppercase tracking-[0.3em]">{t('practice.step_6_header')}</p>
                                            <h2 className="text-3xl font-serif text-stone-900 italic font-light">{t('practice.story_ready')}</h2>
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
                                                                        <div key={wIdx} className="bg-white border border-stone-250 px-3 py-1 rounded-[8px] inline-flex items-center select-none shadow-3xs">
                                                                            <span className="text-stone-850 font-serif text-sm font-semibold">{word}</span>
                                                                        </div>
                                                                    );
                                                                }
                                                                if (isVerb) {
                                                                    return (
                                                                        <div key={wIdx} className="bg-stone-900 border border-stone-900 px-3 py-1 rounded-[8px] inline-flex items-center select-none">
                                                                            <span className="text-[#FAF9F5] font-serif text-sm font-semibold">{word}</span>
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
                                            <button className="text-[10px] uppercase font-sans font-bold tracking-widest text-stone-400 hover:text-stone-855 transition-colors">{t('practice.share_community')}</button>
                                            <div className="w-[1px] h-3 bg-stone-200" />
                                            <button className="text-[10px] uppercase font-sans font-bold tracking-widest text-stone-400 hover:text-stone-855 transition-colors">{t('practice.save_draft')}</button>
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
                                                className="px-12 py-3.5 bg-stone-900 text-[#FAF9F5] hover:bg-stone-800 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.2em] hover:shadow-xs active:scale-98 transition-all"
                                            >
                                                End Practice 2
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {selectedPractice !== 'Master song structure' && selectedPractice !== 'Composing verses' && (
                        <motion.div
                            key="coming-soon"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="w-full flex items-center justify-center min-h-[400px] bg-[#DCDDD4]/20 rounded-[24px]"
                        >
                            <div className="text-center space-y-3">
                                <p className="text-stone-850 font-serif italic text-xl tracking-tight font-light">{getTranslatedPracticeName(selectedPractice)}</p>
                                <span className="inline-block bg-stone-200/70 border border-stone-300 text-stone-600 rounded-full px-3 py-1 text-[9px] font-sans font-bold uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

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
