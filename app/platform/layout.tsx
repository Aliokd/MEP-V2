"use client";

import MaestroSidebar from './components/MaestroSidebar';
import { useAuth } from '@/context/AuthContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { TreePine, Menu, User, Play, Pause, X } from 'lucide-react';
import Logo from '@/components/Logo';

function PlatformLayoutInner({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    
    const [showProgressPopup, setShowProgressPopup] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    // Progress breakdowns and state values
    const [progressLevel, setProgressLevel] = useState(1);
    const [levelProgress, setLevelProgress] = useState(0); // 0-100% toward next level
    const [completedLessonsCount, setCompletedLessonsCount] = useState(0);

    // Create section sub-metrics
    const [wordsTyped, setWordsTyped] = useState(0);
    const [recordingMinutes, setRecordingMinutes] = useState(0);

    // Practice section sub-metrics
    const [practiceMinutes, setPracticeMinutes] = useState(0);

    // Level milestone criteria (Level 1 → Level 2)
    const L1_WORDS   = 200;  // words
    const L1_LESSONS = 2;    // chapters checked
    const L1_PRACTICE = 30;  // minutes

    const [showTooltip, setShowTooltip] = useState(false);
    const [activeQuote, setActiveQuote] = useState('Remember, small actions makes progress');
    const [showConfettiOverlay, setShowConfettiOverlay] = useState(false);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const recalculateProgress = () => {
        // Learn: how many lessons checked (no cap)
        const completedLessons = JSON.parse(localStorage.getItem('mep-completed-lessons') || '[]');
        const lCount = completedLessons.length;

        // Create: words typed (from all notes)
        const words = parseInt(localStorage.getItem('mep-create-words-typed') || '0');

        // Create: recording minutes (live timer + saved recordings via notes watcher)
        const recordingSeconds = parseInt(localStorage.getItem('mep-create-recording-seconds') || '0');
        const recMins = parseFloat((recordingSeconds / 60).toFixed(1));

        // Practice: minutes spent on Practice page (no cap)
        const practiceSeconds = parseInt(localStorage.getItem('mep-practice-seconds') || '0');
        const pracMins = parseFloat((practiceSeconds / 60).toFixed(1));

        // Level calculation — Level 1 → Level 2 milestones:
        // 200 words created, 2 lessons checked, 30 min practiced
        const wordsCrit    = Math.min(1, words / L1_WORDS);
        const lessonsCrit  = Math.min(1, lCount / L1_LESSONS);
        const practiceCrit = Math.min(1, pracMins / L1_PRACTICE);
        const avgProgress  = Math.round(((wordsCrit + lessonsCrit + practiceCrit) / 3) * 100);

        const allMet = wordsCrit >= 1 && lessonsCrit >= 1 && practiceCrit >= 1;
        const level = allMet ? 2 : 1;

        setCompletedLessonsCount(lCount);
        setWordsTyped(words);
        setRecordingMinutes(recMins);
        setPracticeMinutes(pracMins);
        setProgressLevel(level);
        setLevelProgress(allMet ? 100 : avgProgress);

        localStorage.setItem('songwriting-progress', avgProgress.toString());
    };

    // Load initial values from localStorage
    useEffect(() => {
        recalculateProgress();

        const storedQuote = localStorage.getItem('songwriting-progress-quote');
        if (storedQuote) {
            setActiveQuote(storedQuote);
        } else {
            localStorage.setItem('songwriting-progress-quote', 'Remember, small actions makes progress');
            setActiveQuote('Remember, small actions makes progress');
        }
    }, []);

    // Listen to songwriting-progress-updated event
    useEffect(() => {
        const handleProgressUpdate = (e: Event) => {
            recalculateProgress();
            
            const storedQuote = localStorage.getItem('songwriting-progress-quote');
            if (storedQuote) {
                setActiveQuote(storedQuote);
            }
            
            const customEvent = e as CustomEvent;
            const isMajorTask = customEvent.detail?.triggerType === 'major-task';
            
            // Get today's date identifier to track daily triggers
            const todayStr = new Date().toDateString();
            const lastFirstActionDate = localStorage.getItem('mep-last-auto-pop-first-action-date');
            const lastMajorTaskDate = localStorage.getItem('mep-last-auto-pop-major-task-date');
            
            let shouldAutoPop = false;
            
            if (lastFirstActionDate !== todayStr) {
                // First action of the day!
                shouldAutoPop = true;
                localStorage.setItem('mep-last-auto-pop-first-action-date', todayStr);
            } else if (isMajorTask && lastMajorTaskDate !== todayStr) {
                // Major task completed today!
                shouldAutoPop = true;
                localStorage.setItem('mep-last-auto-pop-major-task-date', todayStr);
            }
            
            if (shouldAutoPop) {
                // Show tooltip automatically
                setShowTooltip(true);
                if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = setTimeout(() => {
                    setShowTooltip(false);
                }, 6000);

                // Trigger falling confetti on every progress update
                fireLocalConfetti();

                // Confetti overlay trigger
                const isConfetti = localStorage.getItem('songwriting-progress-confetti');
                if (isConfetti === 'true') {
                    setShowConfettiOverlay(true);
                    setTimeout(() => {
                        fireLocalConfetti();
                    }, 100);
                    localStorage.setItem('songwriting-progress-confetti', 'false');
                }
            }
        };

        window.addEventListener('songwriting-progress-updated', handleProgressUpdate);
        return () => {
            window.removeEventListener('songwriting-progress-updated', handleProgressUpdate);
            if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        };
    }, []);

    // Local Subtle Confetti Fountain Generator
    const fireLocalConfetti = () => {
        const canvases = document.querySelectorAll('.confetti-canvas-local');
        canvases.forEach((canvasEl) => {
            const canvas = canvasEl as HTMLCanvasElement;
            if (canvas.offsetWidth === 0) return;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            canvas.width = width;
            canvas.height = height;

            const colors = ['#86BE7F', '#FF4040', '#3b82f6', '#eab308', '#ec4899', '#a855f7'];
            const particles = Array.from({ length: 45 }).map(() => {
                const angle = Math.PI * 1.2 + Math.random() * Math.PI * 0.6; // bias upwards in a cone
                const speed = Math.random() * 2.5 + 1.2;
                return {
                    x: width / 2,
                    y: height - 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    r: Math.random() * 2.5 + 2.5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: 1,
                    decay: Math.random() * 0.02 + 0.015
                };
            });

            let animationFrameId: number;
            const draw = () => {
                ctx.clearRect(0, 0, width, height);
                let active = false;
                particles.forEach((p) => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.06; // subtle gravity
                    p.alpha -= p.decay;

                    if (p.alpha > 0) {
                        active = true;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = p.alpha;
                        ctx.fill();
                    }
                });

                ctx.globalAlpha = 1.0;

                if (active) {
                    animationFrameId = requestAnimationFrame(draw);
                } else {
                    ctx.clearRect(0, 0, width, height);
                }
            };

            draw();
        });
    };

    // Close popup when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowProgressPopup(false);
                setShowTooltip(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/signin');
        }
    }, [user, loading, router]);

    const [showWelcomeVideoModal, setShowWelcomeVideoModal] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [hasEnded, setHasEnded] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            const seen = localStorage.getItem('mep-welcome-video-seen');
            if (!seen) {
                setShowWelcomeVideoModal(true);
                if (pathname === '/platform') {
                    setIsRedirecting(true);
                    router.push('/platform/create');
                }
            }
        }
    }, [user, loading, pathname, router]);

    useEffect(() => {
        if (showWelcomeVideoModal && videoRef.current) {
            const playTimeout = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play().then(() => {
                        setIsPlaying(true);
                        setHasEnded(false);
                    }).catch(err => {
                        console.log("Autoplay unmuted blocked, showing overlay:", err);
                        setIsPlaying(false);
                    });
                }
            }, 250);
            return () => clearTimeout(playTimeout);
        }
    }, [showWelcomeVideoModal]);

    const handleCloseWelcomeModal = () => {
        setShowWelcomeVideoModal(false);
        localStorage.setItem('mep-welcome-video-seen', 'true');
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
        setHasEnded(false);
    };

    const handleReplay = () => {
        setHasEnded(false);
        setIsPlaying(true);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(err => {
                console.error("Replay play failed:", err);
            });
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (hasEnded) {
                handleReplay();
                return;
            }
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play().then(() => {
                    setIsPlaying(true);
                    setHasEnded(false);
                }).catch(err => {
                    console.error("Video play failed:", err);
                });
            }
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#E4E4DF]">
            <div className="w-12 h-12 border-t-2 border-stone-900 rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    // Check if the current page is the immersive lesson player which should be full screen
    const isLessonPage = pathname.startsWith('/platform/lesson');

    if (isLessonPage) {
        return (
            <div className="min-h-screen bg-black text-white font-sans">
                {children}
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex text-stone-900 font-sans selection:bg-stone-900/10 selection:text-stone-900 transition-colors duration-200 ${
            pathname?.startsWith('/platform/create') ? 'bg-[#FAF9F5] md:bg-[#E4E4DF]' : 'bg-[#E4E4DF]'
        }`}>

            {/* Congratulations Confetti Overlay Modal */}
            {showConfettiOverlay && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] p-8 max-w-md w-full mx-4 shadow-2xl text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                                <path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" />
                            </svg>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <h3 className="text-2xl font-bold text-stone-850">Outstanding effort!</h3>
                            <p className="text-sm text-stone-500 leading-normal">
                                You have achieved 100% of your songwriting progress. Your daily dedication to building visual stories and lyric concepts is paying off. Keep up this momentum!
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setShowConfettiOverlay(false);
                                localStorage.setItem('songwriting-progress', '0');
                                setLevelProgress(0);
                            }}
                            className="w-full py-4.5 bg-stone-900 hover:bg-stone-800 text-white rounded-[16px] text-base font-bold transition-all shadow-md cursor-pointer active:scale-95"
                        >
                            Start next journey ➔
                        </button>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <MaestroSidebar 
                isMobileOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
            />

            {/* Main Content Area */}
            <div className={`
                flex-1 flex flex-col min-w-0
                ${pathname?.startsWith('/platform/create')
                    ? 'p-0 md:p-8'
                    : 'p-4 md:p-8'
                }
            `}>
                {/* Mobile Top Header */}
                <header className={`flex md:hidden items-center justify-between px-6 pt-6 pb-4 text-stone-655 font-sans z-40 mb-0 relative transition-colors duration-205 ${
                    pathname?.startsWith('/platform/create') ? 'bg-[#F5F4EE] border-none' : 'bg-[#E4E4DF] border-b border-stone-250/20'
                }`}>
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 rounded-full hover:bg-stone-200/40 active:scale-95 transition-all text-stone-700 hover:text-stone-955"
                    >
                        <Menu size={22} className="stroke-[2.2]" />
                    </button>
                    
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
                        <Link href="/platform/create">
                            <Logo size="md" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <Link 
                            href="/platform/profile" 
                            className="p-2 -mr-2 rounded-full hover:bg-stone-200/40 active:scale-95 transition-all text-stone-700 hover:text-stone-955 flex items-center justify-center"
                        >
                            <User size={22} className="stroke-[2.2]" />
                        </Link>
                    </div>
                </header>

                {/* Mobile Progress Bar Bar */}
                <div className={`flex md:hidden items-center justify-center w-full px-6 pb-4 z-40 transition-colors duration-205 ${
                    pathname?.startsWith('/platform/create') ? 'bg-[#F5F4EE] border-none mb-0' : 'bg-[#E4E4DF] border-b border-stone-250/10 mb-4'
                }`}>
                    <div className="relative flex flex-col items-center w-full" ref={popupRef}>
                        <canvas className="confetti-canvas-local absolute -inset-x-12 -inset-y-12 pointer-events-none z-50 rounded-full" />
                        <div 
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="flex items-center justify-between w-full bg-white border border-stone-200/40 px-6 py-3.5 rounded-[20px] select-none cursor-pointer transition-all active:scale-[0.99] shadow-2xs font-sans text-xs text-stone-500 font-medium normal-case"
                        >
                            <span className="font-bold text-stone-700">Level {progressLevel}</span>
                            <div className="flex-1 ml-6 h-2.5 bg-stone-200/70 rounded-full overflow-hidden relative">
                                <div 
                                    className="h-full bg-[#86BE7F] rounded-full transition-all duration-500 ease-out" 
                                    style={{ width: `${levelProgress}%` }} 
                                />
                            </div>
                            <span className="ml-3 text-[10px] text-stone-400 font-medium tabular-nums">{levelProgress}%</span>
                        </div>
                        
                        {/* Tooltip bubble centered directly below progress pill */}
                        {showTooltip && (
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 bg-white border border-stone-200/80 rounded-[20px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-top-1.5 duration-200 flex flex-col gap-4 z-50 normal-case">
                                {/* Arrow pointing up */}
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-stone-200/80 rotate-45 z-10" />
                                
                                {/* Level header */}
                                <div className="flex flex-col gap-0.5 text-center">
                                    <span className="text-[10px] text-stone-400 font-sans uppercase tracking-widest font-bold">Your progress</span>
                                    <span className="text-3xl font-serif italic text-stone-900 font-light">Level {progressLevel}</span>
                                    {progressLevel === 1 && (
                                        <span className="text-[10px] text-stone-400 font-sans mt-0.5">Complete all 3 goals to reach Level 2</span>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-stone-100 w-full" />

                                {/* Breakdowns */}
                                <div className="flex flex-col gap-3.5">
                                    {/* Create */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-sans text-stone-650 font-bold uppercase tracking-wider">
                                            <span>Create</span>
                                            <span className={`normal-case font-medium text-[10px] ${wordsTyped >= L1_WORDS ? 'text-[#86BE7F]' : 'text-stone-400'}`}>
                                                {wordsTyped >= L1_WORDS ? '✓' : ''} {wordsTyped} words · {recordingMinutes} min rec
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#86BE7F] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((wordsTyped / L1_WORDS) * 100))}%` }} />
                                        </div>
                                        <div className="text-[9px] text-stone-400 font-sans pl-1 font-medium">Goal: {L1_WORDS} words written</div>
                                    </div>

                                    {/* Learn */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-sans text-stone-650 font-bold uppercase tracking-wider">
                                            <span>Learn</span>
                                            <span className={`normal-case font-medium text-[10px] ${completedLessonsCount >= L1_LESSONS ? 'text-[#86BE7F]' : 'text-stone-400'}`}>
                                                {completedLessonsCount >= L1_LESSONS ? '✓' : ''} {completedLessonsCount} chapters checked
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#86BE7F] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((completedLessonsCount / L1_LESSONS) * 100))}%` }} />
                                        </div>
                                        <div className="text-[9px] text-stone-400 font-sans pl-1 font-medium">Goal: {L1_LESSONS} chapters learned</div>
                                    </div>

                                    {/* Practice */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-sans text-stone-650 font-bold uppercase tracking-wider">
                                            <span>Practice</span>
                                            <span className={`normal-case font-medium text-[10px] ${practiceMinutes >= L1_PRACTICE ? 'text-[#86BE7F]' : 'text-stone-400'}`}>
                                                {practiceMinutes >= L1_PRACTICE ? '✓' : ''} {practiceMinutes} min practiced
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#86BE7F] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((practiceMinutes / L1_PRACTICE) * 100))}%` }} />
                                        </div>
                                        <div className="text-[9px] text-stone-400 font-sans pl-1 font-medium">Goal: {L1_PRACTICE} min of practice</div>
                                    </div>
                                </div>

                                {/* Tagline */}
                                <div className="text-[10px] text-stone-400 font-sans italic text-center pt-2.5 border-t border-stone-100 leading-normal">
                                    &ldquo;{activeQuote}&rdquo;
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Top Header */}
                <header className="hidden md:flex items-center justify-between px-8 pb-6 text-stone-600/70 font-sans text-xs tracking-wider z-40">
                    {/* Spacer */}
                    <div></div>
                    
                    {/* Centered navigation items: Progress Bar Capsule & Tooltip */}
                    <div className="flex items-center gap-6 font-medium">
                        <div className="relative flex flex-col items-center" ref={popupRef}>
                            <canvas className="confetti-canvas-local absolute -inset-x-16 -inset-y-12 pointer-events-none z-50 rounded-full" />
                            <div 
                                onClick={() => setShowTooltip(!showTooltip)}
                                className="flex items-center gap-3 bg-white hover:bg-stone-50 border border-stone-200/80 px-6 py-2.5 rounded-full select-none cursor-pointer transition-all active:scale-95 shadow-2xs font-sans text-[11px] text-stone-650 font-bold uppercase tracking-wider"
                            >
                                <span>Level {progressLevel}</span>
                                <div className="w-24 h-3 bg-stone-200/70 rounded-full overflow-hidden relative">
                                    <div 
                                        className="h-full bg-[#86BE7F] rounded-full transition-all duration-500 ease-out" 
                                        style={{ width: `${levelProgress}%` }} 
                                    />
                                </div>
                                <span className="text-[10px] text-stone-400 font-medium tabular-nums normal-case">{levelProgress}%</span>
                            </div>
                            
                            {/* Tooltip bubble centered directly below progress pill */}
                            {showTooltip && (
                                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 bg-white border border-stone-200/80 rounded-[20px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-top-1.5 duration-200 flex flex-col gap-4 z-50 normal-case">
                                    {/* Arrow pointing up */}
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-stone-200/80 rotate-45 z-10" />
                                    
                                    {/* Level header */}
                                    <div className="flex flex-col gap-0.5 text-center">
                                        <span className="text-[10px] text-stone-400 font-sans uppercase tracking-widest font-bold">Your progress</span>
                                        <span className="text-3xl font-serif italic text-stone-900 font-light">Level {progressLevel}</span>
                                        {progressLevel === 1 && (
                                            <span className="text-[10px] text-stone-400 font-sans mt-0.5">Complete all 3 goals to reach Level 2</span>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-stone-100 w-full" />

                                    {/* Breakdowns */}
                                    <div className="flex flex-col gap-3.5">
                                        {/* Create */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-sans text-[#787870] font-bold uppercase tracking-wider">
                                                <span>Create</span>
                                                <span className={`normal-case font-medium text-[10px] ${wordsTyped >= L1_WORDS ? 'text-[#86BE7F]' : 'text-stone-400'}`}>
                                                    {wordsTyped >= L1_WORDS ? '✓' : ''} {wordsTyped} words · {recordingMinutes} min rec
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#86BE7F] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((wordsTyped / L1_WORDS) * 100))}%` }} />
                                            </div>
                                            <div className="text-[9px] text-stone-400 font-sans pl-1 font-medium">Goal: {L1_WORDS} words written</div>
                                        </div>

                                        {/* Learn */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-sans text-stone-650 font-bold uppercase tracking-wider">
                                                <span>Learn</span>
                                                <span className={`normal-case font-medium text-[10px] ${completedLessonsCount >= L1_LESSONS ? 'text-[#86BE7F]' : 'text-stone-400'}`}>
                                                    {completedLessonsCount >= L1_LESSONS ? '✓' : ''} {completedLessonsCount} chapters checked
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#86BE7F] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((completedLessonsCount / L1_LESSONS) * 100))}%` }} />
                                            </div>
                                            <div className="text-[9px] text-stone-400 font-sans pl-1 font-medium">Goal: {L1_LESSONS} chapters learned</div>
                                        </div>

                                        {/* Practice */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-sans text-stone-650 font-bold uppercase tracking-wider">
                                                <span>Practice</span>
                                                <span className={`normal-case font-medium text-[10px] ${practiceMinutes >= L1_PRACTICE ? 'text-[#86BE7F]' : 'text-stone-400'}`}>
                                                    {practiceMinutes >= L1_PRACTICE ? '✓' : ''} {practiceMinutes} min practiced
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#86BE7F] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((practiceMinutes / L1_PRACTICE) * 100))}%` }} />
                                            </div>
                                            <div className="text-[9px] text-stone-400 font-sans pl-1 font-medium">Goal: {L1_PRACTICE} min of practice</div>
                                        </div>
                                    </div>

                                    {/* Tagline */}
                                    <div className="text-[10px] text-stone-400 font-sans italic text-center pt-2.5 border-t border-stone-100 leading-normal">
                                        &ldquo;{activeQuote}&rdquo;
                                    </div>
                                </div>
                            )}
                        </div>

                        <LanguageSwitcher />
                        {/* My profile link */}
                        <Link href="/platform/profile" className="hover:text-stone-955 transition-colors font-medium uppercase tracking-[0.1em] ml-2">
                            {t('navigation.my_profile')}
                        </Link>
                    </div>
                </header>

                {/* Main panel container */}
                <div className={`
                    flex-1
                    ${pathname?.startsWith('/platform/create')
                        ? 'bg-transparent md:bg-[#FAF9F5] p-0 md:p-8 rounded-none md:rounded-[32px] shadow-none'
                        : 'overflow-y-auto bg-[#F0F0EA] rounded-[24px] md:rounded-[32px] p-4 md:p-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.015)]'
                    }
                `}>
                    {isRedirecting ? (
                        <div className="w-full max-w-6xl mx-auto mt-0 mb-20 flex flex-col gap-4 animate-pulse">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-full border border-stone-200/60 rounded-[20px] p-6 bg-white/40 flex justify-between items-center h-24" />
                            ))}
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </div>

            {/* Welcome Video Overlay Modal */}
            {showWelcomeVideoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF9F5]/10 backdrop-blur-[16px] p-0 md:p-12 transition-all duration-500">
                    <button
                        onClick={handleCloseWelcomeModal}
                        className="fixed top-4 right-4 md:top-8 md:right-8 p-2.5 md:p-3 bg-white/80 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none rounded-full text-stone-900 hover:opacity-75 transition-all duration-200 cursor-pointer active:scale-95 z-[110]"
                        aria-label="Close welcome video"
                    >
                        <X className="w-6 h-6 md:w-8 md:h-8 stroke-[1.5]" />
                    </button>
                    
                    <div className="relative w-full max-w-full md:w-[80%] md:max-w-[80%] aspect-video bg-white rounded-none md:rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.12)] overflow-hidden flex items-center justify-center border-none md:border md:border-white/40">
                        <video
                            ref={videoRef}
                            src="/videos/Welcome%20-%20onboarding/Welcome_V3.mp4"
                            className="w-full h-full block object-cover bg-white"
                            onClick={togglePlay}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => {
                                setIsPlaying(false);
                                setHasEnded(true);
                            }}
                            controls={isPlaying && !hasEnded}
                            playsInline
                        />
                        
                        {!isPlaying && !hasEnded && (
                            <div 
                                onClick={togglePlay}
                                className="absolute inset-0 flex items-center justify-center bg-white cursor-pointer group transition-all duration-300 z-10"
                            >
                                <Play className="w-24 h-24 md:w-32 md:h-32 fill-stone-200 text-stone-200 stroke-none group-hover:scale-105 transition-all duration-300" />
                            </div>
                        )}

                        {hasEnded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 p-8 text-center animate-in fade-in duration-300">
                                <h3 className="text-3xl font-sans font-light text-stone-900 mb-2">Workspace ready.</h3>
                                <p className="text-stone-500 max-w-md text-sm mb-8 font-medium">
                                    You're all set to start writing lyrics, analyzing chords, and creating visual music stories.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-xs sm:max-w-md justify-center">
                                    <button
                                        onClick={handleCloseWelcomeModal}
                                        className="w-full sm:w-auto px-10 py-4.5 bg-[#86BE7F] hover:opacity-95 text-stone-900 text-base font-bold rounded-[18px] transition-all shadow-[0_4px_12px_rgba(134,190,127,0.2)] cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        Start now
                                    </button>
                                    <button
                                        onClick={handleReplay}
                                        className="w-full sm:w-auto px-8 py-4.5 border border-stone-205 hover:bg-stone-50 text-stone-700 text-base font-semibold rounded-[18px] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        Replay video
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const LanguageSwitcher = () => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const languages = [
        { code: 'en', label: 'EN', flag: '🇺🇸' },
        { code: 'sv', label: 'SV', flag: '🇸🇪' },
        { code: 'no', label: 'NO', flag: '🇳🇴' }
    ];

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <div className="relative font-sans text-xs tracking-wider" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200/80 text-stone-600 hover:text-stone-900 transition-all font-semibold uppercase select-none cursor-pointer active:scale-95"
            >
                <span>{currentLang.flag}</span>
                <span>{currentLang.label}</span>
            </button>
            
            {isOpen && (
                <div className="absolute right-0 top-9 w-28 bg-white border border-stone-200/85 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] py-1.5 z-[999] flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code as any);
                                setIsOpen(false);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-stone-50 transition-colors cursor-pointer text-stone-650 hover:text-stone-900 ${
                                language === lang.code ? 'font-bold bg-stone-50/50 text-stone-900' : 'font-medium'
                            }`}
                        >
                            <span>{lang.flag}</span>
                            <span>{lang.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LanguageProvider>
            <PlatformLayoutInner>{children}</PlatformLayoutInner>
        </LanguageProvider>
    );
}
