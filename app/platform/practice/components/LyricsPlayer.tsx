"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import { setPlaybackAudioSession } from '@/lib/audioSession';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Song, Word, LyricSection } from '../data/songs';
import SongTimeline from './SongTimeline';
import { KIND_BG, KIND_LABEL_KEY, SECTION_TEXT, classifySection, type SectionKind } from '../data/sections';

interface LyricsPlayerProps {
    song: Song;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

/**
 * Mounted with `key={song.id}` so switching songs starts the exercise clean —
 * the shuffle and the answers live in state that only initialises on mount.
 */
export default function LyricsPlayer({ song, isPlaying, onTogglePlay }: LyricsPlayerProps) {
    const { t } = useLanguage();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [duration, setDuration] = useState(0);
    const requestRef = useRef<number | undefined>(undefined);
    const updateProgressRef = useRef<(() => void) | null>(null);

    /*
     * Identify exercise: pick a section type off the timeline, then the block of
     * lyrics it belongs to. The blocks are shuffled and unlabelled — otherwise
     * their order alongside the timeline would give every answer away.
     */
    const [shuffled] = useState<{ section: LyricSection; originalIdx: number }[]>(() =>
        song.lyrics
            .map((section, originalIdx) => ({ section, originalIdx }))
            .sort(() => Math.random() - 0.5)
    );
    const [selectedKind, setSelectedKind] = useState<SectionKind | null>(null);
    const [identified, setIdentified] = useState<number[]>([]);
    const [wrongIdx, setWrongIdx] = useState<number | null>(null);

    // Naming every section is what counts as having practised the song.
    useEffect(() => {
        if (song.lyrics.length === 0 || identified.length < song.lyrics.length) return;
        const completed = JSON.parse(localStorage.getItem('mep-completed-practices') || '[]');
        if (!completed.includes(song.id)) {
            completed.push(song.id);
            safeLocalStorageSetItem('mep-completed-practices', JSON.stringify(completed));
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }
    }, [identified, song.id, song.lyrics.length]);

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
                // iOS: overrides the ring/silent switch, which otherwise plays this at zero volume.
                setPlaybackAudioSession();
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

    const handleSeek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const isWordActive = (word: Word) => currentTime >= word.start && currentTime <= word.end;
    const isWordPast = (word: Word) => currentTime > word.end;

    // Answering: the armed type either matches this block or it doesn't.
    const handleGuess = (section: LyricSection, originalIdx: number) => {
        if (!selectedKind || identified.includes(originalIdx)) return;

        if (classifySection(section.title) === selectedKind) {
            setIdentified(prev => [...prev, originalIdx]);
            setSelectedKind(null);
        } else {
            setWrongIdx(originalIdx);
            setTimeout(() => setWrongIdx(null), 450);
        }
    };

    if (loadError) {
        return (
            <div className="w-full h-[250px] flex flex-col items-center justify-center border border-red-100 rounded-[24px] bg-red-50/10 px-6">
                <p className="text-red-700 font-sans font-semibold text-lg mb-2">{t('practice.audio_unavailable')}</p>
                <p className="text-stone-500 text-xs mb-6 text-center">{t('practice.localhost_warning')}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-stone-900 text-[#FAF9F5] hover:opacity-90 rounded-full text-sm font-medium transition-colors"
                >
                    {t('practice.retry_connection')}
                </button>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-[250px] flex flex-col items-center justify-center border border-stone-200/50 rounded-[24px] bg-white/30">
                <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin mb-3" />
                <p className="text-stone-500 font-sans text-sm">{t('practice.tuning')}</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-10">

            {/* The timeline is the player, and the palette of section types */}
            <SongTimeline
                title={song.title}
                sections={song.lyrics}
                duration={duration}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTogglePlay={onTogglePlay}
                onSeek={handleSeek}
                selectedKind={selectedKind}
                onSelectKind={(kind) => setSelectedKind(prev => (prev === kind ? null : kind))}
            />

            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
                {/* The shuffled, unlabelled blocks */}
                {shuffled.map(({ section, originalIdx }) => {
                    const kind = classifySection(section.title);
                    const isIdentified = identified.includes(originalIdx);
                    const isWrong = wrongIdx === originalIdx;
                    const answering = !!selectedKind && !isIdentified;

                    return (
                        <div
                            key={originalIdx}
                            data-section-block
                            onClick={() => handleGuess(section, originalIdx)}
                            className={`
                                relative rounded-[20px] border p-6 md:p-8 transition-colors duration-200
                                ${isIdentified
                                    ? 'border-[#86BE7F] bg-[#EAF7E8]/25'
                                    : isWrong
                                        ? 'border-[#F59E0B] bg-[#FEF3C7]/25 animate-shake'
                                        : answering
                                            ? 'border-stone-300 bg-white hover:border-stone-500 cursor-pointer'
                                            : 'border-stone-200 bg-white'
                                }
                            `}
                        >
                            {/* Its name, once you've found it */}
                            {isIdentified ? (
                                <span
                                    style={{ backgroundColor: KIND_BG[kind], color: SECTION_TEXT }}
                                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-sans mb-4"
                                >
                                    {t(KIND_LABEL_KEY[kind])}
                                    <Check size={12} className="stroke-[3]" />
                                </span>
                            ) : (
                                <span className="inline-block rounded-full bg-stone-100 text-stone-400 px-3.5 py-1 text-xs font-sans mb-4">
                                    ?
                                </span>
                            )}

                            <div className="space-y-3">
                                {section.lines.map((line, lineIdx) => (
                                    <div key={lineIdx} className="flex flex-wrap gap-x-1.5 gap-y-1 leading-relaxed">
                                        {line.words.map((word, wordIdx) => {
                                            const active = isWordActive(word);
                                            const past = isWordPast(word);
                                            const tone = active
                                                ? 'text-stone-900 font-bold scale-102 word-active z-10'
                                                : past
                                                    ? 'text-stone-400 font-light'
                                                    : 'text-stone-700 font-normal';

                                            // While a type is armed the whole block is the answer
                                            // target, so the words stop being seek buttons.
                                            return answering ? (
                                                <span
                                                    key={wordIdx}
                                                    className={`font-serif text-lg md:text-xl transition-all duration-300 py-0.5 px-0.5 ${tone}`}
                                                >
                                                    {word.text}
                                                </span>
                                            ) : (
                                                <button
                                                    key={wordIdx}
                                                    onClick={() => handleSeek(word.start)}
                                                    className={`font-serif text-lg md:text-xl transition-all duration-300 py-0.5 px-0.5 rounded-xs focus:outline-none hover:text-stone-900 ${tone}`}
                                                >
                                                    {word.text}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Keyframes for the wrong-answer shake */}
            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.45s ease-in-out;
                }
            `}</style>
        </div>
    );
}
