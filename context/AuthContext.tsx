"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Playwright testing mock user override
        if (typeof window !== 'undefined') {
            const mockUserJson = localStorage.getItem('playwright_mock_user');
            if (mockUserJson) {
                try {
                    const mockUser = JSON.parse(mockUserJson);
                    setUser(mockUser as User);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Error parsing playwright_mock_user in AuthContext:", e);
                }
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (user && typeof window !== 'undefined') {
            try {
                const clarity = (window as any).clarity;
                if (typeof clarity === 'function') {
                    clarity("identify", user.uid, {
                        name: user.displayName || 'Active User',
                        email: user.email || ''
                    });
                } else {
                    // Queue call if script isn't fully loaded yet
                    (window as any).clarity = (window as any).clarity || function() {
                        ((window as any).clarity.q = (window as any).clarity.q || []).push(arguments);
                    };
                    (window as any).clarity("identify", user.uid, {
                        name: user.displayName || 'Active User',
                        email: user.email || ''
                    });
                }
            } catch (err) {
                console.error("Error identifying user in Clarity:", err);
            }
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
