"use client";

import MaestroSidebar from './components/MaestroSidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/signin');
        }
    }, [user, loading, router]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-charcoal">
            <div className="w-12 h-12 border-t-2 border-gold-500 rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    return (
        <div className="min-h-screen bg-charcoal">
            <main className="w-full h-full">
                {children}
            </main>
        </div>
    );
}
