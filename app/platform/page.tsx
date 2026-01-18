"use client";

import { getUserConstellation, ConstellationData } from '@/app/actions/lesson-actions';
import ConstellationGraph from './components/ConstellationGraph';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

export default function PlatformPage() {
    const { user } = useAuth();
    const [data, setData] = useState<ConstellationData | null>(null);

    useEffect(() => {
        if (user) {
            getUserConstellation(user.uid).then(setData);
        }
    }, [user]);

    if (!data) return (
        <div className="h-screen flex items-center justify-center bg-transparent">
            <div className="w-8 h-8 border-t-2 border-gold-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="relative min-h-screen">
            {/* Header Overlay */}
            <div className="absolute top-10 left-10 z-20">
                <h1 className="text-4xl font-serif text-alabaster tracking-tight mb-2">The Constellation</h1>
                <p className="text-gold-400 font-sans text-xs uppercase tracking-[0.3em] opacity-80">Your Path to Mastery</p>
            </div>

            {/* Stats Overlay */}
            <div className="absolute bottom-10 right-10 z-20 flex gap-10">
                <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Lessons Completed</p>
                    <p className="text-2xl font-serif text-alabaster tracking-tighter">12 / 48</p>
                </div>
                <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Current Movement</p>
                    <p className="text-2xl font-serif text-alabaster tracking-tighter">Foundation</p>
                </div>
            </div>

            <ConstellationGraph lessons={data.lessonsList} progress={data.user.lessonProgress} />
        </div>
    );
}
