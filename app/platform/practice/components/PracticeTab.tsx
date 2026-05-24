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
        <div className="w-full text-stone-900 flex flex-col items-center pt-4 px-10">

            {/* Top Level Practise Tabs */}
            <div className="w-full max-w-5xl flex gap-6 mb-12 overflow-x-auto no-scrollbar py-2">
                {practices.map(p => (
                    <button
                        key={p}
                        onClick={() => setSelectedPractice(p)}
                        className={`
                            px-8 py-3 text-[10px] uppercase tracking-[0.3em] font-sans transition-all duration-500 border
                            ${selectedPractice === p
                                ? 'bg-stone-900 text-[#DCDDD4] border-stone-900 font-bold rounded-full'
                                : 'bg-[#EFF0E7]/50 border-stone-200/80 text-stone-600/80 hover:bg-[#EFF0E7] hover:border-stone-300 rounded-full'}
                        `}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {selectedPractice === 'Practise 1' ? (
                <>
                    {/* Categories */}
                    <div className="w-full max-w-5xl flex gap-8 border-b border-stone-200 mb-8">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    text-[10px] uppercase tracking-[0.2em] font-sans pb-3 transition-all duration-300
                                    ${selectedCategory === cat ? 'text-stone-900 border-b-2 border-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-850'}
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
                                <span className="text-stone-500/80 text-[10px] uppercase tracking-widest block mb-6 font-semibold">Sub categories</span>
                                <div className="flex flex-col gap-4">
                                    {subCategories.map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setSelectedSubCategory(sub)}
                                            className={`
                                                text-left text-xs font-sans transition-all duration-300 hover:translate-x-1
                                                ${selectedSubCategory === sub ? 'text-stone-900 font-bold border-l-2 border-stone-900 pl-2' : 'text-stone-600/80 hover:text-stone-900 pl-2'}
                                            `}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-stone-500/80 text-[10px] uppercase tracking-widest block mb-4 font-semibold">Current progression</span>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-white/60 border border-stone-200 p-4 rounded-[12px]">
                                        <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
                                            <div className="bg-stone-900 h-full w-[65%]" />
                                        </div>
                                        <span className="ml-4 text-[10px] font-mono text-stone-900 font-bold">65%</span>
                                    </div>
                                    <p className="text-[10px] text-stone-500 italic">Mastering the lyrical flow. You're doing great!</p>
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
                                <div className="w-full bg-white/50 border border-stone-200/80 rounded-[20px] p-6 overflow-hidden">
                                    <LyricsPlayer
                                        song={currentSong}
                                        isPlaying={isPlaying}
                                        onTogglePlay={handleTogglePlay}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow flex items-center justify-center min-h-[400px] border border-stone-200 rounded-[20px] bg-white/40">
                                <p className="text-stone-700 font-sans text-xl font-semibold">Module "{selectedSubCategory}" under construction</p>
                            </div>
                        )}
                    </div>
                </>
             ) : selectedPractice === 'Practise 2' ? (
                <div className="w-full max-w-5xl flex flex-col items-center">
                    {/* Header for Practise 2 */}
                    <div className="w-full text-left mb-12">
                        <div className="flex items-center gap-4 text-stone-500/80 mb-2">
                            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">Practice 2</span>
                            <div className="h-px w-8 bg-stone-300" />
                            <span className="text-sm font-sans text-stone-900 font-bold">Composing words</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-stone-500/85 text-[10px] uppercase tracking-widest block mb-1 font-bold">Step 0{currentStep}</span>
                                <h1 className="text-4xl font-sans text-stone-900 tracking-tight font-light">
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
                                    className="group relative aspect-video md:aspect-[4/3] bg-white border border-stone-200 flex items-center justify-center overflow-hidden hover:border-stone-400 hover:shadow-md transition-all duration-300 rounded-[12px]"
                                >
                                    <div className="absolute inset-x-0 bottom-0 h-0 group-hover:h-full bg-stone-50 transition-all duration-700 ease-out" />
                                    <span className="relative z-10 text-[10px] uppercase tracking-[0.3em] text-stone-600 group-hover:text-stone-900 group-hover:scale-105 transition-all duration-500 font-bold">
                                        {theme}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {(currentStep === 2 || currentStep === 3) && (
                        <div className="w-full flex flex-col md:flex-row gap-12 items-start">
                            <div className="hidden lg:flex flex-col gap-4 w-64 pt-2 shrink-0">
                                <div className="p-4 bg-white border border-stone-200 rounded-[12px]">
                                    <span className="text-[10px] uppercase tracking-widest text-stone-500 block mb-2 font-semibold">Theme</span>
                                    <span className="text-stone-900 font-sans text-lg font-bold">{selectedTheme}</span>
                                </div>

                                {currentStep === 3 && (
                                    <div className="p-4 bg-white border border-stone-200 rounded-[12px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">Nouns</span>
                                            <button onClick={() => setCurrentStep(2)} className="text-[8px] uppercase tracking-widest text-stone-600 hover:text-stone-900 transition-colors font-bold">Edit</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {nouns.filter(n => n.trim() !== '').map((n, i) => (
                                                <span key={i} className="px-2 py-1 bg-stone-100 rounded-xs text-[9px] text-stone-700 uppercase tracking-tighter font-medium">{n}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow max-w-lg bg-white border border-stone-200 rounded-[20px] shadow-sm overflow-hidden">
                                <div className="p-8 space-y-8">
                                    <div className="space-y-1">
                                        <p className="text-stone-500 text-[10px] uppercase tracking-[0.2em] font-semibold">Objective</p>
                                        <h2 className="text-2xl font-sans text-stone-900 font-normal">
                                            {currentStep === 2 ? 'Type 10 nouns of your choice' : 'Type 10 verbs of your choice'}
                                        </h2>
                                        <p className="text-stone-500/80 text-[10px] uppercase tracking-widest font-medium">Hint: Focus on sensory details related to {selectedTheme}</p>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        {Array.from({ length: 10 }).map((_, i) => (
                                            <div key={i} className="group relative">
                                                <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[8px] text-stone-400 font-mono font-bold">
                                                    {(i + 1).toString().padStart(2, '0')}
                                                </div>
                                                <div className="flex items-center gap-4 border-b border-stone-200 group-focus-within:border-stone-850 transition-all duration-500 py-3">
                                                    <input
                                                        type="text"
                                                        placeholder={currentStep === 2 ? "Enter Noun..." : "Enter Verb..."}
                                                        value={currentStep === 2 ? nouns[i] : verbs[i]}
                                                        onChange={(e) => handleWordChange(currentStep === 2 ? 'noun' : 'verb', i, e.target.value)}
                                                        className="bg-transparent border-none outline-none flex-grow font-sans text-stone-900 placeholder:text-stone-400 text-lg font-medium"
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
                                        w-[calc(100%-4rem)] mx-8 mb-8 py-5 flex items-center justify-center gap-4 group transition-all duration-1000 rounded-full
                                        ${isStepComplete(currentStep)
                                            ? 'bg-[#86BE7F] hover:bg-[#86BE7F]/90 text-stone-950 font-bold'
                                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'}
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
                            <div className="w-full max-w-5xl bg-white border border-stone-200 rounded-[20px] overflow-hidden relative shadow-sm">
                                <div className="p-12 relative">
                                    <div className="text-center mb-16 space-y-2">
                                        <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold">Step 04 — Connection</p>
                                        <h2 className="text-4xl font-sans text-stone-900 font-light tracking-tight">Link Nouns with Verbs</h2>
                                        <p className="text-stone-550/80 text-[10px] uppercase tracking-widest font-semibold">Connect nouns with verbs 1 by 1 (order doesn't matter)</p>
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
                                                        stroke="#787878"
                                                        strokeWidth="1.5"
                                                        strokeOpacity={isActive ? "0.8" : "0.3"}
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
                                                            group relative h-16 w-full px-6 transition-all duration-500 rounded-[12px] flex items-center border
                                                            ${isConnected ? 'bg-[#EFF0E7] border-stone-300 text-stone-900' : isSelected ? 'bg-stone-900 border-stone-900 text-[#DCDDD4] shadow-sm' : 'bg-stone-50/50 border-stone-200/80 hover:border-stone-300'}
                                                        `}
                                                    >
                                                        <div className="flex items-center justify-between w-full pointer-events-none">
                                                            <span className={`font-sans text-lg transition-colors duration-500 ${isConnected ? 'text-stone-900 font-semibold' : isSelected ? 'text-[#DCDDD4]' : 'text-stone-700'}`}>{n}</span>
                                                            <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-500 ${isConnected ? 'bg-stone-900 border-stone-900' : isSelected ? 'bg-[#DCDDD4] border-[#DCDDD4] scale-125' : 'bg-transparent border-stone-300'}`} />
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
                                                            group relative h-16 w-full px-6 transition-all duration-500 rounded-[12px] flex items-center border
                                                            ${isConnected ? 'bg-[#EFF0E7] border-stone-300 text-stone-900' : canConnect ? 'bg-white border-stone-300 hover:bg-[#EFF0E7]/60 hover:border-stone-400' : 'bg-stone-50/50 border-stone-200/80 hover:border-stone-300'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-4 w-full justify-end md:justify-start pointer-events-none">
                                                            <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-500 ${isConnected ? 'bg-stone-900 border-stone-900' : canConnect ? 'bg-transparent border-stone-400' : 'bg-transparent border-stone-300'}`} />
                                                            <span className={`font-sans text-lg transition-colors duration-500 ${isConnected ? 'text-stone-900 font-semibold' : 'text-stone-700'}`}>{v}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-stone-50 border-t border-stone-200 flex justify-between items-center px-12">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 font-semibold">Status</span>
                                        <span className="text-stone-900 font-bold text-xs tracking-widest">{connections.length}/10 Links Forged</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <button onClick={() => { setConnections([]); setPendingNounIndex(null); }} className="px-8 py-4 text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors font-bold">Reset</button>
                                        <button
                                            disabled={connections.length < 5}
                                            onClick={() => setCurrentStep(5)}
                                            className={`
                                                group relative px-16 py-4 rounded-full transition-all duration-700
                                                ${connections.length >= 5 ? 'bg-stone-900 text-[#DCDDD4] hover:bg-stone-800 font-bold shadow-sm' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}
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
                                    <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold">Step 05 — Composition</p>
                                    <h2 className="text-4xl font-sans text-stone-900 font-light tracking-tight">Complete the sentences</h2>
                                    <p className="text-stone-550/80 text-[10px] uppercase tracking-widest font-semibold">(don't overthink, just put staff together)</p>
                                </div>

                                <div className="bg-white border border-stone-200 rounded-[12px] p-8 mb-12 flex items-center justify-center gap-8 group shadow-xs">
                                    <span className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold">Example</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-sans text-2xl text-stone-700 font-normal">I love</span>
                                        <div className="bg-[#EFF0E7] border border-stone-300 px-4 py-2 rounded-[8px]">
                                            <span className="text-stone-900 font-sans text-xl font-bold">snow</span>
                                        </div>
                                        <div className="bg-stone-900 px-4 py-2 rounded-[8px]">
                                            <span className="text-[#DCDDD4] font-sans text-xl font-bold">Touching</span>
                                        </div>
                                        <span className="font-sans text-2xl text-stone-700 font-normal">in winter</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6 mb-16 h-[700px] overflow-y-auto pr-4 no-scrollbar">
                                    {connections.map((conn, idx) => (
                                        <div key={idx} className="bg-white border border-stone-200 rounded-[20px] p-10 hover:shadow-md transition-shadow duration-500 flex flex-col items-center gap-8 text-center">
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={() => {
                                                        const newSentences = [...sentences];
                                                        const current = newSentences[idx];
                                                        const word = nouns[conn.n];
                                                        newSentences[idx] = current.trim() === '' ? word : `${current.trim()} ${word}`;
                                                        setSentences(newSentences);
                                                    }}
                                                    className="bg-[#EFF0E7] border border-stone-300 px-6 py-3 rounded-[8px] min-w-[120px] hover:opacity-90"
                                                >
                                                    <span className="text-stone-900 font-sans text-xl font-bold">{nouns[conn.n]}</span>
                                                </button>
                                                <div className="w-8 h-px bg-stone-300" />
                                                <button
                                                    onClick={() => {
                                                        const newSentences = [...sentences];
                                                        const current = newSentences[idx];
                                                        const word = verbs[conn.v];
                                                        newSentences[idx] = current.trim() === '' ? word : `${current.trim()} ${word}`;
                                                        setSentences(newSentences);
                                                    }}
                                                    className="bg-stone-900 px-6 py-3 rounded-[8px] min-w-[120px] hover:opacity-90"
                                                >
                                                    <span className="text-[#DCDDD4] font-sans text-xl font-bold">{verbs[conn.v]}</span>
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
                                                    className="w-full bg-transparent border-b border-stone-200 py-4 px-4 text-xl font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-850 text-center"
                                                />
                                                <div className="absolute right-0 bottom-4">
                                                    {sentences[idx].trim() !== '' && <Check size={18} className="text-stone-900" />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-8 bg-stone-50 border border-stone-200 rounded-[20px] flex justify-between items-center px-12 shadow-xs">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest text-stone-550 mb-1 font-semibold">Status</span>
                                        <span className="text-stone-900 font-bold text-xs tracking-widest">
                                            {sentences.filter(s => s.trim() !== '').length} / {connections.length} Sentences Built
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentStep(6)}
                                        disabled={sentences.filter(s => s.trim() !== '').length < 5}
                                        className={`px-16 py-4 rounded-full text-[10px] uppercase tracking-[0.4em] font-bold ${sentences.filter(s => s.trim() !== '').length >= 5 ? 'bg-stone-900 text-[#DCDDD4] hover:bg-stone-800' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
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
                                    <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold">Step 06 — Revelation</p>
                                    <h2 className="text-4xl font-sans text-stone-900 font-light tracking-tight">Story ready now</h2>
                                </div>

                                <div className="bg-white border border-stone-200 rounded-[20px] p-16 mb-20 relative overflow-hidden group shadow-sm">
                                    {/* Abstract background icon */}
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="0.5">
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
                                                                <div key={wIdx} className="bg-[#EFF0E7] border border-stone-300 px-4 py-2 rounded-[8px] inline-flex">
                                                                    <span className="text-stone-900 font-sans text-xl font-bold">{word}</span>
                                                                </div>
                                                            );
                                                        }
                                                        if (isVerb) {
                                                            return (
                                                                <div key={wIdx} className="bg-stone-900 px-4 py-2 rounded-[8px] inline-flex">
                                                                    <span className="text-[#DCDDD4] font-sans text-xl font-bold">{word}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return <span key={wIdx} className="font-sans text-2xl text-stone-800 leading-snug">{word}</span>;
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-center items-center gap-16 mb-20">
                                    <button className="text-[10px] uppercase tracking-[0.4em] text-stone-500 hover:text-stone-900 transition-all pb-1 border-b border-transparent hover:border-stone-400 font-bold">Share with community</button>
                                    <button className="text-[10px] uppercase tracking-[0.4em] text-stone-500 hover:text-stone-900 transition-all pb-1 border-b border-transparent hover:border-stone-400 font-bold">Save it</button>
                                </div>

                                <div className="flex justify-center mb-12">
                                    <button onClick={() => {
                                        setCurrentStep(1);
                                        setNouns(Array(10).fill(''));
                                        setVerbs(Array(10).fill(''));
                                        setConnections([]);
                                        setSentences(Array(10).fill(''));
                                    }} className="px-16 py-4 bg-stone-900 text-[#DCDDD4] rounded-full text-[10px] uppercase tracking-[0.4em] font-bold hover:opacity-90 transition-all shadow-sm">
                                        End Practice 2
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full max-w-5xl h-[60vh] flex items-center justify-center border border-stone-200 rounded-[20px] bg-white/40">
                    <div className="text-center space-y-4">
                        <p className="text-stone-800 font-sans text-2xl tracking-tight font-bold">{selectedPractice}</p>
                        <p className="text-stone-700 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold">Coming Soon in Next Movement</p>
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
