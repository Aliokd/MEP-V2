import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

const SignUp = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        tier: 'performer'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('SignUp attempt:', formData);
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-white dark:bg-[#050505] relative overflow-hidden transition-colors duration-300">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gold/5 blur-[120px] rounded-full" />
                <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gold/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-2xl relative z-10"
            >
                <div className="text-center mb-12 space-y-4">
                    <Link to="/" className="inline-block">
                        <h1 className="text-3xl font-serif text-gold tracking-tighter">THE CONSERVATORY</h1>
                    </Link>
                    <h2 className="text-4xl font-serif text-stone-900 dark:text-alabaster transition-colors duration-300">Commence Your Evolution</h2>
                    <p className="text-stone-900/50 dark:text-alabaster/50 font-sans font-light transition-colors duration-300">Join the elite network of modern virtuosos.</p>
                </div>

                <div className="bg-stone-50 dark:bg-charcoal border border-stone-200 dark:border-white/5 p-8 md:p-12 rounded-xs shadow-2xl grid md:grid-cols-2 gap-12 transition-colors duration-300">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xl font-serif text-gold">Membership Perks</h3>
                            <ul className="space-y-4">
                                {[
                                    "Access to the Synesthesia Engine",
                                    "Structured Masterclass Path",
                                    "Global Networking Events",
                                    "Maestro Performance Reviews"
                                ].map((perk, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-stone-900/60 dark:text-alabaster/60 font-sans items-center transition-colors duration-300">
                                        <CheckCircle2 size={16} className="text-gold shrink-0" />
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-6 bg-white dark:bg-black/40 border border-gold/20 rounded-xs transition-colors duration-300">
                            <p className="text-xs text-gold italic font-serif leading-relaxed">
                                "The foundation you build today determines the height of your symphony tomorrow."
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 mt-3 font-bold transition-colors duration-300">— THE MAESTRO</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold ml-1 transition-colors duration-300">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold" size={16} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans text-sm focus:outline-none focus:border-gold/50 transition-all"
                                    placeholder="Wolfgang Mozart"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold ml-1 transition-colors duration-300">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold" size={16} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans text-sm focus:outline-none focus:border-gold/50 transition-all"
                                    placeholder="wolf@salzburg.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold ml-1 transition-colors duration-300">Create Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold" size={16} />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans text-sm focus:outline-none focus:border-gold/50 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-xs tracking-[0.2em] font-bold">
                                BEGIN AUDITION
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <p className="text-[10px] text-center text-stone-900/30 dark:text-alabaster/30 font-sans uppercase tracking-widest pt-2 transition-colors duration-300">
                            Already a member?{' '}
                            <Link to="/signin" className="text-gold hover:text-gold/80 transition-colors">Sign In</Link>
                        </p>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default SignUp;
