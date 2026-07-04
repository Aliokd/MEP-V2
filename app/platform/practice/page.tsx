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

    // Track active session practice time (accumulate seconds spent in Practice tab)
    useEffect(() => {
        const interval = setInterval(() => {
            const storedSeconds = parseInt(localStorage.getItem('mep-practice-seconds') || '0');
            const nextSeconds = storedSeconds + 10; // add 10 seconds
            localStorage.setItem('mep-practice-seconds', nextSeconds.toString());
            
            // Dispatch event to update the platform header progress calculations
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }, 10000); // every 10 seconds
        return () => clearInterval(interval);
    }, []);

    if (authLoading) return (
        <div className="flex-1 min-h-[400px] flex items-center justify-center bg-transparent">
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
        <div className="w-full">
            <PracticeTab />
        </div>
    );
}
