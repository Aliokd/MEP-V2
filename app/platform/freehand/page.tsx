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
    ArrowLeft,
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

// Visual CSS Folder Illustration Component
function FolderIllustration() {
    return (
        <div className="w-full aspect-[4/3] bg-stone-100/50 border border-stone-250/20 rounded-[20px] flex items-center justify-center relative overflow-hidden group-hover:bg-white/40 transition-colors shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
            {/* Back flap of folder */}
            <div className="w-[124px] h-[78px] bg-[#D4D4CA] rounded-[12px] absolute bottom-6 left-1/2 -translate-x-1/2 shadow-xs transition-transform group-hover:scale-[1.02] duration-300" />
            
            {/* Peeking Document Sheet 1 */}
            <div className="w-[98px] h-[78px] bg-white border border-stone-200 rounded-[8px] absolute bottom-8 left-[46%] -translate-x-1/2 rotate-[-5deg] shadow-xs flex flex-col p-3 gap-1.5 transition-transform group-hover:translate-y-[-5px] group-hover:rotate-[-8deg] duration-300">
                <div className="w-8 h-1.5 bg-stone-300 rounded-full" />
                <div className="w-12 h-1 bg-stone-200 rounded-full" />
                <div className="w-10 h-1 bg-stone-200 rounded-full" />
            </div>
            
            {/* Peeking Document Sheet 2 */}
            <div className="w-[98px] h-[78px] bg-white border border-stone-200 rounded-[8px] absolute bottom-8 left-[54%] -translate-x-1/2 rotate-[3deg] shadow-xs flex flex-col p-3 gap-1.5 transition-transform group-hover:translate-y-[-7px] group-hover:rotate-[6deg] duration-300">
                <div className="w-5 h-1.5 bg-stone-400/80 rounded-full" />
                <div className="w-10 h-1 bg-stone-200 rounded-full" />
                <div className="w-12 h-1 bg-stone-200 rounded-full" />
            </div>
            
            {/* Front flap (low cut) */}
            <div className="w-[124px] h-[62px] bg-[#BABAB0] rounded-[12px] absolute bottom-6 left-1/2 -translate-x-1/2 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t border-white/20 flex items-end p-2.5 transition-transform group-hover:translate-y-[1px] duration-300">
                {/* Small indicator badges (synesthesia colors) */}
                <div className="flex gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#C5A059] flex items-center justify-center text-[7px] text-white font-bold font-serif shadow-xs">V</div>
                    <div className="w-4 h-4 rounded-full bg-stone-850 flex items-center justify-center text-[7px] text-white font-sans shadow-xs">♫</div>
                </div>
            </div>
        </div>
    );
}

