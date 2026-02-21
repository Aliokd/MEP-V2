"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Song } from '../data/songs';

interface SongCardProps {
    song: Song;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}

export default function SongCard({ song, index, isSelected, onClick }: SongCardProps) {
    return (
        <motion.div
            className="group relative cursor-pointer"
            onClick={onClick}
            initial={false}
        >
            {/* The Vinyl Disc */}
            <motion.div
                className="absolute left-1/2 -ml-[45%] top-0 w-[90%] aspect-square rounded-full bg-black flex items-center justify-center z-0"
                style={{
                    background: 'radial-gradient(circle, #222 0%, #000 70%, #111 100%)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}
                variants={{
                    initial: { y: 20, opacity: 0 },
                    hover: { y: -60, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } }
                }}
                animate={isSelected ? 'hover' : undefined}
                whileHover="hover"
            >
                {/* Disc Center Hole */}
                <div className="w-[25%] aspect-square rounded-full bg-alabaster/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" />

                {/* Groove lines effect */}
                <div className="absolute inset-2 rounded-full border border-white/5 opacity-20" />
                <div className="absolute inset-6 rounded-full border border-white/5 opacity-10" />
                <div className="absolute inset-10 rounded-full border border-white/5 opacity-5" />
            </motion.div>

            {/* The Cover */}
            <motion.div
                className={`
                    relative z-10 aspect-square w-full overflow-hidden border transition-all duration-500
                    ${isSelected ? 'border-gold-500/50 shadow-2xl' : 'border-white/5 group-hover:border-white/20'}
                `}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                {/* Background Image / Placeholder */}
                {song.coverUrl ? (
                    <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-700"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                )}

                {/* Overlays */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative h-full w-full p-6 flex flex-col justify-between">
                    <div>
                        <span className="font-serif italic text-xl md:text-2xl text-alabaster/90">
                            Song {index + 1}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <h3 className="font-sans font-medium text-xs md:text-sm tracking-[0.2em] uppercase leading-relaxed text-alabaster break-words">
                            {song.title}
                        </h3>
                        {song.artist && (
                            <span className="text-[10px] uppercase tracking-widest text-white/40">
                                {song.artist}
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
