"use client";

import { useState } from 'react';
import { SAMPLE_SONGS, Song } from '../data/songs';
import LyricsPlayer from './LyricsPlayer';
import { Play, Pause } from 'lucide-react';

export default function PracticeTab() {
    const [selectedCategory, setSelectedCategory] = useState('Pop singer Song Writer');
    const [selectedSubCategory, setSelectedSubCategory] = useState('Words');
    const [selectedSongId, setSelectedSongId] = useState('song-2');
    const [isPlaying, setIsPlaying] = useState(false);

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

    return (
        <div className="w-full min-h-screen bg-charcoal text-alabaster flex flex-col items-center pt-8 px-10">

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

            {/* Sub-Categories */}
            <div className="w-full max-w-5xl flex gap-10 mb-12">
                {subCategories.map(sub => (
                    <button
                        key={sub}
                        onClick={() => setSelectedSubCategory(sub)}
                        className={`
              text-lg font-serif tracking-tight transition-all duration-300
              ${selectedSubCategory === sub ? 'text-alabaster' : 'text-white/20 hover:text-white/40'}
            `}
                    >
                        {sub}
                    </button>
                ))}
            </div>

            {/* Song Selector */}
            <div className="w-full max-w-5xl flex gap-4 mb-16 overflow-x-auto no-scrollbar py-2">
                {songs.map(song => (
                    <button
                        key={song.id}
                        onClick={() => handleSongSelect(song.id)}
                        className={`
              flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-500 shrink-0
              ${selectedSongId === song.id
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-transparent border-white/5 text-white/30 hover:border-white/10'}
            `}
                    >
                        {selectedSongId === song.id && (
                            <div className="w-4 h-4 flex items-center justify-center">
                                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                            </div>
                        )}
                        <span className="text-xs uppercase tracking-widest font-sans">{song.title}</span>
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-5xl">
                {selectedSubCategory === 'Words' && (
                    <LyricsPlayer
                        song={currentSong}
                        isPlaying={isPlaying}
                        onTogglePlay={handleTogglePlay}
                    />
                )}

                {selectedSubCategory !== 'Words' && (
                    <div className="w-full h-[400px] flex items-center justify-center border border-white/[0.05] rounded-xs bg-white/[0.01]">
                        <p className="text-white/20 font-serif italic text-xl">Module "{selectedSubCategory}" under construction</p>
                    </div>
                )}
            </div>

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
