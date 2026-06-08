"use client";

import MaestroSidebar from './components/MaestroSidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { TreePine, Menu } from 'lucide-react';
import Logo from '@/components/Logo';

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    
    const [showProgressPopup, setShowProgressPopup] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    // New progress, quote, and confetti states
    const [progressVal, setProgressVal] = useState(35);
    const [showTooltip, setShowTooltip] = useState(false);
    const [activeQuote, setActiveQuote] = useState('Remember, small actions makes progress');
    const [showConfettiOverlay, setShowConfettiOverlay] = useState(false);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load initial values from localStorage
    useEffect(() => {
        const storedProgress = localStorage.getItem('songwriting-progress');
        if (storedProgress) {
            setProgressVal(parseInt(storedProgress));
        } else {
            localStorage.setItem('songwriting-progress', '35');
            setProgressVal(35);
        }

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
        const handleProgressUpdate = () => {
            const storedProgress = localStorage.getItem('songwriting-progress');
            if (storedProgress) {
                setProgressVal(parseInt(storedProgress));
            }
            const storedQuote = localStorage.getItem('songwriting-progress-quote');
            if (storedQuote) {
                setActiveQuote(storedQuote);
            }
            
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

            const colors = ['#1EB239', '#FF4040', '#3b82f6', '#eab308', '#ec4899', '#a855f7'];
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
        <div className="min-h-screen bg-[#E4E4DF] flex text-stone-900 font-sans selection:bg-stone-900/10 selection:text-stone-900">

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
                                setProgressVal(0);
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
                ${pathname === '/platform/create'
                    ? 'p-0 md:p-8'
                    : 'p-4 md:p-8'
                }
            `}>
                {/* Mobile Top Header */}
                <header className="flex md:hidden items-center justify-between px-6 pb-4 text-stone-655 font-sans z-40 border-b border-stone-250/20 mb-0 relative bg-[#E4E4DF]">
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

                    <Link href="/platform/profile" className="hover:text-stone-955 transition-colors font-bold uppercase tracking-[0.1em] text-[10px] bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-2xs">
                        Profile
                    </Link>
                </header>

                {/* Mobile Progress Bar Bar */}
                <div className={`flex md:hidden items-center justify-center w-full px-6 pb-4 border-b border-stone-250/10 z-40 bg-[#E4E4DF] ${pathname === '/platform/create' ? 'mb-0' : 'mb-4'}`}>
                    <div className="relative flex flex-col items-center w-full" ref={popupRef}>
                        <canvas className="confetti-canvas-local absolute -inset-x-12 -inset-y-12 pointer-events-none z-50 rounded-full" />
                        <div 
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="flex items-center justify-between w-full bg-white hover:bg-stone-50 border border-stone-200/80 px-6 py-2 rounded-full select-none cursor-pointer transition-all active:scale-95 shadow-2xs font-sans text-[11px] text-stone-650 font-bold uppercase tracking-wider"
                        >
                            <span>Progress</span>
                            <div className="w-1/2 h-3 bg-stone-200/70 rounded-full overflow-hidden relative">
                                <div 
                                    className="h-full bg-[#1EB239] rounded-full transition-all duration-500 ease-out" 
                                    style={{ width: `${progressVal}%` }} 
                                />
                            </div>
                        </div>
                        
                        {/* Tooltip bubble centered directly below progress pill */}
                        {showTooltip && (
                            <div className="absolute top-11 left-1/2 -translate-x-1/2 w-64 bg-white border border-stone-200/80 rounded-[18px] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-top-1.5 duration-200 flex flex-col gap-1 z-50 text-center normal-case">
                                {/* Arrow pointing up */}
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-stone-200/80 rotate-45 z-10" />
                                <span className="text-[11px] font-bold text-stone-700 leading-normal">{activeQuote}</span>
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
                                <span>Progress</span>
                                <div className="w-24 h-3 bg-stone-200/70 rounded-full overflow-hidden relative">
                                    <div 
                                        className="h-full bg-[#1EB239] rounded-full transition-all duration-500 ease-out" 
                                        style={{ width: `${progressVal}%` }} 
                                    />
                                </div>
                            </div>
                            
                            {/* Tooltip bubble centered directly below progress pill */}
                            {showTooltip && (
                                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 bg-white border border-stone-200/80 rounded-[18px] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-top-1.5 duration-200 flex flex-col gap-1 z-50 text-center normal-case">
                                    {/* Arrow pointing up */}
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-stone-200/80 rotate-45 z-10" />
                                    <span className="text-[11px] font-bold text-stone-700 leading-normal">{activeQuote}</span>
                                </div>
                            )}
                        </div>

                        {/* My profile link */}
                        <Link href="/platform/profile" className="hover:text-stone-955 transition-colors font-medium uppercase tracking-[0.1em] ml-2">
                            My profile
                        </Link>
                    </div>
                </header>

                {/* Main panel container */}
                <div className={`
                    flex-1 overflow-y-auto
                    ${pathname === '/platform/create'
                        ? 'bg-transparent p-0 rounded-none shadow-none'
                        : 'bg-[#F0F0EA] rounded-[24px] md:rounded-[32px] p-4 md:p-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.015)]'
                    }
                `}>
                    {children}
                </div>
            </div>
        </div>
    );
}
