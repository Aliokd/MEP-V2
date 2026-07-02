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
