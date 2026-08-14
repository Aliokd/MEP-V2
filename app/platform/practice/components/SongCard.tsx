"use client";

import React from 'react';
import { Song } from '../data/songs';

interface SongCardProps {
    song: Song;
    index: number;
    isSelected: boolean;
    isPlaying: boolean;
    onClick: () => void;
}

export default function SongCard({ song, index, isSelected, isPlaying, onClick }: SongCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                group relative w-full aspect-square rounded-[20px] p-5 flex flex-col justify-between text-left
                border transition-colors duration-200 select-none
                ${isSelected
                    ? 'bg-stone-900 border-stone-900'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }
            `}
        >
            {/* Track number */}
            <span className={`font-serif text-sm font-normal ${isSelected ? 'text-white/50' : 'text-stone-400'}`}>
                Song {index + 1}
            </span>

            {/* Playing indicator */}
            {isPlaying && (
                <span className="absolute top-5 right-5 flex items-end gap-[3px] h-3.5">
                    {[0, 1, 2].map(i => (
                        <span
                            key={i}
                            className={`w-[3px] rounded-full ${isSelected ? 'bg-white/70' : 'bg-stone-400'} animate-pulse`}
                            style={{ height: `${[10, 14, 7][i]}px`, animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </span>
            )}

            {/* Title + artist */}
            <span className="flex flex-col gap-1 min-w-0">
                <span className={`font-sans font-semibold text-sm leading-snug break-words ${isSelected ? 'text-[#FAF9F5]' : 'text-stone-800'}`}>
                    {song.title}
                </span>
                <span className={`text-xs truncate ${isSelected ? 'text-white/50' : 'text-stone-500'}`}>
                    {song.artist || 'Unknown'}
                </span>
            </span>
        </button>
    );
}
