"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Award, Star, Zap, Music, Disc } from 'lucide-react';

const achievements = [
    { id: 1, title: "Perfect Pitch", description: "Identified 50 intervals correctly in a row.", icon: Music, earned: true, date: "Oct 12, 2025" },
    { id: 2, title: "Synesthesia Initiate", description: "Completed the Foundation module.", icon: Zap, earned: true, date: "Nov 01, 2025" },
    { id: 3, title: "Virtuoso Streak", description: "Practiced for 30 consecutive days.", icon: Star, earned: false },
    { id: 4, title: "Golden Ear", description: "Scored 100% on the Advanced Ear Training exam.", icon: Award, earned: false },
    { id: 5, title: "Master Composer", description: "Published your first original composition.", icon: Disc, earned: false },
];

export default function AchievementsPage() {
    return (
        <div className="p-10 space-y-12 min-h-screen bg-[#DCDDD4] text-stone-900 font-sans">
            <header className="space-y-4">
                <h1 className="text-4xl font-sans font-light tracking-tight text-stone-900">Achievements</h1>
                <p className="text-stone-700 font-sans max-w-2xl text-sm font-medium">
                    Milestones on your journey to mastery.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                        <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`
                                p-8 rounded-[16px] border flex flex-col items-center text-center space-y-6 transition-all duration-500
                                ${achievement.earned
                                    ? 'bg-white/60 border-stone-250 shadow-xs'
                                    : 'bg-white/30 border-stone-200/80 opacity-60 grayscale'}
                            `}
                        >
                            <div className={`
                                w-20 h-20 rounded-full flex items-center justify-center
                                ${achievement.earned ? 'bg-stone-900 text-[#DCDDD4]' : 'bg-stone-200/50 text-stone-400'}
                            `}>
                                <Icon size={32} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-sans font-bold text-stone-900">{achievement.title}</h3>
                                <p className="text-xs text-stone-700 leading-relaxed font-sans font-medium">{achievement.description}</p>
                            </div>

                            {achievement.earned && (
                                <div className="text-[10px] uppercase tracking-widest text-stone-700 font-semibold pt-4 border-t border-stone-200/60 w-full">
                                    Unlocked {achievement.date}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
