import { motion } from 'framer-motion';
import { Layers, Eye, Music, Cpu, Share2, ShieldCheck } from 'lucide-react';
import synesthesiaImg from '../assets/synesthesia.png';

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-8 bg-black/40 border border-white/5 rounded-xs space-y-4 hover:border-gold/30 transition-all group"
    >
        <div className="w-12 h-12 rounded-full bg-gold/5 flex items-center justify-center text-gold group-hover:bg-gold/10 transition-colors">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-serif tracking-wide text-alabaster">{title}</h3>
        <p className="text-alabaster/50 text-sm font-sans leading-relaxed">{desc}</p>
    </motion.div>
);

const Method = () => {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 lg:px-24">
            {/* Hero Section */}
            <section className="max-w-6xl mx-auto mb-32 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-6"
                >
                    <span className="text-gold text-xs tracking-[0.4em] uppercase font-bold">THE SYNESTHESIA ENGINE</span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl leading-tight">
                        See the Harmony. <br />
                        <span className="italic text-gold italic">Decode the Soul.</span>
                    </h1>
                    <p className="text-alabaster/60 text-xl font-sans font-light max-w-3xl mx-auto leading-relaxed">
                        Traditional music theory is taught through dry textbooks and black-and-white staves.
                        We've built a system that translates sound into a visual spectrum of emotion and geometry.
                    </p>
                </motion.div>
            </section>

            {/* Main Feature Highlight */}
            <section className="max-w-6xl mx-auto mb-48">
                <div className="relative aspect-video rounded-xs overflow-hidden border border-white/10 bg-charcoal shadow-2xl shadow-gold/5">
                    <img src={synesthesiaImg} alt="Synesthesia Engine" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent" />
                    <div className="absolute bottom-12 left-12 max-w-lg space-y-4">
                        <h2 className="text-3xl font-serif">Intuitive Harmonic Visualization</h2>
                        <p className="text-alabaster/60 text-sm font-sans leading-relaxed text-balance">
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
            <section className="max-w-4xl mx-auto text-center border-t border-white/5 pt-24">
                <h2 className="text-4xl md:text-5xl mb-8 leading-tight">The shortest path between <br /><span className="text-gold italic">thought and sound.</span></h2>
                <p className="text-alabaster/50 text-lg font-sans font-light mb-12">
                    By engaging both the visual and auditory cortex simultaneously, The Conservatory students learn
                    4.5x faster than traditional conservatory students.
                </p>
                <button className="btn-primary text-xs tracking-[0.2em] font-bold">EXPERIENCE THE ENGINE</button>
            </section>
        </div>
    );
};

export default Method;
