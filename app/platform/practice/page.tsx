"use client";

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PracticeTab from './components/PracticeTab';
import Logo from '@/components/Logo';
import Link from 'next/link';

export default function PracticePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    if (authLoading) return (
        <div className="h-screen flex items-center justify-center bg-[#DCDDD4]">
            <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin" />
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
        <div className="relative min-h-screen bg-[#DCDDD4] flex flex-col items-center">
            {/* Top Navigation */}
            <div className="w-full flex items-center justify-between px-10 py-6 z-30">
                <Link
                    href="/platform"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                >
                    <Logo size="md" />
                </Link>

                <div className="flex items-center gap-8">
                    <Link href="/platform" className="text-[10px] uppercase tracking-[0.2em] text-[#363636]/70 hover:text-[#363636] transition-colors font-sans">My classes</Link>
                    <Link href="/platform/practice" className="text-[10px] uppercase tracking-[0.2em] text-stone-900 font-sans font-semibold border-b border-stone-900 pb-1">Practise</Link>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-[#363636]/70 hover:text-[#363636] transition-colors font-sans">Show the world</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-[#363636]/70 hover:text-[#363636] transition-colors font-sans">Community?</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-[#363636]/70 hover:text-[#363636] transition-colors font-sans">Practice instruments</button>
                </div>

                <div className="flex items-center gap-6">
                    <button className="text-[10px] uppercase tracking-widest text-[#363636]/70 hover:text-[#363636] transition-colors">My profile</button>
                    <button className="text-[10px] uppercase tracking-widest text-[#363636]/70 hover:text-[#363636] transition-colors">Settings</button>
                    <button
                        onClick={handleLogout}
                        className="text-[10px] uppercase tracking-widest text-[#363636]/70 hover:text-[#363636] transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <PracticeTab />
        </div>
    );
}