// Visual CSS Document/File Card Illustration Component
function FileIllustration() {
    return (
        <div className="w-full aspect-[4/3] bg-stone-100/50 border border-stone-250/20 rounded-[20px] flex items-center justify-center relative overflow-hidden group-hover:bg-white/40 transition-colors shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
            {/* Main sheet */}
            <div className="w-[84px] h-[100px] bg-white border border-stone-200 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col p-3 gap-2.5 transition-transform group-hover:scale-105 duration-300">
                {/* Header indicators */}
                <div className="flex justify-between items-center">
                    <div className="w-8 h-1.5 bg-stone-400/80 rounded-full" />
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-100 flex items-center justify-center text-[7px] text-stone-500 font-bold">♫</div>
                </div>
                {/* Lines placeholders */}
                <div className="flex flex-col gap-1.5">
                    <div className="w-full h-1 bg-stone-200 rounded-full" />
                    <div className="w-full h-1 bg-stone-200 rounded-full" />
                    <div className="w-[85%] h-1 bg-stone-250/70 rounded-full" />
                    <div className="w-full h-1 bg-stone-200/60 rounded-full" />
                    <div className="w-[55%] h-1 bg-stone-200/40 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export default function FreeHandPage() {
    const [folders, setFolders] = useState<SongFolder[]>([]);
    const [notes, setNotes] = useState<SongNote[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [activeFolderIdFilter, setActiveFolderIdFilter] = useState<string | null>(null);
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

        // Expand folders by default in sidebar
        const expandMap: Record<string, boolean> = {};
        initialFolders.forEach(f => {
            expandMap[f.id] = true;
        });
        setExpandedFolders(expandMap);
        
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
            folderId: folderId || activeFolderIdFilter,
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

    // --- DASHBOARD VIEW (No active note selected) ---
    if (selectedNoteId === null) {
        const currentFolder = folders.find(f => f.id === activeFolderIdFilter);
        const folderNotes = filteredNotes.filter(n => n.folderId === activeFolderIdFilter);

        return (
            <div className="w-full flex flex-col gap-8 text-stone-900 font-sans min-h-[calc(100vh-10rem)]">
                {/* Header Section */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="space-y-1">
                        {activeFolderIdFilter ? (
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setActiveFolderIdFilter(null)}
                                    className="p-2 hover:bg-stone-250/30 rounded-full transition-colors text-stone-600 hover:text-stone-900"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <span className="text-stone-500 text-xs font-bold uppercase tracking-widest cursor-pointer hover:underline" onClick={() => setActiveFolderIdFilter(null)}>Folders</span>
                                <span className="text-stone-400">/</span>
                                <h1 className="text-3xl font-serif text-stone-900">{currentFolder?.name}</h1>
                            </div>
                        ) : (
                            <h1 className="text-3xl font-serif text-stone-900">Songwriting Workspace</h1>
                        )}
                        <p className="text-xs text-stone-600 font-semibold font-sans">
                            {activeFolderIdFilter ? 'Manage chords and lyrics within this project folder.' : 'Draft lyrics, sketch melodies, and organize projects freely.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Bar */}
                        <div className="flex items-center gap-3 bg-white/40 border border-stone-250/20 px-4 py-2.5 rounded-[14px] text-stone-700 w-64">
                            <Search size={14} className="text-stone-500" />
                            <input 
                                type="text" 
                                placeholder="Search workspace..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-xs font-sans placeholder:text-stone-500 font-medium"
                            />
                        </div>

                        <button 
                            onClick={() => handleCreateFolder()}
                            className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2.5 rounded-[12px] hover:border-stone-400 transition-colors font-sans text-xs font-bold text-stone-850"
                        >
                            <FolderPlus size={14} />
                            New Folder
                        </button>

                        <button 
                            onClick={() => handleCreateNote(activeFolderIdFilter)}
                            className="flex items-center gap-2 bg-stone-900 text-[#DCDDD4] px-4 py-2.5 rounded-[12px] hover:bg-stone-850 transition-colors font-sans text-xs font-bold"
                        >
                            <FilePlus size={14} />
                            New Note
                        </button>
                    </div>
                </div>

                {/* Dashboard Main Grid Area */}
                <div className="space-y-10">
                    {/* Folders Section (Only show on main dashboard tab) */}
                    {!activeFolderIdFilter && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-sans font-bold tracking-tight text-stone-900 border-b border-stone-200/50 pb-2">Folders</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {folders.map(folder => {
                                    const count = notes.filter(n => n.folderId === folder.id).length;
                                    return (
                                        <div 
                                            key={folder.id}
                                            onClick={() => setActiveFolderIdFilter(folder.id)}
                                            className="group cursor-pointer bg-white/[0.65] border border-stone-200/70 p-5 rounded-[24px] shadow-xs flex flex-col gap-4 hover:bg-white hover:border-stone-300 hover:shadow-md transition-all duration-300 relative"
                                        >
                                            {/* Top CSS Illustration of Folder */}
                                            <FolderIllustration />

                                            {/* Folder Meta */}
                                            <div className="flex flex-col gap-0.5 text-center mt-1 px-1 relative">
                                                <span className="font-sans text-[15px] font-bold text-stone-850 group-hover:text-stone-950 truncate transition-colors">
                                                    {folder.name}
                                                </span>
                                                <span className="text-[11px] text-stone-500 font-medium font-sans">
                                                    {count} {count === 1 ? 'File' : 'Files'}
                                                </span>
                                            </div>

                                            {/* Delete Folder absolute button */}
                                            <button 
                                                onClick={(e) => handleDeleteFolder(folder.id, e)}
                                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-all text-stone-400"
                                                title="Delete Folder"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* Add Folder Card Option */}
                                <div 
                                    onClick={() => handleCreateFolder()}
                                    className="group cursor-pointer border border-dashed border-stone-300/80 p-5 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:border-stone-400 hover:bg-white/30 transition-all duration-300 min-h-[180px]"
                                >
                                    <div className="w-10 h-10 rounded-full border border-dashed border-stone-400 flex items-center justify-center text-stone-500 group-hover:scale-105 group-hover:text-stone-800 transition-transform">
                                        <FolderPlus size={16} />
                                    </div>
                                    <span className="font-sans text-[13px] font-bold text-stone-600 group-hover:text-stone-800 transition-colors">Create Folder</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-sans font-bold tracking-tight text-stone-900 border-b border-stone-200/50 pb-2">
                            {activeFolderIdFilter ? 'Notes inside Folder' : 'Loose Drafts'}
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {activeFolderIdFilter ? (
                                // Render folder specific notes
                                folderNotes.map((note) => (
                                    <div 
                                        key={note.id}
                                        onClick={() => setSelectedNoteId(note.id)}
                                        className="group cursor-pointer bg-white/[0.65] border border-stone-200/70 p-5 rounded-[24px] shadow-xs flex flex-col gap-4 hover:bg-white hover:border-stone-300 hover:shadow-md transition-all duration-300 relative"
                                    >
                                        {/* CSS File Card Illustration */}
                                        <FileIllustration />

                                        {/* File metadata */}
                                        <div className="flex flex-col gap-0.5 text-center mt-1 px-1">
                                            <span className="font-sans text-[14px] font-bold text-stone-850 group-hover:text-stone-950 truncate transition-colors">
                                                {note.title || 'Untitled Note'}
                                            </span>
                                            <span className="text-[10px] text-stone-500 font-medium font-mono uppercase truncate">
                                                {note.updatedAt.split(',')[0]}
                                            </span>
                                        </div>

                                        {/* Quick Delete */}
                                        <button 
                                            onClick={(e) => handleDeleteNote(note.id, e)}
                                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-all text-stone-400"
                                            title="Delete Note"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                // Render uncategorized notes
                                filteredNotes.filter(n => n.folderId === null).map((note) => (
                                    <div 
                                        key={note.id}
                                        onClick={() => setSelectedNoteId(note.id)}
                                        className="group cursor-pointer bg-white/[0.65] border border-stone-200/70 p-5 rounded-[24px] shadow-xs flex flex-col gap-4 hover:bg-white hover:border-stone-300 hover:shadow-md transition-all duration-300 relative"
                                    >
                                        <FileIllustration />

                                        <div className="flex flex-col gap-0.5 text-center mt-1 px-1">
                                            <span className="font-sans text-[14px] font-bold text-stone-850 group-hover:text-stone-950 truncate transition-colors">
                                                {note.title || 'Untitled Note'}
                                            </span>
                                            <span className="text-[10px] text-stone-500 font-medium font-mono uppercase truncate">
                                                {note.updatedAt.split(',')[0]}
                                            </span>
                                        </div>

                                        <button 
                                            onClick={(e) => handleDeleteNote(note.id, e)}
                                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-all text-stone-400"
                                            title="Delete Note"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}

                            {/* Create Note Card Option */}
                            <div 
                                onClick={() => handleCreateNote(activeFolderIdFilter)}
                                className="group cursor-pointer border border-dashed border-stone-300/80 p-5 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:border-stone-400 hover:bg-white/30 transition-all duration-300 min-h-[180px]"
                            >
                                <div className="w-10 h-10 rounded-full border border-dashed border-stone-400 flex items-center justify-center text-stone-500 group-hover:scale-105 group-hover:text-stone-800 transition-transform">
                                    <FilePlus size={16} />
                                </div>
                                <span className="font-sans text-[13px] font-bold text-stone-600 group-hover:text-stone-800 transition-colors">Create Note</span>
                            </div>
                        </div>

                        {/* Empty States */}
                        {activeFolderIdFilter && folderNotes.length === 0 && (
                            <div className="text-center py-12 border border-stone-200 border-dashed rounded-[24px] bg-white/20">
                                <p className="text-sm text-stone-500 italic">No notes inside this folder. Create a new one above to start!</p>
                            </div>
                        )}
                        {!activeFolderIdFilter && filteredNotes.filter(n => n.folderId === null).length === 0 && (
                            <div className="text-center py-12 border border-stone-200 border-dashed rounded-[24px] bg-white/20">
                                <p className="text-sm text-stone-500 italic">No loose drafts. Click "Create Note" to make a quick scratchpad!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- EDITOR VIEW (When a note is open) ---
    return (
        <div className="flex gap-8 h-[calc(100vh-10rem)] text-stone-900 font-sans">
            {/* Left Column - Directory Manager Sidebar */}
            <div className="w-80 flex flex-col gap-5 h-full shrink-0">
                {/* Back to Dashboard Button */}
                <button 
                    onClick={() => setSelectedNoteId(null)}
                    className="flex items-center justify-center gap-2 bg-stone-900 text-[#DCDDD4] py-3 rounded-[14px] hover:bg-stone-850 active:scale-98 transition-all font-sans text-xs font-bold"
                >
                    <ArrowLeft size={14} />
                    Back to Dashboard
                </button>

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

                {/* Directory Navigation Scroll List */}
                <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-4 no-scrollbar">
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
                                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-all text-stone-400"
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
            <div className="flex-grow flex flex-col bg-white border border-stone-200/70 rounded-[28px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.015)] overflow-hidden h-full">
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
                                {/* Folder Selector */}
                                <select 
                                    value={activeNote.folderId || ''}
                                    onChange={(e) => handleUpdateNote(activeNote.id, { folderId: e.target.value || null })}
                                    className="bg-stone-50 border border-stone-200/80 text-stone-750 font-sans text-xs font-semibold rounded-[10px] px-3 py-2.5 outline-none hover:border-stone-300 transition-colors"
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
                                className="w-full h-full bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed text-stone-850 placeholder:text-stone-400/80 pr-2"
                            />
                        </div>

                        {/* Editor Footer / Info */}
                        <div className="flex items-center justify-between text-[11px] text-stone-550 font-medium font-sans border-t border-stone-100 pt-4">
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
                            <p className="text-xs text-stone-550 font-semibold max-w-xs leading-normal">Select an existing note from the sidebar directory, or create a new note/folder to start composing.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
