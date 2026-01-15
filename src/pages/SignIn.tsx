import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('SignIn attempt:', { email, password });
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-[#050505] relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gold/5 blur-[120px] rounded-full" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gold/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-12 space-y-4">
                    <Link to="/" className="inline-block">
                        <h1 className="text-3xl font-serif text-gold tracking-tighter">THE CONSERVATORY</h1>
                    </Link>
                    <h2 className="text-4xl font-serif text-alabaster">Welcome Back</h2>
                    <p className="text-alabaster/50 font-sans font-light">Continue your descent into mastery.</p>
                </div>

                <div className="bg-charcoal border border-white/5 p-10 rounded-xs shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.2em] text-alabaster/40 font-bold ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-alabaster/20 group-focus-within:text-gold" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xs py-4 pl-12 pr-4 text-alabaster font-sans focus:outline-none focus:border-gold/50 transition-all"
                                    placeholder="maestro@conservatory.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs uppercase tracking-[0.2em] text-alabaster/40 font-bold">Password</label>
                                <a href="#" className="text-[10px] uppercase tracking-widest text-gold hover:text-gold/80 transition-colors">Forgot?</a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-alabaster/20 group-focus-within:text-gold" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xs py-4 pl-12 pr-4 text-alabaster font-sans focus:outline-none focus:border-gold/50 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-3 py-5 text-sm tracking-[0.2em]">
                            RESUME PRACTICE
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-sm text-alabaster/40 font-sans">
                            New to the platform?{' '}
                            <Link to="/signup" className="text-gold hover:text-gold/80 transition-colors underline-offset-4 hover:underline">Begin your audition</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SignIn;
