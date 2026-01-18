"use client";

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
        <div className="p-10 space-y-12 min-h-screen bg-charcoal text-alabaster">
            <header className="space-y-4">
                <h1 className="text-4xl font-serif text-alabaster">Achievements</h1>
                <p className="text-stone-400 font-sans max-w-2xl">
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
                                p-8 rounded-xs border flex flex-col items-center text-center space-y-6 transition-all
                                ${achievement.earned
                                    ? 'bg-gradient-to-b from-white/5 to-transparent border-gold-500/30 shadow-[0_0_30px_-10px_rgba(197,160,89,0.1)]'
                                    : 'bg-white/[0.02] border-white/5 opacity-50 grayscale'}
                            `}
                        >
                            <div className={`
                                w-20 h-20 rounded-full flex items-center justify-center
                                ${achievement.earned ? 'bg-gold-500/10 text-gold-500' : 'bg-white/5 text-white/20'}
                            `}>
                                <Icon size={32} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-serif">{achievement.title}</h3>
                                <p className="text-xs text-white/60 leading-relaxed font-sans">{achievement.description}</p>
                            </div>

                            {achievement.earned && (
                                <div className="text-[10px] uppercase tracking-widest text-gold-500/60 font-mono pt-4 border-t border-white/5 w-full">
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
