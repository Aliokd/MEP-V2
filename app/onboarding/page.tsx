"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Music, Check, Star, Sparkles, Wand2, ShieldCheck, CreditCard, Mail, Lock, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const STEPS = {
    QUIZ: 'quiz',
    HYPE: 'hype',
    AUTH: 'auth',
    PAYWALL: 'paywall'
};

const QUESTIONS = [
    {
        id: 'instrument',
        question: "What is your main instrument?",
        options: [
            { label: "Piano / Keys", value: "piano" },
            { label: "Guitar / Bass", value: "guitar" },
            { label: "Voice / Singing", value: "voice" },
            { label: "Production / Computer", value: "production" },
            { label: "I want to learn them all", value: "all" }
        ]
    },
    {
        id: 'level',
        question: "Which sounds most like you?",
        options: [
            { label: "Complete Beginner: I’ve never played before.", value: "beginner" },
            { label: "The Mimic: I can play songs, but I don't understand the theory.", value: "mimic" },
            { label: "The Stuck Pro: I know the rules, but I sound robotic.", value: "stuck_pro" },
            { label: "The Creator: I can play, but I struggle to write my own music.", value: "creator" }
        ]
    },
    {
        id: 'goal',
        question: "What is your dream outcome?",
        options: [
            { label: "Improvisation: Sitting down and playing freely without sheet music.", value: "improvisation" },
            { label: "Composition: Writing and finishing full songs.", value: "composition" },
            { label: "Production: Making professional-sounding tracks.", value: "production" },
            { label: "Performance: Playing live with total confidence.", value: "performance" }
        ]
    },
    {
        id: 'barrier',
        question: "Why haven't you reached that goal yet?",
        options: [
            { label: "Theory is boring: I hate memorizing scales and math.", value: "boring" },
            { label: "No Structure: YouTube tutorials are messy and confusing.", value: "structure" },
            { label: "No Feedback: I don't know if I'm practicing correctly.", value: "feedback" },
            { label: "Time: I don't have hours to practice every day.", value: "time" }
        ]
    },
    {
        id: 'visual_test',
        question: "How does this sound make you feel?",
        isVisual: true,
        options: [
            { label: "Bright & Happy", value: "happy", color: "gold" },
            { label: "Dark & Sad", value: "sad", color: "blue" },
            { label: "Dreamy & Floating", value: "dreamy", color: "purple" },
            { label: "Tense & Angry", value: "angry", color: "red" }
        ]
    }
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(STEPS.QUIZ);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const router = useRouter();

    const currentQuestion = QUESTIONS[currentQuestionIndex];

    const playLushChord = () => {
        try {
            const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const now = ctx.currentTime;

            // Cmaj9: C3, G3, B3, E4, D5
            const freqs = [130.81, 196.00, 246.94, 329.63, 587.33];

            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = i === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 4);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 4);
            });
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    useEffect(() => {
        if (currentQuestion?.isVisual) {
            playLushChord();
        }
    }, [currentQuestionIndex, currentQuestion]);

    const handleAnswer = (value: string, color?: string) => {
        setSelectedOption(value);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));

        setTimeout(() => {
            if (color) {
                setSelectedColor(color);
                // Show glow for a moment before moving to hype
                setTimeout(() => {
                    setCurrentStep(STEPS.HYPE);
                    setSelectedOption(null);
                }, 1000);
            } else {
                if (currentQuestionIndex < QUESTIONS.length - 1) {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setSelectedOption(null);
                } else {
                    setCurrentStep(STEPS.HYPE);
                    setSelectedOption(null);
                }
            }
        }, 400);
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: authData.name
            });

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: authData.name,
                email: authData.email,
                answers: answers,
                createdAt: new Date().toISOString(),
                tier: 'trial'
            });

            setCurrentStep(STEPS.PAYWALL);
        } catch (err: any) {
            setError(err.message || 'Failed to create account.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center px-6 transition-all duration-1000 bg-white dark:bg-[#050505] ${selectedColor === 'gold' ? 'shadow-[inset_0_0_100px_rgba(234,179,8,0.1)]' :
            selectedColor === 'blue' ? 'shadow-[inset_0_0_100px_rgba(59,130,246,0.1)]' :
                selectedColor === 'purple' ? 'shadow-[inset_0_0_100px_rgba(168,85,247,0.1)]' :
                    selectedColor === 'red' ? 'shadow-[inset_0_0_100px_rgba(239,68,68,0.1)]' : ''
            }`}>
            {/* Header / Logo */}
            <div className="absolute top-8 left-8 md:top-12 md:left-12 z-50">
                <Link href="/" className="flex items-center gap-2 group">
                    <h1 className="text-xl md:text-2xl font-serif text-stone-900 dark:text-alabaster tracking-tighter group-hover:text-gold-500 transition-colors">
                        MEP <span className="text-gold-500">V2</span>
                    </h1>
                </Link>
            </div>
            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <AnimatePresence>
                    {selectedColor && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.15 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 blur-[120px] rounded-full scale-150 ${selectedColor === 'gold' ? 'bg-gold-500' :
                                selectedColor === 'blue' ? 'bg-blue-500' :
                                    selectedColor === 'purple' ? 'bg-purple-500' :
                                        selectedColor === 'red' ? 'bg-red-500' : ''
                                }`}
                        />
                    )}
                </AnimatePresence>
            </div>

            <main className="w-full max-w-2xl relative z-10">
                <AnimatePresence mode="wait">
                    {currentStep === STEPS.QUIZ && (
                        <motion.div
                            key={`q-${currentQuestionIndex}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-12"
                        >
                            <div className="space-y-8">
                                <div className="w-full h-1.5 bg-stone-100 dark:bg-white/5 rounded-full overflow-hidden relative">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className="h-full bg-gold-500 shadow-[0_0_10px_rgba(197,160,89,0.5)]"
                                    />
                                </div>
                                <div className="text-center space-y-4">
                                    <motion.span
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={`step-${currentQuestionIndex}`}
                                        className="text-gold-500 text-[10px] uppercase tracking-[0.5em] font-bold block"
                                    >
                                        CALIBRATION PHASE {currentQuestionIndex + 1} of {QUESTIONS.length}
                                    </motion.span>
                                    <h2 className="text-4xl md:text-5xl font-serif text-stone-900 dark:text-alabaster leading-tight">
                                        {currentQuestion.question}
                                    </h2>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {currentQuestion.options.map((option) => (
                                    <motion.button
                                        key={option.value}
                                        onClick={() => handleAnswer(option.value, option.color)}
                                        disabled={selectedOption !== null}
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`group relative w-full p-5 text-left border transition-all duration-500 rounded-xs overflow-hidden ${selectedOption === option.value
                                            ? 'border-gold-500 ring-1 ring-gold-500 bg-gold-500/5 shadow-[0_0_30px_rgba(197,160,89,0.15)]'
                                            : 'border-stone-200 dark:border-white/10 bg-white dark:bg-charcoal/40 hover:border-gold-500/50 hover:bg-gold-500/[0.02]'
                                            }`}
                                    >
                                        <div className="relative flex items-center justify-between">
                                            <span className={`text-base md:text-lg font-sans transition-colors duration-300 ${selectedOption === option.value ? 'text-gold-500' : 'text-stone-900/80 dark:text-alabaster/80'
                                                }`}>
                                                {option.label}
                                            </span>
                                            <ChevronRight className={`transition-all duration-500 ${selectedOption === option.value ? 'text-gold-500 translate-x-0 opacity-100' : 'text-stone-300 dark:text-white/10 -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} size={18} />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {currentStep === STEPS.HYPE && (
                        <HypeSection onComplete={() => setCurrentStep(STEPS.AUTH)} />
                    )}

                    {currentStep === STEPS.AUTH && (
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-4xl font-serif text-stone-900 dark:text-alabaster">Secure Your Path</h2>
                                <p className="text-stone-900/50 dark:text-alabaster/50">Create your account to save your results and start your trial.</p>
                            </div>

                            <form onSubmit={handleAuthSubmit} className="bg-stone-50 dark:bg-charcoal/50 p-8 border border-stone-200 dark:border-white/5 rounded-xs space-y-4">
                                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest text-stone-900/40 dark:text-alabaster/40 font-bold ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-900/20 dark:text-alabaster/20" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={authData.name}
                                            onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                                            className="w-full bg-white dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster focus:border-gold-500 outline-none transition-all"
                                            placeholder="Wolfgang Mozart"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest text-stone-900/40 dark:text-alabaster/40 font-bold ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-900/20 dark:text-alabaster/20" size={16} />
                                        <input
                                            type="email"
                                            required
                                            value={authData.email}
                                            onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                                            className="w-full bg-white dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster focus:border-gold-500 outline-none transition-all"
                                            placeholder="wolf@mozart.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest text-stone-900/40 dark:text-alabaster/40 font-bold ml-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-900/20 dark:text-alabaster/20" size={16} />
                                        <input
                                            type="password"
                                            required
                                            value={authData.password}
                                            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                                            className="w-full bg-white dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster focus:border-gold-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 bg-stone-900 dark:bg-alabaster text-white dark:text-charcoal text-xs tracking-[0.2em] font-bold rounded-xs hover:bg-gold-500 dark:hover:bg-gold-500 dark:hover:text-white transition-all mt-4 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? 'CREATING ACCOUNT...' : 'CONTINUE TO RESULTS'}
                                    <ArrowRight size={16} />
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {currentStep === STEPS.PAYWALL && (
                        <PaywallSection />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function HypeSection({ onComplete }: { onComplete: () => void }) {
    const [animationStep, setAnimationStep] = useState(0);
    const messages = [
        "Analyzing answers...",
        "Removing boring theory...",
        "Prioritizing Visual Learning..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationStep(prev => prev + 1);
        }, 1500);

        if (animationStep >= messages.length + 1) {
            clearInterval(interval);
            setTimeout(onComplete, 2000);
        }

        return () => clearInterval(interval);
    }, [animationStep, onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-12"
        >
            <div className="relative h-48 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {animationStep < messages.length ? (
                        <motion.p
                            key={animationStep}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="text-2xl text-stone-900 dark:text-gold-500 font-serif italic"
                        >
                            {messages[animationStep]}
                        </motion.p>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                        >
                            <h2 className="text-xl font-serif text-gold-500 tracking-[0.3em] uppercase mb-4">The Verdict</h2>
                            <h1 className="text-4xl md:text-6xl font-serif text-stone-900 dark:text-alabaster leading-tight">
                                "You are a <span className="italic">Visual Learner.</span>"
                            </h1>
                            <p className="text-xl text-stone-600 dark:text-alabaster/60 font-light max-w-lg mx-auto font-sans">
                                You don't need more drills. You need to see the music.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-center gap-2">
                {messages.map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: animationStep === i ? [1, 1.5, 1] : 1,
                            backgroundColor: animationStep >= i ? '#EAB308' : '#e5e7eb',
                            opacity: animationStep >= i ? 1 : 0.2
                        }}
                        className="w-3 h-3 rounded-full"
                    />
                ))}
            </div>
        </motion.div>
    );
}

function PaywallSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-12"
        >
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-stone-900 dark:text-alabaster">Start your transformation.</h1>
                <p className="text-stone-900/50 dark:text-alabaster/50 text-xl font-light">
                    Try the full platform risk-free. Cancel anytime.
                </p>
            </div>

            <div className="max-w-md mx-auto relative group">
                <div className="absolute inset-0 bg-gold-500/10 blur-3xl group-hover:bg-gold-500/20 transition-all rounded-full" />
                <div className="relative bg-white dark:bg-charcoal border-2 border-gold-500 p-10 rounded-xs shadow-2xl space-y-8">
                    <div className="space-y-2">
                        <div className="inline-block px-3 py-1 bg-gold-500 text-charcoal text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">
                            Most Popular
                        </div>
                        <h3 className="text-3xl font-serif text-stone-900 dark:text-alabaster">7-Day Free Trial</h3>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-sans font-bold text-stone-900 dark:text-alabaster">$29</span>
                            <span className="text-stone-900/40 dark:text-alabaster/40 text-sm font-sans uppercase tracking-widest">/month</span>
                        </div>
                    </div>

                    <ul className="space-y-4 text-left">
                        {[
                            { text: "The \"Visual Music\" Engine", icon: <Wand2 size={18} /> },
                            { text: "Step-by-Step Curriculum", icon: <Check size={18} /> },
                            { text: "The \"Money-Back\" Guarantee", icon: <ShieldCheck size={18} /> }
                        ].map((item, i) => (
                            <li key={i} className="flex gap-4 text-stone-900/60 dark:text-alabaster/60 items-center font-sans">
                                <span className="text-gold-500">{item.icon}</span>
                                {item.text}
                            </li>
                        ))}
                    </ul>

                    <div className="space-y-4">
                        <Link
                            href="/platform"
                            className="w-full py-5 bg-gold-500 text-charcoal text-xs tracking-[0.3em] font-bold rounded-xs hover:bg-gold-500/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <CreditCard size={18} />
                            START FREE TRIAL
                        </Link>
                        <div className="space-y-1">
                            <p className="text-[10px] text-stone-900/40 dark:text-alabaster/40 uppercase tracking-widest">
                                No charge today.
                            </p>
                            <p className="text-[10px] text-stone-900/40 dark:text-alabaster/40 uppercase tracking-widest font-bold">
                                Reminder sent 2 days before trial ends.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
