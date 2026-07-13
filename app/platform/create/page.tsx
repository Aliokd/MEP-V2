"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
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
    VolumeX,
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
    Loader2,
    RefreshCw,
    Upload,
    ArrowRight,
    Undo2,
    Redo2
} from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';


interface InspirationCard {
    id: string;
    title: string;
    category: string;
    questions: string[];
    bgImage: string;
}

const INSPIRATION_CARDS: InspirationCard[] = [
    {
        id: 'therapy-releasing-regret',
        title: 'Releasing Regret',
        category: 'Release',
        bgImage: '/assets/inspiration/therapy_releasing_regret.png',
        questions: [
            'What is one memory or regret from your past that feels like a heavy, withered leaf?',
            'If you let it drop onto the forest floor, how does the earth promise to decompose and renew it?',
            'What would your life look like if you stopped holding onto branches that no longer nourish you?',
            'Write a lyric describing the weight of carrying what has already died.',
            'What chord progression captures the peaceful release of letting go?'
        ]
    },
    {
        id: 'therapy-finding-stillness',
        title: 'Finding Stillness',
        category: 'Calm',
        bgImage: '/assets/inspiration/therapy_finding_stillness.png',
        questions: [
            'What part of your mind is currently rippled with anxiety, and how can you invite it to settle?',
            'When you look at the perfect reflection on the water, what true version of yourself do you see?',
            'If you sat in complete silence by this shore, what is the first feeling that would emerge?',
            'Describe the texture of absolute quietness using musical terms (tempo, volume, tone).',
            'Write a line of gratitude for this moment of pause.'
        ]
    },
    {
        id: 'therapy-growth-after-pain',
        title: 'Growth After Pain',
        category: 'Resilience',
        bgImage: '/assets/inspiration/therapy_growth_pain.png',
        questions: [
            'What personal struggle or heartbreak was the fire that burned your old canvas away?',
            'Where do you see the first tiny green shoot of new strength emerging within you?',
            'How does ashes fertilizing the soil represent the hidden value of your hardest days?',
            'Write a lyric comparing your resilience to a forest growing back stronger.',
            'What tempo or rhythm represents a slow, unstoppable rebirth?'
        ]
    },
    {
        id: 'therapy-embracing-uncertainty',
        title: 'Embracing Uncertainty',
        category: 'Trust',
        bgImage: '/assets/inspiration/therapy_embracing_uncertainty.png',
        questions: [
            'What makes you fearful about not being able to see the road far ahead?',
            'If you could only see three steps in front of you, how would you find the courage to take the next one?',
            'What comfort does the mysterious, soft fog bring when it covers the noise of the world?',
            'Write a line about trusting the journey when the destination is hidden.',
            'What musical key feels like walking into the beautiful unknown?'
        ]
    },
    {
        id: 'therapy-grief-and-honoring',
        title: 'Grief and Honoring',
        category: 'Healing',
        bgImage: '/assets/inspiration/therapy_grief_honoring.png',
        questions: [
            'What loss or grief are you carrying that feels frozen inside your chest?',
            'As the sun warms the mountain, how can you allow your frozen tears to melt and flow?',
            'Where does the melting water go, and how can it bring life to the valleys below?',
            'Write a line that honors the beauty of what you lost while accepting that life moves forward.',
            'If your grief was a gentle acoustic melody, how would it resolve?'
        ]
    },
    {
        id: 'therapy-overcoming-fear',
        title: 'Overcoming Fear',
        category: 'Courage',
        bgImage: '/assets/inspiration/therapy_overcoming_fear.png',
        questions: [
            'What is the edge or cliff you are standing on, and what leap of faith are you afraid to take?',
            'How does the raw, howling wind challenge you to stand tall in your truth?',
            'If you knew the ocean below would catch you and teach you to swim, would you jump?',
            'Write a powerful line describing the moment fear turns into freedom.',
            'What dynamic shift in a song captures the transition from hesitation to courage?'
        ]
    },
    {
        id: 'therapy-self-compassion',
        title: 'Self-Compassion',
        category: 'Comfort',
        bgImage: '/assets/inspiration/therapy_self_compassion.png',
        questions: [
            'In what ways have you been harsh or demanding of yourself during your dry seasons?',
            'How does it feel to finally sit by a cool pool and offer yourself kindness?',
            'If you were speaking to a dear friend who was lost in the desert, what comforting words would you say to them?',
            'Write a gentle verse about soothing your own tired mind.',
            'What soft, warm instrumentation represents a sanctuary of self-love?'
        ]
    },
    {
        id: 'therapy-reclaiming-voice',
        title: 'Reclaiming Voice',
        category: 'Expression',
        bgImage: '/assets/inspiration/therapy_reclaiming_voice.png',
        questions: [
            'What feelings or truths have you silenced in order to keep the peace?',
            'If your voice was a cascading waterfall, what powerful message would it shout to the valley?',
            'How does expressing your raw emotion release the blockages inside you?',
            'Write a lyric that refuses to be quiet or small anymore.',
            'What vocal or instrumental buildup represents reclaiming your personal power?'
        ]
    },
    {
        id: 'therapy-patience-and-timing',
        title: 'Patience and Timing',
        category: 'Patience',
        bgImage: '/assets/inspiration/therapy_patience_timing.png',
        questions: [
            'Why are you rushing your healing or your creative process?',
            'What do the ancient redwoods teach us about growing slowly and deeply over centuries?',
            'How do deep, unseen roots support the tall branches through the heaviest storms?',
            'Write a line about the quiet beauty of growing without needing to rush.',
            'What slow, grounding tempo represents the rhythm of deep roots?'
        ]
    },
    {
        id: 'therapy-strength-vulnerability',
        title: 'Strength in Vulnerability',
        category: 'Vulnerability',
        bgImage: '/assets/inspiration/therapy_strength_vulnerability.png',
        questions: [
            'How does it feel to stand under the open sky without any armor or hiding spots?',
            'Why is being open to the wind and rain a sign of strength rather than weakness?',
            'If you showed the world your softest, most fragile parts, what beauty would bloom?',
            'Write a lyric about finding strength in being completely exposed and honest.',
            'What instrument represents the fragile yet resilient nature of a wildflower?'
        ]
    },
    {
        id: 'therapy-navigating-darkness',
        title: 'Navigating Darkness',
        category: 'Hope',
        bgImage: '/assets/inspiration/therapy_navigating_darkness.png',
        questions: [
            'When your mind feels dark, what are the tiny stars or points of light that still shine?',
            'How does the darkness make the stars visible in a way the bright day never could?',
            'What comfort is there in knowing that the night is a natural, temporary phase?',
            'Write a verse about finding guidance in your darkest hours.',
            'What ambient, spacious sound represents the peace of a starry night?'
        ]
    },
    {
        id: 'therapy-cleansing-renewal',
        title: 'Cleansing and Renewal',
        category: 'Renewal',
        bgImage: '/assets/inspiration/therapy_cleansing_renewal.png',
        questions: [
            'What emotional clutter or toxic thoughts do you need the heavy rain to wash away?',
            'How does the air smell and feel after a powerful lightning storm clears the sky?',
            'If the rain could wash off the labels others have put on you, who would you be?',
            'Write a lyric about starting fresh after the storm has passed.',
            'What beat or rhythm captures the refreshing energy of clean rain?'
        ]
    },
    {
        id: 'therapy-staying-grounded',
        title: 'Staying Grounded',
        category: 'Presence',
        bgImage: '/assets/inspiration/therapy_staying_grounded.png',
        questions: [
            'When your thoughts are spinning, how can you draw energy from the solid, unmoving rock beneath you?',
            'What does it feel like to be completely held and protected by the earth?',
            'If you could leave your anxieties in the darkness of the cave, what light would you walk back out with?',
            'Write a line about feeling steady, anchored, and safe in the present moment.',
            'What deep, low-frequency sound represents the grounding energy of the earth?'
        ]
    },
    {
        id: 'therapy-feeling-connected',
        title: 'Feeling Connected',
        category: 'Connection',
        bgImage: '/assets/inspiration/therapy_feeling_connected.png',
        questions: [
            'In what ways have you isolated yourself, and who are the people you long to fly with?',
            'How does it feel to realize that your pain is shared by others, and you are not alone?',
            'What collective song or harmony is created when we support each other\'s journeys?',
            'Write a lyric about reaching out your hand in the dark.',
            'What vocal harmony structure represents perfect connection and support?'
        ]
    },
    {
        id: 'therapy-accepting-change',
        title: 'Accepting Change',
        category: 'Acceptance',
        bgImage: '/assets/inspiration/therapy_accepting_change.png',
        questions: [
            'What change in your life are you currently fighting or resisting?',
            'How does the river teach us that carving away old rock is necessary to create a beautiful canyon?',
            'If you flowed with the current instead of swimming against it, where would it carry you?',
            'Write a verse about the elegance of letting life reshape you.',
            'What time signature or metric shift represents the natural flow of change?'
        ]
    },
    {
        id: 'therapy-releasing-anger',
        title: 'Releasing Anger',
        category: 'Catharsis',
        bgImage: '/assets/inspiration/therapy_releasing_anger.png',
        questions: [
            'What anger or resentment has been boiling underneath your surface?',
            'How can you let the steam rise and vent without burning yourself or others?',
            'What does it feel like to watch your heated thoughts evaporate into the cool air?',
            'Write a fiery line that lets out the heat and leaves behind calm water.',
            'What musical dynamic transition represents a sudden, explosive release of tension?'
        ]
    },
    {
        id: 'therapy-new-beginnings',
        title: 'New Beginnings',
        category: 'Hope',
        bgImage: '/assets/inspiration/therapy_new_beginnings.png',
        questions: [
            'What is one promise you want to make to yourself as a new day begins?',
            'How does the first golden light breaking over the hills change your perspective?',
            'If today was a blank sheet of music, what is the first note you would play?',
            'Write a hopeful lyric about the end of a long, dark night.',
            'What chord resolving to major represents the first light of dawn?'
        ]
    },
    {
        id: 'therapy-unconditional-worth',
        title: 'Unconditional Worth',
        category: 'Worth',
        bgImage: '/assets/inspiration/therapy_unconditional_worth.png',
        questions: [
            'What makes you believe you need to achieve or perform to have value?',
            'How do the mountains exist in quiet majesty without needing to prove anything to anyone?',
            'What is your inner peak—the steady, immovable core of your worth?',
            'Write a lyric about your value being as solid and unshakeable as a mountain.',
            'What grand, orchestral arrangement evokes the scale of unconditional self-worth?'
        ]
    },
    {
        id: 'therapy-healing-child',
        title: 'Healing the Child',
        category: 'Play',
        bgImage: '/assets/inspiration/therapy_healing_child.png',
        questions: [
            'What did your inner child love to do before the weight of the world took over?',
            'If you could play, make mistakes, and create without judgment today, what would you make?',
            'What message of safety and love does your adult self want to tell your younger self?',
            'Write a playful, lighthearted line that makes you smile.',
            'What bright, major-key melody captures the innocence of play?'
        ]
    },
    {
        id: 'therapy-quiet-strength',
        title: 'Quiet Strength',
        category: 'Strength',
        bgImage: '/assets/inspiration/therapy_quiet_strength.png',
        questions: [
            'How do you protect your inner light when the dark storms of life beat against you?',
            'What does it mean to be a steady guide for yourself and others through rough seas?',
            'How can you find strength in standing still and just shining your light?',
            'Write a lyric about being a lighthouse in someone\'s storm (or your own).',
            'What steady, repeating rhythm represents the rotating beam of a lighthouse?'
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
    forceHistoryPush?: boolean;
}


interface StudioTrack {
    id: number;
    name: string;
    volume: number;      // 0 to 100
    pan: number;         // -50 to 50
    eq: number;          // -12 to 12
    compressor: boolean; // true/false
    reverb: number;      // 0 to 100
    audioBuffer: AudioBuffer | null;
    url: string | null;
    type: 'guitar' | 'piano' | 'drums' | 'vocals' | 'synth' | 'custom';
}


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
    activeRemoteUsers,
    clickedTokenIndex
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
    clickedTokenIndex?: number | null;
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
                        if (setDragOverBlockId) setDragOverBlockId(null);
                        if (setBlockDropPosition) setBlockDropPosition(null);
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
                    if (setDragOverBlockId) setDragOverBlockId(null);
                    if (setBlockDropPosition) setBlockDropPosition(null);
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
                    if (setDragOverBlockId) {
                        setDragOverBlockId(null);
                    }
                    if (setBlockDropPosition) {
                        setBlockDropPosition(null);
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
                    if (setDragOverBlockId) setDragOverBlockId(null);
                    if (setBlockDropPosition) setBlockDropPosition(null);
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
                    if (setDragOverBlockId) setDragOverBlockId(null);
                    if (setBlockDropPosition) setBlockDropPosition(null);
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
                if (setDragOverBlockId) {
                    setDragOverBlockId(null);
                }
                if (setBlockDropPosition) {
                    setBlockDropPosition(null);
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
                    if (setBlockDropPosition) setBlockDropPosition(null);
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
                                const isWordClicked = clickedTokenIndex === tokenOffset + idx;

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
                                                word-token hover:bg-stone-200/90 text-stone-855 hover:text-stone-955 hover:font-medium rounded-[8px] px-1.5 py-0.5 cursor-grab active:cursor-grabbing transition-all duration-150 inline-block select-none relative
                                                ${isWordDragged ? 'opacity-30' : ''}
                                                ${isWordDragOver ? 'bg-amber-100/80 scale-105' : ''}
                                                ${isWordClicked ? 'bg-stone-200/90 text-stone-955 font-semibold shadow-xs scale-102 z-10' : ''}
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
            <div className="flex items-center gap-[2px] h-6 px-1.5 shrink-0" style={{ width: 'clamp(70px, 22vw, 130px)' }}>
                {Array.from({ length: 24 }).map((_, idx) => (
                    <div 
                        key={idx} 
                        className="w-[1.5px] bg-stone-200 rounded-full flex-shrink-0" 
                        style={{ height: `${4 + Math.abs(Math.sin(idx * 0.45)) * 10}px` }} 
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

// Global cache to prevent decoding/fetching the same audio peaks repeatedly when component re-renders/remounts.
const peaksCache = new Map<string, number[]>();

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

    const BAR_COUNT_SMALL = 28;
    const BAR_COUNT_LARGE = 55;

    const cacheKey = `${audioNote.id}-${isDocked ? 'small' : 'large'}`;

    // Decoded waveform peaks — fetched once, cached globally by ID
    const [waveformPeaks, setWaveformPeaks] = useState<number[]>(() => {
        return peaksCache.get(cacheKey) || [];
    });
    const [peaksLoaded, setPeaksLoaded] = useState(() => {
        return peaksCache.has(cacheKey);
    });

    // Fetch and decode audio to get real waveform amplitude peaks.
    // This never touches the <audio> element so sound is NEVER affected.
    useEffect(() => {
        if (!audioNote.url) return;
        
        // If we already have peaks for this ID, immediately load them and skip fetch
        if (peaksCache.has(cacheKey)) {
            if (!peaksLoaded) {
                setWaveformPeaks(peaksCache.get(cacheKey) || []);
                setPeaksLoaded(true);
            }
            return;
        }

        let cancelled = false;
        const barCount = isDocked ? BAR_COUNT_SMALL : BAR_COUNT_LARGE;
        (async () => {
            try {
                const response = await fetch(audioNote.url);
                const arrayBuffer = await response.arrayBuffer();
                // Use OfflineAudioContext just to decode — no playback routing
                const offlineCtx = new OfflineAudioContext(1, 1, 44100);
                const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
                const data = audioBuffer.getChannelData(0);
                const blockSize = Math.floor(data.length / barCount);
                const peaks: number[] = [];
                for (let i = 0; i < barCount; i++) {
                    let max = 0;
                    for (let j = 0; j < blockSize; j++) {
                        const sample = Math.abs(data[i * blockSize + j] || 0);
                        if (sample > max) max = sample;
                    }
                    peaks.push(max);
                }
                // Normalize peaks to 0–1
                const maxPeak = Math.max(...peaks, 0.01);
                const normalized = peaks.map(p => p / maxPeak);
                if (!cancelled) {
                    peaksCache.set(cacheKey, normalized);
                    setWaveformPeaks(normalized);
                    setPeaksLoaded(true);
                }
            } catch {
                // Fallback: synthetic sine wave
                if (!cancelled) {
                    const barCount2 = isDocked ? BAR_COUNT_SMALL : BAR_COUNT_LARGE;
                    const fallbackPeaks = Array.from({ length: barCount2 }, (_, i) => {
                        const wave = 0.35 * Math.sin(i * 0.15) + 0.45 * Math.sin(i * 0.35) + 0.2 * Math.sin(i * 0.8);
                        const distFromCenter = Math.abs(i - (barCount2 - 1) / 2);
                        const scaling = Math.max(0.1, 1 - (distFromCenter / ((barCount2 - 1) / 2)) * 0.85);
                        return Math.max(0.12, (0.2 + Math.abs(wave) * 0.8) * scaling);
                    });
                    peaksCache.set(cacheKey, fallbackPeaks);
                    setWaveformPeaks(fallbackPeaks);
                    setPeaksLoaded(true);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [audioNote.url, isDocked, peaksLoaded, cacheKey]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => { playbackAudioRef.current?.pause(); };
    }, []);

    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTouchDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);

    const togglePlayback = () => {
        if (!playbackAudioRef.current) return;
        if (isPlaying) {
            playbackAudioRef.current.pause();
            setIsPlaying(false);
        } else {
            // Pause all other audio elements
            document.querySelectorAll('audio').forEach(el => {
                if (el !== playbackAudioRef.current) el.pause();
            });
            playbackAudioRef.current.play().catch(err => console.error("Playback failed:", err));
            setIsPlaying(true);
        }
    };

    const handleWaveformClick = (e: any) => {
        e.stopPropagation();
        if (!playbackAudioRef.current || !playbackDuration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
        if (!clientX) return;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        playbackAudioRef.current.currentTime = percent * playbackDuration;
        setPlaybackTime(percent * playbackDuration);
    };

    const formatTime = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    // Shared touch drag handlers (for draggable pill)
    const sharedTouchHandlers = {
        onTouchStart: (e: React.TouchEvent) => {
            if (isTranscribing) return;
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('input') || target.closest('svg')) return;
            startXRef.current = e.touches[0].clientX;
            startYRef.current = e.touches[0].clientY;
            isTouchDraggingRef.current = false;
        },
        onTouchMove: (e: React.TouchEvent) => {
            if (isTranscribing) return;
            const touch = e.touches[0];
            if (!isTouchDraggingRef.current) {
                if (Math.abs(touch.clientX - startXRef.current) > 10 || Math.abs(touch.clientY - startYRef.current) > 10) {
                    isTouchDraggingRef.current = true;
                    if (setDraggedAudioId) setDraggedAudioId(audioNote.id);
                    if (draggedAudioIdRef) draggedAudioIdRef.current = audioNote.id;
                    if (navigator.vibrate) navigator.vibrate(15);
                }
                return;
            }
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            const gr = getElementUnderTouch(touch.clientX, touch.clientY, '.verse-group-container');
            const pr = getElementUnderTouch(touch.clientX, touch.clientY, '.phrase-row-container');
            if (gr) { const id = gr.getAttribute('data-group-id'); if (id) { if (setDragOverGroupId) setDragOverGroupId(id); if (setDragOverPhraseId) setDragOverPhraseId(null); } }
            else if (pr) { const id = pr.getAttribute('data-phrase-id'); if (id) { if (setDragOverPhraseId) setDragOverPhraseId(id); if (setDragOverGroupId) setDragOverGroupId(null); } }
            else { if (setDragOverGroupId) setDragOverGroupId(null); if (setDragOverPhraseId) setDragOverPhraseId(null); }
        },
        onTouchEnd: (e: React.TouchEvent) => {
            if (isTranscribing || !isTouchDraggingRef.current) return;
            isTouchDraggingRef.current = false;
            let fg = dragOverGroupIdRef?.current || null, fp = dragOverPhraseIdRef?.current || null, canvas = false;
            if (!fg && !fp) {
                const t = e.changedTouches[0];
                canvas = !!getElementUnderTouch(t.clientX, t.clientY, '#writing-canvas');
                const gr = getElementUnderTouch(t.clientX, t.clientY, '.verse-group-container');
                const pr = getElementUnderTouch(t.clientX, t.clientY, '.phrase-row-container');
                if (gr) fg = gr.getAttribute('data-group-id');
                if (pr) fp = pr.getAttribute('data-phrase-id');
            }
            if (fg && activeNoteId && handleUpdateAudioNoteGroup) handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, fg);
            else if (fp && handleAttachAudioToPhrase) {
                const pr = document.querySelector(`[data-phrase-id="${fp}"]`);
                const pgid = pr?.closest('.verse-group-container')?.getAttribute('data-group-id') || null;
                if (pgid && activeNoteId && handleUpdateAudioNoteGroup) handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, pgid);
                else handleAttachAudioToPhrase(audioNote.id, fp, null);
            } else if (canvas && activeNoteId && handleUpdateAudioNoteGroup) handleUpdateAudioNoteGroup(activeNoteId, audioNote.id, null);
            if (setDraggedAudioId) setDraggedAudioId(null);
            if (draggedAudioIdRef) draggedAudioIdRef.current = null;
            if (setDragOverGroupId) setDragOverGroupId(null);
            if (setDragOverPhraseId) setDragOverPhraseId(null);
        },
        onTouchCancel: () => {
            if (isTranscribing) return;
            isTouchDraggingRef.current = false;
            if (setDraggedAudioId) setDraggedAudioId(null);
            if (draggedAudioIdRef) draggedAudioIdRef.current = null;
            if (setDragOverGroupId) setDragOverGroupId(null);
            if (setDragOverPhraseId) setDragOverPhraseId(null);
        }
    };

    // The audio element — never routed through Web Audio, so sound always works
    const renderAudioEl = () => (
        <audio
            ref={playbackAudioRef}
            src={audioNote.url}
            onTimeUpdate={() => { if (playbackAudioRef.current) setPlaybackTime(playbackAudioRef.current.currentTime); }}
            onLoadedMetadata={() => { if (playbackAudioRef.current) setPlaybackDuration(playbackAudioRef.current.duration); }}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
        />
    );

    // WaveSurfer-style waveform using decoded peaks
    const renderWaveformViz = (small: boolean) => {
        const maxBarH = small ? 10 : 28;
        const minBarH = small ? 2 : 3;
        const containerH = small ? 'h-[12px]' : 'h-[32px]';
        const containerW = small ? { width: 'clamp(52px,14vw,80px)' } : { width: 'clamp(90px,22vw,160px)' };
        const currentPercent = playbackDuration ? playbackTime / playbackDuration : 0;
        
        // Use beautiful realistic voice-like fallback shape if fetch fails/loads
        const fallbackLength = small ? BAR_COUNT_SMALL : BAR_COUNT_LARGE;
        const peaks = waveformPeaks.length > 0
            ? waveformPeaks
            : Array.from({ length: fallbackLength }, (_, i) => {
                const wave = 0.35 * Math.sin(i * 0.15) + 0.45 * Math.sin(i * 0.35) + 0.2 * Math.sin(i * 0.8);
                const distFromCenter = Math.abs(i - (fallbackLength - 1) / 2);
                const scaling = Math.max(0.1, 1 - (distFromCenter / ((fallbackLength - 1) / 2)) * 0.85);
                return Math.max(0.12, (0.2 + Math.abs(wave) * 0.8) * scaling);
              });

        return (
            <div
                onClick={handleWaveformClick}
                onTouchStart={handleWaveformClick}
                className={`relative flex items-center justify-between ${containerH} cursor-pointer select-none`}
                style={containerW}
            >
                {/* Playhead */}
                <div
                    className="absolute top-0 bottom-0 w-[1px] bg-stone-500 z-10 pointer-events-none"
                    style={{ left: `${currentPercent * 100}%`, transition: 'left 80ms linear' }}
                />
                {peaks.map((peak, i) => {
                    const barPercent = i / peaks.length;
                    const isPlayed = barPercent <= currentPercent;
                    const isNearPlayhead = Math.abs(barPercent - currentPercent) < (1.5 / peaks.length);
                    const h = Math.max(minBarH, peak * maxBarH);
                    return (
                        <div
                            key={i}
                            style={{
                                height: `${h}px`,
                                width: '1.5px',
                                borderRadius: '2px',
                                flexShrink: 0,
                                backgroundColor: isPlayed ? '#44403c' : '#d6d3d1',
                                transform: (isPlaying && isNearPlayhead) ? 'scaleY(1.25)' : 'scaleY(1)',
                                transition: 'background-color 60ms, transform 80ms ease-out',
                                transformOrigin: 'center',
                            }}
                        />
                    );
                })}
            </div>
        );
    };

    // ─── DOCKED (small pill) layout ───────────────────────────────────────────
    if (isDocked) {
        return (
            <div
                draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
                onClick={(e) => e.stopPropagation()} {...sharedTouchHandlers}
                className={`bg-white border border-stone-200/80 rounded-full px-3 py-0.5 shadow-sm flex items-center gap-2.5 transition-all select-none h-[22px] cursor-grab active:cursor-grabbing touch-none ${
                    draggedAudioId === audioNote.id ? 'opacity-30 scale-95' : ''
                }`}
            >
                {renderAudioEl()}

                {/* Title */}
                <input
                    type="text" value={audioNote.title || ''} placeholder="Name"
                    disabled={isTranscribing} onChange={(e) => onRename(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-[9px] text-stone-700 placeholder:text-stone-400 w-16 hover:bg-stone-50 focus:bg-stone-50 rounded px-1 focus:ring-1 focus:ring-stone-200 transition-colors disabled:opacity-50"
                    title="Rename recording"
                />

                <div className="h-2.5 w-px bg-stone-200 shrink-0" />

                {isTranscribing ? (
                    <div className="flex items-center gap-1 text-emerald-600 animate-pulse text-[9px] font-bold shrink-0">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-bounce" />
                        <span>Transcribing...</span>
                    </div>
                ) : (
                    <>
                        {/* Play / Pause */}
                        <button onClick={togglePlayback} className="flex items-center text-stone-600 hover:text-stone-900 transition-colors cursor-pointer shrink-0">
                            {isPlaying
                                ? <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                : <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            }
                        </button>

                        {/* Waveform */}
                        <div className="hidden sm:block h-2.5 w-px bg-stone-200 shrink-0" />
                        <div className="hidden sm:block">{renderWaveformViz(true)}</div>
                        <div className="hidden sm:block h-2.5 w-px bg-stone-200 shrink-0" />

                        {/* Timer */}
                        <span className="text-[8px] font-mono font-bold text-stone-500 shrink-0">
                            {formatTime(playbackTime || playbackDuration)}
                        </span>
                    </>
                )}

                {/* Transcribe */}
                {onTranscribe && (
                    <><div className="h-2.5 w-px bg-stone-200 shrink-0" />
                    <button disabled={isTranscribing} onClick={(e) => { e.stopPropagation(); onTranscribe(); }}
                        className="text-stone-404 hover:text-emerald-600 transition-colors cursor-pointer disabled:opacity-35" title="Transcribe recording">
                        <RefreshCw className="w-2.5 h-2.5" strokeWidth={2.2} />
                    </button></>
                )}

                {/* Delete */}
                <div className="h-2.5 w-px bg-stone-200 shrink-0" />
                <button disabled={isTranscribing} onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-stone-404 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-35" title="Delete recording">
                    <svg className="w-2.5 h-2.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        );
    }

    // ─── LARGE (floating pill) layout ─────────────────────────────────────────
    return (
        <div
            draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()} {...sharedTouchHandlers}
            className={`bg-white border border-stone-200/80 rounded-full px-3 py-1.5 sm:px-5 sm:py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center gap-1.5 sm:gap-3 z-30 transition-all select-none cursor-grab active:cursor-grabbing shrink-0 touch-none max-w-full ${
                draggedAudioId === audioNote.id ? 'opacity-30 scale-95' : ''
            }`}
        >
            {renderAudioEl()}

            {/* Title */}
            <input
                type="text" value={audioNote.title || ''} placeholder="Name"
                disabled={isTranscribing} onChange={(e) => onRename(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-xs text-stone-800 placeholder:text-stone-400 w-16 sm:w-20 shrink-0 hover:bg-stone-50 focus:bg-stone-50 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-stone-200 transition-colors disabled:opacity-50"
                title="Rename recording"
            />

            <div className="h-4 w-px bg-stone-200 shrink-0" />

            {isTranscribing ? (
                <div className="flex items-center gap-2 text-emerald-600 animate-pulse text-xs font-bold py-1 px-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-bounce" />
                    <span>Transcribing audio...</span>
                </div>
            ) : (
                <>
                    {/* Play / Pause */}
                    <button onClick={togglePlayback}
                        className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer text-xs font-semibold shrink-0">
                        {isPlaying
                            ? <><svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg><span className="hidden sm:inline">Pause</span></>
                            : <><svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span className="hidden sm:inline">Play</span></>
                        }
                    </button>

                    {/* Waveform */}
                    <div className="hidden sm:block h-4 w-px bg-stone-200 shrink-0" />
                    <div className="hidden sm:block shrink-0">{renderWaveformViz(false)}</div>
                    <div className="hidden sm:block h-4 w-px bg-stone-200 shrink-0" />

                    {/* Timer */}
                    <span className="text-[10px] font-mono font-bold text-stone-500 shrink-0">
                        {formatTime(playbackTime || playbackDuration)}
                    </span>
                </>
            )}

            {/* Transcribe */}
            {onTranscribe && (
                <><div className="h-4 w-px bg-stone-200 shrink-0" />
                <button disabled={isTranscribing} onClick={(e) => { e.stopPropagation(); onTranscribe(); }}
                    className="text-stone-404 hover:text-emerald-600 transition-colors cursor-pointer shrink-0 disabled:opacity-35" title="Transcribe recording">
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} />
                </button></>
            )}

            {/* Delete */}
            <div className="h-4 w-px bg-stone-200 shrink-0" />
            <button disabled={isTranscribing} onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-stone-404 hover:text-red-500 transition-colors cursor-pointer shrink-0 disabled:opacity-35" title="Delete recording">
                <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
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

// Helper: read notes cache from localStorage synchronously
function readCachedNotes(): SongNote[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('veinote-create-notes');
        return raw ? (JSON.parse(raw) as SongNote[]) : [];
    } catch { return []; }
}
function readCachedFolders(): SongFolder[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('veinote-create-folders');
        return raw ? (JSON.parse(raw) as SongFolder[]) : [];
    } catch { return []; }
}

const TrackWaveform = ({ 
    audioBuffer, 
    playhead, 
    duration, 
    isRecording, 
    studioState,
    trackName,
    onClick 
}: { 
    audioBuffer: AudioBuffer | null; 
    playhead: number; 
    duration: number; 
    isRecording: boolean; 
    studioState?: string;
    trackName?: string;
    onClick?: (e: React.MouseEvent) => void;
}) => {
    const BAR_COUNT = 85;
    const [pulseTime, setPulseTime] = useState(0);

    useEffect(() => {
        if (!isRecording) return;
        const interval = setInterval(() => {
            setPulseTime(prev => prev + 1);
        }, 100);
        return () => clearInterval(interval);
    }, [isRecording]);

    const peaks = useMemo(() => {
        if (!audioBuffer) return [];
        
        try {
            const data = audioBuffer.getChannelData(0);
            const step = Math.floor(data.length / BAR_COUNT);
            const result: number[] = [];
            
            for (let i = 0; i < BAR_COUNT; i++) {
                const start = i * step;
                let max = 0;
                for (let j = 0; j < step; j++) {
                    const val = Math.abs(data[start + j] || 0);
                    if (val > max) max = val;
                }
                result.push(max);
            }
            
            const maxPeak = Math.max(...result) || 1;
            return result.map(p => Math.max(0.1, p / maxPeak));
        } catch {
            return [];
        }
    }, [audioBuffer]);

    const formattedName = useMemo(() => {
        if (!trackName) return 'Recording...';
        const cleanName = trackName.charAt(0).toUpperCase() + trackName.slice(1);
        if (cleanName.toLowerCase().endsWith('sound') || cleanName.toLowerCase().endsWith('track')) {
            return cleanName;
        }
        return `${cleanName} sound`;
    }, [trackName]);

    return (
        <div 
            onClick={onClick}
            className="w-full h-full flex items-center justify-between bg-transparent px-3 select-none relative"
        >
            {isRecording ? (
                <div 
                    className="absolute inset-0 overflow-hidden rounded-full flex items-center justify-center"
                    style={{
                        backgroundImage: 'linear-gradient(90deg, #FF6B6B 0%, #D32F2F 50%, #FF6B6B 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'gradientMove 3s linear infinite',
                    }}
                >
                    <span className="text-white/85 text-[13px] font-normal tracking-wide relative z-10 animate-pulse">
                        {formattedName}
                    </span>
                    <style>{`
                        @keyframes gradientMove {
                            0% { background-position: 0% 0% }
                            100% { background-position: -200% 0% }
                        }
                    `}</style>
                </div>
            ) : peaks.length === 0 ? (
                <div className="w-full flex items-center justify-between h-[28px] px-1 relative">
                    {/* Quiet silent waveform bars matching song wave style */}
                    {Array.from({ length: 85 }).map((_, i) => (
                        <div 
                            key={i}
                            style={{
                                height: '3px',
                                width: '1.5px',
                                borderRadius: '2px',
                                flexShrink: 0,
                                backgroundColor: '#e6e4e2',
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-between w-full h-[28px]">
                    {peaks.map((peak, i) => {
                        const barPercent = i / peaks.length;
                        const currentPercent = (duration > 0 && studioState !== 'recording') ? playhead / duration : 0;
                        const isPlayed = barPercent <= currentPercent;
                        const h = Math.max(2, peak * 26);
                        
                        return (
                            <div 
                                key={i}
                                style={{
                                    height: `${h}px`,
                                    width: '1.5px',
                                    borderRadius: '2px',
                                    flexShrink: 0,
                                    backgroundColor: isPlayed ? '#44403c' : '#d6d3d1',
                                    transition: 'background-color 60ms',
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function CreatePage() {
    const { user } = useAuth();

    // Pre-populate from cache so the workspace renders instantly on first paint.
    // Firestore listeners will silently merge fresher data in the background.
    const [isDataLoaded, setIsDataLoaded] = useState(() => readCachedNotes().length > 0);

    const [folders, setFolders] = useState<SongFolder[]>(() => readCachedFolders());
    const [notes, setNotes] = useState<SongNote[]>(() => readCachedNotes());
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'shared'>('idle');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [renameGroupName, setRenameGroupName] = useState<string>('');
    const [isAddMenuSticky, setIsAddMenuSticky] = useState<boolean>(false);

    const selectedNoteIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedNoteIdRef.current = selectedNoteId;
    }, [selectedNoteId]);

    const [undoStack, setUndoStack] = useState<{ content: string; phrases: Phrase[]; verses: VerseGroup[]; audioNotes: AudioNote[] }[]>([]);
    const [redoStack, setRedoStack] = useState<{ content: string; phrases: Phrase[]; verses: VerseGroup[]; audioNotes: AudioNote[] }[]>([]);
    const lastHistoryStateRef = useRef<{ content: string; phrases: Phrase[]; verses: VerseGroup[]; audioNotes: AudioNote[] } | null>(null);
    const lastHistoryPushTimeRef = useRef<number>(0);

    useEffect(() => {
        setUndoStack([]);
        setRedoStack([]);
        const active = notes.find(n => n.id === selectedNoteId);
        if (active) {
            lastHistoryStateRef.current = {
                content: active.content || '',
                phrases: JSON.parse(JSON.stringify(active.phrases || [])),
                verses: JSON.parse(JSON.stringify(active.verses || [])),
                audioNotes: JSON.parse(JSON.stringify(active.audioNotes || []))
            };
        } else {
            lastHistoryStateRef.current = null;
        }
        lastHistoryPushTimeRef.current = 0;
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
    const [isSavingNote, setIsSavingNote] = useState(false);

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

    const [confirmOverwriteStudioRecord, setConfirmOverwriteStudioRecord] = useState<{
        isOpen: boolean;
        trackName: string;
        onConfirm: (() => void) | null;
    }>({ isOpen: false, trackName: '', onConfirm: null });

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

    // Global touch and drag tracking for cleanup and ghost overlay
    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            const isAnyDrag = draggedPhraseIdRef.current || draggedAudioIdRef.current || draggedGroupIdRef.current;
            if (!isAnyDrag) return;
            const touch = e.touches[0];
            setTouchGhostPos({ x: touch.clientX, y: touch.clientY });
        };
        
        const handleDragEndGlobal = () => {
            setDragOverBlockId(null);
            setBlockDropPosition(null);
            setDragOverPhraseId(null);
            setDropPosition(null);
            setDragOverGroupId(null);
            setDraggedPhraseId(null);
            setDraggedGroupId(null);
            setDraggedAudioId(null);
            if (setDragOverWordIndex) setDragOverWordIndex(null);
        };

        const handleTouchEndGlobal = () => {
            setTouchGhostPos(null);
            handleDragEndGlobal();
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEndGlobal);
        window.addEventListener('touchcancel', handleTouchEndGlobal);
        window.addEventListener('dragend', handleDragEndGlobal);
        window.addEventListener('mouseup', handleDragEndGlobal);

        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEndGlobal);
            window.removeEventListener('touchcancel', handleTouchEndGlobal);
            window.removeEventListener('dragend', handleDragEndGlobal);
            window.removeEventListener('mouseup', handleDragEndGlobal);
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

    useEffect(() => {
        const handleWelcomeClosed = () => {
            if (textareaRef.current) {
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                    }
                }, 150);
            }
        };
        window.addEventListener('mep-welcome-video-closed', handleWelcomeClosed);
        return () => {
            window.removeEventListener('mep-welcome-video-closed', handleWelcomeClosed);
        };
    }, []);
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

    const [tracksPerNote, setTracksPerNote] = useState<Record<string, StudioTrack[]>>({});

    const [studioTracks, setStudioTracks] = useState<StudioTrack[]>([
        { id: 1, name: 'Guitar', type: 'guitar', volume: 70, pan: -15, eq: 0, compressor: true, reverb: 25, audioBuffer: null, url: null }
    ]);
    const [studioState, setStudioState] = useState<'idle' | 'playing' | 'recording' | 'paused'>('idle');
    const [activeRecordingTrackId, setActiveRecordingTrackId] = useState<number>(1);
    const [expandedTrackId, setExpandedTrackId] = useState<number | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.studio-track-row')) {
                setExpandedTrackId(null);
            }
            setActiveTrackMenuId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const [isStudioMetronomeOn, setIsStudioMetronomeOn] = useState<boolean>(true);
    const [isMetronomeHovered, setIsMetronomeHovered] = useState<boolean>(false);
    const [isTunerHovered, setIsTunerHovered] = useState<boolean>(false);
    const [studioPlayhead, setStudioPlayhead] = useState<number>(0);
    const [studioDuration, setStudioDuration] = useState<number>(0);

    const [draggedTrackIndex, setDraggedTrackIndex] = useState<number | null>(null);
    const [activeTrackMenuId, setActiveTrackMenuId] = useState<number | null>(null);
    const [activeTrackDropdownId, setActiveTrackDropdownId] = useState<number | null>(null);
    const [editingTrackNameId, setEditingTrackNameId] = useState<number | null>(null);
    const [trackNameInputText, setTrackNameInputText] = useState('');
    const [activePublishMenu, setActivePublishMenu] = useState(false);

    const studioAudioCtxRef = useRef<AudioContext | null>(null);
    const studioMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const studioRecordedChunksRef = useRef<Blob[]>([]);
    const studioActiveSourcesRef = useRef<{ [trackId: number]: { source: AudioBufferSourceNode, gainNode: GainNode, panNode: StereoPannerNode, eqNode: BiquadFilterNode, compNode: DynamicsCompressorNode, reverbGainNode: GainNode } }>({});
    const studioPlayheadIntervalRef = useRef<number | null>(null);
    const studioRecordStartTimeRef = useRef<number>(0);
    const studioSharedReverbNodeRef = useRef<ConvolverNode | null>(null);
    const studioMetronomeIntervalRef = useRef<number | null>(null);
    const studioMonitorNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const stopAllStudioAudio = () => {
        if (studioPlayheadIntervalRef.current) {
            clearInterval(studioPlayheadIntervalRef.current);
            studioPlayheadIntervalRef.current = null;
        }
        if (studioMetronomeIntervalRef.current) {
            clearInterval(studioMetronomeIntervalRef.current);
            studioMetronomeIntervalRef.current = null;
        }
        if (studioMonitorNodeRef.current) {
            try {
                studioMonitorNodeRef.current.disconnect();
            } catch (e) {}
            studioMonitorNodeRef.current = null;
        }
        Object.keys(studioActiveSourcesRef.current).forEach(trackId => {
            try {
                const node = studioActiveSourcesRef.current[parseInt(trackId)];
                if (node && node.source) {
                    node.source.onended = null; // Prevent triggering natural end handler on manual stop/pause
                    node.source.stop();
                }
            } catch (e) {}
        });
        studioActiveSourcesRef.current = {};
    };

    const getStudioAudioContext = () => {
        if (!studioAudioCtxRef.current) {
            studioAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (studioAudioCtxRef.current.state === 'suspended') {
            studioAudioCtxRef.current.resume().catch(console.error);
        }
        return studioAudioCtxRef.current;
    };

    const generateReverbImpulseResponse = (audioCtx: AudioContext): AudioBuffer => {
        const sampleRate = audioCtx.sampleRate;
        const duration = 1.5; // 1.5 seconds decay
        const numSamples = sampleRate * duration;
        const impulseBuffer = audioCtx.createBuffer(2, numSamples, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulseBuffer.getChannelData(channel);
            for (let i = 0; i < numSamples; i++) {
                const decay = Math.exp(-i / (sampleRate * 0.4)); // decay speed
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        return impulseBuffer;
    };

    const getSharedReverbNode = (audioCtx: AudioContext): ConvolverNode => {
        if (!studioSharedReverbNodeRef.current) {
            const convolver = audioCtx.createConvolver();
            convolver.buffer = generateReverbImpulseResponse(audioCtx);
            convolver.connect(audioCtx.destination);
            studioSharedReverbNodeRef.current = convolver;
        }
        return studioSharedReverbNodeRef.current;
    };

    const studioTracksNoteIdRef = useRef<string | null>(null);

    // Save studio tracks to persistent map on track edit
    useEffect(() => {
        if (selectedNoteId && selectedNoteId === studioTracksNoteIdRef.current) {
            setTracksPerNote(prev => ({
                ...prev,
                [selectedNoteId]: studioTracks
            }));
        }
    }, [studioTracks, selectedNoteId]);

    useEffect(() => {
        if (selectedNoteId) {
            const savedTracks = tracksPerNote[selectedNoteId];
            if (savedTracks) {
                const validTracks = savedTracks.filter(Boolean);
                setStudioTracks(validTracks);
                let maxDur = 0;
                validTracks.forEach(t => {
                    if (t.audioBuffer) {
                        maxDur = Math.max(maxDur, t.audioBuffer.duration);
                    }
                });
                setStudioDuration(maxDur);
            } else {
                setStudioTracks([
                    { id: 1, name: 'Guitar', type: 'guitar', volume: 80, pan: 0, eq: 0, compressor: true, reverb: 40, audioBuffer: null, url: null }
                ]);
                setStudioDuration(0);
            }
        } else {
            setStudioTracks([
                { id: 1, name: 'Guitar', type: 'guitar', volume: 80, pan: 0, eq: 0, compressor: true, reverb: 40, audioBuffer: null, url: null }
            ]);
            setStudioDuration(0);
        }

        studioTracksNoteIdRef.current = selectedNoteId;
        setStudioState('idle');
        setActiveRecordingTrackId(1);
        setIsStudioMetronomeOn(true);
        setStudioPlayhead(0);
        setDraggedTrackIndex(null);
        setActiveTrackMenuId(null);
        setActiveTrackDropdownId(null);

        stopAllStudioAudio();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNoteId]);

    useEffect(() => {
        return () => {
            stopAllStudioAudio();
            if (studioAudioCtxRef.current) {
                studioAudioCtxRef.current.close().catch(console.error);
            }
        };
    }, []);

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

    // Close suggestions popover when clicking anywhere outside the popover or the word tokens
    useEffect(() => {
        if (!clickedWord) return;
        
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.closest('.word-token') || target.closest('.suggestions-popover'))) {
                return;
            }
            setClickedWord(null);
            setClickedTokenIndex(null);
            setPopoverPosition(null);
        };
        
        document.addEventListener('click', handleOutsideClick);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [clickedWord]);

    const [cursorSelectionOffset, setCursorSelectionOffset] = useState<{ phraseId: string; offset: number } | null>(null);
    const [draggedWord, setDraggedWord] = useState<{ word: string; phraseId: string; wordIndex: number } | null>(null);
    const [dragOverWordIndex, setDragOverWordIndex] = useState<{ phraseId: string; wordIndex: number; position: 'left' | 'right' } | null>(null);
    const recognitionRef = useRef<any>(null);

        // Creative Tools Suite State Variables
    const [showToolsPanel, setShowToolsPanel] = useState(false);
    const [activeToolTab, setActiveToolTab] = useState<'tuner' | 'tempo' | 'inspiration' | 'studio'>('tuner');

    // Tuner States
    const [tunerActive, setTunerActive] = useState(false);
    const [tunerFreq, setTunerFreq] = useState<number | null>(null);
    const [tunerNote, setTunerNote] = useState<string>('--');
    const [tunerCents, setTunerCents] = useState<number>(0);
    const [refTonePlaying, setRefTonePlaying] = useState(false);
    const [tunerModeAuto, setTunerModeAuto] = useState(true);
    const [savedTuning, setSavedTuning] = useState<{ note: string; freq: number; cents: number; timestamp: string } | null>(null);
    const [tunerSavingState, setTunerSavingState] = useState<'saving' | 'saved' | null>(null);

    // Tap Tempo States
    const [tapTimes, setTapTimes] = useState<number[]>([]);
    const [tapTempoBgColor, setTapTempoBgColor] = useState('#FBFFED');
    
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
    const [inspirationQuestionIndex, setInspirationQuestionIndex] = useState<number>(0);
    const [inspirationAnswers, setInspirationAnswers] = useState<Record<string, Record<string, string[]>>>({});
    const [inspirationDragOffset, setInspirationDragOffset] = useState(0);
    const [swipingToBack, setSwipingToBack] = useState(false);
    const [activeInspirationIndex, setActiveInspirationIndex] = useState(8);
    const [transitionEnabled, setTransitionEnabled] = useState(true);
    const inspirationTouchStartXRef = useRef(0);
    const inspirationDragStartXRef = useRef(0);
    const inspirationSwiperRef = useRef<any>(null);
    const inspirationTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [isTextareaScrollable, setIsTextareaScrollable] = useState(false);

    // Tuner Audio Refs
    const tunerAudioContextRef = useRef<AudioContext | null>(null);
    const tunerAnalyserRef = useRef<AnalyserNode | null>(null);
    const tunerMicStreamRef = useRef<MediaStream | null>(null);
    const tunerOscillatorRef = useRef<OscillatorNode | null>(null);
    const tunerAnimationRef = useRef<number | null>(null);
    const chordbookTunerRef = useRef<any>(null);
    const tunerLastActiveAngleRef = useRef(0);
    const tunerLastCircleRotationRef = useRef(90);
    const tunerNoteHistoryRef = useRef<string[]>([]);
    const tunerPrevTabRef = useRef<string | null>(null);
    const tunerPrevShowRef = useRef<boolean>(false);

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
    const metronomeWasPlayingRef = useRef(false);
    const nextTickTimeRef = useRef<number>(0);
    const lastTickTimeRef = useRef<number>(0);
    const metronomeAudioContextRef = useRef<AudioContext | null>(null);

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
        if (isSavingNote) return;
        
        setIsSavingNote(true);
        setTimeout(() => {
            handleSaveNote(e);
            setIsSavingNote(false);
        }, 800);
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
                title: activeNote.title || 'Untitled Note',
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
                    // Run migration non-blocking — don't await so we don't delay the snapshot setup
                    migrateLegacyNotesToProjects(user.uid).catch(err =>
                        console.warn("Migration error (non-critical):", err)
                    );

                    // Update user profile doc in background — non-blocking
                    const userDocRef = doc(db, "users", user.uid);
                    getDoc(userDocRef).then(userDoc => {
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            if (userData.createFolders && userData.createFolders.length > 0) {
                                setFolders(userData.createFolders);
                            }
                            if (!userData.email || !userData.name) {
                                setDoc(userDocRef, {
                                    uid: user.uid,
                                    name: user.displayName || user.email?.split('@')[0] || 'Collaborator',
                                    email: user.email || ''
                                }, { merge: true }).catch(console.error);
                            }
                        } else {
                            setDoc(userDocRef, {
                                uid: user.uid,
                                name: user.displayName || user.email?.split('@')[0] || 'Collaborator',
                                email: user.email || '',
                                createdAt: new Date().toISOString()
                            }, { merge: true }).catch(console.error);
                        }
                    }).catch(err => console.error("Error loading user doc:", err));

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

    // Auto-open project if query parameter noteId is present
    useEffect(() => {
        if (isDataLoaded && notes.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const noteIdParam = params.get('noteId');
            if (noteIdParam && notes.some(n => n.id === noteIdParam)) {
                setSelectedNoteId(noteIdParam);
                
                // Clear the query parameter from URL to prevent reopening on reload
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [isDataLoaded, notes]);

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

    // Check if the inspiration textarea needs vertical scrollbar
    useEffect(() => {
        if (expandedCardId) {
            const checkScroll = () => {
                if (inspirationTextareaRef.current) {
                    const { scrollHeight, clientHeight } = inspirationTextareaRef.current;
                    setIsTextareaScrollable(scrollHeight > clientHeight + 5);
                }
            };
            checkScroll();
            const timer = setTimeout(checkScroll, 100);
            return () => clearTimeout(timer);
        } else {
            setIsTextareaScrollable(false);
        }
    }, [expandedCardId, inspirationQuestionIndex, inspirationAnswers, selectedNoteId]);

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
    const carouselCards = INSPIRATION_CARDS.slice(0, 8);
    const isNoteBlank = !isCanvasPreview && (
        !selectedNoteId ||
        !activeNote ||
        (activeNote.content.trim() === '' &&
            (!activeNote.phrases || activeNote.phrases.length === 0) &&
            (!activeNote.audioNotes || activeNote.audioNotes.length === 0)
        )
    );

    // Preload inspiration card background images to prevent any rendering delay
    useEffect(() => {
        carouselCards.forEach(card => {
            const img = new Image();
            img.src = card.bgImage;
        });
    }, []);

    // Auto-scroll the inspirations carousel in the empty canvas state (every 3.5 seconds)
    useEffect(() => {
        if (!isNoteBlank) return;
        const interval = setInterval(() => {
            setActiveInspirationIndex(prev => prev + 1);
        }, 3500);
        return () => clearInterval(interval);
    }, [isNoteBlank]);

    // Handle seamless wrapping after 240 slides (resets once every 14 hours of continuous viewing)
    useEffect(() => {
        if (activeInspirationIndex >= 240) {
            setTransitionEnabled(false);
            setActiveInspirationIndex(8);
            
            const timer = setTimeout(() => {
                setTransitionEnabled(true);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [activeInspirationIndex]);
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
    const getMetronomeAudioContext = () => {
        if (!metronomeAudioContextRef.current) {
            metronomeAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return metronomeAudioContextRef.current;
    };

    const playMetronomeTick = () => {
        try {
            const audioCtx = getMetronomeAudioContext();
            
            // Resume if suspended (e.g. by browser autoplay security policies)
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(console.error);
            }

            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high tick (A5)
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); // decay
            
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.05);

            lastTickTimeRef.current = Date.now(); // Record actual sound generation millisecond
        } catch (err) {
            console.error("Metronome error:", err);
        }
    };

    useEffect(() => {
        let schedulerInterval: NodeJS.Timeout | null = null;

        if (isMetronomePlaying) {
            // Only set nextTickTime to now if it wasn't playing already
            if (!metronomeWasPlayingRef.current) {
                nextTickTimeRef.current = Date.now();
                playMetronomeTick(); // Play first tick immediately
                
                const intervalMs = (60 / metronomeBpm) * 1000;
                nextTickTimeRef.current = Date.now() + intervalMs;
                metronomeWasPlayingRef.current = true;
            } else {
                // If the metronome was already playing and the BPM changes, recalculate nextTickTime
                // seamlessly relative to the last tick to ensure continuous, uninterrupted rhythm
                const intervalMs = (60 / metronomeBpm) * 1000;
                const nextTime = lastTickTimeRef.current + intervalMs;
                nextTickTimeRef.current = Math.max(Date.now(), nextTime);
            }

            schedulerInterval = setInterval(() => {
                const now = Date.now();
                if (now >= nextTickTimeRef.current) {
                    playMetronomeTick();
                    
                    const intervalMs = (60 / metronomeBpm) * 1000;
                    // If nextTickTime got severely desynced or lagged, align it
                    if (nextTickTimeRef.current + intervalMs < now) {
                        nextTickTimeRef.current = now + intervalMs;
                    } else {
                        nextTickTimeRef.current = nextTickTimeRef.current + intervalMs;
                    }
                }
            }, 15); // Run every 15ms for low latency scheduling
        } else {
            metronomeWasPlayingRef.current = false;
        }

        return () => {
            if (schedulerInterval) {
                clearInterval(schedulerInterval);
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
                content: currentVal
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
            tunerNoteHistoryRef.current = [];

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
                        // Smooth frequency: weighted average (75% old, 25% new)
                        setTunerFreq((prev) => {
                            const target = Math.round(note.frequency * 10) / 10;
                            if (prev === null) return target;
                            return Math.round((prev * 0.75 + target * 0.25) * 10) / 10;
                        });
                        
                        // Normalize note name (replace Unicode sharp sign ♯ with #)
                        const normalizedNoteName = note.name ? note.name.replace('♯', '#') : '--';
                        
                        // Stabilize note name via history mode (most frequent note of last 8 samples)
                        const history = tunerNoteHistoryRef.current;
                        history.push(normalizedNoteName);
                        if (history.length > 8) {
                            history.shift();
                        }
                        const counts: Record<string, number> = {};
                        let maxNote = normalizedNoteName;
                        let maxCount = 0;
                        for (const n of history) {
                            counts[n] = (counts[n] || 0) + 1;
                            if (counts[n] > maxCount) {
                                maxCount = counts[n];
                                maxNote = n;
                            }
                        }
                        
                        if (tunerModeAuto) {
                            setTunerNote(maxNote);
                            // Smooth cents: weighted average (70% old, 30% new)
                            setTunerCents((prev) => {
                                const target = Math.max(-50, Math.min(50, Math.round(note.cents)));
                                return Math.round(prev * 0.7 + target * 0.3);
                            });
                        } else {
                            // Manual mode: calculate cents deviation relative to the nearest octave of A (440Hz)
                            const distToA = 12 * Math.log2(note.frequency / 440);
                            const nearestOctaveA = Math.round(distToA / 12) * 12;
                            const centsValue = Math.round((distToA - nearestOctaveA) * 100);
                            setTunerNote('A');
                            setTunerCents((prev) => {
                                const target = Math.max(-50, Math.min(50, centsValue));
                                return Math.round(prev * 0.7 + target * 0.3);
                            });
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

    const handleTunerButtonClick = () => {
        if (tunerSavingState) return;

        if (!tunerActive) {
            startTunerMic();
        } else {
            if (!tunerFreq || tunerFreq === 0) {
                stopTunerMic();
                return;
            }

            setTunerSavingState('saving');
            stopTunerMic();

            setTimeout(() => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setSavedTuning({
                    note: tunerNote,
                    freq: tunerFreq,
                    cents: tunerCents,
                    timestamp: timeStr
                });
                
                setTunerSavingState('saved');

                setTimeout(() => {
                    setTunerSavingState(null);
                }, 1500);
            }, 1000);
        }
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
        
        // Rotate background colors
        const TAP_TEMPO_COLORS = ['#86BE7F', '#EDFF8E', '#ADCDC0', '#FBFFED'];
        setTapTempoBgColor(prevColor => {
            const filteredColors = TAP_TEMPO_COLORS.filter(c => c !== prevColor);
            const randomIndex = Math.floor(Math.random() * filteredColors.length);
            return filteredColors[randomIndex];
        });

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
            if (isStudioMetronomeOn) {
                if (studioState === 'playing') {
                    startStudioMetronome(studioPlayhead);
                } else if (studioState === 'recording') {
                    startStudioMetronome(0);
                }
            }
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
        if (clickedWord) {
            const clean = clickedWord.toLowerCase().replace(/[^a-z]/g, '');
            setLexiconWord(clean);
            searchRhymeLexicon(clean, lexiconMode);
        } else {
            setLexiconWord('');
            setLexiconResults([]);
        }
    }, [clickedWord]);

    useEffect(() => {
        if (lexiconWord.trim()) {
            const delayDebounce = setTimeout(() => {
                searchRhymeLexicon(lexiconWord, lexiconMode);
            }, 300);
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

    const swiperWiggleControls = useAnimation();

    const triggerSwiperWiggle = () => {
        swiperWiggleControls.start({
            x: [0, 30, -30, 0],
            rotate: [0, 3, -3, 0],
            transition: {
                duration: 2.2,
                ease: "easeInOut",
                times: [0, 0.35, 0.7, 1]
            }
        });
    };

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        let initialTimeout: NodeJS.Timeout | null = null;
        
        if (showToolsPanel && activeToolTab === 'inspiration' && !expandedCardId) {
            // Wiggle immediately when the tab is opened
            initialTimeout = setTimeout(() => {
                triggerSwiperWiggle();
            }, 300); // slight delay for smooth entry after panel transitions in
            
            // Set up recurring interval every 1 minute (60,000ms)
            intervalId = setInterval(() => {
                triggerSwiperWiggle();
            }, 60000);
        }
        
        return () => {
            if (initialTimeout) clearTimeout(initialTimeout);
            if (intervalId) clearInterval(intervalId);
        };
    }, [showToolsPanel, activeToolTab, expandedCardId]);

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
                                    content: liveText
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
        const now = new Date();
        const timestamp = now.toLocaleString();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const defaultTitle = `Project - ${dateStr} ${timeStr}`;
        
        const newNote: SongNote = {
            id: newNoteId,
            title: defaultTitle,
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

    const handleShareToCommunity = async () => {
        if (shareStatus === 'shared') {
            window.location.href = '/platform/connect';
            return;
        }

        const activeNote = notes.find(n => n.id === selectedNoteId) || null;
        if (!activeNote) return;

        const title = activeNote.title?.trim() || 'Untitled Song';
        const lyricsLines = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases.map(p => p.text).filter(t => t.trim().length > 0)
            : (activeNote.content || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lyricsLines.length === 0) {
            alert("Please write some lyrics before sharing to the community!");
            return;
        }

        setShareStatus('sharing');

        const displayName = user?.displayName || user?.email?.split('@')[0] || 'Songwriter';
        const initials = displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

        const postId = 'post-shared-' + Date.now();
        const newPost = {
            id: postId,
            author: displayName,
            avatarFallback: initials || 'SW',
            time: 'Just now',
            projectName: title,
            body: 'Shared from Create section.',
            lyrics: lyricsLines,
            attachment: activeNote.audioUrl ? {
                name: 'audio_take.mp3',
                type: 'audio/mp3',
                url: activeNote.audioUrl
            } : null,
            kudos: 0,
            likedBy: [],
            comments: [],
            reposts: 0,
            repostedBy: [],
            createdAt: Date.now()
        };

        try {
            await setDoc(doc(db, 'connect_posts', postId), newPost);
            setShareStatus('shared');
        } catch (err) {
            console.error("Error sharing post to Firestore:", err);
            // Fallback storage
            const saved = localStorage.getItem('mep-connect-posts-v4');
            let currentPosts = [];
            if (saved) {
                try { currentPosts = JSON.parse(saved); } catch (e) {}
            }
            localStorage.setItem('mep-connect-posts-v4', JSON.stringify([newPost, ...currentPosts]));
            setShareStatus('shared');
        }
    };
    const pushToUndoHistory = (
        content: string, 
        phrases: Phrase[], 
        verses: VerseGroup[], 
        audioNotes: AudioNote[],
        updates: Partial<SongNote>
    ) => {
        if (!selectedNoteId) return;

        const lastState = lastHistoryStateRef.current;
        if (!lastState) return;

        // Check if there is any actual difference
        const nextContent = updates.content !== undefined ? updates.content : content;
        const nextPhrases = updates.phrases !== undefined ? updates.phrases : phrases;
        const nextVerses = updates.verses !== undefined ? updates.verses : verses;
        const nextAudio = updates.audioNotes !== undefined ? updates.audioNotes : audioNotes;

        if (lastState.content === nextContent && 
            JSON.stringify(lastState.phrases) === JSON.stringify(nextPhrases) && 
            JSON.stringify(lastState.verses) === JSON.stringify(nextVerses) && 
            JSON.stringify(lastState.audioNotes) === JSON.stringify(nextAudio)) {
            return;
        }

        // 1. Line count change check (Enter key or deletion of a line)
        const currentLines = content.split('\n').length;
        const newLines = nextContent.split('\n').length;
        const lineCountChanged = currentLines !== newLines;

        // 2. Phrases structure change check
        let phrasesChanged = false;
        if (updates.phrases !== undefined) {
            if (phrases.length !== nextPhrases.length) {
                phrasesChanged = true;
            } else {
                for (let i = 0; i < phrases.length; i++) {
                    if (phrases[i].id !== nextPhrases[i].id || 
                        phrases[i].groupId !== nextPhrases[i].groupId) {
                        phrasesChanged = true;
                        break;
                    }
                }
            }
        }

        // 3. Verses structure change check
        const versesChanged = updates.verses !== undefined && 
            JSON.stringify(verses) !== JSON.stringify(nextVerses);

        // 4. Audio notes change check (voice note card added/deleted)
        const audioChanged = updates.audioNotes !== undefined && 
            audioNotes.length !== nextAudio.length;

        const isForcePush = updates.forceHistoryPush === true;
        const isStructuralOrLine = lineCountChanged || phrasesChanged || versesChanged || audioChanged || isForcePush;

        // If it's the first edit on this note, always push the initial state first so we can undo it
        const isFirstEdit = undoStack.length === 0;

        if (isStructuralOrLine || isFirstEdit) {
            setUndoStack(prev => {
                const newStack = [...prev, lastState];
                if (newStack.length > 50) newStack.shift();
                return newStack;
            });
            setRedoStack([]);
        }

        // Always keep the last history state reference updated with latest values
        lastHistoryStateRef.current = {
            content: nextContent,
            phrases: JSON.parse(JSON.stringify(nextPhrases)),
            verses: JSON.parse(JSON.stringify(nextVerses)),
            audioNotes: JSON.parse(JSON.stringify(nextAudio))
        };
    };

    const handleUndo = (e: React.MouseEvent) => {
        e.stopPropagation();
        const active = notes.find(n => n.id === selectedNoteId);
        if (!selectedNoteId || !active || undoStack.length === 0) return;

        const previousState = undoStack[undoStack.length - 1];
        const newUndoStack = undoStack.slice(0, -1);

        const currentState = {
            content: active.content || '',
            phrases: JSON.parse(JSON.stringify(active.phrases || [])),
            verses: JSON.parse(JSON.stringify(active.verses || [])),
            audioNotes: JSON.parse(JSON.stringify(active.audioNotes || []))
        };

        setUndoStack(newUndoStack);
        setRedoStack(prev => [...prev, currentState]);

        lastHistoryStateRef.current = previousState;

        setNotes(prev => prev.map(n => {
            if (n.id === selectedNoteId) {
                return {
                    ...n,
                    content: previousState.content,
                    phrases: previousState.phrases,
                    verses: previousState.verses,
                    audioNotes: previousState.audioNotes,
                    updatedAt: new Date().toLocaleString()
                };
            }
            return n;
        }));
    };

    const handleRedo = (e: React.MouseEvent) => {
        e.stopPropagation();
        const active = notes.find(n => n.id === selectedNoteId);
        if (!selectedNoteId || !active || redoStack.length === 0) return;

        const nextState = redoStack[redoStack.length - 1];
        const newRedoStack = redoStack.slice(0, -1);

        const currentState = {
            content: active.content || '',
            phrases: JSON.parse(JSON.stringify(active.phrases || [])),
            verses: JSON.parse(JSON.stringify(active.verses || [])),
            audioNotes: JSON.parse(JSON.stringify(active.audioNotes || []))
        };

        setRedoStack(newRedoStack);
        setUndoStack(prev => [...prev, currentState]);

        lastHistoryStateRef.current = nextState;

        setNotes(prev => prev.map(n => {
            if (n.id === selectedNoteId) {
                return {
                    ...n,
                    content: nextState.content,
                    phrases: nextState.phrases,
                    verses: nextState.verses,
                    audioNotes: nextState.audioNotes,
                    updatedAt: new Date().toLocaleString()
                };
            }
            return n;
        }));
    };

    const handleUpdateNote = (id: string, updates: Partial<SongNote>) => {
        if (isCanvasPreview) return;
        
        const currentNote = notes.find(n => n.id === id);
        if (currentNote) {
            pushToUndoHistory(
                currentNote.content || '',
                currentNote.phrases || [],
                currentNote.verses || [],
                currentNote.audioNotes || [],
                updates
            );
        }

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
                title: activeNote.title || 'Untitled Note'
            });
            
            setEditingPhraseId(nextPhraseId);
            setCursorSelectionOffset(null);
            
            // Immediately sync to database to release lock
            if (user) {
                try {
                    await updateDoc(doc(db, "projects", selectedNoteId), {
                        phrases: updatedPhrases,
                        content: newContent,
                        title: activeNote.title || 'Untitled Note',
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
            title: activeNote.title || 'Untitled Note'
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
            title: activeNote.title || 'Untitled Note'
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
                title: activeNote.title || 'Untitled Note'
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
            title: activeNote.title || 'Untitled Note'
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
            title: activeNote.title || 'Untitled Note'
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
            title: activeNote.title || 'Untitled Note'
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
            const _now = new Date();
            const _dateStr = _now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const _timeStr = _now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const _defaultTitle = `Project - ${_dateStr} ${_timeStr}`;
            const newNote: SongNote = {
                id: `n-${Date.now()}`,
                title: _defaultTitle,
                content: val,
                folderId: activeFolderIdFilter,
                updatedAt: _now.toLocaleString(),
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
                    phrases: initialPhrases
                });
                if (initialPhrases[0]) {
                    setEditingPhraseId(initialPhrases[0].id);
                }
                setIsEditing(true);
            } else {
                // Update active note normally
                handleUpdateNote(selectedNoteId, { 
                    content: val
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
            setUndoStack([]);
            setRedoStack([]);
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
            content: newContent
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
            content: newContent
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
            content: newContent
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
            verses: updatedVerses
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
            content: newContent
        });
    };

    const handleAddVerseGroup = (type: 'Verse' | 'Chorus' | 'Bridge') => {
        setIsAddMenuSticky(false);
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

    const handleRenameVerseGroup = (groupId: string, newName: string) => {
        if (!selectedNoteId || !activeNote) return;
        const currentVerses = activeNote.verses || [];
        const updatedVerses = currentVerses.map(v => {
            if (v.id === groupId) {
                return { ...v, name: newName };
            }
            return v;
        });
        handleUpdateNote(selectedNoteId, {
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

    const formatGroupName = (name?: string) => {
        if (!name) return '';
        const numWords: Record<string, string> = {
            '1': 'one',
            '2': 'two',
            '3': 'three',
            '4': 'four',
            '5': 'five',
            '6': 'six',
            '7': 'seven',
            '8': 'eight',
            '9': 'nine',
        };
        const parts = name.split(' ');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (numWords[lastPart]) {
                parts[parts.length - 1] = numWords[lastPart];
            }
        }
        const formatted = parts.join(' ').toLowerCase();
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
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
        if (!word || !clickedWord) return 50;
        
        const w = word.toLowerCase().trim();
        const orig = clickedWord.toLowerCase().trim();
        const canvasText = context.toLowerCase();
        
        // If w === orig, we are analyzing the clicked word itself inside the written context
        if (w === orig) {
            let contextScore = 65; // Base context score
            
            // Get all other lines in the context
            const lines = canvasText.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length > 1) {
                // 1. Rhyme matching with other lines' end words
                const otherEndWords = lines.map(line => {
                    const parts = line.split(/\s+/);
                    return parts[parts.length - 1]?.replace(/[^a-z]/g, '') || '';
                }).filter(ew => ew && ew !== w);
                
                let hasRhyme = false;
                for (const ew of otherEndWords) {
                    if (ew.length < 3 || w.length < 3) continue;
                    if (w.endsWith(ew.slice(-3)) || ew.endsWith(w.slice(-3))) {
                        contextScore += 18;
                        hasRhyme = true;
                        break;
                    } else if (w.endsWith(ew.slice(-2)) || ew.endsWith(w.slice(-2))) {
                        contextScore += 10;
                        hasRhyme = true;
                        break;
                    }
                }
                
                // 2. Rhythmic/Syllable balance compared to other lines
                const countSyllables = (str: string) => (str.match(/[aeiouy]{1,2}/g) || []).length || 1;
                const otherLinesSyllables = lines.map(line => {
                    if (line.includes(word)) return 0;
                    return countSyllables(line);
                }).filter(Boolean);
                
                if (otherLinesSyllables.length > 0) {
                    const avgOtherSyllables = otherLinesSyllables.reduce((a, b) => a + b, 0) / otherLinesSyllables.length;
                    const thisLineText = lines.find(l => l.includes(word)) || '';
                    const thisLineSylCount = countSyllables(thisLineText);
                    const sylDiff = Math.abs(thisLineSylCount - avgOtherSyllables);
                    
                    if (sylDiff <= 1.5) contextScore += 12; // Perfect rhythmic balance!
                    else if (sylDiff <= 3) contextScore += 6;
                    else contextScore -= 8; // Rhythm feels off!
                }
                
                // 3. Mood/Thematic harmony with the active inspiration category
                const currentInspiration = carouselCards[activeInspirationIndex % 8];
                const activeCategory = currentInspiration?.category?.toLowerCase() || '';
                const titleText = currentInspiration?.title?.toLowerCase() || '';
                
                const calmKeywords = ['peace', 'still', 'quiet', 'rest', 'breath', 'slow', 'ease', 'soft', 'dream', 'sleep', 'night', 'sky', 'wind', 'light', 'achieved', 'stillness', 'calm', 'nature'];
                const melancholyKeywords = ['sad', 'rain', 'lost', 'tears', 'dark', 'cold', 'empty', 'cry', 'alone', 'blue', 'fall', 'gone', 'grief', 'regret', 'shadow', 'fear', 'melancholy'];
                const energyKeywords = ['fire', 'run', 'loud', 'gold', 'dance', 'burn', 'wild', 'free', 'rise', 'high', 'strong', 'light', 'sun', 'bright', 'power', 'beat', 'energy'];
                
                let matchesCategory = false;
                if (activeCategory.includes('calm') || titleText.includes('stillness')) {
                    matchesCategory = calmKeywords.some(kw => w.includes(kw) || kw.includes(w));
                } else if (activeCategory.includes('melancholy') || activeCategory.includes('release') || titleText.includes('regret')) {
                    matchesCategory = melancholyKeywords.some(kw => w.includes(kw) || kw.includes(w));
                } else if (activeCategory.includes('energy') || activeCategory.includes('bold')) {
                    matchesCategory = energyKeywords.some(kw => w.includes(kw) || kw.includes(w));
                }
                
                if (matchesCategory) {
                    contextScore += 10;
                } else {
                    if (activeCategory.includes('energy') && melancholyKeywords.some(kw => w.includes(kw))) {
                        contextScore -= 10;
                    } else if (activeCategory.includes('calm') && energyKeywords.some(kw => w.includes(kw))) {
                        contextScore -= 8;
                    }
                }
            } else {
                const currentInspiration = carouselCards[activeInspirationIndex % 8];
                const activeCategory = currentInspiration?.category?.toLowerCase() || '';
                const calmKeywords = ['peace', 'still', 'quiet', 'rest', 'breath', 'slow', 'ease', 'soft', 'dream', 'sleep', 'night', 'sky', 'wind', 'light', 'achieved', 'stillness', 'calm'];
                const melancholyKeywords = ['sad', 'rain', 'lost', 'tears', 'dark', 'cold', 'empty', 'cry', 'alone', 'blue', 'fall', 'gone', 'grief', 'regret', 'shadow', 'fear'];
                const energyKeywords = ['fire', 'run', 'loud', 'gold', 'dance', 'burn', 'wild', 'free', 'rise', 'high', 'strong', 'light', 'sun', 'bright', 'power', 'beat', 'energy'];
                
                let matchesCategory = false;
                if (activeCategory.includes('calm')) matchesCategory = calmKeywords.some(kw => w.includes(kw));
                else if (activeCategory.includes('melancholy')) matchesCategory = melancholyKeywords.some(kw => w.includes(kw));
                else if (activeCategory.includes('energy')) matchesCategory = energyKeywords.some(kw => w.includes(kw));
                
                if (matchesCategory) contextScore += 15;
                else contextScore += 5;
            }
            
            return Math.max(40, Math.min(99, contextScore));
        }
        
        let score = 55; // Base score
        
        // 1. Length/Rhythm proximity
        const lenDiff = Math.abs(w.length - orig.length);
        if (lenDiff === 0) score += 10;
        else if (lenDiff === 1) score += 7;
        else if (lenDiff === 2) score += 4;
        
        // Syllable/Vowel group count proximity
        const countSyllables = (str: string) => (str.match(/[aeiouy]{1,2}/g) || []).length || 1;
        const sylDiff = Math.abs(countSyllables(w) - countSyllables(orig));
        if (sylDiff === 0) score += 12;
        else if (sylDiff === 1) score += 6;
        
        // 2. Vowel sound/Assonance match
        const getVowels = (str: string) => str.replace(/[^aeiouy]/g, '');
        if (getVowels(w) === getVowels(orig) && w !== orig) {
            score += 15; // perfect assonance!
        } else {
            // partial vowel overlap
            const v1 = new Set(getVowels(w));
            const v2 = new Set(getVowels(orig));
            let intersection = 0;
            v1.forEach(v => { if (v2.has(v)) intersection++; });
            if (intersection > 0) score += intersection * 4;
        }
        
        // 3. Lyric context analysis (rhyme matching with end words in canvas)
        const lines = canvasText.split('\n').map(l => l.trim()).filter(Boolean);
        const endWords = lines.map(line => {
            const parts = line.split(/\s+/);
            return parts[parts.length - 1]?.replace(/[^a-z]/g, '') || '';
        }).filter(Boolean);
        
        // Check if suggestion rhymes or shares endings with any end word of other lines
        let hasRhymeMatch = false;
        for (const ew of endWords) {
            if (ew === w || ew.length < 3 || w.length < 3) continue;
            // Check suffix match of last 2 or 3 characters (e.g. -ing, -ight, -y, -ear)
            if (w.endsWith(ew.slice(-3)) || ew.endsWith(w.slice(-3))) {
                score += 15;
                hasRhymeMatch = true;
                break;
            } else if (w.endsWith(ew.slice(-2)) || ew.endsWith(w.slice(-2))) {
                score += 8;
                hasRhymeMatch = true;
                break;
            }
        }
        
        // 4. Alliteration match with current phrase
        if (w[0] === orig[0] && w !== orig) {
            score += 8;
        }
        
        // Bound between 40 and 99
        return Math.max(40, Math.min(99, score));
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
            
            const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
                ? activeNote.phrases
                : syncPhrasesWithContent(activeNote.content);

            let tempIndex = 0;
            const updatedPhrases = currentPhrases.map(phrase => {
                while (tempIndex < wordsList.length && /^\s+$/.test(wordsList[tempIndex])) {
                    tempIndex++;
                }
                const phraseTokens = phrase.text.split(/(\s+)/);
                const startIdx = tempIndex;
                const endIdx = tempIndex + phraseTokens.length;
                tempIndex += phraseTokens.length;

                if (clickedTokenIndex >= startIdx && clickedTokenIndex < endIdx) {
                    const newPhraseText = wordsList.slice(startIdx, endIdx).join('');
                    return { ...phrase, text: newPhraseText };
                }
                return phrase;
            });

            handleUpdateNote(selectedNoteId, {
                phrases: updatedPhrases,
                content: newContent,
                title: activeNote.title || 'Untitled Note',
                forceHistoryPush: true
            });
        }
        setClickedWord(null);
        setClickedTokenIndex(null);
        setPopoverPosition(null);
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

    // --- DEMO STUDIO V2 AUDIO ENGINE & DAW MIXER ---
    const startStudioMetronome = (startOffset = 0) => {
        const audioCtx = getStudioAudioContext();
        if (studioMetronomeIntervalRef.current) {
            clearInterval(studioMetronomeIntervalRef.current);
        }

        const bpm = metronomeBpm || 120;
        const interval = 60 / bpm; // duration of one beat in seconds
        
        let nextTickTime = audioCtx.currentTime;
        
        if (startOffset > 0) {
            const beatsElapsed = startOffset / interval;
            const nextBeatIndex = Math.ceil(beatsElapsed);
            nextTickTime = audioCtx.currentTime + (nextBeatIndex * interval - startOffset);
        }

        const scheduleTick = () => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.frequency.setValueAtTime(880, nextTickTime); // tick frequency
            gain.gain.setValueAtTime(0.2, nextTickTime);
            gain.gain.exponentialRampToValueAtTime(0.001, nextTickTime + 0.05);

            osc.start(nextTickTime);
            osc.stop(nextTickTime + 0.05);
            
            nextTickTime += interval;
        };

        if (nextTickTime <= audioCtx.currentTime + 0.1) {
            scheduleTick();
        }

        studioMetronomeIntervalRef.current = window.setInterval(() => {
            while (nextTickTime < audioCtx.currentTime + 0.1) {
                scheduleTick();
            }
        }, 25);
    };

    const startStudioPlayback = async (startOffset = 0) => {
        try {
            const audioCtx = getStudioAudioContext();
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            stopAllStudioAudio();

            let maxDuration = 0;
            studioTracks.forEach(t => {
                if (t.audioBuffer) {
                    maxDuration = Math.max(maxDuration, t.audioBuffer.duration);
                }
            });

            if (maxDuration === 0) return;

            let startPlayheadVal = startOffset;
            if (maxDuration > 0 && startOffset >= maxDuration - 0.1) {
                startPlayheadVal = 0;
                setStudioPlayhead(0);
            }

            const startTime = audioCtx.currentTime;
            const limitVal = maxDuration;
            const reverbNode = getSharedReverbNode(audioCtx);

            studioTracks.forEach(track => {
                if (!track.audioBuffer) return;

                if (startPlayheadVal < track.audioBuffer.duration) {
                    const source = audioCtx.createBufferSource();
                    source.buffer = track.audioBuffer;

                    const eqNode = audioCtx.createBiquadFilter();
                    eqNode.type = 'highshelf';
                    eqNode.frequency.value = 3000;
                    eqNode.gain.value = track.eq;

                    const compNode = audioCtx.createDynamicsCompressor();
                    compNode.threshold.value = -24;
                    compNode.knee.value = 30;
                    compNode.ratio.value = track.compressor ? 12 : 1;
                    compNode.attack.value = 0.003;
                    compNode.release.value = 0.25;

                    const panNode = audioCtx.createStereoPanner();
                    panNode.pan.value = track.pan / 50;

                    const gainNode = audioCtx.createGain();
                    gainNode.gain.value = track.muted ? 0 : track.volume / 100;

                    const reverbGainNode = audioCtx.createGain();
                    reverbGainNode.gain.value = track.muted ? 0 : track.reverb / 100;

                    source.connect(eqNode);
                    eqNode.connect(compNode);
                    compNode.connect(panNode);
                    panNode.connect(gainNode);
                    gainNode.connect(audioCtx.destination);

                    compNode.connect(reverbGainNode);
                    reverbGainNode.connect(reverbNode);

                    source.start(0, startPlayheadVal);
                    
                    studioActiveSourcesRef.current[track.id] = {
                        source,
                        gainNode,
                        panNode,
                        eqNode,
                        compNode,
                        reverbGainNode
                    };

                    source.onended = () => {
                        const stillPlaying = Object.keys(studioActiveSourcesRef.current).some(tid => {
                            const node = studioActiveSourcesRef.current[parseInt(tid)];
                            return node && node.source && node.source.buffer && 
                                   (audioCtx.currentTime - startTime + startPlayheadVal < node.source.buffer.duration);
                        });
                        if (!stillPlaying) {
                            stopAllStudioAudio();
                            setStudioState('idle');
                            setStudioPlayhead(0);
                        }
                    };
                }
            });

            studioRecordStartTimeRef.current = Date.now() - (startPlayheadVal * 1000);
            studioPlayheadIntervalRef.current = window.setInterval(() => {
                const elapsed = (Date.now() - studioRecordStartTimeRef.current) / 1000;
                if (elapsed >= limitVal) {
                    stopAllStudioAudio();
                    setStudioState('idle');
                    setStudioPlayhead(0);
                } else {
                    setStudioPlayhead(elapsed);
                }
            }, 50);

            if (isStudioMetronomeOn) {
                startStudioMetronome(startPlayheadVal);
            }

            setStudioState('playing');
        } catch (err) {
            console.error("Failed to start studio playback:", err);
            setStudioState('idle');
        }
    };

    const startStudioRecording = async () => {
        const armedTrack = studioTracks.find(t => t.id === activeRecordingTrackId);
        if (armedTrack && (armedTrack.audioBuffer || armedTrack.url)) {
            setConfirmOverwriteStudioRecord({
                isOpen: true,
                trackName: armedTrack.name,
                onConfirm: () => {
                    setConfirmOverwriteStudioRecord({ isOpen: false, trackName: '', onConfirm: null });
                    proceedWithStudioRecording();
                }
            });
            return;
        }

        await proceedWithStudioRecording();
    };

    const proceedWithStudioRecording = async () => {
        try {
            const audioCtx = getStudioAudioContext();
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            stopAllStudioAudio();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Microphone input (monitoring disabled to keep recording completely silent)
            const monitorNode = audioCtx.createMediaStreamSource(stream);
            studioMonitorNodeRef.current = monitorNode;

            const mediaRecorder = new MediaRecorder(stream);
            studioMediaRecorderRef.current = mediaRecorder;
            studioRecordedChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    studioRecordedChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                try {
                    const blob = new Blob(studioRecordedChunksRef.current, { type: 'audio/webm' });
                    const arrayBuffer = await blob.arrayBuffer();
                    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    const localUrl = URL.createObjectURL(blob);

                    setStudioTracks(prev => {
                        const updated = prev.map(t => {
                            if (t.id === activeRecordingTrackId) {
                                return {
                                    ...t,
                                    audioBuffer: decodedBuffer,
                                    url: localUrl
                                };
                            }
                            return t;
                        });
                        
                        let maxDur = 0;
                        updated.forEach(t => {
                            if (t.audioBuffer) {
                                maxDur = Math.max(maxDur, t.audioBuffer.duration);
                            }
                        });
                        setStudioDuration(maxDur);

                        return updated;
                    });
                } catch (e) {
                    console.error("Error decoding recorded audio:", e);
                } finally {
                    stream.getTracks().forEach(track => track.stop());
                }
            };
            // Start playback for all other tracks starting from zero
            studioTracks.forEach(track => {
                if (!track.audioBuffer || track.id === activeRecordingTrackId) return;

                const source = audioCtx.createBufferSource();
                source.buffer = track.audioBuffer;

                const eqNode = audioCtx.createBiquadFilter();
                eqNode.type = 'highshelf';
                eqNode.frequency.value = 3000;
                eqNode.gain.value = track.eq;

                const compNode = audioCtx.createDynamicsCompressor();
                compNode.threshold.value = -24;
                compNode.knee.value = 30;
                compNode.ratio.value = track.compressor ? 12 : 1;
                compNode.attack.value = 0.003;
                compNode.release.value = 0.25;

                const panNode = audioCtx.createStereoPanner();
                panNode.pan.value = track.pan / 50;

                const gainNode = audioCtx.createGain();
                gainNode.gain.value = track.muted ? 0 : track.volume / 100;

                const reverbGainNode = audioCtx.createGain();
                reverbGainNode.gain.value = track.muted ? 0 : track.reverb / 100;

                const reverbNode = getSharedReverbNode(audioCtx);

                source.connect(eqNode);
                eqNode.connect(compNode);
                compNode.connect(panNode);
                panNode.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                compNode.connect(reverbGainNode);
                reverbGainNode.connect(reverbNode);

                source.start(0, 0);
                
                studioActiveSourcesRef.current[track.id] = {
                    source,
                    gainNode,
                    panNode,
                    eqNode,
                    compNode,
                    reverbGainNode
                };
            });

            if (isStudioMetronomeOn) {
                startStudioMetronome(0);
            }

            mediaRecorder.start();
            studioRecordStartTimeRef.current = Date.now();
            setStudioState('recording');
            setStudioPlayhead(0);

            studioPlayheadIntervalRef.current = window.setInterval(() => {
                const elapsed = (Date.now() - studioRecordStartTimeRef.current) / 1000;
                setStudioPlayhead(elapsed);
            }, 50);

        } catch (err) {
            console.error("Microphone access denied or failed to record:", err);
            setStudioState('idle');
        }
    };

    const stopStudioRecording = () => {
        if (studioMediaRecorderRef.current && studioMediaRecorderRef.current.state !== 'inactive') {
            studioMediaRecorderRef.current.stop();
        }
        stopAllStudioAudio();
        setStudioState('idle');
    };

    const pauseStudioPlayback = () => {
        stopAllStudioAudio();
        setStudioState('paused');
    };

    const stopStudioPlaybackAndReset = () => {
        stopAllStudioAudio();
        setStudioState('idle');
        setStudioPlayhead(0);
    };

    const handleUpdateTrackParam = (
        trackId: number, 
        param: 'volume' | 'pan' | 'eq' | 'compressor' | 'reverb' | 'name', 
        val: any
    ) => {
        setStudioTracks(prev => prev.map(t => {
            if (t.id === trackId) {
                return { ...t, [param]: val };
            }
            return t;
        }));

        const activeNodes = studioActiveSourcesRef.current[trackId];
        if (activeNodes) {
            try {
                const audioCtx = getStudioAudioContext();
                const time = audioCtx.currentTime;
                
                if (param === 'volume') {
                    activeNodes.gainNode.gain.setValueAtTime(val / 100, time);
                } else if (param === 'pan') {
                    activeNodes.panNode.pan.setValueAtTime(val / 50, time);
                } else if (param === 'eq') {
                    activeNodes.eqNode.gain.setValueAtTime(val, time);
                } else if (param === 'compressor') {
                    activeNodes.compNode.ratio.setValueAtTime(val ? 12 : 1, time);
                } else if (param === 'reverb') {
                    activeNodes.reverbGainNode.gain.setValueAtTime(val / 100, time);
                }
            } catch (err) {
                console.error("Error adjusting parameter in real-time:", err);
            }
        }
    };

    const bufferToWav = (buffer: AudioBuffer): Blob => {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const bufferArray = new ArrayBuffer(length);
        const view = new DataView(bufferArray);
        const channels: Float32Array[] = [];
        let pos = 0;

        const setUint16 = (data: number) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };

        const setUint32 = (data: number) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8);
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16);
        setUint16(1);
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * numOfChan * 2);
        setUint16(numOfChan * 2);
        setUint16(16);

        setUint32(0x61746164); // "data" chunk
        setUint32(length - pos - 4);

        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        let offset = 0;
        while (pos < length) {
            for (let i = 0; i < numOfChan; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([bufferArray], { type: 'audio/wav' });
    };

    const renderOfflineMixdown = async (): Promise<AudioBuffer | null> => {
        let maxDuration = 0;
        studioTracks.forEach(t => {
            if (t.audioBuffer) {
                maxDuration = Math.max(maxDuration, t.audioBuffer.duration);
            }
        });

        if (maxDuration === 0) return null;

        const sampleRate = 44100;
        const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
            2,
            Math.ceil(sampleRate * maxDuration),
            sampleRate
        );

        const impulseBuffer = offlineCtx.createBuffer(2, Math.ceil(sampleRate * 1.5), sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulseBuffer.getChannelData(channel);
            for (let i = 0; i < impulseBuffer.length; i++) {
                const decay = Math.exp(-i / (sampleRate * 0.4));
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        const offlineReverbNode = offlineCtx.createConvolver();
        offlineReverbNode.buffer = impulseBuffer;
        offlineReverbNode.connect(offlineCtx.destination);

        studioTracks.forEach(track => {
            if (!track.audioBuffer) return;

            const source = offlineCtx.createBufferSource();
            source.buffer = track.audioBuffer;

            const eqNode = offlineCtx.createBiquadFilter();
            eqNode.type = 'highshelf';
            eqNode.frequency.value = 3000;
            eqNode.gain.value = track.eq;

            const compNode = offlineCtx.createDynamicsCompressor();
            compNode.threshold.value = -24;
            compNode.knee.value = 30;
            compNode.ratio.value = track.compressor ? 12 : 1;
            compNode.attack.value = 0.003;
            compNode.release.value = 0.25;

            const panNode = offlineCtx.createStereoPanner();
            panNode.pan.value = track.pan / 50;

            const gainNode = offlineCtx.createGain();
            gainNode.gain.value = track.muted ? 0 : track.volume / 100;

            const reverbGainNode = offlineCtx.createGain();
            reverbGainNode.gain.value = track.muted ? 0 : track.reverb / 100;

            source.connect(eqNode);
            eqNode.connect(compNode);
            compNode.connect(panNode);
            panNode.connect(gainNode);
            gainNode.connect(offlineCtx.destination);

            compNode.connect(reverbGainNode);
            reverbGainNode.connect(offlineReverbNode);

            source.start(0);
        });

        return offlineCtx.startRendering();
    };

    const handleExportStudioMix = async () => {
        try {
            const renderedBuffer = await renderOfflineMixdown();
            if (!renderedBuffer) {
                alert("Please record some track audio first!");
                return;
            }

            const wavBlob = bufferToWav(renderedBuffer);
            const downloadUrl = URL.createObjectURL(wavBlob);

            const active = notes.find(n => n.id === selectedNoteId);
            const title = active ? active.title : 'Project';
            const fileName = `${title.replace(/\s+/g, '-').toLowerCase()}-studio-mix.wav`;

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Export mixdown failed:", err);
            alert("Failed to export studio mixdown.");
        }
    };

    const handleSaveStudioMixToProject = async () => {
        if (!selectedNoteId || !activeNote) return;

        try {
            const renderedBuffer = await renderOfflineMixdown();
            if (!renderedBuffer) {
                alert("Please record some track audio first!");
                return;
            }

            const wavBlob = bufferToWav(renderedBuffer);
            const localUrl = URL.createObjectURL(wavBlob);
            const recId = `studio-mix-${Date.now()}`;
            const durationSecs = renderedBuffer.duration;

            const newAudioNote: AudioNote = {
                id: recId,
                url: localUrl,
                title: 'Demo Studio Mixdown',
                duration: durationSecs,
                groupId: null,
                phraseId: null,
                createdAt: Date.now()
            };

            const existingAudioNotes = activeNote.audioNotes || [];
            const updatedAudioNotes = [...existingAudioNotes, newAudioNote];

            handleUpdateNote(selectedNoteId, {
                audioNotes: updatedAudioNotes,
                audioUrl: localUrl
            });

            alert("Mixdown saved to project voice notes successfully!");

            if (user) {
                try {
                    const fileRef = storageRef(storage, `users/${user.uid}/recordings/${selectedNoteId}_RecId_${recId}.wav`);
                    await uploadBytes(fileRef, wavBlob);
                    const downloadUrl = await getDownloadURL(fileRef);

                    setNotes(prev => prev.map(n => {
                        if (n.id === selectedNoteId) {
                            const cloudAudioNotes = (n.audioNotes || []).map(an => {
                                if (an.id === recId) {
                                    return { ...an, url: downloadUrl };
                                }
                                return an;
                            });
                            const latest = cloudAudioNotes[cloudAudioNotes.length - 1];
                            
                            const updatedNote = {
                                ...n,
                                audioNotes: cloudAudioNotes,
                                audioUrl: latest ? latest.url : n.audioUrl
                            };
                            
                            if (user) {
                                const docRef = doc(db, "projects", selectedNoteId);
                                setDoc(docRef, {
                                    audioNotes: cloudAudioNotes,
                                    audioUrl: latest ? latest.url : n.audioUrl
                                }, { merge: true }).catch(console.error);
                            }
                            return updatedNote;
                        }
                        return n;
                    }));
                } catch (uploadErr) {
                    console.error("Cloud upload of mixdown failed:", uploadErr);
                }
            }
        } catch (err) {
            console.error("Save mixdown to project failed:", err);
            alert("Failed to save mixdown to project.");
        }
    };

    const handleStartEditingName = (trackId: number, currentName: string) => {
        setEditingTrackNameId(trackId);
        setTrackNameInputText(currentName);
    };

    const handleCommitTrackName = (trackId: number) => {
        const trimmed = trackNameInputText.trim();
        if (trimmed) {
            handleUpdateTrackParam(trackId, 'name', trimmed);
        }
        setEditingTrackNameId(null);
    };

    const handleClearTrack = (trackId: number) => {
        if (!confirm("Are you sure you want to delete this track's recording?")) return;
        
        stopAllStudioAudio();
        setStudioState('idle');
        setStudioPlayhead(0);

        setStudioTracks(prev => {
            const updated = prev.map(t => {
                if (t.id === trackId) {
                    if (t.url) URL.revokeObjectURL(t.url);
                    return { ...t, audioBuffer: null, url: null };
                }
                return t;
            });
            
            let maxDur = 0;
            updated.forEach(t => {
                if (t.audioBuffer) {
                    maxDur = Math.max(maxDur, t.audioBuffer.duration);
                }
            });
            setStudioDuration(maxDur);

            return updated;
        });
    };

    const handleStudioTrackDragStart = (index: number) => {
        setDraggedTrackIndex(index);
    };

    const handleStudioTrackDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedTrackIndex === null || draggedTrackIndex === index) return;
        
        setStudioTracks(prev => {
            const cleanPrev = prev.filter(Boolean);
            if (draggedTrackIndex < 0 || draggedTrackIndex >= cleanPrev.length || index < 0 || index >= cleanPrev.length) {
                return cleanPrev;
            }
            const updated = [...cleanPrev];
            const [draggedItem] = updated.splice(draggedTrackIndex, 1);
            if (!draggedItem) return cleanPrev;
            updated.splice(index, 0, draggedItem);
            return updated;
        });
        setDraggedTrackIndex(index);
    };

    const handleStudioTrackDragEnd = () => {
        setDraggedTrackIndex(null);
    };

    const handleAddTrack = () => {
        if (studioTracks.length >= 4) return;
        const nextId = Date.now();
        const newTrack: StudioTrack = {
            id: nextId,
            name: 'Guitar',
            type: 'guitar',
            volume: 70,
            pan: -15,
            eq: 0,
            compressor: true,
            reverb: 25,
            audioBuffer: null,
            url: null
        };
        setStudioTracks(prev => [...prev, newTrack]);
        setActiveRecordingTrackId(nextId);
    };

    const handleToggleTrackMute = (trackId: number) => {
        setStudioTracks(prev => prev.filter(Boolean).map(t => {
            if (t.id === trackId) {
                const newMuted = !t.muted;
                const activeNodes = studioActiveSourcesRef.current[trackId];
                if (activeNodes) {
                    try {
                        const audioCtx = getStudioAudioContext();
                        const time = audioCtx.currentTime;
                        activeNodes.gainNode.gain.setValueAtTime(newMuted ? 0 : t.volume / 100, time);
                        activeNodes.reverbGainNode.gain.setValueAtTime(newMuted ? 0 : t.reverb / 100, time);
                    } catch (err) {
                        console.error("Error toggling mute:", err);
                    }
                }
                return { ...t, muted: newMuted };
            }
            return t;
        }));
    };

    const handleToggleStudioMetronome = () => {
        const newVal = !isStudioMetronomeOn;
        setIsStudioMetronomeOn(newVal);
        if (newVal) {
            if (studioState === 'playing') {
                startStudioMetronome(studioPlayhead);
            } else if (studioState === 'recording') {
                startStudioMetronome(0);
            }
        } else {
            if (studioMetronomeIntervalRef.current) {
                clearInterval(studioMetronomeIntervalRef.current);
                studioMetronomeIntervalRef.current = null;
            }
        }
    };

    const handleDeleteTrack = (trackId: number) => {
        if (!confirm("Are you sure you want to delete this track?")) return;

        stopAllStudioAudio();
        setStudioState('idle');
        setStudioPlayhead(0);

        setStudioTracks(prev => {
            const updated = prev.filter(t => t.id !== trackId);
            
            let maxDur = 0;
            updated.forEach(t => {
                if (t.audioBuffer) {
                    maxDur = Math.max(maxDur, t.audioBuffer.duration);
                }
            });
            setStudioDuration(maxDur);

            return updated;
        });
        setActiveTrackMenuId(null);
    };

    const handleSelectInstrumentType = (trackId: number, type: 'guitar' | 'piano' | 'drums' | 'vocals' | 'synth' | 'custom') => {
        const typeLabels = {
            guitar: 'Guitar',
            piano: 'Piano',
            drums: 'Drums',
            vocals: 'Vocals',
            synth: 'Synth',
            custom: 'Custom'
        };
        
        const instrumentDefaults = {
            guitar: { volume: 70, pan: -15, eq: 0, reverb: 25, compressor: true },
            piano: { volume: 65, pan: 15, eq: 0, reverb: 35, compressor: false },
            vocals: { volume: 85, pan: 0, eq: 0, reverb: 30, compressor: true },
            drums: { volume: 80, pan: 0, eq: 0, reverb: 15, compressor: true },
            synth: { volume: 60, pan: 0, eq: 0, reverb: 40, compressor: false },
            custom: { volume: 80, pan: 0, eq: 0, reverb: 0, compressor: false }
        };
        
        const defaults = instrumentDefaults[type];
        
        setStudioTracks(prev => prev.map(t => {
            if (t.id === trackId) {
                const isDefaultName = ['Guitar', 'Piano', 'Drums', 'Vocals', 'Synth', 'Track 1', 'Track 2', 'Track 3', 'Track 4', 'Guitar 2', 'Guitar 3', 'Custom'].includes(t.name);
                return {
                    ...t,
                    type,
                    name: isDefaultName ? typeLabels[type] : t.name,
                    volume: defaults.volume,
                    pan: defaults.pan,
                    eq: defaults.eq,
                    reverb: defaults.reverb,
                    compressor: defaults.compressor
                };
            }
            return t;
        }));

        // Update active audio nodes parameters in real-time
        const activeNodes = studioActiveSourcesRef.current[trackId];
        if (activeNodes) {
            try {
                const audioCtx = getStudioAudioContext();
                const time = audioCtx.currentTime;
                activeNodes.gainNode.gain.setValueAtTime(defaults.volume / 100, time);
                activeNodes.panNode.pan.setValueAtTime(defaults.pan / 50, time);
                activeNodes.eqNode.gain.setValueAtTime(defaults.eq, time);
                activeNodes.compNode.ratio.setValueAtTime(defaults.compressor ? 12 : 1, time);
                activeNodes.reverbGainNode.gain.setValueAtTime(defaults.reverb / 100, time);
            } catch (err) {
                console.error("Error adjusting parameters on instrument change:", err);
            }
        }
        
        setActiveTrackDropdownId(null);
    };

    const studioStateRef = useRef(studioState);
    const studioPlayheadRef = useRef(studioPlayhead);
    useEffect(() => {
        studioStateRef.current = studioState;
    }, [studioState]);
    useEffect(() => {
        studioPlayheadRef.current = studioPlayhead;
    }, [studioPlayhead]);

    const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return; // only left click
        
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        
        // Disable text selection during drag
        document.body.style.userSelect = 'none';
        
        const scrub = (clientX: number) => {
            const clickX = clientX - rect.left;
            const clickPercent = clickX / rect.width;
            const boundedPercent = Math.max(0, Math.min(1, clickPercent));
            const limit = studioDuration > 0 ? studioDuration : 3;
            const targetTime = boundedPercent * limit;
            setStudioPlayhead(targetTime);
            return targetTime;
        };

        const targetTime = scrub(e.clientX);
        
        // If playing, we temporarily pause active playing audio sources during drag
        const wasPlaying = studioStateRef.current === 'playing';
        if (wasPlaying) {
            stopAllStudioAudio();
        }
        
        container.setPointerCapture(e.pointerId);
        
        let lastTime = targetTime;
        
        const handlePointerMove = (moveEv: PointerEvent) => {
            lastTime = scrub(moveEv.clientX);
        };
        
        const handlePointerUp = (upEv: PointerEvent) => {
            document.body.style.userSelect = '';
            try {
                container.releasePointerCapture(upEv.pointerId);
            } catch (err) {}
            
            container.removeEventListener('pointermove', handlePointerMove);
            container.removeEventListener('pointerup', handlePointerUp);
            container.removeEventListener('pointercancel', handlePointerUp);
            
            // Resume playback if it was playing before drag started
            if (wasPlaying) {
                setStudioState('playing');
                startStudioPlayback(lastTime);
            } else {
                setStudioState('paused');
                setStudioPlayhead(lastTime);
            }
        };
        
        container.addEventListener('pointermove', handlePointerMove);
        container.addEventListener('pointerup', handlePointerUp);
        container.addEventListener('pointercancel', handlePointerUp);
    };

    const handlePlayheadLinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return; // only left click
        
        const overlay = document.getElementById('studio-playhead-overlay');
        if (!overlay) return;
        
        const rect = overlay.getBoundingClientRect();
        
        // Disable text selection during drag
        document.body.style.userSelect = 'none';
        
        const scrub = (clientX: number) => {
            const clickX = clientX - rect.left;
            const clickPercent = clickX / rect.width;
            const boundedPercent = Math.max(0, Math.min(1, clickPercent));
            const limit = studioDuration > 0 ? studioDuration : 3;
            const targetTime = boundedPercent * limit;
            setStudioPlayhead(targetTime);
            return targetTime;
        };

        const targetTime = scrub(e.clientX);
        
        // If playing, we temporarily pause active playing audio sources during drag
        const wasPlaying = studioStateRef.current === 'playing';
        if (wasPlaying) {
            stopAllStudioAudio();
        }
        
        // Capture pointer events on the target element
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        
        let lastTime = targetTime;
        
        const handlePointerMove = (moveEv: PointerEvent) => {
            lastTime = scrub(moveEv.clientX);
        };
        
        const handlePointerUp = (upEv: PointerEvent) => {
            document.body.style.userSelect = '';
            try {
                target.releasePointerCapture(upEv.pointerId);
            } catch (err) {}
            
            target.removeEventListener('pointermove', handlePointerMove);
            target.removeEventListener('pointerup', handlePointerUp);
            target.removeEventListener('pointercancel', handlePointerUp);
            
            // Resume playback if it was playing before drag started
            if (wasPlaying) {
                setStudioState('playing');
                startStudioPlayback(lastTime);
            } else {
                setStudioState('paused');
                setStudioPlayhead(lastTime);
            }
        };
        
        target.addEventListener('pointermove', handlePointerMove);
        target.addEventListener('pointerup', handlePointerUp);
        target.addEventListener('pointercancel', handlePointerUp);
    };

    const StudioKnob = ({ 
        value, 
        min, 
        max, 
        defaultValue, 
        onChange 
    }: { 
        value: number; 
        min: number; 
        max: number; 
        defaultValue: number; 
        onChange: (val: number) => void;
    }) => {
        const handleMouseDown = (e: React.MouseEvent) => {
            e.preventDefault();
            const startY = e.clientY;
            const startValue = value;
            const range = max - min;
            const pixelsPerUnit = 2.5;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaY = startY - moveEvent.clientY;
                const deltaValue = (deltaY / pixelsPerUnit) * (range / 100);
                const newValue = Math.max(min, Math.min(max, startValue + deltaValue));
                onChange(newValue);
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        const percent = (value - min) / (max - min);
        const angle = -135 + percent * 270;

        return (
            <div 
                onMouseDown={handleMouseDown}
                onDoubleClick={() => onChange(defaultValue)}
                className="relative w-11 h-11 rounded-full bg-white hover:bg-stone-50 active:scale-95 transition-all shadow-[0_2.5px_6px_rgba(0,0,0,0.07)] cursor-ns-resize flex items-center justify-center border-2 border-stone-200/80"
                title="Drag vertically to adjust. Double click to reset."
            >
                <div 
                    className="absolute w-[1.5px] h-[16px] bg-stone-600 rounded-full origin-bottom"
                    style={{ 
                        left: 'calc(50% - 0.75px)',
                        bottom: '50%',
                        transform: `rotate(${angle}deg)`
                    }}
                />
            </div>
        );
    };

    const getRulerItems = (limit: number) => {
        const items: { type: 'label' | 'tick'; value?: string }[] = [];
        const formatTime = (secs: number) => {
            const m = Math.floor(secs / 60);
            const s = Math.floor(secs % 60);
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        if (limit <= 5) {
            const intLimit = Math.floor(limit);
            const totalSlots = intLimit * 4 + 1;
            for (let i = 0; i < totalSlots; i++) {
                if (i % 4 === 0) {
                    const sec = i / 4;
                    items.push({ type: 'label', value: formatTime(sec) });
                } else {
                    items.push({ type: 'tick' });
                }
            }
        } else if (limit <= 10) {
            const intLimit = Math.floor(limit);
            const totalSlots = intLimit * 2 + 1;
            for (let i = 0; i < totalSlots; i++) {
                if (i % 2 === 0) {
                    const sec = i / 2;
                    items.push({ type: 'label', value: formatTime(sec) });
                } else {
                    items.push({ type: 'tick' });
                }
            }
        } else {
            const step = limit / 4;
            for (let i = 0; i < 5; i++) {
                items.push({ type: 'label', value: formatTime(step * i) });
                if (i < 4) {
                    items.push({ type: 'tick' });
                    items.push({ type: 'tick' });
                    items.push({ type: 'tick' });
                }
            }
        }
        return items;
    };

    const renderDemoStudio = () => {
        const limit = studioState === 'recording'
            ? Math.max(studioDuration > 0 ? studioDuration : 3, studioPlayhead)
            : (studioDuration > 0 ? studioDuration : 3);
        const playheadPercent = limit > 0 ? (studioPlayhead / limit) * 100 : 0;
        const rulerItems = getRulerItems(limit);

        const instrumentImages = {
            guitar: '/assets/studio_guitar.png',
            piano: '/assets/studio_piano.png',
            drums: '/assets/studio_drums.png',
            vocals: '/assets/studio_vocals.png',
            synth: '/assets/studio_synth.png',
            custom: '/assets/studio_custom.png'
        };

        const instrumentLabels = {
            guitar: 'Guitar',
            piano: 'Piano',
            drums: 'Drums',
            vocals: 'Vocals',
            synth: 'Synth',
            custom: 'Custom'
        };

        return (
            <div className="flex flex-col gap-6 select-none animate-in fade-in zoom-in-95 duration-250 w-full text-left relative">
                {/* Unified Sequencer Panel Grid Area */}
                <div className="flex flex-col w-full relative gap-1.5">
                    {/* Headers Row */}
                    <div className="hidden lg:flex items-center gap-3 select-none h-8 mb-[-4px] px-4">
                        <div className="w-5 shrink-0" /> {/* reorder handle gap */}
                        <div className="w-32 sm:w-36 md:w-40 lg:w-44 shrink-0" /> {/* track selector gap */}
                        
                        {/* Controllers Column Header with Labels & Vertical Lines */}
                        <div className="w-[280px] shrink-0 flex justify-between px-2 relative select-none h-full items-end">
                            {/* VOL */}
                            <div className="flex flex-col items-center w-11 shrink-0 justify-end h-full">
                                <span className="text-[9px] font-bold text-stone-400/60 tracking-wider">VOL</span>
                                <div className="w-[1.5px] h-3.5 bg-stone-200 mt-1" />
                            </div>
                            {/* PAN */}
                            <div className="flex flex-col items-center w-11 shrink-0 justify-end h-full">
                                <span className="text-[9px] font-bold text-stone-400/60 tracking-wider">PAN</span>
                                <div className="w-[1.5px] h-3.5 bg-stone-200 mt-1" />
                            </div>
                            {/* EQ */}
                            <div className="flex flex-col items-center w-11 shrink-0 justify-end h-full">
                                <span className="text-[9px] font-bold text-stone-400/60 tracking-wider">EQ</span>
                                <div className="w-[1.5px] h-3.5 bg-stone-200 mt-1" />
                            </div>
                            {/* REV */}
                            <div className="flex flex-col items-center w-11 shrink-0 justify-end h-full">
                                <span className="text-[9px] font-bold text-stone-400/60 tracking-wider">REV</span>
                                <div className="w-[1.5px] h-3.5 bg-stone-200 mt-1" />
                            </div>
                            {/* COMP */}
                            <div className="flex flex-col items-center w-11 shrink-0 justify-end h-full">
                                <span className="text-[9px] font-bold text-stone-400/60 tracking-wider">COMP</span>
                                <div className="w-[1.5px] h-3.5 bg-stone-200 mt-1" />
                            </div>
                        </div>
                        
                        <div className="flex-grow" /> {/* timeline gap */}
                        <div className="w-8 shrink-0" /> {/* options menu gap */}
                    </div>

                    {/* Sequencer Track List Container */}
                    <div className="flex flex-col gap-1 w-full relative">
                        {studioTracks.filter(Boolean).map((track, idx) => {
                            const isArmed = activeRecordingTrackId === track.id;
                            const isThisTrackRecording = studioState === 'recording' && isArmed;

                            return (
                                <div 
                                    key={track.id}
                                    draggable
                                    onDragStart={() => handleStudioTrackDragStart(idx)}
                                    onDragOver={(e) => handleStudioTrackDragOver(e, idx)}
                                    onDragEnd={handleStudioTrackDragEnd}
                                    onClick={() => {
                                        setActiveRecordingTrackId(track.id);
                                        setExpandedTrackId(expandedTrackId === track.id ? null : track.id);
                                    }}
                                    className={`studio-track-row flex items-center gap-3 w-full select-none border-b border-stone-300/40 last:border-0 relative transition-all duration-200 group cursor-pointer ${
                                        expandedTrackId === track.id ? 'h-[92px] py-2' : 'h-15 sm:h-16 py-1'
                                    } px-4 ${
                                        isArmed 
                                            ? 'bg-stone-200/50 hover:bg-stone-200/60' 
                                            : 'bg-stone-50/70 hover:bg-stone-200/35'
                                    }`}
                                >
                                    {/* Drag Handle */}
                                    <div 
                                        className="w-5 flex items-center justify-center text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing shrink-0 transition-all opacity-0 group-hover:opacity-100 duration-150"
                                        title="Drag to reorder"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4.5 h-4.5">
                                            <circle cx="9" cy="5" r="1.25" fill="currentColor" />
                                            <circle cx="9" cy="12" r="1.25" fill="currentColor" />
                                            <circle cx="9" cy="19" r="1.25" fill="currentColor" />
                                            <circle cx="15" cy="5" r="1.25" fill="currentColor" />
                                            <circle cx="15" cy="12" r="1.25" fill="currentColor" />
                                            <circle cx="15" cy="19" r="1.25" fill="currentColor" />
                                        </svg>
                                    </div>

                                    {/* Selector Capsule */}
                                    <div className="relative">
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveTrackDropdownId(activeTrackDropdownId === track.id ? null : track.id);
                                            }}
                                            className="bg-[#F9F8F6] hover:bg-[#F3F1ED] rounded-full border border-stone-200/40 pl-3.5 pr-0 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer select-none w-32 sm:w-36 md:w-40 lg:w-44 h-11 shrink-0 transition-all hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)] active:scale-98 relative overflow-hidden"
                                        >
                                            <div className={`flex items-center gap-1.5 min-w-0 z-10 w-full transition-all ${activeTrackDropdownId === track.id ? 'pr-4' : 'pr-[80px]'}`}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-stone-400 shrink-0">
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                                {track.type === 'custom' && activeTrackDropdownId !== track.id ? (
                                                    <input
                                                        type="text"
                                                        value={track.name}
                                                        onChange={(e) => {
                                                            const newName = e.target.value;
                                                            setStudioTracks(prev => prev.map(t => t.id === track.id ? { ...t, name: newName } : t));
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        autoFocus={track.name === 'Custom'}
                                                        className="bg-transparent border-none text-[13px] md:text-[14px] text-stone-700 font-extrabold focus:outline-none focus:ring-0 p-0 w-full min-w-0 font-sans"
                                                        placeholder="Custom..."
                                                    />
                                                ) : (
                                                    <span className={`text-[13px] md:text-[14px] truncate leading-none transition-colors ${
                                                        activeTrackDropdownId === track.id 
                                                            ? 'text-stone-400 font-medium' 
                                                            : 'text-stone-700 font-extrabold'
                                                    }`}>
                                                        {activeTrackDropdownId === track.id ? 'Select track' : track.name}
                                                    </span>
                                                )}
                                            </div>
                                            {activeTrackDropdownId !== track.id && (
                                                <div className="absolute top-[-6px] right-0 w-[155px] h-14 overflow-hidden shrink-0 flex items-center justify-end pointer-events-none">
                                                    <img 
                                                        src={instrumentImages[track.type]} 
                                                        className={`object-contain transform select-none pointer-events-none transition-all ${
                                                            track.type === 'drums'
                                                                ? 'max-w-[165%] max-h-[165%] translate-x-[62px] translate-y-[10px]'
                                                                : track.type === 'synth'
                                                                ? 'max-w-[130%] max-h-[130%] translate-x-6 translate-y-3'
                                                                : track.type === 'guitar'
                                                                ? 'max-w-[130%] max-h-[130%] translate-x-3 translate-y-[2px]'
                                                                : track.type === 'piano'
                                                                ? 'max-w-[180%] max-h-[180%] translate-x-[52px] translate-y-3'
                                                                : track.type === 'custom'
                                                                ? 'max-w-[130%] max-h-[130%] translate-x-[36px] translate-y-[2px]'
                                                                : 'max-w-[130%] max-h-[130%] translate-x-3 translate-y-3'
                                                        }`}
                                                        alt={track.name} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        {/* Instrument Selection Grid Pop-up (Figma Pixel-Perfect Stack) */}
                                        {activeTrackDropdownId === track.id && (
                                            <div className="absolute top-12.5 left-0 w-[320px] bg-white border border-stone-200/80 rounded-[36px] shadow-[0_15px_50px_rgba(0,0,0,0.12)] p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-3.5 pointer-events-auto">
                                                {(() => {
                                                    const standardOptions = ['vocals', 'drums', 'piano', 'guitar', 'synth'] as const;
                                                    const isCustomSelected = track.type === 'custom';
                                                    
                                                    // Helper to render a standard option pill
                                                    const renderOptionPill = (typeOpt: typeof standardOptions[number]) => {
                                                        const isSelected = track.type === typeOpt;
                                                        return (
                                                            <button
                                                                key={typeOpt}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectInstrumentType(track.id, typeOpt);
                                                                }}
                                                                className={`w-full h-14 flex items-center justify-between pl-6 relative overflow-hidden rounded-full group cursor-pointer border active:scale-[0.98] transition-all ${
                                                                    isSelected 
                                                                        ? 'bg-[#F9F8F6] border-transparent hover:bg-[#F3F1ED]' 
                                                                        : 'bg-white border-stone-250 hover:bg-stone-50/50'
                                                                }`}
                                                            >
                                                                <span className={`text-[16px] tracking-wide select-none transition-colors whitespace-nowrap ${
                                                                    isSelected ? 'font-semibold text-stone-600' : 'font-medium text-stone-400 group-hover:text-stone-500'
                                                                }`}>
                                                                    {instrumentLabels[typeOpt]}
                                                                </span>
                                                                <div className="w-[155px] h-full relative overflow-hidden shrink-0 flex items-center justify-end">
                                                                    <img 
                                                                        src={instrumentImages[typeOpt]} 
                                                                        className={`object-contain transform group-hover:scale-108 transition-transform duration-200 select-none pointer-events-none ${
                                                                            typeOpt === 'drums'
                                                                                ? 'max-w-[165%] max-h-[165%] translate-x-[62px] translate-y-[10px]'
                                                                                : typeOpt === 'synth'
                                                                                ? 'max-w-[130%] max-h-[130%] translate-x-6 translate-y-3'
                                                                                : typeOpt === 'guitar'
                                                                                ? 'max-w-[130%] max-h-[130%] translate-x-3 translate-y-[2px]'
                                                                                : typeOpt === 'piano'
                                                                                ? 'max-w-[180%] max-h-[180%] translate-x-[52px] translate-y-3'
                                                                                : 'max-w-[130%] max-h-[130%] translate-x-3 translate-y-3'
                                                                        }`}
                                                                        alt={typeOpt} 
                                                                    />
                                                                </div>
                                                            </button>
                                                        );
                                                    };
  
                                                    // Helper to render the custom option pill
                                                    const renderCustomPill = () => {
                                                        return (
                                                            <button
                                                                key="custom"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectInstrumentType(track.id, 'custom');
                                                                    setStudioTracks(prev => prev.map(t => t.id === track.id ? { ...t, name: t.name === 'Custom' || t.name === 'Vocals' || t.name === 'Drums' || t.name === 'Piano' || t.name === 'Guitar' || t.name === 'Synth' || t.name === 'vocals' || t.name === 'drums' || t.name === 'piano' || t.name === 'guitar' || t.name === 'synth' ? 'Custom' : t.name } : t));
                                                                    setActiveTrackDropdownId(null);
                                                                }}
                                                                className={`w-full h-14 flex items-center justify-between pl-6 relative overflow-hidden rounded-full group cursor-pointer border active:scale-[0.98] transition-all ${
                                                                    isCustomSelected 
                                                                        ? 'bg-[#F9F8F6] border-transparent hover:bg-[#F3F1ED]' 
                                                                        : 'bg-white border-stone-250 hover:bg-stone-50/50'
                                                                }`}
                                                            >
                                                                <span className={`text-[16px] tracking-wide select-none transition-colors whitespace-nowrap ${
                                                                    isCustomSelected ? 'font-semibold text-stone-600' : 'font-medium text-stone-400 group-hover:text-stone-500'
                                                                }`}>
                                                                    Add custom
                                                                </span>
                                                                <div className="w-[155px] h-full relative overflow-hidden shrink-0 flex items-center justify-end">
                                                                    <img 
                                                                        src={instrumentImages['custom']} 
                                                                        className="max-w-[130%] max-h-[130%] object-contain transform translate-x-[36px] translate-y-[2px] group-hover:scale-108 transition-transform duration-200 select-none pointer-events-none" 
                                                                        alt="custom" 
                                                                    />
                                                                </div>
                                                            </button>
                                                        );
                                                    };
  
                                                    // Build the final order: guitar, piano, vocals, then custom
                                                    const orderedOptions = ['guitar', 'piano', 'vocals'] as const;
                                                    return (
                                                        <>
                                                            {orderedOptions.map(opt => renderOptionPill(opt))}
                                                            {renderCustomPill()}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Controllers Container (No background, larger items) */}
                                    <div className={`px-2 flex items-center justify-between w-[280px] shrink-0 relative select-none transition-all duration-200 ${
                                        expandedTrackId === track.id ? 'h-[74px]' : 'h-11'
                                    }`}>
                                        {/* VOL */}
                                        <div className="flex flex-col items-center justify-center">
                                            <StudioKnob 
                                                value={track.volume}
                                                min={0}
                                                max={100}
                                                defaultValue={80}
                                                onChange={(val) => handleUpdateTrackParam(track.id, 'volume', val)}
                                            />
                                            {expandedTrackId === track.id && (
                                                <span className="text-[11px] font-normal text-stone-400/80 mt-1 select-none animate-in fade-in duration-200">
                                                    {track.volume}
                                                </span>
                                            )}
                                        </div>
                                        {/* PAN */}
                                        <div className="flex flex-col items-center justify-center">
                                            <StudioKnob 
                                                value={track.pan}
                                                min={-50}
                                                max={50}
                                                defaultValue={0}
                                                onChange={(val) => handleUpdateTrackParam(track.id, 'pan', val)}
                                            />
                                            {expandedTrackId === track.id && (
                                                <span className="text-[11px] font-normal text-stone-400/80 mt-1 select-none animate-in fade-in duration-200">
                                                    {track.pan > 0 ? `R${track.pan}` : track.pan < 0 ? `L${Math.abs(track.pan)}` : 'C'}
                                                </span>
                                            )}
                                        </div>
                                        {/* EQ */}
                                        <div className="flex flex-col items-center justify-center">
                                            <StudioKnob 
                                                value={track.eq}
                                                min={-12}
                                                max={12}
                                                defaultValue={0}
                                                onChange={(val) => handleUpdateTrackParam(track.id, 'eq', val)}
                                            />
                                            {expandedTrackId === track.id && (
                                                <span className="text-[11px] font-normal text-stone-400/80 mt-1 select-none animate-in fade-in duration-200">
                                                    {track.eq > 0 ? `+${track.eq}` : track.eq}
                                                </span>
                                            )}
                                        </div>
                                        {/* REV */}
                                        <div className="flex flex-col items-center justify-center">
                                            <StudioKnob 
                                                value={track.reverb}
                                                min={0}
                                                max={100}
                                                defaultValue={0}
                                                onChange={(val) => handleUpdateTrackParam(track.id, 'reverb', val)}
                                            />
                                            {expandedTrackId === track.id && (
                                                <span className="text-[11px] font-normal text-stone-400/80 mt-1 select-none animate-in fade-in duration-200">
                                                    {track.reverb}
                                                </span>
                                            )}
                                        </div>
                                        {/* COMP Toggle (Circular Switch Button) */}
                                        <div className="flex flex-col items-center justify-center">
                                            <button
                                                onClick={() => handleUpdateTrackParam(track.id, 'compressor', !track.compressor)}
                                                className={`w-11 h-11 rounded-full border-2 transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                                                    track.compressor 
                                                        ? 'bg-white border-stone-200/80 shadow-[0_2.5px_6px_rgba(0,0,0,0.07)]' 
                                                        : 'bg-[#F5F4F0] border-stone-200/40 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.06)]'
                                                }`}
                                            >
                                                <span className={`text-[12px] font-bold tracking-wide select-none ${
                                                    track.compressor ? 'text-stone-600' : 'text-stone-400'
                                                }`}>
                                                    {track.compressor ? 'ON' : 'OFF'}
                                                </span>
                                            </button>
                                            {expandedTrackId === track.id && (
                                                <span className="text-[11px] font-normal text-stone-400/80 mt-1 select-none animate-in fade-in duration-200">
                                                    {track.compressor ? 'ON' : 'OFF'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline Capsule Wrapper (allows playhead dragging/seeking) */}
                                    <div 
                                        className="flex-grow h-11 relative cursor-ew-resize select-none"
                                        onPointerDown={(e) => {
                                            setActiveRecordingTrackId(track.id);
                                            handleTimelinePointerDown(e);
                                        }}
                                    >
                                        {/* Timeline Capsule */}
                                        {(() => {
                                            const hasRecordedAudio = !!(track.audioBuffer || track.url);
                                            return (
                                                <div className={`w-full h-full rounded-full flex items-center relative hover:bg-stone-50/50 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden ${
                                                    isThisTrackRecording 
                                                        ? 'p-0 bg-[#FF6B6B]' 
                                                        : hasRecordedAudio
                                                            ? 'px-1 py-1 bg-white border border-stone-200/40 shadow-[0_3px_10px_rgba(0,0,0,0.06)]'
                                                            : isArmed
                                                                ? 'px-1 py-1 bg-red-50/15 border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
                                                                : 'px-1 py-1 bg-white border border-stone-200/50'
                                                }`}>
                                                    <TrackWaveform 
                                                        audioBuffer={track.audioBuffer}
                                                        playhead={studioPlayhead}
                                                        duration={limit}
                                                        isRecording={isThisTrackRecording}
                                                        studioState={studioState}
                                                        trackName={track.name}
                                                    />
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Far Right Action Buttons (Silence/Volume & Options) */}
                                    <div className="flex items-center gap-1.5 shrink-0 z-20 relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleTrackMute(track.id);
                                            }}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                                                track.muted 
                                                    ? 'bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600' 
                                                    : 'bg-stone-100/80 hover:bg-stone-200/70 text-stone-500 hover:text-stone-750'
                                            }`}
                                            type="button"
                                            title={track.muted ? "Unsilence Track" : "Silence Track"}
                                        >
                                            {track.muted ? (
                                                <VolumeX size={15} className="stroke-[2.5]" />
                                            ) : (
                                                <Volume2 size={15} className="stroke-[2.5]" />
                                            )}
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveTrackMenuId(activeTrackMenuId === track.id ? null : track.id);
                                                }}
                                                className="w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200/70 text-stone-500 hover:text-stone-750 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                                                type="button"
                                                title="Track Options"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                                    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                                                    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                                                </svg>
                                            </button>

                                            {activeTrackMenuId === track.id && (
                                                <div className="absolute right-0 top-9 w-32 bg-white border border-stone-200/80 rounded-[14px] shadow-[0_8px_25px_rgba(0,0,0,0.06)] p-1 z-40 animate-in fade-in slide-in-from-top-1 duration-150 pointer-events-auto">
                                                    <button
                                                        onClick={() => {
                                                            handleDeleteTrack(track.id);
                                                            setActiveTrackMenuId(null);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-650 rounded-[10px] cursor-pointer active:scale-[0.98] transition-all"
                                                        type="button"
                                                    >
                                                        Delete Track
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Add track button following track card */}
                        {studioTracks.length < 4 && (
                            <div className="h-15 sm:h-16 w-full shrink-0 flex items-center justify-center">
                                <button
                                    onClick={handleAddTrack}
                                    className="w-[260px] h-13 sm:h-14 border border-dashed border-stone-300 hover:border-stone-400 bg-stone-100/40 hover:bg-stone-100/70 text-stone-500 hover:text-stone-700 rounded-full font-medium text-[16px] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-sm"
                                    type="button"
                                >
                                    <Plus size={20} className="stroke-[2.2] text-stone-500" />
                                    <span>Add track</span>
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Single Continuous Playhead Line Overlay */}
                {studioState !== 'recording' && (
                    <div 
                        id="studio-playhead-overlay"
                        className="absolute top-8 bottom-[76px] pointer-events-none z-30 left-[480px] sm:left-[496px] md:left-[512px] lg:left-[528px] right-[60px]"
                    >
                        {/* Hoverable target container centered on playheadPercent */}
                        <div 
                            className="absolute top-0 bottom-0 w-6 -ml-3 pointer-events-auto cursor-ew-resize flex justify-center group/playhead"
                            style={{ left: `${playheadPercent}%` }}
                            onPointerDown={handlePlayheadLinePointerDown}
                        >
                            {/* Visible red line with responsive expansion, no roundness, no blur, and a white vertical handler in center on hover */}
                            <div 
                                className="h-full bg-[#FF4040] w-[2px] group-hover/playhead:w-[10px] transition-all duration-150 flex items-center justify-center relative"
                            >
                                <div className="w-[1.5px] h-10 bg-white opacity-0 group-hover/playhead:opacity-100 transition-opacity duration-150" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Control Bar */}
                <div className="flex flex-col gap-3 pt-4 mt-2 w-full">
                    {/* Level 1: Metronome, Guitar Tuner, and Timeline Seeker Capsule */}
                    <div className="flex w-full items-center gap-3 px-4 h-10 select-none">
                        {/* Left side: Instrument and Utility pills aligned with tracks left column */}
                        <div className="w-[452px] sm:w-[468px] md:w-[484px] lg:w-[500px] shrink-0 flex items-center gap-2.5">
                            {/* Metronome Pill */}
                            <div 
                                onMouseEnter={() => {
                                    if (!isStudioMetronomeOn) {
                                        setIsMetronomeHovered(true);
                                    }
                                }}
                                onMouseLeave={() => setIsMetronomeHovered(false)}
                                onClick={handleToggleStudioMetronome}
                                className={`h-10 border rounded-full flex items-center select-none shrink-0 transition-all duration-300 ease-in-out cursor-pointer ${
                                    (isMetronomeHovered && !isStudioMetronomeOn)
                                        ? 'w-[310px] pl-1 pr-2.5 justify-start gap-1.5 bg-white border-stone-200 text-stone-700 shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
                                        : isStudioMetronomeOn
                                            ? 'w-[155px] px-4 justify-center gap-2 bg-white border-stone-200 text-stone-700 shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-98'
                                            : 'w-[110px] pl-3.5 pr-3.5 justify-center gap-1.5 bg-stone-100/70 border-stone-250/20 text-stone-700/80 active:scale-98'
                                }`}
                            >
                                {(isMetronomeHovered && !isStudioMetronomeOn) ? (
                                    <>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {/* Black Play Metronome Button on the left */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleStudioMetronome();
                                                }}
                                                className="h-8 bg-stone-900 hover:bg-stone-850 text-white text-[11px] font-bold px-3 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                                                type="button"
                                            >
                                                Play metronome
                                            </button>

                                            {/* White Tap Tempo Button next to it */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTapTempo(e);
                                                }}
                                                className="h-8 bg-white border border-stone-250/30 hover:bg-stone-50 text-[11px] font-bold text-stone-600 px-2.5 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                                                type="button"
                                            >
                                                Tap tempo &rarr;
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5 min-w-0 shrink-0 text-stone-700">
                                            {/* Metronome User Icon (w-5 h-5) */}
                                            <svg 
                                                viewBox="0 0 32 32" 
                                                fill="none" 
                                                xmlns="http://www.w3.org/2000/svg" 
                                                className="w-5 h-5 text-stone-500 shrink-0"
                                            >
                                                <path d="M26.6651 25.4688L23.1088 14.2925L26.5526 10.5C26.6651 10.3502 26.7174 10.1637 26.6993 9.97727C26.6812 9.79081 26.594 9.61788 26.4548 9.49249C26.3156 9.3671 26.1346 9.29834 25.9472 9.29973C25.7599 9.30112 25.5799 9.37257 25.4426 9.50001L22.5838 12.6463L20.3013 5.46876C20.1897 5.11437 19.9676 4.80496 19.6676 4.5857C19.3676 4.36644 19.0054 4.24882 18.6338 4.25001H13.3638C12.9923 4.24882 12.63 4.36644 12.3301 4.5857C12.0301 4.80496 11.808 5.11437 11.6963 5.46876L5.33258 25.4688C5.24903 25.731 5.22851 26.0092 5.27269 26.2809C5.31686 26.5526 5.42449 26.81 5.58682 27.0322C5.74916 27.2545 5.96163 27.4353 6.20697 27.56C6.45231 27.6847 6.72361 27.7498 6.99884 27.75H24.9988C25.2742 27.75 25.5456 27.6851 25.7911 27.5604C26.0366 27.4358 26.2492 27.255 26.4117 27.0327C26.5742 26.8104 26.6819 26.553 26.7262 26.2812C26.7704 26.0095 26.7499 25.731 26.6663 25.4688H26.6651ZM23.4301 20.25H17.6938L21.9438 15.5763L23.4301 20.25ZM13.1238 5.92376C13.1401 5.873 13.1721 5.82876 13.2153 5.7975C13.2585 5.76624 13.3105 5.7496 13.3638 5.75001H18.6338C18.6871 5.7496 18.7392 5.76624 18.7823 5.7975C18.8255 5.82876 18.8576 5.873 18.8738 5.92376L21.4188 13.9238L15.6688 20.25H8.56759L13.1238 5.92376ZM25.1988 26.1475C25.1762 26.1795 25.1463 26.2055 25.1114 26.2233C25.0766 26.2412 25.038 26.2503 24.9988 26.25H6.99884C6.95952 26.2499 6.92078 26.2406 6.88577 26.2227C6.85075 26.2048 6.82044 26.1789 6.79731 26.1471C6.77417 26.1154 6.75885 26.0786 6.7526 26.0398C6.74635 26.0009 6.74934 25.9612 6.76133 25.9238L8.09009 21.75H23.9076L25.2351 25.9238C25.2477 25.9612 25.251 26.0011 25.2447 26.0401C25.2384 26.0791 25.2226 26.116 25.1988 26.1475Z" fill="currentColor" />
                                            </svg>
                                            <span className="text-[12px] font-sans font-extrabold text-stone-700/80">
                                                {metronomeBpm} BPM
                                            </span>
                                        </div>
                                    </>
                                ) : isStudioMetronomeOn ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-[#82C39B] shrink-0 animate-pulse" />
                                        <span className="text-[12px] font-sans font-extrabold whitespace-nowrap tracking-tight">
                                            On • {metronomeBpm} BPM
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {/* Metronome User Icon (w-5 h-5) */}
                                        <svg 
                                            viewBox="0 0 32 32" 
                                            fill="none" 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className="w-5 h-5 text-stone-500 shrink-0"
                                        >
                                            <path d="M26.6651 25.4688L23.1088 14.2925L26.5526 10.5C26.6651 10.3502 26.7174 10.1637 26.6993 9.97727C26.6812 9.79081 26.594 9.61788 26.4548 9.49249C26.3156 9.3671 26.1346 9.29834 25.9472 9.29973C25.7599 9.30112 25.5799 9.37257 25.4426 9.50001L22.5838 12.6463L20.3013 5.46876C20.1897 5.11437 19.9676 4.80496 19.6676 4.5857C19.3676 4.36644 19.0054 4.24882 18.6338 4.25001H13.3638C12.9923 4.24882 12.63 4.36644 12.3301 4.5857C12.0301 4.80496 11.808 5.11437 11.6963 5.46876L5.33258 25.4688C5.24903 25.731 5.22851 26.0092 5.27269 26.2809C5.31686 26.5526 5.42449 26.81 5.58682 27.0322C5.74916 27.2545 5.96163 27.4353 6.20697 27.56C6.45231 27.6847 6.72361 27.7498 6.99884 27.75H24.9988C25.2742 27.75 25.5456 27.6851 25.7911 27.5604C26.0366 27.4358 26.2492 27.255 26.4117 27.0327C26.5742 26.8104 26.6819 26.553 26.7262 26.2812C26.7704 26.0095 26.7499 25.731 26.6663 25.4688H26.6651ZM23.4301 20.25H17.6938L21.9438 15.5763L23.4301 20.25ZM13.1238 5.92376C13.1401 5.873 13.1721 5.82876 13.2153 5.7975C13.2585 5.76624 13.3105 5.7496 13.3638 5.75001H18.6338C18.6871 5.7496 18.7392 5.76624 18.7823 5.7975C18.8255 5.82876 18.8576 5.873 18.8738 5.92376L21.4188 13.9238L15.6688 20.25H8.56759L13.1238 5.92376ZM25.1988 26.1475C25.1762 26.1795 25.1463 26.2055 25.1114 26.2233C25.0766 26.2412 25.038 26.2503 24.9988 26.25H6.99884C6.95952 26.2499 6.92078 26.2406 6.88577 26.2227C6.85075 26.2048 6.82044 26.1789 6.79731 26.1471C6.77417 26.1154 6.75885 26.0786 6.7526 26.0398C6.74635 26.0009 6.74934 25.9612 6.76133 25.9238L8.09009 21.75H23.9076L25.2351 25.9238C25.2477 25.9612 25.251 26.0011 25.2447 26.0401C25.2384 26.0791 25.2226 26.116 25.1988 26.1475Z" fill="currentColor" />
                                        </svg>
                                        <span className="text-[12px] font-sans font-extrabold text-stone-700/80">
                                            {metronomeBpm} BPM
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Guitar Tuner Pill */}
                            <div 
                                onMouseEnter={() => setIsTunerHovered(true)}
                                onMouseLeave={() => setIsTunerHovered(false)}
                                className={`h-10 bg-stone-100/70 border border-stone-250/20 rounded-full flex items-center select-none shrink-0 transition-all duration-300 ease-in-out ${
                                    isTunerHovered ? 'w-[180px] pl-1 pr-2.5 justify-between' : 'w-[72px] pl-2.5 pr-2.5 justify-center gap-1.5'
                                }`}
                            >
                                {isTunerHovered && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveToolTab('tuner');
                                            setShowToolsPanel(true);
                                        }}
                                        className="h-8 bg-white border border-stone-250/30 hover:bg-stone-50 text-[11px] font-bold text-stone-600 px-3 rounded-full flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                                        type="button"
                                    >
                                        Guitar tuning &rarr;
                                    </button>
                                )}
                                <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                    {/* Guitar User Icon */}
                                    <svg 
                                        viewBox="0 0 32 32" 
                                        fill="none" 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className={`w-5 h-5 text-stone-500 shrink-0 ${tunerActive ? 'animate-pulse text-emerald-500' : ''}`}
                                    >
                                        <path d="M31.0306 5.96985L26.0306 0.969847C25.8885 0.837367 25.7004 0.765243 25.5061 0.768672C25.3118 0.7721 25.1264 0.850812 24.989 0.988225C24.8516 1.12564 24.7729 1.31102 24.7695 1.50532C24.766 1.69963 24.8382 1.88767 24.9706 2.02985L25.4406 2.49985L17.6131 10.3273C14.8181 8.80235 11.6619 8.87485 9.7719 10.7698C9.28268 11.2564 8.89962 11.8391 8.6469 12.4811C8.54812 12.7079 8.38575 12.9011 8.17945 13.0376C7.97314 13.174 7.73172 13.2477 7.4844 13.2498C5.7269 13.3098 4.20065 13.9373 3.0719 15.0661C1.62565 16.5223 1.00065 18.6248 1.34065 20.9736C1.66565 23.2498 2.84815 25.4998 4.6719 27.3286C6.49565 29.1573 8.75065 30.3348 11.0269 30.6598C11.4359 30.719 11.8486 30.7491 12.2619 30.7498C14.1106 30.7498 15.7381 30.1248 16.9306 28.9286C18.0556 27.8036 18.6869 26.2748 18.7469 24.5161C18.7481 24.2673 18.8219 24.0242 18.9591 23.8167C19.0963 23.6091 19.291 23.446 19.5194 23.3473C20.1609 23.0965 20.7435 22.7156 21.2306 22.2286C23.1206 20.3386 23.1981 17.1823 21.6731 14.3873L29.5006 6.55985L29.9706 7.02985C30.1128 7.16233 30.3009 7.23445 30.4952 7.23102C30.6895 7.22759 30.8749 7.14888 31.0123 7.01147C31.1497 6.87406 31.2284 6.68867 31.2318 6.49437C31.2352 6.30007 31.1631 6.11202 31.0306 5.96985ZM20.1706 21.1686C19.8278 21.5101 19.4179 21.7769 18.9669 21.9523C18.4674 22.1587 18.039 22.5064 17.7341 22.9527C17.4293 23.399 17.2612 23.9245 17.2506 24.4648C17.2044 25.8398 16.7281 27.0136 15.8756 27.8673C14.7644 28.9786 13.1256 29.4436 11.2506 29.1748C9.2944 28.8961 7.3394 27.8636 5.74315 26.2686C4.1469 24.6736 3.11815 22.7173 2.8369 20.7611C2.56815 18.8861 3.03315 17.2411 4.1444 16.1298C4.99815 15.2748 6.17565 14.7986 7.5469 14.7548C8.08772 14.7441 8.61362 14.5756 9.05998 14.27C9.50633 13.9644 9.8537 13.5351 10.0594 13.0348C10.2352 12.5844 10.502 12.175 10.8431 11.8323C11.5656 11.0961 12.5719 10.7498 13.6806 10.7498C14.66 10.7663 15.6233 11.0007 16.5006 11.4361L13.6756 14.2648C12.9642 14.3265 12.2853 14.5901 11.7185 15.0245C11.1517 15.4588 10.7208 16.046 10.4763 16.7169C10.2318 17.3878 10.184 18.1146 10.3384 18.8118C10.4928 19.509 10.8431 20.1475 11.348 20.6525C11.8529 21.1574 12.4915 21.5077 13.1887 21.6621C13.8859 21.8165 14.6127 21.7687 15.2836 21.5242C15.9545 21.2797 16.5417 20.8488 16.976 20.282C17.4104 19.7152 17.6739 19.0362 17.7356 18.3248L20.5656 15.4998C21.5794 17.6023 21.5006 19.8348 20.1706 21.1686ZM18.8756 13.1248C19.2002 13.4493 19.4998 13.7978 19.7719 14.1673L17.4381 16.4998C17.058 15.634 16.3665 14.9425 15.5006 14.5623L17.8281 12.2348C18.1994 12.5044 18.5496 12.802 18.8756 13.1248ZM14.0006 15.7498C14.5974 15.7498 15.1697 15.9869 15.5916 16.4089C16.0136 16.8308 16.2506 17.4031 16.2506 17.9998C16.2506 17.9998 16.2506 17.9998 16.2506 17.9998ZM19.9306 12.0698C19.6059 11.7461 19.2602 11.4442 18.8956 11.1661L22.0006 8.05985L23.9406 9.99985L20.8356 13.1036C20.5572 12.7393 20.2553 12.3936 19.9319 12.0686L19.9306 12.0698ZM24.9994 8.94485L23.0619 6.99985L26.5006 3.55985L28.4406 5.49985L24.9994 8.94485ZM11.5319 24.4686C11.6056 24.5373 11.6647 24.6201 11.7057 24.7121C11.7467 24.8041 11.7687 24.9034 11.7705 25.0041C11.7723 25.1048 11.7537 25.2048 11.716 25.2982C11.6783 25.3916 11.6222 25.4764 11.5509 25.5476C11.4797 25.6189 11.3949 25.675 11.3015 25.7127C11.2081 25.7504 11.1081 25.769 11.0074 25.7672C10.9067 25.7654 10.8074 25.7434 10.7154 25.7024C10.6234 25.6614 10.5406 25.6023 10.4719 25.5286L6.4719 21.5286C6.33942 21.3864 6.26729 21.1984 6.27072 21.0041C6.27415 20.8098 6.35286 20.6244 6.49027 20.487C6.62769 20.3496 6.81307 20.2708 7.00737 20.2674C7.20167 20.264 7.38972 20.3361 7.5319 20.4686L11.5319 24.4686Z" fill="currentColor"/>
                                    </svg>
                                    
                                    <span className="text-[12px] font-sans font-extrabold text-stone-700/80 shrink-0">
                                        {tunerActive ? tunerNote : (savedTuning ? savedTuning.note : '--')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right side: Timeline Seeker Capsule containing the actual time ruler */}
                        <div className="flex-grow flex items-center relative h-10 rounded-full bg-stone-100/70 border border-stone-250/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                            {/* Time Ruler with tick lines inside capsule (inline flex layout) */}
                            <div 
                                className="w-full h-full flex justify-between items-center px-4 relative cursor-ew-resize select-none"
                                onPointerDown={handleTimelinePointerDown}
                            >
                                {rulerItems.map((item, idx) => (
                                    item.type === 'label' ? (
                                        <span 
                                            key={idx} 
                                            className="text-[9px] font-sans font-bold text-stone-500/80 select-none shrink-0"
                                        >
                                            {item.value}
                                        </span>
                                    ) : (
                                        <div 
                                            key={idx} 
                                            className="w-[1px] h-2 bg-stone-300/80 rounded-full shrink-0"
                                        />
                                    )
                                ))}
                            </div>
                        </div>

                        {/* Options gap */}
                        <div className="w-8 shrink-0" />
                    </div>

                    {/* Level 2 Divider Line */}
                    <div className="w-full h-[1px] bg-stone-200/50 my-1" />

                    {/* Level 2: Center-aligned Principal Action Buttons */}
                    <div className="flex items-center justify-center gap-3 w-full pb-1">
                        {/* REC Button */}
                        {studioState === 'recording' ? (
                            <button
                                onClick={stopStudioRecording}
                                className="px-6 py-2.5 bg-white border border-stone-200 text-[#FF4040] rounded-full font-bold text-[13px] active:scale-95 transition-all shadow-[0_1.5px_4px_rgba(0,0,0,0.05)] cursor-pointer flex items-center gap-2"
                            >
                                <div className="relative flex items-center justify-center shrink-0">
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#FF4040] animate-ping absolute" />
                                    <Square size={10} className="fill-[#FF4040] text-[#FF4040] shrink-0 z-10" />
                                </div>
                                <span className="z-10 text-[#FF4040]">Recording...</span>
                            </button>
                        ) : (
                            <button
                                onClick={startStudioRecording}
                                className="px-6 py-2.5 bg-white border border-stone-200 hover:bg-stone-50/50 text-[#FF4040] rounded-full font-bold text-[13px] active:scale-95 transition-all shadow-[0_1.5px_4px_rgba(0,0,0,0.05)] cursor-pointer flex items-center gap-2"
                            >
                                <div className="w-2.5 h-2.5 bg-[#FF4040] rounded-full shrink-0" />
                                REC
                            </button>
                        )}

                        {/* Play / Pause Button */}
                        <button
                            onClick={() => {
                                if (studioState === 'playing') {
                                    pauseStudioPlayback();
                                } else {
                                    startStudioPlayback(studioPlayhead);
                                }
                            }}
                            disabled={studioDuration === 0 || studioState === 'recording'}
                            className="px-6 py-2.5 bg-white border border-stone-200 hover:bg-stone-50/50 text-stone-700 rounded-full font-bold text-[13px] active:scale-95 transition-all shadow-[0_1.5px_4px_rgba(0,0,0,0.05)] cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-stone-650 shrink-0">
                                {studioState === 'playing' ? (
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                ) : (
                                    <path d="M8 5v14l11-7z" />
                                )}
                            </svg>
                            Play / Pause
                        </button>

                        {/* Publish Button */}
                        <div className="relative">
                            <button
                                onClick={() => setActivePublishMenu(!activePublishMenu)}
                                className="px-6 py-2.5 bg-white border border-stone-200 hover:bg-stone-50/50 text-stone-700 rounded-full font-bold text-[13px] active:scale-95 transition-all shadow-[0_1.5px_4px_rgba(0,0,0,0.05)] cursor-pointer"
                            >
                                Publish
                            </button>

                            {activePublishMenu && (
                                <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-44 bg-white border border-stone-200/80 rounded-[18px] shadow-[0_10px_35px_rgba(0,0,0,0.08)] py-2.5 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                    <button
                                        onClick={() => {
                                            handleSaveStudioMixToProject();
                                            setActivePublishMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-50 cursor-pointer"
                                    >
                                        Save Mix to Project
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleExportStudioMix();
                                            setActivePublishMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-50 cursor-pointer"
                                    >
                                        Export Mix (.wav)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Creative Tools Suite rendering functions
    const renderGuitarTuner = () => {
        const tunerNotes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
        const displayLabels = ['A', 'B♭', 'B', 'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭'];
        const tunerCenterY = 295; // Original centerY to keep the dome shape resting flat on the bottom edge
        const tunerContentY = tunerCenterY - 35; // Pushed up to sit in the center of the visible dome
        
        // Find active note index (live or saved)
        const currentActiveNote = tunerActive ? tunerNote : (savedTuning ? savedTuning.note : '--');
        const activeIdx = tunerNotes.indexOf(currentActiveNote);
        
        // Calculate rotation for the note circle to center the active note at top (12 o'clock / 0 degrees)
        let circleRotation = 90; // Default: 'A' sits at 9 o'clock (-90°), rotated by +90° centers it
        let showHighlight = false;
        
        if (activeIdx !== -1) {
            showHighlight = true;
            circleRotation = 90 - activeIdx * 30; // Rotate note index to top center
            tunerLastCircleRotationRef.current = circleRotation; // Save for persistence
        } else if (tunerLastCircleRotationRef.current !== undefined) {
            // Standby state: keep last active rotation to prevent snapping back
            circleRotation = tunerLastCircleRotationRef.current;
        }

        // Calculate needle angle for cents (-20 to +20 cents mapped to -50° to +50° span, clamped between -30 and +30 cents / -75° and +75°)
        const liveCents = tunerActive ? tunerCents : (savedTuning ? savedTuning.cents : 0);
        const clampedCents = Math.max(-30, Math.min(30, liveCents));
        const needleAngle = (clampedCents / 20) * 50;

        // Polar coordinates helper for SVG positioning (0 degrees is top center, centerY is offset)
        const getPolarCoord = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
            const angleInRadians = angleInDegrees * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.sin(angleInRadians)),
                y: centerY - (radius * Math.cos(angleInRadians))
            };
        };

        // Helper to generate the SVG arc path for the wedge
        const getWedgePath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
            const start = getPolarCoord(x, y, radius, endAngle);
            const end = getPolarCoord(x, y, radius, startAngle);
            const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
            return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
        };

        return (
            <div className="w-full flex flex-col items-center select-none pt-2 sm:pt-4 pb-0 relative animate-in fade-in duration-200">
                
                {/* Tuner dial visualization (Rotating note ring design - native aspect crop with gradient fade overlay) */}
                <div className="w-full relative aspect-[600/295] flex items-center justify-center overflow-hidden">
                    <svg width="100%" height="100%" viewBox="0 0 600 295" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
                        <defs>
                            <linearGradient id="tunerBottomFade" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                            </linearGradient>
                        </defs>
                        
                        {/* Outer Fine-Tuning Arc (Intensity ticks at the top) */}
                        {Array.from({ length: 61 }).map((_, idx) => {
                            const angle = -75 + idx * 2.5; // spanned from -75 to +75 degrees
                            const isCenter = idx === 30; // 0 degrees (perfectly in tune)
                            const isMajor = idx % 5 === 0;
                            const tickLen = isCenter ? 28 : (isMajor ? 20 : 11);
                            const start = getPolarCoord(300, tunerCenterY, 235, angle);
                            const end = getPolarCoord(300, tunerCenterY, 235 + tickLen, angle);

                            // Cosine opacity decay towards the left/right extremes
                            const dist = Math.abs(idx - 30);
                            const ratio = dist / 30;
                            const opacity = Math.max(0.08, Math.cos(ratio * Math.PI * 0.46));

                            return (
                                <line
                                    key={`outer-${idx}`}
                                    x1={start.x}
                                    y1={start.y}
                                    x2={end.x}
                                    y2={end.y}
                                    stroke={isCenter ? "#1C1917" : (isMajor ? "#78716C" : "#D6D3D1")}
                                    strokeWidth={isCenter ? 2.5 : (isMajor ? 1.5 : 0.8)}
                                    strokeOpacity={opacity}
                                />
                            );
                        })}

                        {/* Outer Fine-Tuning Arc Numbers (-20 to 20) in light gray */}
                        {[-20, -10, 0, 10, 20].map((val) => {
                            const angle = (val / 20) * 50; // maps -20 to -50°, -10 to -25°, etc.
                            const pos = getPolarCoord(300, tunerCenterY, 270, angle);
                            return (
                                <text
                                    key={`outer-val-${val}`}
                                    x={pos.x}
                                    y={pos.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[12.5px] sm:text-[14px] font-normal text-stone-300 fill-stone-300 font-sans pointer-events-none select-none animate-in fade-in duration-300"
                                >
                                    {val}
                                </text>
                            );
                        })}

                        {/* Dynamic Red Intensity Needle (Moves with cents) */}
                        <g
                            style={{ 
                                transform: `rotate(${tunerActive || savedTuning ? needleAngle : 0}deg)`, 
                                transformOrigin: `300px ${tunerCenterY}px`,
                                transition: 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'
                            }}
                        >
                            <line
                                x1="300"
                                y1="70"
                                x2="300"
                                y2="40"
                                stroke="#FF3F5A"
                                strokeWidth="2.2"
                                strokeLinecap="butt"
                            />
                        </g>

                        {/* Static Target Highlight Wedge (Fixed at top center 12 o'clock / 0 degrees) */}
                        <g opacity={showHighlight ? 1 : 0} style={{ transition: 'opacity 0.3s ease' }}>
                            <path
                                d={getWedgePath(300, tunerCenterY, 155, -15, 15)}
                                fill="none"
                                stroke="#F4F3EC"
                                strokeWidth="110"
                                strokeLinecap="butt"
                            />
                        </g>

                        {/* Rotating Note Circle Group */}
                        <g 
                            style={{ 
                                transform: `rotate(${circleRotation}deg)`, 
                                transformOrigin: `300px ${tunerCenterY}px`,
                                transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            className="overflow-visible"
                        >
                            {/* Outer boundary circle for Note Ring */}
                            <circle
                                cx="300"
                                cy={tunerCenterY}
                                r="210"
                                stroke="#EAEAEA"
                                strokeWidth="1.5"
                                fill="none"
                            />

                            {/* Inner boundary circle for Note Ring */}
                            <circle
                                cx="300"
                                cy={tunerCenterY}
                                r="100"
                                stroke="#EAEAEA"
                                strokeWidth="1"
                                fill="none"
                            />

                            {/* Tiny mechanical ticks inside the Note Ring outer boundary */}
                            {Array.from({ length: 120 }).map((_, idx) => {
                                const angle = idx * 3; // 360 degrees / 120 ticks = 3 degrees spacing
                                const start = getPolarCoord(300, tunerCenterY, 203, angle);
                                const end = getPolarCoord(300, tunerCenterY, 210, angle);

                                return (
                                    <line
                                        key={`inner-tick-${idx}`}
                                        x1={start.x}
                                        y1={start.y}
                                        x2={end.x}
                                        y2={end.y}
                                        stroke="#EAEAEA"
                                        strokeWidth="1"
                                    />
                                );
                            })}

                            {/* Circular Note Labels (Rotating with the circle, but counter-rotated individually to stay upright) */}
                            {tunerNotes.map((note, idx) => {
                                const angle = -90 + idx * 30; // Clockwise starting from 'A' at 9 o'clock (-90 degrees)
                                const pos = getPolarCoord(300, tunerCenterY, 155, angle);
                                const isActive = (tunerActive || savedTuning) && currentActiveNote === note;

                                return (
                                    <text
                                        key={note}
                                        x={pos.x}
                                        y={pos.y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        style={{
                                            transform: `rotate(${-circleRotation}deg)`,
                                            transformOrigin: `${pos.x}px ${pos.y}px`,
                                            transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        className={`text-[21px] sm:text-[25px] font-bold font-sans transition-colors duration-300 ${
                                            isActive ? 'text-black fill-black font-extrabold' : 'text-stone-400 fill-stone-400'
                                        }`}
                                    >
                                        {displayLabels[idx].length > 1 ? (
                                            <>
                                                {displayLabels[idx][0]}
                                                <tspan dy="-6" dx="0.5" fontSize="55%" fontWeight="bold">
                                                    {displayLabels[idx][1]}
                                                </tspan>
                                            </>
                                        ) : (
                                            displayLabels[idx]
                                        )}
                                    </text>
                                );
                            })}
                        </g>

                        {/* Gradient Fade Overlay inside SVG (Fades the ticks and rotating notes underneath the center hub) */}
                        <rect
                            x="0"
                            y="215"
                            width="600"
                            height="80"
                            fill="url(#tunerBottomFade)"
                            className="pointer-events-none"
                        />

                        {/* Static Center Circle Mask (Blocks note labels behind it, defines the gap) */}
                        <circle
                            cx="300"
                            cy={tunerCenterY}
                            r="100"
                            fill="#FFFFFF"
                            stroke="#EAEAEA"
                            strokeWidth="1"
                        />

                        {/* Center Circle Hub Button (Interactive 4-state button with 10px gap) */}
                        <g 
                            onClick={handleTunerButtonClick} 
                            className="cursor-pointer group"
                        >
                            {/* Circle Background */}
                            <circle
                                cx="300"
                                cy={tunerCenterY}
                                r="90"
                                fill={
                                    tunerSavingState === 'saved'
                                        ? '#10B981' // emerald-500
                                        : (tunerActive || tunerSavingState === 'saving')
                                            ? '#1C1917' // dark stone / black
                                            : '#FFFFFF' // white
                                }
                                stroke={
                                    tunerSavingState === 'saved'
                                        ? '#059669'
                                        : (tunerActive || tunerSavingState === 'saving')
                                            ? '#1C1917'
                                            : '#EAEAEA'
                                }
                                strokeWidth="1"
                                className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)] group-hover:drop-shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-all duration-300"
                            />

                            {/* Render Content Based on State */}
                            {tunerSavingState === 'saving' ? (
                                // State 3: Saving (perfectly aligned text)
                                <g className="pointer-events-none select-none animate-in fade-in duration-200">
                                    {/* Spinner - slightly larger */}
                                    <circle
                                        cx="250"
                                        cy={tunerContentY}
                                        r="8.5"
                                        fill="none"
                                        stroke="#FFFFFF"
                                        strokeWidth="2.2"
                                        strokeDasharray="26"
                                        className="animate-spin"
                                        style={{ transformOrigin: `250px ${tunerContentY}px` }}
                                    />
                                    <text
                                        x="270"
                                        y={tunerContentY + 1.5}
                                        dominantBaseline="middle"
                                        textAnchor="start"
                                        className="text-[20px] sm:text-[22px] font-normal fill-white font-sans tracking-tight"
                                    >
                                        Saving...
                                    </text>
                                </g>
                            ) : tunerSavingState === 'saved' ? (
                                // State 4: Saved (perfectly aligned text)
                                <g className="pointer-events-none select-none animate-in zoom-in-95 duration-200">
                                    {/* Sharp Regular-weight Checkmark - slightly larger */}
                                    <path
                                        d={`M 256 ${tunerContentY - 4} L 263 ${tunerContentY + 4} L 275 ${tunerContentY - 11}`}
                                        fill="none"
                                        stroke="#FFFFFF"
                                        strokeWidth="2"
                                        strokeLinecap="butt"
                                        strokeLinejoin="miter"
                                    />
                                    <text
                                        x="282"
                                        y={tunerContentY + 1.5}
                                        dominantBaseline="middle"
                                        textAnchor="start"
                                        className="text-[20px] sm:text-[22px] font-normal fill-white font-sans tracking-tight"
                                    >
                                        Saved
                                    </text>
                                </g>
                            ) : tunerActive ? (
                                // State 2: Active / Tuning - Centered Note or 'Tuning...' message in regular white font
                                <g className="pointer-events-none select-none">
                                    {!tunerNote || tunerNote === '--' || tunerNote === '' ? (
                                        <text
                                            x="300"
                                            y={tunerContentY}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="text-[20px] sm:text-[22px] font-normal fill-stone-300 font-sans tracking-tight animate-pulse"
                                        >
                                            Tuning...
                                        </text>
                                    ) : (
                                        <>
                                            {/* Green Pulsing Dot (Closer to the letter on the left) */}
                                            <circle
                                                cx={currentActiveNote.length > 1 ? 260 : 272}
                                                cy={tunerContentY}
                                                r="5.5"
                                                fill="#10B981"
                                                className="animate-pulse"
                                            />
                                            {/* Large Note Name (Perfecty centered in the middle of the circle) */}
                                            <text
                                                x="300"
                                                y={tunerContentY}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="text-[46px] sm:text-[50px] font-black fill-white font-sans tracking-tight"
                                            >
                                                {currentActiveNote.length > 1 ? (
                                                    <>
                                                        {currentActiveNote[0]}
                                                        <tspan dy="-12" dx="1" fontSize="50%" fontWeight="black">
                                                            {currentActiveNote[1]}
                                                        </tspan>
                                                    </>
                                                ) : (
                                                    currentActiveNote
                                                )}
                                            </text>
                                            {/* Frequency (Smaller, closer to the right side of the letter, and a little bit down) */}
                                            <text
                                                x="318"
                                                y={tunerContentY + 9}
                                                textAnchor="start"
                                                dominantBaseline="middle"
                                                className="text-[11.5px] sm:text-[12.5px] font-bold fill-stone-400 font-sans tracking-tight"
                                            >
                                                {tunerFreq} HZ
                                            </text>
                                        </>
                                    )}
                                </g>
                            ) : savedTuning ? (
                                // Saved Result State - Stacked layout (Icon on top, value below)
                                <g 
                                    className="pointer-events-none select-none group-hover:scale-[1.02] transition-transform duration-300"
                                    style={{ transformOrigin: `300px ${tunerContentY}px` }}
                                >
                                    {/* Slightly bigger repeat icon on top, centered horizontally */}
                                    <g transform={`translate(289, ${tunerContentY - 28})`}>
                                        <path
                                            d="M 17.5 7.5 A 7 7 0 1 0 18 11.5"
                                            fill="none"
                                            stroke="#57534E"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M 18 3.5 L 18 8 L 13.5 8"
                                            fill="none"
                                            stroke="#57534E"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </g>
                                    {/* Saved Value Text below it, centered horizontally */}
                                    <text
                                        x="300"
                                        y={tunerContentY + 15}
                                        dominantBaseline="middle"
                                        textAnchor="middle"
                                        className="text-[14.5px] sm:text-[15.5px] font-medium fill-stone-500 font-sans tracking-tight"
                                    >
                                        {savedTuning.note} • {savedTuning.freq} Hz
                                    </text>
                                </g>
                            ) : (
                                // State 1: Start (Idle) - Dot and Text perfectly centered horizontally together
                                <g 
                                    className="pointer-events-none select-none group-hover:scale-[1.02] transition-transform duration-300"
                                    style={{ transformOrigin: `300px ${tunerContentY}px` }}
                                >
                                    {/* Lighter grey dot */}
                                    <circle
                                        cx="267"
                                        cy={tunerContentY}
                                        r="6"
                                        fill="#D6D3D1"
                                    />
                                    {/* Text "Start" */}
                                    <text
                                        x="284"
                                        y={tunerContentY}
                                        dominantBaseline="middle"
                                        textAnchor="start"
                                        className="text-[21px] sm:text-[23px] font-medium fill-stone-600 font-sans tracking-tight"
                                    >
                                        Start
                                    </text>
                                </g>
                            )}
                        </g>
                    </svg>
                </div>
            </div>
        );
    };

    const renderTapTempo = () => {
        return (
            <div 
                className="flex flex-col gap-4.5 w-full animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                {/* Main Tap Tempo Box (Larger size, beige background, black text) */}
                <div
                    onClick={(e) => handleTapTempo(e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className="w-full h-80 sm:h-96 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-in-out active:scale-[0.99] select-none py-8 shadow-sm border-none relative overflow-hidden"
                    style={{ backgroundColor: tapTempoBgColor }}
                >
                    <span className="text-[110px] sm:text-[130px] md:text-[150px] font-black text-black select-none leading-none tracking-tight">
                        {metronomeBpm}
                    </span>
                    <span className="text-[15px] sm:text-[17px] font-extrabold text-black uppercase tracking-[0.25em] mt-1 select-none">
                        BPM
                    </span>

                    {/* Integrated Metronome Control Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering tap tempo
                            setIsMetronomePlaying(!isMetronomePlaying);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        className={`mt-8 px-6 py-2.5 rounded-full text-[13px] sm:text-[15px] font-extrabold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm select-none flex items-center gap-2 border-none ${
                            isMetronomePlaying 
                                ? 'bg-black text-white hover:bg-stone-900' 
                                : 'bg-white text-black hover:bg-stone-50'
                        }`}
                        type="button"
                    >
                        {isMetronomePlaying ? (
                            <>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                <span>Stop Metronome</span>
                            </>
                        ) : (
                            <>
                                <span className="w-2.5 h-2.5 rounded-full bg-stone-300 shrink-0" />
                                <span>Start Metronome</span>
                            </>
                        )}
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
            <div className="flex flex-col gap-5 w-full">
                <form onSubmit={handleLexiconSearch} className="flex gap-3">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Type a word to search (e.g. sky, love, time)..."
                            value={lexiconWord}
                            onChange={(e) => setLexiconWord(e.target.value)}
                            className="w-full px-6 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-[16.5px] font-sans placeholder:text-stone-400 font-semibold focus:outline-none focus:border-stone-400"
                        />
                        {lexiconLoading && (
                            <div className="absolute right-4 top-4.5 w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>
                    <select
                        value={lexiconMode}
                        onChange={(e: any) => setLexiconMode(e.target.value)}
                        className="px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-[16.5px] font-bold text-stone-700 focus:outline-none focus:border-stone-400 cursor-pointer"
                    >
                        <option value="rhyme">Perfect Rhyme</option>
                        <option value="near">Near Rhyme</option>
                        <option value="synonym">Synonyms</option>
                    </select>
                </form>

                {lexiconResults.length === 0 ? (
                    <div className="bg-stone-50 border border-stone-150 rounded-2xl p-8.5 text-center select-none">
                        <p className="text-[16.5px] text-stone-400 font-medium">Type a word to search for rhymes or synonyms.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5 max-h-[268px] overflow-y-auto mt-1.5 pr-1 no-scrollbar">
                        {Object.keys(groupedBySyllables).map(sylKey => {
                            const syl = parseInt(sylKey);
                            const words = groupedBySyllables[syl];
                            return (
                                <div key={syl} className="flex flex-col gap-2">
                                    <span className="text-[12.5px] text-stone-450 font-bold uppercase tracking-wider select-none">
                                        {syl} {syl === 1 ? 'Syllable' : 'Syllables'}
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {words.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    insertTextAtCursor(item.word + ' ');
                                                    navigator.clipboard.writeText(item.word).catch(console.error);
                                                }}
                                                className="px-3.5 py-1.5 bg-stone-50 hover:bg-stone-900 border border-stone-200 hover:border-stone-900 rounded-xl text-[16.5px] font-semibold text-stone-800 hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
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
        const expandedCard = expandedCardId ? cards.find(c => c.id === expandedCardId) : null;

        const activeCardForAnswers = expandedCard || activeCard;
        const cardAnswers = (inspirationAnswers[noteKey] || {})[activeCardForAnswers.id] || ['', '', '', '', ''];

        const cardTransition = { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 };

        const handlePrevCard = () => {
            inspirationSwiperRef.current?.slidePrev();
        };

        const handleNextCard = () => {
            inspirationSwiperRef.current?.slideNext();
        };

        const handleSaveAnswer = (cardId: string, qIdx: number, val: string) => {
            const noteAnswers = { ...(inspirationAnswers[noteKey] || {}) };
            const cardAnswersCopy = [...(noteAnswers[cardId] || ['', '', '', '', ''])];
            cardAnswersCopy[qIdx] = val;
            noteAnswers[cardId] = cardAnswersCopy;

            const updated = {
                ...inspirationAnswers,
                [noteKey]: noteAnswers
            };
            setInspirationAnswers(updated);
            localStorage.setItem('veinote-inspiration-answers', JSON.stringify(updated));
        };

        const handleCopySummaryToCanvas = () => {
            if (!expandedCard) return;
            const answers = cardAnswers;
            let textToInsert = `\n\n${expandedCard.title.toUpperCase()}\n`;
            let addedAny = false;
            for (let i = 0; i < 5; i++) {
                const ans = answers[i] || '';
                if (ans.trim() !== '') {
                    textToInsert += `${ans}\n`;
                    addedAny = true;
                }
            }
            if (addedAny) {
                insertTextAtCursor(textToInsert);
            }
            setExpandedCardId(null);
            setInspirationQuestionIndex(0);
            setShowToolsPanel(false);
        };

        return (
            <div className="relative w-full max-w-[856px] min-h-[280px] sm:min-h-[340px] md:min-h-[400px] flex items-center justify-center overflow-visible">
                <motion.div
                    key="swiper-view"
                    animate={{ 
                        opacity: expandedCardId ? 0 : 1, 
                        scale: expandedCardId ? 0.95 : 1,
                    }}
                    style={{
                        pointerEvents: expandedCardId ? 'none' : 'auto'
                    }}
                    transition={cardTransition}
                    className="flex justify-center items-center w-full select-none py-4 sm:py-8"
                >
                            <div className="w-[90vw] sm:w-[460px] md:w-[580px] h-[280px] sm:h-[320px] md:h-[400px] flex items-center justify-center overflow-visible">
                                <Swiper
                                    initialSlide={currentCardIndex}
                                    effect={'cards'}
                                    grabCursor={true}
                                    modules={[EffectCards]}
                                    cardsEffect={{
                                        slideShadows: false
                                    }}
                                    onSwiper={(swiper) => {
                                        inspirationSwiperRef.current = swiper;
                                    }}
                                    onSlideChange={(swiper) => {
                                        setCurrentCardIndex(swiper.activeIndex);
                                    }}
                                    className="w-[80vw] sm:w-[400px] md:w-[520px] h-[220px] sm:h-[270px] md:h-[340px]"
                                    style={{ overflow: 'visible' }}
                                >
                                    {cards.map((card, idx) => (
                                        <SwiperSlide key={card.id} className="rounded-[24px] sm:rounded-[32px] md:rounded-[38px]" style={{ overflow: 'visible' }}>
                                            <motion.div
                                                animate={idx === currentCardIndex ? swiperWiggleControls : undefined}
                                                className={`relative w-full h-full bg-stone-900 cursor-pointer select-none rounded-[24px] sm:rounded-[32px] md:rounded-[38px] overflow-hidden border border-white/10 transition-shadow duration-300 ${
                                                    idx === currentCardIndex 
                                                        ? 'shadow-[0_20px_45px_rgba(0,0,0,0.25)]' 
                                                        : 'shadow-[0_4px_12px_rgba(0,0,0,0.12)]'
                                                }`}
                                                onClick={() => {
                                                    setCurrentCardIndex(idx);
                                                    setExpandedCardId(card.id);
                                                    setInspirationQuestionIndex(0);
                                                }}
                                            >
                                                {/* Background Image */}
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center"
                                                    style={{
                                                        backgroundImage: `url(${card.bgImage})`,
                                                    }}
                                                >
                                                    {/* Blurry Vignette Overlay */}
                                                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                                        <div 
                                                            className="absolute inset-0 backdrop-blur-[3px]" 
                                                            style={{
                                                                maskImage: 'radial-gradient(circle at center, transparent 40%, black 100%)',
                                                                WebkitMaskImage: 'radial-gradient(circle at center, transparent 40%, black 100%)'
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Soft gradient overlay on top of background image to make sure glass overlay stands out */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-stone-955/25 via-transparent to-transparent pointer-events-none" />

                                                {/* Floating Glassy Overlay Container */}
                                                <div 
                                                    className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5 bg-white/20 backdrop-blur-[50px] rounded-[18px] sm:rounded-[24px] md:rounded-[30px] pt-3 pb-4 md:pt-4 md:pb-6 pl-6 pr-16 sm:pl-8 sm:pr-20 md:pl-10 md:pr-24 flex flex-col justify-center text-left font-sans select-none min-w-0 shadow-lg hover:bg-white/25 transition-all z-[10]"
                                                >
                                                    <div className="flex flex-col gap-1 md:gap-2">
                                                        <h4 
                                                            className="text-[17px] sm:text-[21px] md:text-[26px] font-medium text-[#F8F8F4] tracking-[-0.01em] leading-tight line-clamp-1"
                                                        >
                                                            {card.title}
                                                        </h4>
                                                        <span 
                                                            className="text-[11px] sm:text-[13px] md:text-[15px] font-normal text-[#F8F8F4]/80 tracking-[-0.01em] leading-tight"
                                                        >
                                                            {card.category}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Expand arrow */}
                                                    <div className="absolute right-5 sm:right-7 md:right-9 top-1/2 -translate-y-1/2 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0">
                                                        <svg viewBox="0 0 24 24" fill="none" className="w-5.5 h-5.5 sm:w-7 sm:h-7 md:w-[30px] md:h-[30px] text-[#F8F8F4]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M15 3h6v6"/>
                                                            <path d="M9 21H3v-6"/>
                                                            <path d="M21 3l-7 7"/>
                                                            <path d="M3 21l7-7"/>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            </div>
                </motion.div>

                <AnimatePresence>
                    {expandedCard && (
                        <motion.div
                            key={`expanded-${expandedCard.id}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={cardTransition}
                            className="absolute top-[-30px] sm:top-[-45px] md:top-[-60px] bottom-[30px] sm:bottom-[45px] md:bottom-[60px] left-0 right-0 m-auto z-40 w-[92vw] sm:w-[680px] md:w-[800px] h-[480px] sm:h-[520px] md:h-[560px] rounded-[24px] sm:rounded-[32px] md:rounded-[38px] bg-stone-900 overflow-hidden shadow-2xl border border-white/10 select-none"
                        >
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{
                                        backgroundImage: `url(${expandedCard.bgImage})`,
                                    }}
                                >
                                    {/* Blurry Vignette Overlay */}
                                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                        <div 
                                            className="absolute inset-0 backdrop-blur-[3px]" 
                                            style={{
                                                maskImage: 'radial-gradient(circle at center, transparent 40%, black 100%)',
                                                WebkitMaskImage: 'radial-gradient(circle at center, transparent 40%, black 100%)'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div
                                    className="absolute inset-3 sm:inset-5 md:inset-6 bg-black/40 backdrop-blur-[50px] rounded-[18px] sm:rounded-[24px] md:rounded-[30px] p-6 sm:p-10 flex flex-col justify-between border border-white/5 z-[10]"
                                >
                                    {inspirationQuestionIndex === 5 ? (
                                        // Summary View
                                        <div className="w-full flex-1 flex flex-col justify-between h-full text-left">
                                            {/* Header */}
                                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                                <div>
                                                    <h4 
                                                        className="text-[16px] sm:text-[20px] md:text-[22px] font-medium text-white tracking-tight leading-tight"
                                                    >
                                                        {expandedCard.title}
                                                    </h4>
                                                    <span 
                                                        className="text-[11px] sm:text-[13px] md:text-[14px] text-white/40 font-normal uppercase tracking-wider block mt-0.5"
                                                    >
                                                        {expandedCard.category}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setExpandedCardId(null);
                                                        setInspirationQuestionIndex(0);
                                                    }}
                                                    className="text-white/40 hover:text-white cursor-pointer transition-all shrink-0 p-1 hover:bg-white/5 rounded-full"
                                                    type="button"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5.5 h-5.5 sm:w-7 sm:h-7">
                                                        <path d="M4 14h6v6M10 14l-7 7M20 10h-6V4M14 10l7-7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Answers */}
                                            <div className="flex-1 overflow-y-auto my-6 pr-4 inspiration-scroll-container flex flex-col gap-6">
                                                <style>{`
                                                    .inspiration-scroll-container::-webkit-scrollbar {
                                                        width: 4px;
                                                        height: 0px;
                                                    }
                                                    .inspiration-scroll-container::-webkit-scrollbar-track {
                                                        background: transparent;
                                                    }
                                                    .inspiration-scroll-container::-webkit-scrollbar-thumb {
                                                        background: rgba(255, 255, 255, 0.2);
                                                        border-radius: 9999px;
                                                    }
                                                    .inspiration-scroll-container::-webkit-scrollbar-button {
                                                        display: none;
                                                    }
                                                `}</style>
                                                {expandedCard.questions.map((q, qIdx) => {
                                                    const ans = cardAnswers[qIdx] || '';
                                                    return (
                                                        <div key={qIdx} className="flex flex-col gap-1 text-left">
                                                            <span className="text-[12px] sm:text-[13.5px] font-normal text-white/50">
                                                                {q}
                                                            </span>
                                                            <p className="text-[18px] sm:text-[22px] md:text-[24px] font-medium text-[#8FFFA0] leading-relaxed break-words">
                                                                {ans.trim() !== '' ? ans : '[No answer response written]'}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Actions - Text only, no containers */}
                                            <div className="flex items-center justify-between border-t border-white/10 pt-5 mt-auto select-none">
                                                <button
                                                    onClick={() => setInspirationQuestionIndex(4)}
                                                    className="text-white/60 hover:text-white transition-colors cursor-pointer text-[15px] sm:text-[17px] font-medium bg-transparent border-none p-0 outline-none"
                                                    type="button"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    onClick={handleCopySummaryToCanvas}
                                                    className="text-[#8FFFA0] hover:text-[#7ce48d] transition-colors cursor-pointer text-[15px] sm:text-[17px] font-semibold bg-transparent border-none p-0 outline-none"
                                                    type="button"
                                                >
                                                    Add to Canvas
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Questions slider
                                        <div className="w-full flex-1 flex flex-col justify-between h-full">
                                            {/* Header */}
                                            <div className="flex items-start justify-between select-none">
                                                <div className="flex flex-col gap-0.5 text-left">
                                                    <h4 
                                                        className="text-[16px] sm:text-[20px] md:text-[22px] font-medium text-white tracking-tight leading-tight"
                                                    >
                                                        {expandedCard.title}
                                                    </h4>
                                                    <span 
                                                        className="text-[11px] sm:text-[13px] md:text-[14px] text-white/40 font-normal uppercase tracking-wider block mt-0.5"
                                                    >
                                                        {expandedCard.category}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setExpandedCardId(null);
                                                        setInspirationQuestionIndex(0);
                                                    }}
                                                    className="text-white/40 hover:text-white cursor-pointer transition-all shrink-0 p-1 hover:bg-white/5 rounded-full"
                                                    type="button"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5.5 h-5.5 sm:w-7 sm:h-7">
                                                        <path d="M4 14h6v6M10 14l-7 7M20 10h-6V4M14 10l7-7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Middle Content */}
                                            <div className="flex-1 flex flex-col justify-center text-left my-4 md:my-6 relative">
                                                <h3 className="text-[20px] sm:text-[28px] md:text-[34px] font-medium tracking-tight text-white leading-snug max-w-[90%]">
                                                    {expandedCard.questions[inspirationQuestionIndex]}
                                                </h3>
                                                <div className="relative flex-1 w-full flex mt-4">
                                                    <style>{`
                                                        .inspiration-textarea-scroll::-webkit-scrollbar {
                                                            width: 4px;
                                                            height: 0px;
                                                        }
                                                        .inspiration-textarea-scroll::-webkit-scrollbar-track {
                                                            background: transparent;
                                                        }
                                                        .inspiration-textarea-scroll::-webkit-scrollbar-thumb {
                                                            background: rgba(255, 255, 255, 0.2);
                                                            border-radius: 9999px;
                                                        }
                                                        .inspiration-textarea-scroll::-webkit-scrollbar-button {
                                                            display: none;
                                                        }
                                                    `}</style>
                                                    <textarea
                                                        key={inspirationQuestionIndex}
                                                        ref={inspirationTextareaRef}
                                                        value={cardAnswers[inspirationQuestionIndex] || ''}
                                                        onChange={(e) => {
                                                            handleSaveAnswer(expandedCard.id, inspirationQuestionIndex, e.target.value);
                                                        }}
                                                        autoFocus
                                                        className="w-full flex-1 bg-transparent border-none text-[26px] sm:text-[36px] md:text-[44px] text-[#8FFFA0] font-sans font-normal caret-[#8FFFA0] focus:outline-none focus:ring-0 resize-none leading-relaxed py-2 pr-4 inspiration-textarea-scroll h-full min-h-[140px]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Bottom Nav: Back  X/5  Next */}
                                            <div className="flex items-center justify-center gap-4 mt-2 select-none">
                                                <div className="w-24 text-right">
                                                    <button
                                                        onClick={() => inspirationQuestionIndex > 0 && setInspirationQuestionIndex(prev => prev - 1)}
                                                        className={`font-sans font-medium text-[16px] sm:text-[20px] transition-all cursor-pointer ${
                                                            inspirationQuestionIndex > 0 
                                                                ? 'text-white/80 hover:text-white' 
                                                                : 'text-white/20 cursor-not-allowed'
                                                        }`}
                                                        disabled={inspirationQuestionIndex === 0}
                                                        type="button"
                                                    >
                                                        Back
                                                    </button>
                                                </div>
                                                <span className="font-sans font-light text-[13px] sm:text-[16px] text-white/40 tracking-[0.12em] select-none text-center w-16">
                                                    {inspirationQuestionIndex + 1}/5
                                                </span>
                                                <div className="w-24 text-left">
                                                    <button
                                                        onClick={() => setInspirationQuestionIndex(prev => prev + 1)}
                                                        className="font-sans font-medium text-[16px] sm:text-[20px] text-white hover:text-[#8FFFA0] transition-colors cursor-pointer"
                                                        type="button"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence>
            </div>
        );
    };

    const renderToolsPanel = () => {

        if (activeToolTab === 'inspiration') {
            return (
                <div 
                    className="w-full max-w-[856px] mb-3 sm:mb-5 flex flex-col items-center justify-center pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    {renderInspirationTools()}
                </div>
            );
        }

        return (
            <div 
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onDragStart={(e) => e.stopPropagation()}
                onDragOver={(e) => e.stopPropagation()}
                onDrop={(e) => e.stopPropagation()}
                className={`w-full ${
                    activeToolTab === 'studio' ? 'max-w-full' : 'max-w-[856px]'
                } bg-white border border-stone-200/80 rounded-[24px] sm:rounded-[36px] md:rounded-[45px] p-4 sm:p-6 md:p-7 mb-3 sm:mb-5 flex flex-col shadow-[0_15px_45px_rgba(0,0,0,0.06)] pointer-events-auto transition-all ${
                    activeToolTab === 'tuner' ? 'gap-0' : 'gap-4 sm:gap-6'
                }`}
            >
                {/* Content area based on active tab */}
                <div className="w-full">
                    {activeToolTab === 'tuner' && renderGuitarTuner()}
                    {activeToolTab === 'tempo' && renderTapTempo()}
                    {activeToolTab === 'studio' && renderDemoStudio()}
                </div>

                {/* Tab row navigation */}
                <div className="w-full bg-[#F9F9F9] rounded-[20px] md:rounded-[34px] p-2 shadow-[inset_0_0_14px_rgba(0,0,0,0.05)] flex items-center justify-between select-none relative z-10">
                    <button
                        onClick={() => setActiveToolTab('tuner')}
                        className={`flex-1 py-3 md:py-4.5 lg:py-5.5 text-center text-[12.5px] sm:text-[16px] md:text-[20px] lg:text-[24px] font-medium tracking-tight transition-all duration-200 cursor-pointer ${
                            activeToolTab === 'tuner'
                                ? 'bg-white text-stone-800 rounded-[15px] md:rounded-[28px] shadow-[0_0_14px_rgba(0,0,0,0.05)] opacity-100 font-medium px-3'
                                : 'text-stone-600 opacity-60 hover:opacity-75 bg-transparent px-2'
                        }`}
                        type="button"
                    >
                        Guitar tuner
                    </button>
                    <button
                        onClick={() => setActiveToolTab('tempo')}
                        className={`flex-1 py-3 md:py-4.5 lg:py-5.5 text-center text-[12.5px] sm:text-[16px] md:text-[20px] lg:text-[24px] font-medium tracking-tight transition-all duration-200 cursor-pointer ${
                            activeToolTab === 'tempo'
                                ? 'bg-white text-stone-800 rounded-[15px] md:rounded-[28px] shadow-[0_0_14px_rgba(0,0,0,0.05)] opacity-100 font-medium px-3'
                                : 'text-stone-600 opacity-60 hover:opacity-75 bg-transparent px-2'
                        }`}
                        type="button"
                    >
                        Tap tempo
                    </button>
                    <button
                        onClick={() => setActiveToolTab('studio')}
                        className={`flex-1 py-3 md:py-4.5 lg:py-5.5 text-center text-[12.5px] sm:text-[16px] md:text-[20px] lg:text-[24px] font-medium tracking-tight transition-all duration-200 cursor-pointer ${
                            activeToolTab === 'studio'
                                ? 'bg-white text-stone-800 rounded-[15px] md:rounded-[28px] shadow-[0_0_14px_rgba(0,0,0,0.05)] opacity-100 font-medium px-3'
                                : 'text-stone-600 opacity-60 hover:opacity-75 bg-transparent px-2'
                        }`}
                        type="button"
                    >
                        Demo studio
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
                setExpandedCardId(null);
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
                if (expandedCardId) {
                    setExpandedCardId(null);
                } else {
                    setShowToolsPanel(false);
                }
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
                            className="bg-transparent border-none outline-none font-medium text-xl md:text-[22px] text-stone-400 placeholder:text-stone-300 focus:text-stone-855 transition-colors cursor-text select-text w-full min-w-0"
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

                        {/* Publish to Community button */}
                        {!isCanvasPreview && selectedNoteId && activeNote && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareToCommunity();
                                }}
                                disabled={shareStatus === 'sharing'}
                                className={`relative flex items-center gap-2 px-5 py-1.5 border rounded-full text-[18px] font-sans font-medium tracking-wide transition-all cursor-pointer active:scale-95 shadow-3xs shrink-0 select-none animate-fade-in
                                    ${shareStatus === 'idle'
                                        ? 'bg-stone-100/65 border-stone-200/40 text-stone-700 hover:bg-stone-200/50 hover:text-stone-900'
                                        : 'bg-emerald-600 border-emerald-600 text-stone-900 hover:bg-emerald-700 hover:border-emerald-700'
                                    }
                                `}
                                title={shareStatus === 'shared' ? 'Go to community Connect feed' : 'Publish this song to Connect community feed'}
                            >
                                {shareStatus === 'idle' && (
                                    <>
                                        <Upload size={18} className="stroke-[1.6]" />
                                        <span>Publish</span>
                                    </>
                                )}
                                {shareStatus === 'sharing' && (
                                    <>
                                        <Loader2 size={18} className="animate-spin stroke-[1.6]" />
                                        <span>Publishing</span>
                                    </>
                                )}
                                {shareStatus === 'shared' && (
                                    <>
                                        <span>Check in Connect</span>
                                        <ArrowRight size={18} className="stroke-[1.6]" />
                                    </>
                                )}
                            </button>
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
                                                className={`block-wrapper w-full relative ${
                                                    block.type === 'group' ? 'my-8' : 'my-2.5'
                                                }`}
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
                                                                className={`verse-group-container border border-dashed rounded-[20px] p-8 pt-12 pb-8 relative flex flex-col gap-3.5 min-h-[110px] transition-all duration-300 cursor-grab active:cursor-grabbing group/verse-group ${
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
                                                                    {editingGroupId === block.groupId ? (
                                                                        <div className="bg-white border border-stone-200/80 text-stone-700 px-3.5 py-0.5 text-[11.5px] font-semibold rounded-full flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] h-[25px] w-fit pointer-events-auto cursor-default z-30">
                                                                            <div className="relative inline-flex items-center min-w-[20px] h-full">
                                                                                {/* Invisible shadow span that mirrors input value for exact layout sizing */}
                                                                                <span className="invisible font-semibold text-[11.5px] text-stone-700 whitespace-pre p-0 select-none block h-fit leading-none">
                                                                                    {renameGroupName || 'Rename...'}
                                                                                </span>
                                                                                <input 
                                                                                    type="text"
                                                                                    autoFocus
                                                                                    value={renameGroupName}
                                                                                    onChange={(e) => setRenameGroupName(e.target.value)}
                                                                                    onBlur={() => {
                                                                                        const val = renameGroupName.trim();
                                                                                        if (val !== '') {
                                                                                            handleRenameVerseGroup(block.groupId!, val);
                                                                                        }
                                                                                        setEditingGroupId(null);
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            const val = renameGroupName.trim();
                                                                                            if (val !== '') {
                                                                                                handleRenameVerseGroup(block.groupId!, val);
                                                                                            }
                                                                                            setEditingGroupId(null);
                                                                                        } else if (e.key === 'Escape') {
                                                                                            setEditingGroupId(null);
                                                                                        }
                                                                                    }}
                                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                                    onDragStart={(e) => e.stopPropagation()}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="absolute inset-0 bg-transparent border-none outline-none font-semibold text-[11.5px] text-stone-700 p-0 focus:ring-0 select-text cursor-text w-full h-full leading-none"
                                                                                    placeholder="Rename..."
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="group/badge bg-white border border-stone-200/60 text-stone-700 px-3.5 py-0.5 text-[11.5px] font-semibold rounded-full select-none flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] h-[25px] w-fit transition-all duration-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] pointer-events-auto cursor-default z-30 gap-0 hover:gap-2">
                                                                            {/* Current group name text */}
                                                                            <span 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingGroupId(block.groupId);
                                                                                    setRenameGroupName(block.groupName || '');
                                                                                }}
                                                                                className="cursor-pointer hover:text-stone-900 transition-colors shrink-0"
                                                                                title="Click to rename"
                                                                            >
                                                                                {formatGroupName(block.groupName)}
                                                                            </span>

                                                                            {/* Divider visible only when hovered */}
                                                                            <div className="w-0 overflow-hidden opacity-0 group-hover/badge:w-[1px] group-hover/badge:opacity-100 group-hover/badge:mx-1.5 transition-all duration-300 shrink-0">
                                                                                <div className="w-[1px] h-3 bg-stone-200" />
                                                                            </div>

                                                                            {/* Rename Button (Pencil Icon) */}
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingGroupId(block.groupId);
                                                                                    setRenameGroupName(block.groupName || '');
                                                                                }}
                                                                                className="w-0 overflow-hidden opacity-0 group-hover/badge:w-4 group-hover/badge:opacity-100 transition-all duration-300 hover:text-stone-850 text-stone-400 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 pointer-events-auto p-0 bg-transparent border-none outline-none"
                                                                                title="Rename Region"
                                                                            >
                                                                                <Pencil size={11} className="stroke-[2.5]" />
                                                                            </button>

                                                                            {/* Divider before delete */}
                                                                            <div className="w-0 overflow-hidden opacity-0 group-hover/badge:w-[1px] group-hover/badge:opacity-100 group-hover/badge:mx-1.5 transition-all duration-300 shrink-0">
                                                                                <div className="w-[1px] h-3 bg-stone-200" />
                                                                            </div>

                                                                            {/* Delete button */}
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteVerseGroup(block.groupId!);
                                                                                }}
                                                                                className="w-0 overflow-hidden opacity-0 group-hover/badge:w-4 group-hover/badge:opacity-100 transition-all duration-300 hover:text-red-500 text-stone-400 hover:scale-110 active:scale-95 font-bold cursor-pointer text-[13px] leading-none shrink-0 flex items-center justify-center h-3.5 pointer-events-auto p-0 bg-transparent border-none outline-none"
                                                                                title="Delete Region"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    )}

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
                                                                        <div className="text-center text-[15.5px] text-stone-300/75 py-4 italic select-none pointer-events-none">
                                                                            Drop your lyrics here
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
                                                                                        clickedTokenIndex={clickedTokenIndex}
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
                                                                    clickedTokenIndex={clickedTokenIndex}
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

                                {/* Centered Add Section Trigger with Hover Inline Expand */}
                                <div className="flex items-center justify-center mt-8 pb-2 w-full select-none z-30">
                                     <div className="group/add-menu py-3 px-6 pointer-events-auto flex items-center justify-center">
                                         <div className={`flex items-center bg-white border rounded-full h-9 shadow-3xs transition-all duration-300 ease-in-out overflow-hidden w-fit ${
                                             isAddMenuSticky 
                                                 ? "border-stone-300 delay-0" 
                                                 : "border-stone-200 hover:border-stone-300 delay-150 group-hover/add-menu:border-stone-300 group-hover/add-menu:delay-0"
                                         }`}>
                                             {/* Trigger Button: "+ Add" */}
                                             <div 
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     setIsAddMenuSticky(!isAddMenuSticky);
                                                 }}
                                                 className={`h-full px-5 flex items-center justify-center gap-1.5 font-sans font-bold text-[13px] cursor-pointer transition-colors duration-300 ease-in-out shrink-0 whitespace-nowrap ${isAddMenuSticky ? "text-stone-700" : "text-stone-400/80 group-hover/add-menu:text-stone-700"}`}
                                             >
                                                 <Plus size={15} className="stroke-[2.5]" />
                                                 <span>Add</span>
                                             </div>

                                             {/* Divider line (appears on hover or when sticky) */}
                                             <div className={`h-4.5 bg-stone-200 transition-all duration-300 ease-in-out ${isAddMenuSticky ? "w-[1px] delay-0" : "w-0 delay-150 group-hover/add-menu:w-[1px] group-hover/add-menu:delay-0"}`} />

                                             {/* Inline Options (expands horizontally on hover or when sticky as a sliding mask) */}
                                             <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${isAddMenuSticky ? "max-w-[226px] opacity-100 px-3 delay-0" : "max-w-0 opacity-0 delay-150 group-hover/add-menu:max-w-[226px] group-hover/add-menu:opacity-100 group-hover/add-menu:px-3 group-hover/add-menu:delay-0"}`}>
                                                 <div className="flex items-center gap-1 shrink-0 w-[202px] h-full pointer-events-auto">
                                                     <button
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             handleAddVerseGroup("Chorus");
                                                         }}
                                                         className="h-7 px-3.5 rounded-full text-[12px] font-medium text-stone-400/80 hover:text-stone-900 hover:font-semibold hover:bg-stone-100/80 transition-colors duration-100 ease-out cursor-pointer font-sans whitespace-nowrap active:scale-95 flex items-center justify-center pointer-events-auto"
                                                     >
                                                         Chorus
                                                     </button>
                                                     <button
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             handleAddVerseGroup("Verse");
                                                         }}
                                                         className="h-7 px-3.5 rounded-full text-[12px] font-medium text-stone-400/80 hover:text-stone-900 hover:font-semibold hover:bg-stone-100/80 transition-colors duration-100 ease-out cursor-pointer font-sans whitespace-nowrap active:scale-95 flex items-center justify-center pointer-events-auto"
                                                     >
                                                         Verse
                                                     </button>
                                                     <button
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             handleAddVerseGroup("Bridge");
                                                         }}
                                                         className="h-7 px-3.5 rounded-full text-[12px] font-medium text-stone-400/80 hover:text-stone-900 hover:font-semibold hover:bg-stone-100/80 transition-colors duration-100 ease-out cursor-pointer font-sans whitespace-nowrap active:scale-95 flex items-center justify-center pointer-events-auto"
                                                     >
                                                         Bridge
                                                     </button>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        ) : (
                            <div className="absolute inset-x-0 top-0 px-[10%] flex flex-col items-center justify-start pointer-events-none z-10 mt-6 sm:mt-8 md:mt-10">
                                <style>{`
                                    @keyframes caret-blink {
                                        0%, 100% { opacity: 1; }
                                        50% { opacity: 0; }
                                    }
                                    .animate-caret-blink {
                                        animation: caret-blink 1s ease-in-out infinite;
                                    }
                                `}</style>

                                <div className="relative w-full flex items-center justify-center">
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
                                        className="w-full px-4 md:px-8 xl:px-16 bg-transparent border-none outline-none resize-none font-sans text-[26px] md:text-[42px] font-light text-stone-855 text-center tracking-[-0.035em] focus:ring-0 focus:outline-none overflow-y-auto max-h-[140px] md:max-h-[200px] leading-[1.4] no-scrollbar pointer-events-auto relative py-0"
                                        placeholder=""
                                        style={{ 
                                            height: 'auto',
                                            minHeight: '1.4em',
                                            caretColor: contentVal === '' ? 'transparent' : 'black'
                                        }}
                                    />
                                    {contentVal === '' && (
                                        <div className="absolute inset-x-0 top-0 px-4 md:px-8 xl:px-16 flex items-center justify-center pointer-events-none select-none py-0">
                                            <span className="relative text-[26px] md:text-[42px] font-light text-stone-300/80 tracking-[-0.035em] leading-[1.4] text-center flex items-center justify-center">
                                                <span className="inline-block w-[2.5px] h-[32px] md:h-[44px] bg-black mr-2 animate-caret-blink shrink-0" />
                                                Type your lyrics...
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="w-full h-[1.5px] bg-stone-200/40 mt-1 mb-14 pointer-events-none select-none" />
                                
                                <div className="flex flex-col items-center pointer-events-auto w-full">
                                    <span className="font-sans text-[15px] sm:text-[17px] text-stone-400 font-normal tracking-normal pointer-events-none select-none mb-1">
                                        or just start with an inspiration
                                    </span>
                                    
                                    {/* Category name changes dynamically above the sliding cards */}
                                    <span className="font-sans italic text-[22px] sm:text-[24px] text-stone-550 lowercase mb-6 select-none animate-in fade-in duration-300" key={activeInspirationIndex}>
                                        {carouselCards[activeInspirationIndex % 8].title.toLowerCase()}
                                    </span>
                                    
                                    {/* Slider Viewport Container */}
                                    <div className="w-full max-w-[620px] overflow-hidden py-1 relative flex items-center justify-start">
                                        {/* Left gradient fade overlay */}
                                        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-20" />
                                        {/* Right gradient fade overlay */}
                                        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-20" />

                                        <div 
                                            className="flex gap-4 relative"
                                            style={{ 
                                                left: '50%',
                                                transform: `translateX(-${activeInspirationIndex * 236 + 110}px)`,
                                                                                transition: transitionEnabled ? 'transform 700ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
                                            }}
                                        >
                                            {Array.from({ length: 240 }).map((_, idx) => {
                                                const card = carouselCards[idx % 8];
                                                const isActive = idx === activeInspirationIndex;
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            setActiveInspirationIndex(idx);
                                                            const activeCardsList = inspirationCards.length > 0 ? inspirationCards : INSPIRATION_CARDS;
                                                            const cardIdx = activeCardsList.findIndex(c => c.id === card.id);
                                                            if (cardIdx !== -1) {
                                                                setCurrentCardIndex(cardIdx);
                                                                if (inspirationSwiperRef.current) {
                                                                    inspirationSwiperRef.current.slideTo(cardIdx, 0);
                                                                }
                                                            }
                                                            setExpandedCardId(card.id);
                                                            setInspirationQuestionIndex(0);
                                                            setActiveToolTab('inspiration');
                                                            setShowToolsPanel(true);
                                                        }}
                                                        className={`relative w-[220px] h-[125px] shrink-0 rounded-[20px] overflow-hidden border border-stone-200/40 shadow-[0_4px_12px_rgba(0,0,0,0.03)] cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95 group/card bg-stone-100
                                                            ${isActive 
                                                                ? 'opacity-100 scale-100 shadow-md' 
                                                                : 'opacity-35 scale-95 hover:opacity-50'
                                                            }
                                                        `}
                                                    >
                                                        {/* Background Image using eager loading WebP to prevent flicker */}
                                                        <img 
                                                            src={card.bgImage.replace('.png', '.webp')} 
                                                            alt={card.title}
                                                            loading="eager"
                                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                {/* Floating Suggestions Popover Overlay */}
                {clickedWord && popoverPosition && (
                    <>
                        <div 
                            className={`
                                suggestions-popover bg-white/95 backdrop-blur-md border border-stone-200/80 rounded-[28px] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.12)] z-40 flex flex-col gap-7 w-[540px] max-w-[95%] sm:w-[600px] md:w-[680px] animate-in fade-in zoom-in-95 duration-200
                                ${isMobile ? 'absolute bottom-4 left-4 right-4 shadow-2xl mx-auto' : 'absolute'}
                            `}
                            style={isMobile ? undefined : { 
                                top: `${popoverPosition.top}px`, 
                                left: `${popoverPosition.left}px`,
                                transform: 'translateX(-50%)' 
                            }}
                        >
                            {/* Header: Hovered word + compatibility */}
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11.5px] text-stone-400 font-bold uppercase tracking-wider select-none">Current Word</span>
                                    <span className="text-[13px] text-stone-500 font-semibold">{getCompatibilityScore(clickedWord, contentVal)}% Compatible</span>
                                </div>
                                <div className="flex items-center gap-3.5">
                                    <span className="text-2xl font-semibold text-stone-900">"{clickedWord}"</span>
                                    <div className="flex-grow h-2.5 bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: `${getCompatibilityScore(clickedWord, contentVal)}%` }} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-stone-100/80 my-1" />
                            
                            {/* 2-way segment selector for Rhyme Lexicon vs Synonyms */}
                            <div className="flex bg-stone-100/70 p-1 rounded-[14px] w-full select-none">
                                <button 
                                    onClick={() => setLexiconMode('rhyme')}
                                    className={`flex-1 text-[13px] font-bold py-2.5 rounded-[11px] transition-all cursor-pointer ${
                                        lexiconMode === 'rhyme' 
                                            ? 'bg-white text-stone-850 shadow-xs' 
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                    type="button"
                                >
                                    Rhyme Lexicon
                                </button>
                                <button 
                                    onClick={() => setLexiconMode('synonym')}
                                    className={`flex-1 text-[13px] font-bold py-2.5 rounded-[11px] transition-all cursor-pointer ${
                                        lexiconMode === 'synonym' 
                                            ? 'bg-white text-stone-850 shadow-xs' 
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                    type="button"
                                >
                                    Synonyms
                                </button>
                            </div>

                            {/* Search input inside the popover to refine query */}
                            <div className="relative mt-2">
                                <input
                                    type="text"
                                    placeholder="Search word..."
                                    value={lexiconWord}
                                    onChange={(e) => setLexiconWord(e.target.value)}
                                    className="w-full px-5 py-3 bg-stone-50 border border-stone-200 rounded-[16px] text-[15px] font-sans placeholder:text-stone-400 font-semibold focus:outline-none focus:border-stone-400"
                                />
                                {lexiconLoading && (
                                    <div className="absolute right-4 top-3.5 w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>

                            {/* Suggestions Alternatives */}
                            <div className="flex flex-col gap-2 mt-2">
                                {lexiconLoading && lexiconResults.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-stone-400 gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-stone-455" />
                                        <span className="text-xs font-medium">Searching lexicon...</span>
                                    </div>
                                ) : lexiconResults.length === 0 ? (
                                    <div className="text-center py-8 text-sm font-medium text-stone-400 select-none">
                                        No suggestions found.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                                        {(() => {
                                            const groupedBySyllables: Record<number, typeof lexiconResults> = {};
                                            lexiconResults.forEach(item => {
                                                const syl = item.syllables || 1;
                                                if (!groupedBySyllables[syl]) groupedBySyllables[syl] = [];
                                                groupedBySyllables[syl].push(item);
                                            });

                                            return Object.keys(groupedBySyllables).map(sylKey => {
                                                const syl = parseInt(sylKey);
                                                const words = groupedBySyllables[syl];
                                                return (
                                                    <div key={syl} className="flex flex-col gap-2">
                                                        <span className="text-[11px] text-stone-455 font-bold uppercase tracking-wider select-none">
                                                            {syl} {syl === 1 ? 'Syllable' : 'Syllables'}
                                                        </span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {words.map((item, idx) => {
                                                                const score = getCompatibilityScore(item.word, contentVal);
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSelectSuggestion(item.word);
                                                                        }}
                                                                        className="group flex items-center gap-2 px-5 py-2.5 bg-stone-50/50 hover:bg-stone-900 border border-stone-200/50 hover:border-stone-900 rounded-[14px] transition-all cursor-pointer shadow-2xs"
                                                                        title={`Click to select ${item.word}`}
                                                                        type="button"
                                                                    >
                                                                        <span className="text-[14px] font-medium text-stone-700 group-hover:text-white transition-colors">
                                                                            {item.word}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Viewport Backdrop Blur Overlay */}
                {showToolsPanel && (
                    <div 
                        onClick={() => setShowToolsPanel(false)}
                        className="fixed inset-0 bg-stone-950/10 backdrop-blur-[8px] z-50 cursor-pointer animate-in fade-in duration-300 pointer-events-auto"
                    />
                )}

                {/* Creative Tools Panel */}
                <div 
                    className={`absolute left-1/2 -translate-x-1/2 w-full ${
                        activeToolTab === 'studio' ? 'max-w-full md:max-w-[calc(100%-4rem)] xl:max-w-[1400px]' : 'max-w-[952px]'
                    } px-4 z-[60] transition-all duration-300 ease-out transform pointer-events-none ${
                        activeToolTab === 'inspiration' ? 'origin-[61%_bottom]' : 'origin-[53.5%_bottom]'
                    } ${
                        showToolsPanel
                            ? "scale-100 opacity-100"
                            : "scale-0 opacity-0"
                    } ${
                        (activeToolTab === 'inspiration' && !expandedCardId)
                            ? "bottom-[65px]"
                            : "bottom-[120px]"
                    }`}
                >
                    {renderToolsPanel()}
                </div>

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
                    <div className="flex items-center gap-4">
                        {/* Undo / Redo action buttons (shown only when there are unsaved steps in history) */}
                        {(undoStack.length > 0 || redoStack.length > 0) && (
                            <div className="flex items-center gap-1 bg-white border border-stone-200/50 p-1.5 rounded-full shadow-2xs pointer-events-auto">
                                <button
                                    onClick={handleUndo}
                                    disabled={undoStack.length === 0}
                                    className={`p-2 rounded-full transition-all duration-150 flex items-center justify-center select-none ${
                                        undoStack.length === 0
                                            ? 'text-stone-300 opacity-40 pointer-events-none'
                                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer active:scale-90'
                                    }`}
                                    title="Undo last change"
                                >
                                    <Undo2 size={18} className="stroke-[2.5]" />
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={redoStack.length === 0}
                                    className={`p-2 rounded-full transition-all duration-150 flex items-center justify-center select-none ${
                                        redoStack.length === 0
                                            ? 'text-stone-300 opacity-40 pointer-events-none'
                                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer active:scale-90'
                                    }`}
                                    title="Redo next change"
                                >
                                    <Redo2 size={18} className="stroke-[2.5]" />
                                </button>
                            </div>
                        )}

                        {/* Primary actions capsule */}
                        <div className="flex items-center gap-3.5 bg-white border border-stone-200/60 p-3 rounded-full shadow-[0_16px_48px_rgba(0,0,0,0.08)] w-fit pointer-events-auto">
                            {/* ✓ SAVE button — always visible during active collab, otherwise only when content differs */}
                            {activeNote && (activeNote.content !== lastSavedContent || isActiveCollab || isSavingNote) && (
                                <button
                                    onClick={handleCheckmarkSaveClick}
                                    disabled={isSavingNote}
                                    className={`h-14 px-7 flex items-center gap-3 rounded-full border font-sans font-extrabold text-[15.5px] tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-3xs select-none ${
                                        isSavingNote
                                            ? 'border-emerald-500 bg-emerald-500 text-stone-900 scale-95'
                                            : isActiveCollab && activeNote.content === lastSavedContent
                                                ? 'border-stone-200/50 bg-white text-stone-400 hover:bg-stone-50'
                                                : 'border-emerald-500/30 bg-[#F5FBF7] text-emerald-600 hover:bg-[#EBF7F0] hover:border-emerald-500/50'
                                    }`}
                                    title={isActiveCollab ? 'Save to Collab Projects' : 'Save'}
                                >
                                    {isSavingNote ? (
                                        <Loader2 size={20} className="stroke-[3] animate-spin text-stone-900" />
                                    ) : (
                                        <Check size={20} className={`stroke-[3] ${
                                            isActiveCollab && activeNote.content === lastSavedContent
                                                ? 'text-stone-400' 
                                                : 'text-emerald-600'
                                        }`} />
                                    )}
                                    <span>{isSavingNote ? 'Saving' : 'Save'}</span>
                                </button>
                            )}

                            {/* REC capsule button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isRecording) {
                                        stopRecording();
                                    } else {
                                        if (showToolsPanel && activeToolTab !== 'inspiration') {
                                            setShowToolsPanel(false);
                                        }
                                        startRecording();
                                    }
                                }}
                                className={`h-14 px-7 flex items-center gap-3 rounded-full text-[15.5px] font-extrabold transition-all duration-200 cursor-pointer border border-stone-200/50 active:scale-95 shadow-3xs ${
                                    isRecording 
                                        ? 'bg-[#FF4040] text-white animate-pulse' 
                                        : 'bg-white text-[#FF4040] hover:bg-red-50/50'
                                }`}
                            >
                                {isRecording ? (
                                    <>
                                        <div className="w-3.5 h-3.5 rounded-full bg-white animate-ping absolute" />
                                        <Square size={14} className="fill-white text-white shrink-0 z-10" />
                                        <span className="z-10">Recording {formatTime(recordingTime)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-3.5 h-3.5 rounded-full bg-[#FF4040] shrink-0" />
                                        <span>REC</span>
                                    </>
                                )}
                            </button>

                            {/* Tools button */}
                            <button
                                onClick={handleToolsToggle}
                                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-205 active:scale-95 cursor-pointer border border-stone-200/60 shadow-3xs ${
                                    showToolsPanel && activeToolTab !== 'inspiration'
                                        ? 'bg-[#F2F2F2] text-stone-900 font-extrabold'
                                        : 'bg-white text-stone-750 hover:bg-stone-50'
                                }`}
                                title="Creative Tools"
                                type="button"
                            >
                                <div className="relative w-7.5 h-7.5 flex items-center justify-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 256 256" className={showToolsPanel && activeToolTab !== 'inspiration' ? 'text-stone-850' : 'text-stone-600'}>
                                        <path d="M208,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H160V176h24a8,8,0,0,0,0-16H160V136h24a8,8,0,0,0,0-16H160V96h24a8,8,0,0,0,0-16H160V48h48V208ZM77.66,26.34a8,8,0,0,0-11.32,0l-32,32A8,8,0,0,0,32,64V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V64a8,8,0,0,0-2.34-5.66ZM48,176V80H64v96ZM80,80H96v96H80ZM72,43.31,92.69,64H51.31ZM48,208V192H96v16Z" />
                                    </svg>
                                </div>
                            </button>

                            {/* Inspiration button */}
                            <button
                                onClick={handleInspirationToggle}
                                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-205 active:scale-95 cursor-pointer border border-stone-200/60 shadow-3xs ${
                                    showToolsPanel && activeToolTab === 'inspiration'
                                        ? 'bg-[#F2F2F2] text-stone-900 font-extrabold'
                                        : 'bg-white text-stone-750 hover:bg-stone-50'
                                }`}
                                title="Inspiration Tools"
                                type="button"
                            >
                                <div className="relative w-7.5 h-7.5 flex items-center justify-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 256 256" className={showToolsPanel && activeToolTab === 'inspiration' ? 'text-stone-850' : 'text-stone-600'}>
                                        <path d="M221.28,34.75a64,64,0,0,0-90.49,0L60.69,104A15.9,15.9,0,0,0,56,115.31v73.38L26.34,218.34a8,8,0,0,0,11.32,11.32L67.32,200H140.7A15.92,15.92,0,0,0,152,195.32l0,0,69.23-70A64,64,0,0,0,221.28,34.75ZM142.07,46.06A48,48,0,0,1,211.79,112H155.33l34.35-34.34a8,8,0,0,0-11.32-11.32L120,124.69V67.87ZM72,115.35l32-31.67v57l-32,32ZM140.7,184H83.32l56-56h56.74Z" />
                                    </svg>
                                </div>
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
                                className="px-6 py-2.5 bg-red-550 hover:bg-red-650 text-white rounded-full text-[14px] font-sans font-semibold transition-colors cursor-pointer outline-none active:scale-95"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation dialog to overwrite studio recording */}
            {confirmOverwriteStudioRecord.isOpen && createPortal(
                <div 
                    className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" 
                    onClick={() => setConfirmOverwriteStudioRecord({ isOpen: false, trackName: '', onConfirm: null })}
                >
                    <div 
                        className="bg-white rounded-[24px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-md w-full p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200 text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-3xl font-sans font-light text-stone-700 tracking-[-0.025em] leading-[1.3]">
                            Overwrite "{confirmOverwriteStudioRecord.trackName}"?
                        </h3>
                        <div className="flex flex-col gap-3 mt-2 w-full">
                            <button
                                onClick={() => {
                                    if (confirmOverwriteStudioRecord.onConfirm) {
                                        confirmOverwriteStudioRecord.onConfirm();
                                    }
                                }}
                                className="w-full py-3 bg-red-500 hover:bg-red-650 text-white rounded-full text-[14px] font-sans font-semibold transition-colors cursor-pointer outline-none active:scale-95 text-center"
                            >
                                Recording Again
                            </button>
                            <button
                                onClick={() => setConfirmOverwriteStudioRecord({ isOpen: false, trackName: '', onConfirm: null })}
                                className="w-full py-3 bg-stone-100 hover:bg-stone-200/70 text-stone-600 rounded-full text-[14px] font-sans font-semibold transition-colors cursor-pointer outline-none active:scale-95 text-center"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            </div>
        </div>
    );
}
