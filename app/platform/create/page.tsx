"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    Folder, 
    FileText, 
    Trash2, 
    Search, 
    Plus,
    Mic,
    Play,
    Pause,
    Square,
    MoreVertical,
    Music,
    Pencil,
    CircleDot,
    Volume2,
    Wand2,
    Activity,
    RotateCcw
} from 'lucide-react';

interface SongFolder {
    id: string;
    name: string;
}

interface VerseGroup {
    id: string;
    name: string;
}

interface Phrase {
    id: string;
    text: string;
    groupId: string | null;
}

interface AudioNote {
    id: string;
    url: string;
    title: string;
    duration: number;
    groupId: string | null;
    phraseId?: string | null;
}

interface SongNote {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    updatedAt: string;
    verses?: VerseGroup[];
    phrases?: Phrase[];
    audioUrl?: string;
    recordingDuration?: number;
    isAudioOnly?: boolean;
    isTitleLocked?: boolean;
    audioGroupId?: string | null;
    audioNotes?: AudioNote[];
}

const songwritingSuggestions: Record<string, string[]> = {
    "people": ["crowds", "souls", "minds", "nations", "humans", "wanderers"],
    "love": ["passion", "devotion", "warmth", "fire", "yearning", "grace"],
    "typing": ["writing", "carving", "tracing", "scribbling", "drafting"],
    "song": ["melody", "anthem", "hymn", "ballad", "refrain", "verse"],
    "ocean": ["abyss", "deep", "tide", "blue", "currents", "waves"],
    "breeze": ["gale", "whisper", "sigh", "wind", "breath", "draft"],
    "sand": ["shore", "dust", "earth", "grain", "coast", "beach"],
    "beach": ["shore", "coast", "tide", "coastline", "sands"],
    "night": ["darkness", "shadow", "gloom", "twilight", "oblivion", "veil"],
    "light": ["gleam", "glow", "halo", "beam", "radiance"],
    "heart": ["soul", "core", "breath", "pulse", "spirit"],
    "music": ["harmony", "sound", "cadence", "chords", "echoes"],
    "time": ["hours", "seasons", "moments", "infinity", "epochs"],
    "dream": ["vision", "illusion", "phantom", "fantasy", "shadow"],
    "eyes": ["gaze", "stare", "sight", "vision", "mirrors"],
    "sky": ["heaven", "abyss", "vault", "azure", "canopy"],
    "wind": ["gale", "breeze", "breath", "tempest", "whisper"],
    "fire": ["flame", "blaze", "ember", "glow", "spark"],
    "rain": ["shower", "torrent", "tears", "drizzle", "pour"],
    "dark": ["shadow", "gloom", "night", "obscure", "dim"],
    "cold": ["chill", "frost", "ice", "bleak", "freezing"],
    "warm": ["cosy", "mild", "balmy", "tender", "heated"]
};

const getSuggestions = (word: string): string[] => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (songwritingSuggestions[clean]) {
        return songwritingSuggestions[clean];
    }
    if (clean.endsWith('ing')) {
        return ["flowing", "chasing", "calling", "fading", "glowing"];
    }
    if (clean.endsWith('y')) {
        return ["silent", "empty", "shadowy", "solemn", "glassy"];
    }
    if (clean.endsWith('s')) {
        return ["whispers", "shadows", "echoes", "embers", "tides"];
    }
    return [
        `golden ${clean}`,
        `faded ${clean}`,
        `echo of ${clean}`,
        `whisper of ${clean}`
    ];
};

// Visual SVG Folder Illustration Component
function FolderIllustration({ folderId }: { folderId: string }) {
    const gradientId = `paint0_linear_2874_1501-${folderId}`;
    return (
        <div className="w-full aspect-[212/173] flex items-center justify-center relative">
            <svg width="100%" height="100%" viewBox="0 0 212 173" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.02)] transition-transform group-hover:scale-102 duration-300">
                <rect x="7.87109" width="195.773" height="103.408" rx="19.0345" fill="white" className="transition-transform group-hover:translate-y-[-6px] duration-300"/>
                <path d="M64.5986 16.2268C75.6283 16.2268 86.4933 18.9052 96.2588 24.0325L105.236 28.7463C114.572 33.6477 124.957 36.2082 135.501 36.2083H188.534C200.398 36.2084 210.016 45.8267 210.016 57.6907V149.178C210.016 161.042 200.398 170.659 188.534 170.659H22.9814C11.1176 170.659 1.50004 161.042 1.5 149.178V37.7083C1.50017 25.8444 11.1176 16.227 22.9814 16.2268H64.5986Z" fill={`url(#${gradientId})`} stroke="#DDDDD5" strokeWidth="3"/>
                <defs>
                    <linearGradient id={gradientId} x1="18.8643" y1="33.9689" x2="202.89" y2="159.065" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#DCDDD4"/>
                        <stop offset="1" stopColor="#F8F8F4"/>
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}

// Visual File Card Illustration Component
function FileIllustration() {
    return (
        <div className="w-full aspect-[212/173] bg-white border border-stone-200/60 rounded-[20px] shadow-xs flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 group-hover:text-stone-400 group-hover:scale-105 transition-all duration-300">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
            </svg>
        </div>
    );
}

// Syllable counting helper functions
const countSyllables = (text: string): number => {
    const word = text.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    const cleanWord = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    const finalWord = cleanWord.replace(/^y/, '');
    const syl = finalWord.match(/[aeiouy]{1,2}/g);
    return syl ? syl.length : 1;
};

const getPhraseSyllableCount = (phraseText: string): number => {
    if (!phraseText.trim()) return 0;
    const words = phraseText.split(/\s+/);
    return words.reduce((acc, word) => acc + countSyllables(word), 0);
};

