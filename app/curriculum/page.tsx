"use client";

import { motion } from 'framer-motion';
import { PlayCircle, Clock, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ModuleCard = ({ number, title, level, topics }: { number: string, title: string, level: string, topics: string[] }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group border border-stone-200 dark:border-white/5 bg-white dark:bg-charcoal p-8 md:p-12 transition-all hover:bg-stone-50 dark:hover:bg-white/[0.03] hover:border-gold-500/30 duration-300"
    >
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-6 flex-grow">
                <div className="flex items-center gap-4">
                    <span className="text-gold-500 font-sans font-bold tracking-[0.2em] text-sm">MODULE {number}</span>
                    <span className="w-12 h-px bg-stone-200 dark:bg-white/20 transition-colors duration-300" />
                    <span className="text-stone-900/40 dark:text-alabaster/40 font-sans text-xs tracking-[0.1em] uppercase transition-colors duration-300">{level}</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-serif text-stone-900 dark:text-alabaster group-hover:text-gold-500 transition-colors duration-300">{title}</h3>
                <p className="text-stone-900/50 dark:text-alabaster/50 text-lg font-sans font-light max-w-2xl leading-relaxed transition-colors duration-300">
                    Detailed exploration of the harmonic structures and visual patterns specific to this stage of mastery.
                </p>
                <div className="flex flex-wrap gap-x-12 gap-y-4 pt-4">
                    <div className="flex items-center gap-2 text-stone-900/30 dark:text-alabaster/30 text-xs font-sans uppercase tracking-widest font-semibold transition-colors duration-300">
                        <PlayCircle size={16} className="text-gold-500" />
                        24 Sessions
                    </div>
                    <div className="flex items-center gap-2 text-stone-900/30 dark:text-alabaster/30 text-xs font-sans uppercase tracking-widest font-semibold transition-colors duration-300">
                        <Clock size={16} className="text-gold-500" />
                        12 Hours
                    </div>
                    <div className="flex items-center gap-2 text-stone-900/30 dark:text-alabaster/30 text-xs font-sans uppercase tracking-widest font-semibold transition-colors duration-300">
                        <FileText size={16} className="text-gold-500" />
                        Syllabus PDF
                    </div>
                </div>
            </div>

            <div className="w-full md:w-64 space-y-3">
                {topics.map((topic, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-stone-900/60 dark:text-alabaster/60 font-sans border-b border-stone-100 dark:border-white/5 pb-2 transition-colors duration-300">
                        <div className="w-1 h-1 bg-gold-500 rounded-full" />
                        {topic}
                    </div>
                ))}
            </div>
        </div>
    </motion.div>
);

export default function CurriculumPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/signin');
        }
    }, [user, loading, router]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white dark:bg-charcoal">
            <div className="w-12 h-12 border-t-2 border-gold-500 rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    return (
        <div className="pt-48 pb-24 px-6 md:px-12 lg:px-24">
            <section className="max-w-7xl mx-auto mb-32">
                <div className="text-center space-y-6 mb-24">
                    <span className="text-gold-500 text-xs tracking-[0.4em] uppercase font-bold">THE PATH TO VIRTUOSITY</span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl leading-none text-stone-900 dark:text-white transition-colors duration-300 font-serif">A Structured <br /><span className="italic text-gold-500">Descent into Logic.</span></h1>
                    <p className="text-stone-900/60 dark:text-alabaster/60 text-xl font-sans font-light max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
                        From the physics of sound to the complexity of orchestration. Each module is designed to build upon the last, reinforcing the visual language of the Synesthesia Engine.
                    </p>
                </div>

                <div className="space-y-4">
                    <ModuleCard
                        number="01"
                        title="The Foundation"
                        level="Novice to Intermediate"
                        topics={["Physics of Airwaves", "Intervalic Geometry", "The Circle of Fifths", "Diatonic Harmony"]}
                    />
                    <ModuleCard
                        number="02"
                        title="The Fluency"
                        level="Intermediate to Advanced"
                        topics={["Modal Exploration", "Extended Chords", "Tension and Release", "Rhythmic Architecture"]}
                    />
                    <ModuleCard
                        number="03"
                        title="The Artistry"
                        level="Advanced to Virtuoso"
                        topics={["Improvisation Flows", "Orchestral Layers", "Emotional Dynamics", "Stage Presence"]}
                    />
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-7xl mx-auto bg-gold-500 p-12 md:p-24 text-charcoal flex flex-col md:flex-row justify-between items-center gap-12 rounded-xs overflow-hidden relative group transition-colors">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="space-y-6 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-serif leading-tight">Ready to begin your <br />musical evolution?</h2>
                    <p className="text-charcoal/70 text-lg font-sans max-w-md">
                        Join over 10,000 students who have mastered the language of music through our visual curriculum.
                    </p>
                </div>
                <button className="bg-charcoal text-alabaster px-12 py-6 text-sm uppercase font-bold tracking-[0.2em] hover:bg-black transition-colors shrink-0 group flex items-center gap-3 rounded-xs">
                    SECURE ENROLLMENT
                    <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </button>
            </section>
        </div>
    );
}
