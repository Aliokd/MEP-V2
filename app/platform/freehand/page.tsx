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

interface SongNote {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    updatedAt: string;
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

    const editorRef = useRef<HTMLDivElement>(null);

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

    // Sync note content to the contentEditable div when selected note changes
    useEffect(() => {
        if (editorRef.current) {
            if (activeNote) {
                if (editorRef.current.innerText !== activeNote.content) {
                    editorRef.current.innerText = activeNote.content;
                }
            } else {
                editorRef.current.innerText = '';
            }
        }
    }, [selectedNoteId]);

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
        
        // Auto focus the editor in the next tick
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
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

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        const val = e.currentTarget.innerText;
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
            if (editorRef.current) editorRef.current.focus();
            return;
        }
        handleCreateNote(activeFolderIdFilter);
    };

    const handleSaveNote = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedNoteId) {
            setSelectedNoteId(null);
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

    return (
        <div className="w-full flex flex-col gap-10 text-stone-900 font-sans min-h-[calc(100vh-12rem)] py-2">
            
            {/* 1. TYPING / WRITING CANVAS AREA (Top Panel) */}
            <div 
                onClick={() => {
                    if (editorRef.current) editorRef.current.focus();
                }}
                className="bg-[#FAF9F5] rounded-[32px] p-8 flex flex-col min-h-[420px] transition-all relative cursor-text justify-center"
            >
                {/* Scrollable Center-aligned container wrapper */}
                <div className="w-full max-h-[340px] overflow-y-auto no-scrollbar flex items-center justify-center z-10">
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleEditorInput}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className="w-full outline-none border-none bg-transparent font-sans text-[32px] font-light text-stone-850 text-center tracking-wide focus:ring-0 focus:outline-none min-h-[48px]"
                    />
                </div>

                {/* Styled Center Placeholder Overlay (blinking caret + text matching screenshot) */}
                {contentVal === '' && !isFocused && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <div className="flex items-center gap-1.5 text-stone-400">
                            <span className="w-[2px] h-9 bg-stone-800 animate-pulse inline-block" />
                            <span className="text-[32px] font-light text-stone-300 tracking-wide font-sans">Just start writing</span>
                        </div>
                    </div>
                )}

                {/* Save and Plus Buttons in bottom right corner */}
                <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10">
                    {contentVal.trim() !== '' && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSaveNote(e);
                            }}
                            className="px-6 py-1.5 bg-black hover:bg-stone-850 text-white font-bold font-sans text-[13px] rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                            Save
                        </button>
                    )}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNewNoteClick();
                        }}
                        className="w-8 h-8 rounded-full bg-stone-100/70 hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-all cursor-pointer"
                        title="New Note"
                    >
                        <Plus size={16} />
                    </button>
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
                                                    <FileText size={12} className="text-stone-555" />
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
                                        <span className="font-bold text-[14px] text-stone-855 group-hover:text-stone-955 truncate transition-colors">
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
