import { motion } from 'framer-motion';
import { Award, Globe, BookOpen, Quote, Cpu } from 'lucide-react';
import maestroImg from '../assets/maestro.png';

const Maestro = () => {
    return (
        <div className="pt-32 pb-24">
            {/* Bio Section */}
            <section className="px-6 md:px-12 lg:px-24 grid lg:grid-cols-2 gap-24 items-center mb-48 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1 }}
                    className="relative group"
                >
                    <div className="absolute -inset-4 border border-gold/20 scale-95 group-hover:scale-100 transition-transform duration-700 pointer-events-none" />
                    <img src={maestroImg} alt="The Maestro" className="w-full grayscale filter brightness-75 rounded-xs" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="space-y-8"
                >
                    <div className="space-y-4">
                        <span className="text-gold text-xs tracking-[0.4em] uppercase font-bold">LEGACY & MASTERY</span>
                        <h1 className="text-5xl md:text-7xl leading-tight">A Lifetime on the <br /><span className="text-gold italic">Global Stage.</span></h1>
                    </div>
                    <p className="text-alabaster/60 text-lg font-sans font-light leading-relaxed">
                        With over four decades of experience performing in the world's most prestigious concert halls—from Carnegie Hall to the Sydney Opera House—the Maestro has dedicated his life to uncovering the universal laws of musical language.
                    </p>
                    <p className="text-alabaster/60 text-lg font-sans font-light leading-relaxed">
                        His philosophy is simple: Music is not about notes on a page; it is about the physics of emotion and the geometry of silence. After 40 years of refinement, he is ready to transfer this knowledge to the next generation of virtuosos.
                    </p>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                        <div className="space-y-2">
                            <div className="text-gold flex items-center gap-2">
                                <Globe size={18} />
                                <span className="text-xs uppercase font-bold tracking-widest text-alabaster">40+ Countries</span>
                            </div>
                            <p className="text-xs text-alabaster/40 font-sans uppercase tracking-[0.1em]">Performed Worldwide</p>
                        </div>
                        <div className="space-y-2">
                            <div className="text-gold flex items-center gap-2">
                                <Award size={18} />
                                <span className="text-xs uppercase font-bold tracking-widest text-alabaster">3x Grammy Nominee</span>
                            </div>
                            <p className="text-xs text-alabaster/40 font-sans uppercase tracking-[0.1em]">Technical Achievement</p>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Philosophy Section */}
            <section className="bg-white/[0.02] py-48 px-6 text-center border-y border-white/5">
                <div className="max-w-4xl mx-auto space-y-12">
                    <Quote className="text-gold/20 w-24 h-24 mx-auto mb-8" />
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif italic text-alabaster/90 leading-[1.2]">
                        "The greatest barrier to mastery is not a lack of talent, but the presence of noise. This curriculum is the silence you need to finally hear the music."
                    </h2>
                    <div className="space-y-2">
                        <p className="text-gold tracking-[0.4em] uppercase font-bold text-sm">THE MAESTRO</p>
                        <p className="text-alabaster/40 text-xs font-sans italic tracking-widest">Grand Conservatory of Sound, Emeritus</p>
                    </div>
                </div>
            </section>

            {/* The Vision Section */}
            <section className="px-6 md:px-12 lg:px-24 mt-48 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-16">
                    <div className="space-y-4">
                        <BookOpen size={40} className="text-gold" />
                        <h3 className="text-2xl font-serif">The Pedagogy</h3>
                        <p className="text-alabaster/50 text-sm font-sans leading-relaxed">
                            Moving away from rote memorization towards architectural understanding. Learn why a chord works before you learn its name.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-gold/20 blur-lg rounded-full" />
                            <Cpu size={40} className="text-gold relative z-10" />
                        </div>
                        <h3 className="text-2xl font-serif">The Technology</h3>
                        <p className="text-alabaster/50 text-sm font-sans leading-relaxed">
                            Leveraging real-time visualization technology to provide the kind of instant feedback that used to require a private masterclass.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <Globe size={40} className="text-gold" />
                        <h3 className="text-2xl font-serif">The Community</h3>
                        <p className="text-alabaster/50 text-sm font-sans leading-relaxed">
                            A global network of elite musicians and dedicated students, all speaking the same visual language of harmony.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Maestro;
