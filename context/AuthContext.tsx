"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { bindLocalStateToAccount } from '@/lib/storage';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    /**
     * True when the account behind this session has been disabled or deleted in
     * Firebase Auth. The user has already been signed out; this flag exists so the
     * app can say *why* instead of silently bouncing them to the sign-in screen.
     */
    blocked: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, blocked: false });

export const useAuth = () => useContext(AuthContext);

/**
 * Codes Firebase returns when the account behind a session is no longer allowed
 * to hold one: disabled in the console or by a sanction, refresh token revoked,
 * or the account deleted outright.
 */
const BLOCKED_CODES = new Set([
    'auth/user-disabled',
    'auth/user-token-expired',
    'auth/user-not-found',
]);

/** How often an open tab re-asks Firebase whether the account is still enabled. */
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
/** Re-checking on every focus event would hammer the token endpoint; throttle it. */
const FOCUS_THROTTLE_MS = 2 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [blocked, setBlocked] = useState(false);
    const isMockUserRef = useRef(false);
    const lastCheckRef = useRef(0);

    /**
     * Asks Firebase whether this account may still hold a session, and ends the
     * session here if it may not.
     *
     * The forced refresh is the whole point. Disabling an account in the Firebase
     * console (or via a sanction) does not invalidate the ID token already in the
     * browser — it stays valid until it expires, so without this a blocked user
     * keeps using the app for up to an hour. Forcing a refresh makes the client
     * ask the token endpoint, which refuses for a disabled account.
     */
    const enforceAccountStatus = useCallback(async (current: User) => {
        lastCheckRef.current = Date.now();
        try {
            await current.getIdToken(true);
        } catch (err: any) {
            if (BLOCKED_CODES.has(err?.code)) {
                setBlocked(true);
                await signOut(auth).catch(() => {});
                return;
            }
            // Everything else — offline, a transient 5xx from Google — fails open.
            // A network blip must never throw someone out of a song they're writing.
            console.warn('Account status check failed, keeping session:', err?.code || err);
        }
    }, []);

    useEffect(() => {
        // Playwright testing mock user override — dev/test builds only. Shipping this in
        // production let anyone with devtools open the platform UI unauthenticated (no real
        // token, so no data access, but it also skipped account-status enforcement).
        if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
            const mockUserJson = localStorage.getItem('playwright_mock_user');
            if (mockUserJson) {
                try {
                    const mockUser = JSON.parse(mockUserJson);
                    isMockUserRef.current = true;
                    setUser(mockUser as User);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Error parsing playwright_mock_user in AuthContext:", e);
                }
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            // Before anything renders for this account, make sure the browser's local state
            // belongs to it — a different previous account's cached projects, Mind Power
            // progress, and dismissed welcome-video/tour flags must not carry over.
            if (user) bindLocalStateToAccount(user.uid);
            setUser(user);
            // A fresh sign-in clears a previous block — if the account were still
            // disabled, Firebase would have refused the sign-in itself.
            if (user) setBlocked(false);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Keeps the session honest while the tab is open: once on sign-in, on a
    // throttled tab focus, and on a slow interval for tabs left open all day.
    useEffect(() => {
        if (!user || isMockUserRef.current) return;

        enforceAccountStatus(user);

        const interval = setInterval(() => enforceAccountStatus(user), CHECK_INTERVAL_MS);
        const recheckOnReturn = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - lastCheckRef.current < FOCUS_THROTTLE_MS) return;
            enforceAccountStatus(user);
        };

        document.addEventListener('visibilitychange', recheckOnReturn);
        window.addEventListener('focus', recheckOnReturn);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', recheckOnReturn);
            window.removeEventListener('focus', recheckOnReturn);
        };
    }, [user, enforceAccountStatus]);

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
        <AuthContext.Provider value={{ user, loading, blocked }}>
            {children}
        </AuthContext.Provider>
    );
};
