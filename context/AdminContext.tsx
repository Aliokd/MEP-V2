"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdminRole, roleHasPermission, type AdminPermission, type AdminRole } from "@/lib/admin/roles";

interface AdminContextType {
    user: User | null;
    role: AdminRole | null;
    loading: boolean;
    can: (permission: AdminPermission) => boolean;
    /** fetch() against /api/admin/* with the caller's ID token attached. */
    adminFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType>({
    user: null,
    role: null,
    loading: true,
    can: () => false,
    adminFetch: async () => new Response(null, { status: 401 }),
});

export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AdminRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // onIdTokenChanged (not onAuthStateChanged) so a role change picked up on the
        // next token refresh updates the console without a reload.
        return onIdTokenChanged(auth, async (nextUser) => {
            setUser(nextUser);
            if (!nextUser) {
                setRole(null);
                setLoading(false);
                return;
            }
            try {
                const result = await nextUser.getIdTokenResult();
                const claimRole = result.claims.adminRole;
                setRole(isAdminRole(claimRole) ? claimRole : null);
            } catch (err) {
                console.error("[admin] Failed to read admin claim", err);
                setRole(null);
            }
            setLoading(false);
        });
    }, []);

    const adminFetch = useCallback(async (input: string, init: RequestInit = {}) => {
        const current = auth.currentUser;
        if (!current) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });

        const token = await current.getIdToken();
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${token}`);
        if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

        return fetch(input, { ...init, headers });
    }, []);

    const can = useCallback((permission: AdminPermission) => roleHasPermission(role, permission), [role]);

    const value = useMemo(
        () => ({ user, role, loading, can, adminFetch }),
        [user, role, loading, can, adminFetch],
    );

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
