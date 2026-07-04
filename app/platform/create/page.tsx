"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, updateDoc, writeBatch, arrayRemove, deleteDoc, arrayUnion } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    migrateLegacyNotesToProjects,
    inviteCollaboratorByEmail,
    removeCollaboratorFromProject,
    getCollaboratorProfiles,
    calculateContributionsPercentage
} from './collabUtils';
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
    RotateCcw,
    Check,
    Ruler,
    Lightbulb,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Sparkles,
    Coffee,
    Heart,
    BookOpen,
    Key,
    ArrowUpRight,
    Compass,
    Brain,
    Share2,
    Users,
    UserPlus,
    Loader2
} from 'lucide-react';


interface InspirationCard {
    id: string;
    title: string;
    category: string;
    questions: string[];
    bgGradient: string;
    textColor: string;
}

const INSPIRATION_CARDS: InspirationCard[] = [
    {
        id: 'midnight-coffee',
        title: 'The Midnight Coffee Shop',
        category: 'Daily Life',
        bgGradient: 'from-amber-50 to-orange-100/50',
        textColor: 'text-amber-900',
        questions: [
            'Who is sitting at the table in the corner, and what are they writing?',
            'What song is playing quietly in the background?',
            'What secret does the barista know about this place?'
        ]
    },
    {
        id: 'childhood-bedroom',
        title: 'Your Childhood Bedroom',
        category: 'Nostalgia',
        bgGradient: 'from-rose-50 to-pink-100/55',
        textColor: 'text-rose-900',
        questions: [
            'What was the view outside the window on a rainy afternoon?',
            'If the walls could talk, what secret would they whisper?',
            'What object from that room do you miss the most?'
        ]
    },
    {
        id: 'forgotten-station',
        title: 'A Forgotten Train Station',
        category: 'History',
        bgGradient: 'from-blue-50 to-indigo-100/50',
        textColor: 'text-indigo-900',
        questions: [
            'Where were the passengers heading before the station was abandoned?',
            'What does the overgrown platform look like now?',
            'Whose ghost still waits for the 5:15 train?'
        ]
    },
    {
        id: 'forest-storm',
        title: 'Storm in the Forest',
        category: 'Nature',
        bgGradient: 'from-emerald-50 to-teal-100/50',
        textColor: 'text-emerald-900',
        questions: [
            'What color is the sky right before the first thunderclap?',
            'How do the trees react to the heavy wind?',
            'Where do the birds seek shelter?'
        ]
    },
    {
        id: 'edge-cosmos',
        title: 'The Edge of the Cosmos',
        category: 'Space & Sci-Fi',
        bgGradient: 'from-violet-50 to-purple-100/50',
        textColor: 'text-violet-900',
        questions: [
            'What does the silence of empty space sound like to you?',
            'If you could send a single message back to Earth, what would it say?',
            'What shape does the galaxy take from this distance?'
        ]
    },
    {
        id: 'clockmaker-dilemma',
        title: "The Clockmaker's Dilemma",
        category: 'Philosophy',
        bgGradient: 'from-stone-100 to-amber-100/30',
        textColor: 'text-stone-850',
        questions: [
            'If you could pause time for one hour, what would you fix?',
            'Does time move faster when we are looking away?',
            'What happens to a second that is forgotten?'
        ]
    },
    {
        id: 'solo-runner',
        title: 'The Solo Runner',
        category: 'Sports & Motion',
        bgGradient: 'from-lime-50 to-emerald-100/40',
        textColor: 'text-lime-900',
        questions: [
            'What rhythm does the heartbeat create at the peak of the run?',
            'What thoughts fade away with every mile passed?',
            'What is the runner escaping, or running toward?'
        ]
    },
    {
        id: 'locked-drawer',
        title: 'The Locked Drawer',
        category: 'Secrets & Dreams',
        bgGradient: 'from-orange-50 to-red-100/40',
        textColor: 'text-orange-900',
        questions: [
            'What key is hidden to open this drawer?',
            'What handwritten letter lies inside, yellowed with age?',
            'Why was it locked away in the first place?'
        ]
    }
];

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
    createdAt?: number;
}

const getAudioNoteTimestamp = (an: AudioNote): number => {
    if (!an) return 0;
    if (an.createdAt) {
        if (typeof an.createdAt === 'number') {
            return an.createdAt;
        }
        if (typeof an.createdAt === 'object' && an.createdAt !== null && 'seconds' in an.createdAt) {
            return (an.createdAt as any).seconds * 1000;
        }
        const parsed = Date.parse(an.createdAt as any);
        if (!isNaN(parsed)) {
            return parsed;
        }
    }
    if (an.id) {
        if (an.id.startsWith('rec-')) {
            const parsedId = parseInt(an.id.replace('rec-', ''));
            if (!isNaN(parsedId)) return parsedId;
        }
        if (an.id.startsWith('audio-')) {
            const parsedId = parseInt(an.id.replace('audio-', ''));
            if (!isNaN(parsedId)) return parsedId;
        }
    }
    return 0;
};

const sortAudioNotesChronologically = (notes: AudioNote[]) => {
    return [...notes].sort((a, b) => getAudioNoteTimestamp(a) - getAudioNoteTimestamp(b));
};


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

// Touch Drag Ghost — floating indicator following the finger during drag
function TouchDragGhost({ label, pos }: { label: string; pos: { x: number; y: number } | null }) {
    if (!pos) return null;
    return (
        <div
            className="fixed z-[9999] pointer-events-none select-none"
            style={{ left: pos.x - 40, top: pos.y - 20, transform: 'translate(0, -100%)' }}
        >
            <div className="bg-stone-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg opacity-85 whitespace-nowrap max-w-[180px] truncate">
                {label}
            </div>
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

// Helper to perform rect-based hit testing for mobile touch drag-and-drop
const getElementUnderTouch = (clientX: number, clientY: number, selector: string): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    const elements = document.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
        const elem = elements[i] as HTMLElement;
        const rect = elem.getBoundingClientRect();
        if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
        ) {
            return elem;
        }
    }
    return null;
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
    onUpdateText,
    onBackspaceAtStart,
    selectionOffset,
    draggedWord,
    setDraggedWord,
    dragOverWordIndex,
    setDragOverWordIndex,
    handleWordDrop,
    handleWordDropOnPhrase,
    hasAudioNote,
    handlePlaceAudioAsLineAt,
    draggedAudioId,
    draggedAudioIdRef,
    activeRemoteUsers
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
    onBackspaceAtStart?: (phraseId: string) => void;
    selectionOffset?: number;
    draggedWord?: { word: string; phraseId: string; wordIndex: number } | null;
    setDraggedWord?: (info: { word: string; phraseId: string; wordIndex: number } | null) => void;
    dragOverWordIndex?: { phraseId: string; wordIndex: number; position: 'left' | 'right' } | null;
    setDragOverWordIndex?: (info: { phraseId: string; wordIndex: number; position: 'left' | 'right' } | null) => void;
    handleWordDrop?: (source: any, target: any) => void;
    handleWordDropOnPhrase?: (source: any, targetPhraseId: string) => void;
    hasAudioNote?: boolean;
    handlePlaceAudioAsLineAt?: (audioNoteId: string, targetPhraseId: string, position: 'top' | 'bottom') => void;
    draggedAudioId?: string | null;
    draggedAudioIdRef?: React.RefObject<string | null>;
    activeRemoteUsers?: {[uid: string]: { name: string; color: string; cursor?: { x: number; y: number }; activePhraseId?: string | null }};
}) {
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTouchDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const touchStartTimeRef = useRef(0);
    const lastTapTimeRef = useRef<number>(0);
    
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (isCurrentlyEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            
            if (typeof selectionOffset === 'number') {
                textareaRef.current.setSelectionRange(selectionOffset, selectionOffset);
            } else {
                const valLength = phrase.text.length;
                textareaRef.current.setSelectionRange(valLength, valLength);
            }
        }
    }, [isCurrentlyEditing, selectionOffset, phrase.text]);
    
    if (phrase.text.trim() === '' && hasAudioNote && !isCurrentlyEditing) {
        return (
            <div 
                draggable
                onDragStart={(e) => {
                    e.stopPropagation();
                    if (draggedPhraseIdRef) draggedPhraseIdRef.current = phrase.id;
                    setDraggedPhraseId(phrase.id);
                    e.dataTransfer.setData('text/plain', phrase.id);
                }}
                onDragEnd={() => {
                    setTimeout(() => {
                        if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                        setDraggedPhraseId(null);
                        setDragOverPhraseId(null);
                        setDropPosition(null);
                    }, 50);
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverPhraseId(phrase.id);
                    setDropPosition('bottom');
                }}
                onDragLeave={() => {
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const currentDraggedAudioId = e.dataTransfer.getData('text/audio-note-id') || (draggedAudioIdRef ? draggedAudioIdRef.current : null) || draggedAudioId;
                    if (currentDraggedAudioId) {
                        if (handlePlaceAudioAsLineAt) {
                            handlePlaceAudioAsLineAt(currentDraggedAudioId, phrase.id, 'bottom');
                        }
                        setDragOverPhraseId(null);
                        setDropPosition(null);
                        return;
                    }
                    
                    const draggedId = e.dataTransfer.getData('text/plain') || (draggedPhraseIdRef ? draggedPhraseIdRef.current : null) || draggedPhraseId;
                    setDraggedPhraseId(null);
                    if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                    if (draggedId && draggedId !== phrase.id) {
                        handleInsertPhraseAt(draggedId, phrase.id, 'bottom');
                    }
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                }}
                className="phrase-row-container h-1 w-full relative"
                data-phrase-id={phrase.id}
            >
                {dragOverPhraseId === phrase.id && (
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500/80 rounded-full transform -translate-y-1/2 pointer-events-none z-30 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                    </div>
                )}
            </div>
        );
    }

    const wordsList = phrase.text.split(/(\s+)/);
    const isLockedByRemote = !!(phrase as any).lockedBy && !isCurrentlyEditing;
    const lockingUser = isLockedByRemote && activeRemoteUsers && (phrase as any).lockedBy ? activeRemoteUsers[(phrase as any).lockedBy] : null;
    const lockerName = lockingUser ? lockingUser.name : 'Collaborator';
    const lockerColor = lockingUser ? lockingUser.color : 'rose';

    const colorClasses = {
        rose: 'border-rose-300 bg-rose-50/15 text-rose-800',
        emerald: 'border-emerald-300 bg-emerald-50/15 text-emerald-800',
        amber: 'border-amber-300 bg-amber-50/15 text-amber-800',
        violet: 'border-violet-300 bg-violet-50/15 text-violet-800',
        cyan: 'border-cyan-300 bg-cyan-50/15 text-cyan-800',
        fuchsia: 'border-fuchsia-300 bg-fuchsia-50/15 text-fuchsia-800',
        indigo: 'border-indigo-300 bg-indigo-50/15 text-indigo-800'
    };
    const lockerClass = isLockedByRemote ? (colorClasses[lockerColor as keyof typeof colorClasses] || colorClasses.rose) : '';

    const badgeColorClasses = {
        rose: 'bg-rose-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        violet: 'bg-violet-500',
        cyan: 'bg-cyan-500',
        fuchsia: 'bg-fuchsia-500',
        indigo: 'bg-indigo-500'
    };
    const badgeBg = isLockedByRemote ? (badgeColorClasses[lockerColor as keyof typeof badgeColorClasses] || badgeColorClasses.rose) : '';
    
    return (
        <div 
            draggable={!isCurrentlyEditing && !isLockedByRemote}
            onDragStart={(e) => {
                if (isCurrentlyEditing || isLockedByRemote) return;
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
                
                // If it is a word drag
                if (e.dataTransfer.types.includes('text/word-drag-info') || draggedWord) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    setDragOverPhraseId(null);
                    setDropPosition(null);

                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeX = e.clientX - rect.left;
                    
                    const wordIndices: number[] = [];
                    wordsList.forEach((token, idx) => {
                        if (!/^\s+$/.test(token) && token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/)) {
                            wordIndices.push(idx);
                        }
                    });
                    
                    if (wordIndices.length === 0) {
                        if (setDragOverWordIndex) {
                            setDragOverWordIndex({ phraseId: phrase.id, wordIndex: -1, position: 'left' });
                        }
                    } else {
                        if (relativeX < rect.width / 2) {
                            if (setDragOverWordIndex) {
                                setDragOverWordIndex({ phraseId: phrase.id, wordIndex: wordIndices[0], position: 'left' });
                            }
                        } else {
                            if (setDragOverWordIndex) {
                                setDragOverWordIndex({ phraseId: phrase.id, wordIndex: wordIndices[wordIndices.length - 1], position: 'right' });
                            }
                        }
                    }
                    return;
                }

                // If it is an audio note drag
                const isAudioDrag = e.dataTransfer.types.includes('text/audio-note-id');
                if (isAudioDrag) {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const position = relativeY < rect.height / 2 ? 'top' : 'bottom';
                    setDragOverPhraseId(phrase.id);
                    setDropPosition(position);
                    return;
                }

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
                if (setDragOverWordIndex) setDragOverWordIndex(null);
            }}
            onDrop={(e) => {
                if (isCurrentlyEditing) return;
                
                const dragInfoStr = e.dataTransfer.getData('text/word-drag-info');
                if (dragInfoStr && handleWordDrop) {
                    e.preventDefault();
                    e.stopPropagation();
                    const dragInfo = JSON.parse(dragInfoStr);
                    
                    if (dragOverWordIndex && dragOverWordIndex.phraseId === phrase.id) {
                        handleWordDrop(dragInfo, {
                            phraseId: phrase.id,
                            targetWordIndex: dragOverWordIndex.wordIndex,
                            position: dragOverWordIndex.position
                        });
                    } else {
                        const wordIndices: number[] = [];
                        wordsList.forEach((token, idx) => {
                            if (!/^\s+$/.test(token) && token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/)) {
                                wordIndices.push(idx);
                            }
                        });
                        const targetIdx = wordIndices.length > 0 ? wordIndices[wordIndices.length - 1] : -1;
                        handleWordDrop(dragInfo, {
                            phraseId: phrase.id,
                            targetWordIndex: targetIdx,
                            position: 'right'
                        });
                    }
                    
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                    if (setDragOverWordIndex) setDragOverWordIndex(null);
                    if (setDraggedWord) setDraggedWord(null);
                    return;
                }

                const audioNoteId = e.dataTransfer.getData('text/audio-note-id') || (draggedAudioIdRef ? draggedAudioIdRef.current : null) || draggedAudioId;
                if (audioNoteId) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dropPosition === 'top' || dropPosition === 'bottom') {
                        if (handlePlaceAudioAsLineAt) {
                            handlePlaceAudioAsLineAt(audioNoteId, phrase.id, dropPosition);
                        }
                    } else if (handleAttachAudioToPhrase) {
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
                if (isCurrentlyEditing || isLockedByRemote) return;
                const touch = e.touches[0];
                startXRef.current = touch.clientX;
                startYRef.current = touch.clientY;
                touchStartTimeRef.current = Date.now();
                isTouchDraggingRef.current = false;
                
                touchTimeoutRef.current = setTimeout(() => {
                    isTouchDraggingRef.current = true;
                    setDraggedPhraseId(phrase.id);
                    if (draggedPhraseIdRef) {
                        draggedPhraseIdRef.current = phrase.id;
                    }
                    if (navigator.vibrate) {
                        navigator.vibrate(15);
                    }
                }, 300); // 300ms long press
            }}
            onTouchMove={(e) => {
                if (isCurrentlyEditing || isLockedByRemote) return;
                const touch = e.touches[0];
                if (!isTouchDraggingRef.current) {
                    const diffX = Math.abs(touch.clientX - startXRef.current);
                    const diffY = Math.abs(touch.clientY - startYRef.current);
                    if (diffX > 15 || diffY > 15) {
                        clearTimeout(touchTimeoutRef.current!);
                    }
                    return;
                }
                e.stopPropagation();
                
                if (e.cancelable) {
                    e.preventDefault();
                }
                
                const targetPhraseRow = getElementUnderTouch(touch.clientX, touch.clientY, '.phrase-row-container');
                const targetGroupRow = getElementUnderTouch(touch.clientX, touch.clientY, '.verse-group-container');
                const targetBlockWrapper = getElementUnderTouch(touch.clientX, touch.clientY, '.block-wrapper');
                
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
                    
                    const targetPhraseRow = getElementUnderTouch(touch.clientX, touch.clientY, '.phrase-row-container');
                    const targetGroupRow = getElementUnderTouch(touch.clientX, touch.clientY, '.verse-group-container');
                    const targetBlockWrapper = getElementUnderTouch(touch.clientX, touch.clientY, '.block-wrapper');
                    const isOverCanvas = !!getElementUnderTouch(touch.clientX, touch.clientY, '#writing-canvas');
                    
                    let finalPhraseId: string | null = null;
                    let finalGroupId: string | null = null;
                    let finalBlockId: string | null = null;
                    
                    if (targetPhraseRow) {
                        finalPhraseId = targetPhraseRow.getAttribute('data-phrase-id');
                    } else if (targetGroupRow) {
                        finalGroupId = targetGroupRow.getAttribute('data-group-id');
                    } else if (targetBlockWrapper) {
                        finalBlockId = targetBlockWrapper.getAttribute('data-block-id');
                    }
                    
                    if (finalPhraseId && finalPhraseId !== phrase.id) {
                        handleInsertPhraseAt(phrase.id, finalPhraseId, dropPosition);
                    } else if (finalGroupId && finalGroupId !== phrase.groupId) {
                        handleMovePhraseToGroup(phrase.id, finalGroupId);
                    } else if (finalBlockId && finalBlockId !== phrase.id) {
                        if (handleInsertPhraseAtBlockLevel) {
                            handleInsertPhraseAtBlockLevel(phrase.id, finalBlockId, blockDropPosition || null);
                        }
                    } else if (!finalPhraseId && !finalGroupId && !finalBlockId && isOverCanvas) {
                        handleMovePhraseToGroup(phrase.id, null);
                    }
                    
                    setDraggedPhraseId(null);
                    if (draggedPhraseIdRef) {
                        draggedPhraseIdRef.current = null;
                    }
                    setDragOverPhraseId(null);
                    setDropPosition(null);
                    if (setDragOverGroupId) setDragOverGroupId(null);
                    if (setDragOverBlockId) setDragOverBlockId(null);
                } else {
                    // Double-tap gesture handling for mobile
                    const now = Date.now();
                    const timeSinceLastTap = now - lastTapTimeRef.current;
                    const touch = e.changedTouches[0];
                    const diffX = Math.abs(touch.clientX - startXRef.current);
                    const diffY = Math.abs(touch.clientY - startYRef.current);
                    
                    if (diffX < 10 && diffY < 10) {
                        if (timeSinceLastTap < 300) {
                            e.preventDefault();
                            if (isLockedByRemote) return;
                            if (onStartEditing) onStartEditing(phrase.id);
                            lastTapTimeRef.current = 0;
                        } else {
                            lastTapTimeRef.current = now;
                        }
                    }
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (isLockedByRemote) return;
                if (onStartEditing) {
                    onStartEditing(phrase.id);
                }
            }}
            className="phrase-row-container flex flex-col w-full relative transition-all duration-200 animate-in fade-in"
            data-phrase-id={phrase.id}
        >
            {isLockedByRemote && (
                <div className={`absolute left-1/2 -translate-x-1/2 -top-3.5 select-none pointer-events-none text-white text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm z-40 ${badgeBg}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>{lockerName} Typing</span>
                </div>
            )}
            
            {dragOverPhraseId === phrase.id && dropPosition === 'top' && !hasAudioNote && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500/80 rounded-full transform -translate-y-1/2 pointer-events-none z-30 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                </div>
            )}
            
            {isCurrentlyEditing ? (
                <div className="text-[26px] md:text-[42px] font-light text-stone-855 leading-[1.4] tracking-[-0.035em] text-center max-w-4xl mx-auto w-full px-4">
                    <textarea
                        ref={textareaRef}
                        autoFocus
                        value={phrase.text}
                        placeholder=""
                        onChange={(e) => onUpdateText && onUpdateText(phrase.id, e.target.value)}
                        onBlur={() => onStopEditing && onStopEditing(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (onStopEditing) onStopEditing(true);
                            }
                            if (e.key === 'Backspace') {
                                const target = e.currentTarget;
                                if (target.selectionStart === 0 && target.selectionEnd === 0) {
                                    if (onBackspaceAtStart) {
                                        e.preventDefault();
                                        onBackspaceAtStart(phrase.id);
                                    }
                                }
                            }
                        }}
                        className="w-full bg-transparent border-none outline-none resize-none font-sans text-[26px] md:text-[42px] font-light text-stone-855 text-center tracking-[-0.035em] focus:ring-0 focus:outline-none leading-[1.4] py-0 no-scrollbar"
                        style={{ height: 'auto', minHeight: '1.4em' }}
                        inputMode="text"
                    />
                </div>
            ) : (
                <div 
                    className={`
                        phrase-row-text text-[26px] md:text-[42px] font-light text-stone-855 leading-[1.4] tracking-[-0.035em] text-center max-w-4xl mx-auto whitespace-pre-wrap select-none py-1.5 px-4 rounded-[16px] transition-all duration-200 w-full border border-transparent
                        ${isLockedByRemote ? `cursor-not-allowed border-dashed opacity-70 ${lockerClass}` : 'cursor-grab active:cursor-grabbing hover:border-stone-200/50 hover:bg-stone-50/30 group/line'}
                        ${draggedPhraseId === phrase.id ? 'opacity-30' : ''}
                    `}
                >
                    {wordsList.length === 1 && wordsList[0].trim() === '' && dragOverWordIndex?.phraseId === phrase.id && dragOverWordIndex?.wordIndex === -1 ? (
                        <span className="inline-block border-2 border-dashed border-indigo-400/80 bg-indigo-50/10 text-indigo-500 rounded-[12px] px-6 py-1 text-lg font-normal animate-pulse select-none mx-auto w-fit">
                            Drop word here
                        </span>
                    ) : (
                        wordsList.map((token, idx) => {
                            if (/^\s+$/.test(token)) {
                                return <span key={idx} className="whitespace-pre-wrap">{token}</span>;
                            }
                            
                            // Parse alphabetical word to isolate punctuation
                            const match = token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
                            if (match) {
                                const prePunc = match[1];
                                const word = match[2];
                                const postPunc = match[3];
                                
                                const isWordDragged = draggedWord?.phraseId === phrase.id && draggedWord?.wordIndex === idx;
                                const isWordDragOver = dragOverWordIndex?.phraseId === phrase.id && dragOverWordIndex?.wordIndex === idx;

                                return (
                                    <span key={idx} className={`inline-block ${draggedPhraseId !== null ? 'pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
                                        {prePunc}
                                        <span 
                                            draggable={!isCurrentlyEditing}
                                            onDragStart={(e) => {
                                                e.stopPropagation();
                                                const wordInfo = { word, phraseId: phrase.id, wordIndex: idx };
                                                if (setDraggedWord) setDraggedWord(wordInfo);
                                                e.dataTransfer.setData('text/plain', word);
                                                e.dataTransfer.setData('text/word-drag-info', JSON.stringify(wordInfo));
                                            }}
                                            onDragEnd={() => {
                                                if (setDraggedWord) setDraggedWord(null);
                                                if (setDragOverWordIndex) setDragOverWordIndex(null);
                                            }}
                                            onDragOver={(e) => {
                                                if (!draggedWord) return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const relativeX = e.clientX - rect.left;
                                                const position = relativeX < rect.width / 2 ? 'left' : 'right';
                                                if (setDragOverWordIndex) setDragOverWordIndex({ phraseId: phrase.id, wordIndex: idx, position });
                                            }}
                                            onDragLeave={() => {
                                                if (setDragOverWordIndex) setDragOverWordIndex(null);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const dragInfoStr = e.dataTransfer.getData('text/word-drag-info');
                                                if (dragInfoStr && handleWordDrop) {
                                                    const dragInfo = JSON.parse(dragInfoStr);
                                                    handleWordDrop(dragInfo, { phraseId: phrase.id, targetWordIndex: idx, position: dragOverWordIndex?.position || 'left' });
                                                }
                                                if (setDraggedWord) setDraggedWord(null);
                                                if (setDragOverWordIndex) setDragOverWordIndex(null);
                                            }}
                                            onClick={(e) => handleWordClick(e, word, tokenOffset + idx)}
                                            className={`
                                                word-token hover:bg-stone-200/90 text-stone-855 hover:text-stone-955 rounded-[8px] px-1.5 py-0.5 cursor-grab active:cursor-grabbing transition-all duration-150 inline-block select-none relative
                                                ${isWordDragged ? 'opacity-30' : ''}
                                                ${isWordDragOver ? 'bg-amber-100/80 scale-105' : ''}
                                            `}
                                        >
                                            {/* Left drop indicator line */}
                                            {isWordDragOver && dragOverWordIndex?.position === 'left' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-full transform -translate-x-1/2 pointer-events-none z-40 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                                                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                    <div className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                </div>
                                            )}
                                            
                                            {word}
                                            
                                            {/* Right drop indicator line */}
                                            {isWordDragOver && dragOverWordIndex?.position === 'right' && (
                                                <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-full transform translate-x-1/2 pointer-events-none z-40 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                                                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                    <div className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                </div>
                                            )}
                                        </span>
                                        {postPunc}
                                    </span>
                                );
                            }
                            return <span key={idx}>{token}</span>;
                        })
                    )}
                </div>
            )}

            {dragOverPhraseId === phrase.id && dropPosition === 'bottom' && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500/80 rounded-full transform translate-y-1/2 pointer-events-none z-30 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                </div>
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
    onDragEnd?: (e: React.DragEvent) => void;
    activeNoteId?: string;
    handleUpdateAudioNoteGroup?: (noteId: string, audioNoteId: string, targetGroupId: string | null) => void;
    handleAttachAudioToPhrase?: (audioNoteId: string, phraseId: string | null, groupId: string | null) => void;
    draggedAudioId?: string | null;
    setDraggedAudioId?: (id: string | null) => void;
    draggedAudioIdRef?: React.RefObject<string | null>;
    setDragOverGroupId?: (id: string | null) => void;
    setDragOverPhraseId?: (id: string | null) => void;
    dragOverGroupIdRef?: React.RefObject<string | null>;
    dragOverPhraseIdRef?: React.RefObject<string | null>;
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
            <div className="flex items-center gap-[2.5px] h-6 px-1.5 shrink-0" style={{ width: 'clamp(70px, 22vw, 130px)' }}>
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

function LyricLinesSkeleton() {
    return (
        <div className="flex flex-col gap-2.5 w-full max-w-sm mx-auto my-4 animate-pulse select-none">
            <div className="bg-stone-200/70 h-3.5 w-[70%] rounded-full mx-auto" />
            <div className="bg-stone-200/70 h-3.5 w-[55%] rounded-full mx-auto" />
        </div>
    );
}

function AudioCapsulePlayer({ 
    audioNote, 
    onRename, 
    onDelete, 
    onTranscribe, 
    isTranscribing, 
    isDocked, 
    onDragStart,
    onDragEnd,
    activeNoteId,
    handleUpdateAudioNoteGroup,
    handleAttachAudioToPhrase,
    draggedAudioId,
    setDraggedAudioId,
    draggedAudioIdRef,
    setDragOverGroupId,
    setDragOverPhraseId,
    dragOverGroupIdRef,
    dragOverPhraseIdRef
}: AudioCapsulePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(audioNote.duration || 0);
    const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTouchDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);

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
                onDragEnd={onDragEnd}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => {
                    if (isTranscribing) return;
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('input') || target.closest('svg')) {
                        return;
                    }
                    const touch = e.touches[0];
                    startXRef.current = touch.clientX;
                    startYRef.current = touch.clientY;
                    isTouchDraggingRef.current = false;
                }}
                onTouchMove={(e) => {
                    if (isTranscribing) return;
                    const touch = e.touches[0];
                    if (!isTouchDraggingRef.current) {
                        const diffX = Math.abs(touch.clientX - startXRef.current);
                        const diffY = Math.abs(touch.clientY - startYRef.current);
                        if (diffX > 10 || diffY > 10) {
                            isTouchDraggingRef.current = true;
                            if (setDraggedAudioId) setDraggedAudioId(audioNote.id);
                            if (draggedAudioIdRef) draggedAudioIdRef.current = audioNote.id;
                            if (navigator.vibrate) {
                                navigator.vibrate(15);
                            }
                        }
                        return;
                    }
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                    e.stopPropagation();
                    
                    const targetGroupRow = getElementUnderTouch(touch.clientX, touch.clientY, '.verse-group-container');
                    const targetPhraseRow = getElementUnderTouch(touch.clientX, touch.clientY, '.phrase-row-container');
                    
                    if (targetGroupRow) {
                        const targetGroupId = targetGroupRow.getAttribute('data-group-id');
                        if (targetGroupId) {
                            if (setDragOverGroupId) setDragOverGroupId(targetGroupId);
                            if (setDragOverPhraseId) setDragOverPhraseId(null);
                        }
                    } else if (targetPhraseRow) {
                        const targetPhraseId = targetPhraseRow.getAttribute('data-phrase-id');
                        if (targetPhraseId) {
                            if (setDragOverPhraseId) setDragOverPhraseId(targetPhraseId);
                            if (setDragOverGroupId) setDragOverGroupId(null);
                        }
                    } else {
                        if (setDragOverGroupId) setDragOverGroupId(null);
                        if (setDragOverPhraseId) setDragOverPhraseId(null);
                    }
                }}
                onTouchEnd={(e) => {
                    if (isTranscribing) return;
                    if (isTouchDraggingRef.current) {
                        isTouchDraggingRef.current = false;
                        
                        let finalGroupId = dragOverGroupIdRef?.current || null;
                        let finalPhraseId = dragOverPhraseIdRef?.current || null;
                        let isOverCanvas = false;
                        
                        if (!finalGroupId && !finalPhraseId) {
                            const touch = e.changedTouches[0];
                            isOverCanvas = !!getElementUnderTouch(touch.clientX, touch.clientY, '#writing-canvas');
                            const targetGroupRow = getElementUnderTouch(touch.clientX, touch.clientY, '.verse-group-container');
                            const targetPhraseRow = getElementUnderTouch(touch.clientX, touch.clientY, '.phrase-row-container');
                            if (targetGroupRow) finalGroupId = targetGroupRow.getAttribute('data-group-id');
                            if (targetPhraseRow) finalPhraseId = targetPhraseRow.getAttribute('data-phrase-id');
                        }
                        
                        if (finalGroupId && activeNoteId && handleUpdateAudioNoteGroup) {
                            handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, finalGroupId);
                        } else if (finalPhraseId && handleAttachAudioToPhrase) {
                            const targetPhraseRow = document.querySelector(`[data-phrase-id="${finalPhraseId}"]`);
                            const groupContainer = targetPhraseRow?.closest('.verse-group-container');
                            const phraseGroupId = groupContainer?.getAttribute('data-group-id') || null;
                            if (phraseGroupId && activeNoteId && handleUpdateAudioNoteGroup) {
                                handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, phraseGroupId);
                            } else {
                                handleAttachAudioToPhrase(audioNote.id, finalPhraseId, null);
                            }
                        } else if (isOverCanvas && activeNoteId && handleUpdateAudioNoteGroup) {
                            handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, null);
                        }
                        
                        if (setDraggedAudioId) setDraggedAudioId(null);
                        if (draggedAudioIdRef) draggedAudioIdRef.current = null;
                        if (setDragOverGroupId) setDragOverGroupId(null);
                        if (setDragOverPhraseId) setDragOverPhraseId(null);
                    }
                }}
                onTouchCancel={(e) => {
                    if (isTranscribing) return;
                    isTouchDraggingRef.current = false;
                    if (setDraggedAudioId) setDraggedAudioId(null);
                    if (draggedAudioIdRef) draggedAudioIdRef.current = null;
                    if (setDragOverGroupId) setDragOverGroupId(null);
                    if (setDragOverPhraseId) setDragOverPhraseId(null);
                }}
                className={`bg-white border border-stone-200/80 rounded-full px-3 py-0.5 shadow-sm flex items-center gap-2.5 transition-all select-none h-[22px] cursor-grab active:cursor-grabbing touch-none ${
                    draggedAudioId === audioNote.id ? 'opacity-30 scale-95' : ''
                }`}
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
                    className="bg-transparent border-none outline-none font-bold text-[9px] text-stone-855 placeholder:text-stone-400 w-16 hover:bg-stone-50 focus:bg-stone-50 rounded px-1 py-0.2 focus:ring-1 focus:ring-stone-200 transition-colors disabled:opacity-50"
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
                        
                        <div className="hidden sm:block h-2.5 w-[1px] bg-stone-200" />

                        <div 
                            onClick={handleWaveformClick}
                            onTouchStart={handleWaveformClick}
                            onTouchMove={handleWaveformClick}
                            className="hidden sm:flex items-center gap-[1.5px] h-3 px-1 relative cursor-pointer select-none"
                            style={{ width: 'clamp(50px, 15vw, 80px)' }}
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

                        <div className="hidden sm:block h-2.5 w-[1px] bg-stone-200" />
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
                            className="text-stone-404 hover:text-emerald-600 transition-colors cursor-pointer disabled:opacity-35"
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
                    className="text-stone-404 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-35"
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
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
                if (isTranscribing) return;
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('input') || target.closest('svg')) {
                    return;
                }
                const touch = e.touches[0];
                startXRef.current = touch.clientX;
                startYRef.current = touch.clientY;
                isTouchDraggingRef.current = false;
            }}
            onTouchMove={(e) => {
                if (isTranscribing) return;
                const touch = e.touches[0];
                if (!isTouchDraggingRef.current) {
                    const diffX = Math.abs(touch.clientX - startXRef.current);
                    const diffY = Math.abs(touch.clientY - startYRef.current);
                    if (diffX > 10 || diffY > 10) {
                        isTouchDraggingRef.current = true;
                        if (setDraggedAudioId) setDraggedAudioId(audioNote.id);
                        if (draggedAudioIdRef) draggedAudioIdRef.current = audioNote.id;
                        if (navigator.vibrate) {
                            navigator.vibrate(15);
                        }
                    }
                    return;
                }
                if (e.cancelable) {
                    e.preventDefault();
                }
                e.stopPropagation();
                
                const targetGroupRow = getElementUnderTouch(touch.clientX, touch.clientY, '.verse-group-container');
                const targetPhraseRow = getElementUnderTouch(touch.clientX, touch.clientY, '.phrase-row-container');
                
                if (targetGroupRow) {
                    const targetGroupId = targetGroupRow.getAttribute('data-group-id');
                    if (targetGroupId) {
                        if (setDragOverGroupId) setDragOverGroupId(targetGroupId);
                        if (setDragOverPhraseId) setDragOverPhraseId(null);
                    }
                } else if (targetPhraseRow) {
                    const targetPhraseId = targetPhraseRow.getAttribute('data-phrase-id');
                    if (targetPhraseId) {
                        if (setDragOverPhraseId) setDragOverPhraseId(targetPhraseId);
                        if (setDragOverGroupId) setDragOverGroupId(null);
                    }
                } else {
                    if (setDragOverGroupId) setDragOverGroupId(null);
                    if (setDragOverPhraseId) setDragOverPhraseId(null);
                }
            }}
            onTouchEnd={(e) => {
                if (isTranscribing) return;
                if (isTouchDraggingRef.current) {
                    isTouchDraggingRef.current = false;
                    
                    let finalGroupId = dragOverGroupIdRef?.current || null;
                    let finalPhraseId = dragOverPhraseIdRef?.current || null;
                    let isOverCanvas = false;
                    
                    if (!finalGroupId && !finalPhraseId) {
                        const touch = e.changedTouches[0];
                        isOverCanvas = !!getElementUnderTouch(touch.clientX, touch.clientY, '#writing-canvas');
                        const targetGroupRow = getElementUnderTouch(touch.clientX, touch.clientY, '.verse-group-container');
                        const targetPhraseRow = getElementUnderTouch(touch.clientX, touch.clientY, '.phrase-row-container');
                        if (targetGroupRow) finalGroupId = targetGroupRow.getAttribute('data-group-id');
                        if (targetPhraseRow) finalPhraseId = targetPhraseRow.getAttribute('data-phrase-id');
                    }
                    
                    if (finalGroupId && activeNoteId && handleUpdateAudioNoteGroup) {
                        handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, finalGroupId);
                    } else if (finalPhraseId && handleAttachAudioToPhrase) {
                        const targetPhraseRow = document.querySelector(`[data-phrase-id="${finalPhraseId}"]`);
                        const groupContainer = targetPhraseRow?.closest('.verse-group-container');
                        const phraseGroupId = groupContainer?.getAttribute('data-group-id') || null;
                        if (phraseGroupId && activeNoteId && handleUpdateAudioNoteGroup) {
                            handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, phraseGroupId);
                        } else {
                            handleAttachAudioToPhrase(audioNote.id, finalPhraseId, null);
                        }
                    } else if (isOverCanvas && activeNoteId && handleUpdateAudioNoteGroup) {
                        handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, null);
                    }
                    
                    if (setDraggedAudioId) setDraggedAudioId(null);
                    if (draggedAudioIdRef) draggedAudioIdRef.current = null;
                    if (setDragOverGroupId) setDragOverGroupId(null);
                    if (setDragOverPhraseId) setDragOverPhraseId(null);
                }
            }}
            onTouchCancel={(e) => {
                if (isTranscribing) return;
                isTouchDraggingRef.current = false;
                if (setDraggedAudioId) setDraggedAudioId(null);
                if (draggedAudioIdRef) draggedAudioIdRef.current = null;
                if (setDragOverGroupId) setDragOverGroupId(null);
                if (setDragOverPhraseId) setDragOverPhraseId(null);
            }}
            className={`bg-white border border-stone-200/80 rounded-full px-3 py-1.5 sm:px-5 sm:py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center gap-1.5 sm:gap-4 z-30 transition-all select-none cursor-grab active:cursor-grabbing shrink-0 touch-none max-w-full ${
                draggedAudioId === audioNote.id ? 'opacity-30 scale-95' : ''
            }`}
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
                className="bg-transparent border-none outline-none font-bold text-xs text-stone-800 placeholder:text-stone-400 w-16 sm:w-24 shrink-0 hover:bg-stone-50 focus:bg-stone-50 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-stone-200 transition-colors disabled:opacity-50"
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
                                <span className="hidden sm:inline">Play/pause</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                                <span className="hidden sm:inline">Play/pause</span>
                            </>
                        )}
                    </button>
                    <div className="hidden sm:block h-4 w-[1px] bg-stone-200 shrink-0" />

                    <div 
                        onClick={handleWaveformClick}
                        onTouchStart={handleWaveformClick}
                        onTouchMove={handleWaveformClick}
                        className="hidden sm:flex items-center gap-[2.5px] h-6 px-1.5 relative cursor-pointer select-none shrink-0"
                        style={{ width: 'clamp(70px, 22vw, 130px)' }}
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

                    <div className="hidden sm:block h-4 w-[1px] bg-stone-200 shrink-0" />

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

