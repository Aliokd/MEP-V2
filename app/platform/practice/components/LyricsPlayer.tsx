"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Song, Word, LyricSection } from '../data/songs';
import SongCard from './SongCard';

interface LyricsPlayerProps {
    song: Song;
    songIndex: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onBack: () => void;
}

export default function LyricsPlayer({ song, songIndex, isPlaying, onTogglePlay, onBack }: LyricsPlayerProps) {
    const { t } = useLanguage();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [duration, setDuration] = useState(0);
    const requestRef = useRef<number | undefined>(undefined);
    const updateProgressRef = useRef<(() => void) | null>(null);

    // Drag and Drop Exercise States
    const [shuffledSections, setShuffledSections] = useState<{ section: LyricSection; originalIdx: number }[]>([]);
    const [assignments, setAssignments] = useState<{ [key: number]: number | null }>({});
    const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);
    const [shakeSlot, setShakeSlot] = useState<number | null>(null);

    // Shuffle sections and reset assignments on song change
    useEffect(() => {
        const sectionsWithIdx = song.lyrics.map((section, idx) => ({ section, originalIdx: idx }));
        const shuffled = [...sectionsWithIdx].sort(() => Math.random() - 0.5);
        setShuffledSections(shuffled);
        setAssignments({});
        setSelectedBlockIdx(null);
    }, [song.id, song.lyrics]);

    // Track song completion when all slots are correctly matched
    useEffect(() => {
        if (!song || !song.lyrics || song.lyrics.length === 0) return;
        
        // Check if all slots have correct assignments
        const correctCount = song.lyrics.filter((_, idx) => assignments[idx] === idx).length;
        if (correctCount === song.lyrics.length) {
            const completedPractices = JSON.parse(localStorage.getItem('mep-completed-practices') || '[]');
            if (!completedPractices.includes(song.id)) {
                completedPractices.push(song.id);
                safeLocalStorageSetItem('mep-completed-practices', JSON.stringify(completedPractices));
                window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
            }
        }
    }, [assignments, song]);

    // Audio progress polling callback
    const updateProgress = useCallback(() => {
        if (audioRef.current && isPlaying) {
            setCurrentTime(audioRef.current.currentTime);
            requestRef.current = requestAnimationFrame(() => updateProgressRef.current?.());
        }
    }, [isPlaying]);

    useEffect(() => {
        updateProgressRef.current = updateProgress;
    }, [updateProgress]);

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, updateProgress]);

    // HTML5 Audio lifecycle management
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;

        const onEnded = () => {
            if (isPlaying) onTogglePlay();
        };
        const onCanPlay = () => {
            setIsLoaded(true);
            setLoadError(false);
            if (audio.duration) setDuration(audio.duration);
        };
        const onError = (e: Event) => {
            console.error("Audio failed to load:", song.audioUrl, e);
            if (!isLoaded && audio.networkState === 3) {
                audio.load();
            } else {
                setLoadError(true);
            }
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('error', onError);

        audio.src = song.audioUrl;
        audio.preload = "auto";
        audio.load();

        return () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            audio.pause();
            audio.src = "";
            audioRef.current = null;
        };
    }, [song.audioUrl, isLoaded, isPlaying, onTogglePlay]);

    // Play/Pause state synchronization
    useEffect(() => {
        if (audioRef.current && isLoaded) {
            if (isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Playback prevented:", error);
                        if (isPlaying) onTogglePlay();
                    });
                }
            } else {
                audioRef.current.pause();
                setCurrentTime(audioRef.current.currentTime);
            }
        }
    }, [isPlaying, isLoaded, onTogglePlay]);

    // Waveform bar heights generator
    const waveformBars = useMemo(() => {
        const barCount = 100;
        const result = [];
        let seed = 0;
        const hashString = song.id + song.title;
        for (let i = 0; i < hashString.length; i++) {
            seed += hashString.charCodeAt(i);
        }
        for (let i = 0; i < barCount; i++) {
            const val = Math.abs(Math.sin(seed + i * 0.14) * Math.cos(seed * 0.4 + i * 0.06));
            const height = Math.max(10, Math.round(15 + val * 65));
            result.push(height);
        }
        return result;
    }, [song.id, song.title]);

    // Seek player on waveform click
    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percentage * duration;
        
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleWordClick = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const isWordActive = (word: Word) => {
        return currentTime >= word.start && currentTime <= word.end;
    };

    const isWordPast = (word: Word) => {
        return currentTime > word.end;
    };

    // Generic label mapper based on design mockup labels
    const getSlotLabel = (title: string) => {
        const lower = title.toLowerCase();
        if (lower.includes('verse')) return 'Verse';
        if (lower.includes('pre-chorus') || lower.includes('bridge') || lower.includes('build')) return 'Bridge';
        if (lower.includes('chorus')) return 'Chorus';
        return title;
    };

    // Assign draggable blocks to target structure slots
    const handleAssign = (slotIdx: number, draggedIdx: number) => {
        if (assignments[slotIdx] === slotIdx) return;

        setAssignments(prev => ({ ...prev, [slotIdx]: draggedIdx }));
        setSelectedBlockIdx(null);
        
        if (slotIdx === draggedIdx) {
            // Correct match: dispatch songwriting-progress-updated event
            const currentProgress = parseInt(localStorage.getItem('songwriting-progress') || '35');
            const newProgress = Math.min(100, currentProgress + 15);
            safeLocalStorageSetItem('songwriting-progress', newProgress.toString());
            window.dispatchEvent(new Event('songwriting-progress-updated'));
        } else {
            // Shake slot border on incorrect match
            setShakeSlot(slotIdx);
            setTimeout(() => setShakeSlot(null), 350);
        }
    };

    // Remove mismatched selection from slot
    const handleRemove = (slotIdx: number) => {
        if (assignments[slotIdx] !== slotIdx) {
            setAssignments(prev => {
                const copy = { ...prev };
                delete copy[slotIdx];
                return copy;
            });
        }
    };

    // Render timing highlighted lyrics inside assigned slots
    const renderSlotLyrics = (section: LyricSection) => {
        return (
            <div className="space-y-4 py-2 px-6">
                {section.lines.map((line, lineIdx) => (
                    <div key={lineIdx} className="flex flex-wrap gap-x-1.5 gap-y-2 justify-center leading-relaxed">
                        {line.words.map((word, wordIdx) => {
                            const active = isWordActive(word);
                            const past = isWordPast(word);

                            return (
                                <button
                                    key={wordIdx}
                                    onClick={() => handleWordClick(word.start)}
                                    className={`
                                        font-serif text-lg md:text-xl transition-all duration-300 py-0.5 px-0.5 rounded-xs focus:outline-none
                                        ${active
                                            ? 'text-stone-900 font-bold scale-102 word-active z-10'
                                            : past
                                                ? 'text-stone-400 italic font-light'
                                                : 'text-stone-700 hover:text-stone-955 font-normal'
                                        }
                                    `}
                                >
                                    {word.text}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    // Render lyrics in an incorrect/failure state
    const renderSlotLyricsIncorrect = (section: LyricSection) => {
        return (
            <div className="space-y-3 py-2 px-6 opacity-80 text-center select-none">
                {section.lines.map((line, lineIdx) => (
                    <p key={lineIdx} className="font-serif italic text-amber-700/80 text-base md:text-lg">
                        {line.words.map(w => w.text).join(' ')}
                    </p>
                ))}
            </div>
        );
    };

    if (loadError) {
        return (
            <div className="w-full h-[250px] flex flex-col items-center justify-center border border-red-100 rounded-[24px] bg-red-50/10 px-6">
                <p className="text-red-700 font-sans font-semibold text-lg mb-2">{t('practice.audio_unavailable')}</p>
                <p className="text-stone-500 text-xs mb-6 text-center">{t('practice.localhost_warning')}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-stone-900 text-[#FAF9F5] hover:opacity-90 rounded-full text-xs uppercase tracking-widest transition-colors font-semibold shadow-sm"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-[250px] flex flex-col items-center justify-center border border-stone-200/50 rounded-[24px] bg-white/30">
                <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin mb-3" />
                <p className="text-stone-500 font-sans text-xs tracking-wider uppercase font-medium">{t('practice.tuning')}</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-10">
            
            {/* Header Detail Row: Back arrow, selected SongCard, and Waveform Player side-by-side */}
            <div className="w-full flex items-center gap-4 md:gap-6 max-w-4xl mx-auto select-none overflow-visible">
                {/* Back Arrow Button */}
                <button 
                    onClick={onBack}
                    className="w-10 h-10 rounded-full border border-stone-200 bg-white hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center text-stone-600 hover:text-stone-900 shadow-2xs shrink-0 cursor-pointer"
                    title="Back to Song List"
                >
                    <ArrowLeft size={18} className="stroke-[2.2]" />
                </button>

                {/* Selected Song Card */}
                <div className="shrink-0">
                    <SongCard
                        song={song}
                        index={songIndex}
                        isSelected={true}
                        isPlaying={isPlaying}
                        onClick={onTogglePlay}
                    />
                </div>

                {/* Waveform Player on the right */}
                <div className="flex-1 mt-6 bg-white border border-stone-200/50 rounded-[20px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex items-center gap-3.5 h-[90px]">
                    {/* Play/Pause Button */}
                    <button 
                        onClick={onTogglePlay}
                        className="w-10 h-10 shrink-0 rounded-full bg-stone-900 flex items-center justify-center text-[#FAF9F5] hover:bg-stone-850 active:scale-95 transition-all shadow-sm cursor-pointer"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#FAF9F5]">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 text-[#FAF9F5]">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    {/* Waveform Seekbar */}
                    <div 
                        onClick={handleWaveformClick}
                        className="flex-1 h-10 flex items-center justify-between gap-[1.5px] cursor-pointer select-none overflow-hidden relative px-1 group"
                    >
                        {waveformBars.map((height, idx) => {
                            const progressRatio = currentTime / (duration || 1);
                            const isBarActive = (idx / waveformBars.length) <= progressRatio;
                            
                            return (
                                <div 
                                    key={idx}
                                    className="flex-1 flex flex-col items-center justify-center h-full transition-all duration-300"
                                >
                                    {/* Upper Half: Thinner Lines */}
                                    <div 
                                        className={`w-[1.2px] rounded-t-full transition-colors duration-200 ${
                                            isBarActive ? 'bg-stone-900' : 'bg-stone-200 group-hover:bg-stone-300/80'
                                        }`}
                                        style={{ height: `${height / 2}%` }}
                                    />
                                    <div className="h-[0.5px] w-full" />
                                    {/* Lower Half: Thinner Lines */}
                                    <div 
                                        className={`w-[1.2px] rounded-b-full transition-colors duration-200 ${
                                            isBarActive ? 'bg-stone-900' : 'bg-stone-200 group-hover:bg-stone-300/80'
                                        }`}
                                        style={{ height: `${height / 2}%` }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Target Slots for Song Structure Drag & Drop */}
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 mt-4 select-none">
                {song.lyrics.map((section, idx) => {
                    const assignedIdx = assignments[idx];
                    const isCorrect = assignedIdx === idx;
                    const isIncorrect = assignedIdx !== undefined && assignedIdx !== null && assignedIdx !== idx;
                    const isAssigned = assignedIdx !== undefined && assignedIdx !== null;
                    const label = getSlotLabel(section.title);
                    const isShake = shakeSlot === idx;

                    return (
                        <div 
                            key={idx}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                const draggedIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                                handleAssign(idx, draggedIdx);
                            }}
                            onClick={() => {
                                if (isIncorrect) {
                                    handleRemove(idx);
                                } else if (selectedBlockIdx !== null) {
                                    handleAssign(idx, selectedBlockIdx);
                                }
                            }}
                            className={`
                                relative w-full border rounded-[16px] transition-all duration-300 py-8 min-h-[95px] flex items-center justify-center cursor-pointer
                                ${isCorrect 
                                    ? 'bg-[#EAF7E8]/25 border-[#86BE7F] shadow-sm' 
                                    : isIncorrect
                                        ? 'bg-[#FEF3C7]/15 border-[#F59E0B] shadow-sm'
                                        : 'bg-white/40 border-stone-200 border-dashed hover:border-stone-400 hover:bg-white/60'
                                }
                                ${isShake ? 'animate-shake' : ''}
                            `}
                        >
                            {/* Slot overlay card label sitting on top-left border */}
                            {isCorrect && (
                                <div className="absolute -top-3.5 left-6 bg-white border border-[#86BE7F] rounded-[4px] px-3.5 py-0.5 text-xs text-[#86BE7F] font-serif italic shadow-2xs flex items-center gap-1.5 font-bold">
                                    {label} <Check size={11} className="stroke-[3]" />
                                </div>
                            )}

                            {isIncorrect && (
                                <div className="absolute -top-3.5 left-6 bg-white border border-[#F59E0B] rounded-[4px] px-3.5 py-0.5 text-xs text-[#D97706] font-serif italic shadow-2xs flex items-center gap-1.5 font-bold">
                                    {label} <span className="text-[9px] font-sans font-bold uppercase tracking-wider ml-1">{t('practice.try_again')}</span>
                                </div>
                            )}

                            {!isAssigned && (
                                <div className="absolute -top-3.5 left-6 bg-white border border-stone-300 rounded-[4px] px-3.5 py-0.5 text-xs text-stone-500 font-serif italic shadow-2xs">
                                    {label}
                                </div>
                            )}

                            {/* Slot Lyrics Content */}
                            {isCorrect && renderSlotLyrics(song.lyrics[idx])}

                            {isIncorrect && renderSlotLyricsIncorrect(song.lyrics[assignedIdx as number])}

                            {!isAssigned && (
                                <span className="font-serif italic text-stone-400/80 text-lg md:text-xl tracking-wide">
                                    {label} + Drag and drop phrases
                                </span>
                            )}

                            {/* Reset Button for Mismatched Slots */}
                            {isIncorrect && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); // Avoid triggering parent slot click
                                        handleRemove(idx);
                                    }}
                                    className="absolute top-3.5 right-4 w-6 h-6 rounded-full bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-700 hover:text-amber-900 active:scale-90 transition-all font-sans text-[10px] font-bold shadow-2xs border border-amber-200/50"
                                    title="Clear Selection"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Draggable Lyric Blocks */}
            <div className="w-full max-w-4xl mx-auto border-t border-stone-200/50 pt-10 mt-6 flex flex-col gap-10">
                {shuffledSections.map(({ section, originalIdx }) => {
                    const isAssigned = Object.values(assignments).includes(originalIdx);
                    if (isAssigned) return null; // Hide correctly or incorrectly placed blocks from list

                    const isSelected = selectedBlockIdx === originalIdx;

                    return (
                        <div
                            key={originalIdx}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", originalIdx.toString());
                            }}
                            onClick={() => {
                                if (selectedBlockIdx === originalIdx) {
                                    setSelectedBlockIdx(null);
                                } else {
                                    setSelectedBlockIdx(originalIdx);
                                }
                            }}
                            className={`
                                p-6 rounded-[20px] border transition-all duration-300 text-center select-text cursor-grab active:cursor-grabbing
                                ${isSelected
                                    ? 'bg-[#EFF0E7]/60 border-stone-500 shadow-xs'
                                    : 'bg-white/30 border-stone-200/60 hover:bg-white hover:border-stone-400 hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:scale-[1.005]'
                                }
                            `}
                        >
                            {/* Draggable Lyric Text Paragraphs */}
                            <div className="space-y-4 max-w-3xl mx-auto">
                                {section.lines.map((line, lIdx) => (
                                    <p key={lIdx} className="font-serif italic text-stone-700/90 text-lg md:text-xl font-light leading-relaxed">
                                        {line.words.map(w => w.text).join(' ')}
                                    </p>
                                ))}
                            </div>
                            
                            {/* Help tooltip hint */}
                            <div className="text-[8px] uppercase tracking-widest text-stone-400 mt-4 font-semibold select-none">
                                {isSelected ? 'Click the correct target box above to place' : 'Drag this section or click to select'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Injected CSS keyframes for target Slot Shaking */}
            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.35s ease-in-out;
                }
            `}</style>
        </div>
    );
}