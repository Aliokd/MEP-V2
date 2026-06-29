"use client";

import { useState, useRef, useEffect } from 'react';
import { SAMPLE_SONGS } from '../data/songs';
import LyricsPlayer from './LyricsPlayer';
import SongCard from './SongCard';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PracticeTab() {
    const practices = [
        'Master song structure',
        'Composing words',
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

    // Dynamic practice-specific metadata
    const practiceMetadata = {
        'Master song structure': { progress: 65, level: 'beginner', time: '25 min', score: 125 },
        'Composing words': { progress: 30, level: 'intermediate', time: '18 min', score: 95 },
        'Melody & harmony': { progress: 10, level: 'intermediate', time: '40 min', score: 180 },
        'Advanced structures': { progress: 0, level: 'advanced', time: '0 min', score: 0 },
        'Free hand session': { progress: 0, level: 'all levels', time: '0 min', score: 0 }
    };

    const currentMeta = practiceMetadata[selectedPractice as keyof typeof practiceMetadata] || practiceMetadata['Master song structure'];
    const currentSong = SAMPLE_SONGS.find(s => s.id === selectedSongId) || SAMPLE_SONGS[0];

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
        <div className="w-full flex justify-center py-2 px-1 md:px-4">
            
            {/* White Rounded Main Panel */}
            <div className="w-full max-w-5xl bg-[#FAF9F5] border border-stone-200/60 rounded-[32px] p-6 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.015)] relative overflow-visible">
                
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
                            <span>{selectedPractice}</span>
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
                                                <span>{p}</span>
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
                <div className="w-full bg-[#FAF9F5] border border-stone-200/70 rounded-full px-6 md:px-10 py-4.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-4 gap-x-6 text-xs text-stone-500 font-sans shadow-sm mb-12 select-none">
                    
                    {/* Progress Segment */}
                    <div className="flex items-center gap-4 min-w-[200px] flex-1">
                        <span className="font-semibold text-stone-400">Progress</span>
                        <div className="flex-1 h-2.5 bg-stone-200/70 rounded-full overflow-hidden relative">
                            <motion.div 
                                className="h-full bg-[#86BE7F] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${currentMeta.progress}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                        <span className="font-bold text-stone-700 min-w-[24px] text-right font-mono">{currentMeta.progress}%</span>
                    </div>

                    {/* Divider for desktop */}
                    <div className="hidden md:block w-[1px] h-4 bg-stone-200" />

                    {/* Your Score Segment */}
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-400">Your score</span>
                        <span className="font-bold text-stone-800 text-sm">{currentMeta.score}</span>
                    </div>

                    {/* Divider for desktop */}
                    <div className="hidden md:block w-[1px] h-4 bg-stone-200" />

                    {/* Level Segment */}
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-400">Level</span>
                        <span className="font-bold text-stone-850 capitalize">{currentMeta.level}</span>
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
                    {!isFocused ? (
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
