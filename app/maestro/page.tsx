"use client";

import { motion } from 'framer-motion';
import { Award, Globe, BookOpen, Quote, Cpu } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MaestroPage() {
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
        <div className="pt-48 pb-24">
            {/* Bio Section */}
            <section className="px-6 md:px-12 lg:px-24 grid lg:grid-cols-2 gap-24 items-center mb-48 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1 }}
                    className="relative group"
                >
                    <div className="absolute -inset-4 border border-gold-500/20 scale-95 group-hover:scale-100 transition-transform duration-700 pointer-events-none" />
                    <div className="relative aspect-[4/5] w-full">
                        <Image
                            src="/assets/maestro.png"
                            alt="The Maestro"
                            fill
                            className="object-cover grayscale filter brightness-75 rounded-xs"
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="space-y-8"
                >
                    <div className="space-y-4">
                        <span className="text-gold-500 text-xs tracking-[0.4em] uppercase font-bold">LEGACY & MASTERY</span>
                        <h1 className="text-5xl md:text-7xl leading-tight text-stone-900 dark:text-white transition-colors duration-300 font-serif">A Lifetime on the <br /><span className="text-gold-500 italic">Global Stage.</span></h1>
                    </div>
                    <p className="text-stone-900/60 dark:text-alabaster/60 text-lg font-sans font-light leading-relaxed transition-colors duration-300">
                        With over four decades of experience performing in the world's most prestigious concert halls—from Carnegie Hall to the Sydney Opera House—the Maestro has dedicated his life to uncovering the universal laws of musical language.
                    </p>
                    <p className="text-stone-900/60 dark:text-alabaster/60 text-lg font-sans font-light leading-relaxed transition-colors duration-300">
                        His philosophy is simple: Music is not about notes on a page; it is about the physics of emotion and the geometry of silence. After 40 years of refinement, he is ready to transfer this knowledge to the next generation of virtuosos.
                    </p>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-stone-200 dark:border-white/5 transition-colors duration-300">
                        <div className="space-y-2">
                            <div className="text-gold-500 flex items-center gap-2 font-serif uppercase tracking-widest text-xs">
                                <Globe size={18} />
                                <span className="text-stone-900 dark:text-alabaster transition-colors duration-300 font-bold">40+ Countries</span>
                            </div>
                            <p className="text-[10px] text-stone-900/40 dark:text-alabaster/40 font-sans uppercase tracking-[0.1em] transition-colors duration-300">Performed Worldwide</p>
                        </div>
                        <div className="space-y-2">
                            <div className="text-gold-500 flex items-center gap-2 font-serif uppercase tracking-widest text-xs">
                                <Award size={18} />
                                <span className="text-stone-900 dark:text-alabaster transition-colors duration-300 font-bold">3x Grammy Nominee</span>
                            </div>
                            <p className="text-[10px] text-stone-900/40 dark:text-alabaster/40 font-sans uppercase tracking-[0.1em] transition-colors duration-300">Technical Achievement</p>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Philosophy Section */}
            <section className="bg-stone-50 dark:bg-white/[0.02] py-48 px-6 text-center border-y border-stone-200 dark:border-white/5 transition-colors duration-300">
                <div className="max-w-4xl mx-auto space-y-12">
                    <Quote className="text-gold-500/20 w-24 h-24 mx-auto mb-8" />
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif italic text-stone-900/90 dark:text-alabaster/90 leading-[1.2] transition-colors duration-300">
                        "The greatest barrier to mastery is not a lack of talent, but the presence of noise. This curriculum is the silence you need to finally hear the music."
                    </h2>
                    <div className="space-y-2">
                        <p className="text-gold-500 tracking-[0.4em] uppercase font-bold text-sm">THE MAESTRO</p>
                        <p className="text-stone-900/40 dark:text-alabaster/40 text-[10px] font-sans italic tracking-widest transition-colors duration-300">Grand Conservatory of Sound, Emeritus</p>
                    </div>
                </div>
            </section>

            {/* The Vision Section */}
            <section className="px-6 md:px-12 lg:px-24 mt-48 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-16">
                    <div className="space-y-4">
                        <BookOpen size={40} className="text-gold-500" />
                        <h3 className="text-2xl font-serif text-stone-900 dark:text-white transition-colors duration-300">The Pedagogy</h3>
                        <p className="text-stone-900/50 dark:text-alabaster/50 text-sm font-sans leading-relaxed transition-colors duration-300">
                            Moving away from rote memorization towards architectural understanding. Learn why a chord works before you learn its name.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-gold-500/20 blur-lg rounded-full transition-colors duration-300" />
                            <Cpu size={40} className="text-gold-500 relative z-10" />
                        </div>
                        <h3 className="text-2xl font-serif text-stone-900 dark:text-white transition-colors duration-300">The Technology</h3>
                        <p className="text-stone-900/50 dark:text-alabaster/50 text-sm font-sans leading-relaxed transition-colors duration-300">
                            Leveraging real-time visualization technology to provide the kind of instant feedback that used to require a private masterclass.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <Globe size={40} className="text-gold-500" />
                        <h3 className="text-2xl font-serif text-stone-900 dark:text-white transition-colors duration-300">The Community</h3>
                        <p className="text-stone-900/50 dark:text-alabaster/50 text-sm font-sans leading-relaxed transition-colors duration-300">
                            A global network of elite musicians and dedicated students, all speaking the same visual language of harmony.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
