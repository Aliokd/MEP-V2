"use client";

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PracticeTab from './components/PracticeTab';
import Link from 'next/link';

export default function PracticePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    if (authLoading) return (
        <div className="h-screen flex items-center justify-center bg-charcoal">
            <div className="w-8 h-8 border-t-2 border-gold-500 rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <div className="relative min-h-screen bg-charcoal flex flex-col items-center">
            {/* Top Navigation */}
            <div className="w-full flex items-center justify-between px-10 py-6 z-30">
                <Link
                    href="/platform"
                    className="text-alabaster font-serif text-lg tracking-tighter opacity-80 hover:opacity-100 transition-opacity"
                >
                    Logo
                </Link>

                <div className="flex items-center gap-8">
                    <Link href="/platform" className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">My classes</Link>
                    <Link href="/platform/practice" className="text-[10px] uppercase tracking-[0.2em] text-gold-400 font-sans border-b border-gold-400/30 pb-1">Practise</Link>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">Show the world</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">Community?</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">Practice instruments</button>
                </div>

                <div className="flex items-center gap-6">
                    <button className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">My profile</button>
                    <button className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">Settings</button>
                    <button
                        onClick={handleLogout}
                        className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <PracticeTab />
        </div>
    );
}
