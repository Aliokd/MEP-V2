"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Song, Word } from '../data/songs';

interface LyricsPlayerProps {
    song: Song;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

export default function LyricsPlayer({ song, isPlaying, onTogglePlay }: LyricsPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [duration, setDuration] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const updateProgressRef = useRef<(() => void) | null>(null);

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
                setCurrentTime(audioRef.current.currentTime); // Sync once more on pause
            }
        }
    }, [isPlaying, isLoaded, onTogglePlay]);

    const roundedTime = Math.floor(currentTime);
    useEffect(() => {
        if (isPlaying) {
            const activeWordElement = document.querySelector('.word-active');
            if (activeWordElement) {
                activeWordElement.scrollIntoView({
                    behavior: 'auto', // Change to auto for instant repositioning during fast sync
                    block: 'center',
                });
            }
        }
    }, [roundedTime, isPlaying]); // Scroll line-by-line rather than word-by-word to avoid jitters

    const handleWordClick = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const isWordActive = (word: Word) => {
        return currentTime >= word.start && currentTime <= word.end;
    };

    const isWordPast = (word: Word) => {
        return currentTime > word.end;
    };

    if (loadError) {
        return (
            <div className="w-full h-[400px] flex flex-col items-center justify-center border border-red-500/20 rounded-xs bg-red-500/5">
                <p className="text-red-400 font-serif italic text-xl mb-4">Audio stream unavailable</p>
                <p className="text-white/40 text-xs mb-8">This can happen if the audio source is blocked or slow to respond.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs uppercase tracking-widest transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-[400px] flex flex-col items-center justify-center border border-white/5 rounded-xs bg-white/[0.01]">
                <div className="w-8 h-8 border-t-2 border-gold-500 rounded-full animate-spin mb-4" />
                <p className="text-white/20 font-serif italic">Tuning the frequency...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-12 pt-8">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full relative overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gold-500 transition-all duration-300"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
            </div>

            <div
                ref={scrollRef}
                className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar"
            >
                {song.lyrics.map((section, sectionIdx) => (
                    <div key={sectionIdx} className="mb-12 flex relative">
                        {/* Section Label */}
                        <div className="w-24 shrink-0">
                            <span className="text-white/20 text-[10px] uppercase tracking-widest font-sans sticky top-0 italic">
                                {section.title}
                            </span>
                            <div className="w-[1px] h-full bg-white/10 ml-0 mt-2 min-h-[40px]" />
                        </div>

                        <div className="flex-1 space-y-6">
                            {section.lines.map((line, lineIdx) => (
                                <div key={lineIdx} className="flex flex-wrap gap-x-2 gap-y-3">
                                    {line.words.map((word, wordIdx) => {
                                        const active = isWordActive(word);
                                        const past = isWordPast(word);

                                        return (
                                            <button
                                                key={wordIdx}
                                                onClick={() => handleWordClick(word.start)}
                                                className={`
                          text-2xl md:text-3xl lg:text-4xl font-serif tracking-tight rounded-sm px-1.5 py-0.5
                          ${active
                                                        ? 'text-charcoal bg-gold-500 scale-110 shadow-[0_0_30px_rgba(197,160,89,0.4)] z-10 word-active transition-all duration-75'
                                                        : past
                                                            ? 'text-white/80 transition-all duration-300'
                                                            : 'text-white/20 hover:text-white/40 transition-all duration-300'
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
                    </div>
                ))}
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(197, 160, 89, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(197, 160, 89, 0.4);
        }
      `}</style>
        </div>
    );
}