// Draggable Phrase row rendering individual words for songwriting suggestions
// Draggable Phrase row rendering individual words for songwriting suggestions
function PhraseRow({ 
    phrase, 
    draggedPhraseId, 
    draggedPhraseIdRef,
    setDraggedPhraseId,
    handleWordClick,
    handleReorderPhrases,
    handleMovePhraseToGroup,
    tokenOffset,
    dragOverPhraseId,
    dropPosition,
    setDragOverPhraseId,
    setDropPosition,
    handleInsertPhraseAt,
    setDragOverGroupId,
    draggedGroupId,
    draggedGroupIdRef,
    showSyllables,
    setDragOverBlockId,
    setBlockDropPosition,
    handleInsertPhraseAtBlockLevel,
    blockDropPosition,
    dragOverBlockId,
    handleAttachAudioToPhrase,
    isCurrentlyEditing,
    onStartEditing,
    onStopEditing,
    onUpdateText
}: {
    phrase: Phrase;
    draggedPhraseId: string | null;
    draggedPhraseIdRef?: React.RefObject<string | null>;
    setDraggedPhraseId: (id: string | null) => void;
    handleWordClick: (e: React.MouseEvent, word: string, tokenIndex: number) => void;
    handleReorderPhrases: (draggedId: string, targetId: string) => void;
    handleMovePhraseToGroup: (phraseId: string, groupId: string | null) => void;
    tokenOffset: number;
    dragOverPhraseId: string | null;
    dropPosition: 'top' | 'bottom' | null;
    setDragOverPhraseId: (id: string | null) => void;
    setDropPosition: (pos: 'top' | 'bottom' | null) => void;
    handleInsertPhraseAt: (draggedId: string, targetId: string, position: 'top' | 'bottom' | null) => void;
    setDragOverGroupId?: (id: string | null) => void;
    draggedGroupId?: string | null;
    draggedGroupIdRef?: React.RefObject<string | null>;
    showSyllables?: boolean;
    setDragOverBlockId?: (id: string | null) => void;
    setBlockDropPosition?: (pos: 'top' | 'bottom' | null) => void;
    handleInsertPhraseAtBlockLevel?: (draggedId: string, targetId: string, position: 'top' | 'bottom' | null) => void;
    blockDropPosition?: 'top' | 'bottom' | null;
    dragOverBlockId?: string | null;
    handleAttachAudioToPhrase?: (audioNoteId: string, phraseId: string | null, groupId: string | null) => void;
    isCurrentlyEditing?: boolean;
    onStartEditing?: (phraseId: string) => void;
    onStopEditing?: (createNext?: boolean) => void;
    onUpdateText?: (phraseId: string, text: string) => void;
}) {
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTouchDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const wordsList = phrase.text.split(/(\s+)/);
    
    return (
        <div 
            draggable={!isCurrentlyEditing}
            onDragStart={(e) => {
                if (isCurrentlyEditing) return;
                e.stopPropagation();
                if (draggedPhraseIdRef) {
                    draggedPhraseIdRef.current = phrase.id;
                }
                setDraggedPhraseId(phrase.id);
                e.dataTransfer.setData('text/plain', phrase.id);
            }}
            onDragEnd={() => {
                if (isCurrentlyEditing) return;
                setTimeout(() => {
                    if (draggedPhraseIdRef) {
                        draggedPhraseIdRef.current = null;
                    }
                    setDraggedPhraseId(null);
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                    if (setDragOverGroupId) {
                        setDragOverGroupId(null);
                    }
                }, 50);
            }}
            onDragOver={(e) => {
                if (isCurrentlyEditing) return;
                const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                if (currentDraggedGroupId) {
                    return; // Let group drag events bubble up to block level
                }
                e.preventDefault();
                e.stopPropagation();
                const currentDraggedId = draggedPhraseId || (draggedPhraseIdRef ? draggedPhraseIdRef.current : null);
                if (currentDraggedId === phrase.id) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const position = relativeY < rect.height / 2 ? 'top' : 'bottom';
                setDragOverPhraseId(phrase.id);
                setDropPosition(position);
            }}
            onDragLeave={() => {
                if (isCurrentlyEditing) return;
                setDragOverPhraseId(null);
                setDropPosition(null);
            }}
            onDrop={(e) => {
                if (isCurrentlyEditing) return;
                const audioNoteId = e.dataTransfer.getData('text/audio-note-id');
                if (audioNoteId) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (handleAttachAudioToPhrase) {
                        const isPlaceholder = phrase.id.startsWith('placeholder-');
                        const targetPhraseId = phrase.groupId ? null : (isPlaceholder ? null : phrase.id);
                        handleAttachAudioToPhrase(audioNoteId, targetPhraseId, phrase.groupId);
                    }
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                    return;
                }

                const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                if (currentDraggedGroupId) {
                    return; // Let group drop events bubble up to block level
                }
                
                e.preventDefault();
                e.stopPropagation();
                const draggedId = e.dataTransfer.getData('text/plain') || (draggedPhraseIdRef ? draggedPhraseIdRef.current : null) || draggedPhraseId;
                
                // Reset drag states immediately before updating note array
                setDraggedPhraseId(null);
                if (draggedPhraseIdRef) {
                    draggedPhraseIdRef.current = null;
                }
                
                if (draggedId && draggedId !== phrase.id) {
                    handleInsertPhraseAt(draggedId, phrase.id, dropPosition);
                }
                setDragOverPhraseId(null);
                setDropPosition(null);
                if (setDragOverGroupId) {
                    setDragOverGroupId(null);
                }
            }}
            onTouchStart={(e) => {
                if (isCurrentlyEditing) return;
                const touch = e.touches[0];
                startXRef.current = touch.clientX;
                startYRef.current = touch.clientY;
                isTouchDraggingRef.current = false;
                
                touchTimeoutRef.current = setTimeout(() => {
                    isTouchDraggingRef.current = true;
                    setDraggedPhraseId(phrase.id);
                    if (draggedPhraseIdRef) {
                        draggedPhraseIdRef.current = phrase.id;
                    }
                    if (navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                }, 300); // 300ms long press
            }}
            onTouchMove={(e) => {
                if (isCurrentlyEditing) return;
                const touch = e.touches[0];
                if (!isTouchDraggingRef.current) {
                    const diffX = Math.abs(touch.clientX - startXRef.current);
                    const diffY = Math.abs(touch.clientY - startYRef.current);
                    if (diffX > 10 || diffY > 10) {
                        clearTimeout(touchTimeoutRef.current!);
                    }
                    return;
                }
                
                if (e.cancelable) {
                    e.preventDefault();
                }
                
                // Temporarily disable pointer events on the dragged element so document.elementFromPoint works
                const currentTarget = e.currentTarget as HTMLElement;
                const originalPointerEvents = currentTarget.style.pointerEvents;
                currentTarget.style.pointerEvents = 'none';
                
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                
                currentTarget.style.pointerEvents = originalPointerEvents;
                
                if (!elem) return;
                
                const targetPhraseRow = elem.closest('.phrase-row-container');
                const targetGroupRow = elem.closest('.verse-group-container');
                const targetBlockWrapper = elem.closest('.block-wrapper');
                
                if (targetPhraseRow) {
                    const targetId = targetPhraseRow.getAttribute('data-phrase-id');
                    if (targetId && targetId !== phrase.id) {
                        const rect = targetPhraseRow.getBoundingClientRect();
                        const relativeY = touch.clientY - rect.top;
                        const position = relativeY < rect.height / 2 ? 'top' : 'bottom';
                        setDragOverPhraseId(targetId);
                        setDropPosition(position);
                        if (setDragOverGroupId) setDragOverGroupId(null);
                        if (setDragOverBlockId) setDragOverBlockId(null);
                    }
                } else if (targetGroupRow) {
                    const targetId = targetGroupRow.getAttribute('data-group-id');
                    if (targetId && targetId !== phrase.groupId) {
                        if (setDragOverGroupId) setDragOverGroupId(targetId);
                        setDragOverPhraseId(null);
                        setDropPosition(null);
                        if (setDragOverBlockId) setDragOverBlockId(null);
                    }
                } else if (targetBlockWrapper) {
                    const targetBlockId = targetBlockWrapper.getAttribute('data-block-id');
                    if (targetBlockId && targetBlockId !== phrase.id) {
                        const rect = targetBlockWrapper.getBoundingClientRect();
                        const relativeY = touch.clientY - rect.top;
                        const position = relativeY < rect.height / 2 ? 'top' : 'bottom';
                        if (setDragOverBlockId) setDragOverBlockId(targetBlockId);
                        if (setBlockDropPosition) setBlockDropPosition(position);
                        setDragOverPhraseId(null);
                        setDropPosition(null);
                        if (setDragOverGroupId) setDragOverGroupId(null);
                    }
                } else {
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                    if (setDragOverGroupId) setDragOverGroupId(null);
                    if (setDragOverBlockId) setDragOverBlockId(null);
                }
            }}
            onTouchEnd={(e) => {
                if (isCurrentlyEditing) return;
                clearTimeout(touchTimeoutRef.current!);
                if (isTouchDraggingRef.current) {
                    isTouchDraggingRef.current = false;
                    
                    const touch = e.changedTouches[0];
                    
                    // Temporarily disable pointer events on the dragged element so document.elementFromPoint works
                    const currentTarget = e.currentTarget as HTMLElement;
                    const originalPointerEvents = currentTarget.style.pointerEvents;
                    currentTarget.style.pointerEvents = 'none';
                    
                    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                    
                    currentTarget.style.pointerEvents = originalPointerEvents;
                    
                    let finalPhraseId: string | null = null;
                    let finalGroupId: string | null = null;
                    let finalBlockId: string | null = null;
                    
                    if (elem) {
                        const targetPhraseRow = elem.closest('.phrase-row-container');
                        const targetGroupRow = elem.closest('.verse-group-container');
                        const targetBlockWrapper = elem.closest('.block-wrapper');
                        
                        if (targetPhraseRow) {
                            finalPhraseId = targetPhraseRow.getAttribute('data-phrase-id');
                        } else if (targetGroupRow) {
                            finalGroupId = targetGroupRow.getAttribute('data-group-id');
                        } else if (targetBlockWrapper) {
                            finalBlockId = targetBlockWrapper.getAttribute('data-block-id');
                        }
                    }
                    
                    if (finalPhraseId && finalPhraseId !== phrase.id) {
                        handleInsertPhraseAt(phrase.id, finalPhraseId, dropPosition);
                    } else if (finalGroupId && finalGroupId !== phrase.groupId) {
                        handleMovePhraseToGroup(phrase.id, finalGroupId);
                    } else if (finalBlockId && finalBlockId !== phrase.id) {
                        if (handleInsertPhraseAtBlockLevel) {
                            handleInsertPhraseAtBlockLevel(phrase.id, finalBlockId, blockDropPosition || null);
                        }
                    } else if (!finalPhraseId && !finalGroupId && !finalBlockId) {
                        // Check if dropped inside canvas, ungroup it
                        if (elem && elem.closest('#writing-canvas')) {
                            handleMovePhraseToGroup(phrase.id, null);
                        }
                    }
                    
                    setDraggedPhraseId(null);
                    if (draggedPhraseIdRef) {
                        draggedPhraseIdRef.current = null;
                    }
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                    if (setDragOverGroupId) setDragOverGroupId(null);
                    if (setDragOverBlockId) setDragOverBlockId(null);
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (onStartEditing) {
                    onStartEditing(phrase.id);
                }
            }}
            className="phrase-row-container flex flex-col w-full relative transition-all duration-200"
            data-phrase-id={phrase.id}
        >
            {dragOverPhraseId === phrase.id && dropPosition === 'top' && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-black/50 rounded-[0.75px] transform -translate-y-1/2 pointer-events-none z-30 animate-pulse" />
            )}
            
            {isCurrentlyEditing ? (
                <div className="text-[26px] md:text-[42px] font-light text-stone-855 leading-[1.4] tracking-[-0.035em] text-center max-w-4xl mx-auto w-full px-4">
                    <textarea
                        autoFocus
                        value={phrase.text}
                        placeholder="Write something..."
                        onChange={(e) => onUpdateText && onUpdateText(phrase.id, e.target.value)}
                        onBlur={() => onStopEditing && onStopEditing(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (onStopEditing) onStopEditing(true);
                            }
                        }}
                        className="w-full bg-transparent border-none outline-none resize-none font-sans text-[26px] md:text-[42px] font-light text-stone-855 text-center tracking-[-0.035em] focus:ring-0 focus:outline-none leading-[1.4] py-0 no-scrollbar"
                        style={{ height: 'auto', minHeight: '1.4em' }}
                        onFocus={(e) => {
                            const val = e.target.value;
                            e.target.value = '';
                            e.target.value = val; // Move cursor to end
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        inputMode="text"
                    />
                </div>
            ) : (
                <div 
                    className={`
                        text-[26px] md:text-[42px] font-light text-stone-855 leading-[1.4] tracking-[-0.035em] text-center max-w-4xl mx-auto whitespace-pre-wrap select-none py-0.5 px-4 rounded-[12px] transition-all duration-200 cursor-grab active:cursor-grabbing w-full
                        ${draggedPhraseId === phrase.id ? 'opacity-30' : ''}
                    `}
                >
                    {wordsList.map((token, idx) => {
                        if (/^\s+$/.test(token)) {
                            return <span key={idx} className="whitespace-pre-wrap">{token}</span>;
                        }
                        
                        // Parse alphabetical word to isolate punctuation
                        const match = token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
                        if (match) {
                            const prePunc = match[1];
                            const word = match[2];
                            const postPunc = match[3];
                            return (
                                <span key={idx} className={`inline-block ${draggedPhraseId !== null ? 'pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
                                    {prePunc}
                                    <span 
                                        onClick={(e) => handleWordClick(e, word, tokenOffset + idx)}
                                        className="hover:bg-stone-200/70 text-stone-855 hover:text-stone-955 rounded-[12px] px-2 py-0.5 cursor-pointer transition-colors duration-200"
                                    >
                                        {word}
                                    </span>
                                    {postPunc}
                                </span>
                            );
                        }
                        return <span key={idx}>{token}</span>;
                    })}
                </div>
            )}

            {dragOverPhraseId === phrase.id && dropPosition === 'bottom' && (
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-black/50 rounded-[0.75px] transform translate-y-1/2 pointer-events-none z-30 animate-pulse" />
            )}

            {showSyllables && phrase.text.trim() !== '' && !isCurrentlyEditing && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 select-none pointer-events-none bg-stone-200/50 text-stone-600 px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide uppercase transition-all">
                    {getPhraseSyllableCount(phrase.text)} syl
                </div>
            )}
        </div>
    );
}

async function getWavBlob(audioBlob: Blob): Promise<Blob> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    // Decode audio data
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    // Resample to 16000Hz mono using OfflineAudioContext
    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(
        1, // 1 channel (mono)
        Math.floor(decodedBuffer.duration * targetSampleRate),
        targetSampleRate
    );
    
    // Create source node in the offline context
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    // Render the resampled audio
    const resampledBuffer = await offlineCtx.startRendering();
    
    // Convert resampled buffer to 16-bit PCM WAV
    const wavBuffer = audioBufferToWav(resampledBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * 2;
    const bufferArr = new ArrayBuffer(44 + length);
    const view = new DataView(bufferArr);
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + length, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw pcm) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, buffer.sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, buffer.sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, length, true);
    
    // Write PCM audio samples
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return bufferArr;
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

interface AudioCapsulePlayerProps {
    audioNote: AudioNote;
    onRename: (newTitle: string) => void;
    onDelete: () => void;
    onTranscribe?: () => void;
    isTranscribing?: boolean;
    isDocked: boolean;
    onDragStart: (e: React.DragEvent) => void;
}

function AudioCapsuleSkeleton() {
    return (
        <div className="bg-white border border-stone-200/60 rounded-full px-5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center gap-3 sm:gap-4 z-30 animate-pulse select-none shrink-0 h-[42px]">
            {/* Title Placeholder */}
            <div className="bg-stone-200 h-4 w-20 rounded" />
            <div className="h-4 w-[1px] bg-stone-200 shrink-0" />
            {/* Play Button Placeholder */}
            <div className="bg-stone-200 h-4 w-12 rounded" />
            <div className="h-4 w-[1px] bg-stone-200 shrink-0" />
            {/* Waveform Placeholder */}
            <div className="flex items-center gap-[2.5px] h-6 px-1.5 shrink-0" style={{ width: '130px' }}>
                {Array.from({ length: 18 }).map((_, idx) => (
                    <div 
                        key={idx} 
                        className="w-[3px] bg-stone-200 rounded-full" 
                        style={{ height: `${8 + Math.sin(idx * 0.5) * 6}px` }} 
                    />
                ))}
            </div>
            <div className="h-4 w-[1px] bg-stone-200 shrink-0" />
            {/* Timer Placeholder */}
            <div className="bg-stone-200 h-3 w-8 rounded" />
        </div>
    );
}

function AudioCapsulePlayer({ audioNote, onRename, onDelete, onTranscribe, isTranscribing, isDocked, onDragStart }: AudioCapsulePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(audioNote.duration || 0);
    const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (playbackAudioRef.current) {
                playbackAudioRef.current.pause();
            }
        };
    }, []);

    const togglePlayback = () => {
        if (!playbackAudioRef.current) return;
        if (isPlaying) {
            playbackAudioRef.current.pause();
            setIsPlaying(false);
        } else {
            document.querySelectorAll('audio').forEach(el => {
                if (el !== playbackAudioRef.current) {
                    el.pause();
                }
            });
            playbackAudioRef.current.play().catch(err => console.error("Playback failed:", err));
            setIsPlaying(true);
        }
    };

    const handleWaveformClick = (e: any) => {
        e.stopPropagation();
        if (!playbackAudioRef.current || !playbackDuration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clickX = clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percent * playbackDuration;
        playbackAudioRef.current.currentTime = newTime;
        setPlaybackTime(newTime);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (isDocked) {
        return (
            <div 
                draggable
                onDragStart={onDragStart}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-stone-200/80 rounded-full px-3 py-0.5 shadow-sm flex items-center gap-2.5 transition-all select-none h-[22px] cursor-grab active:cursor-grabbing"
            >
                <audio 
                    ref={playbackAudioRef} 
                    src={audioNote.url} 
                    onTimeUpdate={() => {
                        if (playbackAudioRef.current) {
                            setPlaybackTime(playbackAudioRef.current.currentTime);
                        }
                    }}
                    onLoadedMetadata={() => {
                        if (playbackAudioRef.current) {
                            setPlaybackDuration(playbackAudioRef.current.duration);
                        }
                    }}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                />

                <input 
                    type="text"
                    value={audioNote.title || ''}
                    placeholder="Name"
                    disabled={isTranscribing}
                    onChange={(e) => onRename(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-[9px] text-stone-850 placeholder:text-stone-400 w-16 hover:bg-stone-50 focus:bg-stone-50 rounded px-1 py-0.2 focus:ring-1 focus:ring-stone-200 transition-colors disabled:opacity-50"
                    title="Rename recording"
                />
                <div className="h-2.5 w-[1px] bg-stone-200" />
                
                {isTranscribing ? (
                    <div className="flex items-center gap-1 text-emerald-600 animate-pulse text-[9px] font-bold shrink-0">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-bounce" />
                        <span>Transcribing...</span>
                    </div>
                ) : (
                    <>
                        <button 
                            onClick={togglePlayback}
                            className="flex items-center text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
                        >
                            {isPlaying ? (
                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                </svg>
                            ) : (
                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            )}
                        </button>
                        
                        <div className="h-2.5 w-[1px] bg-stone-200" />

                        <div 
                            onClick={handleWaveformClick}
                            onTouchStart={handleWaveformClick}
                            onTouchMove={handleWaveformClick}
                            className="flex items-center gap-[1.5px] h-3 px-1 relative cursor-pointer select-none"
                            style={{ width: '80px' }}
                        >
                            <div 
                                className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 rounded-full z-10 pointer-events-none transition-all duration-75"
                                style={{ left: `${playbackDuration ? (playbackTime / playbackDuration) * 100 : 0}%` }}
                            />
                            {Array.from({ length: 16 }).map((_, idx) => {
                                const barPercent = idx / 16;
                                const currentPercent = playbackDuration ? (playbackTime / playbackDuration) : 0;
                                const isPlayed = barPercent <= currentPercent;
                                const distFromCenter = Math.abs(idx - 7.5);
                                const scaling = 1 - (distFromCenter / 7.5) * 0.5;
                                const barHeight = Math.max(3, (8 + Math.sin(idx * 0.5) * 4) * scaling);

                                return (
                                    <div 
                                        key={idx}
                                        className={`w-[2px] rounded-full shrink-0 transition-colors ${
                                            isPlayed ? 'bg-stone-500' : 'bg-stone-300'
                                        }`}
                                        style={{ height: `${barHeight}px` }}
                                    />
                                );
                            })}
                        </div>

                        <div className="h-2.5 w-[1px] bg-stone-200" />
                        <span className="text-[8px] font-mono font-bold text-stone-500">
                            {formatTime(playbackTime || playbackDuration)}
                        </span>
                    </>
                )}

                {onTranscribe && (
                    <>
                        <div className="h-2.5 w-[1px] bg-stone-200" />
                        <button 
                            disabled={isTranscribing}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTranscribe();
                            }}
                            className="text-stone-400 hover:text-emerald-600 transition-colors cursor-pointer disabled:opacity-35"
                            title="Transcribe recording"
                        >
                            <svg className="w-2.5 h-2.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    </>
                )}

                <div className="h-2.5 w-[1px] bg-stone-200" />
                <button 
                    disabled={isTranscribing}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-35"
                    title="Delete recording"
                >
                    <svg className="w-2.5 h-2.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-stone-200/80 rounded-full px-5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center gap-3 sm:gap-4 z-30 transition-all select-none cursor-grab active:cursor-grabbing shrink-0"
        >
            <audio 
                ref={playbackAudioRef} 
                src={audioNote.url} 
                onTimeUpdate={() => {
                    if (playbackAudioRef.current) {
                        setPlaybackTime(playbackAudioRef.current.currentTime);
                    }
                }}
                onLoadedMetadata={() => {
                    if (playbackAudioRef.current) {
                        setPlaybackDuration(playbackAudioRef.current.duration);
                    }
                }}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />

            <input 
                type="text"
                value={audioNote.title || ''}
                placeholder="Name"
                disabled={isTranscribing}
                onChange={(e) => onRename(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-xs text-stone-800 placeholder:text-stone-400 w-24 shrink-0 hover:bg-stone-50 focus:bg-stone-50 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-stone-200 transition-colors disabled:opacity-50"
                title="Rename recording"
            />

            <div className="h-4 w-[1px] bg-stone-200 shrink-0" />

            {isTranscribing ? (
                <div className="flex items-center gap-2 text-emerald-600 animate-pulse text-xs font-bold py-1 px-4 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-bounce" />
                    <span>Transcribing audio...</span>
                </div>
            ) : (
                <>
                    <button 
                        onClick={togglePlayback}
                        className="flex items-center gap-1.5 text-stone-700 hover:text-stone-900 transition-colors cursor-pointer text-xs font-bold shrink-0"
                    >
                        {isPlaying ? (
                            <>
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                </svg>
                                <span>Play/pause</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                                <span>Play/pause</span>
                            </>
                        )}
                    </button>

                    <div className="h-4 w-[1px] bg-stone-200 shrink-0" />

                    <div 
                        onClick={handleWaveformClick}
                        onTouchStart={handleWaveformClick}
                        onTouchMove={handleWaveformClick}
                        className="flex items-center gap-[2.5px] h-6 px-1.5 relative cursor-pointer select-none shrink-0"
                        style={{ width: '130px' }}
                    >
                        <div 
                            className="absolute top-0 bottom-0 w-[2px] bg-red-500 rounded-full z-10 pointer-events-none transition-all duration-75"
                            style={{ 
                                left: `${playbackDuration ? (playbackTime / playbackDuration) * 100 : 0}%` 
                            }}
                        />

                        {Array.from({ length: 24 }).map((_, idx) => {
                            const barPercent = idx / 24;
                            const currentPercent = playbackDuration ? (playbackTime / playbackDuration) : 0;
                            const isPlayed = barPercent <= currentPercent;
                            
                            const distFromCenter = Math.abs(idx - 11.5);
                            const scaling = 1 - (distFromCenter / 11.5) * 0.6;
                            const barHeight = Math.max(4, (12 + Math.sin(idx * 0.5) * 8) * scaling);

                            return (
                                <div 
                                    key={idx}
                                    className={`w-[3px] rounded-full shrink-0 transition-colors ${
                                        isPlayed ? 'bg-stone-500' : 'bg-stone-300'
                                    }`}
                                    style={{ height: `${barHeight}px` }}
                                />
                            );
                        })}
                    </div>

                    <div className="h-4 w-[1px] bg-stone-200 shrink-0" />

                    <span className="text-[10px] font-mono font-bold text-stone-500 shrink-0">
                        {formatTime(playbackTime || playbackDuration)}
                    </span>
                </>
            )}

            {onTranscribe && (
                <>
                    <div className="h-4 w-[1px] bg-stone-200 shrink-0" />
                    <button 
                        disabled={isTranscribing}
                        onClick={(e) => {
                            e.stopPropagation();
                            onTranscribe();
                        }}
                        className="text-stone-404 hover:text-emerald-600 transition-colors cursor-pointer shrink-0 disabled:opacity-35"
                        title="Transcribe recording"
                    >
                        <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>
                </>
            )}

            <div className="h-4 w-[1px] bg-stone-200 shrink-0" />

            <button 
                disabled={isTranscribing}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="text-stone-405 hover:text-red-600 transition-colors cursor-pointer shrink-0 disabled:opacity-35"
                title="Delete recording"
            >
                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        </div>
    );
}

export default function CreatePage() {
    const { user } = useAuth();
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const [folders, setFolders] = useState<SongFolder[]>([]);
    const [notes, setNotes] = useState<SongNote[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

    const selectedNoteIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedNoteIdRef.current = selectedNoteId;
    }, [selectedNoteId]);

    const notesRef = useRef<SongNote[]>([]);
    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    const [activeFolderIdFilter, setActiveFolderIdFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewItemMenu, setShowNewItemMenu] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [isDragOverRoot, setIsDragOverRoot] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [lastAwardedContent, setLastAwardedContent] = useState<string>('');
    const [lastSavedContent, setLastSavedContent] = useState<string>('');

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Suggestion mode states
    const [isEditing, setIsEditing] = useState(true);
    const [clickedWord, setClickedWord] = useState<string | null>(null);
    const [clickedTokenIndex, setClickedTokenIndex] = useState<number | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
    const [draggedPhraseId, setDraggedPhraseId] = useState<string | null>(null);
    const [showCanvasMenu, setShowCanvasMenu] = useState(false);
    const [dragOverPhraseId, setDragOverPhraseId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
    const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
    const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
    const [blockDropPosition, setBlockDropPosition] = useState<'top' | 'bottom' | null>(null);
    const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const draggedPhraseIdRef = useRef<string | null>(null);
    const draggedGroupIdRef = useRef<string | null>(null);
    const groupTouchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const groupIsTouchDraggingRef = useRef(false);
    const groupStartXRef = useRef(0);
    const groupStartYRef = useRef(0);

    // Audio recording & metronome state variables
    const [recordingTitle, setRecordingTitle] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [showToolsMenu, setShowToolsMenu] = useState(false);
    const [showSyllables, setShowSyllables] = useState(false);
    const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
    const [metronomeBpm, setMetronomeBpm] = useState(120);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isRecordingSaving, setIsRecordingSaving] = useState(false);
    const [transcribingAudioNoteId, setTranscribingAudioNoteId] = useState<string | null>(null);
    const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    
    // Scroll and title layout measurements
    const [scrollHeight, setScrollHeight] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [clientHeight, setClientHeight] = useState(0);
    const [titleWidth, setTitleWidth] = useState(240);
    const titleMeasureRef = useRef<HTMLSpanElement>(null);
    const speechTranscriptRef = useRef<string>('');
    const speechTranscriptAccumulated = useRef<string>('');
    const speechTranscriptSession = useRef<string>('');

    const isRecordingRef = useRef(isRecording);
    const isPausedRef = useRef(isPaused);

    // Auto focus the textarea once folders/notes have finished loading in editing mode
    useEffect(() => {
        if (isDataLoaded) {
            const timer = setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isDataLoaded]);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const visualizerContainerRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const forceNewRecordingRef = useRef<boolean>(false);

    // Audio playback state variables
    const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleNewNoteClick();
    };

    const handleCheckmarkSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleSaveNote(e);
    };

    const handlePillPlay = () => {
        if (isRecording) {
            stopRecording();
        } else if (playbackAudioRef.current) {
            playbackAudioRef.current.play().catch(err => console.error("Playback error:", err));
            setIsPlaying(true);
        }
    };

    const handlePillPause = () => {
        if (isRecording && !isPaused) {
            pauseRecording();
        } else if (isPlaying && playbackAudioRef.current) {
            playbackAudioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handlePillRestart = () => {
        if (isRecording) {
            cleanupRecordingStream();
            setIsRecording(false);
            setIsPaused(false);
            setTimeout(() => {
                startRecording(true);
            }, 250);
        } else if (playbackAudioRef.current) {
            playbackAudioRef.current.currentTime = 0;
            setPlaybackTime(0);
            playbackAudioRef.current.play().catch(err => console.error("Playback error:", err));
            setIsPlaying(true);
        }
    };

    const handlePillTranscribe = async () => {
        if (selectedNoteId && activeNote) {
            let currentContent = activeNote.content;
            if ((!currentContent || currentContent === 'Voice Recording\n[Attached Audio]') && activeNote.audioUrl) {
                const matchingAudioNote = activeAudioNotes.find(an => an.url === activeNote.audioUrl);
                const audioNoteId = matchingAudioNote ? matchingAudioNote.id : 'audio-init';
                setTranscribingAudioNoteId(audioNoteId);
                setIsTranscribing(true);
                try {
                    const audioBlob = await fetch(activeNote.audioUrl).then(r => r.blob());
                    const wavBlob = await getWavBlob(audioBlob);
                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: wavBlob,
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.text) {
                            currentContent = data.text;
                        }
                    }
                } catch (e) {
                    console.error("Manual transcription failed:", e);
                } finally {
                    setTranscribingAudioNoteId(null);
                    setIsTranscribing(false);
                }
            }
            
            const hasTranscription = currentContent && currentContent !== 'Voice Recording\n[Attached Audio]';
            const finalContent = hasTranscription ? currentContent : '';

            const updatedPhrases = syncPhrasesWithContent(finalContent, []);
            handleUpdateNote(selectedNoteId, {
                content: finalContent,
                phrases: updatedPhrases,
                title: getTitleFromContent(finalContent) || activeNote.title || 'Untitled Note',
                isAudioOnly: false
            });
            setIsEditing(true);
        } else {
            alert("No transcription available. Save a recording first.");
        }
    };

    const handlePillDelete = () => {
        if (confirm("Are you sure you want to delete this recording?")) {
            cleanupRecordingStream();
            setIsRecording(false);
            setIsPaused(false);
            setAudioUrl(null);
            if (selectedNoteId) {
                handleDeleteNote(selectedNoteId);
            }
        }
    };

    // Load initial data from Firestore with localStorage fallback
    useEffect(() => {
        const loadInitialData = async () => {
            let initialFolders: SongFolder[] = [];
            let initialNotes: SongNote[] = [];
            let loadedFromFirestore = false;

            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.createFolders) {
                            initialFolders = userData.createFolders;
                            loadedFromFirestore = true;
                        }
                        if (userData.createNotes) {
                            initialNotes = userData.createNotes;
                            loadedFromFirestore = true;
                        }
                    }
                } catch (err) {
                    console.error("Error loading data from Firestore:", err);
                }
            }

            // Fallback to localStorage if not found/loaded from Firestore
            if (!loadedFromFirestore) {
                const savedFolders = localStorage.getItem('veinote-create-folders');
                const savedNotes = localStorage.getItem('veinote-create-notes');

                if (savedFolders) {
                    initialFolders = JSON.parse(savedFolders);
                } else {
                    initialFolders = [
                        { id: 'f-1', name: 'Summer Album' },
                        { id: 'f-2', name: 'Melodic Ideas' }
                    ];
                    localStorage.setItem('veinote-create-folders', JSON.stringify(initialFolders));
                }

                if (savedNotes) {
                    initialNotes = JSON.parse(savedNotes);
                    initialNotes = initialNotes.map(n => {
                        if (n.audioUrl && (n.content === 'Voice Recording\n[Attached Audio]' || n.isAudioOnly === true)) {
                            return { ...n, isAudioOnly: true };
                        }
                        return n;
                    });
                } else {
                    initialNotes = [
                        { 
                            id: 'n-1', 
                            title: 'Ocean Breeze Lyrics', 
                            content: 'Ocean Breeze Lyrics\n\nVerse 1:\nWalking down the sandy beach\nFeel the warmth within my reach\n\nChorus:\nOcean breeze, carry me away\nTo the place where we used to play...', 
                            folderId: 'f-1', 
                            updatedAt: new Date().toLocaleString() 
                        },
                        { 
                            id: 'n-2', 
                            title: 'A minor progression', 
                            content: 'A minor progression\n\nChords:\nAm - F - C - G\n\nTempo: 120bpm\nFeel: Ethereal and flowing.\nTry adding a violin counter-melody in the chorus.', 
                            folderId: 'f-2', 
                            updatedAt: new Date().toLocaleString() 
                        },
                        { 
                            id: 'n-3', 
                            title: 'Songwriting Prompts', 
                            content: 'Songwriting Prompts\n\n- Write about nostalgia for a city you only visited once.\n- Use the word "spectral" in the bridge.\n- Start the song on a subdominant major chord.', 
                            folderId: null, 
                            updatedAt: new Date().toLocaleString() 
                        }
                    ];
                    localStorage.setItem('veinote-create-notes', JSON.stringify(initialNotes));
                }

                // If user is logged in, upload the migrated/local data to Firestore
                if (user) {
                    try {
                        await setDoc(doc(db, "users", user.uid), {
                            createFolders: initialFolders,
                            createNotes: initialNotes
                        }, { merge: true });
                    } catch (err) {
                        console.error("Error saving initial data to Firestore:", err);
                    }
                }
            }

            setFolders(initialFolders);
            setNotes(initialNotes);
            setIsDataLoaded(true);
            setIsMounted(true);
        };

        loadInitialData();
    }, [user]);

    // Save changes to localStorage and Firestore
    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('veinote-create-folders', JSON.stringify(folders));
            if (user) {
                setDoc(doc(db, "users", user.uid), {
                    createFolders: folders
                }, { merge: true }).catch(err => console.error("Error updating folders in Firestore:", err));
            }
        }
    }, [folders, isDataLoaded, user]);

    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('veinote-create-notes', JSON.stringify(notes));
            if (user) {
                setDoc(doc(db, "users", user.uid), {
                    createNotes: notes
                }, { merge: true }).catch(err => console.error("Error updating notes in Firestore:", err));
            }
        }
    }, [notes, isDataLoaded, user]);

    const activeNote = notes.find(n => n.id === selectedNoteId) || null;

    // Ensure we have a unified list of audio notes, migrating legacy audioUrl if needed
    const activeAudioNotes = activeNote 
        ? (activeNote.audioNotes && activeNote.audioNotes.length > 0 
            ? activeNote.audioNotes 
            : (activeNote.audioUrl 
                ? [{ 
                    id: 'audio-init', 
                    url: activeNote.audioUrl, 
                    title: activeNote.title || 'Audio 1', 
                    duration: activeNote.recordingDuration || 0, 
                    groupId: activeNote.audioGroupId || null,
                    phraseId: null
                  }] 
                : []))
        : [];

    // ----------------------------------------------------
    // METRONOME LOGIC
    // ----------------------------------------------------
    const playMetronomeTick = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high tick (A5)
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); // decay
            
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.05);
        } catch (err) {
            console.error("Metronome error:", err);
        }
    };

    useEffect(() => {
        if (isMetronomePlaying) {
            const intervalMs = (60 / metronomeBpm) * 1000;
            // Play first tick immediately
            playMetronomeTick();
            metronomeIntervalRef.current = setInterval(() => {
                playMetronomeTick();
            }, intervalMs);
        } else {
            if (metronomeIntervalRef.current) {
                clearInterval(metronomeIntervalRef.current);
                metronomeIntervalRef.current = null;
            }
        }
        return () => {
            if (metronomeIntervalRef.current) {
                clearInterval(metronomeIntervalRef.current);
            }
        };
    }, [isMetronomePlaying, metronomeBpm]);

    // ----------------------------------------------------
    // VOICE RECORDING & AUDIO VISUALIZER LOGIC
    // ----------------------------------------------------
    const startRecording = async (forceNew = false) => {
        forceNewRecordingRef.current = forceNew;
        const startingNoteId = selectedNoteIdRef.current;
        setLastAwardedContent('');
        const startTime = Date.now();
        
        const runAudio = true;
        const runSpeech = false;
        
        try {
            if (runAudio) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                
                // Web Audio analyser setup
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 128; // small size for visualizer frequency counts
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                
                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
                dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
                sourceRef.current = source;
                
                // MediaRecorder setup
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];
                
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        audioChunksRef.current.push(e.data);
                    }
                };
                
                    mediaRecorder.onstop = () => {
                    setIsRecordingSaving(true);
                    const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
                    const url = URL.createObjectURL(audioBlob);
                    setAudioUrl(url);
                    
                    const timestamp = new Date().toLocaleString();
                    const durationSeconds = (Date.now() - startTime) / 1000;
                    const newRecId = `rec-${Date.now()}`;
                    
                    const finalizeNoteCreation = (transcriptText: string) => {
                        const hasTranscription = transcriptText.trim().length > 0;
                        const defaultContent = hasTranscription 
                            ? transcriptText.trim() 
                            : 'Voice Recording\n[Attached Audio]';
                        
                        const currentNoteId = selectedNoteIdRef.current;
                        const currentNotes = notesRef.current;
                        const currentActiveNote = currentNotes.find(n => n.id === currentNoteId) || null;

                        const shouldUpdate = currentNoteId && currentActiveNote && !forceNewRecordingRef.current;
                        
                        let finalizedNoteId = '';
                        if (shouldUpdate && currentActiveNote) {
                            finalizedNoteId = currentNoteId;
                            let updatedContent = currentActiveNote.content || '';
                            if (updatedContent === 'Voice Recording\n[Attached Audio]' || updatedContent === '') {
                                updatedContent = hasTranscription ? transcriptText.trim() : defaultContent;
                            } else if (hasTranscription) {
                                updatedContent = updatedContent.trim() + '\n' + transcriptText.trim();
                            }
                            
                            const existingRealPhrases = (currentActiveNote.phrases || []).filter(p => !p.id.startsWith('placeholder-'));
                            const updatedPhrases = syncPhrasesWithContent(updatedContent, existingRealPhrases);
                            
                            const existingAudioNotes = currentActiveNote.audioNotes || [];
                            const migratedNotes = [...existingAudioNotes];
                            if (currentActiveNote.audioUrl && migratedNotes.length === 0) {
                                migratedNotes.push({
                                    id: 'audio-init',
                                    url: currentActiveNote.audioUrl,
                                    title: currentActiveNote.title || 'Audio 1',
                                    duration: currentActiveNote.recordingDuration || 0,
                                    groupId: currentActiveNote.audioGroupId || null
                                });
                            }
                            const newAudioNotes = [
                                ...migratedNotes,
                                {
                                    id: newRecId,
                                    url: url,
                                    title: `Audio ${migratedNotes.length + 1}`,
                                    duration: durationSeconds,
                                    groupId: null
                                }
                            ];
                            
                            handleUpdateNote(currentNoteId, { 
                                audioUrl: url,
                                audioNotes: newAudioNotes,
                                content: updatedContent,
                                phrases: updatedPhrases,
                                verses: currentActiveNote.verses || [],
                                isAudioOnly: currentActiveNote.isAudioOnly === true ? !hasTranscription : false
                            });
                        } else {
                            // Check if a note was created during speech recognition in this session
                            const noteCreatedDuringSession = currentNoteId && currentNoteId !== startingNoteId;
                            if (noteCreatedDuringSession) {
                                finalizedNoteId = currentNoteId;
                                const updatedContent = hasTranscription ? transcriptText.trim() : (currentActiveNote?.content || defaultContent);
                                const updatedPhrases = syncPhrasesWithContent(updatedContent, []);
                                
                                const existingAudioNotes = currentActiveNote?.audioNotes || [];
                                const migratedNotes = [...existingAudioNotes];
                                if (currentActiveNote?.audioUrl && migratedNotes.length === 0) {
                                    migratedNotes.push({
                                        id: 'audio-init',
                                        url: currentActiveNote.audioUrl,
                                        title: currentActiveNote.title || 'Audio 1',
                                        duration: currentActiveNote.recordingDuration || 0,
                                        groupId: currentActiveNote.audioGroupId || null
                                    });
                                }
                                const newAudioNotes = [
                                    ...migratedNotes,
                                    {
                                        id: newRecId,
                                        url: url,
                                        title: `Audio ${migratedNotes.length + 1}`,
                                        duration: durationSeconds,
                                        groupId: null
                                    }
                                ];
                                
                                handleUpdateNote(currentNoteId, {
                                    audioUrl: url,
                                    audioNotes: newAudioNotes,
                                    content: updatedContent,
                                    phrases: updatedPhrases,
                                    isAudioOnly: !hasTranscription
                                });
                            } else {
                                const newId = `n-${Date.now()}`;
                                finalizedNoteId = newId;
                                const title = recordingTitle.trim() || `Recording ${new Date().toLocaleDateString()}`;
                                const initialPhrases = syncPhrasesWithContent(defaultContent, []);
                                
                                const initialAudioNotes = [
                                    {
                                        id: newRecId,
                                        url: url,
                                        title: `Audio 1`,
                                        duration: durationSeconds,
                                        groupId: null
                                    }
                                ];
                                
                                const newNote: SongNote = {
                                    id: newId,
                                    title: title,
                                    content: defaultContent,
                                    folderId: activeFolderIdFilter,
                                    updatedAt: timestamp,
                                    audioUrl: url,
                                    audioNotes: initialAudioNotes,
                                    phrases: initialPhrases,
                                    verses: [],
                                    isAudioOnly: !hasTranscription
                                };
                                setNotes(prev => [newNote, ...prev]);
                                setSelectedNoteId(newNote.id);
                            }
                        }
                        setRecordingTitle('');
                        setIsTranscribing(false);
                        setIsRecordingSaving(false);
                        forceNewRecordingRef.current = false;

                        // Upload recorded audio file to cloud storage asynchronously
                        if (finalizedNoteId) {
                            uploadRecordedAudio(audioBlob, finalizedNoteId, newRecId);
                        }
                    };

                    // Wait briefly for speech recognition to finalize its last results
                    setTimeout(async () => {
                        let finalTranscript = speechTranscriptRef.current.trim();
                        
                        // Fallback to Google Cloud Speech-to-Text API if empty but recording duration is significant (> 1.5s)
                        if (runSpeech && !finalTranscript && durationSeconds > 1.5) {
                            try {
                                const wavBlob = await getWavBlob(audioBlob);
                                const response = await fetch('/api/transcribe', {
                                    method: 'POST',
                                    body: wavBlob,
                                });
                                if (response.ok) {
                                    const data = await response.json();
                                    if (data.text) {
                                        finalTranscript = data.text;
                                    }
                                } else {
                                    console.error('Server transcription failed status:', response.status);
                                }
                            } catch (e) {
                                console.error('Error in mobile fallback transcription API call:', e);
                            }
                        }
                        
                        finalizeNoteCreation(finalTranscript);
                    }, 1200);
                };
                
                mediaRecorder.start();
            }
            
            // Web Speech API Transcription setup
            if (runSpeech) {
                speechTranscriptRef.current = '';
                speechTranscriptAccumulated.current = '';
                speechTranscriptSession.current = '';
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    try {
                        const recognition = new SpeechRecognition();
                        recognition.continuous = true;
                        recognition.interimResults = true;
                        recognition.lang = 'en-US';
                        
                        recognition.onresult = (event: any) => {
                            let interimTranscript = '';
                            let finalTranscriptForSession = '';
                            
                            for (let i = 0; i < event.results.length; ++i) {
                                if (event.results[i].isFinal) {
                                    finalTranscriptForSession += event.results[i][0].transcript + ' ';
                                } else {
                                    interimTranscript += event.results[i][0].transcript;
                                }
                            }
                            
                            speechTranscriptSession.current = finalTranscriptForSession;
                            
                            const liveText = (speechTranscriptAccumulated.current + ' ' + finalTranscriptForSession + interimTranscript).trim().replace(/\s+/g, ' ');
                            speechTranscriptRef.current = (speechTranscriptAccumulated.current + ' ' + finalTranscriptForSession).trim().replace(/\s+/g, ' ');
                            
                            const currentNoteId = selectedNoteIdRef.current;
                            if (liveText && currentNoteId) {
                                handleUpdateNote(currentNoteId, {
                                    content: liveText,
                                    title: getTitleFromContent(liveText) || 'Untitled Note'
                                });
                            } else if (liveText && !currentNoteId) {
                                const title = recordingTitle.trim() || `Transcription ${new Date().toLocaleDateString()}`;
                                const newNoteId = `n-${Date.now()}`;
                                selectedNoteIdRef.current = newNoteId; // Update ref immediately to prevent duplication in rapid events
                                const newNote: SongNote = {
                                    id: newNoteId,
                                    title: title,
                                    content: liveText,
                                    folderId: activeFolderIdFilter,
                                    updatedAt: new Date().toLocaleString(),
                                    phrases: [],
                                    verses: [],
                                    isAudioOnly: false
                                };
                                setNotes(prev => [newNote, ...prev]);
                                setSelectedNoteId(newNoteId);
                            }
                        };
                        
                        recognition.onerror = (err: any) => {
                            console.error("Speech recognition error:", err);
                        };
                        
                        recognition.onend = () => {
                            speechTranscriptAccumulated.current = (speechTranscriptAccumulated.current + ' ' + speechTranscriptSession.current).trim().replace(/\s+/g, ' ');
                            speechTranscriptSession.current = '';
                            speechTranscriptRef.current = speechTranscriptAccumulated.current;
                            if (isRecordingRef.current && !isPausedRef.current) {
                                try {
                                    recognition.start();
                                } catch (e) {
                                    console.error("Failed to auto-restart SpeechRecognition:", e);
                                }
                            }
                        };
                        
                        recognitionRef.current = recognition;
                        recognition.start();
                    } catch (e) {
                        console.error("SpeechRecognition initialization failed:", e);
                    }
                }
            }
            
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            
            // Recording timer
            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
            
            if (runAudio) {
                // Start visualizer animation
                animateVisualizer();
            }
            
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Microphone access is required. Please check browser permissions.");
        }
    };

    const animateVisualizer = () => {
        if (!visualizerContainerRef.current) return;
        
        const draw = () => {
            if (analyserRef.current && dataArrayRef.current && visualizerContainerRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
                const bars = visualizerContainerRef.current.querySelectorAll('.voice-bar');
                const length = bars.length;
                if (length > 0) {
                    const step = Math.floor(dataArrayRef.current.length / length);
                    
                    for (let i = 0; i < length; i++) {
                        const bar = bars[i] as HTMLDivElement;
                        if (bar) {
                            let sum = 0;
                            const start = i * step;
                            for (let j = 0; j < step; j++) {
                                sum += dataArrayRef.current[start + j];
                            }
                            const average = sum / step;
                            
                            const groupI = i % 12;
                            const distFromCenter = Math.abs(groupI - 5.5);
                            const scaling = 1 - (distFromCenter / 5.5) * 0.6;
                            
                            // Scale average to bar height in pixels (8px to 110px) with group scaling
                            const height = Math.max(8, (average / 255) * 110 * scaling);
                            bar.style.height = `${height}px`;
                            bar.style.backgroundColor = '#d6d3d1'; // Gray visualizer color
                        }
                    }
                }
            }
            animationFrameIdRef.current = requestAnimationFrame(draw);
        };
        
        draw();
    };

    const pauseRecording = () => {
        if (isRecording && !isPaused) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.pause();
            }
            setIsPaused(true);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    console.error("SpeechRecognition pause stop failed:", e);
                }
            }
            
            // Animate static waveform on pause
            if (mediaRecorderRef.current && visualizerContainerRef.current) {
                const bars = visualizerContainerRef.current.querySelectorAll('.voice-bar');
                for (let i = 0; i < bars.length; i++) {
                    const bar = bars[i] as HTMLDivElement;
                    if (bar) {
                        const groupI = i % 12;
                        const distFromCenter = Math.abs(groupI - 5.5);
                        const scaling = 1 - (distFromCenter / 5.5) * 0.6;
                        
                        // Gentle static waves with group scaling
                        const baseHeight = 16 + Math.sin(i * 0.3) * 16;
                        bar.style.height = `${Math.max(8, baseHeight * scaling)}px`;
                        bar.style.backgroundColor = '#d6d3d1'; // stone-300
                    }
                }
            }
        }
    };

    const resumeRecording = () => {
        if (isRecording && isPaused) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.resume();
            }
            setIsPaused(false);
            
            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
            
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    console.error("SpeechRecognition resume start failed:", e);
                }
            }
            
            if (mediaRecorderRef.current) {
                animateVisualizer();
            }
        }
    };

    const stopRecording = () => {
        if (isRecording) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            } else {
                // If it was transcribe-only (no mediaRecorder), we stop it manually!
                setIsTranscribing(true);
                setTimeout(() => {
                    const finalTranscript = speechTranscriptRef.current.trim();
                    const timestamp = new Date().toLocaleString();
                    
                    const currentNoteId = selectedNoteIdRef.current;
                    if (currentNoteId) {
                        const updatedPhrases = syncPhrasesWithContent(finalTranscript, []);
                        handleUpdateNote(currentNoteId, {
                            content: finalTranscript || 'Voice Transcription\n[No Text Captured]',
                            phrases: updatedPhrases,
                            isAudioOnly: false
                        });
                    } else {
                        const title = recordingTitle.trim() || `Transcription ${new Date().toLocaleDateString()}`;
                        const initialPhrases = syncPhrasesWithContent(finalTranscript || 'Voice Transcription\n[No Text Captured]', []);
                        const newNoteId = `n-${Date.now()}`;
                        selectedNoteIdRef.current = newNoteId;
                        const newNote: SongNote = {
                            id: newNoteId,
                            title: title,
                            content: finalTranscript || 'Voice Transcription\n[No Text Captured]',
                            folderId: activeFolderIdFilter,
                            updatedAt: timestamp,
                            phrases: initialPhrases,
                            verses: [],
                            isAudioOnly: false
                        };
                        setNotes(prev => [newNote, ...prev]);
                        setSelectedNoteId(newNoteId);
                    }
                    setIsTranscribing(false);
                    forceNewRecordingRef.current = false;
                }, 500);
            }
            cleanupRecordingStream();
            setIsRecording(false);
            setIsPaused(false);
        }
    };

    const cleanupRecordingStream = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
            recognitionRef.current = null;
        }
    };

    // Keep audio state in sync with selected note
    useEffect(() => {
        if (activeNote && activeNote.audioUrl) {
            setAudioUrl(activeNote.audioUrl);
            setRecordingTitle(activeNote.title);
            setIsPlaying(false);
            setPlaybackTime(0);
        } else {
            setAudioUrl(null);
            setPlaybackTime(0);
            setIsPlaying(false);
        }
    }, [selectedNoteId, activeNote?.audioUrl]);

    // Reset lastAwardedContent and initialize lastSavedContent when switching notes or after data loads
    useEffect(() => {
        setLastAwardedContent('');
        if (activeNote) {
            setLastSavedContent(activeNote.content || '');
        } else {
            setLastSavedContent('');
        }
    }, [selectedNoteId, isDataLoaded]);

    const togglePlayback = () => {
        if (!playbackAudioRef.current) return;
        if (isPlaying) {
            playbackAudioRef.current.pause();
            setIsPlaying(false);
        } else {
            playbackAudioRef.current.play().catch(err => console.error("Playback error:", err));
            setIsPlaying(true);
        }
    };

    const handleSeek = (time: number) => {
        if (playbackAudioRef.current) {
            playbackAudioRef.current.currentTime = time;
            setPlaybackTime(time);
        }
    };

    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        let clientX = 0;
        if ('touches' in e) {
            if (e.touches.length > 0) {
                clientX = e.touches[0].clientX;
            } else {
                return;
            }
        } else {
            clientX = e.clientX;
        }
        const clickX = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        if (playbackAudioRef.current && playbackDuration) {
            const newTime = percentage * playbackDuration;
            handleSeek(newTime);
        }
    };

    // Cleanup audio resources on unmount
    useEffect(() => {
        return () => {
            cleanupRecordingStream();
            if (metronomeIntervalRef.current) {
                clearInterval(metronomeIntervalRef.current);
            }
        };
    }, []);

    // Automatically adjust the height of the textarea to fit its text, keeping it centered
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [activeNote?.content, isEditing]);

    // Initialize phrases and verses for the selected note if not present
    useEffect(() => {
        if (selectedNoteId && isMounted) {
            const note = notes.find(n => n.id === selectedNoteId);
            if (note && (!note.phrases || note.phrases.length === 0) && note.content.trim() !== '') {
                const initialPhrases = syncPhrasesWithContent(note.content, []);
                setNotes(prev => prev.map(n => {
                    if (n.id === selectedNoteId && (!n.phrases || n.phrases.length === 0)) {
                        return {
                            ...n,
                            phrases: initialPhrases,
                            verses: n.verses || []
                        };
                    }
                    return n;
                }));
            }
        }
    }, [selectedNoteId, isMounted]);


    const handleCreateFolder = () => {
        const name = prompt("Enter folder name:");
        if (!name || name.trim() === '') return;
        const newFolder: SongFolder = {
            id: `f-${Date.now()}`,
            name: name.trim()
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const handleCreateNote = (folderId: string | null = null) => {
        const newNoteId = `n-${Date.now()}`;
        const newPhraseId = `p-${Math.random().toString(36).substring(2, 9)}`;
        const timestamp = new Date().toLocaleString();
        
        const newNote: SongNote = {
            id: newNoteId,
            title: '',
            content: '',
            folderId: folderId || activeFolderIdFilter,
            updatedAt: timestamp,
            phrases: [{
                id: newPhraseId,
                text: '',
                groupId: null
            }],
            verses: []
        };
        setNotes(prev => [newNote, ...prev]);
        setSelectedNoteId(newNoteId);
        setEditingPhraseId(newPhraseId);
    };

    const handleUpdateNote = (id: string, updates: Partial<SongNote>) => {
        setNotes(prev => prev.map(n => {
            if (n.id === id) {
                let finalTitle = updates.title !== undefined ? updates.title : n.title;
                if (n.isTitleLocked && updates.title !== undefined && !updates.isTitleLocked) {
                    finalTitle = n.title;
                }
                return {
                    ...n,
                    ...updates,
                    title: finalTitle,
                    updatedAt: new Date().toLocaleString()
                };
            }
            return n;
        }));
    };

    const handleRenameAudioNote = (noteId: string, audioNoteId: string, newTitle: string) => {
        setNotes(prev => prev.map(n => {
            if (n.id === noteId) {
                const updatedAudioNotes = (n.audioNotes || []).map(an => {
                    if (an.id === audioNoteId) {
                        return { ...an, title: newTitle };
                    }
                    return an;
                });
                return {
                    ...n,
                    audioNotes: updatedAudioNotes
                };
            }
            return n;
        }));
    };

    const handleDeleteAudioNote = (noteId: string, audioNoteId: string) => {
        if (!confirm("Are you sure you want to delete this audio recording?")) return;
        setNotes(prev => prev.map(n => {
            if (n.id === noteId) {
                const updatedAudioNotes = (n.audioNotes || []).filter(an => an.id !== audioNoteId);
                const latestAudio = updatedAudioNotes[updatedAudioNotes.length - 1];
                return {
                    ...n,
                    audioNotes: updatedAudioNotes,
                    audioUrl: latestAudio ? latestAudio.url : ''
                };
            }
            return n;
        }));
    };

    const handleUpdateAudioNoteGroup = (noteId: string, audioNoteId: string, targetGroupId: string | null) => {
        setNotes(prev => prev.map(n => {
            if (n.id === noteId) {
                const updatedAudioNotes = (n.audioNotes || []).map(an => {
                    if (an.id === audioNoteId) {
                        return { ...an, groupId: targetGroupId, phraseId: null };
                    }
                    return an;
                });
                return {
                    ...n,
                    audioNotes: updatedAudioNotes
                };
            }
            return n;
        }));
    };

    const handleAttachAudioToPhrase = (audioNoteId: string, phraseId: string | null, groupId: string | null) => {
        if (!selectedNoteId) return;
        setNotes(prev => prev.map(n => {
            if (n.id === selectedNoteId) {
                const updatedAudioNotes = (n.audioNotes || []).map(an => {
                    if (an.id === audioNoteId) {
                        return { ...an, groupId, phraseId };
                    }
                    return an;
                });
                return {
                    ...n,
                    audioNotes: updatedAudioNotes
                };
            }
            return n;
        }));
    };

    const handleStartEditing = (phraseId: string) => {
        setEditingPhraseId(phraseId);
    };

    const handleStopEditing = (createNext = false) => {
        if (selectedNoteId && activeNote && editingPhraseId) {
            const currentPhrases = activeNote.phrases || [];
            const editingIdx = currentPhrases.findIndex(p => p.id === editingPhraseId);
            const editingPhrase = currentPhrases[editingIdx];
            
            let finalPhrases = [...currentPhrases];
            let nextPhraseId: string | null = null;
            
            if (editingPhrase && editingPhrase.text.trim() === '') {
                finalPhrases = currentPhrases.filter(p => p.id !== editingPhraseId);
            } else if (createNext && editingPhrase) {
                const newPhraseId = `p-${Math.random().toString(36).substring(2, 9)}`;
                const newPhrase: Phrase = {
                    id: newPhraseId,
                    text: '',
                    groupId: editingPhrase.groupId
                };
                finalPhrases.splice(editingIdx + 1, 0, newPhrase);
                nextPhraseId = newPhraseId;
            }
            
            const sanitizedPhrases = cleanupAndEnsurePlaceholders(finalPhrases, activeNote.verses || []);
            const newContent = sanitizedPhrases.map(p => p.text).join('\n');
            
            handleUpdateNote(selectedNoteId, {
                phrases: sanitizedPhrases,
                content: newContent,
                title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
            });
            
            setEditingPhraseId(nextPhraseId);
        } else {
            setEditingPhraseId(null);
        }
    };

    const handleUpdatePhraseText = (phraseId: string, newText: string) => {
        if (!selectedNoteId || !activeNote) return;
        
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
            
        const updatedPhrases = currentPhrases.map(p => {
            if (p.id === phraseId) {
                return { ...p, text: newText };
            }
            return p;
        });
        
        const newContent = updatedPhrases.map(p => p.text).join('\n');
        
        handleUpdateNote(selectedNoteId, {
            phrases: updatedPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
        });
    };

    const handleAddNewPhrase = (groupId: string | null = null) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        const newPhraseId = `p-${Math.random().toString(36).substring(2, 9)}`;
        const newPhrase: Phrase = {
            id: newPhraseId,
            text: '',
            groupId: groupId
        };
        
        const updatedPhrases = [...currentPhrases, newPhrase];
        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, activeNote.verses || []);
        const newContent = finalPhrases.map(p => p.text).join('\n');
        
        handleUpdateNote(selectedNoteId, {
            phrases: finalPhrases,
            content: newContent
        });
        setEditingPhraseId(newPhraseId);
    };

    const handleTranscribeAudioNote = async (noteId: string, audioNoteId: string, audioUrl: string) => {
        const targetNote = notes.find(n => n.id === noteId);
        if (!targetNote) return;
        
        setTranscribingAudioNoteId(audioNoteId);
        setIsTranscribing(true);
        try {
            const audioBlob = await fetch(audioUrl).then(r => r.blob());
            const wavBlob = await getWavBlob(audioBlob);
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: wavBlob,
            });
            if (response.ok) {
                const data = await response.json();
                if (data.text && data.text.trim()) {
                    const transcriptText = data.text.trim();
                    let currentContent = targetNote.content || '';
                    let updatedContent = '';
                    if (currentContent === 'Voice Recording\n[Attached Audio]' || currentContent.trim() === '') {
                        updatedContent = transcriptText;
                    } else {
                        updatedContent = currentContent.trim() + '\n' + transcriptText;
                    }
                    
                    const existingRealPhrases = (targetNote.phrases || []).filter(p => !p.id.startsWith('placeholder-'));
                    const updatedPhrases = syncPhrasesWithContent(updatedContent, existingRealPhrases);
                    
                    handleUpdateNote(noteId, {
                        content: updatedContent,
                        phrases: updatedPhrases,
                        isAudioOnly: false
                    });
                } else {
                    alert("Transcription returned no text. Please speak more clearly or record a longer audio.");
                }
            } else {
                console.error('Server transcription failed status:', response.status);
                alert("Transcription failed. Please try again.");
            }
        } catch (e) {
            console.error("Failed to transcribe audio note:", e);
            alert("Error trying to transcribe this audio recording.");
        } finally {
            setTranscribingAudioNoteId(null);
            setIsTranscribing(false);
        }
    };

    const uploadRecordedAudio = async (blob: Blob, noteId: string, recId: string) => {
        if (!user) return;
        try {
            const fileRef = storageRef(storage, `users/${user.uid}/recordings/${noteId}_${recId}.webm`);
            await uploadBytes(fileRef, blob);
            const downloadUrl = await getDownloadURL(fileRef);
            
            setNotes(prev => prev.map(n => {
                if (n.id === noteId) {
                    const updatedAudioNotes = (n.audioNotes || []).map(an => {
                        if (an.id === recId) {
                            return { ...an, url: downloadUrl };
                        }
                        return an;
                    });
                    const latestAudio = updatedAudioNotes[updatedAudioNotes.length - 1];
                    return {
                        ...n,
                        audioNotes: updatedAudioNotes,
                        audioUrl: latestAudio ? latestAudio.url : n.audioUrl
                    };
                }
                return n;
            }));
            console.log("Audio uploaded successfully to production storage:", downloadUrl);
        } catch (error) {
            console.error("Failed to upload recorded audio:", error);
        }
    };

    const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm("Are you sure you want to delete this note?")) return;
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNoteId === id) {
            setSelectedNoteId(null);
            setIsEditing(false);
        }
    };

    const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this folder? Notes inside will be kept uncategorized.")) return;
        
        setFolders(prev => prev.filter(f => f.id !== folderId));
        setNotes(prev => prev.map(n => {
            if (n.folderId === folderId) {
                return { ...n, folderId: null };
            }
            return n;
        }));
        if (activeFolderIdFilter === folderId) {
            setActiveFolderIdFilter(null);
        }
    };

    // Derived title logic (first line of the content)
    const getTitleFromContent = (content: string) => {
        const lines = content.trim().split('\n');
        const firstLine = lines[0] ? lines[0].trim() : '';
        if (!firstLine) return '';
        return firstLine.substring(0, 40);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        if (!selectedNoteId) {
            // Auto create note on first character typed
            const newNote: SongNote = {
                id: `n-${Date.now()}`,
                title: getTitleFromContent(val) || 'Untitled Note',
                content: val,
                folderId: activeFolderIdFilter,
                updatedAt: new Date().toLocaleString()
            };
            setNotes(prev => [newNote, ...prev]);
            setSelectedNoteId(newNote.id);
            setIsEditing(true);
        } else {
            // Update active note
            handleUpdateNote(selectedNoteId, { 
                content: val, 
                title: getTitleFromContent(val) || 'Untitled Note'
            });
        }
    };

    const handleNewNoteClick = () => {
        if (activeNote && activeNote.content.trim() === '') {
            if (textareaRef.current) textareaRef.current.focus();
            setIsEditing(true);
            return;
        }
        handleCreateNote(activeFolderIdFilter);
    };

    function syncPhrasesWithContent(content: string, existingPhrases: Phrase[] = []): Phrase[] {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const newPhrases: Phrase[] = [];
        const matchedIndices = new Set<number>();
        
        for (const line of lines) {
            let foundIdx = existingPhrases.findIndex((p, idx) => p.text === line && !matchedIndices.has(idx));
            if (foundIdx !== -1) {
                newPhrases.push({
                    id: existingPhrases[foundIdx].id,
                    text: line,
                    groupId: existingPhrases[foundIdx].groupId
                });
                matchedIndices.add(foundIdx);
            } else {
                foundIdx = existingPhrases.findIndex((p, idx) => 
                    (p.text.toLowerCase().includes(line.toLowerCase()) || 
                     line.toLowerCase().includes(p.text.toLowerCase())) && 
                    !matchedIndices.has(idx)
                );
                if (foundIdx !== -1) {
                    newPhrases.push({
                        id: existingPhrases[foundIdx].id,
                        text: line,
                        groupId: existingPhrases[foundIdx].groupId
                    });
                    matchedIndices.add(foundIdx);
                } else {
                    newPhrases.push({
                        id: `p-${Math.random().toString(36).substring(2, 9)}`,
                        text: line,
                        groupId: null
                    });
                }
            }
        }
        return newPhrases;
    }
    const triggerProgressBonus = (content: string, isAudio = false) => {
        const words = content.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 10 || isAudio) {
            const currentProgressStr = localStorage.getItem('songwriting-progress') || '35';
            let currentProgress = parseInt(currentProgressStr);
            const nextProgress = Math.min(100, currentProgress + 2);
            localStorage.setItem('songwriting-progress', nextProgress.toString());
            
            const proverbs = [
                "Remember, small actions makes progress",
                "Every line written brings you closer to your masterpiece.",
                "Consistency is the key to unlocking your creative genius.",
                "Great songs are not written, they are rewritten.",
                "A single word can spark a whole symphony.",
                "Small steps in songwriting lead to giant leaps in melody.",
                "You are building your legacy, one lyric at a time.",
                "Keep pouring your soul into the canvas; it is paying off.",
                "Crafting art requires patience, and you are doing great."
            ];
            const randomQuote = proverbs[Math.floor(Math.random() * proverbs.length)];
            localStorage.setItem('songwriting-progress-quote', randomQuote);
            localStorage.setItem('songwriting-progress-show-tooltip', 'true');
            
            if (nextProgress === 100) {
                localStorage.setItem('songwriting-progress-confetti', 'true');
            }
            
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }
    };

    const handleSaveNote = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedNoteId && activeNote) {
            const finalPhrases = cleanupAndEnsurePlaceholders(activeNote.phrases || [], activeNote.verses || []);
            handleUpdateNote(selectedNoteId, {
                phrases: finalPhrases,
                verses: activeNote.verses || []
            });
            setIsEditing(false); // Enter Suggestion Mode on Save
            
            // Progress bar and quotes trigger
            if (activeNote.content !== lastAwardedContent) {
                triggerProgressBonus(activeNote.content, true);
                setLastAwardedContent(activeNote.content);
            }
            setLastSavedContent(activeNote.content);
        }
    };

    const handleRevertChanges = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedNoteId && activeNote) {
            if (confirm("Are you sure you want to revert all unsaved changes for this note?")) {
                const revertedPhrases = syncPhrasesWithContent(lastSavedContent, []);
                handleUpdateNote(selectedNoteId, {
                    content: lastSavedContent,
                    phrases: revertedPhrases
                });
            }
        }
    };

    const handleMovePhraseToGroup = (phraseId: string, groupId: string | null) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        const phraseIdx = currentPhrases.findIndex(p => p.id === phraseId);
        if (phraseIdx === -1) return;
        
        const phrase = { ...currentPhrases[phraseIdx], groupId };
        const sourceGroupId = currentPhrases[phraseIdx].groupId;
        const remainingPhrases = currentPhrases.filter(p => p.id !== phraseId);
        
        // If the source group is now empty, insert a placeholder at the phrase's old position
        if (sourceGroupId !== null) {
            const sourceRealPhrases = remainingPhrases.filter(p => p.groupId === sourceGroupId && !p.id.startsWith('placeholder-'));
            if (sourceRealPhrases.length === 0) {
                const placeholderPhrase: Phrase = {
                    id: `placeholder-${sourceGroupId}`,
                    text: '',
                    groupId: sourceGroupId
                };
                remainingPhrases.splice(phraseIdx, 0, placeholderPhrase);
            }
        }
        
        let updatedPhrases: Phrase[] = [];
        
        if (groupId === null) {
            updatedPhrases = [...remainingPhrases, phrase];
        } else {
            const placeholderIdx = remainingPhrases.findIndex(p => p.id === `placeholder-${groupId}`);
            if (placeholderIdx !== -1) {
                // Replace placeholder with the new phrase to keep the group's position!
                remainingPhrases[placeholderIdx] = phrase;
                updatedPhrases = remainingPhrases;
            } else {
                const lastGroupPhraseIdx = remainingPhrases.map((p, idx) => ({ p, idx })).filter(x => x.p.groupId === groupId).pop()?.idx;
                if (lastGroupPhraseIdx !== undefined) {
                    remainingPhrases.splice(lastGroupPhraseIdx + 1, 0, phrase);
                    updatedPhrases = remainingPhrases;
                } else {
                    updatedPhrases = [...remainingPhrases, phrase];
                }
            }
        }
        
        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, activeNote.verses || []);
        
        const newContent = finalPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: finalPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || 'Untitled Note'
        });
    };

    const handleReorderPhrases = (draggedId: string, targetId: string) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        const draggedIdx = currentPhrases.findIndex(p => p.id === draggedId);
        const targetIdx = currentPhrases.findIndex(p => p.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1) return;
        
        const draggedPhrase = { ...currentPhrases[draggedIdx] };
        const targetPhrase = currentPhrases[targetIdx];
        const sourceGroupId = draggedPhrase.groupId;
        draggedPhrase.groupId = targetPhrase.groupId;
        
        const remainingPhrases = [...currentPhrases];
        remainingPhrases.splice(draggedIdx, 1);
        
        if (sourceGroupId !== null) {
            const sourceRealPhrases = remainingPhrases.filter(p => p.groupId === sourceGroupId && !p.id.startsWith('placeholder-'));
            if (sourceRealPhrases.length === 0) {
                const placeholderPhrase: Phrase = {
                    id: `placeholder-${sourceGroupId}`,
                    text: '',
                    groupId: sourceGroupId
                };
                remainingPhrases.splice(draggedIdx, 0, placeholderPhrase);
            }
        }
        
        const newTargetIdx = remainingPhrases.findIndex(p => p.id === targetId);
        remainingPhrases.splice(newTargetIdx, 0, draggedPhrase);
        
        const finalPhrases = cleanupAndEnsurePlaceholders(remainingPhrases, activeNote.verses || []);
        
        const newContent = finalPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: finalPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || 'Untitled Note'
        });
    };

    const handleInsertPhraseAt = (draggedId: string, targetId: string, position: 'top' | 'bottom' | null) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        const draggedIdx = currentPhrases.findIndex(p => p.id === draggedId);
        const targetIdx = currentPhrases.findIndex(p => p.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1) return;
        
        const draggedPhrase = { ...currentPhrases[draggedIdx] };
        const targetPhrase = currentPhrases[targetIdx];
        const sourceGroupId = draggedPhrase.groupId;
        draggedPhrase.groupId = targetPhrase.groupId;
        
        const remainingPhrases = [...currentPhrases];
        remainingPhrases.splice(draggedIdx, 1);
        
        if (sourceGroupId !== null) {
            const sourceRealPhrases = remainingPhrases.filter(p => p.groupId === sourceGroupId && !p.id.startsWith('placeholder-'));
            if (sourceRealPhrases.length === 0) {
                const placeholderPhrase: Phrase = {
                    id: `placeholder-${sourceGroupId}`,
                    text: '',
                    groupId: sourceGroupId
                };
                remainingPhrases.splice(draggedIdx, 0, placeholderPhrase);
            }
        }
        
        const newTargetIdx = remainingPhrases.findIndex(p => p.id === targetId);
        const insertIdx = position === 'top' ? newTargetIdx : newTargetIdx + 1;
        remainingPhrases.splice(insertIdx, 0, draggedPhrase);
        
        const finalPhrases = cleanupAndEnsurePlaceholders(remainingPhrases, activeNote.verses || []);
        
        const newContent = finalPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: finalPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || 'Untitled Note'
        });
    };

    const handleInsertGroupAt = (draggedGrpId: string, targetBlkId: string, position: 'top' | 'bottom' | null) => {
        if (!selectedNoteId || !activeNote) return;
        
        // Prevent self-match insertions
        if (draggedGrpId === targetBlkId) return;

        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        // Reorder in verses array (handles visual ordering for all groups, including empty ones)
        const currentVerses = activeNote.verses || [];
        const draggedVerseIdx = currentVerses.findIndex(v => v.id === draggedGrpId);
        let targetVerseIdx = currentVerses.findIndex(v => v.id === targetBlkId);
        
        let updatedVerses = [...currentVerses];
        
        if (draggedVerseIdx !== -1) {
            const draggedVerse = currentVerses[draggedVerseIdx];
            updatedVerses.splice(draggedVerseIdx, 1);
            
            if (targetVerseIdx === -1) {
                // targetBlkId might be a phraseId. Find the groupId of that phrase
                const targetPhrase = currentPhrases.find(p => p.id === targetBlkId);
                if (targetPhrase && targetPhrase.groupId) {
                    targetVerseIdx = updatedVerses.findIndex(v => v.id === targetPhrase.groupId);
                }
            } else {
                // Adjust index after splicing
                targetVerseIdx = updatedVerses.findIndex(v => v.id === targetBlkId);
            }
            
            if (targetVerseIdx !== -1) {
                const insertIdx = position === 'top' ? targetVerseIdx : targetVerseIdx + 1;
                updatedVerses.splice(insertIdx, 0, draggedVerse);
            } else {
                updatedVerses.push(draggedVerse);
            }
        }

        const draggedPhrases = currentPhrases.filter(p => p.groupId === draggedGrpId);
        
        if (draggedPhrases.length === 0) {
            // Dragged group is empty. Just save the updated verses array!
            handleUpdateNote(selectedNoteId, {
                verses: updatedVerses
            });
            return;
        }
        
        // Dragged group is not empty. Filter out dragged phrases from list
        const remainingPhrases = currentPhrases.filter(p => p.groupId !== draggedGrpId);
        
        // Calculate visual blocks to find correct target position
        const remainingRenderBlocks = getRenderBlocks(remainingPhrases, updatedVerses);
        
        let targetBlockIdx = remainingRenderBlocks.findIndex(b => 
            b.type === 'group' ? b.groupId === targetBlkId : b.phrases[0]?.id === targetBlkId
        );
        
        let targetPhraseIdx = 0;
        if (targetBlockIdx !== -1) {
            const endIdx = position === 'top' ? targetBlockIdx : targetBlockIdx + 1;
            for (let i = 0; i < endIdx && i < remainingRenderBlocks.length; i++) {
                targetPhraseIdx += remainingRenderBlocks[i].phrases.length;
            }
        } else {
            targetPhraseIdx = remainingPhrases.length;
        }
        
        const updatedPhrases = [...remainingPhrases];
        updatedPhrases.splice(targetPhraseIdx, 0, ...draggedPhrases);
        
        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, updatedVerses);
        
        const newContent = finalPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: finalPhrases,
            content: newContent,
            verses: updatedVerses,
            title: getTitleFromContent(newContent) || 'Untitled Note'
        });
    };

    const handleInsertPhraseAtBlockLevel = (draggedPhrsId: string, targetBlkId: string, position: 'top' | 'bottom' | null) => {
        if (!selectedNoteId || !activeNote) return;
        
        // Prevent self-match insertions
        if (draggedPhrsId === targetBlkId) return;

        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        const draggedIdx = currentPhrases.findIndex(p => p.id === draggedPhrsId);
        if (draggedIdx === -1) return;
        
        const draggedPhrase = { ...currentPhrases[draggedIdx] };
        const sourceGroupId = draggedPhrase.groupId;
        draggedPhrase.groupId = null; // Block level drops ungroup the phrase
        
        const remainingPhrases = [...currentPhrases];
        remainingPhrases.splice(draggedIdx, 1);
        
        // If the source group is now empty, insert a placeholder at draggedIdx
        if (sourceGroupId !== null) {
            const sourceRealPhrases = remainingPhrases.filter(p => p.groupId === sourceGroupId && !p.id.startsWith('placeholder-'));
            if (sourceRealPhrases.length === 0) {
                const placeholderPhrase: Phrase = {
                    id: `placeholder-${sourceGroupId}`,
                    text: '',
                    groupId: sourceGroupId
                };
                remainingPhrases.splice(draggedIdx, 0, placeholderPhrase);
            }
        }
        
        // Calculate visual blocks to find correct target position
        const remainingRenderBlocks = getRenderBlocks(remainingPhrases, activeNote.verses || []);
        
        let targetBlockIdx = remainingRenderBlocks.findIndex(b => 
            b.type === 'group' ? b.groupId === targetBlkId : b.phrases[0]?.id === targetBlkId
        );
        
        let targetPhraseIdx = 0;
        if (targetBlockIdx !== -1) {
            const endIdx = position === 'top' ? targetBlockIdx : targetBlockIdx + 1;
            for (let i = 0; i < endIdx && i < remainingRenderBlocks.length; i++) {
                targetPhraseIdx += remainingRenderBlocks[i].phrases.length;
            }
        } else {
            targetPhraseIdx = remainingPhrases.length;
        }
        
        remainingPhrases.splice(targetPhraseIdx, 0, draggedPhrase);
        
        const finalPhrases = cleanupAndEnsurePlaceholders(remainingPhrases, activeNote.verses || []);
        
        const newContent = finalPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: finalPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || 'Untitled Note'
        });
    };

    const handleAddVerseGroup = (type: 'Verse' | 'Chorus' | 'Bridge') => {
        if (!selectedNoteId || !activeNote) return;
        const currentVerses = activeNote.verses || [];
        const count = currentVerses.filter(v => v.name.startsWith(type)).length;
        const newGroup: VerseGroup = {
            id: `v-${Date.now()}`,
            name: `${type} ${count + 1}`
        };
        
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
            
        const placeholderPhrase: Phrase = {
            id: `placeholder-${newGroup.id}`,
            text: '',
            groupId: newGroup.id
        };
        
        const updatedPhrases = [...currentPhrases, placeholderPhrase];
        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, [...currentVerses, newGroup]);
        
        handleUpdateNote(selectedNoteId, {
            verses: [...currentVerses, newGroup],
            phrases: finalPhrases
        });
    };

    const handleDeleteVerseGroup = (groupId: string) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases || [];
        const updatedPhrases = currentPhrases.map(p => {
            if (p.groupId === groupId) {
                return { ...p, groupId: null };
            }
            return p;
        });
        const currentVerses = activeNote.verses || [];
        const updatedVerses = currentVerses.filter(v => v.id !== groupId);
        
        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, updatedVerses);
        
        handleUpdateNote(selectedNoteId, {
            phrases: finalPhrases,
            verses: updatedVerses
        });
    };

    const cleanupAndEnsurePlaceholders = (phrases: Phrase[], groups: VerseGroup[]): Phrase[] => {
        let updated = [...phrases];
        
        for (const group of groups) {
            const realPhrases = updated.filter(p => p.groupId === group.id && !p.id.startsWith('placeholder-'));
            if (realPhrases.length > 0) {
                updated = updated.filter(p => p.id !== `placeholder-${group.id}`);
            } else {
                const hasPlaceholder = updated.some(p => p.id === `placeholder-${group.id}`);
                if (!hasPlaceholder) {
                    updated.push({
                        id: `placeholder-${group.id}`,
                        text: '',
                        groupId: group.id
                    });
                }
            }
        }
        
        updated = updated.filter(p => {
            if (p.id.startsWith('placeholder-')) {
                const groupId = p.id.replace('placeholder-', '');
                return groups.some(g => g.id === groupId);
            }
            return true;
        });
        
        return updated;
    };

    const getActivePhrases = (note: SongNote | null): Phrase[] => {
        if (!note) return [];
        const basePhrases = note.phrases && note.phrases.length > 0 ? note.phrases : syncPhrasesWithContent(note.content);
        return cleanupAndEnsurePlaceholders(basePhrases, note.verses || []);
    };

    const getActiveVerses = (note: SongNote | null): VerseGroup[] => {
        if (!note) return [];
        return note.verses || [];
    };

    interface RenderBlock {
        type: 'ungrouped' | 'group';
        groupId: string | null;
        groupName?: string;
        phrases: Phrase[];
    }

    const getRenderBlocks = (phrases: Phrase[], groups: VerseGroup[]): RenderBlock[] => {
        const phrasesWithPlaceholders = cleanupAndEnsurePlaceholders(phrases, groups);
        const blocks: RenderBlock[] = [];
        let currentBlock: RenderBlock | null = null;
        
        for (const phrase of phrasesWithPlaceholders) {
            if (phrase.groupId === null) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                blocks.push({
                    type: 'ungrouped',
                    groupId: null,
                    phrases: [phrase]
                });
            } else {
                const group = groups.find(g => g.id === phrase.groupId);
                const groupName = group ? group.name : 'Verse';
                
                if (currentBlock && currentBlock.groupId === phrase.groupId) {
                    currentBlock.phrases.push(phrase);
                } else {
                    if (currentBlock) {
                        blocks.push(currentBlock);
                    }
                    currentBlock = {
                        type: 'group',
                        groupId: phrase.groupId,
                        groupName,
                        phrases: [phrase]
                    };
                }
            }
        }
        
        if (currentBlock) {
            blocks.push(currentBlock);
        }
        
        return blocks;
    };

    // Word suggestion click handler in Suggestion Mode
    const getCompatibilityScore = (word: string, context: string): number => {
        let hash = 0;
        const combined = word.toLowerCase() + context.toLowerCase();
        for (let i = 0; i < combined.length; i++) {
            hash = (hash << 5) - hash + combined.charCodeAt(i);
            hash |= 0;
        }
        return 45 + Math.abs(hash % 54);
    };

    const handleWordClick = (e: React.MouseEvent, word: string, tokenIndex: number) => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '');
        if (!cleanWord) return;

        setClickedWord(cleanWord);
        setClickedTokenIndex(tokenIndex);

        const rect = e.currentTarget.getBoundingClientRect();
        const parentRect = e.currentTarget.closest('.cursor-text')?.getBoundingClientRect();
        if (parentRect) {
            setPopoverPosition({
                top: rect.bottom - parentRect.top + 8, // 8px spacing
                left: rect.left - parentRect.left + (rect.width / 2)
            });
        }
    };

    const handleSelectSuggestion = (suggestion: string) => {
        if (selectedNoteId && clickedTokenIndex !== null && activeNote) {
            const wordsList = activeNote.content.split(/(\s+)/);
            const originalToken = wordsList[clickedTokenIndex];
            
            // Swap out alphabetical portion, keeping surrounding punctuation
            const match = originalToken.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
            if (match) {
                const pre = match[1];
                const post = match[3];
                wordsList[clickedTokenIndex] = pre + suggestion + post;
            } else {
                wordsList[clickedTokenIndex] = suggestion;
            }

            const newContent = wordsList.join('');
            
            handleUpdateNote(selectedNoteId, {
                content: newContent,
                title: getTitleFromContent(newContent) || 'Untitled Note'
            });
        }
        setClickedWord(null);
        setClickedTokenIndex(null);
    };

    const handleEditorCardClick = () => {
        if (!selectedNoteId) {
            handleCreateNote(activeFolderIdFilter);
        } else {
            if (activeNote && activeNote.content.trim() === '') {
                setIsEditing(true);
            }
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                }
            }, 50);
        }
    };

    // Native Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, noteId: string) => {
        e.dataTransfer.setData('text/plain', noteId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
        e.preventDefault();
        const noteId = e.dataTransfer.getData('text/plain');
        if (noteId) {
            handleUpdateNote(noteId, { folderId });
        }
    };

    const handleDropOnRoot = (e: React.DragEvent) => {
        e.preventDefault();
        const noteId = e.dataTransfer.getData('text/plain');
        if (noteId) {
            handleUpdateNote(noteId, { folderId: null });
        }
    };

    const notesFilteredByMode = notes;

    const filteredNotes = notesFilteredByMode.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter notes based on folder and search state
    const displayNotes = searchQuery !== '' 
        ? filteredNotes 
        : (activeFolderIdFilter 
            ? filteredNotes.filter(n => n.folderId === activeFolderIdFilter)
            : filteredNotes.filter(n => n.folderId === null));

    const contentVal = activeNote ? activeNote.content : '';
    const activePhrases = getActivePhrases(activeNote);
    const activeVerses = getActiveVerses(activeNote);
    const renderBlocks = getRenderBlocks(activePhrases, activeVerses);
    
    const phraseExists = (phraseId?: string | null) => {
        if (!phraseId) return false;
        return activeNote?.phrases?.some(p => p.id === phraseId) || false;
    };

    const isSaveDisabled = !activeNote || (activeNote.content === lastAwardedContent) || isRecording || isTranscribing;

    // Map each phrase to its absolute starting token index
    const allTokens = contentVal.split(/(\s+)/);
    const phraseTokenOffsets: Record<string, number> = {};
    let currentTokenIndex = 0;
    
    for (const phrase of activePhrases) {
        // Skip leading whitespace tokens in allTokens
        while (currentTokenIndex < allTokens.length && /^\s+$/.test(allTokens[currentTokenIndex])) {
            currentTokenIndex++;
        }
        phraseTokenOffsets[phrase.id] = currentTokenIndex;
        
        // Advance token index by the number of tokens in this phrase
        const phraseTokens = phrase.text.split(/(\s+)/);
        currentTokenIndex += phraseTokens.length;
    }

    const titleText = isRecording ? recordingTitle : (activeNote ? activeNote.title : '');

    useEffect(() => {
        if (titleMeasureRef.current) {
            const width = titleMeasureRef.current.offsetWidth;
            setTitleWidth(Math.min(550, Math.max(240, width + 20)));
        }
    }, [titleText, isDataLoaded]);

    const updateScrollbarInfo = () => {
        if (textareaRef.current) {
            setScrollHeight(textareaRef.current.scrollHeight);
            setClientHeight(textareaRef.current.clientHeight);
            setScrollTop(textareaRef.current.scrollTop);
        }
    };

    const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    useEffect(() => {
        updateScrollbarInfo();
        const update = () => {
            updateScrollbarInfo();
        };
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [contentVal, isEditing]);

    if (!isMounted) return null;

    return (
        <div className="w-full flex flex-col gap-0 md:gap-10 text-stone-900 font-sans min-h-[calc(100vh-12rem)] pt-0 pb-10 md:py-2">
            
            {/* 1. TYPING / WRITING CANVAS AREA (Top Panel) */}
            <div 
                id="writing-canvas"
                onDoubleClick={(e) => {
                    if (!selectedNoteId) {
                        handleCreateNote(activeFolderIdFilter);
                    } else {
                        handleAddNewPhrase(null);
                    }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const audioPillId = e.dataTransfer.getData('text/audio-pill');
                    if (audioPillId && activeNote) {
                        handleUpdateNote(activeNote.id, { audioGroupId: null });
                        return;
                    }
                    const audioNoteId = e.dataTransfer.getData('text/audio-note-id');
                    if (audioNoteId && activeNote) {
                        handleUpdateAudioNoteGroup(activeNote.id, audioNoteId, null);
                        return;
                    }
                    setDraggedPhraseId(null);
                    if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                    setDraggedGroupId(null);
                    if (draggedGroupIdRef) draggedGroupIdRef.current = null;
                    
                    const phraseId = e.dataTransfer.getData('text/plain') || draggedPhraseId;
                    if (phraseId) {
                        handleMovePhraseToGroup(phraseId, null);
                    }
                }}
                className="bg-[#FAF9F5] rounded-none md:rounded-[32px] p-4 md:p-8 flex flex-col min-h-[80vh] md:min-h-[560px] xl:min-h-[700px] 2xl:min-h-[820px] transition-all relative cursor-text justify-between w-full"
            >
                {/* 1a. Canvas Header (Title and Ellipsis Menu) */}
                <div className="w-full flex items-center justify-between gap-4 pb-4 border-b border-stone-200/40 select-none z-20">
                    <div className="flex-1 flex items-center justify-start gap-4 group relative">
                        {/* Hidden measuring span for accurate dynamic input width */}
                        <span 
                            ref={titleMeasureRef} 
                            className="absolute opacity-0 pointer-events-none invisible whitespace-pre font-medium text-xl md:text-[22px] font-sans"
                        >
                            {titleText || "Song and melody title"}
                        </span>
                        <input
                            type="text"
                            value={isRecording ? recordingTitle : (activeNote ? activeNote.title : '')}
                            placeholder="Song and melody title"
                            onChange={(e) => {
                                if (isRecording) {
                                    setRecordingTitle(e.target.value);
                                } else if (selectedNoteId) {
                                    handleUpdateNote(selectedNoteId, { title: e.target.value, isTitleLocked: true });
                                } else {
                                    // Auto-create a note if none is selected and user starts typing the title
                                    const newNote: SongNote = {
                                        id: `n-${Date.now()}`,
                                        title: e.target.value,
                                        content: '',
                                        folderId: activeFolderIdFilter,
                                        updatedAt: new Date().toLocaleString(),
                                        isTitleLocked: true
                                    };
                                    setNotes(prev => [newNote, ...prev]);
                                    setSelectedNoteId(newNote.id);
                                    setIsEditing(true);
                                }
                            }}
                            className="bg-transparent border-none outline-none font-medium text-xl md:text-[22px] text-stone-500 placeholder:text-stone-300 focus:text-stone-855 transition-colors cursor-text select-text"
                            style={{
                                width: `${titleWidth}px`
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 bg-stone-100 text-stone-600 border border-stone-200 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide flex items-center gap-1.5 pointer-events-none shadow-3xs select-none shrink-0 ml-[1%]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{metronomeBpm} BPM</span>
                        </div>
                    </div>
                    
                    {/* Ellipsis Dropdown Menu Options */}
                    <div className="relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCanvasMenu(!showCanvasMenu);
                            }}
                            className="w-8 h-8 rounded-full hover:bg-stone-100/80 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Options"
                        >
                            <MoreVertical size={18} />
                        </button>

                        {showCanvasMenu && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowCanvasMenu(false)} />
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-stone-200/60 rounded-[20px] shadow-[0_6px_28px_rgba(0,0,0,0.08)] p-3.5 z-40 flex flex-col gap-2.5">
                                    <div className="flex flex-col gap-1.5 pb-2 border-b border-stone-100">
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Songwriting Helpers</span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowSyllables(!showSyllables);
                                            }}
                                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer ${showSyllables ? 'bg-stone-900 text-white' : 'text-stone-700 bg-stone-50 hover:bg-stone-100'}`}
                                        >
                                            <span>Syllable Counter</span>
                                            <span className="text-[9px] font-bold uppercase">{showSyllables ? 'ON' : 'OFF'}</span>
                                        </button>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsMetronomePlaying(!isMetronomePlaying);
                                            }}
                                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer ${isMetronomePlaying ? 'bg-[#44403c] text-white' : 'text-stone-700 bg-stone-50 hover:bg-stone-100'}`}
                                        >
                                            <span>Metronome</span>
                                            <span className="text-[9px] font-bold uppercase">{isMetronomePlaying ? 'ON' : 'OFF'}</span>
                                        </button>
                                        
                                        <div className="flex items-center justify-between px-1 mt-1">
                                            <span className="text-[9px] text-stone-500 font-semibold">{metronomeBpm} BPM</span>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMetronomeBpm(b => Math.max(40, b - 5));
                                                    }}
                                                    className="w-4 h-4 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[10px]"
                                                >
                                                    -
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMetronomeBpm(b => Math.min(240, b + 5));
                                                    }}
                                                    className="w-4 h-4 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[10px]"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNewNoteClick();
                                            setShowCanvasMenu(false);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                        New Note
                                    </button>
                                    {selectedNoteId && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteNote(selectedNoteId);
                                                setShowCanvasMenu(false);
                                            }}
                                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-650 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                        >
                                            Delete Note
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                    <div className="w-full flex-grow flex-1 flex flex-col z-10 py-6 relative">
                        {selectedNoteId ? (
                            <div className="w-full flex flex-col gap-3 max-w-4xl mx-auto py-4 my-auto">
                                {/* 1b. Floating Interactive Audio Control Capsule Player Area */}
                                {(activeAudioNotes.filter(an => !an.groupId && !phraseExists(an.phraseId)).length > 0 || isRecordingSaving) && (
                                    <div className="flex flex-col items-center gap-3 w-full px-4 mt-2 select-none z-30">
                                        {activeAudioNotes.filter(an => !an.groupId && !phraseExists(an.phraseId)).map(audioNote => (
                                            <AudioCapsulePlayer 
                                                key={audioNote.id}
                                                audioNote={audioNote}
                                                onRename={(newTitle) => activeNote && handleRenameAudioNote(activeNote.id, audioNote.id, newTitle)}
                                                onDelete={() => activeNote && handleDeleteAudioNote(activeNote.id, audioNote.id)}
                                                onTranscribe={() => activeNote && handleTranscribeAudioNote(activeNote.id, audioNote.id, audioNote.url)}
                                                isTranscribing={transcribingAudioNoteId === audioNote.id}
                                                isDocked={false}
                                                onDragStart={(e) => {
                                                    e.stopPropagation();
                                                    e.dataTransfer.setData('text/audio-note-id', audioNote.id);
                                                }}
                                            />
                                        ))}
                                        {isRecordingSaving && <AudioCapsuleSkeleton />}
                                    </div>
                                )}
                                {renderBlocks.length === 0 ? (
                                    <div 
                                        className="flex-grow flex-1 flex flex-col items-center justify-center py-16 text-stone-300/80 italic text-center select-none cursor-pointer text-lg font-light hover:text-stone-400 transition-colors"
                                        onDoubleClick={() => handleAddNewPhrase()}
                                    >
                                        Double click to write a line, or use buttons below to add a section.
                                    </div>
                                ) : (
                                    renderBlocks.map((block, bIdx) => {
                                        const blockId = block.type === 'group' ? block.groupId! : block.phrases[0]?.id;
                                        
                                        return (
                                            <div 
                                                key={blockId || `block-${bIdx}`}
                                                className="block-wrapper w-full relative"
                                                data-block-id={blockId}
                                                onDragOver={(e) => {
                                                    const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                    const currentDraggedPhraseId = draggedPhraseId || (draggedPhraseIdRef ? draggedPhraseIdRef.current : null);
                                                    
                                                    if (currentDraggedGroupId || currentDraggedPhraseId) {
                                                        if (block.type === 'group' && currentDraggedGroupId === block.groupId) return;
                                                        if (block.type === 'ungrouped' && currentDraggedPhraseId === block.phrases[0]?.id) return;
                                                        
                                                        e.preventDefault();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const relativeY = e.clientY - rect.top;
                                                        const position = relativeY < rect.height / 2 ? 'top' : 'bottom';
                                                        
                                                        setDragOverBlockId(blockId);
                                                        setBlockDropPosition(position);
                                                    }
                                                }}
                                                onDragLeave={() => {
                                                    setDragOverBlockId(null);
                                                    setBlockDropPosition(null);
                                                }}
                                                onDrop={(e) => {
                                                    const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                    const currentDraggedPhraseId = draggedPhraseId || (draggedPhraseIdRef ? draggedPhraseIdRef.current : null);
                                                    
                                                    setDragOverBlockId(null);
                                                    setBlockDropPosition(null);
                                                    setDragOverGroupId(null);
                                                    
                                                    setDraggedGroupId(null);
                                                    if (draggedGroupIdRef) draggedGroupIdRef.current = null;
                                                    setDraggedPhraseId(null);
                                                    if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                                                    
                                                    if (currentDraggedGroupId && currentDraggedGroupId !== blockId) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleInsertGroupAt(currentDraggedGroupId, blockId, blockDropPosition);
                                                    } else if (currentDraggedPhraseId && currentDraggedPhraseId !== blockId) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleInsertPhraseAtBlockLevel(currentDraggedPhraseId, blockId, blockDropPosition);
                                                    }
                                                }}
                                            >
                                                {dragOverBlockId === blockId && blockDropPosition === 'top' && (
                                                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-black/50 rounded-[0.75px] transform -translate-y-1/2 pointer-events-none z-30 animate-pulse" />
                                                )}
                                                
                                                {block.type === 'group' ? (
                                                    (() => {
                                                        const isDragOverThisGroup = dragOverGroupId === block.groupId;
                                                        return (
                                                            <div 
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    if (draggedGroupIdRef) {
                                                                        draggedGroupIdRef.current = block.groupId;
                                                                    }
                                                                    setDraggedGroupId(block.groupId);
                                                                    e.dataTransfer.setData('text/plain', block.groupId || '');
                                                                    e.dataTransfer.setData('type', 'group');
                                                                }}
                                                                onDragEnd={() => {
                                                                    setTimeout(() => {
                                                                        if (draggedGroupIdRef) {
                                                                            draggedGroupIdRef.current = null;
                                                                        }
                                                                        setDraggedGroupId(null);
                                                                        setDragOverBlockId(null);
                                                                        setBlockDropPosition(null);
                                                                    }, 50);
                                                                }}
                                                                onTouchStart={(e) => {
                                                                    const touch = e.touches[0];
                                                                    groupStartXRef.current = touch.clientX;
                                                                    groupStartYRef.current = touch.clientY;
                                                                    groupIsTouchDraggingRef.current = false;
                                                                    
                                                                    groupTouchTimeoutRef.current = setTimeout(() => {
                                                                        groupIsTouchDraggingRef.current = true;
                                                                        setDraggedGroupId(block.groupId);
                                                                        if (draggedGroupIdRef) {
                                                                            draggedGroupIdRef.current = block.groupId;
                                                                        }
                                                                        if (navigator.vibrate) {
                                                                            navigator.vibrate(10);
                                                                        }
                                                                    }, 300);
                                                                }}
                                                                onTouchMove={(e) => {
                                                                    const touch = e.touches[0];
                                                                    if (!groupIsTouchDraggingRef.current) {
                                                                        const diffX = Math.abs(touch.clientX - groupStartXRef.current);
                                                                        const diffY = Math.abs(touch.clientY - groupStartYRef.current);
                                                                        if (diffX > 10 || diffY > 10) {
                                                                            clearTimeout(groupTouchTimeoutRef.current!);
                                                                        }
                                                                        return;
                                                                    }
                                                                    
                                                                    if (e.cancelable) {
                                                                        e.preventDefault();
                                                                    }
                                                                    
                                                                    const currentTarget = e.currentTarget as HTMLElement;
                                                                    const originalPointerEvents = currentTarget.style.pointerEvents;
                                                                    currentTarget.style.pointerEvents = 'none';
                                                                    
                                                                    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                                                                    
                                                                    currentTarget.style.pointerEvents = originalPointerEvents;
                                                                    
                                                                    if (!elem) return;
                                                                    
                                                                    const targetBlockWrapper = elem.closest('.block-wrapper');
                                                                    
                                                                    if (targetBlockWrapper) {
                                                                        const targetBlockId = targetBlockWrapper.getAttribute('data-block-id');
                                                                        if (targetBlockId && targetBlockId !== block.groupId) {
                                                                            const rect = targetBlockWrapper.getBoundingClientRect();
                                                                            const relativeY = touch.clientY - rect.top;
                                                                            const position = relativeY < rect.height / 2 ? 'top' : 'bottom';
                                                                            
                                                                            setDragOverBlockId(targetBlockId);
                                                                            setBlockDropPosition(position);
                                                                        }
                                                                    } else {
                                                                        setDragOverBlockId(null);
                                                                        setBlockDropPosition(null);
                                                                    }
                                                                }}
                                                                onTouchEnd={(e) => {
                                                                    clearTimeout(groupTouchTimeoutRef.current!);
                                                                    if (groupIsTouchDraggingRef.current) {
                                                                        groupIsTouchDraggingRef.current = false;
                                                                        
                                                                        const touch = e.changedTouches[0];
                                                                        
                                                                        const currentTarget = e.currentTarget as HTMLElement;
                                                                        const originalPointerEvents = currentTarget.style.pointerEvents;
                                                                        currentTarget.style.pointerEvents = 'none';
                                                                        
                                                                        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                                                                        
                                                                        currentTarget.style.pointerEvents = originalPointerEvents;
                                                                        
                                                                        let finalBlockId: string | null = null;
                                                                        if (elem) {
                                                                            const targetBlockWrapper = elem.closest('.block-wrapper');
                                                                            if (targetBlockWrapper) {
                                                                                finalBlockId = targetBlockWrapper.getAttribute('data-block-id');
                                                                            }
                                                                        }
                                                                        
                                                                        if (finalBlockId && finalBlockId !== block.groupId) {
                                                                            handleInsertGroupAt(block.groupId!, finalBlockId, blockDropPosition);
                                                                        }
                                                                        
                                                                        setDraggedGroupId(null);
                                                                        if (draggedGroupIdRef) {
                                                                            draggedGroupIdRef.current = null;
                                                                        }
                                                                        setDragOverBlockId(null);
                                                                        setBlockDropPosition(null);
                                                                    }
                                                                }}
                                                                onDragOver={(e) => {
                                                                    if (e.dataTransfer.types.includes('text/audio-note-id')) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        return;
                                                                    }
                                                                    const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                                    if (currentDraggedGroupId) {
                                                                        return;
                                                                    }
                                                                    e.preventDefault();
                                                                    if (dragOverGroupId !== block.groupId) {
                                                                        setDragOverGroupId(block.groupId);
                                                                    }
                                                                }}
                                                                onDragLeave={() => {
                                                                    setDragOverGroupId(null);
                                                                }}
                                                                onDrop={(e) => {
                                                                    const audioNoteId = e.dataTransfer.getData('text/audio-note-id');
                                                                    if (audioNoteId && activeNote) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleUpdateAudioNoteGroup(activeNote.id, audioNoteId, block.groupId);
                                                                        return;
                                                                    }
                                                                    const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                                    if (currentDraggedGroupId) {
                                                                        return;
                                                                    }
                                                                    
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setDragOverGroupId(null);
                                                                    
                                                                    setDraggedPhraseId(null);
                                                                    if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                                                                    
                                                                    const phraseId = e.dataTransfer.getData('text/plain') || draggedPhraseIdRef.current || draggedPhraseId;
                                                                    if (phraseId) {
                                                                        handleMovePhraseToGroup(phraseId, block.groupId);
                                                                    }
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAddNewPhrase(block.groupId);
                                                                }}
                                                                className={`verse-group-container border border-dashed rounded-[20px] p-8 pt-10 relative flex flex-col gap-2 min-h-[100px] transition-all duration-300 cursor-grab active:cursor-grabbing ${
                                                                    isDragOverThisGroup 
                                                                        ? 'border-black bg-stone-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] scale-[1.005]' 
                                                                        : 'border-stone-300/85 bg-stone-50/20 hover:border-stone-400'
                                                                } ${
                                                                    draggedGroupId === block.groupId ? 'opacity-30' : ''
                                                                }`}
                                                                data-group-id={block.groupId}
                                                            >
                                                                {/* Group Badge and Docked Audio Capsules absolute positioned at top */}
                                                                <div className="absolute -top-3.5 left-6 flex flex-wrap items-center gap-2 z-20">
                                                                    <div className="bg-black text-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-[4px] uppercase select-none flex items-center gap-1.5 shadow-sm h-[22px]">
                                                                        <span>{block.groupName}</span>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteVerseGroup(block.groupId!);
                                                                            }}
                                                                            className="hover:text-red-400 text-stone-400 font-bold ml-1 transition-colors cursor-pointer text-xs leading-none"
                                                                            title="Delete Group"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>

                                                                    {activeAudioNotes.filter(an => an.groupId === block.groupId).map(audioNote => (
                                                                        <AudioCapsulePlayer 
                                                                            key={audioNote.id}
                                                                            audioNote={audioNote}
                                                                            onRename={(newTitle) => activeNote && handleRenameAudioNote(activeNote.id, audioNote.id, newTitle)}
                                                                            onDelete={() => activeNote && handleDeleteAudioNote(activeNote.id, audioNote.id)}
                                                                            onTranscribe={() => activeNote && handleTranscribeAudioNote(activeNote.id, audioNote.id, audioNote.url)}
                                                                            isTranscribing={transcribingAudioNoteId === audioNote.id}
                                                                            isDocked={true}
                                                                            onDragStart={(e) => {
                                                                                e.stopPropagation();
                                                                                e.dataTransfer.setData('text/audio-note-id', audioNote.id);
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                
                                                                {block.phrases.filter(p => !p.id.startsWith('placeholder-')).length === 0 ? (
                                                                    <div className="text-center text-xs text-stone-400 py-4 italic select-none pointer-events-none">
                                                                        Drag lines here to add to {block.groupName}
                                                                    </div>
                                                                ) : (
                                                                    block.phrases.filter(p => !p.id.startsWith('placeholder-')).map((phrase) => {
                                                                        return (
                                                                            <div key={phrase.id} className="flex flex-col items-center w-full gap-2">
                                                                                <PhraseRow 
                                                                                    phrase={phrase}
                                                                                    draggedPhraseId={draggedPhraseId}
                                                                                    draggedPhraseIdRef={draggedPhraseIdRef}
                                                                                    setDraggedPhraseId={setDraggedPhraseId}
                                                                                    handleWordClick={handleWordClick}
                                                                                    handleReorderPhrases={handleReorderPhrases}
                                                                                    handleMovePhraseToGroup={handleMovePhraseToGroup}
                                                                                    tokenOffset={phraseTokenOffsets[phrase.id] || 0}
                                                                                    dragOverPhraseId={dragOverPhraseId}
                                                                                    dropPosition={dropPosition}
                                                                                    setDragOverPhraseId={setDragOverPhraseId}
                                                                                    setDropPosition={setDropPosition}
                                                                                    handleInsertPhraseAt={handleInsertPhraseAt}
                                                                                    setDragOverGroupId={setDragOverGroupId}
                                                                                    draggedGroupId={draggedGroupId}
                                                                                    draggedGroupIdRef={draggedGroupIdRef}
                                                                                    showSyllables={showSyllables}
                                                                                    setDragOverBlockId={setDragOverBlockId}
                                                                                    setBlockDropPosition={setBlockDropPosition}
                                                                                    handleInsertPhraseAtBlockLevel={handleInsertPhraseAtBlockLevel}
                                                                                    blockDropPosition={blockDropPosition}
                                                                                    dragOverBlockId={dragOverBlockId}
                                                                                    handleAttachAudioToPhrase={handleAttachAudioToPhrase}
                                                                                    isCurrentlyEditing={editingPhraseId === phrase.id}
                                                                                    onStartEditing={handleStartEditing}
                                                                                    onStopEditing={handleStopEditing}
                                                                                    onUpdateText={handleUpdatePhraseText}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    (() => {
                                                        const phrase = block.phrases[0];
                                                        const phraseAudios = activeAudioNotes.filter(an => an.phraseId === phrase.id);
                                                        return (
                                                            <div className="flex flex-col items-center w-full gap-2">
                                                                {phraseAudios.map(audioNote => (
                                                                    <div key={audioNote.id} className="flex justify-center w-full py-1 select-none z-20">
                                                                        <AudioCapsulePlayer 
                                                                            audioNote={audioNote}
                                                                            onRename={(newTitle) => activeNote && handleRenameAudioNote(activeNote.id, audioNote.id, newTitle)}
                                                                            onDelete={() => activeNote && handleDeleteAudioNote(activeNote.id, audioNote.id)}
                                                                            onTranscribe={() => activeNote && handleTranscribeAudioNote(activeNote.id, audioNote.id, audioNote.url)}
                                                                            isTranscribing={transcribingAudioNoteId === audioNote.id}
                                                                            isDocked={false}
                                                                            onDragStart={(e) => {
                                                                                e.stopPropagation();
                                                                                e.dataTransfer.setData('text/audio-note-id', audioNote.id);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                                <PhraseRow 
                                                                    phrase={phrase}
                                                                    draggedPhraseId={draggedPhraseId}
                                                                    draggedPhraseIdRef={draggedPhraseIdRef}
                                                                    setDraggedPhraseId={setDraggedPhraseId}
                                                                    handleWordClick={handleWordClick}
                                                                    handleReorderPhrases={handleReorderPhrases}
                                                                    handleMovePhraseToGroup={handleMovePhraseToGroup}
                                                                    tokenOffset={phraseTokenOffsets[phrase.id] || 0}
                                                                    dragOverPhraseId={dragOverPhraseId}
                                                                    dropPosition={dropPosition}
                                                                    setDragOverPhraseId={setDragOverPhraseId}
                                                                    setDropPosition={setDropPosition}
                                                                    handleInsertPhraseAt={handleInsertPhraseAt}
                                                                    setDragOverGroupId={setDragOverGroupId}
                                                                    draggedGroupId={draggedGroupId}
                                                                    draggedGroupIdRef={draggedGroupIdRef}
                                                                    showSyllables={showSyllables}
                                                                    setDragOverBlockId={setDragOverBlockId}
                                                                    setBlockDropPosition={setBlockDropPosition}
                                                                    handleInsertPhraseAtBlockLevel={handleInsertPhraseAtBlockLevel}
                                                                    blockDropPosition={blockDropPosition}
                                                                    dragOverBlockId={dragOverBlockId}
                                                                    handleAttachAudioToPhrase={handleAttachAudioToPhrase}
                                                                    isCurrentlyEditing={editingPhraseId === phrase.id}
                                                                    onStartEditing={handleStartEditing}
                                                                    onStopEditing={handleStopEditing}
                                                                    onUpdateText={handleUpdatePhraseText}
                                                                />
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                                
                                                {dragOverBlockId === blockId && blockDropPosition === 'bottom' && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-black/50 rounded-[0.75px] transform translate-y-1/2 pointer-events-none z-30 animate-pulse" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="absolute inset-0 px-[10%] flex flex-col items-center justify-center pointer-events-none z-10">
                                <textarea
                                    ref={textareaRef}
                                    value={contentVal}
                                    onChange={handleTextareaChange}
                                    onScroll={handleTextareaScroll}
                                    onFocus={() => {
                                        setIsFocused(true);
                                        setTimeout(updateScrollbarInfo, 50);
                                    }}
                                    onBlur={() => {
                                        setIsFocused(false);
                                        setTimeout(updateScrollbarInfo, 50);
                                    }}
                                    className="w-full px-4 md:px-8 xl:px-16 bg-transparent border-none outline-none resize-none font-sans text-[26px] md:text-[42px] font-light text-stone-855 text-center tracking-[-0.035em] focus:ring-0 focus:outline-none overflow-y-auto max-h-[220px] md:max-h-[320px] xl:max-h-[460px] 2xl:max-h-[580px] leading-[1.4] no-scrollbar pointer-events-auto relative placeholder:text-stone-300/80 placeholder:font-light py-0"
                                    placeholder="Just start writing"
                                    style={{ 
                                        height: 'auto',
                                        minHeight: '1.4em'
                                    }}
                                />

                            </div>
                        )}
                    </div>

                {/* Floating Suggestions Popover Overlay */}
                {clickedWord && popoverPosition && (
                    <>
                        <div className="fixed inset-0 z-30" onClick={() => {
                            setClickedWord(null);
                            setClickedTokenIndex(null);
                            setPopoverPosition(null);
                        }} />
                        <div 
                            className={`
                                bg-white/95 backdrop-blur-md border border-stone-200/80 rounded-[24px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] z-40 flex flex-col gap-5 min-w-[280px] max-w-sm animate-in fade-in zoom-in-95 duration-200
                                ${isMobile ? 'fixed bottom-4 left-4 right-4 shadow-xl' : 'absolute'}
                            `}
                            style={isMobile ? undefined : { 
                                top: `${popoverPosition.top}px`, 
                                left: `${popoverPosition.left}px`,
                                transform: 'translateX(-50%)' 
                            }}
                        >
                            {/* Header: Hovered word + compatibility */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider select-none">Current Word</span>
                                    <span className="text-[11px] text-stone-500 font-bold">{getCompatibilityScore(clickedWord, contentVal)}% Compatible</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold text-stone-850">"{clickedWord}"</span>
                                    <div className="flex-grow h-2 bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: `${getCompatibilityScore(clickedWord, contentVal)}%` }} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-stone-100/80 my-0.5" />
                            
                            {/* Suggestions Alternatives */}
                            <div className="flex flex-col gap-2.5">
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider select-none">Elegant Alternatives</span>
                                <div className="grid grid-cols-1 gap-2">
                                    {getSuggestions(clickedWord).map((suggestion, idx) => {
                                        const score = getCompatibilityScore(suggestion, contentVal);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectSuggestion(suggestion);
                                                }}
                                                className="group flex items-center justify-between p-3.5 bg-stone-50/50 hover:bg-stone-900 border border-stone-200/50 hover:border-stone-900 rounded-[16px] transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                                            >
                                                <span className="text-[13px] font-bold text-stone-800 group-hover:text-white transition-colors">
                                                    {suggestion}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 h-1 bg-stone-200/70 group-hover:bg-white/20 rounded-full overflow-hidden">
                                                        <div className="h-full bg-stone-700 group-hover:bg-white rounded-full transition-all duration-300" style={{ width: `${score}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-stone-500 group-hover:text-white/80 transition-colors w-7 text-right">
                                                        {score}%
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 1c. Bottom controls bar */}
                <div 
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-col sm:flex-row justify-between items-center w-full px-4 md:px-8 mt-8 pb-4 select-none z-20 gap-4 sm:gap-0"
                >
                    {/* Left Side: Contextual action pills */}
                    <div className="flex flex-wrap items-center gap-2.5 h-auto">
                        {/* Section template buttons */}
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddVerseGroup('Chorus');
                                }}
                                className="px-5 py-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer font-sans"
                            >
                                Chorus
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddVerseGroup('Verse');
                                }}
                                className="px-5 py-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer font-sans"
                            >
                                Verse
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddVerseGroup('Bridge');
                                }}
                                className="px-5 py-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer font-sans"
                            >
                                Bridge
                            </button>
                        </div>

                        {/* Divider + Playback pills if audio exists */}
                        {activeNote?.audioUrl && (
                            <>
                                <div className="h-4 w-[1px] bg-stone-300 mx-1 hidden sm:block" />
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePillPlay();
                                        }}
                                        className="px-3.5 py-1.5 rounded-full bg-stone-200/60 hover:bg-stone-250 text-stone-750 text-[11px] font-bold transition-all active:scale-95 cursor-pointer font-sans"
                                    >
                                        play
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePillPause();
                                        }}
                                        className="px-3.5 py-1.5 rounded-full bg-stone-200/60 hover:bg-stone-250 text-stone-750 text-[11px] font-bold transition-all active:scale-95 cursor-pointer font-sans"
                                    >
                                        pause
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePillRestart();
                                        }}
                                        className="px-3.5 py-1.5 rounded-full bg-stone-200/60 hover:bg-stone-250 text-stone-750 text-[11px] font-bold transition-all active:scale-95 cursor-pointer font-sans"
                                    >
                                        restart
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePillTranscribe();
                                        }}
                                        className="px-3.5 py-1.5 rounded-full bg-stone-200/60 hover:bg-stone-250 text-stone-750 text-[11px] font-bold transition-all active:scale-95 cursor-pointer font-sans"
                                    >
                                        transcribe
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePillDelete();
                                        }}
                                        className="px-3.5 py-1.5 rounded-full bg-stone-250 hover:bg-red-50 hover:text-red-655 text-stone-755 text-[11px] font-bold transition-all active:scale-95 cursor-pointer font-sans"
                                    >
                                        delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right Side: Button Row (✓ SAVE, REC, +) */}
                    <div className="flex items-center gap-3">
                        {/* Revert adjustments button */}
                        {activeNote && activeNote.content !== lastSavedContent && (
                            <button
                                onClick={handleRevertChanges}
                                className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-2 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center"
                                title="Revert to last saved state"
                            >
                                <RotateCcw size={14} className="stroke-[2.5]" />
                            </button>
                        )}

                        {/* ✓ SAVE button */}
                        <button
                            onClick={isSaveDisabled ? undefined : handleCheckmarkSaveClick}
                            disabled={isSaveDisabled}
                            className={`font-bold text-xs uppercase tracking-wider transition-all duration-150 px-4 py-2 rounded-full ${
                                isSaveDisabled 
                                    ? 'text-stone-300 cursor-not-allowed opacity-35' 
                                    : 'text-[#1EB239] hover:bg-stone-50 hover:text-[#199931] cursor-pointer'
                            }`}
                        >
                            ✓ SAVE
                        </button>

                        {/* REC capsule button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isRecording) {
                                    stopRecording();
                                } else {
                                    startRecording();
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                                isRecording 
                                    ? 'bg-[#FF4040] text-white animate-pulse' 
                                    : 'border border-stone-300 bg-white text-stone-750 hover:bg-stone-50'
                            }`}
                        >
                            {isRecording ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-white animate-ping absolute" />
                                    <Square size={10} className="fill-white text-white shrink-0 z-10" />
                                    <span className="z-10">Recording {formatTime(recordingTime)}</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                    <span>REC</span>
                                </>
                            )}
                        </button>

                        {/* + button */}
                        <button
                            onClick={handlePlusClick}
                            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs ${
                                activeNote?.audioUrl 
                                    ? 'bg-black text-white hover:bg-stone-800' 
                                    : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-50'
                            }`}
                            title="New note"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. DIRECTORY GRID AREA (Bottom Section) */}
            <div className="space-y-6 mt-6 px-4 md:px-0">
                
                {/* Header Controls & Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 relative">
                        {activeFolderIdFilter ? (
                            <div className="flex items-center gap-2 text-[14px] font-bold text-stone-500">
                                <button 
                                    onClick={() => setActiveFolderIdFilter(null)}
                                    onDragOver={handleDragOver}
                                    onDragEnter={() => setIsDragOverRoot(true)}
                                    onDragLeave={() => setIsDragOverRoot(false)}
                                    onDrop={(e) => {
                                        handleDropOnRoot(e);
                                        setIsDragOverRoot(false);
                                    }}
                                    className={`transition-colors uppercase tracking-wider text-[11px] px-2 py-1 rounded-[8px] ${isDragOverRoot ? 'bg-stone-200 text-stone-800 border border-dashed border-stone-400' : 'hover:text-stone-800'}`}
                                >
                                    My folders and files
                                </button>
                                <span className="text-stone-300 font-normal">/</span>
                                <span className="text-stone-800 font-bold">{folders.find(f => f.id === activeFolderIdFilter)?.name}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-[15px] font-bold text-stone-550 uppercase tracking-wider">My folders and files</h2>
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowNewItemMenu(!showNewItemMenu)}
                                        className="w-6 h-6 rounded-full bg-stone-300/40 hover:bg-stone-300/60 text-stone-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    
                                    {showNewItemMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowNewItemMenu(false)} />
                                            <div className="absolute left-0 mt-2 w-40 bg-white border border-stone-200/60 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] z-20 overflow-hidden py-1">
                                                <button 
                                                    onClick={() => {
                                                        handleCreateFolder();
                                                        setShowNewItemMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Folder size={12} className="text-stone-500" />
                                                    New Folder
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        handleCreateNote(activeFolderIdFilter);
                                                        setShowNewItemMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2 cursor-pointer"
                                                >
                                                    <FileText size={12} className="text-stone-550" />
                                                    New File
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Search Field */}
                    <div className="flex items-center gap-2 bg-white/40 border border-stone-250/25 px-3.5 py-1.5 rounded-[12px] text-stone-750 w-44 focus-within:w-56 focus-within:bg-white focus-within:border-stone-355 transition-all duration-300">
                        <Search size={12} className="text-stone-400" />
                        <input 
                            type="text" 
                            placeholder="Search workspace..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-xs font-sans placeholder:text-stone-400 font-medium"
                        />
                    </div>
                </div>

                {/* Combined Folders/Files Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {/* Render Folders (Only on root view and not searching) */}
                    {activeFolderIdFilter === null && searchQuery === '' && (
                        folders.map(folder => {
                            const count = notes.filter(n => n.folderId === folder.id).length;
                            const isDragOverThis = dragOverFolderId === folder.id;
                            
                            return (
                                <div 
                                    key={folder.id}
                                    onClick={() => setActiveFolderIdFilter(folder.id)}
                                    onDragOver={handleDragOver}
                                    onDragEnter={() => setDragOverFolderId(folder.id)}
                                    onDragLeave={() => setDragOverFolderId(null)}
                                    onDrop={(e) => {
                                        handleDropOnFolder(e, folder.id);
                                        setDragOverFolderId(null);
                                    }}
                                    className={`
                                        group cursor-pointer flex flex-col gap-3 relative transition-all duration-300 rounded-[20px] md:rounded-[28px] p-2 md:p-4 -m-2 md:-m-4 border border-transparent
                                        hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-stone-200/40
                                        ${isDragOverThis ? 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-stone-400 scale-[1.03] ring-2 ring-stone-900/5' : ''}
                                    `}
                                >
                                    <FolderIllustration folderId={folder.id} />
                                    
                                    <div className="flex flex-col gap-0.5 text-center mt-1">
                                        <span className="font-bold text-[14px] text-stone-850 group-hover:text-stone-955 truncate transition-colors">
                                            {folder.name}
                                        </span>
                                        <span className="text-[11px] text-stone-400 font-semibold">
                                            {count} {count === 1 ? 'file' : 'files'}
                                        </span>
                                    </div>
                                    
                                    {/* Delete Folder */}
                                    <button 
                                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-all text-stone-405 z-10 cursor-pointer"
                                        title="Delete Folder"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })
                    )}

                    {/* Render Files / Notes */}
                    {displayNotes.map(note => {
                        const isSelected = selectedNoteId === note.id;
                        return (
                            <div 
                                key={note.id}
                                onClick={() => setSelectedNoteId(note.id)}
                                draggable
                                onDragStart={(e) => handleDragStart(e, note.id)}
                                className={`
                                    group cursor-pointer flex flex-col gap-3 relative transition-all duration-300 rounded-[20px] md:rounded-[28px] p-2 md:p-4 -m-2 md:-m-4 border border-transparent
                                    hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-stone-200/40 active:cursor-grabbing
                                    ${isSelected ? 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] border-stone-200/40' : ''}
                                `}
                            >
                                <FileIllustration />
                                
                                <div className="flex flex-col gap-0.5 text-center mt-1">
                                    <span className="font-bold text-[14px] text-stone-800 group-hover:text-stone-955 truncate transition-colors">
                                        {note.title || 'Untitled Note'}
                                    </span>
                                </div>
                                
                                {/* Delete Note */}
                                <button 
                                    onClick={(e) => handleDeleteNote(note.id, e)}
                                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-all text-stone-405 z-10 cursor-pointer"
                                    title="Delete Note"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        );
                    })}

                    {/* Empty States */}
                    {displayNotes.length === 0 && (activeFolderIdFilter !== null || searchQuery !== '') && (
                        <div className="col-span-full text-center py-16 border border-stone-200 border-dashed rounded-[28px] bg-white/20">
                            <p className="text-sm text-stone-400 italic">No notes found here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
