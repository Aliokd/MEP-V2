"use client";

import MaestroSidebar from './components/MaestroSidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { TreePine } from 'lucide-react';

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    
    const [showProgressPopup, setShowProgressPopup] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    // Close popup when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowProgressPopup(false);
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
            {/* Sidebar */}
            <MaestroSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 p-8 pl-4">
                {/* Top Header */}
                <header className="flex items-center justify-between px-6 pb-6 text-stone-600/70 font-sans text-xs tracking-wider z-40">
                    {/* Spacer */}
                    <div></div>
                    
                    {/* Centered navigation items */}
                    <div className="flex items-center gap-12 font-medium">
                        <Link href="/platform/curriculum" className="hover:text-stone-950 transition-colors uppercase tracking-[0.1em]">
                            What to do? or guide or how to start
                        </Link>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setShowProgressPopup(!showProgressPopup)}
                                className={`hover:text-stone-950 transition-colors uppercase tracking-[0.1em] focus:outline-none ${showProgressPopup ? 'text-stone-950 font-bold' : ''}`}
                            >
                                Progress
                            </button>
                            
                            {/* Popup */}
                            {showProgressPopup && (
                                <div 
                                    ref={popupRef}
                                    className="absolute top-10 left-1/2 -translate-x-1/2 w-80 bg-white border border-stone-200/80 rounded-[24px] p-6 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col gap-4 text-center font-sans normal-case"
                                    style={{ transformOrigin: 'top center' }}
                                >
                                    {/* Arrow pointing up */}
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-stone-200/80 rotate-45 z-10" />
                                    
                                    {/* Motivational Texts */}
                                    <div className="space-y-1.5 z-10 relative">
                                        <p className="text-xs text-stone-850 font-bold leading-relaxed">
                                            "Remember writing daily makes you a better songwriter. Stay motivated!"
                                        </p>
                                        <p className="text-[10px] text-stone-500 font-semibold tracking-wide uppercase">
                                            Grow your forest to build songwriting habits.
                                        </p>
                                    </div>
                                    
                                    {/* Grid of Trees */}
                                    <div className="grid grid-cols-6 gap-2.5 p-2 bg-stone-50/50 border border-stone-100 rounded-[16px] z-10 relative">
                                        {Array.from({ length: 24 }).map((_, index) => {
                                            // Mock practice streak:
                                            // Green (practiced), Red (missed), Gray (unpracticed/future)
                                            let treeColor = "text-stone-300"; // Gray
                                            let bgColor = "bg-stone-100/60";
                                            let borderStyle = "border border-stone-200/40";
                                            
                                            const practicedDays = [0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 15, 17, 18];
                                            const missedDays = [5, 12];
                                            
                                            if (practicedDays.includes(index)) {
                                                treeColor = "text-green-600";
                                                bgColor = "bg-green-50/80";
                                                borderStyle = "border border-green-200/50";
                                            } else if (missedDays.includes(index)) {
                                                treeColor = "text-red-500";
                                                bgColor = "bg-red-50/80";
                                                borderStyle = "border border-red-200/50";
                                            }
                                            
                                            return (
                                                <div 
                                                    key={index}
                                                    className={`aspect-square w-full rounded-[8px] flex items-center justify-center transition-all ${bgColor} ${borderStyle} hover:scale-105 cursor-default`}
                                                    title={`Day ${index + 1}`}
                                                >
                                                    <TreePine size={16} className={`${treeColor} stroke-[2.2]`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <Link 
                                        href="/platform/achievements"
                                        onClick={() => setShowProgressPopup(false)}
                                        className="text-[10px] text-stone-600 hover:text-stone-900 transition-colors uppercase tracking-widest font-bold border-t border-stone-100 pt-3 mt-1 hover:underline z-10 relative"
                                    >
                                        View Achievements ➔
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right-aligned item */}
                    <Link href="/platform/profile" className="hover:text-stone-950 transition-colors font-medium uppercase tracking-[0.1em]">
                        My profile
                    </Link>
                </header>

                {/* Main panel container */}
                <div className="flex-1 bg-[#F0F0EA] rounded-[32px] p-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.015)] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
