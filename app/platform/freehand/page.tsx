"use client";

import { useState, useEffect, useRef } from 'react';
import { 
    Folder, 
    FileText, 
    Trash2, 
    Search, 
    Plus
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

interface SongNote {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    updatedAt: string;
    verses?: VerseGroup[];
    phrases?: Phrase[];
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
    draggedGroupIdRef
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
}) {
    const wordsList = phrase.text.split(/(\s+)/);
    
    return (
        <div 
            draggable
            onDragStart={(e) => {
                e.stopPropagation();
                if (draggedPhraseIdRef) {
                    draggedPhraseIdRef.current = phrase.id;
                }
                setDraggedPhraseId(phrase.id);
                e.dataTransfer.setData('text/plain', phrase.id);
            }}
            onDragEnd={() => {
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
                setDragOverPhraseId(null);
                setDropPosition(null);
            }}
            onDrop={(e) => {
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
            className="flex flex-col w-full relative transition-all duration-200"
        >
            {dragOverPhraseId === phrase.id && dropPosition === 'top' && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-black/50 rounded-[0.75px] transform -translate-y-1/2 pointer-events-none z-30 animate-pulse" />
            )}
            
            <div 
                className={`
                    text-[32px] font-light text-stone-855 leading-[1.6] tracking-wide text-center max-w-4xl mx-auto whitespace-pre-wrap select-none py-1 px-4 rounded-[12px] transition-all duration-200 cursor-grab active:cursor-grabbing w-full
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
                                    className="hover:bg-stone-200/70 text-stone-850 hover:text-stone-950 rounded-[12px] px-2 py-0.5 cursor-pointer transition-colors duration-200"
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

            {dragOverPhraseId === phrase.id && dropPosition === 'bottom' && (
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-black/50 rounded-[0.75px] transform translate-y-1/2 pointer-events-none z-30 animate-pulse" />
            )}
        </div>
    );
}


export default function FreeHandPage() {
    const [folders, setFolders] = useState<SongFolder[]>([]);
    const [notes, setNotes] = useState<SongNote[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [activeFolderIdFilter, setActiveFolderIdFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewItemMenu, setShowNewItemMenu] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [isDragOverRoot, setIsDragOverRoot] = useState(false);
    
    // Suggestion mode states
    const [isEditing, setIsEditing] = useState(false);
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

    // Load initial data from localStorage
    useEffect(() => {
        const savedFolders = localStorage.getItem('veinote-freehand-folders');
        const savedNotes = localStorage.getItem('veinote-freehand-notes');
        
        let initialFolders: SongFolder[] = [];
        let initialNotes: SongNote[] = [];

        if (savedFolders) {
            initialFolders = JSON.parse(savedFolders);
            setFolders(initialFolders);
        } else {
            initialFolders = [
                { id: 'f-1', name: 'Summer Album' },
                { id: 'f-2', name: 'Melodic Ideas' }
            ];
            setFolders(initialFolders);
            localStorage.setItem('veinote-freehand-folders', JSON.stringify(initialFolders));
        }

        if (savedNotes) {
            initialNotes = JSON.parse(savedNotes);
            setNotes(initialNotes);
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
            setNotes(initialNotes);
            localStorage.setItem('veinote-freehand-notes', JSON.stringify(initialNotes));
        }
        
        setIsMounted(true);
    }, []);

    // Save changes to localStorage
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem('veinote-freehand-folders', JSON.stringify(folders));
        }
    }, [folders, isMounted]);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem('veinote-freehand-notes', JSON.stringify(notes));
        }
    }, [notes, isMounted]);

    const activeNote = notes.find(n => n.id === selectedNoteId) || null;

    // Automatically adjust the height of the textarea to fit its text, keeping it centered
    useEffect(() => {
        if (isEditing && textareaRef.current) {
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
        const newNote: SongNote = {
            id: `n-${Date.now()}`,
            title: '',
            content: '',
            folderId: folderId || activeFolderIdFilter,
            updatedAt: new Date().toLocaleString()
        };
        setNotes(prev => [newNote, ...prev]);
        setSelectedNoteId(newNote.id);
        setIsEditing(true);
        
        // Focus the textarea in the next tick
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }, 50);
    };

    const handleUpdateNote = (id: string, updates: Partial<SongNote>) => {
        setNotes(prev => prev.map(n => {
            if (n.id === id) {
                return {
                    ...n,
                    ...updates,
                    updatedAt: new Date().toLocaleString()
                };
            }
            return n;
        }));
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
    };

    const handleSaveNote = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedNoteId && activeNote) {
            const updatedPhrases = syncPhrasesWithContent(activeNote.content, activeNote.phrases || []);
            handleUpdateNote(selectedNoteId, {
                phrases: updatedPhrases,
                verses: activeNote.verses || []
            });
            setIsEditing(false); // Enter Suggestion Mode on Save
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
        const remainingPhrases = currentPhrases.filter(p => p.id !== phraseId);
        let updatedPhrases: Phrase[] = [];
        
        if (groupId === null) {
            updatedPhrases = [...remainingPhrases, phrase];
        } else {
            const lastGroupPhraseIdx = remainingPhrases.map((p, idx) => ({ p, idx })).filter(x => x.p.groupId === groupId).pop()?.idx;
            if (lastGroupPhraseIdx !== undefined) {
                remainingPhrases.splice(lastGroupPhraseIdx + 1, 0, phrase);
                updatedPhrases = remainingPhrases;
            } else {
                updatedPhrases = [...remainingPhrases, phrase];
            }
        }
        
        const newContent = updatedPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: updatedPhrases,
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
        draggedPhrase.groupId = targetPhrase.groupId;
        
        const updatedPhrases = [...currentPhrases];
        updatedPhrases.splice(draggedIdx, 1);
        const newTargetIdx = updatedPhrases.findIndex(p => p.id === targetId);
        updatedPhrases.splice(newTargetIdx, 0, draggedPhrase);
        
        const newContent = updatedPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: updatedPhrases,
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
        draggedPhrase.groupId = targetPhrase.groupId;
        
        const updatedPhrases = [...currentPhrases];
        updatedPhrases.splice(draggedIdx, 1);
        
        const newTargetIdx = updatedPhrases.findIndex(p => p.id === targetId);
        const insertIdx = position === 'top' ? newTargetIdx : newTargetIdx + 1;
        updatedPhrases.splice(insertIdx, 0, draggedPhrase);
        
        const newContent = updatedPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: updatedPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || 'Untitled Note'
        });
    };

    const handleInsertGroupAt = (draggedGrpId: string, targetBlkId: string, position: 'top' | 'bottom' | null) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        // 1. Get the phrases belonging to the dragged group
        const draggedPhrases = currentPhrases.filter(p => p.groupId === draggedGrpId);
        if (draggedPhrases.length === 0) return;
        
        // 2. Filter out the dragged phrases from the list
        const remainingPhrases = currentPhrases.filter(p => p.groupId !== draggedGrpId);
        
        // 3. Find the target insertion index in the remaining list
        let targetIdx = remainingPhrases.findIndex(p => p.id === targetBlkId);
        
        if (targetIdx === -1) {
            // It might be a groupId! Find the first phrase of that target group
            const targetGroupPhrases = remainingPhrases.filter(p => p.groupId === targetBlkId);
            if (targetGroupPhrases.length > 0) {
                if (position === 'top') {
                    targetIdx = remainingPhrases.indexOf(targetGroupPhrases[0]);
                } else {
                    targetIdx = remainingPhrases.indexOf(targetGroupPhrases[targetGroupPhrases.length - 1]) + 1;
                }
            }
        } else {
            if (position === 'bottom') {
                targetIdx = targetIdx + 1;
            }
        }
        
        if (targetIdx === -1) {
            targetIdx = remainingPhrases.length;
        }
        
        // 4. Insert the dragged phrases at the target index
        const updatedPhrases = [...remainingPhrases];
        updatedPhrases.splice(targetIdx, 0, ...draggedPhrases);
        
        const newContent = updatedPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: updatedPhrases,
            content: newContent,
            title: getTitleFromContent(newContent) || 'Untitled Note'
        });
    };

    const handleInsertPhraseAtBlockLevel = (draggedPhrsId: string, targetBlkId: string, position: 'top' | 'bottom' | null) => {
        if (!selectedNoteId || !activeNote) return;
        const currentPhrases = activeNote.phrases && activeNote.phrases.length > 0
            ? activeNote.phrases
            : syncPhrasesWithContent(activeNote.content);
        
        const draggedIdx = currentPhrases.findIndex(p => p.id === draggedPhrsId);
        if (draggedIdx === -1) return;
        
        const draggedPhrase = { ...currentPhrases[draggedIdx] };
        draggedPhrase.groupId = null; // Block level drops ungroup the phrase
        
        const remainingPhrases = [...currentPhrases];
        remainingPhrases.splice(draggedIdx, 1);
        
        let targetIdx = remainingPhrases.findIndex(p => p.id === targetBlkId);
        
        if (targetIdx === -1) {
            const targetGroupPhrases = remainingPhrases.filter(p => p.groupId === targetBlkId);
            if (targetGroupPhrases.length > 0) {
                if (position === 'top') {
                    targetIdx = remainingPhrases.indexOf(targetGroupPhrases[0]);
                } else {
                    targetIdx = remainingPhrases.indexOf(targetGroupPhrases[targetGroupPhrases.length - 1]) + 1;
                }
            }
        } else {
            if (position === 'bottom') {
                targetIdx = targetIdx + 1;
            }
        }
        
        if (targetIdx === -1) {
            targetIdx = remainingPhrases.length;
        }
        
        remainingPhrases.splice(targetIdx, 0, draggedPhrase);
        
        const newContent = remainingPhrases.map(p => p.text).join('\n');
        handleUpdateNote(selectedNoteId, {
            phrases: remainingPhrases,
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
        
        const currentPhrases = activeNote.phrases || syncPhrasesWithContent(activeNote.content);
        
        handleUpdateNote(selectedNoteId, {
            verses: [...currentVerses, newGroup],
            phrases: currentPhrases
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
        
        handleUpdateNote(selectedNoteId, {
            phrases: updatedPhrases,
            verses: updatedVerses
        });
    };

    const getActivePhrases = (note: SongNote | null): Phrase[] => {
        if (!note) return [];
        if (note.phrases && note.phrases.length > 0) return note.phrases;
        return syncPhrasesWithContent(note.content);
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
        const blocks: RenderBlock[] = [];
        let currentBlock: RenderBlock | null = null;
        
        for (const phrase of phrases) {
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
        
        // Append empty groups
        const emptyGroups = groups.filter(g => !phrases.some(p => p.groupId === g.id));
        for (const eg of emptyGroups) {
            blocks.push({
                type: 'group',
                groupId: eg.id,
                groupName: eg.name,
                phrases: []
            });
        }
        
        return blocks;
    };


    // Word suggestion click handler in Suggestion Mode
    const handleWordClick = (e: React.MouseEvent, word: string, tokenIndex: number) => {
        e.stopPropagation();
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
        } else if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
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

    const filteredNotes = notes.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isMounted) return null;

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

    return (
        <div className="w-full flex flex-col gap-10 text-stone-900 font-sans min-h-[calc(100vh-12rem)] py-2">
            
            {/* 1. TYPING / WRITING CANVAS AREA (Top Panel) */}
            <div 
                onClick={handleEditorCardClick}
                onDoubleClick={() => {
                    if (selectedNoteId && !isEditing) {
                        setIsEditing(true);
                        setClickedWord(null);
                        setClickedTokenIndex(null);
                        setTimeout(() => {
                            if (textareaRef.current) {
                                textareaRef.current.focus();
                                const length = textareaRef.current.value.length;
                                textareaRef.current.setSelectionRange(length, length);
                            }
                        }, 50);
                    }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    setDraggedPhraseId(null);
                    if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                    setDraggedGroupId(null);
                    if (draggedGroupIdRef) draggedGroupIdRef.current = null;
                    
                    const phraseId = e.dataTransfer.getData('text/plain') || draggedPhraseId;
                    if (phraseId) {
                        handleMovePhraseToGroup(phraseId, null);
                    }
                }}
                className="bg-[#FAF9F5] rounded-[32px] p-8 flex flex-col min-h-[560px] transition-all relative cursor-text justify-center"
            >
                {/* Mode Selector wrapper (Edit vs Suggestion Mode) */}
                <div className="w-full max-h-[480px] overflow-y-auto no-scrollbar flex items-center justify-center z-10">
                    {selectedNoteId && !isEditing ? (
                        /* Suggestion Mode (Hover & Click word alternatives + Drag & Drop group phrases) */
                        <div className="w-full flex flex-col gap-6 max-w-4xl mx-auto py-4">
                            {renderBlocks.map((block, bIdx) => {
                                const blockId = block.type === 'group' ? block.groupId! : block.phrases[0]?.id;
                                
                                return (
                                    <div 
                                        key={blockId || `block-${bIdx}`}
                                        onDragOver={(e) => {
                                            const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                            const currentDraggedPhraseId = draggedPhraseId || (draggedPhraseIdRef ? draggedPhraseIdRef.current : null);
                                            
                                            if (currentDraggedGroupId || currentDraggedPhraseId) {
                                                // Prevent self-match drag over
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
                                            
                                            // Reset drag states immediately before updating note array
                                            setDraggedGroupId(null);
                                            if (draggedGroupIdRef) draggedGroupIdRef.current = null;
                                            setDraggedPhraseId(null);
                                            if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                                            
                                            if (currentDraggedGroupId) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleInsertGroupAt(currentDraggedGroupId, blockId, blockDropPosition);
                                            } else if (currentDraggedPhraseId) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleInsertPhraseAtBlockLevel(currentDraggedPhraseId, blockId, blockDropPosition);
                                            }
                                        }}
                                        className="w-full relative"
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
                                                            e.dataTransfer.setData('text/plain', block.groupId);
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
                                                        onDragOver={(e) => {
                                                            const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                            if (currentDraggedGroupId) {
                                                                return; // Let group drag events bubble up to block wrapper
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
                                                            const currentDraggedGroupId = draggedGroupId || (draggedGroupIdRef ? draggedGroupIdRef.current : null);
                                                            if (currentDraggedGroupId) {
                                                                return; // Ignore group drop inside group box
                                                            }
                                                            
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setDragOverGroupId(null);
                                                            
                                                            // Reset drag state immediately before updating note
                                                            setDraggedPhraseId(null);
                                                            if (draggedPhraseIdRef) draggedPhraseIdRef.current = null;
                                                            
                                                            const phraseId = e.dataTransfer.getData('text/plain') || draggedPhraseIdRef.current || draggedPhraseId;
                                                            if (phraseId) {
                                                                handleMovePhraseToGroup(phraseId, block.groupId);
                                                            }
                                                        }}
                                                        className={`border border-dashed rounded-[20px] p-8 pt-10 relative flex flex-col gap-4 min-h-[100px] transition-all duration-300 cursor-grab active:cursor-grabbing ${
                                                            isDragOverThisGroup 
                                                                ? 'border-black bg-stone-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] scale-[1.005]' 
                                                                : 'border-stone-300/85 bg-stone-50/20 hover:border-stone-400'
                                                        } ${
                                                            draggedGroupId === block.groupId ? 'opacity-30' : ''
                                                        }`}
                                                    >
                                                        {/* Group Badge */}
                                                        <div className="absolute -top-3.5 left-6 bg-black text-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-[4px] uppercase select-none flex items-center gap-1.5 shadow-sm">
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
                                                        
                                                        {block.phrases.length === 0 ? (
                                                            <div className="text-center text-xs text-stone-400 py-4 italic select-none pointer-events-none">
                                                                Drag lines here to add to {block.groupName}
                                                            </div>
                                                        ) : (
                                                            block.phrases.map((phrase) => (
                                                                <PhraseRow 
                                                                    key={phrase.id}
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
                                                                />
                                                            ))
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <PhraseRow 
                                                phrase={block.phrases[0]}
                                                draggedPhraseId={draggedPhraseId}
                                                draggedPhraseIdRef={draggedPhraseIdRef}
                                                setDraggedPhraseId={setDraggedPhraseId}
                                                handleWordClick={handleWordClick}
                                                handleReorderPhrases={handleReorderPhrases}
                                                handleMovePhraseToGroup={handleMovePhraseToGroup}
                                                tokenOffset={phraseTokenOffsets[block.phrases[0].id] || 0}
                                                dragOverPhraseId={dragOverPhraseId}
                                                dropPosition={dropPosition}
                                                setDragOverPhraseId={setDragOverPhraseId}
                                                setDropPosition={setDropPosition}
                                                handleInsertPhraseAt={handleInsertPhraseAt}
                                                setDragOverGroupId={setDragOverGroupId}
                                                draggedGroupId={draggedGroupId}
                                                draggedGroupIdRef={draggedGroupIdRef}
                                            />
                                        )}

                                        {dragOverBlockId === blockId && blockDropPosition === 'bottom' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-black/50 rounded-[0.75px] transform translate-y-1/2 pointer-events-none z-30 animate-pulse" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Standard Edit Mode (Controlled Textarea to prevent duplications) */
                        <textarea
                            ref={textareaRef}
                            value={contentVal}
                            onChange={handleTextareaChange}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="w-full bg-transparent border-none outline-none resize-none font-sans text-[32px] font-light text-stone-855 text-center tracking-wide focus:ring-0 focus:outline-none min-h-[48px] overflow-hidden leading-[1.6] no-scrollbar"
                            placeholder=""
                            style={{ height: 'auto' }}
                        />
                    )}
                </div>

                {/* Styled Center Placeholder Overlay (blinking caret + text matching screenshot) */}
                {contentVal === '' && !isFocused && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <div className="flex items-center gap-1.5 text-stone-400 animate-pulse">
                            <span className="w-[2px] h-9 bg-stone-800 inline-block" />
                            <span className="text-[32px] font-light text-stone-300 tracking-wide font-sans">Just start writing</span>
                        </div>
                    </div>
                )}

                {/* Floating Suggestions Popover Overlay */}
                {clickedWord && popoverPosition && (
                    <>
                        <div className="fixed inset-0 z-30" onClick={() => setClickedWord(null)} />
                        <div 
                            className="absolute bg-white border border-stone-200/60 rounded-[20px] p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-40 flex flex-col gap-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
                            style={{ 
                                top: `${popoverPosition.top}px`, 
                                left: `${popoverPosition.left}px`,
                                transform: 'translateX(-50%)' 
                            }}
                        >
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block border-b border-stone-100 pb-1.5 mb-1 select-none">Songwriting Suggestions</span>
                            <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                                {getSuggestions(clickedWord).map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectSuggestion(suggestion);
                                        }}
                                        className="px-2.5 py-1 bg-stone-50 hover:bg-stone-900 hover:text-white border border-stone-200/50 hover:border-stone-900 rounded-[10px] text-xs font-semibold text-stone-700 transition-all cursor-pointer"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Buttons in bottom right corner */}
                <div className="absolute bottom-6 right-6 flex items-center gap-3 z-20">
                    {/* Render Save button ONLY in Edit mode when content exists */}
                    {selectedNoteId && isEditing && contentVal.trim() !== '' && (
                        <button 
                            onClick={handleSaveNote}
                            className="px-6 py-1.5 bg-black hover:bg-stone-850 text-white font-bold font-sans text-[13px] rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                            Save
                        </button>
                    )}
                    <div className="relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCanvasMenu(!showCanvasMenu);
                            }}
                            className="w-[52px] h-[52px] rounded-full bg-black hover:bg-stone-900 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
                            title="Options"
                        >
                            <Plus size={26} />
                        </button>

                        {showCanvasMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowCanvasMenu(false)} />
                                <div className="absolute right-0 bottom-10 w-44 bg-white border border-stone-200/60 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] z-30 overflow-hidden py-1">
                                    {selectedNoteId && (
                                        <>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddVerseGroup('Verse');
                                                    setShowCanvasMenu(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                                Add Verse
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddVerseGroup('Chorus');
                                                    setShowCanvasMenu(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                                Add Chorus
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddVerseGroup('Bridge');
                                                    setShowCanvasMenu(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                                Add Bridge
                                            </button>
                                            <div className="border-t border-stone-100 my-1" />
                                        </>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNewNoteClick();
                                            setShowCanvasMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                        New Note
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. DIRECTORY GRID AREA (Bottom Section) */}
            <div className="space-y-6">
                
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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
                                        group cursor-pointer flex flex-col gap-3 relative transition-all duration-300 rounded-[28px] p-4 -m-4 border border-transparent
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
                                    group cursor-pointer flex flex-col gap-3 relative transition-all duration-300 rounded-[28px] p-4 -m-4 border border-transparent
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
