"use client";

import { useAuth } from '@/context/AuthContext';
import ConnectTab from './components/ConnectTab';

export default function ConnectPage() {
    const { user, loading: authLoading } = useAuth();

    if (authLoading) return (
        <div className="flex-1 min-h-[400px] flex items-center justify-center bg-transparent">
            <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    return (
        <div className="w-full">
            <ConnectTab />
        </div>
    );
}