interface JoinedPillProps {
    name: string;
    onDismiss: () => void;
}

function JoinedPill({ name, onDismiss }: JoinedPillProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200/70 text-emerald-800 rounded-full text-[14px] font-sans font-medium tracking-wide animate-in fade-in slide-in-from-left-3 duration-250 shadow-3xs shrink-0 select-none">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{name} has joined</span>
            <button
                type="button"
                onClick={onDismiss}
                className="text-emerald-500 hover:text-emerald-700 ml-1 p-0.5 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                title="Dismiss"
            >
                <svg className="w-3 h-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
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

    // Track active session creation time (accumulate seconds spent in Create tab)
    useEffect(() => {
        const interval = setInterval(() => {
            const storedSeconds = parseInt(localStorage.getItem('mep-create-seconds') || '0');
            const nextSeconds = storedSeconds + 10; // add 10 seconds
            localStorage.setItem('mep-create-seconds', nextSeconds.toString());
            
            // Dispatch event to update the platform header progress calculations
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }, 10000); // every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const notesRef = useRef<SongNote[]>([]);
    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    // Calculate total words typed and total saved recording duration across all notes and sync to localStorage
    useEffect(() => {
        const totalWords = notes.reduce((sum, note) => {
            const words = (note.content || '').trim().split(/\s+/).filter(w => w.length > 0).length;
            return sum + words;
        }, 0);
        localStorage.setItem('mep-create-words-typed', totalWords.toString());

        const totalRecordingsDuration = notes.reduce((sum, note) => {
            const noteDuration = note.recordingDuration || 0;
            const audioNotesDuration = (note.audioNotes || []).reduce((aSum, an) => aSum + (an.duration || 0), 0);
            return sum + noteDuration + audioNotesDuration;
        }, 0);

        const currentSeconds = parseInt(localStorage.getItem('mep-create-recording-seconds') || '0');
        const nextSeconds = Math.max(currentSeconds, totalRecordingsDuration);
        localStorage.setItem('mep-create-recording-seconds', nextSeconds.toString());

        window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
    }, [notes]);

    const [activeFolderIdFilter, setActiveFolderIdFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMyProjectsOpen, setIsMyProjectsOpen] = useState(false);
    const [isCollabProjectsOpen, setIsCollabProjectsOpen] = useState(false);
    const [projectViewStyle, setProjectViewStyle] = useState<'grid' | 'list'>('grid');
    const [showNewItemMenu, setShowNewItemMenu] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [isDragOverRoot, setIsDragOverRoot] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [lastAwardedContent, setLastAwardedContent] = useState<string>('');
    const [lastSavedContent, setLastSavedContent] = useState<string>('');
    const [savedFlash, setSavedFlash] = useState(false); // Brief "Saved ✓" animation on SAVE button

    // Real-Time Collaboration States
    const [isCollaborative, setIsCollaborative] = useState(false);
    const [collaborators, setCollaborators] = useState<string[]>([]);
    const [collaboratorProfiles, setCollaboratorProfiles] = useState<{[uid: string]: { name: string; email: string }}>({});
    const [activeRemoteUsers, setActiveRemoteUsers] = useState<{[uid: string]: { name: string; color: string; cursor?: { x: number; y: number }; activePhraseId?: string | null }}>({});
    const [showShareModal, setShowShareModal] = useState(false);
    const [previewInviteId, setPreviewInviteId] = useState<string | null>(null);
    const isCanvasPreview = previewInviteId !== null;
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
    const [isInviting, setIsInviting] = useState(false);
    const [currentUserColor, setCurrentUserColor] = useState<string>('indigo');
    const [confirmCloseCollab, setConfirmCloseCollab] = useState<{
        isOpen: boolean;
        type: 'decline_invite' | 'close_collab' | null;
        invite?: any;
        projectId?: string | null;
    }>({ isOpen: false, type: null });

    // Curated elegant neutral colors for collaborators
    const COLLABORATOR_COLORS = [
        '#A5AFDF',
        '#86BE7F',
        '#FFF35F',
        '#ADCDC0',
        '#46455D'
    ];

    // Generate or fetch user color on mount
    useEffect(() => {
        if (user) {
            // Pick a random color from the palette
            const randomIndex = Math.floor(Math.random() * COLLABORATOR_COLORS.length);
            const color = COLLABORATOR_COLORS[randomIndex];
            setCurrentUserColor(color);
        }
    }, [user]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Global touch tracking for drag ghost overlay
    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            const isAnyDrag = draggedPhraseIdRef.current || draggedAudioIdRef.current || draggedGroupIdRef.current;
            if (!isAnyDrag) return;
            const touch = e.touches[0];
            setTouchGhostPos({ x: touch.clientX, y: touch.clientY });
        };
        const handleTouchEnd = () => {
            setTouchGhostPos(null);
        };
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, []);
    
    // Suggestion mode states
    const [isEditing, setIsEditing] = useState(true);
    const [clickedWord, setClickedWord] = useState<string | null>(null);
    const [clickedTokenIndex, setClickedTokenIndex] = useState<number | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
    const [draggedPhraseId, setDraggedPhraseId] = useState<string | null>(null);
    const [showCanvasMenu, setShowCanvasMenu] = useState(false);
    const [dragOverPhraseId, setDragOverPhraseIdState] = useState<string | null>(null);
    const dragOverPhraseIdRef = useRef<string | null>(null);
    const setDragOverPhraseId = (id: string | null) => {
        setDragOverPhraseIdState(id);
        dragOverPhraseIdRef.current = id;
    };
    const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
    const [dragOverGroupId, setDragOverGroupIdState] = useState<string | null>(null);
    const dragOverGroupIdRef = useRef<string | null>(null);
    const setDragOverGroupId = (id: string | null) => {
        setDragOverGroupIdState(id);
        dragOverGroupIdRef.current = id;
    };
    const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
    const [blockDropPosition, setBlockDropPosition] = useState<'top' | 'bottom' | null>(null);
    const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
    const [draggedAudioId, setDraggedAudioId] = useState<string | null>(null);
    const [touchGhostPos, setTouchGhostPos] = useState<{ x: number; y: number } | null>(null);
    const [touchGhostLabel, setTouchGhostLabel] = useState<string>('');
    const [visualViewportOffset, setVisualViewportOffset] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;
        
        const updateOffset = () => {
            const vv = window.visualViewport;
            if (vv) {
                const offset = window.innerHeight - vv.height;
                setVisualViewportOffset(Math.max(0, offset));
            }
        };
        
        window.visualViewport.addEventListener('resize', updateOffset);
        window.visualViewport.addEventListener('scroll', updateOffset);
        
        updateOffset();
        
        return () => {
            window.visualViewport?.removeEventListener('resize', updateOffset);
            window.visualViewport?.removeEventListener('scroll', updateOffset);
        };
    }, []);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const draggedPhraseIdRef = useRef<string | null>(null);
    const draggedGroupIdRef = useRef<string | null>(null);
    const draggedAudioIdRef = useRef<string | null>(null);
    const groupTouchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const groupIsTouchDraggingRef = useRef(false);
    const groupStartXRef = useRef(0);
    const groupStartYRef = useRef(0);
    const lastTapTimeRef = useRef<number>(0);
    const canvasTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const writingCanvasRef = useRef<HTMLDivElement>(null);
    const remoteCursorsRef = useRef<{[uid: string]: HTMLDivElement | null}>({});

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
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitleText, setLocalTitleText] = useState('');

    useEffect(() => {
        if (!isEditingTitle) {
            const currentNote = notes.find(n => n.id === selectedNoteId);
            setLocalTitleText(isRecording ? recordingTitle : (currentNote ? currentNote.title : ''));
        }
    }, [selectedNoteId, notes, isRecording, recordingTitle, isEditingTitle]);

    // Auto-save project title when clicking anywhere outside the canvas header
    useEffect(() => {
        if (!isEditingTitle) return;
        
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && !target.closest('#canvas-header')) {
                handleSaveTitle();
            }
        };
        
        document.addEventListener('click', handleGlobalClick);
        return () => {
            document.removeEventListener('click', handleGlobalClick);
        };
    }, [isEditingTitle, localTitleText, selectedNoteId]);

    const [cursorSelectionOffset, setCursorSelectionOffset] = useState<{ phraseId: string; offset: number } | null>(null);
    const [draggedWord, setDraggedWord] = useState<{ word: string; phraseId: string; wordIndex: number } | null>(null);
    const [dragOverWordIndex, setDragOverWordIndex] = useState<{ phraseId: string; wordIndex: number; position: 'left' | 'right' } | null>(null);
    const recognitionRef = useRef<any>(null);

    // Creative Tools Suite State Variables
    const [showToolsPanel, setShowToolsPanel] = useState(false);
    const [activeToolTab, setActiveToolTab] = useState<'tuner' | 'tempo' | 'lexicon' | 'inspiration'>('tuner');

    // Tuner States
    const [tunerActive, setTunerActive] = useState(false);
    const [tunerFreq, setTunerFreq] = useState<number | null>(null);
    const [tunerNote, setTunerNote] = useState<string>('--');
    const [tunerCents, setTunerCents] = useState<number>(0);
    const [refTonePlaying, setRefTonePlaying] = useState(false);
    const [tunerModeAuto, setTunerModeAuto] = useState(true);
    const [savedTuning, setSavedTuning] = useState<{ note: string; freq: number; cents: number; timestamp: string } | null>(null);

    // Tap Tempo States
    const [tapTimes, setTapTimes] = useState<number[]>([]);
    
    // Rhyme Lexicon States
    const [lexiconWord, setLexiconWord] = useState('');
    const [lexiconMode, setLexiconMode] = useState<'rhyme' | 'near' | 'synonym'>('rhyme');
    const [lexiconResults, setLexiconResults] = useState<any[]>([]);
    const [lexiconLoading, setLexiconLoading] = useState(false);

    // Inspiration States
    const [currentStarter, setCurrentStarter] = useState('');
    const [currentTheme, setCurrentTheme] = useState<{ mood: string; setting: string; keywords: string[] } | null>(null);
    const [inspirationCards, setInspirationCards] = useState<InspirationCard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [inspirationAnswers, setInspirationAnswers] = useState<Record<string, Record<string, string[]>>>({});
    const [inspirationDragOffset, setInspirationDragOffset] = useState(0);
    const [swipingToBack, setSwipingToBack] = useState(false);
    const inspirationTouchStartXRef = useRef(0);
    const inspirationDragStartXRef = useRef(0);

    // Tuner Audio Refs
    const tunerAudioContextRef = useRef<AudioContext | null>(null);
    const tunerAnalyserRef = useRef<AnalyserNode | null>(null);
    const tunerMicStreamRef = useRef<MediaStream | null>(null);
    const tunerOscillatorRef = useRef<OscillatorNode | null>(null);
    const tunerAnimationRef = useRef<number | null>(null);
    const chordbookTunerRef = useRef<any>(null);

    // Scroll and title layout measurements
    const [scrollHeight, setScrollHeight] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [clientHeight, setClientHeight] = useState(0);

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

    useEffect(() => {
        let unsubOwn: (() => void) | null = null;
        let unsubCollab: (() => void) | null = null;

        const init = async () => {
            if (user) {
                try {
                    await migrateLegacyNotesToProjects(user.uid);

                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    let initialFolders: SongFolder[] = [];
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.createFolders) {
                            initialFolders = userData.createFolders;
                            setFolders(userData.createFolders);
                        }
                        if (!userData.email || !userData.name) {
                            await setDoc(userDocRef, {
                                uid: user.uid,
                                name: user.displayName || user.email?.split('@')[0] || 'Collaborator',
                                email: user.email || ''
                            }, { merge: true });
                        }
                    } else {
                        await setDoc(userDocRef, {
                            uid: user.uid,
                            name: user.displayName || user.email?.split('@')[0] || 'Collaborator',
                            email: user.email || '',
                            createdAt: new Date().toISOString()
                        }, { merge: true });
                    }

                    const ownQuery = query(collection(db, "projects"), where("ownerId", "==", user.uid));
                    const collabQuery = query(collection(db, "projects"), where("collaborators", "array-contains", user.uid));

                    let ownNotes: SongNote[] = [];
                    let collabNotes: SongNote[] = [];
                    let initialLoadComplete = false;

                    const updateNotesState = async (forceFallback = false) => {
                        const mergedMap = new Map<string, SongNote>();
                        ownNotes.forEach(n => mergedMap.set(n.id, n));
                        collabNotes.forEach(n => mergedMap.set(n.id, n));
                        let merged = Array.from(mergedMap.values());

                        if (merged.length === 0 && forceFallback && !initialLoadComplete) {
                            initialLoadComplete = true;
                            // Fallback to localStorage
                            const savedNotes = localStorage.getItem('veinote-create-notes');
                            let fallbackNotes: SongNote[] = [];
                            if (savedNotes) {
                                fallbackNotes = JSON.parse(savedNotes);
                            } else {
                                fallbackNotes = [
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
                                localStorage.setItem('veinote-create-notes', JSON.stringify(fallbackNotes));
                            }
                            
                            // Upload defaults to projects collection
                            try {
                                const batch = writeBatch(db);
                                for (const note of fallbackNotes) {
                                    const ref = doc(db, "projects", note.id);
                                    batch.set(ref, {
                                        ...note,
                                        ownerId: user.uid,
                                        collaborators: []
                                    }, { merge: true });
                                }
                                await batch.commit();
                            } catch (err) {
                                console.error("Error migrating local defaults to Firestore:", err);
                            }
                            return;
                        }

                        initialLoadComplete = true;
                        setNotes(merged);
                        setIsDataLoaded(true);

                        if (merged.length > 0) {
                            setSelectedNoteId(prev => {
                                if (prev && merged.some(n => n.id === prev)) {
                                    return prev;
                                }
                                return null;
                            });
                        }
                    };

                    unsubOwn = onSnapshot(ownQuery, (snap) => {
                        ownNotes = [];
                        snap.forEach(doc => {
                            ownNotes.push({ id: doc.id, ...doc.data() } as SongNote);
                        });
                        updateNotesState(true);
                    }, (err) => console.error("Error listening to own projects:", err));

                    unsubCollab = onSnapshot(collabQuery, (snap) => {
                        collabNotes = [];
                        snap.forEach(doc => {
                            collabNotes.push({ id: doc.id, ...doc.data() } as SongNote);
                        });
                        updateNotesState(true);
                    }, (err) => console.error("Error listening to collab projects:", err));

                } catch (err) {
                    console.error("Error loading data from Firestore:", err);
                }
            } else {
                // Fallback to localStorage if not found/loaded from Firestore
                const savedFolders = localStorage.getItem('veinote-create-folders');
                const savedNotes = localStorage.getItem('veinote-create-notes');
                let initialFolders = [];
                let initialNotes = [];

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

                setFolders(initialFolders);
                setNotes(initialNotes);
                setIsDataLoaded(true);

                if (initialNotes.length > 0) {
                    setSelectedNoteId(prev => {
                        if (prev && initialNotes.some(n => n.id === prev)) {
                            return prev;
                        }
                        return null;
                    });
                }
            }
        };

        init();

        return () => {
            if (unsubOwn) unsubOwn();
            if (unsubCollab) unsubCollab();
        };
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
        }
    }, [notes, isDataLoaded]);

    // 1a. Live Preview Mirror Subscription: When in preview mode, subscribe to the invited
    //     project in real-time so the invitee sees every live edit by the project owner.
    useEffect(() => {
        if (!previewInviteId || !user) return;

        // Find the invite to get the projectId
        const invite = pendingInvites.find(inv => inv.id === previewInviteId);
        if (!invite) return;

        const projectId = invite.projectId;

        const unsub = onSnapshot(doc(db, "projects", projectId), (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();

            // Merge/upsert the live project data into local notes state so
            // the canvas renders it in real-time (full mirror of owner's edits)
            setNotes(prev => {
                const exists = prev.some(n => n.id === projectId);
                if (exists) {
                    return prev.map(n =>
                        n.id === projectId
                            ? { ...n, ...data, id: projectId } as SongNote
                            : n
                    );
                }
                return [{ ...data, id: projectId } as SongNote, ...prev];
            });

            // Ensure the preview project is selected so the canvas renders it
            setSelectedNoteId(projectId);
        }, (err) => {
            console.error("Live preview mirror subscription error:", err);
        });

        return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewInviteId, user]);

    // 1. Subscription Effect: Listen to active collaborative project in real-time
    useEffect(() => {
        if (!selectedNoteId || !user || !isDataLoaded) return;

        const unsub = onSnapshot(doc(db, "projects", selectedNoteId), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setCollaborators(data.collaborators || []);
                setNotes(prev => {
                    const existingNote = prev.find(n => n.id === selectedNoteId);
                    if (!existingNote) {
                        return [{ id: snapshot.id, ...data } as SongNote, ...prev];
                    }

                    // Deep compare content to prevent recursive state update loops
                    const isTitleIdentical = existingNote.title === data.title;
                    const isContentIdentical = existingNote.content === data.content;
                    const isFolderIdentical = existingNote.folderId === data.folderId;
                    const isAudioOnlyIdentical = existingNote.isAudioOnly === data.isAudioOnly;
                    
                    const isPhrasesLengthIdentical = (existingNote.phrases || []).length === (data.phrases || []).length;
                    const isAudioLengthIdentical = (existingNote.audioNotes || []).length === (data.audioNotes || []).length;

                    if (isTitleIdentical && isContentIdentical && isFolderIdentical && isAudioOnlyIdentical && isPhrasesLengthIdentical && isAudioLengthIdentical) {
                        const localPhrases = existingNote.phrases || [];
                        const remotePhrases = data.phrases || [];
                        
                        let hasLockChanges = false;
                        let hasContentChanges = false;
                        
                        for (let i = 0; i < remotePhrases.length; i++) {
                            const lp = localPhrases.find(p => p.id === remotePhrases[i].id);
                            if (!lp) {
                                hasContentChanges = true;
                                break;
                            }
                            if (lp.text !== remotePhrases[i].text) {
                                if (lp.id !== editingPhraseId) {
                                    hasContentChanges = true;
                                }
                            }
                            if (lp.lockedBy !== remotePhrases[i].lockedBy) {
                                hasLockChanges = true;
                            }
                        }
                        
                        if (!hasContentChanges && !hasLockChanges) {
                            return prev;
                        }
                    }

                    return prev.map(n => {
                        if (n.id === selectedNoteId) {
                            const localLockedPhraseId = editingPhraseId;
                            const mergedPhrases = (data.phrases || []).map((remoteP: any) => {
                                if (remoteP.id === localLockedPhraseId) {
                                    const localP = n.phrases?.find(p => p.id === localLockedPhraseId);
                                    return { ...remoteP, text: localP?.text || remoteP.text };
                                }
                                return remoteP;
                            });

                            return {
                                ...n,
                                ...data,
                                phrases: mergedPhrases
                            };
                        }
                        return n;
                    });
                });
            }
        }, (err) => {
            console.error("Firestore subscription error:", err);
        });

        return () => unsub();
    }, [selectedNoteId, user, isDataLoaded, editingPhraseId]);



    // 3. Presence Effect: Listen to remote presence details
    useEffect(() => {
        if (!selectedNoteId || !user || !isDataLoaded) {
            setActiveRemoteUsers({});
            return;
        }

        const unsub = onSnapshot(collection(db, "projects", selectedNoteId, "presence"), (snapshot) => {
            const users: {[uid: string]: { name: string; color: string; cursor?: { x: number; y: number }; activePhraseId?: string | null }} = {};
            
            snapshot.forEach(d => {
                if (d.id !== user.uid) {
                    const data = d.data();
                    if (data.x !== -999 && data.y !== -999) {
                        users[d.id] = {
                            name: data.name || 'Collaborator',
                            color: data.color || 'rose',
                            cursor: { x: data.x, y: data.y },
                            activePhraseId: data.activePhraseId || null
                        };
                    }
                }
            });
            
            setActiveRemoteUsers(users);
        }, (err) => {
            console.error("Presence snapshot error:", err);
        });

        return () => unsub();
    }, [selectedNoteId, user, isDataLoaded, currentUserColor]);

    const lastCursorWriteRef = useRef<number>(0);
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!selectedNoteId || !user || !writingCanvasRef.current) return;
        
        const now = Date.now();
        if (now - lastCursorWriteRef.current < 120) return; // 120ms throttle
        lastCursorWriteRef.current = now;

        const rect = writingCanvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const presenceRef = doc(db, "projects", selectedNoteId, "presence", user.uid);
        setDoc(presenceRef, {
            name: user.displayName || user.email?.split('@')[0] || 'Collaborator',
            color: currentUserColor,
            x: x,
            y: y,
            activePhraseId: editingPhraseId,
            updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.error("Error updating presence:", err));
    };

    const handleMouseLeave = () => {
        if (!selectedNoteId || !user) return;
        const presenceRef = doc(db, "projects", selectedNoteId, "presence", user.uid);
        setDoc(presenceRef, {
            x: -999,
            y: -999,
            activePhraseId: null,
            updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.error("Error clearing presence:", err));
    };

    const [pendingInvites, setPendingInvites] = useState<any[]>([]);

    const [acceptedNotifications, setAcceptedNotifications] = useState<any[]>([]);

    // Listen to invitations sent by me that were accepted but I haven't acknowledged yet
    useEffect(() => {
        if (!user) {
            setAcceptedNotifications([]);
            return;
        }

        const q = query(
            collection(db, "invitations"),
            where("senderId", "==", user.uid),
            where("status", "==", "accepted"),
            where("senderNotified", "==", false)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setAcceptedNotifications(list);
        }, (err) => {
            console.error("Error listening to accepted notifications:", err);
        });

        return () => unsub();
    }, [user]);

    const handleDismissAcceptedNotification = async (notificationId: string) => {
        try {
            await updateDoc(doc(db, "invitations", notificationId), {
                senderNotified: true
            });
        } catch (err) {
            console.error("Error dismissing accepted notification:", err);
        }
    };

    // 4. Invite Effect: Listen to pending invitations for this user (matched by UID)
    useEffect(() => {
        if (!user) {
            setPendingInvites([]);
            return;
        }

        const q = query(
            collection(db, "invitations"),
            where("inviteeId", "==", user.uid),
            where("status", "==", "pending")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const invites: any[] = [];
            snapshot.forEach(doc => {
                invites.push({ id: doc.id, ...doc.data() });
            });
            setPendingInvites(invites);
        }, (err) => {
            console.error("Error listening to invitations:", err);
        });

        return () => unsub();
    }, [user]);

    // Hook to claim pending email invitations on login/signup
    useEffect(() => {
        if (!user || !user.email) return;

        const claimInvites = async () => {
            try {
                const userEmail = user.email.toLowerCase().trim();
                const q = query(
                    collection(db, "invitations"),
                    where("inviteeEmail", "==", userEmail),
                    where("inviteeId", "==", "")
                );
                
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const batch = writeBatch(db);
                    snapshot.forEach(docSnap => {
                        const data = docSnap.data();
                        const newInviteId = `${data.projectId}_${user.uid}`;
                        const newInviteRef = doc(db, "invitations", newInviteId);
                        batch.set(newInviteRef, {
                            ...data,
                            id: newInviteId,
                            inviteeId: user.uid
                        });
                        batch.delete(docSnap.ref);
                    });
                    await batch.commit();
                    console.log("Claimed pending invitations for email with deterministic IDs:", userEmail);
                }
            } catch (err) {
                console.error("Error claiming invitations:", err);
            }
        };

        claimInvites();
    }, [user]);

    const handleAcceptInvite = async (invite: any) => {
        if (!user) return;
        try {
            const deterministicId = `${invite.projectId}_${user.uid}`;
            const inviteeName = user.displayName || user.email?.split('@')[0] || 'Collaborator';

            // Step 1: Ensure a deterministic invitation doc exists with inviteeId set.
            // If the invite had a non-deterministic email-based ID, create the canonical doc first.
            if (invite.id !== deterministicId) {
                await setDoc(doc(db, "invitations", deterministicId), {
                    ...invite,
                    id: deterministicId,
                    inviteeId: user.uid,
                    inviteeName,
                    status: 'accepted',
                    senderNotified: false,
                });
                // Delete the old non-deterministic doc (best-effort, non-blocking)
                updateDoc(doc(db, "invitations", invite.id), { status: 'accepted' }).catch(() => {});
            } else {
                // Step 1b: Update the existing deterministic invitation doc in place.
                await updateDoc(doc(db, "invitations", deterministicId), {
                    status: 'accepted',
                    inviteeId: user.uid,
                    inviteeName,
                    senderNotified: false,
                });
            }

            // Step 2: Add user to project collaborators.
            // The rule allows this because the user is only adding themselves
            // (affectedKeys == ['collaborators'] && difference == [uid]).
            await updateDoc(doc(db, "projects", invite.projectId), {
                collaborators: arrayUnion(user.uid)
            });

            // Step 3: Exit preview mode and open the project canvas.
            setPreviewInviteId(null);

            const projectDoc = await getDoc(doc(db, "projects", invite.projectId));
            if (projectDoc.exists()) {
                const noteData = projectDoc.data() as SongNote;
                const currentCollaborators = projectDoc.data().collaborators || [];
                setNotes(prev => {
                    if (prev.some(n => n.id === invite.projectId)) {
                        return prev.map(n => n.id === invite.projectId
                            ? { ...noteData, id: invite.projectId, collaborators: currentCollaborators }
                            : n
                        );
                    }
                    return [{ ...noteData, id: invite.projectId, collaborators: currentCollaborators }, ...prev];
                });
                setSelectedNoteId(invite.projectId);
                setShowShareModal(false);
            }
        } catch (err) {
            console.error("Error accepting invitation:", err);
            // Exit preview cleanly so the user is never stuck
            setPreviewInviteId(null);
            setSelectedNoteId(null);
        }
    };

    const handleDeclineInvite = async (invite: any) => {
        if (!user) return;
        try {
            // 1. Update invitation status to declined
            await updateDoc(doc(db, "invitations", invite.id), {
                status: 'declined'
            });

            // 2. Clear preview state, deselect canvas, and purge the preview note from local state.
            //    This always returns the invitee to their own blank canvas.
            setPreviewInviteId(null);
            setSelectedNoteId(null);
            setNotes(prev => prev.filter(n => n.id !== invite.projectId));
        } catch (err) {
            console.error("Error declining invitation:", err);
        }
    };

    const handleCloseCollaboration = async (projectId: string) => {
        if (!user) return;
        try {
            const projectRef = doc(db, "projects", projectId);
            const projectDoc = await getDoc(projectRef);
            if (!projectDoc.exists()) return;
            
            const projectData = projectDoc.data();
            const ownerId = projectData.ownerId;
            
            if (ownerId === user.uid) {
                // If current user is the owner, remove all collaborators and reset presence
                await updateDoc(projectRef, {
                    collaborators: []
                });
                setCollaborators([]);
                setCollaboratorProfiles({});
            } else {
                // If current user is a collaborator, remove themselves from collaborators list
                await updateDoc(projectRef, {
                    collaborators: arrayRemove(user.uid)
                });
                
                // Also update the invitation status to declined so they don't get invited again automatically
                const inviteId = `${projectId}_${user.uid}`;
                await updateDoc(doc(db, "invitations", inviteId), {
                    status: 'declined'
                }).catch(() => {});
                
                // Reset active workspace state
                setSelectedNoteId(null);
                setNotes(prev => prev.filter(n => n.id !== projectId));
            }
        } catch (err) {
            console.error("Error closing collaboration:", err);
        } finally {
            setConfirmCloseCollab({ isOpen: false, type: null });
        }
    };

    // Shuffle inspiration cards and load answers from localStorage on mount
    useEffect(() => {
        setIsMounted(true);
        const shuffled = [...INSPIRATION_CARDS].sort(() => Math.random() - 0.5);
        setInspirationCards(shuffled);

        const saved = localStorage.getItem('veinote-inspiration-answers');
        if (saved) {
            try {
                setInspirationAnswers(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse inspiration answers', e);
            }
        }
    }, []);

    // Real-time collaborator details loading hook (using onSnapshot)
    useEffect(() => {
        if (!selectedNoteId || !user) {
            setIsCollaborative(false);
            setCollaborators([]);
            setCollaboratorProfiles({});
            return;
        }

        const projectRef = doc(db, "projects", selectedNoteId);
        const unsubscribe = onSnapshot(projectRef, async (docSnap) => {
            if (docSnap.exists()) {
                const projData = docSnap.data();
                setIsCollaborative(true);
                const collabList = projData.collaborators || [];
                setCollaborators(collabList);
                
                // Fetch collaborator profiles if there are any
                if (collabList.length > 0) {
                    const profiles = await getCollaboratorProfiles(collabList);
                    // Also fetch owner profile if the current user is a collaborator
                    if (projData.ownerId && projData.ownerId !== user.uid) {
                        const ownerProfile = await getCollaboratorProfiles([projData.ownerId]);
                        setCollaboratorProfiles(prev => ({ ...prev, ...profiles, ...ownerProfile }));
                    } else {
                        setCollaboratorProfiles(prev => ({ ...prev, ...profiles }));
                    }
                } else if (projData.ownerId && projData.ownerId !== user.uid) {
                    const ownerProfile = await getCollaboratorProfiles([projData.ownerId]);
                    setCollaboratorProfiles(prev => ({ ...prev, ...ownerProfile }));
                } else {
                    setCollaboratorProfiles({});
                }
            } else {
                setIsCollaborative(false);
                setCollaborators([]);
                setCollaboratorProfiles({});
            }
        }, (err) => {
            console.error("Error listening to collaborator details:", err);
        });

        return () => unsubscribe();
    }, [selectedNoteId, user]);

    const handleInviteCollaborator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNoteId || !inviteEmail.trim() || !user) return;
        setIsInviting(true);
        setInviteStatus({ type: '', message: '' });

        // Ensure the active note document exists in the projects collection before sending invitation.
        // Using setDoc with merge:true handles both new docs (create rule) and existing docs (update rule)
        // and always stamps ownerId + collaborators so the rules can evaluate correctly.
        const active = notes.find(n => n.id === selectedNoteId);
        if (active) {
            try {
                const docRef = doc(db, "projects", selectedNoteId);
                await setDoc(docRef, {
                    ...active,
                    folderId: null,
                    ownerId: user.uid,
                    collaborators: active.collaborators || [],
                }, { merge: true });

                setNotes(prev => prev.map(n =>
                    n.id === selectedNoteId ? { ...n, folderId: null } : n
                ));
            } catch (err) {
                console.error("Error syncing note to Firestore before invite:", err);
            }
        }

        
        const senderName = user.displayName || user.email?.split('@')[0] || 'Collaborator';
        const res = await inviteCollaboratorByEmail(selectedNoteId, inviteEmail, user.uid, senderName);
        if (res.success) {
            setInviteStatus({ type: 'success', message: res.message });
            setInviteEmail('');
            // Refetch profiles to update list
            try {
                const projectDoc = await getDoc(doc(db, "projects", selectedNoteId));
                if (projectDoc.exists()) {
                    const collabList = projectDoc.data().collaborators || [];
                    setCollaborators(collabList);
                    const profiles = await getCollaboratorProfiles(collabList);
                    setCollaboratorProfiles(profiles);
                }
            } catch (err) {
                console.error("Error updating collaborators list after invite:", err);
            }
        } else {
            setInviteStatus({ type: 'error', message: res.message });
        }
        setIsInviting(false);
    };

    const handleRemoveCollaborator = async (collaboratorUid: string) => {
        if (!selectedNoteId) return;
        const success = await removeCollaboratorFromProject(selectedNoteId, collaboratorUid);
        if (success) {
            setCollaborators(prev => prev.filter(uid => uid !== collaboratorUid));
            const updatedProfiles = { ...collaboratorProfiles };
            delete updatedProfiles[collaboratorUid];
            setCollaboratorProfiles(updatedProfiles);
        }
    };

    const activeNote = notes.find(n => n.id === selectedNoteId) || null;
    const isNoteBlank = !isCanvasPreview && (
        !selectedNoteId ||
        (activeNote && 
            activeNote.content.trim() === '' &&
            (!activeNote.phrases || activeNote.phrases.length === 0) &&
            (!activeNote.audioNotes || activeNote.audioNotes.length === 0)
        )
    );
    const activeNoteCollabList = activeNote?.collaborators || [];
    const isActiveCollab = !!(selectedNoteId && (
        collaborators.length > 0 || 
        activeNoteCollabList.length > 0 || 
        (activeNote && activeNote.ownerId && activeNote.ownerId !== user?.uid)
    ));

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
                    phraseId: null,
                    createdAt: 0
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
    // CREATIVE TOOLS SUITE LOGIC (Tuner, Tap, Lexicon, Inspiration)
    // ----------------------------------------------------
    const insertTextAtCursor = (textToInsert: string) => {
        let currentVal = activeNote ? activeNote.content : '';
        let newCursorPos = textToInsert.length;
        
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            currentVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
            newCursorPos = start + textToInsert.length;
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 50);
        } else {
            currentVal = currentVal ? currentVal + "\n" + textToInsert : textToInsert;
        }

        if (!selectedNoteId) {
            const initialPhrases = syncPhrasesWithContent(currentVal, []);
            const newNote: SongNote = {
                id: `n-${Date.now()}`,
                title: getTitleFromContent(currentVal) || 'Untitled Note',
                content: currentVal,
                folderId: activeFolderIdFilter,
                updatedAt: new Date().toLocaleString(),
                phrases: initialPhrases,
                verses: []
            };
            setNotes(prev => [newNote, ...prev]);
            setSelectedNoteId(newNote.id);
            if (initialPhrases[0]) {
                setEditingPhraseId(initialPhrases[0].id);
            }
            setIsEditing(true);
        } else {
            handleUpdateNote(selectedNoteId, { 
                content: currentVal,
                title: getTitleFromContent(currentVal) || 'Untitled Note'
            });
        }
    };

    // Autocorrelation pitch detection algorithm
    const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
        const SIZE = buffer.length;
        let rms = 0;
        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.008) return -1; // too quiet

        let r = new Float32Array(SIZE);
        for (let lag = 0; lag < SIZE; lag++) {
            let sum = 0;
            for (let i = 0; i < SIZE - lag; i++) {
                sum += buffer[i] * buffer[i + lag];
            }
            r[lag] = sum;
        }

        // Find the first zero crossing
        let zeroCrossing = 0;
        for (let i = 0; i < SIZE - 1; i++) {
            if (r[i] > 0 && r[i + 1] <= 0) {
                zeroCrossing = i;
                break;
            }
        }

        if (zeroCrossing === 0) {
            zeroCrossing = 15;
        }

        let peakLag = -1;
        let peakVal = 0;
        for (let lag = zeroCrossing; lag < SIZE; lag++) {
            if (r[lag] > peakVal) {
                if (lag > 0 && lag < SIZE - 1 && r[lag] > r[lag - 1] && r[lag] > r[lag + 1]) {
                    peakVal = r[lag];
                    peakLag = lag;
                }
            }
        }

        if (peakLag !== -1) {
            const alpha = r[peakLag - 1];
            const beta = r[peakLag];
            const gamma = r[peakLag + 1];
            const denom = alpha - 2 * beta + gamma;
            if (Math.abs(denom) > 1e-5) {
                let p = 0.5 * (alpha - gamma) / denom;
                let refinedLag = peakLag + p;
                return sampleRate / refinedLag;
            }
            return sampleRate / peakLag;
        }
        return -1;
    };

    const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const getNoteFromFrequency = (frequency: number) => {
        const noteNum = 12 * (Math.log2(frequency / 440)) + 69;
        const roundedNoteNum = Math.round(noteNum);
        const centsValue = Math.round((noteNum - roundedNoteNum) * 100);
        const noteName = noteStrings[((roundedNoteNum % 12) + 12) % 12];
        return { noteName, centsValue };
    };

    const startTunerMic = async () => {
        try {
            stopReferenceTone();

            // Dynamic import to prevent SSR server compilation crashes
            const { createTuner } = await import('@chordbook/tuner');

            if (chordbookTunerRef.current) {
                try {
                    chordbookTunerRef.current.stop();
                } catch (e) {}
            }

            const tuner = createTuner({
                onNote: (note: any) => {
                    if (note && note.frequency) {
                        setTunerFreq(Math.round(note.frequency * 10) / 10);
                        
                        // Normalize note name (replace Unicode sharp sign ♯ with #)
                        const normalizedNoteName = note.name ? note.name.replace('♯', '#') : '--';
                        
                        if (tunerModeAuto) {
                            setTunerNote(normalizedNoteName);
                            setTunerCents(Math.max(-50, Math.min(50, Math.round(note.cents))));
                        } else {
                            // Manual mode: calculate cents deviation relative to the nearest octave of A (440Hz)
                            const distToA = 12 * Math.log2(note.frequency / 440);
                            const nearestOctaveA = Math.round(distToA / 12) * 12;
                            const centsValue = Math.round((distToA - nearestOctaveA) * 100);
                            setTunerNote('A');
                            setTunerCents(Math.max(-50, Math.min(50, centsValue)));
                        }
                    }
                },
                updateInterval: 50,
                clarityThreshold: 0.85
            });

            chordbookTunerRef.current = tuner;

            // Resume AudioContext inside the user gesture before awaiting getUserMedia to avoid browser block
            if (tuner.context) {
                await tuner.context.resume();
            }

            await tuner.start();
            setTunerActive(true);
        } catch (err) {
            console.error("Tuner mic activation error:", err);
            setTunerActive(false);
            alert("Could not access microphone for tuning. Please check settings.");
        }
    };

    const stopTunerMic = () => {
        if (chordbookTunerRef.current) {
            try {
                chordbookTunerRef.current.stop();
            } catch (err) {
                console.error("Error stopping Chordbook tuner:", err);
            }
            chordbookTunerRef.current = null;
        }
        setTunerActive(false);
        setTunerFreq(null);
        setTunerNote('--');
        setTunerCents(0);
    };

    const startReferenceTone = () => {
        try {
            stopTunerMic();

            if (tunerAudioContextRef.current) {
                tunerAudioContextRef.current.close().catch(console.error);
            }

            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioCtxClass();
            tunerAudioContextRef.current = audioCtx;

            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 440Hz
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.15);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            tunerOscillatorRef.current = osc;
            osc.start();
            setRefTonePlaying(true);
        } catch (err) {
            console.error("Reference tone audio error:", err);
            setRefTonePlaying(false);
        }
    };

    const stopReferenceTone = () => {
        if (tunerOscillatorRef.current && tunerAudioContextRef.current) {
            try {
                tunerAudioContextRef.current.close().catch(console.error);
            } catch (err) {
                console.error(err);
            }
            tunerOscillatorRef.current = null;
            tunerAudioContextRef.current = null;
        }
        setRefTonePlaying(false);
    };

    const toggleReferenceTone = () => {
        if (refTonePlaying) {
            stopReferenceTone();
        } else {
            startReferenceTone();
        }
    };

    const toggleTunerMic = () => {
        if (tunerActive) {
            stopTunerMic();
        } else {
            startTunerMic();
        }
    };

    const handleSaveTuning = () => {
        if (!tunerActive || !tunerFreq) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSavedTuning({
            note: tunerNote,
            freq: tunerFreq,
            cents: tunerCents,
            timestamp: timeStr
        });
    };

    const cleanupTunerAudio = () => {
        stopTunerMic();
        stopReferenceTone();
    };

    useEffect(() => {
        if (!showToolsPanel) {
            cleanupTunerAudio();
        }
    }, [showToolsPanel]);

    useEffect(() => {
        cleanupTunerAudio();
    }, [activeToolTab]);

    useEffect(() => {
        return () => {
            cleanupTunerAudio();
        };
    }, []);

    const handleTapTempo = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const now = Date.now();
        
        let newTaps = [...tapTimes];
        if (newTaps.length > 0 && now - newTaps[newTaps.length - 1] > 2000) {
            newTaps = [];
        }
        
        newTaps.push(now);
        if (newTaps.length > 8) {
            newTaps.shift();
        }
        setTapTimes(newTaps);
        
        if (newTaps.length > 1) {
            let sumIntervals = 0;
            for (let i = 1; i < newTaps.length; i++) {
                sumIntervals += (newTaps[i] - newTaps[i - 1]);
            }
            const avgIntervalMs = sumIntervals / (newTaps.length - 1);
            const calculatedBpmValue = Math.round(60000 / avgIntervalMs);
            const finalBpm = Math.max(40, Math.min(240, calculatedBpmValue));
            setMetronomeBpm(finalBpm);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showToolsPanel && activeToolTab === 'tempo' && e.code === 'Space') {
                e.preventDefault();
                handleTapTempo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showToolsPanel, activeToolTab, tapTimes]);

    const searchRhymeLexicon = async (word: string, mode: 'rhyme' | 'near' | 'synonym') => {
        if (!word.trim()) {
            setLexiconResults([]);
            return;
        }
        setLexiconLoading(true);
        try {
            let relParam = 'rel_rhy';
            if (mode === 'near') relParam = 'rel_nry';
            if (mode === 'synonym') relParam = 'ml';
            
            const response = await fetch(`https://api.datamuse.com/words?${relParam}=${encodeURIComponent(word.trim())}&max=40`);
            const data = await response.json();
            
            const formatted = data.map((item: any) => ({
                word: item.word,
                score: item.score,
                syllables: item.numSyllables || 1
            }));
            
            setLexiconResults(formatted);
        } catch (err) {
            console.error("Datamuse API error:", err);
            setLexiconResults([]);
        } finally {
            setLexiconLoading(false);
        }
    };

    const handleLexiconSearch = (e: React.FormEvent) => {
        if (e) e.preventDefault();
        searchRhymeLexicon(lexiconWord, lexiconMode);
    };

    useEffect(() => {
        if (lexiconWord.trim()) {
            const delayDebounce = setTimeout(() => {
                searchRhymeLexicon(lexiconWord, lexiconMode);
            }, 600);
            return () => clearTimeout(delayDebounce);
        } else {
            setLexiconResults([]);
        }
    }, [lexiconWord, lexiconMode]);

    const lyricStartersList = [
        "Under the weight of a neon sky...",
        "I found your letters in the attic dust...",
        "We built a house on shifting sand...",
        "The clock is ticking backward in the dark...",
        "Shadows dance where we used to stand...",
        "Raindrops falling on a broken windshield...",
        "I heard your voice in the static of the radio...",
        "We walked the line until the road ran out...",
        "Gold rings and old strings, that's all you left...",
        "The city sleeps while our secrets burn...",
        "Cigarette smoke on a velvet chair...",
        "A pocket full of dreams and a tank half dry...",
        "Lost in the spaces between what we said..."
    ];

    const moodsList = ["Melancholic", "Hopeful", "Nostalgic", "Rebellious", "Serene", "Haunting", "Electric", "Bittersweet"];
    const settingsList = ["a rainy cafe", "a crowded subway station", "a highway at midnight", "a coastal cliffside", "an empty ballroom", "a neon-lit diner", "a childhood bedroom"];
    const keywordsPool = [
        ["hollow", "echo", "promise", "anchor"],
        ["tide", "drift", "horizon", "salt"],
        ["smoke", "velvet", "whisper", "clock"],
        ["neon", "sparks", "wire", "gravity"],
        ["dust", "portrait", "attic", "key"],
        ["highway", "speed", "fog", "headlights"]
    ];

    const generateLyricStarter = () => {
        const rand = lyricStartersList[Math.floor(Math.random() * lyricStartersList.length)];
        setCurrentStarter(rand);
    };

    const generateThemePrompt = () => {
        const mood = moodsList[Math.floor(Math.random() * moodsList.length)];
        const setting = settingsList[Math.floor(Math.random() * settingsList.length)];
        const keywords = keywordsPool[Math.floor(Math.random() * keywordsPool.length)];
        setCurrentTheme({ mood, setting, keywords });
    };

    useEffect(() => {
        if (showToolsPanel && activeToolTab === 'inspiration') {
            if (!currentStarter) generateLyricStarter();
            if (!currentTheme) generateThemePrompt();
        }
    }, [showToolsPanel, activeToolTab]);

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
                // Guard: mediaDevices requires HTTPS or localhost
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert('Recording requires a secure (HTTPS) connection and browser microphone permission.');
                    return;
                }
                // iOS-compatible audio constraints
                const audioConstraints: MediaStreamConstraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100,
                        channelCount: 1
                    }
                };
                const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
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
                        let line1 = "";
                        let line2 = "";
                        if (hasTranscription) {
                            if (transcriptText.includes('\n')) {
                                const parts = transcriptText.split('\n');
                                line1 = parts[0].trim();
                                line2 = parts.slice(1).join('\n').trim() || "...";
                            } else {
                                const words = transcriptText.split(/\s+/).filter((w: string) => w.length > 0);
                                if (words.length === 0) {
                                    line1 = "";
                                    line2 = "";
                                } else if (words.length === 1) {
                                    line1 = words[0];
                                    line2 = "";
                                } else {
                                    const mid = Math.ceil(words.length / 2);
                                    line1 = words.slice(0, mid).join(" ");
                                    line2 = words.slice(mid).join(" ");
                                }
                            }
                        }
                        
                        const currentNoteId = selectedNoteIdRef.current;
                        const currentNotes = notesRef.current;
                        const currentActiveNote = currentNotes.find(n => n.id === currentNoteId) || null;

                        const shouldUpdate = currentNoteId && currentActiveNote && !forceNewRecordingRef.current;
                        
                        let finalizedNoteId = '';
                        if (shouldUpdate && currentActiveNote) {
                            finalizedNoteId = currentNoteId;
                            
                            const newPhraseId1 = `p-audio-${newRecId}`;
                            const newPhrase1: Phrase = {
                                id: newPhraseId1,
                                text: line1,
                                groupId: null
                            };
                            
                            let newPhrases = [...(currentActiveNote.phrases || []), newPhrase1];
                            if (line2) {
                                const newPhrase2: Phrase = {
                                    id: `p-audio-2-${newRecId}`,
                                    text: line2,
                                    groupId: null
                                };
                                newPhrases.push(newPhrase2);
                            }
                            const finalPhrases = cleanupAndEnsurePlaceholders(newPhrases, currentActiveNote.verses || []);
                            
                            const existingAudioNotes = currentActiveNote.audioNotes || [];
                            const migratedNotes = [...existingAudioNotes];
                            if (currentActiveNote.audioUrl && migratedNotes.length === 0) {
                                migratedNotes.push({
                                    id: 'audio-init',
                                    url: currentActiveNote.audioUrl,
                                    title: currentActiveNote.title || 'Audio 1',
                                    duration: currentActiveNote.recordingDuration || 0,
                                    groupId: currentActiveNote.audioGroupId || null,
                                    createdAt: 0
                                });
                            }
                            const newAudioNotes = [
                                ...migratedNotes,
                                {
                                    id: newRecId,
                                    url: url,
                                    title: `Audio ${migratedNotes.length + 1}`,
                                    duration: durationSeconds,
                                    groupId: null,
                                    phraseId: newPhraseId1,
                                    createdAt: Date.now()
                                }
                            ];
                            
                            const updatedContent = finalPhrases.map(p => p.text).join('\n');
                            
                            handleUpdateNote(currentNoteId, { 
                                audioUrl: url,
                                audioNotes: newAudioNotes,
                                content: updatedContent,
                                phrases: finalPhrases,
                                verses: currentActiveNote.verses || [],
                                isAudioOnly: currentActiveNote.isAudioOnly === true ? !hasTranscription : false
                            });
                        } else {
                            // Check if a note was created during speech recognition in this session
                            const noteCreatedDuringSession = currentNoteId && currentNoteId !== startingNoteId;
                            if (noteCreatedDuringSession) {
                                finalizedNoteId = currentNoteId;
                                
                                const newPhraseId1 = `p-audio-${newRecId}`;
                                const newPhrase1: Phrase = {
                                    id: newPhraseId1,
                                    text: line1,
                                    groupId: null
                                };
                                
                                let newPhrases = [...(currentActiveNote?.phrases || []), newPhrase1];
                                if (line2) {
                                    const newPhrase2: Phrase = {
                                        id: `p-audio-2-${newRecId}`,
                                        text: line2,
                                        groupId: null
                                    };
                                    newPhrases.push(newPhrase2);
                                }
                                const finalPhrases = cleanupAndEnsurePlaceholders(newPhrases, currentActiveNote?.verses || []);
                                
                                const existingAudioNotes = currentActiveNote?.audioNotes || [];
                                const migratedNotes = [...existingAudioNotes];
                                if (currentActiveNote?.audioUrl && migratedNotes.length === 0) {
                                    migratedNotes.push({
                                        id: 'audio-init',
                                        url: currentActiveNote.audioUrl,
                                        title: currentActiveNote.title || 'Audio 1',
                                        duration: currentActiveNote.recordingDuration || 0,
                                        groupId: currentActiveNote.audioGroupId || null,
                                        createdAt: 0
                                    });
                                }
                                const newAudioNotes = [
                                    ...migratedNotes,
                                    {
                                        id: newRecId,
                                        url: url,
                                        title: `Audio ${migratedNotes.length + 1}`,
                                        duration: durationSeconds,
                                        groupId: null,
                                        phraseId: newPhraseId1,
                                        createdAt: Date.now()
                                    }
                                ];
                                
                                const updatedContent = finalPhrases.map(p => p.text).join('\n');
                                
                                handleUpdateNote(currentNoteId, {
                                    audioUrl: url,
                                    audioNotes: newAudioNotes,
                                    content: updatedContent,
                                    phrases: finalPhrases,
                                    isAudioOnly: !hasTranscription
                                });
                            } else {
                                const newId = `n-${Date.now()}`;
                                finalizedNoteId = newId;
                                const title = recordingTitle.trim() || `Recording ${new Date().toLocaleDateString()}`;
                                
                                const newPhraseId1 = `p-audio-${newRecId}`;
                                const newPhrase1: Phrase = {
                                    id: newPhraseId1,
                                    text: line1,
                                    groupId: null
                                };
                                
                                let initialPhrases = [newPhrase1];
                                if (line2) {
                                    const newPhrase2: Phrase = {
                                        id: `p-audio-2-${newRecId}`,
                                        text: line2,
                                        groupId: null
                                    };
                                    initialPhrases.push(newPhrase2);
                                }
                                
                                const initialAudioNotes = [
                                    {
                                        id: newRecId,
                                        url: url,
                                        title: `Audio 1`,
                                        duration: durationSeconds,
                                        groupId: null,
                                        phraseId: newPhraseId1,
                                        createdAt: Date.now()
                                    }
                                ];
                                
                                const updatedContent = initialPhrases.map(p => p.text).join('\n');
                                
                                const newNote: SongNote = {
                                    id: newId,
                                    title: title,
                                    content: updatedContent,
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
                const storedSeconds = parseInt(localStorage.getItem('mep-create-recording-seconds') || '0');
                localStorage.setItem('mep-create-recording-seconds', (storedSeconds + 1).toString());
                window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
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
                const storedSeconds = parseInt(localStorage.getItem('mep-create-recording-seconds') || '0');
                localStorage.setItem('mep-create-recording-seconds', (storedSeconds + 1).toString());
                window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
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
    useEffect(() => {
        if (selectedNoteId && activeNote && isMounted) {
            const currentPhrases = activeNote.phrases || [];
            const hasPhrases = currentPhrases.length > 0;
            
            // If the note has content but phrases are not synced yet, let the initialization effect run first
            if (activeNote.content.trim() !== '' && !hasPhrases) {
                return;
            }
            
            if (activeNote.audioNotes && activeNote.audioNotes.length > 0) {
                const legacyUnplaced = activeNote.audioNotes.filter(
                    an => !an.groupId && (!an.phraseId || !currentPhrases.some(p => p.id === an.phraseId))
                );
                
                if (legacyUnplaced.length > 0) {
                    const sortedLegacy = sortAudioNotesChronologically(legacyUnplaced);
                    let newPhrases = [...currentPhrases];
                    
                    const updatedAudioNotes = activeNote.audioNotes.map(an => {
                        const legacyMatch = sortedLegacy.find(sla => sla.id === an.id);
                        if (legacyMatch) {
                            const newPhraseId = `p-audio-${an.id}`;
                            return { ...an, phraseId: newPhraseId };
                        }
                        return an;
                    });
                    
                    sortedLegacy.forEach(an => {
                        const newPhraseId = `p-audio-${an.id}`;
                        if (!newPhrases.some(p => p.id === newPhraseId)) {
                            newPhrases.push({
                                id: newPhraseId,
                                text: '',
                                groupId: null
                            });
                        }
                    });
                    
                    handleUpdateNote(activeNote.id, {
                        audioNotes: updatedAudioNotes,
                        phrases: newPhrases
                    });
                }
            }
        }
    }, [selectedNoteId, activeNote, isMounted]);


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
            folderId: user ? null : (folderId || activeFolderIdFilter),
            updatedAt: timestamp,
            ownerId: user ? user.uid : undefined,
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

        if (user) {
            const docRef = doc(db, "projects", newNoteId);
            setDoc(docRef, {
                ...newNote,
                ownerId: user.uid,
                collaborators: []
            }).catch(err => console.error("Error creating project in Firestore:", err));
        }
    };

    const handleUpdateNote = (id: string, updates: Partial<SongNote>) => {
        if (isCanvasPreview) return;
        setNotes(prev => prev.map(n => {
            if (n.id === id) {
                let finalTitle = updates.title !== undefined ? updates.title : n.title;
                if (n.isTitleLocked && updates.title !== undefined && !updates.isTitleLocked) {
                    finalTitle = n.title;
                }
                const updatedNote = {
                    ...n,
                    ...updates,
                    title: finalTitle,
                    updatedAt: new Date().toLocaleString(),
                    folderId: user ? null : (updates.folderId !== undefined ? updates.folderId : n.folderId)
                };

                if (user) {
                    const docRef = doc(db, "projects", id);
                    
                    const cleanPhrases = (updatedNote.phrases || []).map((p: any) => ({
                        id: p.id,
                        text: p.text || '',
                        groupId: p.groupId || null,
                        authorId: p.authorId || user.uid,
                        lockedBy: p.lockedBy || null
                    }));

                    const cleanAudio = (updatedNote.audioNotes || []).map((an: any) => ({
                        id: an.id,
                        url: an.url || '',
                        title: an.title || '',
                        duration: an.duration || 0,
                        groupId: an.groupId || null,
                        phraseId: an.phraseId || null,
                        createdAt: an.createdAt || 0,
                        authorId: an.authorId || user.uid
                    }));

                    const existingContributions = (updatedNote as any).contributions || {};
                    let userChars = 0;
                    let userLines = 0;
                    cleanPhrases.forEach(p => {
                        if (p.authorId === user.uid) {
                            userChars += p.text.length;
                            userLines++;
                        }
                    });
                    let userRecs = 0;
                    cleanAudio.forEach(an => {
                        if (an.authorId === user.uid) {
                            userRecs++;
                        }
                    });
                    const updatedContributions = {
                        ...existingContributions,
                        [user.uid]: {
                            charactersTyped: userChars,
                            linesCreated: userLines,
                            recordingsAdded: userRecs,
                            lastActive: new Date().toISOString()
                        }
                    };

                    setDoc(docRef, {
                        id: updatedNote.id,
                        title: updatedNote.title || 'Untitled Note',
                        content: updatedNote.content || '',
                        folderId: null,
                        isAudioOnly: updatedNote.isAudioOnly || false,
                        isTitleLocked: updatedNote.isTitleLocked || false,
                        verses: updatedNote.verses || [],
                        phrases: cleanPhrases,
                        audioNotes: cleanAudio,
                        contributions: updatedContributions,
                        updatedAt: new Date().toISOString()
                    }, { merge: true }).catch(err => console.error("Error updating project note in Firestore:", err));
                }

                return updatedNote;
            }
            return n;
        }));
    };

    const handleSaveTitle = () => {
        if (isRecording) {
            setIsEditingTitle(false);
            return;
        }
        if (selectedNoteId) {
            handleUpdateNote(selectedNoteId, { title: localTitleText, isTitleLocked: true });
        } else if (localTitleText.trim() !== '') {
            // Auto-create a note if none is selected
            const newNote: SongNote = {
                id: `n-${Date.now()}`,
                title: localTitleText,
                content: '',
                folderId: null,
                updatedAt: new Date().toLocaleString(),
                ownerId: user ? user.uid : undefined,
                isTitleLocked: true
            };
            setNotes(prev => [newNote, ...prev]);
            setSelectedNoteId(newNote.id);
            setIsEditing(true);
        }
        setIsEditingTitle(false);
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
                
                if (user) {
                    updateDoc(doc(db, "projects", noteId), {
                        audioNotes: updatedAudioNotes
                    }).catch(err => console.error("Error renaming audio note in Firestore:", err));
                }

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
                const matchingAudio = (n.audioNotes || []).find(an => an.id === audioNoteId);
                const attachedPhraseId = matchingAudio ? matchingAudio.phraseId : null;
                
                const updatedAudioNotes = (n.audioNotes || []).filter(an => an.id !== audioNoteId);
                const latestAudio = updatedAudioNotes[updatedAudioNotes.length - 1];
                
                let updatedPhrases = n.phrases || [];
                if (attachedPhraseId && attachedPhraseId.startsWith('p-audio-')) {
                    const phraseObj = updatedPhrases.find(p => p.id === attachedPhraseId);
                    if (phraseObj && phraseObj.text.trim() === '') {
                        updatedPhrases = updatedPhrases.filter(p => p.id !== attachedPhraseId);
                    }
                }
                const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, n.verses || []);
                
                if (user) {
                    updateDoc(doc(db, "projects", noteId), {
                        audioNotes: updatedAudioNotes,
                        audioUrl: latestAudio ? latestAudio.url : '',
                        phrases: finalPhrases
                    }).catch(err => console.error("Error deleting audio note in Firestore:", err));
                }

                return {
                    ...n,
                    audioNotes: updatedAudioNotes,
                    audioUrl: latestAudio ? latestAudio.url : '',
                    phrases: finalPhrases
                };
            }
            return n;
        }));
    };

    const handleAudioDragStart = (e: React.DragEvent, audioId: string) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/audio-note-id', audioId);
        setDraggedAudioId(audioId);
        if (draggedAudioIdRef) draggedAudioIdRef.current = audioId;
    };

    const handleAudioDragEnd = () => {
        setDraggedAudioId(null);
        if (draggedAudioIdRef) draggedAudioIdRef.current = null;
        setDragOverPhraseId(null);
        setDropPosition(null);
        setDragOverGroupId(null);
        setDragOverWordIndex(null);
        setDragOverBlockId(null);
        setBlockDropPosition(null);
    };

    const handleUpdateAudioNoteGroup = (noteId: string, audioNoteId: string, targetGroupId: string | null) => {
        setDraggedAudioId(null);
        if (draggedAudioIdRef) draggedAudioIdRef.current = null;
        setDragOverPhraseId(null);
        setDropPosition(null);
        setDragOverGroupId(null);

        const targetNote = notesRef.current.find(n => n.id === noteId);
        if (!targetNote) return;

        const matchingAudio = (targetNote.audioNotes || []).find(an => an.id === audioNoteId);
        const oldPhraseId = matchingAudio ? matchingAudio.phraseId : null;
        
        const dedicatedPhraseId = targetGroupId === null ? `p-audio-${audioNoteId}` : null;
        
        const updatedAudioNotes = (targetNote.audioNotes || []).map(an => {
            if (an.id === audioNoteId) {
                return { ...an, groupId: targetGroupId, phraseId: dedicatedPhraseId };
            }
            return an;
        });
        
        let updatedPhrases = targetNote.phrases || [];
        if (oldPhraseId && oldPhraseId !== dedicatedPhraseId && oldPhraseId.startsWith('p-audio-')) {
            const phraseObj = updatedPhrases.find(p => p.id === oldPhraseId);
            if (phraseObj && phraseObj.text.trim() === '') {
                updatedPhrases = updatedPhrases.filter(p => p.id !== oldPhraseId);
            }
        }
        
        if (dedicatedPhraseId && !updatedPhrases.some(p => p.id === dedicatedPhraseId)) {
            updatedPhrases.push({
                id: dedicatedPhraseId,
                text: '',
                groupId: null
            });
        }
        
        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, targetNote.verses || []);
        const updatedContent = finalPhrases.map(p => p.text).join('\n');

        handleUpdateNote(noteId, {
            audioNotes: updatedAudioNotes,
            phrases: finalPhrases,
            content: updatedContent
        });
    };

    const handleAttachAudioToPhrase = (audioNoteId: string, phraseId: string | null, groupId: string | null) => {
        setDraggedAudioId(null);
        if (draggedAudioIdRef) draggedAudioIdRef.current = null;
        setDragOverPhraseId(null);
        setDropPosition(null);
        setDragOverGroupId(null);

        if (!selectedNoteId) return;
        const targetNote = notesRef.current.find(n => n.id === selectedNoteId);
        if (!targetNote) return;

        const matchingAudio = (targetNote.audioNotes || []).find(an => an.id === audioNoteId);
        const oldPhraseId = matchingAudio ? matchingAudio.phraseId : null;
        
        const updatedAudioNotes = (targetNote.audioNotes || []).map(an => {
            if (an.id === audioNoteId) {
                return { ...an, groupId, phraseId };
            }
            return an;
        });
        
        let updatedPhrases = targetNote.phrases || [];
        if (oldPhraseId && oldPhraseId !== phraseId && oldPhraseId.startsWith('p-audio-')) {
            const phraseObj = updatedPhrases.find(p => p.id === oldPhraseId);
            if (phraseObj && phraseObj.text.trim() === '') {
                updatedPhrases = updatedPhrases.filter(p => p.id !== oldPhraseId);
            }
        }
        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, targetNote.verses || []);
        const updatedContent = finalPhrases.map(p => p.text).join('\n');

        handleUpdateNote(selectedNoteId, {
            audioNotes: updatedAudioNotes,
            phrases: finalPhrases,
            content: updatedContent
        });
    };

    const handlePlaceAudioAsLineAt = (audioNoteId: string, targetPhraseId: string, position: 'top' | 'bottom') => {
        setDraggedAudioId(null);
        if (draggedAudioIdRef) draggedAudioIdRef.current = null;
        setDragOverPhraseId(null);
        setDropPosition(null);
        setDragOverGroupId(null);
        setDragOverBlockId(null);
        setBlockDropPosition(null);

        if (!selectedNoteId) return;
        const targetNote = notesRef.current.find(n => n.id === selectedNoteId);
        if (!targetNote) return;

        const audioNotes = targetNote.audioNotes || [];
        const matchingAudio = audioNotes.find(an => an.id === audioNoteId);
        if (!matchingAudio) return;

        const oldPhraseId = matchingAudio.phraseId;
        
        const currentPhrases = targetNote.phrases || [];
        const targetIdx = currentPhrases.findIndex(p => p.id === targetPhraseId);
        if (targetIdx === -1) return;

        const targetPhrase = currentPhrases[targetIdx];
        const targetGroupId = targetPhrase.groupId;

        const dedicatedPhraseId = `p-audio-${audioNoteId}`;
        let updatedPhrases = [...currentPhrases];

        if (oldPhraseId && oldPhraseId.startsWith('p-audio-')) {
            const oldPhraseObj = updatedPhrases.find(p => p.id === oldPhraseId);
            if (oldPhraseObj && oldPhraseObj.text.trim() === '') {
                updatedPhrases = updatedPhrases.filter(p => p.id !== oldPhraseId);
            }
        }

        const newTargetIdx = updatedPhrases.findIndex(p => p.id === targetPhraseId);
        if (newTargetIdx === -1) return;

        const spliceIdx = position === 'top' ? newTargetIdx : newTargetIdx + 1;

        const newPhrase: Phrase = {
            id: dedicatedPhraseId,
            text: '',
            groupId: targetGroupId
        };
        updatedPhrases.splice(spliceIdx, 0, newPhrase);

        const updatedAudioNotes = audioNotes.map(an => {
            if (an.id === audioNoteId) {
                return { ...an, phraseId: dedicatedPhraseId, groupId: targetGroupId };
            }
            return an;
        });

        const finalPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, targetNote.verses || []);
        const updatedContent = finalPhrases.map(p => p.text).join('\n');

        handleUpdateNote(selectedNoteId, {
            audioNotes: updatedAudioNotes,
            phrases: finalPhrases,
            content: updatedContent
        });
    };

    const handleStartEditing = async (phraseId: string) => {
        if (isCanvasPreview) return;
        setEditingPhraseId(phraseId);
        setCursorSelectionOffset(null);

        // Write lockedBy to Firestore
        if (selectedNoteId && user) {
            try {
                const docRef = doc(db, "projects", selectedNoteId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const phrases = snap.data().phrases || [];
                    const updated = phrases.map((p: any) => {
                        if (p.id === phraseId) {
                            return { ...p, lockedBy: user.uid };
                        }
                        return p;
                    });
                    await updateDoc(docRef, { phrases: updated });
                }
            } catch (err) {
                console.error("Error setting focus lock in Firestore:", err);
            }
        }
    };

    const handleStopEditing = async (createNext = false) => {
        if (selectedNoteId && activeNote && editingPhraseId) {
            const currentPhrases = activeNote.phrases || [];
            const editingIdx = currentPhrases.findIndex(p => p.id === editingPhraseId);
            const editingPhrase = currentPhrases[editingIdx];
            
            let finalPhrases = [...currentPhrases];
            let nextPhraseId: string | null = null;
            
            if (editingPhrase && editingPhrase.text.trim() === '') {
                const hasAttachedAudio = (activeNote.audioNotes || []).some(an => an.phraseId === editingPhraseId);
                if (!hasAttachedAudio) {
                    finalPhrases = currentPhrases.filter(p => p.id !== editingPhraseId);
                }
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
            
            // Release lock on editingPhrase
            const updatedPhrases = sanitizedPhrases.map((p: any) => {
                if (p.id === editingPhraseId) {
                    return { ...p, lockedBy: null };
                }
                return p;
            });
            
            const newContent = updatedPhrases.map(p => p.text).join('\n');
            
            handleUpdateNote(selectedNoteId, {
                phrases: updatedPhrases,
                content: newContent,
                title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
            });
            
            setEditingPhraseId(nextPhraseId);
            setCursorSelectionOffset(null);
            
            // Immediately sync to database to release lock
            if (user) {
                try {
                    await updateDoc(doc(db, "projects", selectedNoteId), {
                        phrases: updatedPhrases,
                        content: newContent,
                        title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note',
                        updatedAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.error("Error releasing focus lock in Firestore:", err);
                }
            }
        } else {
            setEditingPhraseId(null);
            setCursorSelectionOffset(null);
        }
    };

    const handleBackspaceAtStart = (phraseId: string) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases || [];
        const realPhrases = currentPhrases.filter(p => !p.id.startsWith('placeholder-'));
        const editingIdx = realPhrases.findIndex(p => p.id === phraseId);
        if (editingIdx <= 0) return; // No previous phrase to merge into
        
        const currentPhrase = realPhrases[editingIdx];
        const previousPhrase = realPhrases[editingIdx - 1];
        
        const prevText = previousPhrase.text;
        const currentText = currentPhrase.text;
        const mergedText = prevText + currentText;
        
        let updatedPhrases = currentPhrases.map(p => {
            if (p.id === previousPhrase.id) {
                return { ...p, text: mergedText };
            }
            return p;
        });
        
        const hasAttachedAudio = (activeNote.audioNotes || []).some(an => an.phraseId === phraseId);
        if (!hasAttachedAudio) {
            updatedPhrases = updatedPhrases.filter(p => p.id !== phraseId);
        } else {
            updatedPhrases = updatedPhrases.map(p => {
                if (p.id === phraseId) {
                    return { ...p, text: '' };
                }
                return p;
            });
        }
        
        const sanitizedPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, activeNote.verses || []);
        const newContent = sanitizedPhrases.map(p => p.text).join('\n');
        
        handleUpdateNote(selectedNoteId, {
            phrases: sanitizedPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
        });
        
        setEditingPhraseId(previousPhrase.id);
        setCursorSelectionOffset({
            phraseId: previousPhrase.id,
            offset: prevText.length
        });
    };

    const handleWordDrop = (
        source: { word: string; phraseId: string; wordIndex: number },
        target: { phraseId: string; targetWordIndex: number; position: 'left' | 'right' }
    ) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases || [];
        const sourcePhrase = currentPhrases.find(p => p.id === source.phraseId);
        const targetPhrase = currentPhrases.find(p => p.id === target.phraseId);
        if (!sourcePhrase || !targetPhrase) return;

        const sourceTokens = sourcePhrase.text.split(/(\s+)/);
        const targetTokens = targetPhrase.text.split(/(\s+)/);
        
        if (source.wordIndex >= sourceTokens.length) return;
        if (target.targetWordIndex !== -1 && target.targetWordIndex >= targetTokens.length) return;
        const draggedToken = sourceTokens[source.wordIndex];

        let updatedSourceTokens = [...sourceTokens];
        if (source.wordIndex + 1 < updatedSourceTokens.length && /^\s+$/.test(updatedSourceTokens[source.wordIndex + 1])) {
            updatedSourceTokens.splice(source.wordIndex, 2);
        } else if (source.wordIndex - 1 >= 0 && /^\s+$/.test(updatedSourceTokens[source.wordIndex - 1])) {
            updatedSourceTokens.splice(source.wordIndex - 1, 2);
        } else {
            updatedSourceTokens.splice(source.wordIndex, 1);
        }
        const newSourceText = updatedSourceTokens.join('').trim();

        let updatedTargetTokens: string[] = [];
        if (target.targetWordIndex === -1) {
            updatedTargetTokens = [draggedToken];
        } else if (source.phraseId === target.phraseId) {
            let adjustedTargetIdx = target.targetWordIndex;
            if (source.wordIndex < target.targetWordIndex) {
                const removedCount = (source.wordIndex + 1 < sourceTokens.length && /^\s+$/.test(sourceTokens[source.wordIndex + 1])) || (source.wordIndex - 1 >= 0 && /^\s+$/.test(sourceTokens[source.wordIndex - 1])) ? 2 : 1;
                adjustedTargetIdx = Math.max(0, target.targetWordIndex - removedCount);
            }
            if (target.position === 'left') {
                updatedTargetTokens = [
                    ...updatedSourceTokens.slice(0, adjustedTargetIdx),
                    draggedToken,
                    " ",
                    ...updatedSourceTokens.slice(adjustedTargetIdx)
                ];
            } else {
                updatedTargetTokens = [
                    ...updatedSourceTokens.slice(0, adjustedTargetIdx + 1),
                    " ",
                    draggedToken,
                    ...updatedSourceTokens.slice(adjustedTargetIdx + 1)
                ];
            }
        } else {
            if (target.position === 'left') {
                updatedTargetTokens = [
                    ...targetTokens.slice(0, target.targetWordIndex),
                    draggedToken,
                    " ",
                    ...targetTokens.slice(target.targetWordIndex)
                ];
            } else {
                updatedTargetTokens = [
                    ...targetTokens.slice(0, target.targetWordIndex + 1),
                    " ",
                    draggedToken,
                    ...targetTokens.slice(target.targetWordIndex + 1)
                ];
            }
        }
        const newTargetText = updatedTargetTokens.join('').trim();

        let updatedPhrases = currentPhrases.map(p => {
            if (p.id === source.phraseId && p.id === target.phraseId) {
                return { ...p, text: newTargetText };
            }
            if (p.id === source.phraseId) {
                return { ...p, text: newSourceText };
            }
            if (p.id === target.phraseId) {
                return { ...p, text: newTargetText };
            }
            return p;
        });

        const hasAttachedAudio = (activeNote.audioNotes || []).some(an => an.phraseId === source.phraseId);
        if (newSourceText === '' && !hasAttachedAudio && source.phraseId !== target.phraseId) {
            updatedPhrases = updatedPhrases.filter(p => p.id !== source.phraseId);
        }

        const sanitizedPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, activeNote.verses || []);
        const newContent = sanitizedPhrases.map(p => p.text).join('\n');

        handleUpdateNote(selectedNoteId, {
            phrases: sanitizedPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
        });
    };

    const handleWordDropOnPhrase = (
        source: { word: string; phraseId: string; wordIndex: number },
        targetPhraseId: string
    ) => {
        if (!selectedNoteId || !activeNote) return;
        if (source.phraseId === targetPhraseId) return;

        const currentPhrases = activeNote.phrases || [];
        const sourcePhrase = currentPhrases.find(p => p.id === source.phraseId);
        const targetPhrase = currentPhrases.find(p => p.id === targetPhraseId);
        if (!sourcePhrase || !targetPhrase) return;

        const sourceTokens = sourcePhrase.text.split(/(\s+)/);
        if (source.wordIndex >= sourceTokens.length) return;
        const draggedToken = sourceTokens[source.wordIndex];

        const isPlaceholder = targetPhraseId.startsWith('placeholder-');
        if (isPlaceholder) {
            const targetGroupId = targetPhraseId.replace('placeholder-', '');
            const newPhraseId = `p-${Math.random().toString(36).substring(2, 9)}`;
            const newPhrase: Phrase = {
                id: newPhraseId,
                text: draggedToken,
                groupId: targetGroupId
            };

            let updatedSourceTokens = [...sourceTokens];
            if (source.wordIndex + 1 < updatedSourceTokens.length && /^\s+$/.test(updatedSourceTokens[source.wordIndex + 1])) {
                updatedSourceTokens.splice(source.wordIndex, 2);
            } else if (source.wordIndex - 1 >= 0 && /^\s+$/.test(updatedSourceTokens[source.wordIndex - 1])) {
                updatedSourceTokens.splice(source.wordIndex - 1, 2);
            } else {
                updatedSourceTokens.splice(source.wordIndex, 1);
            }
            const newSourceText = updatedSourceTokens.join('').trim();

            let updatedPhrases = currentPhrases.map(p => {
                if (p.id === source.phraseId) {
                    return { ...p, text: newSourceText };
                }
                return p;
            });

            const placeholderIdx = currentPhrases.findIndex(p => p.id === targetPhraseId);
            if (placeholderIdx !== -1) {
                updatedPhrases.splice(placeholderIdx, 0, newPhrase);
            } else {
                updatedPhrases.push(newPhrase);
            }

            const hasAttachedAudio = (activeNote.audioNotes || []).some(an => an.phraseId === source.phraseId);
            if (newSourceText === '' && !hasAttachedAudio) {
                updatedPhrases = updatedPhrases.filter(p => p.id !== source.phraseId);
            }

            const sanitizedPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, activeNote.verses || []);
            const newContent = sanitizedPhrases.map(p => p.text).join('\n');

            handleUpdateNote(selectedNoteId, {
                phrases: sanitizedPhrases,
                content: newContent,
                title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
            });
            return;
        }

        let updatedSourceTokens = [...sourceTokens];
        if (source.wordIndex + 1 < updatedSourceTokens.length && /^\s+$/.test(updatedSourceTokens[source.wordIndex + 1])) {
            updatedSourceTokens.splice(source.wordIndex, 2);
        } else if (source.wordIndex - 1 >= 0 && /^\s+$/.test(updatedSourceTokens[source.wordIndex - 1])) {
            updatedSourceTokens.splice(source.wordIndex - 1, 2);
        } else {
            updatedSourceTokens.splice(source.wordIndex, 1);
        }
        const newSourceText = updatedSourceTokens.join('').trim();
        const newTargetText = (targetPhrase.text.trim() + " " + draggedToken).trim();

        let updatedPhrases = currentPhrases.map(p => {
            if (p.id === source.phraseId) {
                return { ...p, text: newSourceText };
            }
            if (p.id === targetPhraseId) {
                return { ...p, text: newTargetText };
            }
            return p;
        });

        const hasAttachedAudio = (activeNote.audioNotes || []).some(an => an.phraseId === source.phraseId);
        if (newSourceText === '' && !hasAttachedAudio) {
            updatedPhrases = updatedPhrases.filter(p => p.id !== source.phraseId);
        }

        const sanitizedPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, activeNote.verses || []);
        const newContent = sanitizedPhrases.map(p => p.text).join('\n');

        handleUpdateNote(selectedNoteId, {
            phrases: sanitizedPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
        });
    };

    const handleWordDropOnEmptyCanvas = (
        source: { word: string; phraseId: string; wordIndex: number }
    ) => {
        if (!selectedNoteId || !activeNote) return;

        const currentPhrases = activeNote.phrases || [];
        const sourcePhrase = currentPhrases.find(p => p.id === source.phraseId);
        if (!sourcePhrase) return;

        const sourceTokens = sourcePhrase.text.split(/(\s+)/);
        if (source.wordIndex >= sourceTokens.length) return;
        const draggedToken = sourceTokens[source.wordIndex];

        const newPhraseId = `p-${Math.random().toString(36).substring(2, 9)}`;
        const newPhrase: Phrase = {
            id: newPhraseId,
            text: draggedToken,
            groupId: null
        };

        let updatedSourceTokens = [...sourceTokens];
        if (source.wordIndex + 1 < updatedSourceTokens.length && /^\s+$/.test(updatedSourceTokens[source.wordIndex + 1])) {
            updatedSourceTokens.splice(source.wordIndex, 2);
        } else if (source.wordIndex - 1 >= 0 && /^\s+$/.test(updatedSourceTokens[source.wordIndex - 1])) {
            updatedSourceTokens.splice(source.wordIndex - 1, 2);
        } else {
            updatedSourceTokens.splice(source.wordIndex, 1);
        }
        const newSourceText = updatedSourceTokens.join('').trim();

        let updatedPhrases = currentPhrases.map(p => {
            if (p.id === source.phraseId) {
                return { ...p, text: newSourceText };
            }
            return p;
        });

        updatedPhrases.push(newPhrase);

        const hasAttachedAudio = (activeNote.audioNotes || []).some(an => an.phraseId === source.phraseId);
        if (newSourceText === '' && !hasAttachedAudio) {
            updatedPhrases = updatedPhrases.filter(p => p.id !== source.phraseId);
        }

        const sanitizedPhrases = cleanupAndEnsurePlaceholders(updatedPhrases, activeNote.verses || []);
        const newContent = sanitizedPhrases.map(p => p.text).join('\n');

        handleUpdateNote(selectedNoteId, {
            phrases: sanitizedPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || activeNote.title || 'Untitled Note'
        });
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
        if (isCanvasPreview) return;
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
        
        const matchingAudio = (targetNote.audioNotes || []).find(an => an.id === audioNoteId);
        const groupId = matchingAudio ? matchingAudio.groupId : null;
        const phraseId = matchingAudio ? matchingAudio.phraseId : null;

        setTranscribingAudioNoteId(audioNoteId);
        setIsTranscribing(true);
        try {
            let body: any = null;
            const headers: any = {};
            
            if (audioUrl.startsWith('blob:')) {
                const audioBlob = await fetch(audioUrl).then(r => r.blob());
                body = await getWavBlob(audioBlob);
                headers['Content-Type'] = 'application/octet-stream';
            } else {
                body = JSON.stringify({ audioUrl });
                headers['Content-Type'] = 'application/json';
            }

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: headers,
                body: body,
            });
            if (response.ok) {
                const data = await response.json();
                const transcriptText = (data.text || "").trim();
                
                let line1 = "";
                let line2 = "";
                if (transcriptText) {
                    if (transcriptText.includes('\n')) {
                        const parts = transcriptText.split('\n');
                        line1 = parts[0].trim();
                        line2 = parts.slice(1).join('\n').trim();
                    } else {
                        const words = transcriptText.split(/\s+/).filter((w: string) => w.length > 0);
                        if (words.length === 1) {
                            line1 = words[0];
                        } else if (words.length > 1) {
                            const mid = Math.ceil(words.length / 2);
                            line1 = words.slice(0, mid).join(" ");
                            line2 = words.slice(mid).join(" ");
                        }
                    }
                }
                
                const newPhrase1: Phrase = {
                    id: `p-${Math.random().toString(36).substring(2, 9)}`,
                    text: line1,
                    groupId: groupId || null
                };
                const newPhrase2: Phrase | null = line2 ? {
                    id: `p-${Math.random().toString(36).substring(2, 9)}`,
                    text: line2,
                    groupId: groupId || null
                } : null;
                const newPhrasesToInsert: Phrase[] = newPhrase2 ? [newPhrase1, newPhrase2] : [newPhrase1];
                
                let currentPhrases = [...(targetNote.phrases || [])];
                let inserted = false;
                
                // Case 1: Audio is attached to a specific phrase
                if (phraseId) {
                    const idx = currentPhrases.findIndex(p => p.id === phraseId);
                    if (idx !== -1) {
                        if (currentPhrases[idx].text.trim() === '') {
                            // Replace the empty hosting phrase with the first transcribed phrase
                            currentPhrases.splice(idx, 1, newPhrase1);
                            if (newPhrase2) currentPhrases.splice(idx + 1, 0, newPhrase2);
                        } else {
                            // If the phrase already has text, insert new phrases after it
                            currentPhrases.splice(idx + 1, 0, ...newPhrasesToInsert);
                        }
                        inserted = true;
                    }
                }

                
                // Case 2: Audio belongs to a group (Verse/Chorus/Bridge)
                if (!inserted && groupId) {
                    // Find the first phrase in this group
                    let firstInGroupIdx = -1;
                    for (let i = 0; i < currentPhrases.length; i++) {
                        if (currentPhrases[i].groupId === groupId) {
                            firstInGroupIdx = i;
                            break;
                        }
                    }
                    if (firstInGroupIdx !== -1) {
                        currentPhrases.splice(firstInGroupIdx, 0, ...newPhrasesToInsert);
                        inserted = true;
                    } else {
                        // Group has no phrases yet. Insert them and replace the placeholder
                        const placeholderIdx = currentPhrases.findIndex(p => p.id === `placeholder-${groupId}`);
                        if (placeholderIdx !== -1) {
                            currentPhrases.splice(placeholderIdx, 1, ...newPhrasesToInsert);
                            inserted = true;
                        } else {
                            currentPhrases.push(...newPhrasesToInsert);
                            inserted = true;
                        }
                    }
                }
                
                // Case 3: Free / ungrouped audio, or fallback
                if (!inserted) {
                    currentPhrases.push(...newPhrasesToInsert);
                }
                
                // Attach the audio note to the first of the newly transcribed phrases so it sticks above the text
                const updatedAudioNotes = (targetNote.audioNotes || []).map(an => {
                    if (an.id === audioNoteId) {
                        return {
                            ...an,
                            phraseId: newPhrase1.id,
                            groupId: newPhrase1.groupId
                        };
                    }
                    return an;
                });
                
                const finalPhrases = cleanupAndEnsurePlaceholders(currentPhrases, targetNote.verses || []);
                const updatedContent = finalPhrases.map(p => p.text).join('\n');
                
                handleUpdateNote(noteId, {
                    content: updatedContent,
                    phrases: finalPhrases,
                    audioNotes: updatedAudioNotes,
                    isAudioOnly: false
                });
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
            const fileRef = storageRef(storage, `users/${user.uid}/recordings/${noteId}_RecId_${recId}.webm`);
            await uploadBytes(fileRef, blob);
            const downloadUrl = await getDownloadURL(fileRef);
            
            const targetNote = notesRef.current.find(n => n.id === noteId);
            if (targetNote) {
                const updatedAudioNotes = (targetNote.audioNotes || []).map(an => {
                    if (an.id === recId) {
                        return { ...an, url: downloadUrl };
                    }
                    return an;
                });
                const latestAudio = updatedAudioNotes[updatedAudioNotes.length - 1];
                
                handleUpdateNote(noteId, {
                    audioNotes: updatedAudioNotes,
                    audioUrl: latestAudio ? latestAudio.url : targetNote.audioUrl
                });
            }
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
        if (user) {
            deleteDoc(doc(db, "projects", id)).catch(err => console.error("Error deleting project in Firestore:", err));
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
            const initialPhrases = syncPhrasesWithContent(val, []);
            const newNote: SongNote = {
                id: `n-${Date.now()}`,
                title: getTitleFromContent(val) || 'Untitled Note',
                content: val,
                folderId: activeFolderIdFilter,
                updatedAt: new Date().toLocaleString(),
                phrases: initialPhrases,
                verses: []
            };
            setNotes(prev => [newNote, ...prev]);
            setSelectedNoteId(newNote.id);
            if (initialPhrases[0]) {
                setEditingPhraseId(initialPhrases[0].id);
            }
            setIsEditing(true);
        } else {
            const active = notes.find(n => n.id === selectedNoteId);
            const wasBlank = !active || (active.content.trim() === '');
            
            if (wasBlank && val.trim() !== '') {
                const initialPhrases = syncPhrasesWithContent(val, []);
                handleUpdateNote(selectedNoteId, { 
                    content: val, 
                    title: getTitleFromContent(val) || 'Untitled Note',
                    phrases: initialPhrases
                });
                if (initialPhrases[0]) {
                    setEditingPhraseId(initialPhrases[0].id);
                }
                setIsEditing(true);
            } else {
                // Update active note normally
                handleUpdateNote(selectedNoteId, { 
                    content: val, 
                    title: getTitleFromContent(val) || 'Untitled Note'
                });
            }
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
            
            // Trigger brief "Saved ✓" flash on the button
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1800);
            
            // Progress bar and quotes trigger
            if (activeNote.content !== lastAwardedContent) {
                triggerProgressBonus(activeNote.content, true);
                setLastAwardedContent(activeNote.content);
            }
            
            // Collaborative contribution progress integration
            if (isCollaborative && user) {
                const percentages = calculateContributionsPercentage(activeNote);
                const myCont = percentages[user.uid] || 0;
                if (myCont > 0) {
                    const bonusAmount = Math.max(1, Math.min(10, Math.round(myCont / 10)));
                    const currentProgressStr = localStorage.getItem('songwriting-progress') || '35';
                    let currentProgress = parseInt(currentProgressStr);
                    const nextProgress = Math.min(100, currentProgress + bonusAmount);
                    localStorage.setItem('songwriting-progress', nextProgress.toString());
                    
                    window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
                }
            }
            
            setLastSavedContent(activeNote.content);
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
                detail: { triggerType: 'major-task' }
            }));
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

    const getNoteTime = (note: SongNote) => {
        if (!note.updatedAt) return 0;
        const parsed = Date.parse(note.updatedAt);
        return isNaN(parsed) ? 0 : parsed;
    };

    const notesFilteredByMode = [...notes].sort((a, b) => getNoteTime(b) - getNoteTime(a));

    const filteredNotes = notesFilteredByMode.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter notes based on search state (folders are removed)
    const displayNotes = filteredNotes;

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

    // Creative Tools Suite rendering functions
    const renderTunerScale = () => {
        const noteIdx = noteStrings.indexOf(tunerNote);
        if (noteIdx === -1 || !tunerActive) {
            return (
                <div className="flex items-center justify-between w-full px-4 py-2 border-y border-stone-200 text-[10px] font-bold text-stone-400 select-none">
                    <span>B</span><span>C</span><span>C#</span>
                    <span className="text-[#FF4040] text-sm font-black border-b-2 border-[#FF4040] pb-0.5">D</span>
                    <span>D#</span><span>E</span><span>F</span>
                </div>
            );
        }
        const neighbors = [-3, -2, -1, 0, 1, 2, 3];
        return (
            <div className="flex items-center justify-between w-full px-4 py-2 border-y border-stone-200/80 text-[10px] font-bold text-stone-400 select-none">
                {neighbors.map(offset => {
                    const idx = (noteIdx + offset + 12) % 12;
                    const name = noteStrings[idx];
                    if (offset === 0) {
                        return (
                            <span key={offset} className="text-[#FF4040] text-sm font-black border-b-2 border-[#FF4040] pb-0.5">
                                {name}
                            </span>
                        );
                    }
                    return <span key={offset}>{name}</span>;
                })}
            </div>
        );
    };

    const renderGuitarTuner = () => {
        return (
            <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    {/* Left Cream Container */}
                    <div className="bg-[#FAF9F6] border border-stone-200/60 rounded-[24px] p-5 flex flex-col justify-between items-center w-full md:w-[42%] min-h-[210px] text-stone-850">
                        <div className="flex flex-col items-center select-none w-full">
                            <span className="text-5xl font-black tracking-tight text-stone-850">{tunerNote}</span>
                            {tunerActive && tunerFreq ? (
                                <span className="text-[11px] font-extrabold text-stone-500 mt-1 uppercase tracking-wider">
                                    {tunerFreq}Hz
                                </span>
                            ) : (
                                <span className="text-[11px] font-extrabold text-stone-300 mt-1 uppercase tracking-wider">
                                    --- Hz
                                </span>
                            )}
                        </div>

                        <div className="w-full my-3">
                            {renderTunerScale()}
                        </div>

                        <div className="w-full flex gap-2 mt-1">
                            {/* Start Tuner Button */}
                            <button
                                onClick={toggleTunerMic}
                                className={`flex-grow py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm text-center ${
                                    tunerActive
                                        ? 'bg-stone-700 text-white animate-pulse border border-stone-700'
                                        : 'bg-stone-950 text-white hover:bg-stone-900 border border-stone-955'
                                }`}
                                type="button"
                            >
                                {tunerActive ? 'Stop Tuner' : 'Start Tuner'}
                            </button>

                            {/* Save Checkmark Button */}
                            <button
                                onClick={handleSaveTuning}
                                disabled={!tunerActive || !tunerFreq}
                                className={`px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer border flex items-center justify-center ${
                                    tunerActive && tunerFreq
                                        ? 'bg-stone-950 text-white border-stone-955 hover:bg-stone-900 shadow-sm'
                                        : 'bg-transparent text-stone-300 border-stone-200 cursor-not-allowed'
                                }`}
                                title="Save current tuning value"
                                type="button"
                            >
                                <Check size={16} className="stroke-[2.5]" />
                            </button>
                        </div>
                    </div>

                    {/* Right Light Container */}
                    <div className="bg-[#FAF9F6] border border-stone-200/60 rounded-[24px] p-6 flex flex-col items-center justify-center flex-grow min-h-[210px]">
                        <svg width="100%" height="100%" viewBox="38 20 204 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[350px]">
                            {/* Background scale arc */}
                            <path d="M 40 130 A 100 100 0 0 1 240 130" stroke="#E6E6E2" strokeWidth="4" strokeLinecap="round" />
                            
                            {/* Center reference tick */}
                            <line x1="140" y1="130" x2="140" y2="122" stroke="#FF4040" strokeWidth="2.5" strokeLinecap="round" />

                            {/* Gauge Ticks */}
                            {[-40, -35, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40].map((tick) => {
                                const angle = tick * 1.5;
                                const isMajor = tick % 20 === 0;
                                const showNumber = tick !== 0 && tick % 20 === 0;
                                const tickLen = isMajor ? 10 : 5;
                                return (
                                    <g key={tick} transform={`rotate(${angle}, 140, 130)`}>
                                        <line
                                            x1="140"
                                            y1="30"
                                            x2="140"
                                            y2={30 + tickLen}
                                            stroke={isMajor ? "#78716C" : "#D6D3D1"}
                                            strokeWidth={isMajor ? 1.5 : 0.8}
                                        />
                                        {showNumber && (
                                            <text
                                                x="140"
                                                y={30 + tickLen + 12}
                                                textAnchor="middle"
                                                className="text-[9px] font-extrabold text-stone-500 fill-stone-500 font-sans"
                                                transform={`rotate(${-angle}, 140, ${30 + tickLen + 8})`}
                                            >
                                                {tick}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Red Needle */}
                            <g transform={`rotate(${tunerCents * 1.5}, 140, 130)`} style={{ transition: 'transform 0.1s ease-out' }}>
                                <line x1="140" y1="130" x2="140" y2="25" stroke="#FF4040" strokeWidth="2.2" strokeLinecap="round" />
                                <circle cx="140" cy="130" r="5" fill="#FF4040" />
                                <circle cx="140" cy="130" r="2.5" fill="white" />
                            </g>
                        </svg>
                    </div>
                </div>
            </div>
        );
    };

    const renderTapTempo = () => {
        return (
            <div className="flex flex-col gap-3 w-full">
                <button
                    onClick={(e) => handleTapTempo(e)}
                    className="w-full h-32 bg-stone-50 hover:bg-stone-100/50 border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.99] select-none group py-4"
                    type="button"
                >
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-1 select-none">Click or Tap here</span>
                    <span className="text-3xl font-black text-stone-800 select-none">{metronomeBpm} BPM</span>
                    <span className="text-[9px] text-stone-500 mt-2 select-none group-hover:text-stone-600 transition-colors">Press Spacebar to tap, or click anywhere inside this box</span>
                </button>

                <div className="flex items-center justify-between bg-stone-50 border border-stone-200/60 p-3 rounded-xl">
                    <div className="flex items-center gap-2 select-none">
                        <Music size={14} className="text-stone-500" />
                        <span className="text-xs font-semibold text-stone-700">Metronome Tick Sound</span>
                    </div>
                    <button
                        onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                            isMetronomePlaying 
                                ? 'bg-stone-900 text-white' 
                                : 'bg-white text-stone-850 border border-stone-200 shadow-2xs hover:bg-stone-50'
                        }`}
                        type="button"
                    >
                        {isMetronomePlaying ? 'Stop Metronome' : 'Start Metronome'}
                    </button>
                </div>
            </div>
        );
    };

    const renderRhymeLexicon = () => {
        const groupedBySyllables: Record<number, typeof lexiconResults> = {};
        lexiconResults.forEach(item => {
            const syl = item.syllables || 1;
            if (!groupedBySyllables[syl]) groupedBySyllables[syl] = [];
            groupedBySyllables[syl].push(item);
        });

        return (
            <div className="flex flex-col gap-3.5 w-full">
                <form onSubmit={handleLexiconSearch} className="flex gap-2">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Type a word to search (e.g. sky, love, time)..."
                            value={lexiconWord}
                            onChange={(e) => setLexiconWord(e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans placeholder:text-stone-400 font-semibold focus:outline-none focus:border-stone-400"
                        />
                        {lexiconLoading && (
                            <div className="absolute right-3 top-3 w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>
                    <select
                        value={lexiconMode}
                        onChange={(e: any) => setLexiconMode(e.target.value)}
                        className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-stone-400 cursor-pointer"
                    >
                        <option value="rhyme">Perfect Rhyme</option>
                        <option value="near">Near Rhyme</option>
                        <option value="synonym">Synonyms</option>
                    </select>
                </form>

                {lexiconResults.length === 0 ? (
                    <div className="bg-stone-50 border border-stone-150 rounded-xl p-6 text-center select-none">
                        <p className="text-xs text-stone-400 font-medium">Type a word to search for rhymes or synonyms.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3.5 max-h-48 overflow-y-auto mt-1 pr-1 no-scrollbar">
                        {Object.keys(groupedBySyllables).map(sylKey => {
                            const syl = parseInt(sylKey);
                            const words = groupedBySyllables[syl];
                            return (
                                <div key={syl} className="flex flex-col gap-1.5">
                                    <span className="text-[9px] text-stone-450 font-bold uppercase tracking-wider select-none">
                                        {syl} {syl === 1 ? 'Syllable' : 'Syllables'}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {words.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    insertTextAtCursor(item.word + ' ');
                                                    navigator.clipboard.writeText(item.word).catch(console.error);
                                                }}
                                                className="px-2.5 py-1 bg-stone-50 hover:bg-stone-900 border border-stone-200 hover:border-stone-900 rounded-lg text-xs font-semibold text-stone-800 hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
                                                title="Click to insert and copy"
                                                type="button"
                                            >
                                                {item.word}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderInspirationTools = () => {
        const cards = inspirationCards.length > 0 ? inspirationCards : INSPIRATION_CARDS;
        const activeCard = cards[currentCardIndex % cards.length];
        const prevCard = cards[(currentCardIndex - 1 + cards.length) % cards.length];
        const nextCard = cards[(currentCardIndex + 1) % cards.length];
        const noteKey = selectedNoteId || 'global';
        const cardAnswers = (inspirationAnswers[noteKey] || {})[activeCard.id] || ['', '', ''];

        const triggerSwipeAnimation = (isNext: boolean) => {
            if (swipingToBack) return;
            // Reset drag offset immediately — card sinks to back, not flies sideways
            setInspirationDragOffset(0);
            setSwipingToBack(true);
            setTimeout(() => {
                if (isNext) {
                    setCurrentCardIndex((prev) => (prev === cards.length - 1 ? 0 : prev + 1));
                } else {
                    setCurrentCardIndex((prev) => (prev === 0 ? cards.length - 1 : prev - 1));
                }
                setSwipingToBack(false);
            }, 320);
        };

        const handlePrevCard = () => {
            triggerSwipeAnimation(false);
        };

        const handleNextCard = () => {
            triggerSwipeAnimation(true);
        };

        const handleSaveAnswer = (cardId: string, qIdx: number, val: string) => {
            const noteAnswers = { ...(inspirationAnswers[noteKey] || {}) };
            const cardAnswersCopy = [...(noteAnswers[cardId] || ['', '', ''])];
            cardAnswersCopy[qIdx] = val;
            noteAnswers[cardId] = cardAnswersCopy;

            const updated = {
                ...inspirationAnswers,
                [noteKey]: noteAnswers
            };
            setInspirationAnswers(updated);
            localStorage.setItem('veinote-inspiration-answers', JSON.stringify(updated));
        };

        // Swipe touch gesture handlers
        const handleTouchStart = (e: React.TouchEvent) => {
            if (swipingToBack) return;
            inspirationTouchStartXRef.current = e.touches[0].clientX;
        };

        const handleTouchMove = (e: React.TouchEvent) => {
            if (swipingToBack || inspirationTouchStartXRef.current === 0) return;
            const diffX = e.touches[0].clientX - inspirationTouchStartXRef.current;
            setInspirationDragOffset(diffX);
        };

        const handleTouchEnd = (e: React.TouchEvent) => {
            if (swipingToBack || inspirationTouchStartXRef.current === 0) return;
            const touch = e.changedTouches[0] || e.touches[0];
            const endX = touch ? touch.clientX : inspirationTouchStartXRef.current;
            const diffX = endX - inspirationTouchStartXRef.current;
            inspirationTouchStartXRef.current = 0;

            if (Math.abs(diffX) > 50) {
                // Sink card to back of stack
                setInspirationDragOffset(0);
                triggerSwipeAnimation(diffX < 0);
            } else {
                // Smooth snap-back, no spring/elastic
                setInspirationDragOffset(0);
                setExpandedCardId(activeCard.id);
            }
        };

        // Swipe mouse drag gesture handlers
        const handleMouseDown = (e: React.MouseEvent) => {
            if (swipingToBack) return;
            inspirationDragStartXRef.current = e.clientX;
        };

        const handleMouseMove = (e: React.MouseEvent) => {
            if (swipingToBack || inspirationDragStartXRef.current === 0) return;
            const diffX = e.clientX - inspirationDragStartXRef.current;
            setInspirationDragOffset(diffX);
        };

        const handleMouseUp = (e: React.MouseEvent) => {
            if (swipingToBack || inspirationDragStartXRef.current === 0) return;
            const diffX = e.clientX - inspirationDragStartXRef.current;
            inspirationDragStartXRef.current = 0;

            if (Math.abs(diffX) > 50) {
                // Sink card to back of stack
                setInspirationDragOffset(0);
                triggerSwipeAnimation(diffX < 0);
            } else {
                // Smooth snap-back, no spring/elastic
                setInspirationDragOffset(0);
                setExpandedCardId(activeCard.id);
            }
        };

        const handleMouseLeave = () => {
            if (swipingToBack || inspirationDragStartXRef.current === 0) return;
            inspirationDragStartXRef.current = 0;
            setInspirationDragOffset(0);
        };

        const getCategoryIcon = (category: string) => {
            switch (category) {
                case 'Daily Life':
                    return <Coffee size={15} className="text-stone-700" />;
                case 'Nostalgia':
                    return <Heart size={15} className="text-stone-700 fill-stone-700/10" />;
                case 'History':
                    return <BookOpen size={15} className="text-stone-700" />;
                case 'Nature':
                    return <Compass size={15} className="text-stone-700" />;
                case 'Space & Sci-Fi':
                    return <Sparkles size={15} className="text-stone-700" />;
                case 'Philosophy':
                    return <Brain size={15} className="text-stone-700" />;
                case 'Sports & Motion':
                    return <Activity size={15} className="text-stone-700" />;
                case 'Secrets & Dreams':
                    return <Key size={15} className="text-stone-700" />;
                default:
                    return <Sparkles size={15} className="text-stone-700" />;
            }
        };

        // Compute 3D Stack interactive style adjustments based on drag offset
        const isDragging = inspirationDragOffset !== 0 && !swipingToBack;

        const prevDragRatio = Math.min(1, inspirationDragOffset > 0 ? (inspirationDragOffset / 80) : 0);
        const prevRotation = -8 + (prevDragRatio * 8);
        const prevTranslateX = -42 + (prevDragRatio * 42);
        const prevScale = 0.92 + (prevDragRatio * 0.08);
        const prevOpacity = 0.4 + (prevDragRatio * 0.4);

        const nextDragRatio = Math.min(1, inspirationDragOffset < 0 ? (Math.abs(inspirationDragOffset) / 80) : 0);
        const nextRotation = 6 - (nextDragRatio * 6);
        const nextTranslateX = 42 - (nextDragRatio * 42);
        const nextScale = 0.92 + (nextDragRatio * 0.08);
        const nextOpacity = 0.4 + (nextDragRatio * 0.4);

        // Drag-follow opacity (only used while manually dragging, not when sinking)
        const activeDragOpacity = Math.max(0, 1 - (Math.abs(inspirationDragOffset) / 280));

        if (expandedCardId && expandedCardId === activeCard.id) {
            return (
                <div className="flex flex-col gap-4 w-full animate-in fade-in zoom-in-95 duration-250">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100 select-none">
                        <button
                            onClick={() => setExpandedCardId(null)}
                            className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-855 cursor-pointer transition-colors"
                            type="button"
                        >
                            <ChevronLeft size={16} className="stroke-[2.5]" />
                            <span>Back to Cards</span>
                        </button>
                        <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider bg-stone-100 px-2.5 py-1 rounded-full shadow-3xs border border-stone-200/10">
                            {activeCard.category}
                        </span>
                    </div>

                    {/* Title & Body */}
                    <div className="flex flex-col gap-1 select-none">
                        <h3 className="text-xl font-black tracking-tight text-stone-850">
                            {activeCard.title}
                        </h3>
                        <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mt-1">
                            Answer the prompts to inspire your writing:
                        </p>
                    </div>

                    {/* Questions Form */}
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[220px] pr-1 no-scrollbar">
                        {activeCard.questions.map((q, qIdx) => {
                            const currentVal = cardAnswers[qIdx] || '';
                            return (
                                <div key={qIdx} className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-stone-750 select-none leading-relaxed">
                                        {qIdx + 1}. {q}
                                    </label>
                                    <textarea
                                        value={currentVal}
                                        onChange={(e) => handleSaveAnswer(activeCard.id, qIdx, e.target.value)}
                                        placeholder="Type your thoughts, imagery, or lyrics ideas..."
                                        rows={2}
                                        className="w-full px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/30 focus:bg-white border border-stone-200 focus:border-stone-400 rounded-xl text-xs font-sans placeholder:text-stone-400 font-semibold focus:outline-none transition-all resize-none shadow-3xs"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Back to Work Button */}
                    <button
                        onClick={() => setShowToolsPanel(false)}
                        className="w-full mt-2 py-3 rounded-xl bg-stone-950 text-white hover:bg-stone-900 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-sm text-center"
                        type="button"
                    >
                        Back to Canvas
                    </button>
                </div>
            );
        }

        // Swiper View (Stacked Neutral Cards on Soft Pink Background)
        return (
            <div className="flex flex-col gap-4 w-full animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 select-none border-b border-stone-100">
                    <span className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">Inspirations</span>
                    <button
                        onClick={() => setShowToolsPanel(false)}
                        className="text-[10px] font-bold text-stone-500 hover:text-stone-855 transition-colors uppercase tracking-wider cursor-pointer flex items-center gap-0.5"
                        type="button"
                    >
                        <span>Back to Canvas</span>
                        <ChevronRight size={14} className="stroke-[2.5]" />
                    </button>
                </div>

                {/* 3D Stack Container on Soft Pink background */}
                <div className="relative w-full h-[280px] bg-[#FFE4E6]/40 border border-pink-100 rounded-[32px] flex flex-col justify-center items-center overflow-hidden py-4 select-none">
                    
                    {/* Card Stack Layout */}
                    <div className="relative w-[320px] h-[190px] flex items-center justify-center">
                        
                        {/* Prev Card (Tilted Left, Behind) */}
                        <div 
                            className="absolute w-[260px] h-[170px] bg-white border border-stone-200 rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] opacity-40 select-none flex flex-col justify-between items-start"
                            style={{ 
                                transform: `rotate(${prevRotation}deg) translateX(${prevTranslateX}px) translateY(4px) scale(${prevScale})`,
                                opacity: Math.min(1, Math.max(0.15, prevOpacity)),
                                transition: isDragging ? 'none' : 'all 0.28s ease-out',
                                zIndex: 5 
                            }}
                        >
                            <div className="w-8 h-8 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center shadow-3xs">
                                {getCategoryIcon(prevCard.category)}
                            </div>
                            <div className="mt-2 text-left w-full">
                                <h4 className="text-[13px] font-bold text-stone-400 leading-snug line-clamp-2">
                                    {prevCard.title}
                                </h4>
                            </div>
                            <div className="w-full flex justify-between items-end">
                                <span className="text-[9px] font-bold text-stone-355 border-b border-stone-200">Read prompts</span>
                                <div className="w-6 h-6 rounded-full bg-stone-50 border border-stone-150 flex items-center justify-center text-stone-300">
                                    <ArrowUpRight size={12} />
                                </div>
                            </div>
                        </div>

                        {/* Next Card (Tilted Right, Behind) */}
                        <div 
                            className="absolute w-[260px] h-[170px] bg-white border border-stone-200 rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] opacity-40 select-none flex flex-col justify-between items-start"
                            style={{ 
                                transform: `rotate(${nextRotation}deg) translateX(${nextTranslateX}px) translateY(4px) scale(${nextScale})`,
                                opacity: Math.min(1, Math.max(0.15, nextOpacity)),
                                transition: isDragging ? 'none' : 'all 0.28s ease-out',
                                zIndex: 5 
                            }}
                        >
                            <div className="w-8 h-8 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center shadow-3xs">
                                {getCategoryIcon(nextCard.category)}
                            </div>
                            <div className="mt-2 text-left w-full">
                                <h4 className="text-[13px] font-bold text-stone-400 leading-snug line-clamp-2">
                                    {nextCard.title}
                                </h4>
                            </div>
                            <div className="w-full flex justify-between items-end">
                                <span className="text-[9px] font-bold text-stone-355 border-b border-stone-200">Read prompts</span>
                                <div className="w-6 h-6 rounded-full bg-stone-50 border border-stone-150 flex items-center justify-center text-stone-300">
                                    <ArrowUpRight size={12} />
                                </div>
                            </div>
                        </div>

                        {/* Active Card (Front, Center) */}
                        <div
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchEnd}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onDragStart={(e) => e.preventDefault()}
                            className="absolute w-[260px] h-[170px] bg-white border border-stone-200/80 rounded-[24px] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.06)] flex flex-col justify-between items-start cursor-pointer select-none"
                            style={swipingToBack ? {
                                // Sink-to-back: shrink, fade, drop behind other cards
                                transform: 'scale(0.82) translateY(18px) rotate(4deg)',
                                transition: 'transform 0.32s ease-out, opacity 0.32s ease-out',
                                opacity: 0,
                                zIndex: 2,
                                pointerEvents: 'none'
                            } : {
                                transform: `translateX(${inspirationDragOffset}px) rotate(${inspirationDragOffset * 0.04}deg) scale(1.02)`,
                                transition: isDragging ? 'none' : 'transform 0.18s ease-out, opacity 0.18s ease-out',
                                opacity: activeDragOpacity,
                                zIndex: 10
                            }}
                        >
                            {/* Top Badge Icon */}
                            <div className="w-8 h-8 rounded-full bg-stone-50 border border-stone-150 flex items-center justify-center shadow-3xs">
                                {getCategoryIcon(activeCard.category)}
                            </div>
                            
                            {/* Card Content Title */}
                            <div className="mt-2 text-left w-full">
                                <h4 className="text-[14px] font-extrabold tracking-tight text-stone-850 leading-snug line-clamp-2 font-sans">
                                    {activeCard.title}
                                </h4>
                                <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-stone-450 block mt-0.5">
                                    {activeCard.category}
                                </span>
                            </div>

                            {/* Bottom CTA & Icon button */}
                            <div className="w-full flex justify-between items-end">
                                <span className="text-[9.5px] font-extrabold text-stone-600 hover:text-[#FF4060] transition-colors border-b border-stone-300 pb-0.5">
                                    Read prompts
                                </span>
                                <div className="w-8 h-8 rounded-full bg-stone-950 text-white flex items-center justify-center shadow-sm hover:bg-[#FF4060] transition-colors">
                                    <ArrowUpRight size={14} className="stroke-[2.5]" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Sub Card Navigation Controls */}
                <div className="flex items-center justify-center gap-3 mt-1">
                    <button
                        onClick={handlePrevCard}
                        className="w-8 h-8 rounded-full border border-stone-200 bg-white text-stone-500 hover:text-stone-855 flex items-center justify-center shadow-3xs cursor-pointer hover:bg-stone-50 transition-colors active:scale-95"
                        type="button"
                        title="Previous card"
                    >
                        <ChevronLeft size={16} className="stroke-[2.5]" />
                    </button>
                    <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-widest min-w-[32px] text-center select-none">
                        {currentCardIndex + 1} / {cards.length}
                    </span>
                    <button
                        onClick={handleNextCard}
                        className="w-8 h-8 rounded-full border border-stone-200 bg-white text-stone-500 hover:text-stone-855 flex items-center justify-center shadow-3xs cursor-pointer hover:bg-stone-50 transition-colors active:scale-95"
                        type="button"
                        title="Next card"
                    >
                        <ChevronRight size={16} className="stroke-[2.5]" />
                    </button>
                </div>

            </div>
        );
    };

    const renderToolsPanel = () => {
        if (!showToolsPanel) return null;

        if (activeToolTab === 'inspiration') {
            return (
                <div className="w-full max-w-[680px] bg-white border border-stone-200/80 rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] p-5 mb-4 flex flex-col gap-4 animate-in slide-in-from-bottom-3 fade-in duration-300 pointer-events-auto">
                    {/* Content area for inspiration only */}
                    <div className="w-full">
                        {renderInspirationTools()}
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full max-w-[680px] bg-white border border-stone-200/80 rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] p-5 mb-4 flex flex-col gap-4 animate-in slide-in-from-bottom-3 fade-in duration-300 pointer-events-auto">
                {/* Content area based on active tab */}
                <div className="w-full">
                    {activeToolTab === 'tuner' && renderGuitarTuner()}
                    {activeToolTab === 'tempo' && renderTapTempo()}
                    {activeToolTab === 'lexicon' && renderRhymeLexicon()}
                </div>

                {/* Horizontal separator */}
                <div className="border-t border-stone-100 w-full" />

                {/* Tab row navigation */}
                <div className="flex items-center justify-around px-2 select-none">
                    <button
                        onClick={() => setActiveToolTab('tuner')}
                        className={`transition-all duration-200 cursor-pointer ${
                            activeToolTab === 'tuner'
                                ? 'text-xs md:text-[13px] font-bold px-4 py-1.5 bg-[#EAEAEA] text-stone-850 rounded-full'
                                : 'text-[11px] md:text-xs font-medium px-3 py-1.5 text-stone-400 hover:text-stone-600 rounded-full bg-transparent'
                        }`}
                        type="button"
                    >
                        Guitar tuner
                    </button>
                    <button
                        onClick={() => setActiveToolTab('tempo')}
                        className={`transition-all duration-200 cursor-pointer ${
                            activeToolTab === 'tempo'
                                ? 'text-xs md:text-[13px] font-bold px-4 py-1.5 bg-[#EAEAEA] text-stone-850 rounded-full'
                                : 'text-[11px] md:text-xs font-medium px-3 py-1.5 text-stone-400 hover:text-stone-600 rounded-full bg-transparent'
                        }`}
                        type="button"
                    >
                        Tap tempo
                    </button>
                    <button
                        onClick={() => setActiveToolTab('lexicon')}
                        className={`transition-all duration-200 cursor-pointer ${
                            activeToolTab === 'lexicon'
                                ? 'text-xs md:text-[13px] font-bold px-4 py-1.5 bg-[#EAEAEA] text-stone-850 rounded-full'
                                : 'text-[11px] md:text-xs font-medium px-3 py-1.5 text-stone-400 hover:text-stone-600 rounded-full bg-transparent'
                        }`}
                        type="button"
                    >
                        Rhyme lexicon
                    </button>
                </div>
            </div>
        );
    };

    const handleToolsToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showToolsPanel) {
            if (activeToolTab !== 'inspiration') {
                setShowToolsPanel(false);
            } else {
                setActiveToolTab('tuner');
            }
        } else {
            setShowToolsPanel(true);
            setActiveToolTab('tuner');
        }
    };

    const handleInspirationToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showToolsPanel) {
            if (activeToolTab === 'inspiration') {
                setShowToolsPanel(false);
            } else {
                setActiveToolTab('inspiration');
            }
        } else {
            setShowToolsPanel(true);
            setActiveToolTab('inspiration');
        }
    };

    const myProjects = displayNotes.filter(n => !n.ownerId || n.ownerId === user?.uid);
    const collabProjects = displayNotes.filter(n => n.ownerId && n.ownerId !== user?.uid);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchQuery.trim() !== '') {
                const hasMyMatches = myProjects.length > 0;
                const hasCollabMatches = collabProjects.length > 0;
                setIsMyProjectsOpen(hasMyMatches);
                setIsCollabProjectsOpen(hasCollabMatches);
            }
        }
    };

    const renderProjectCard = (note: SongNote) => {
        const isSelected = selectedNoteId === note.id;
        return (
            <div 
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                className={`
                    group cursor-pointer flex flex-col gap-4 relative transition-all duration-300 rounded-[24px] md:rounded-[32px] p-4 md:p-6 border border-transparent select-none min-h-[170px] justify-between
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
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-50 hover:text-red-655 transition-all text-stone-405 z-10 cursor-pointer"
                    title="Delete Note"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        );
    };

    const renderProjectListCard = (note: SongNote) => {
        const isSelected = selectedNoteId === note.id;
        return (
            <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                className={`
                    group cursor-pointer flex items-center justify-between px-6 py-4 rounded-[16px] border border-stone-200/10 transition-all duration-200 active:scale-[0.99] select-none
                    ${isSelected ? 'bg-white shadow-[0_4px_15px_rgba(0,0,0,0.015)] border-stone-200/30' : 'bg-white/40 hover:bg-white/70 hover:border-stone-200/25'}
                `}
            >
                <span className={`font-sans text-[14px] transition-colors truncate ${isSelected ? 'font-semibold text-stone-900' : 'text-stone-600 group-hover:text-stone-850'}`}>
                    {note.title || 'Untitled Note'}
                </span>
                
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-50 hover:text-red-655 transition-all text-stone-405 cursor-pointer"
                        title="Delete Note"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        );
    };

    if (!isMounted) return null;

    return (
        <div className="w-full flex flex-col gap-0 md:gap-10 text-stone-900 font-sans min-h-[calc(100dvh-12rem)] pt-0 pb-10 md:py-2">
            
            
            {/* Touch drag ghost overlay for mobile drag-and-drop */}
            {(() => {
                const ghostLabel = draggedPhraseId
                    ? (activeNote?.phrases?.find(p => p.id === draggedPhraseId)?.text?.slice(0, 30) || 'Line')
                    : draggedAudioId
                    ? (activeAudioNotes?.find(an => an.id === draggedAudioId)?.title || 'Audio')
                    : draggedGroupId
                    ? (activeNote?.verses?.find(v => v.id === draggedGroupId)?.name || 'Section')
                    : '';
                return <TouchDragGhost label={ghostLabel} pos={touchGhostPos} />;
            })()}
            
            {/* 1. TYPING / WRITING CANVAS AREA (Top Panel) */}
            <div 
                ref={writingCanvasRef}
                id="writing-canvas"
                onDoubleClick={(e) => {
                    if (!selectedNoteId) {
                        handleCreateNote(activeFolderIdFilter);
                    } else {
                        handleAddNewPhrase(null);
                    }
                }}
                onTouchStart={(e) => {
                    // Track touch start for double-tap detection
                    const touch = e.touches[0];
                    canvasTouchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
                }}
                onTouchEnd={(e) => {
                    // Double-tap to create new phrase (mobile equivalent of double-click)
                    const now = Date.now();
                    const touch = e.changedTouches[0];
                    const start = canvasTouchStartRef.current;
                    const isDragging = draggedPhraseId !== null || draggedAudioId !== null || draggedGroupId !== null;
                    if (!isDragging && start) {
                        const tapDuration = now - start.time;
                        const dx = Math.abs(touch.clientX - start.x);
                        const dy = Math.abs(touch.clientY - start.y);
                        const isTap = tapDuration < 300 && dx < 10 && dy < 10;
                        if (isTap) {
                            const timeSinceLastTap = now - lastTapTimeRef.current;
                            if (timeSinceLastTap < 350) {
                                // Double-tap detected
                                e.preventDefault();
                                if (!selectedNoteId) {
                                    handleCreateNote(activeFolderIdFilter);
                                } else {
                                    handleAddNewPhrase(null);
                                }
                                lastTapTimeRef.current = 0;
                            } else {
                                lastTapTimeRef.current = now;
                            }
                        }
                    }
                    canvasTouchStartRef.current = null;
                }}
                onDragOver={(e) => e.preventDefault()}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onDrop={(e) => {
                    e.preventDefault();
                    
                    const dragInfoStr = e.dataTransfer.getData('text/word-drag-info');
                    if (dragInfoStr && handleWordDropOnEmptyCanvas) {
                        e.stopPropagation();
                        const dragInfo = JSON.parse(dragInfoStr);
                        handleWordDropOnEmptyCanvas(dragInfo);
                        return;
                    }

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
                className="bg-white border border-stone-200/60 shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-none md:rounded-[32px] p-4 md:p-8 flex flex-col min-h-[80dvh] md:min-h-[560px] xl:min-h-[700px] 2xl:min-h-[820px] transition-all relative cursor-text justify-between w-full"
            >
                {/* 1a. Canvas Header (Title and Ellipsis Menu) */}
                <div 
                    id="canvas-header"
                    className="w-full flex items-center justify-between gap-4 pb-4 border-b border-stone-200/40 select-none z-20 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <div className="flex-1 min-w-0 flex items-center justify-start gap-3 md:gap-4 group relative">
                        <input
                            key="project-title-input"
                            id="project-title-input"
                            type="text"
                            value={isRecording ? recordingTitle : (isEditingTitle ? localTitleText : (activeNote ? activeNote.title : ''))}
                            placeholder="Project name"
                            readOnly={isCanvasPreview}
                            onFocus={() => {
                                setIsEditingTitle(true);
                                setLocalTitleText(activeNote ? activeNote.title : '');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveTitle();
                                    e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                    setLocalTitleText(activeNote ? activeNote.title : '');
                                    setIsEditingTitle(false);
                                    e.currentTarget.blur();
                                }
                            }}
                            onChange={(e) => {
                                if (isRecording) {
                                    setRecordingTitle(e.target.value);
                                } else {
                                    setLocalTitleText(e.target.value);
                                }
                            }}
                            className="bg-transparent border-none outline-none font-medium text-xl md:text-[22px] text-stone-500 placeholder:text-stone-300 focus:text-stone-855 transition-colors cursor-text select-text w-full min-w-0"
                            style={{
                                maxWidth: isEditingTitle ? 'calc(100% - 150px)' : 'calc(100% - 80px)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        {isEditingTitle && !isRecording && (
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    // Prevent input blur before click event fires
                                    e.preventDefault();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveTitle();
                                }}
                                className="w-8 h-8 bg-white border border-stone-200 shadow-[0_3px_12px_rgba(0,0,0,0.08)] rounded-full text-emerald-600 hover:text-emerald-700 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                title="Save project name"
                            >
                                <Check size={16} className="stroke-[3px]" />
                            </button>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 bg-stone-100 text-stone-600 border border-stone-200 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide flex items-center gap-1.5 pointer-events-none shadow-3xs select-none shrink-0 ml-[1%]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>
                                {metronomeBpm} BPM
                                {savedTuning ? ` • Tuner: ${savedTuning.note} (${savedTuning.freq}Hz, ${savedTuning.cents === 0 ? '0' : savedTuning.cents > 0 ? `+${savedTuning.cents}` : savedTuning.cents}¢)` : ''}
                            </span>
                        </div>
                    </div>
                    
                    {/* Collaborative Users Share Button */}
                    <div className="flex items-center gap-3 mr-1 shrink-0">
                        {/* Unified Collab Button (Pending Invitation / Active / Passive States) */}
                        {!isCanvasPreview && (
                            pendingInvites.length > 0 ? (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowShareModal(true);
                                    }}
                                    className="relative flex items-center gap-2 pl-3.5 pr-2.5 py-1.5 bg-yellow-400 border border-yellow-500 text-stone-900 hover:bg-yellow-500 rounded-full text-[18px] font-sans font-medium tracking-wide transition-all cursor-pointer active:scale-95 shadow-3xs shrink-0 select-none animate-pulse"
                                    title="View incoming invitation"
                                >
                                    <span className="relative flex h-1.5 w-1.5 shrink-0 mr-0.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-900 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-stone-900" />
                                    </span>
                                    <span>{pendingInvites[0].senderName || "Someone"} invited you</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmCloseCollab({
                                                isOpen: true,
                                                type: 'decline_invite',
                                                invite: pendingInvites[0]
                                            });
                                        }}
                                        className="text-stone-900/60 hover:text-stone-950 p-0.5 rounded-full hover:bg-stone-900/10 transition-colors ml-1 cursor-pointer outline-none flex items-center justify-center shrink-0"
                                        title="Decline invitation"
                                    >
                                        <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </button>
                            ) : isActiveCollab ? (
                                <button 
                                    onClick={() => setShowShareModal(true)}
                                    className="relative flex items-center gap-2 pl-3.5 pr-2.5 py-1.5 bg-emerald-50 border border-emerald-200/65 text-emerald-800 hover:bg-emerald-100/80 rounded-full text-[18px] font-sans font-medium tracking-wide transition-all cursor-pointer active:scale-95 shadow-3xs select-none shrink-0 animate-fade-in"
                                    title="View collaboration details"
                                >
                                    <span className="relative flex h-1.5 w-1.5 shrink-0 mr-0.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                    </span>
                                    <span>
                                        {activeNote && activeNote.ownerId && activeNote.ownerId !== user?.uid
                                            ? `Co-writing with ${collaboratorProfiles[activeNote.ownerId]?.name || 'Owner'}`
                                            : (collaborators.length > 0
                                                ? `Co-writing with ${collaboratorProfiles[collaborators[0]]?.name || 'Collaborator'}${collaborators.length > 1 ? ` & ${collaborators.length - 1} others` : ''}`
                                                : 'Co-writing'
                                            )
                                        }
                                    </span>
                                    
                                    {/* Collaborator Avatars inline inside button */}
                                    {collaborators.length > 0 && (
                                        <div className="flex items-center -space-x-1.5 ml-1 mr-0.5">
                                            {collaborators.slice(0, 3).map((collabUid) => {
                                                const profile = collaboratorProfiles[collabUid] || { name: 'Collaborator', email: '' };
                                                const hash = collabUid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                                const isUserActive = activeRemoteUsers[collabUid] !== undefined;
                                                const color = isUserActive 
                                                    ? activeRemoteUsers[collabUid].color 
                                                    : COLLABORATOR_COLORS[hash % COLLABORATOR_COLORS.length];

                                                return (
                                                    <div 
                                                        key={collabUid} 
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border border-emerald-50 capitalize select-none relative shrink-0 ${
                                                            isUserActive ? 'ring-[1px] ring-emerald-500/50' : ''
                                                        }`}
                                                        style={{ 
                                                            backgroundColor: color,
                                                            color: (() => {
                                                                const cleanColor = color.toUpperCase().replace('#', '');
                                                                if (cleanColor.length === 6) {
                                                                    const r = parseInt(cleanColor.substring(0, 2), 16);
                                                                    const g = parseInt(cleanColor.substring(2, 4), 16);
                                                                    const b = parseInt(cleanColor.substring(4, 6), 16);
                                                                    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                                                                    return luma > 0.65 ? '#1C1917' : '#FFFFFF';
                                                                }
                                                                return '#FFFFFF';
                                                            })()
                                                        }}
                                                        title={`${profile.name} (${isUserActive ? 'Active' : 'Offline'})`}
                                                    >
                                                        {profile.name[0]}
                                                    </div>
                                                );
                                            })}
                                            {collaborators.length > 3 && (
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-50 flex items-center justify-center text-[8px] font-bold text-emerald-800 select-none shrink-0">
                                                    +{collaborators.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmCloseCollab({
                                                isOpen: true,
                                                type: 'close_collab',
                                                projectId: selectedNoteId
                                            });
                                        }}
                                        className="text-emerald-500/65 hover:text-emerald-850 p-0.5 rounded-full hover:bg-emerald-100 transition-colors ml-1 cursor-pointer outline-none flex items-center justify-center shrink-0"
                                        title="End collaboration"
                                    >
                                        <svg className="w-3 h-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </button>
                            ) : (
                                <button 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!selectedNoteId) {
                                            const newNoteId = `n-${Date.now()}`;
                                            const newPhraseId = `p-${Math.random().toString(36).substring(2, 9)}`;
                                            const timestamp = new Date().toLocaleString();
                                            
                                            const newNote: SongNote = {
                                                id: newNoteId,
                                                title: '',
                                                content: '',
                                                folderId: null,
                                                updatedAt: timestamp,
                                                ownerId: user ? user.uid : undefined,
                                                phrases: [{
                                                    id: newPhraseId,
                                                    text: '',
                                                    groupId: null
                                                }],
                                                verses: []
                                            };
                                            setNotes(prev => [newNote, ...prev]);
                                            setSelectedNoteId(newNoteId);
                                            
                                            if (user) {
                                                const docRef = doc(db, "projects", newNoteId);
                                                setDoc(docRef, {
                                                    ...newNote,
                                                    ownerId: user.uid,
                                                    collaborators: []
                                                }).catch(err => console.error("Error creating project in Firestore:", err));
                                            }
                                        }
                                        setShowShareModal(true);
                                    }}
                                    className="relative flex items-center gap-2 px-5 py-1.5 bg-stone-100/65 hover:bg-stone-200/50 text-stone-700 hover:text-stone-900 border border-stone-200/40 rounded-full text-[18px] font-sans font-medium tracking-wide transition-all cursor-pointer active:scale-95 shadow-3xs shrink-0 select-none animate-fade-in"
                                    title="Collaborate on this project"
                                >
                                    <Users size={18} className="stroke-[1.6]" />
                                    <span>Collab</span>
                                </button>
                            )
                        )}

                        {/* Inline "joined" pill — appears next to Collaborate button, auto-dismisses */}
                        {acceptedNotifications.map((notif) => (
                            <JoinedPill
                                key={notif.id}
                                name={notif.inviteeName || notif.inviteeEmail?.split('@')[0] || 'Someone'}
                                onDismiss={() => handleDismissAcceptedNotification(notif.id)}
                            />
                        ))}
                        {/* Ellipsis Dropdown Menu Options */}
                        {!isCanvasPreview && (
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
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200/60 rounded-[20px] shadow-[0_6px_28px_rgba(0,0,0,0.08)] p-3 z-40 flex flex-col gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNewNoteClick();
                                                    setShowCanvasMenu(false);
                                                }}
                                                className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
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
                                                    className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-650 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                                >
                                                    Delete Note
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                    <div className={`w-full flex-grow flex-1 flex flex-col z-10 py-6 relative ${
                        (isMobile && (editingPhraseId !== null || isFocused)) ? 'pb-16' : ''
                    }`}>
                        {!isNoteBlank ? (
                            <div className="w-full flex flex-col gap-3 max-w-4xl mx-auto py-4">

                                {/* Read-only lock in preview mode — no blur, no tint, just blocks all interaction */}
                                <div className={`relative ${isCanvasPreview ? 'select-none' : ''}`}>
                                    {isCanvasPreview && (
                                        <div
                                            className="absolute inset-0 z-20"
                                            style={{ pointerEvents: 'all', cursor: 'default' }}
                                        />
                                    )}
                                    <div className={isCanvasPreview ? 'pointer-events-none' : ''}>
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
                                                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500/80 rounded-full transform -translate-y-1/2 pointer-events-none z-30 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                    </div>
                                                )}
                                                
                                                {block.type === 'group' ? (
                                                    (() => {
                                                        const isDragOverThisGroup = dragOverGroupId === block.groupId;
                                                        const isGroupTranscribing = activeAudioNotes.some(an => an.groupId === block.groupId && transcribingAudioNoteId === an.id);
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
                                                                    
                                                                    const targetBlockWrapper = getElementUnderTouch(touch.clientX, touch.clientY, '.block-wrapper');
                                                                    
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
                                                                        
                                                                        const targetBlockWrapper = getElementUnderTouch(touch.clientX, touch.clientY, '.block-wrapper');
                                                                        
                                                                        let finalBlockId: string | null = null;
                                                                        if (targetBlockWrapper) {
                                                                            finalBlockId = targetBlockWrapper.getAttribute('data-block-id');
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
                                                                    const dragInfoStr = e.dataTransfer.getData('text/word-drag-info');
                                                                    if (dragInfoStr && handleWordDropOnPhrase) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        const dragInfo = JSON.parse(dragInfoStr);
                                                                        handleWordDropOnPhrase(dragInfo, `placeholder-${block.groupId}`);
                                                                        setDragOverGroupId(null);
                                                                        return;
                                                                    }

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

                                                                    {sortAudioNotesChronologically(activeAudioNotes.filter(an => an.groupId === block.groupId)).map(audioNote => (
                                                                        <AudioCapsulePlayer 
                                                                            key={audioNote.id}
                                                                            audioNote={audioNote}
                                                                            onRename={(newTitle) => activeNote && handleRenameAudioNote(activeNote.id, audioNote.id, newTitle)}
                                                                            onDelete={() => activeNote && handleDeleteAudioNote(activeNote.id, audioNote.id)}
                                                                            onTranscribe={() => activeNote && handleTranscribeAudioNote(activeNote.id, audioNote.id, audioNote.url)}
                                                                            isTranscribing={transcribingAudioNoteId === audioNote.id}
                                                                            isDocked={true}
                                                                            onDragStart={(e) => handleAudioDragStart(e, audioNote.id)}
                                                                            onDragEnd={handleAudioDragEnd}
                                                                            activeNoteId={activeNote?.id}
                                                                            handleUpdateAudioNoteGroup={handleUpdateAudioNoteGroup}
                                                                            handleAttachAudioToPhrase={handleAttachAudioToPhrase}
                                                                            draggedAudioId={draggedAudioId}
                                                                            setDraggedAudioId={setDraggedAudioId}
                                                                            draggedAudioIdRef={draggedAudioIdRef}
                                                                            setDragOverGroupId={setDragOverGroupId}
                                                                            setDragOverPhraseId={setDragOverPhraseId}
                                                                            dragOverGroupIdRef={dragOverGroupIdRef}
                                                                            dragOverPhraseIdRef={dragOverPhraseIdRef}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                
                                                                {block.phrases.filter(p => !p.id.startsWith('placeholder-')).length === 0 ? (
                                                                    isGroupTranscribing ? (
                                                                        <LyricLinesSkeleton />
                                                                    ) : (
                                                                        <div className="text-center text-xs text-stone-400 py-4 italic select-none pointer-events-none">
                                                                            Drag lines here to add to {block.groupName}
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <>
                                                                        {isGroupTranscribing && (
                                                                            <LyricLinesSkeleton />
                                                                        )}
                                                                        {block.phrases.filter(p => !p.id.startsWith('placeholder-')).map((phrase) => {
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
                                                                                        onBackspaceAtStart={handleBackspaceAtStart}
                                                                                        selectionOffset={cursorSelectionOffset?.phraseId === phrase.id ? cursorSelectionOffset.offset : undefined}
                                                                                        draggedWord={draggedWord}
                                                                                        setDraggedWord={setDraggedWord}
                                                                                        dragOverWordIndex={dragOverWordIndex}
                                                                                        setDragOverWordIndex={setDragOverWordIndex}
                                                                                        handleWordDrop={handleWordDrop}
                                                                                        handleWordDropOnPhrase={handleWordDropOnPhrase}
                                                                                        hasAudioNote={activeAudioNotes.some(an => an.phraseId === phrase.id)}
                                                                                        handlePlaceAudioAsLineAt={handlePlaceAudioAsLineAt}
                                                                                        draggedAudioId={draggedAudioId}
                                                                                        draggedAudioIdRef={draggedAudioIdRef}
                                                                                        activeRemoteUsers={activeRemoteUsers}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    (() => {
                                                        const phrase = block.phrases[0];
                                                        const phraseAudios = sortAudioNotesChronologically(activeAudioNotes.filter(an => an.phraseId === phrase.id));
                                                        return (
                                                            <div className="flex flex-col items-center w-full gap-2">
                                                                {phraseAudios.map((audioNote, idx) => (
                                                                    <React.Fragment key={audioNote.id}>
                                                                        <div 
                                                                            onDragOver={(e) => {
                                                                                if (editingPhraseId === phrase.id) return;
                                                                                
                                                                                // If it is a word drag
                                                                                if (e.dataTransfer.types.includes('text/word-drag-info') || draggedWord) {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    
                                                                                    if (setDragOverWordIndex) {
                                                                                        const wordIndices: number[] = [];
                                                                                        const tokens = phrase.text.split(/(\s+)/);
                                                                                        tokens.forEach((token, idx) => {
                                                                                            if (!/^\s+$/.test(token) && token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/)) {
                                                                                                wordIndices.push(idx);
                                                                                            }
                                                                                        });
                                                                                        
                                                                                        if (wordIndices.length === 0) {
                                                                                            setDragOverWordIndex({ phraseId: phrase.id, wordIndex: -1, position: 'left' });
                                                                                        } else {
                                                                                            setDragOverWordIndex({ phraseId: phrase.id, wordIndex: wordIndices[0], position: 'left' });
                                                                                        }
                                                                                    }
                                                                                    return;
                                                                                }

                                                                                // If it is an audio note drag
                                                                                const currentDraggedAudioId = draggedAudioId || (draggedAudioIdRef ? draggedAudioIdRef.current : null);
                                                                                const isAudioDrag = e.dataTransfer.types.includes('text/audio-note-id') || currentDraggedAudioId;
                                                                                if (isAudioDrag) {
                                                                                    if (currentDraggedAudioId === audioNote.id) {
                                                                                        return; // Do not intercept drag over on ourselves!
                                                                                    }
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    
                                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                                    const relativeY = e.clientY - rect.top;
                                                                                    const position = relativeY < rect.height / 2 ? 'top' : 'bottom';
                                                                                    
                                                                                    setDragOverPhraseId(phrase.id);
                                                                                    setDropPosition(position);
                                                                                    return;
                                                                                }

                                                                                const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                                                if (currentDraggedGroupId) {
                                                                                    return; // Let group drag events bubble up
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
                                                                                if (editingPhraseId === phrase.id) return;
                                                                                setDragOverPhraseId(null);
                                                                                setDropPosition(null);
                                                                                if (setDragOverWordIndex) {
                                                                                    setDragOverWordIndex(null);
                                                                                }
                                                                            }}
                                                                            onDrop={(e) => {
                                                                                if (editingPhraseId === phrase.id) return;
                                                                                
                                                                                const dragInfoStr = e.dataTransfer.getData('text/word-drag-info');
                                                                                if (dragInfoStr && handleWordDrop) {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    const dragInfo = JSON.parse(dragInfoStr);
                                                                                    
                                                                                    const tokens = phrase.text.split(/(\s+)/);
                                                                                    const wordIndices: number[] = [];
                                                                                    tokens.forEach((token, idx) => {
                                                                                        if (!/^\s+$/.test(token) && token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/)) {
                                                                                            wordIndices.push(idx);
                                                                                        }
                                                                                    });
                                                                                    
                                                                                    const targetIdx = wordIndices.length > 0 ? wordIndices[0] : -1;
                                                                                handleWordDrop(dragInfo, { phraseId: phrase.id, targetWordIndex: targetIdx, position: 'left' });
                                                                                    
                                                                                    if (setDraggedWord) setDraggedWord(null);
                                                                                    if (setDragOverWordIndex) setDragOverWordIndex(null);
                                                                                    return;
                                                                                }

                                                                                const audioNoteId = e.dataTransfer.getData('text/audio-note-id') || (draggedAudioIdRef ? draggedAudioIdRef.current : null) || draggedAudioId;
                                                                                if (audioNoteId) {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    if (dropPosition === 'top' || dropPosition === 'bottom') {
                                                                                        if (handlePlaceAudioAsLineAt) {
                                                                                            handlePlaceAudioAsLineAt(audioNoteId, phrase.id, dropPosition);
                                                                                        }
                                                                                    } else if (handleAttachAudioToPhrase) {
                                                                                        const isPlaceholder = phrase.id.startsWith('placeholder-');
                                                                                        const targetPhraseId = isPlaceholder ? null : phrase.id;
                                                                                        handleAttachAudioToPhrase(audioNoteId, targetPhraseId, phrase.groupId);
                                                                                    }
                                                                                    setDragOverPhraseId(null);
                                                                                    setDropPosition(null);
                                                                                    return;
                                                                                }

                                                                                const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                                                if (currentDraggedGroupId) return;

                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                
                                                                                const draggedId = e.dataTransfer.getData('text/plain') || (draggedPhraseIdRef ? draggedPhraseIdRef.current : null) || draggedPhraseId;
                                                                                
                                                                                setDraggedPhraseId(null);
                                                                                if (draggedPhraseIdRef) {
                                                                                    draggedPhraseIdRef.current = null;
                                                                                }

                                                                                if (draggedId && draggedId !== phrase.id) {
                                                                                    handleInsertPhraseAt(draggedId, phrase.id, dropPosition);
                                                                                }
                                                                                setDragOverPhraseId(null);
                                                                                setDropPosition(null);
                                                                            }}
                                                                            className="flex justify-center w-full py-1 select-none z-20 relative"
                                                                        >
                                                                            {/* Horizontal line drop indicator line (top) above the first audio card */}
                                                                            {idx === 0 && dragOverPhraseId === phrase.id && dropPosition === 'top' && (
                                                                                <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500/80 rounded-full transform -translate-y-1/2 pointer-events-none z-30 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                                                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                                                </div>
                                                                            )}

                                                                            <AudioCapsulePlayer 
                                                                                audioNote={audioNote}
                                                                                onRename={(newTitle) => activeNote && handleRenameAudioNote(activeNote.id, audioNote.id, newTitle)}
                                                                                onDelete={() => activeNote && handleDeleteAudioNote(activeNote.id, audioNote.id)}
                                                                                onTranscribe={(activeNote && handleTranscribeAudioNote) ? (() => handleTranscribeAudioNote(activeNote.id, audioNote.id, audioNote.url)) : undefined}
                                                                                isTranscribing={transcribingAudioNoteId === audioNote.id}
                                                                                isDocked={false}
                                                                                onDragStart={(e) => handleAudioDragStart(e, audioNote.id)}
                                                                                onDragEnd={handleAudioDragEnd}
                                                                                activeNoteId={activeNote?.id}
                                                                                handleUpdateAudioNoteGroup={handleUpdateAudioNoteGroup}
                                                                                handleAttachAudioToPhrase={handleAttachAudioToPhrase}
                                                                                draggedAudioId={draggedAudioId}
                                                                                setDraggedAudioId={setDraggedAudioId}
                                                                                draggedAudioIdRef={draggedAudioIdRef}
                                                                                setDragOverGroupId={setDragOverGroupId}
                                                                                setDragOverPhraseId={setDragOverPhraseId}
                                                                                dragOverGroupIdRef={dragOverGroupIdRef}
                                                                                dragOverPhraseIdRef={dragOverPhraseIdRef}
                                                                            />
                                                                        </div>
                                                                        {transcribingAudioNoteId === audioNote.id && (
                                                                            <LyricLinesSkeleton />
                                                                        )}
                                                                    </React.Fragment>
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
                                                                    onBackspaceAtStart={handleBackspaceAtStart}
                                                                    selectionOffset={cursorSelectionOffset?.phraseId === phrase.id ? cursorSelectionOffset.offset : undefined}
                                                                    draggedWord={draggedWord}
                                                                    setDraggedWord={setDraggedWord}
                                                                    dragOverWordIndex={dragOverWordIndex}
                                                                    setDragOverWordIndex={setDragOverWordIndex}
                                                                    handleWordDrop={handleWordDrop}
                                                                    handleWordDropOnPhrase={handleWordDropOnPhrase}
                                                                    hasAudioNote={activeAudioNotes.some(an => an.phraseId === phrase.id)}
                                                                    handlePlaceAudioAsLineAt={handlePlaceAudioAsLineAt}
                                                                    draggedAudioId={draggedAudioId}
                                                                    draggedAudioIdRef={draggedAudioIdRef}
                                                                    activeRemoteUsers={activeRemoteUsers}
                                                                />
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                                
                                                {dragOverBlockId === blockId && blockDropPosition === 'bottom' && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500/80 rounded-full transform translate-y-1/2 pointer-events-none z-30 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                    </div>
                                </div>

                                {isRecordingSaving && (
                                    <div className="flex justify-center w-full py-1.5 select-none z-20">
                                        <AudioCapsuleSkeleton />
                                    </div>
                                )}

                                {/* Centered Chorus, Verse, and Bridge Buttons */}
                                <div className="flex items-center justify-center gap-2.5 mt-8 pb-2 w-full select-none z-20">
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
                                ${isMobile ? 'absolute bottom-4 left-4 right-4 shadow-xl mx-auto' : 'absolute'}
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

                {/* Creative Tools Panel */}
                {showToolsPanel && (
                    <div className="absolute bottom-[104px] left-1/2 -translate-x-1/2 w-full max-w-[680px] px-4 z-30">
                        {renderToolsPanel()}
                    </div>
                )}

                {/* 1c. Bottom controls bar */}
                <div 
                    onClick={(e) => e.stopPropagation()}
                    className={`flex select-none z-20 justify-center ${
                        (isMobile && (editingPhraseId !== null || isFocused))
                            ? "fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 p-3 shadow-lg flex-row gap-2 justify-center"
                            : "px-2 md:px-8 mt-8 pb-4"
                    }`}
                    style={(isMobile && (editingPhraseId !== null || isFocused)) ? { bottom: `${visualViewportOffset}px` } : undefined}
                >
                    {/* Right Side: Button Row (✓ SAVE, REC, Tools, Inspiration) */}
                    <div className="flex items-center gap-3">
                        {/* Revert adjustments button (placed outside the capsule for clean alignment) */}
                        {activeNote && activeNote.content !== lastSavedContent && !isActiveCollab && (
                            <button
                                onClick={handleRevertChanges}
                                className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-2 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center"
                                title="Revert to last saved state"
                            >
                                <RotateCcw size={14} className="stroke-[2.5]" />
                            </button>
                        )}

                        {/* Primary actions capsule */}
                        <div className="flex items-center gap-2.5 bg-white border border-stone-200/60 p-2 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.06)] w-fit pointer-events-auto">
                            {/* ✓ SAVE button — always visible during active collab, otherwise only when content differs */}
                            {activeNote && (activeNote.content !== lastSavedContent || isActiveCollab) && (
                                <button
                                    onClick={handleCheckmarkSaveClick}
                                    disabled={savedFlash}
                                    className={`h-10 px-5 flex items-center gap-2 rounded-full border font-sans font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-3xs select-none ${
                                        savedFlash
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-600 scale-95'
                                            : isActiveCollab && activeNote.content === lastSavedContent
                                                ? 'border-stone-200/50 bg-white text-stone-400 hover:text-emerald-600 hover:bg-stone-50'
                                                : 'border-stone-200/50 bg-white text-[#86BE7F] hover:bg-stone-50'
                                    }`}
                                    title={isActiveCollab ? 'Save to Collab Projects' : 'Save'}
                                >
                                    <Check size={14} className="stroke-[3]" />
                                    <span>{savedFlash ? 'Saved ✓' : isActiveCollab ? 'SAVE' : 'SAVE'}</span>
                                </button>
                            )}

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
                                className={`h-10 px-5 flex items-center gap-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer border border-stone-200/50 active:scale-95 shadow-3xs ${
                                    isRecording 
                                        ? 'bg-[#FF4040] text-white animate-pulse' 
                                        : 'bg-white text-[#FF4040] hover:bg-red-50/50'
                                }`}
                            >
                                {isRecording ? (
                                    <>
                                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping absolute" />
                                        <Square size={10} className="fill-white text-white shrink-0 z-10" />
                                        <span className="z-10">Recording {formatTime(recordingTime)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF4040] shrink-0" />
                                        <span>REC</span>
                                    </>
                                )}
                            </button>

                            {/* Tools button */}
                            <button
                                onClick={handleToolsToggle}
                                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-205 active:scale-95 cursor-pointer border border-stone-200/60 shadow-3xs ${
                                    showToolsPanel && activeToolTab !== 'inspiration'
                                        ? 'bg-[#F2F2F2] text-stone-900 font-extrabold'
                                        : 'bg-white text-stone-750 hover:bg-stone-50'
                                }`}
                                title="Creative Tools"
                                type="button"
                            >
                                <div className="relative w-5.5 h-5.5 flex items-center justify-center pointer-events-none gap-0.5">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={showToolsPanel && activeToolTab !== 'inspiration' ? 'text-stone-850' : 'text-stone-600'}>
                                        {/* Vertical Pencil (left) */}
                                        <path d="M6 21V9l2-4 2 4v12H6z" />
                                        <path d="M6 18h4" />
                                        <path d="M6 9h4" />
                                        {/* Vertical Ruler (right) */}
                                        <rect x="14" y="3" width="5" height="18" rx="0.5" />
                                        <line x1="14" y1="7" x2="16.5" y2="7" />
                                        <line x1="14" y1="11" x2="16.5" y2="11" />
                                        <line x1="14" y1="15" x2="16.5" y2="15" />
                                    </svg>
                                </div>
                            </button>

                            {/* Inspiration button */}
                            <button
                                onClick={handleInspirationToggle}
                                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-205 active:scale-95 cursor-pointer border border-stone-200/60 shadow-3xs ${
                                    showToolsPanel && activeToolTab === 'inspiration'
                                        ? 'bg-[#F2F2F2] text-stone-900 font-extrabold'
                                        : 'bg-white text-stone-750 hover:bg-stone-50'
                                }`}
                                title="Inspiration Tools"
                                type="button"
                            >
                                <Lightbulb size={18} className={`stroke-[1.6] ${showToolsPanel && activeToolTab === 'inspiration' ? 'text-stone-850' : 'text-stone-600'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Remote Collaborator Cursors Layer */}
                {Object.keys(activeRemoteUsers).map((uid) => {
                    const rUser = activeRemoteUsers[uid];
                    if (!rUser.cursor) return null;
                    const color = rUser.color;
                    
                    return (
                        <div 
                            key={uid}
                            className="absolute pointer-events-none z-50 select-none transition-all duration-100 ease-out flex flex-col items-start"
                            style={{ 
                                left: `${rUser.cursor.x}%`, 
                                top: `${rUser.cursor.y}%`,
                                transform: 'translate(-5px, -6px)'
                            }}
                        >
                            <svg 
                                className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
                                viewBox="0 0 134 134"
                                fill="none"
                            >
                                <path 
                                    d="M21.2375 23.4624C21.2375 12.8168 32.7622 6.16301 41.9815 11.4858L119.002 55.9536C129.653 62.103 127.579 78.0549 115.71 81.2766L75.1725 92.279C74.4705 92.4696 73.8309 92.8418 73.3179 93.3577L44.8724 121.964C36.1719 130.713 21.2373 124.551 21.2373 112.212L21.2375 23.4624Z" 
                                    stroke="white" 
                                    strokeWidth="9.6803"
                                />
                                <path 
                                    d="M26.0776 24.6597C26.0776 17.2078 34.1446 12.5503 40.5981 16.2763L115.143 59.3147C122.598 63.6193 121.147 74.7852 112.838 77.0404L74.0838 87.5595C72.4453 88.0043 70.9525 88.8721 69.7553 90.0761L42.6222 117.362C36.5318 123.487 26.0776 119.174 26.0776 110.536L26.0776 24.6597Z" 
                                    fill={color} 
                                    stroke="black" 
                                    strokeWidth="7.60595"
                                />
                            </svg>
                            
                            <div 
                                className="mt-1.5 text-[13px] font-sans font-bold px-3.5 py-1 rounded-full shadow-2xs whitespace-nowrap select-none capitalize"
                                style={{ 
                                    backgroundColor: color,
                                    color: (() => {
                                        const cleanColor = color.toUpperCase().replace('#', '');
                                        if (cleanColor.length === 6) {
                                            const r = parseInt(cleanColor.substring(0, 2), 16);
                                            const g = parseInt(cleanColor.substring(2, 4), 16);
                                            const b = parseInt(cleanColor.substring(4, 6), 16);
                                            const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                                            return luma > 0.65 ? '#1C1917' : '#FFFFFF';
                                        }
                                        return '#FFFFFF';
                                    })()
                                }}
                            >
                                {rUser.name.split(' ')[0]}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 2. DIRECTORY GRID AREA (Bottom Section) */}
            <div className="space-y-8 mt-6 px-4 md:px-0">
                
                {/* Header Controls & Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 relative">
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-[15px] font-bold text-stone-550 uppercase tracking-wider">Workspace</h2>
                            <button 
                                onClick={() => handleCreateNote()}
                                className="w-6 h-6 rounded-full bg-stone-300/40 hover:bg-stone-300/60 text-stone-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                                title="Create new project"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                    </div>
                    
                    {/* View Style & Search Capsule */}
                    <div className="flex items-center gap-4">
                        {/* Grid / List Style Toggle */}
                        <div className="flex items-center bg-stone-100 p-0.5 rounded-full border border-stone-200/40 select-none">
                            <button
                                type="button"
                                onClick={() => setProjectViewStyle('grid')}
                                className={`px-2.5 py-1 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    projectViewStyle === 'grid'
                                        ? 'bg-white shadow-3xs text-stone-800'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                                title="Grid View"
                            >
                                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setProjectViewStyle('list')}
                                className={`px-2.5 py-1 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    projectViewStyle === 'list'
                                        ? 'bg-white shadow-3xs text-stone-800'
                                        : 'text-stone-400 hover:text-stone-600'
                                }`}
                                title="List View"
                            >
                                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="8" y1="6" x2="21" y2="6"></line>
                                    <line x1="8" y1="12" x2="21" y2="12"></line>
                                    <line x1="8" y1="18" x2="21" y2="18"></line>
                                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Search Field */}
                        <div className="flex items-center gap-2 bg-white/40 border border-stone-250/25 px-3.5 py-1.5 rounded-[12px] text-stone-750 w-44 focus-within:w-56 focus-within:bg-white focus-within:border-stone-355 transition-all duration-300">
                            <Search size={12} className="text-stone-400" />
                            <input 
                                type="text" 
                                placeholder="Search workspace..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="bg-transparent border-none outline-none w-full text-xs font-sans placeholder:text-stone-400 font-medium"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-6">
                    {/* Category 1: Collaboration Projects */}
                    <div className={`transition-all duration-300 rounded-[24px] ${
                        isCollabProjectsOpen 
                            ? 'bg-stone-200/20 border border-stone-250/20 py-3 px-5 md:py-4 md:px-6 min-h-[300px] flex flex-col' 
                            : 'bg-transparent'
                    }`}>
                        <button 
                            type="button"
                            onClick={() => setIsCollabProjectsOpen(!isCollabProjectsOpen)}
                            className={`w-full flex items-center justify-between px-6 py-6 md:py-8 rounded-[24px] transition-all duration-300 group cursor-pointer outline-none select-none text-stone-855 ${
                                isCollabProjectsOpen 
                                    ? 'bg-transparent border border-transparent' 
                                    : 'bg-transparent border border-stone-250/20 hover:bg-stone-200/30'
                            }`}
                        >
                            <span className="font-sans font-light text-xl md:text-[22px] tracking-tight">Collab Projects</span>
                            <span className={`transform transition-transform duration-300 ease-in-out ${isCollabProjectsOpen ? 'rotate-180' : 'rotate-0'} flex items-center justify-center text-stone-400 group-hover:text-stone-600`}>
                                <ChevronDown size={20} />
                            </span>
                        </button>
                        
                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                            isCollabProjectsOpen 
                                ? 'max-h-[1000px] opacity-100 mt-4 px-4 pb-4 md:pb-6 flex-1 flex flex-col' 
                                : 'max-h-0 opacity-0 pointer-events-none'
                        }`}>
                            {collabProjects.length === 0 ? (
                                <div className="text-center py-16 border border-stone-200/50 border-dashed rounded-[24px] bg-white/10 select-none flex-1 flex flex-col items-center justify-center min-h-[180px]">
                                    <p className="text-xs text-stone-400 italic">No collab projects found.</p>
                                </div>
                            ) : (
                                projectViewStyle === 'grid' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 p-1">
                                        {collabProjects.map(renderProjectCard)}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2.5 w-full">
                                        {collabProjects.map(renderProjectListCard)}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Category 2: My Projects */}
                    <div className={`transition-all duration-300 rounded-[24px] ${
                        isMyProjectsOpen 
                            ? 'bg-stone-200/20 border border-stone-250/20 py-3 px-5 md:py-4 md:px-6 min-h-[300px] flex flex-col' 
                            : 'bg-transparent'
                    }`}>
                        <button 
                            type="button"
                            onClick={() => setIsMyProjectsOpen(!isMyProjectsOpen)}
                            className={`w-full flex items-center justify-between px-6 py-6 md:py-8 rounded-[24px] transition-all duration-300 group cursor-pointer outline-none select-none text-stone-855 ${
                                isMyProjectsOpen 
                                    ? 'bg-transparent border border-transparent' 
                                    : 'bg-transparent border border-stone-250/20 hover:bg-stone-200/30'
                            }`}
                        >
                            <span className="font-sans font-light text-xl md:text-[22px] tracking-tight">My Projects</span>
                            <span className={`transform transition-transform duration-300 ease-in-out ${isMyProjectsOpen ? 'rotate-180' : 'rotate-0'} flex items-center justify-center text-stone-400 group-hover:text-stone-600`}>
                                <ChevronDown size={20} />
                            </span>
                        </button>
                        
                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                            isMyProjectsOpen 
                                ? 'max-h-[2000px] opacity-100 mt-4 px-4 pb-4 md:pb-6 flex-1 flex flex-col' 
                                : 'max-h-0 opacity-0 pointer-events-none'
                        }`}>
                            {myProjects.length === 0 ? (
                                <div className="text-center py-16 border border-stone-200/50 border-dashed rounded-[24px] bg-white/10 select-none flex-1 flex flex-col items-center justify-center min-h-[180px]">
                                    <p className="text-xs text-stone-400 italic">No personal projects found.</p>
                                </div>
                            ) : (
                                projectViewStyle === 'grid' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 p-1">
                                        {myProjects.map(renderProjectCard)}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2.5 w-full">
                                        {myProjects.map(renderProjectListCard)}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Combined Empty State when both lists are empty */}
                {myProjects.length === 0 && collabProjects.length === 0 && (
                    <div className="text-center py-16 border border-stone-200 border-dashed rounded-[28px] bg-white/20 select-none">
                        <p className="text-sm text-stone-400 italic">No projects found. Click the + button to create a new project!</p>
                    </div>
                )}
            {/* Real-Time Collaboration Share Modal Overlay */}
            {showShareModal && (
                <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <form 
                        onSubmit={handleInviteCollaborator}
                        className="bg-white rounded-[16px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-lg w-full p-8 sm:p-10 flex flex-col gap-8 animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto no-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-3xl md:text-[38px] leading-[1.25] font-sans font-light text-stone-600 tracking-[-0.035em]">
                            Invite someone to collaborate with you in this project
                        </h3>

                        {/* Pending Invites List */}
                        {pendingInvites.length > 0 && (
                            <div className="flex flex-col gap-3 pb-6 border-b border-stone-100">
                                <h4 className="text-[14px] font-sans font-medium text-stone-400">Pending invites</h4>
                                <div className="flex flex-col gap-2.5">
                                    {pendingInvites.map(invite => (
                                        <div key={invite.id} className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-150/40">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-stone-700 font-medium">{invite.senderName} invited you</span>
                                                <span className="text-[10px] text-stone-400">to collaborate on {invite.projectTitle || "Project"}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAcceptInvite(invite)}
                                                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-full transition-colors cursor-pointer"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeclineInvite(invite)}
                                                    className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-6">
                            <input 
                                type="email" 
                                required
                                placeholder="Enter collaborator email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-full px-6 py-4 text-[17px] font-sans font-medium outline-none focus:bg-white focus:border-stone-400 transition-all placeholder:text-stone-300"
                            />

                            <div className="flex items-center justify-end gap-3.5 mt-2">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setShowShareModal(false);
                                        setInviteStatus({ type: '', message: '' });
                                    }}
                                    className="px-8 py-3 bg-stone-100/75 hover:bg-stone-200/50 text-stone-600 rounded-full text-[15px] font-sans font-medium transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isInviting}
                                    className="px-8 py-3 bg-stone-900 hover:bg-stone-850 text-white rounded-full text-[15px] font-sans font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {isInviting ? "Inviting..." : "Invite"}
                                </button>
                            </div>
                        </div>

                        {/* Status Message */}
                        {inviteStatus.message && (
                            <p className={`text-xs font-semibold text-center -mt-2 px-1 ${
                                inviteStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                                {inviteStatus.message}
                            </p>
                        )}

                        {/* Access/Collaborators List */}
                        {selectedNoteId && (
                            <div className="flex flex-col gap-3 pt-6 border-t border-stone-100">
                                <h4 className="text-[14px] font-sans font-medium text-stone-400">Who's in?</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1 max-h-36 overflow-y-auto no-scrollbar">
                                    {/* Owner Tag */}
                                    <div className="flex items-center gap-1.5 py-1.5 pr-3">
                                        <span className="text-sm font-sans font-medium text-stone-700">
                                            {activeNote?.ownerId === user?.uid ? "Me" : (collaboratorProfiles[activeNote?.ownerId || '']?.name || "Owner")}
                                        </span>
                                        <span className="text-[10px] text-stone-400 font-sans bg-stone-100/80 px-1.5 py-0.5 rounded-md font-medium">Owner</span>
                                    </div>

                                    {/* Collaborators Tags */}
                                    {collaborators.map((collabUid) => {
                                        const profile = collaboratorProfiles[collabUid] || { name: 'Collaborator', email: '' };
                                        return (
                                            <div key={collabUid} className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/60 rounded-full px-4 py-1.5">
                                                <span className="text-sm font-sans font-medium text-stone-700">{profile.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            )}

            {/* Confirmation dialog to close/end collaboration or decline invites */}
            {confirmCloseCollab.isOpen && (
                <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setConfirmCloseCollab({ isOpen: false, type: null })}>
                    <div 
                        className="bg-white rounded-[24px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-md w-full p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-2xl font-sans font-light text-stone-700 tracking-[-0.025em] leading-[1.3]">
                            Are you sure you want to close the collaboration?
                        </h3>
                        <p className="text-sm text-stone-500 leading-relaxed font-sans font-medium">
                            {confirmCloseCollab.type === 'decline_invite'
                                ? "This will decline the invitation and clean the project from your canvas."
                                : "This will disconnect the project's real-time collaboration. If you are a collaborator, you will leave this project."
                            }
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-2">
                            <button
                                onClick={() => setConfirmCloseCollab({ isOpen: false, type: null })}
                                className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200/70 text-stone-600 rounded-full text-[14px] font-sans font-semibold transition-colors cursor-pointer outline-none active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirmCloseCollab.type === 'decline_invite') {
                                        await handleDeclineInvite(confirmCloseCollab.invite);
                                        setConfirmCloseCollab({ isOpen: false, type: null });
                                    } else if (confirmCloseCollab.type === 'close_collab' && confirmCloseCollab.projectId) {
                                        await handleCloseCollaboration(confirmCloseCollab.projectId);
                                    }
                                }}
                                className="px-6 py-2.5 bg-red-500 hover:bg-red-650 text-white rounded-full text-[14px] font-sans font-semibold transition-colors cursor-pointer outline-none active:scale-95"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
