"use client";

import { motion } from 'framer-motion';
import { Layers, Eye, Music, Cpu, Share2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-8 bg-stone-50 dark:bg-black/40 border border-stone-200 dark:border-white/5 rounded-xs space-y-4 hover:border-gold-500/30 transition-all group duration-300"
    >
        <div className="w-12 h-12 rounded-full bg-gold-500/5 flex items-center justify-center text-gold-500 group-hover:bg-gold-500/10 transition-colors">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-serif tracking-wide text-stone-900 dark:text-alabaster transition-colors duration-300">{title}</h3>
        <p className="text-stone-900/50 dark:text-alabaster/50 text-sm font-sans leading-relaxed transition-colors duration-300">{desc}</p>
    </motion.div>
);

export default function MethodPage() {
    return (
        <div className="pt-48 pb-24 px-6 md:px-12 lg:px-24">
            {/* Hero Section */}
            <section className="max-w-6xl mx-auto mb-32 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-6"
                >
                    <span className="text-gold-500 text-xs tracking-[0.4em] uppercase font-bold">THE SYNESTHESIA ENGINE</span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl leading-tight text-stone-900 dark:text-white transition-colors duration-300 font-serif">
                        See the Harmony. <br />
                        <span className="italic text-gold-500">Decode the Soul.</span>
                    </h1>
                    <p className="text-stone-900/60 dark:text-alabaster/60 text-xl font-sans font-light max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
                        Traditional music theory is taught through dry textbooks and black-and-white staves.
                        We've built a system that translates sound into a visual spectrum of emotion and geometry.
                    </p>
                </motion.div>
            </section>

            {/* Main Feature Highlight */}
            <section className="max-w-6xl mx-auto mb-48">
                <div className="relative aspect-video rounded-xs overflow-hidden border border-stone-200 dark:border-white/10 bg-stone-100 dark:bg-charcoal shadow-2xl shadow-gold-500/5 transition-colors duration-300">
                    <Image
                        src="/assets/synesthesia.png"
                        alt="Synesthesia Engine"
                        fill
                        className="object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-charcoal via-transparent to-transparent transition-colors duration-300" />
                    <div className="absolute bottom-12 left-12 max-w-lg space-y-4">
                        <h2 className="text-3xl font-serif text-stone-900 dark:text-white transition-colors duration-300 font-serif">Intuitive Harmonic Visualization</h2>
                        <p className="text-stone-900/60 dark:text-alabaster/60 text-sm font-sans leading-relaxed text-balance transition-colors duration-300">
                            The engine analyzes audio in real-time, mapping frequencies to specific colors based on the circle of fifths.
                            Complex chords become beautiful geometric shapes, making counterpoint as easy to understand as a painting.
                        </p>
                    </div>
                </div>
            </section>

            {/* Deep Dive Features */}
            <section className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-48">
                <FeatureCard
                    icon={Layers}
                    title="Layered Counterpoint"
                    desc="Watch multiple melodies weave together in a 3D visual space, revealing the hidden architecture of the composition."
                />
                <FeatureCard
                    icon={Eye}
                    title="Visual Intervals"
                    desc="Tension and resolution are no longer abstract concepts. See the physical 'pull' between notes before you play them."
                />
                <FeatureCard
                    icon={Music}
                    title="Spectral Analysis"
                    desc="Deep dive into the timbre of your instrument with high-fidelity spectral mapping unique to your own sound."
                />
                <FeatureCard
                    icon={Cpu}
                    title="AI-Driven Synthesis"
                    desc="Our proprietary algorithm adapts to your learning pace, highlighting visual cues that resonate with your individual neural mapping."
                />
                <FeatureCard
                    icon={Share2}
                    title="Collaborative Canvas"
                    desc="Share your visual compositions with the community. Learn how others 'see' the same piece of music."
                />
                <FeatureCard
                    icon={ShieldCheck}
                    title="Proven Pedagogy"
                    desc="Back by neuroscientific research into how the brain processes multi-sensory information for faster retention."
                />
            </section>

            {/* Closing Statement */}
            <section className="max-w-4xl mx-auto text-center border-t border-stone-200 dark:border-white/5 pt-24 transition-colors duration-300">
                <h2 className="text-4xl md:text-5xl mb-8 leading-tight text-stone-900 dark:text-white transition-colors duration-300 font-serif">The shortest path between <br /><span className="text-gold-500 italic">thought and sound.</span></h2>
                <p className="text-stone-900/50 dark:text-alabaster/50 text-lg font-sans font-light mb-12 transition-colors duration-300">
                    By engaging both the visual and auditory cortex simultaneously, The Conservatory students learn
                    4.5x faster than traditional conservatory students.
                </p>
                <button className="bg-stone-900 dark:bg-alabaster text-white dark:text-charcoal px-10 py-5 rounded-xs text-xs tracking-[0.2em] font-bold hover:bg-gold-500 dark:hover:bg-gold-500 dark:hover:text-white transition-all">
                    EXPERIENCE THE ENGINE
                </button>
            </section>
        </div>
    );
}
