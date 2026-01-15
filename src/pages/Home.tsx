import { motion, useScroll, useTransform } from 'framer-motion';
import { Music, Check, ChevronRight, PlaySquare, Zap } from 'lucide-react';
import maestroImg from '../assets/maestro.png';
import synesthesiaImg from '../assets/synesthesia.png';

const Hero = () => {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 200]);

    return (
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/60 z-10" />
                <video
                    autoPlay
                    muted
                    loop
                    className="w-full h-full object-cover grayscale opacity-40 scale-105"
                >
                    <source src="https://assets.mixkit.co/videos/preview/mixkit-piano-player-playing-with-passion-4443-large.mp4" type="video/mp4" />
                </video>
            </div>

            <motion.div
                style={{ y }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="relative z-20 text-center max-w-4xl px-6"
            >
                <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8 leading-[1.1]">
                    Don't Just Play Notes. <br />
                    <span className="italic text-gold">Speak the Language.</span>
                </h1>
                <p className="text-lg md:text-xl text-alabaster/60 mb-12 max-w-2xl mx-auto font-sans font-light leading-relaxed">
                    40 years of mastery distilled into a visual, interactive path.
                    Go from silence to symphony.
                </p>
                <button className="btn-primary flex items-center gap-3 mx-auto group text-xs tracking-[0.2em] font-bold">
                    START YOUR PRELUDE
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-30">
                <div className="w-px h-12 bg-gold" />
            </div>
        </section>
    );
};

const Authority = () => {
    return (
        <section className="section-padding bg-charcoal grid md:grid-cols-2 gap-16 items-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="relative aspect-[3/4] overflow-hidden rounded-xs border border-white/10"
            >
                <img src={maestroImg} alt="The Maestro" className="w-full h-full object-cover grayscale hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-60" />
            </motion.div>

            <div className="space-y-8">
                <div className="space-y-2">
                    <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">THE MAESTRO</span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl text-alabaster leading-tight">
                        Knowledge that usually <br />takes a lifetime.
                    </h2>
                </div>
                <p className="text-lg text-alabaster/60 font-sans font-light leading-relaxed">
                    "I spent 40 years on global stages so you can learn the secrets in months.
                    This is not a course; it is a transfer of mastery."
                </p>

                <div className="pt-12 border-t border-white/5">
                    <div className="flex flex-wrap gap-8 items-center opacity-30 grayscale pointer-events-none">
                        <span className="text-xl font-bold tracking-widest font-serif text-alabaster">SONY MUSIC</span>
                        <span className="text-xl font-bold tracking-widest font-serif text-alabaster">BERKLEE</span>
                        <span className="text-xl font-bold tracking-widest font-serif text-alabaster">STEINWAY</span>
                        <span className="text-xl font-bold tracking-widest font-serif text-alabaster">GRAMMY</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

const VisualMethod = () => {
    return (
        <section className="section-padding bg-[#050505]">
            <div className="text-center mb-20 space-y-4">
                <h2 className="text-4xl md:text-6xl tracking-tight">Music Theory, <span className="text-gold italic">Visualized.</span></h2>
                <p className="text-alabaster/50 text-xl font-light max-w-2xl mx-auto">The Synesthesia Engine: See the harmony before you hear it.</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-6xl mx-auto p-4 bg-charcoal border border-white/10 rounded-xs shadow-2xl shadow-gold/5 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gold/5 pointer-events-none blur-3xl rounded-full translate-y-1/2" />
                <div className="aspect-video w-full rounded-xs overflow-hidden border border-white/5 bg-black/40">
                    <img src={synesthesiaImg} alt="Synesthesia Engine Interface" className="w-full h-full object-cover opacity-80" />
                </div>
            </motion.div>
        </section>
    );
};

const Journey = () => {
    const steps = [
        { title: "The Foundation", desc: "Grammar of Sound", icon: <Music size={32} /> },
        { title: "The Fluency", desc: "Building Vocabulary", icon: <PlaySquare size={32} /> },
        { title: "The Artistry", desc: "Improvisation & Flow", icon: <Zap size={32} /> },
    ];

    return (
        <section className="section-padding bg-charcoal">
            <div className="max-w-5xl mx-auto relative px-4">
                <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent hidden md:block" />

                <div className="space-y-24">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.2 }}
                            className="flex flex-col md:flex-row gap-8 items-start relative z-10"
                        >
                            <div className="w-20 h-20 rounded-full border border-gold/50 bg-charcoal flex items-center justify-center text-gold shadow-lg shadow-gold/10 shrink-0">
                                {step.icon}
                            </div>
                            <div className="space-y-2 pt-4">
                                <span className="text-gold/50 text-sm font-sans tracking-[0.3em] uppercase font-bold">STEP 0{idx + 1}</span>
                                <h3 className="text-3xl text-alabaster">{step.title}</h3>
                                <p className="text-alabaster/50 text-xl font-light font-sans">{step.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Pricing = () => {
    const tiers = [
        { name: "Observer", price: "49", features: ["Full Video Access", "Archived Sessions", "Community Access"], gold: false },
        { name: "Performer", price: "129", features: ["All Observer Perks", "Visual Tool Suite", "Monthly Live Q&A", "Interative Curriculum"], gold: true },
        { name: "Virtuoso", price: "499", features: ["All Performer Perks", "1-on-1 Maestro Feedback", "Priority Support", "Lifetime Updates"], gold: false },
    ];

    return (
        <section className="section-padding bg-[#050505]">
            <div className="text-center mb-20 space-y-4">
                <h2 className="text-4xl md:text-6xl tracking-tight">The Patronage</h2>
                <p className="text-alabaster/50 text-xl font-light italic">Choose your level of mastery.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
                {tiers.map((tier, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -10 }}
                        className={`p-10 border ${tier.gold ? 'border-gold shadow-2xl shadow-gold/10' : 'border-white/10'} bg-charcoal flex flex-col transition-all duration-300`}
                    >
                        <h3 className="text-2xl mb-2 text-alabaster font-serif uppercase tracking-widest">{tier.name}</h3>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-sans font-bold text-alabaster">${tier.price}</span>
                            <span className="text-alabaster/40 text-sm font-sans uppercase tracking-[0.2em]">/mo</span>
                        </div>

                        <ul className="space-y-4 mb-12 flex-grow">
                            {tier.features.map((f, i) => (
                                <li key={i} className="flex gap-3 text-alabaster/60 text-sm items-center font-sans font-light">
                                    <Check size={16} className="text-gold shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full py-4 uppercase tracking-[0.2em] font-sans text-xs font-bold transition-all ${tier.gold ? 'bg-gold text-charcoal rounded-xs hover:bg-gold/90' : 'border border-white/20 text-alabaster hover:bg-white/5 rounded-xs'}`}>
                            Select {tier.name}
                        </button>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

const Home = () => {
    return (
        <div className="overflow-hidden">
            <Hero />
            <Authority />
            <VisualMethod />
            <Journey />
            <Pricing />
        </div>
    );
}

export default Home;
