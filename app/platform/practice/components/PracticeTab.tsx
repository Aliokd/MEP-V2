"use client";

import { useState } from 'react';
import { SAMPLE_SONGS } from '../data/songs';
import LyricsPlayer from './LyricsPlayer';
import SongCard from './SongCard';
import { Play, Pause, Check, HelpCircle } from 'lucide-react';

export default function PracticeTab() {
    const [selectedPractice, setSelectedPractice] = useState('Practise 1');
    const [selectedCategory, setSelectedCategory] = useState('Pop singer Song Writer');
    const [selectedSubCategory, setSelectedSubCategory] = useState('Words');
    const [selectedSongId, setSelectedSongId] = useState('song-3');
    const [isPlaying, setIsPlaying] = useState(false);

    // Practise 2 State
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [nouns, setNouns] = useState<string[]>(Array(10).fill(''));
    const [verbs, setVerbs] = useState<string[]>(Array(10).fill(''));
    const [connections, setConnections] = useState<{ n: number; v: number }[]>([]);
    const [pendingNounIndex, setPendingNounIndex] = useState<number | null>(null);
    const [sentences, setSentences] = useState<string[]>(Array(10).fill(''));
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);

    const practices = ['Practise 1', 'Practise 2', 'Practise 3', 'Practise 4', 'Practise 5'];
    const currentSong = SAMPLE_SONGS.find(s => s.id === selectedSongId) || SAMPLE_SONGS[0];

    const categories = ['Pop singer Song Writer', 'Traditional SSW', 'Framework 3'];
    const subCategories = ['Song structure', 'Words', 'Music', 'Word & music(from scratch, free hand)'];
    const songs = SAMPLE_SONGS;

    const handleTogglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const handleSongSelect = (id: string) => {
        if (id === selectedSongId) {
            handleTogglePlay();
        } else {
            setSelectedSongId(id);
            setIsPlaying(true);
        }
    };

    const handleWordChange = (type: 'noun' | 'verb', index: number, value: string) => {
        if (type === 'noun') {
            const newNouns = [...nouns];
            newNouns[index] = value;
            setNouns(newNouns);
        } else {
            const newVerbs = [...verbs];
            newVerbs[index] = value;
            setVerbs(newVerbs);
        }
    };

    const isStepComplete = (step: number) => {
        if (step === 2) return nouns.every(n => n.trim() !== '');
        if (step === 3) return verbs.every(v => v.trim() !== '');
        return false;
    };

    return (
        <div className="w-full min-h-screen bg-charcoal text-alabaster flex flex-col items-center pt-8 px-10">

            {/* Top Level Practise Tabs */}
            <div className="w-full max-w-5xl flex gap-6 mb-12 overflow-x-auto no-scrollbar py-2">
                {practices.map(p => (
                    <button
                        key={p}
                        onClick={() => setSelectedPractice(p)}
                        className={`
                            px-8 py-3 rounded-xs text-[10px] uppercase tracking-[0.3em] font-sans transition-all duration-500 border
                            ${selectedPractice === p
                                ? 'bg-gold-500 text-charcoal border-gold-500 font-bold'
                                : 'bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'}
                        `}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {selectedPractice === 'Practise 1' ? (
                <>
                    {/* Categories */}
                    <div className="w-full max-w-5xl flex gap-8 border-b border-white/5 mb-8">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    text-[10px] uppercase tracking-[0.2em] font-sans pb-3 transition-all duration-300
                                    ${selectedCategory === cat ? 'text-gold-500 border-b border-gold-500' : 'text-white/30 hover:text-white/60'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="w-full max-w-5xl flex flex-col md:flex-row gap-12">
                        {/* Sidebar */}
                        <div className="flex flex-col gap-10 w-full md:w-64 shrink-0">
                            <div>
                                <span className="text-white/20 text-[10px] uppercase tracking-widest block mb-6">Sub categories</span>
                                <div className="flex flex-col gap-4">
                                    {subCategories.map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setSelectedSubCategory(sub)}
                                            className={`
                                                text-left text-xs font-serif italic transition-all duration-300 hover:translate-x-1
                                                ${selectedSubCategory === sub ? 'text-gold-500' : 'text-white/40 hover:text-white'}
                                            `}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-white/20 text-[10px] uppercase tracking-widest block mb-4">Current progression</span>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-white/[0.03] border border-white/5 p-4 rounded-xs">
                                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                            <div className="bg-gold-500 h-full w-[65%]" />
                                        </div>
                                        <span className="ml-4 text-[10px] font-mono text-gold-500/80">65%</span>
                                    </div>
                                    <p className="text-[10px] text-white/20 italic">Mastering the lyrical flow. You're doing great!</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        {selectedSubCategory === 'Words' ? (
                            <div className="flex-grow space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {songs.map((song, idx) => (
                                        <SongCard
                                            key={song.id}
                                            song={song}
                                            index={idx}
                                            isSelected={selectedSongId === song.id}
                                            onClick={() => handleSongSelect(song.id)}
                                        />
                                    ))}
                                </div>

                                {/* Lyrics Player Section */}
                                <div className="w-full bg-white/[0.02] border border-white/5 rounded-xs overflow-hidden">
                                    <LyricsPlayer
                                        song={currentSong}
                                        isPlaying={isPlaying}
                                        onTogglePlay={handleTogglePlay}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow flex items-center justify-center min-h-[400px] border border-white/5 rounded-xs bg-white/[0.01]">
                                <p className="text-white/20 font-serif italic text-xl">Module "{selectedSubCategory}" under construction</p>
                            </div>
                        )}
                    </div>
                </>
            ) : selectedPractice === 'Practise 2' ? (
                <div className="w-full max-w-5xl flex flex-col items-center">
                    {/* Header for Practise 2 */}
                    <div className="w-full text-left mb-12">
                        <div className="flex items-center gap-4 text-white/30 mb-2">
                            <span className="text-[10px] uppercase tracking-[0.3em]">Practice 2</span>
                            <div className="h-px w-8 bg-white/10" />
                            <span className="text-sm font-serif italic text-gold-500/80">Composing words</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-white/20 text-[10px] uppercase tracking-widest block mb-1">Step 0{currentStep}</span>
                                <h1 className="text-4xl font-serif text-alabaster tracking-tight">
                                    {currentStep === 1 ? 'Choose theme' :
                                        currentStep === 2 ? 'Drafting concepts - Nouns' :
                                            currentStep === 3 ? 'Drafting concepts - Verbs' :
                                                currentStep === 4 ? 'Link Nouns & Verbs' :
                                                    currentStep === 5 ? 'Complete the sentences' : 'Story ready now'}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {currentStep === 1 && (
                        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['Nature', 'Sports', 'Urban Life', 'Solitude', 'Memory', 'Ambition', 'Conflict', 'Harmony', 'Velocity', 'Starlight', 'The Deep', 'Whispers', 'Machines', 'Ritual', 'Digital Soul', 'The Harvest'].map((theme, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setSelectedTheme(theme);
                                        setCurrentStep(2);
                                    }}
                                    className="group relative aspect-video md:aspect-[4/3] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center overflow-hidden hover:border-gold-500/30 transition-all duration-500"
                                >
                                    <div className="absolute inset-x-0 bottom-0 h-0 group-hover:h-full bg-gold-500/5 transition-all duration-700 ease-out" />
                                    <span className="relative z-10 text-[10px] uppercase tracking-[0.3em] text-white/40 group-hover:text-gold-500 group-hover:scale-110 transition-all duration-500">
                                        {theme}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {(currentStep === 2 || currentStep === 3) && (
                        <div className="w-full flex flex-col md:flex-row gap-12 items-start">
                            <div className="hidden lg:flex flex-col gap-4 w-64 pt-2 shrink-0">
                                <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xs">
                                    <span className="text-[10px] uppercase tracking-widest text-white/20 block mb-2">Theme</span>
                                    <span className="text-gold-500 font-serif italic text-lg">{selectedTheme}</span>
                                </div>

                                {currentStep === 3 && (
                                    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xs">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] uppercase tracking-widest text-white/20">Nouns</span>
                                            <button onClick={() => setCurrentStep(2)} className="text-[8px] uppercase tracking-widest text-gold-500/50 hover:text-gold-500 transition-colors">Edit</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {nouns.filter(n => n.trim() !== '').map((n, i) => (
                                                <span key={i} className="px-2 py-1 bg-white/5 rounded-xs text-[9px] text-white/40 uppercase tracking-tighter">{n}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow max-w-lg bg-white/[0.02] border border-white/[0.05] rounded-xs overflow-hidden">
                                <div className="p-8 space-y-8">
                                    <div className="space-y-1">
                                        <p className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Objective</p>
                                        <h2 className="text-2xl font-serif text-alabaster italic">
                                            {currentStep === 2 ? 'Type 10 nouns of your choice' : 'Type 10 verbs of your choice'}
                                        </h2>
                                        <p className="text-gold-500/40 text-[10px] uppercase tracking-widest">Hint: Focus on sensory details related to {selectedTheme}</p>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        {Array.from({ length: 10 }).map((_, i) => (
                                            <div key={i} className="group relative">
                                                <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[8px] text-white/10 font-mono">
                                                    {(i + 1).toString().padStart(2, '0')}
                                                </div>
                                                <div className="flex items-center gap-4 border-b border-white/5 group-focus-within:border-gold-500/50 transition-all duration-500 py-3">
                                                    <input
                                                        type="text"
                                                        placeholder={currentStep === 2 ? "Enter Noun..." : "Enter Verb..."}
                                                        value={currentStep === 2 ? nouns[i] : verbs[i]}
                                                        onChange={(e) => handleWordChange(currentStep === 2 ? 'noun' : 'verb', i, e.target.value)}
                                                        className="bg-transparent border-none outline-none flex-grow font-serif text-alabaster/80 placeholder:text-white/5 text-lg"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    disabled={!isStepComplete(currentStep)}
                                    onClick={() => setCurrentStep(currentStep === 2 ? 3 : 4)}
                                    className={`
                                        w-full py-6 flex items-center justify-center gap-4 group transition-all duration-1000
                                        ${isStepComplete(currentStep)
                                            ? currentStep === 2 ? 'bg-gold-500 text-charcoal' : 'bg-[#a3e635] text-charcoal'
                                            : 'bg-white/5 text-white/10 cursor-not-allowed'}
                                    `}
                                >
                                    <span className="text-xs font-bold uppercase tracking-[0.4em]">
                                        {isStepComplete(currentStep) ? 'Next Movement' : `Fill ${10 - (currentStep === 2 ? nouns : verbs).filter(x => x.trim() !== '').length} more`}
                                    </span>
                                    {isStepComplete(currentStep) && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-2 transition-transform duration-500">
                                            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <div className="w-full max-w-5xl bg-white/[0.02] border border-white/[0.05] rounded-xs overflow-hidden relative">
                                <div className="p-12 relative">
                                    <div className="text-center mb-16 space-y-2">
                                        <p className="text-white/20 text-[10px] uppercase tracking-[0.3em]">Step 04 — Connection</p>
                                        <h2 className="text-4xl font-serif text-alabaster italic">Link Nouns with Verbs</h2>
                                        <p className="text-gold-500/40 text-[10px] uppercase tracking-widest">Connect nouns with verbs 1 by 1 (order doesn't matter)</p>
                                    </div>

                                    <div className="flex justify-between items-start gap-32 relative min-h-[850px] px-24 pt-10 pb-20">
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                            {connections.map((conn, idx) => {
                                                const isActive = idx === connections.length - 1;
                                                return (
                                                    <line
                                                        key={idx}
                                                        x1="31.8%"
                                                        y1={`${(conn.n * 8.94) + 11.8}%`}
                                                        x2="68.2%"
                                                        y2={`${(conn.v * 8.94) + 11.8}%`}
                                                        stroke="white"
                                                        strokeWidth="1"
                                                        strokeOpacity={isActive ? "0.6" : "0.15"}
                                                        className="animate-in fade-in duration-700"
                                                    />
                                                );
                                            })}
                                        </svg>

                                        <div className="flex flex-col gap-3 w-64 z-10">
                                            {nouns.map((n, i) => {
                                                const isConnected = connections.some(c => c.n === i);
                                                const isSelected = pendingNounIndex === i;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            const existingConn = connections.find(c => c.n === i);
                                                            if (existingConn) {
                                                                setConnections(connections.filter(c => c.n !== i));
                                                                return;
                                                            }
                                                            setPendingNounIndex(isSelected ? null : i);
                                                        }}
                                                        className={`
                                                            group relative h-16 w-full px-6 transition-all duration-500 rounded-xs flex items-center border
                                                            ${isConnected ? 'bg-gold-500/5 border-gold-500/20' : isSelected ? 'bg-gold-500/10 border-gold-500 shadow-[0_0_20px_rgba(197,160,89,0.2)]' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/20'}
                                                        `}
                                                    >
                                                        <div className="flex items-center justify-between w-full pointer-events-none">
                                                            <span className={`font-serif text-lg transition-colors duration-500 ${isConnected ? 'text-gold-500' : isSelected ? 'text-white' : 'text-white/40'}`}>{n}</span>
                                                            <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-500 ${isConnected ? 'bg-gold-500 border-gold-500' : isSelected ? 'bg-white border-white scale-125' : 'bg-transparent border-white/20'}`} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-col gap-3 w-64 z-10">
                                            {verbs.map((v, i) => {
                                                const isConnected = connections.some(c => c.v === i);
                                                const canConnect = pendingNounIndex !== null;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            const existingConn = connections.find(c => c.v === i);
                                                            if (existingConn) {
                                                                setConnections(connections.filter(c => c.v !== i));
                                                                return;
                                                            }
                                                            if (pendingNounIndex !== null) {
                                                                setConnections([...connections, { n: pendingNounIndex, v: i }]);
                                                                setPendingNounIndex(null);
                                                            }
                                                        }}
                                                        className={`
                                                            group relative h-16 w-full px-6 transition-all duration-500 rounded-xs flex items-center border
                                                            ${isConnected ? 'bg-[#a3e635]/5 border-[#a3e635]/20' : canConnect ? 'bg-white/[0.03] border-white/20 hover:border-[#a3e635]/50' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/20'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-4 w-full justify-end md:justify-start pointer-events-none">
                                                            <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-500 ${isConnected ? 'bg-[#a3e635] border-[#a3e635]' : canConnect ? 'bg-transparent border-[#a3e635]/50' : 'bg-transparent border-white/20'}`} />
                                                            <span className={`font-serif text-lg transition-colors duration-500 ${isConnected ? 'text-[#a3e635]' : 'text-white/40'}`}>{v}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-white/[0.01] border-t border-white/[0.05] flex justify-between items-center px-12">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Status</span>
                                        <span className="text-gold-500 font-bold text-xs tracking-widest">{connections.length}/10 Links Forged</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setConnections([]); setPendingNounIndex(null); }} className="px-8 py-5 text-[10px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">Reset</button>
                                        <button
                                            disabled={connections.length < 5}
                                            onClick={() => setCurrentStep(5)}
                                            className={`
                                                group relative px-16 py-5 rounded-xs transition-all duration-700
                                                ${connections.length >= 5 ? 'bg-white text-charcoal hover:bg-gold-500 hover:text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'}
                                            `}
                                        >
                                            <span className="relative z-10 text-xs font-bold uppercase tracking-[0.4em]">Apply Connections</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <div className="w-full max-w-5xl">
                                <div className="text-center mb-12 space-y-4">
                                    <p className="text-white/20 text-[10px] uppercase tracking-[0.3em]">Step 05 — Composition</p>
                                    <h2 className="text-4xl font-serif text-alabaster italic">Complete the sentences</h2>
                                    <p className="text-gold-500/40 text-[10px] uppercase tracking-widest">(don't overthink, just put staff together)</p>
                                </div>

                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xs p-8 mb-12 flex items-center justify-center gap-8 group">
                                    <span className="text-[10px] uppercase tracking-[0.4em] text-white/20">Example</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-serif text-2xl text-white/40 italic">I love</span>
                                        <div className="bg-gold-500/10 border border-gold-500/20 px-4 py-2 rounded-xs">
                                            <span className="text-gold-500 font-serif text-xl">snow</span>
                                        </div>
                                        <div className="bg-[#a3e635]/10 border border-[#a3e635]/20 px-4 py-2 rounded-xs">
                                            <span className="text-[#a3e635] font-serif text-xl">Touching</span>
                                        </div>
                                        <span className="font-serif text-2xl text-white/40 italic">in winter</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6 mb-16 h-[700px] overflow-y-auto pr-4 no-scrollbar">
                                    {connections.map((conn, idx) => (
                                        <div key={idx} className="bg-white/[0.01] border border-white/[0.05] rounded-xs p-10 hover:bg-white/[0.02] transition-colors duration-500 flex flex-col items-center gap-8 text-center">
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={() => {
                                                        const newSentences = [...sentences];
                                                        const current = newSentences[idx];
                                                        const word = nouns[conn.n];
                                                        newSentences[idx] = current.trim() === '' ? word : `${current.trim()} ${word}`;
                                                        setSentences(newSentences);
                                                    }}
                                                    className="bg-gold-500/10 border border-gold-500/30 px-6 py-3 rounded-xs min-w-[120px] hover:bg-gold-500/20"
                                                >
                                                    <span className="text-gold-500 font-serif text-xl">{nouns[conn.n]}</span>
                                                </button>
                                                <div className="w-8 h-px bg-white/10" />
                                                <button
                                                    onClick={() => {
                                                        const newSentences = [...sentences];
                                                        const current = newSentences[idx];
                                                        const word = verbs[conn.v];
                                                        newSentences[idx] = current.trim() === '' ? word : `${current.trim()} ${word}`;
                                                        setSentences(newSentences);
                                                    }}
                                                    className="bg-[#a3e635]/10 border border-[#a3e635]/30 px-6 py-3 rounded-xs min-w-[120px] hover:bg-[#a3e635]/20"
                                                >
                                                    <span className="text-[#a3e635] font-serif text-xl">{verbs[conn.v]}</span>
                                                </button>
                                            </div>

                                            <div className="w-full max-w-2xl relative group">
                                                <input
                                                    type="text"
                                                    value={sentences[idx]}
                                                    onChange={(e) => {
                                                        const newSentences = [...sentences];
                                                        newSentences[idx] = e.target.value;
                                                        setSentences(newSentences);
                                                    }}
                                                    placeholder="Type your sentence here..."
                                                    className="w-full bg-transparent border-b border-white/10 py-4 px-4 text-xl font-serif text-white placeholder:text-white/5 focus:outline-none focus:border-gold-500/30 text-center"
                                                />
                                                <div className="absolute right-0 bottom-4">
                                                    {sentences[idx].trim() !== '' && <Check size={18} className="text-[#a3e635]" />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-xs flex justify-between items-center px-12">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Status</span>
                                        <span className="text-gold-500 font-bold text-xs tracking-widest">
                                            {sentences.filter(s => s.trim() !== '').length} / {connections.length} Sentences Built
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentStep(6)}
                                        disabled={sentences.filter(s => s.trim() !== '').length < 5}
                                        className={`px-16 py-5 rounded-xs text-[10px] uppercase tracking-[0.4em] font-bold ${sentences.filter(s => s.trim() !== '').length >= 5 ? 'bg-white text-charcoal' : 'bg-white/5 text-white/20 disabled'}`}
                                    >
                                        Finalize Lyrics
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 6 && (
                        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <div className="w-full max-w-4xl">
                                <div className="text-center mb-16 space-y-4">
                                    <p className="text-white/20 text-[10px] uppercase tracking-[0.3em]">Step 06 — Revelation</p>
                                    <h2 className="text-4xl font-serif text-alabaster italic">Story ready now</h2>
                                </div>

                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xs p-16 mb-20 relative overflow-hidden group">
                                    {/* Abstract background icon */}
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0.5">
                                            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                                            <path d="M2 17L12 22L22 17" />
                                            <path d="M2 12L12 17L22 12" />
                                        </svg>
                                    </div>

                                    <div className="space-y-10 relative z-10 max-h-[600px] overflow-y-auto pr-8 no-scrollbar">
                                        {sentences.filter(s => s.trim() !== '').map((sentence, sIdx) => {
                                            const conn = connections[sIdx];
                                            const noun = nouns[conn?.n] || '';
                                            const verb = verbs[conn?.v] || '';

                                            return (
                                                <div key={sIdx} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center">
                                                    {sentence.split(' ').map((word, wIdx) => {
                                                        const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
                                                        const isNoun = cleanWord === noun.toLowerCase();
                                                        const isVerb = cleanWord === verb.toLowerCase();

                                                        if (isNoun) {
                                                            return (
                                                                <div key={wIdx} className="bg-gold-500/10 border border-gold-500/20 px-4 py-2 rounded-xs inline-flex">
                                                                    <span className="text-gold-500 font-serif text-xl">{word}</span>
                                                                </div>
                                                            );
                                                        }
                                                        if (isVerb) {
                                                            return (
                                                                <div key={wIdx} className="bg-[#a3e635]/10 border border-[#a3e635]/20 px-4 py-2 rounded-xs inline-flex">
                                                                    <span className="text-[#a3e635] font-serif text-xl">{word}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return <span key={wIdx} className="font-serif text-2xl text-white/40 italic leading-snug">{word}</span>;
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-center items-center gap-16 mb-20">
                                    <button className="text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white transition-all pb-1 border-b border-transparent hover:border-white/20">Share with community</button>
                                    <button className="text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white transition-all pb-1 border-b border-transparent hover:border-white/20">Save it</button>
                                    <button className="text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white transition-all pb-1 border-b border-transparent hover:border-white/20">Save it</button>
                                </div>

                                <div className="flex justify-center mb-12">
                                    <button onClick={() => {
                                        setCurrentStep(1);
                                        setNouns(Array(10).fill(''));
                                        setVerbs(Array(10).fill(''));
                                        setConnections([]);
                                        setSentences(Array(10).fill(''));
                                    }} className="px-16 py-5 bg-gold-500 text-charcoal rounded-xs text-[10px] uppercase tracking-[0.4em] font-bold hover:bg-white transition-all">
                                        End Practice 2
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full max-w-5xl h-[60vh] flex items-center justify-center border border-white/[0.05] rounded-xs bg-white/[0.01]">
                    <div className="text-center space-y-4">
                        <p className="text-white/20 font-serif italic text-2xl tracking-tight">{selectedPractice}</p>
                        <p className="text-white/10 text-[10px] uppercase tracking-[0.2em] font-sans">Coming Soon in Next Movement</p>
                    </div>
                </div>
            )}

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
