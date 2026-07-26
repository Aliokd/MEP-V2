"use client";

import React from "react";
import Link from "next/link";
import { useAdmin } from "@/context/AdminContext";
import type { AdminPermission } from "@/lib/admin/roles";
import { Spinner, Panel } from "./ui";

/**
 * Blocks the console for anyone without an admin claim.
 *
 * This is a convenience gate, not the security boundary — the claim lives in a
 * token the client holds, so the check that counts is requireAdmin() on every
 * /api/admin/* route, plus the Firestore rules. Nothing here is trusted server-side.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
    const { user, role, loading } = useAdmin();

    if (loading) {
        return (
            <div className="min-h-screen bg-ink-950 flex items-center justify-center">
                <Spinner className="w-6 h-6" />
            </div>
        );
    }

    if (!user) {
        return (
            <Denied
                title="Sign in required"
                body="You need to be signed in to a Veinote account with admin access."
                action={
                    <Link
                        href="/signin"
                        className="px-5 py-2 rounded-full bg-green-500 text-ink-950 text-sm font-medium hover:bg-green-400 transition-colors"
                    >
                        Sign in
                    </Link>
                }
            />
        );
    }

    if (!role) {
        return (
            <Denied
                title="No admin access"
                body={`${user.email} doesn't have an admin role. If a role was granted just now, sign out and back in — the role travels in your ID token, which refreshes on sign-in.`}
                action={
                    <Link
                        href="/platform"
                        className="px-5 py-2 rounded-full border border-ink-500 text-ink-200 text-sm hover:bg-ink-800 transition-colors"
                    >
                        Back to platform
                    </Link>
                }
            />
        );
    }

    return <>{children}</>;
}

function Denied({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-ink-950 text-ink-100 flex items-center justify-center p-6">
            <Panel className="max-w-md w-full p-8 flex flex-col gap-3 items-start">
                <span className="text-[11px] text-green-500 font-medium">Veinote Admin</span>
                <h1 className="text-xl font-light">{title}</h1>
                <p className="text-sm text-ink-400 leading-relaxed">{body}</p>
                <div className="mt-3">{action}</div>
            </Panel>
        </div>
    );
}

/** Inline guard for a single panel or action inside an already-gated page. */
export function RequirePermission({
    permission,
    children,
    fallback = null,
}: {
    permission: AdminPermission;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}) {
    const { can } = useAdmin();
    return <>{can(permission) ? children : fallback}</>;
}
