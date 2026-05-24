"use client";

import { useState, useEffect } from 'react';
import { 
    FolderPlus, 
    FilePlus, 
    Folder, 
    FileText, 
    Trash2, 
    Search, 
    ChevronRight, 
    ChevronDown, 
    MoreVertical,
    FileEdit
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

export default function FreeHandPage() {
    const [folders, setFolders] = useState<SongFolder[]>([]);
    const [notes, setNotes] = useState<SongNote[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [isMounted, setIsMounted] = useState(false);

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
            // Default folders
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
            // Default notes
            initialNotes = [
                { 
                    id: 'n-1', 
                    title: 'Ocean Breeze Lyrics', 
                    content: 'Verse 1:\nWalking down the sandy beach\nFeel the warmth within my reach\n\nChorus:\nOcean breeze, carry me away\nTo the place where we used to play...', 
                    folderId: 'f-1', 
                    updatedAt: new Date().toLocaleString() 
                },
                { 
                    id: 'n-2', 
                    title: 'A minor progression', 
                    content: 'Chords:\nAm - F - C - G\n\nTempo: 120bpm\nFeel: Ethereal and flowing.\nTry adding a violin counter-melody in the chorus.', 
                    folderId: 'f-2', 
                    updatedAt: new Date().toLocaleString() 
                },
                { 
                    id: 'n-3', 
                    title: 'Songwriting Prompts', 
                    content: '- Write about nostalgia for a city you only visited once.\n- Use the word "spectral" in the bridge.\n- Start the song on a subdominant major chord.', 
                    folderId: null, 
                    updatedAt: new Date().toLocaleString() 
                }
            ];
            setNotes(initialNotes);
            localStorage.setItem('veinote-freehand-notes', JSON.stringify(initialNotes));
        }

        if (initialNotes.length > 0) {
            setSelectedNoteId(initialNotes[0].id);
        }

        // Expand all folders by default
        const expandMap: Record<string, boolean> = {};
        initialFolders.forEach(f => {
            expandMap[f.id] = true;
        });
        setExpandedFolders(expandMap);
        
        setIsMounted(true);
    }, []);

    // Save to localStorage whenever state changes
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

    const handleCreateFolder = () => {
        const name = prompt("Enter folder name:");
        if (!name || name.trim() === '') return;
        const newFolder: SongFolder = {
            id: `f-${Date.now()}`,
            name: name.trim()
        };
        setFolders(prev => [...prev, newFolder]);
        setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
    };

    const handleCreateNote = (folderId: string | null = null) => {
        const newNote: SongNote = {
            id: `n-${Date.now()}`,
            title: 'Untitled Note',
            content: '',
            folderId: folderId,
            updatedAt: new Date().toLocaleString()
        };
        setNotes(prev => [newNote, ...prev]);
        setSelectedNoteId(newNote.id);
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

    const handleDeleteNote = (id: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNoteId === id) {
            setSelectedNoteId(null);
        }
    };

    const handleDeleteFolder = (folderId: string) => {
        if (!confirm("Are you sure you want to delete this folder? Notes inside will be kept uncategorized.")) return;
        
        // Remove folder
        setFolders(prev => prev.filter(f => f.id !== folderId));
        
        // Move notes inside to null folderId
        setNotes(prev => prev.map(n => {
            if (n.folderId === folderId) {
                return { ...n, folderId: null };
            }
            return n;
        }));
    };

    const toggleFolderExpand = (folderId: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    const filteredNotes = notes.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isMounted) return null;

    return (
        <div className="flex gap-8 h-[calc(100vh-10rem)] text-stone-900 font-sans">
            {/* Left Column - Directory Manager */}
            <div className="w-80 flex flex-col gap-5 h-full shrink-0">
                {/* Search Bar */}
                <div className="flex items-center gap-3 bg-white/40 border border-stone-250/20 px-4 py-3 rounded-[16px] text-stone-700">
                    <Search size={16} className="text-stone-500" />
                    <input 
                        type="text" 
                        placeholder="Search notes..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-xs font-sans placeholder:text-stone-500 font-medium"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleCreateNote(null)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-stone-200/80 py-3 rounded-[14px] hover:border-stone-400 hover:shadow-xs active:scale-98 transition-all font-sans text-xs font-bold text-stone-850"
                    >
                        <FilePlus size={14} />
                        New Note
                    </button>
                    <button 
                        onClick={handleCreateFolder}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-stone-200/80 py-3 rounded-[14px] hover:border-stone-400 hover:shadow-xs active:scale-98 transition-all font-sans text-xs font-bold text-stone-850"
                    >
                        <FolderPlus size={14} />
                        New Folder
                    </button>
                </div>

                {/* Directory Navigation Scroll List */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 no-scrollbar">
                    {/* Folders List */}
                    <div className="flex flex-col gap-2">
                        {folders.map(folder => {
                            const folderNotes = filteredNotes.filter(n => n.folderId === folder.id);
                            const isExpanded = !!expandedFolders[folder.id];

                            return (
                                <div key={folder.id} className="flex flex-col gap-1">
                                    {/* Folder Header */}
                                    <div className="flex items-center justify-between px-3 py-2 rounded-[10px] hover:bg-white/30 transition-colors group">
                                        <button 
                                            onClick={() => toggleFolderExpand(folder.id)}
                                            className="flex items-center gap-2 flex-grow text-left font-sans text-[13px] font-bold text-stone-800"
                                        >
                                            {isExpanded ? <ChevronDown size={14} className="text-stone-500" /> : <ChevronRight size={14} className="text-stone-500" />}
                                            <Folder size={14} className="text-stone-600 fill-stone-600/10 shrink-0" />
                                            <span className="truncate">{folder.name}</span>
                                            <span className="text-[10px] text-stone-550 font-normal font-mono">({folderNotes.length})</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteFolder(folder.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-all text-stone-500"
                                            title="Delete Folder"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>

                                    {/* Folder Children (Notes) */}
                                    {isExpanded && (
                                        <div className="flex flex-col gap-1 pl-6 border-l border-stone-300/40 ml-4.5 py-1">
                                            {folderNotes.map(note => (
                                                <button
                                                    key={note.id}
                                                    onClick={() => setSelectedNoteId(note.id)}
                                                    className={`
                                                        flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-left transition-all
                                                        ${selectedNoteId === note.id 
                                                            ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-200/40 text-stone-900 font-bold' 
                                                            : 'text-stone-650 hover:text-stone-900 hover:bg-white/20'
                                                        }
                                                    `}
                                                >
                                                    <FileText size={13} className="shrink-0 text-stone-500" />
                                                    <span className="font-sans text-[13px] truncate flex-1">{note.title || 'Untitled Note'}</span>
                                                </button>
                                            ))}
                                            {folderNotes.length === 0 && (
                                                <span className="text-[11px] text-stone-500 italic pl-3 py-1">Empty folder</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Loose Notes (Uncategorized) */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-stone-500 uppercase tracking-widest px-3 font-bold block mb-1">Uncategorized</span>
                        {filteredNotes.filter(n => n.folderId === null).map(note => (
                            <button
                                key={note.id}
                                onClick={() => setSelectedNoteId(note.id)}
                                className={`
                                    flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-left transition-all
                                    ${selectedNoteId === note.id 
                                        ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-200/40 text-stone-900 font-bold' 
                                        : 'text-stone-650 hover:text-stone-900 hover:bg-white/20'
                                    }
                                `}
                            >
                                <FileText size={13} className="shrink-0 text-stone-500" />
                                <span className="font-sans text-[13px] truncate flex-1">{note.title || 'Untitled Note'}</span>
                            </button>
                        ))}
                        {filteredNotes.filter(n => n.folderId === null).length === 0 && (
                            <span className="text-[11px] text-stone-500 italic px-3 py-1">No loose notes</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column - Editor Panel */}
            <div className="flex-grow flex flex-col bg-white border border-stone-200/70 rounded-[28px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] overflow-hidden h-full">
                {activeNote ? (
                    <div className="flex flex-col h-full p-8 gap-6">
                        {/* Note Header / Meta */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-stone-100">
                            <div className="flex items-center gap-4 flex-grow max-w-xl">
                                <input 
                                    type="text" 
                                    value={activeNote.title}
                                    onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
                                    className="bg-transparent border-none outline-none font-sans text-2xl font-semibold text-stone-900 w-full placeholder:text-stone-400"
                                    placeholder="Note Title"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Folder Dropdown */}
                                <select 
                                    value={activeNote.folderId || ''}
                                    onChange={(e) => handleUpdateNote(activeNote.id, { folderId: e.target.value || null })}
                                    className="bg-stone-50 border border-stone-200 text-stone-750 font-sans text-xs font-semibold rounded-[10px] px-3 py-2.5 outline-none hover:border-stone-300 transition-colors"
                                >
                                    <option value="">No Folder (Loose)</option>
                                    {folders.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>

                                {/* Delete button */}
                                <button 
                                    onClick={() => handleDeleteNote(activeNote.id)}
                                    className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center hover:bg-red-100/60 active:scale-95 transition-all text-red-600 shadow-xs"
                                    title="Delete Note"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Text Area Content Editor */}
                        <div className="flex-grow relative w-full">
                            <textarea
                                value={activeNote.content}
                                onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                                placeholder="Start writing lyrics, chord charts, or melodies..."
                                className="w-full h-full bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed text-stone-800 placeholder:text-stone-400/80 pr-2"
                            />
                        </div>

                        {/* Editor Footer / Info */}
                        <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium font-sans border-t border-stone-100 pt-4">
                            <span>
                                Words: {activeNote.content.trim() === '' ? 0 : activeNote.content.trim().split(/\s+/).length} | Characters: {activeNote.content.length}
                            </span>
                            <span className="italic">
                                Saved: {activeNote.updatedAt}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-4 select-none">
                        <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 border border-stone-100 shadow-xs">
                            <FileEdit size={28} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-sans text-lg font-bold text-stone-900">No Note Selected</h3>
                            <p className="text-xs text-stone-500 font-semibold max-w-xs leading-normal">Select an existing note from the sidebar directory, or create a new note/folder to start composing.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
