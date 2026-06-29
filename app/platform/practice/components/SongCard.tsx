"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Song } from '../data/songs';

interface SongCardProps {
    song: Song;
    index: number;
    isSelected: boolean;
    isPlaying: boolean;
    onClick: () => void;
}

export default function SongCard({ song, index, isSelected, isPlaying, onClick }: SongCardProps) {
    // Determine the title text split into two lines for visual balance
    const words = song.title.split(' ');
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');

    return (
        <div 
            onClick={onClick}
            className="relative cursor-pointer select-none pt-6 flex-none w-[90px] group overflow-visible"
        >
            {/* Vinyl Record */}
            <motion.div
                className="absolute left-1/2 -ml-[38%] w-[76%] aspect-square rounded-full flex items-center justify-center z-0"
                style={{
                    background: 'radial-gradient(circle, #2a2a2a 0%, #0c0c0c 60%, #050505 100%)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    border: '1px solid #1a1a1a'
                }}
                variants={{
                    unselected: { y: 0, rotate: 0, opacity: 0.8 },
                    hover: { y: -14, rotate: 20, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 15 } },
                    selected: { y: -18, rotate: 12, opacity: 1, transition: { type: 'spring', stiffness: 250, damping: 20 } }
                }}
                animate={isSelected ? (isPlaying ? "playing" : "selected") : "unselected"}
                whileHover={!isSelected ? 'hover' : undefined}
                // Custom transition to rotate the vinyl record infinitely when playing
                {...(isSelected && isPlaying ? {
                    animate: { y: -18, rotate: 360 },
                    transition: {
                        y: { type: 'spring', stiffness: 250, damping: 20 },
                        rotate: { ease: "linear", duration: 3.5, repeat: Infinity }
                    }
                } : {})}
            >
                {/* Center hole sticker */}
                <div 
                    className="w-[28%] aspect-square rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] border border-black/30"
                    style={{
                        backgroundColor: isSelected ? '#FAF9F5' : '#C8C7BE'
                    }}
                />

                {/* Vinyl Grooves */}
                <div className="absolute inset-1.5 rounded-full border border-white/5 opacity-10" />
                <div className="absolute inset-3 rounded-full border border-white/5 opacity-5" />
            </motion.div>

            {/* Card Sleeve (SQUARE WITH ROUND CORNERS) */}
            <motion.div
                className={`
                    relative z-10 w-full aspect-square rounded-[12px] p-3 flex flex-col justify-between transition-colors duration-500 shadow-md border
                    ${isSelected 
                        ? 'bg-[#222222] border-stone-900 text-[#FAF9F5]' 
                        : 'bg-[#C8C7BE] border-[#B8B7AE] hover:border-stone-400 text-[#5F5F59]'
                    }
                `}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                {/* Top Label */}
                <div>
                    <span 
                        className={`
                            font-serif italic text-[11px] font-light tracking-wide transition-colors duration-500
                            ${isSelected ? 'text-[#FAF9F5]' : 'text-[#5F5F59]'}
                        `}
                    >
                        Song {index + 1}
                    </span>
                </div>

                {/* Bottom Song Title */}
                <div className="flex flex-col gap-0 mt-auto">
                    <h3 className="font-sans font-bold text-[8px] md:text-[9px] tracking-wider uppercase leading-tight break-words">
                        {line1}
                        {line2 && <span className="block">{line2}</span>}
                    </h3>
                    <span 
                        className={`
                            text-[6px] uppercase tracking-widest transition-colors duration-500 font-semibold
                            ${isSelected ? 'text-white/50' : 'text-[#5F5F59]/60'}
                        `}
                    >
                        {song.artist || 'Unknown'}
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
