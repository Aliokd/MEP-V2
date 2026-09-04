"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAdmin } from "@/context/AdminContext";
import { ROLE_LABELS, type AdminPermission } from "@/lib/admin/roles";
import {
    LayoutDashboard, Inbox, Users, Flag, MessagesSquare, BookOpen, ClipboardList, FileText,
    Megaphone, Mail, BarChart3, CreditCard, SlidersHorizontal, ScrollText,
    Shield, LogOut, Menu, X, ExternalLink,
    BadgeCheck,
} from "lucide-react";
import { Spinner } from "./ui";

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    permission: AdminPermission;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const NAV: NavGroup[] = [
    {
        label: "Monitor",
        items: [
            { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: "overview.read" },
            { href: "/admin/inbox", label: "Inbox", icon: Inbox, permission: "inbox.read" },
            { href: "/admin/reports", label: "Reports", icon: Flag, permission: "reports.read" },
            { href: "/admin/community", label: "Community", icon: MessagesSquare, permission: "community.read" },
            { href: "/admin/waiting-list", label: "Waiting list", icon: ClipboardList, permission: "waitlist.read" },
        ],
    },
    {
        label: "Manage",
        items: [
            { href: "/admin/users", label: "Users", icon: Users, permission: "users.read" },
            { href: "/admin/verification", label: "Verification", icon: BadgeCheck, permission: "users.read" },
            { href: "/admin/content", label: "Content", icon: BookOpen, permission: "content.read" },
            { href: "/admin/pages", label: "Pages", icon: FileText, permission: "content.read" },
            { href: "/admin/announcements", label: "Announcements", icon: Megaphone, permission: "announcements.read" },
            { href: "/admin/email", label: "Email", icon: Mail, permission: "announcements.read" },
        ],
    },
    {
        label: "Insight",
        items: [
            { href: "/admin/analytics", label: "Growth", icon: BarChart3, permission: "analytics.read" },
            { href: "/admin/billing", label: "Billing", icon: CreditCard, permission: "billing.read" },
        ],
    },
    {
        label: "System",
        items: [
            { href: "/admin/ops", label: "Ops & flags", icon: SlidersHorizontal, permission: "ops.read" },
            { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit.read" },
            { href: "/admin/team", label: "Admin team", icon: Shield, permission: "roles.write" },
        ],
    },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const { can } = useAdmin();

    return (
        <nav className="flex flex-col gap-6 px-3">
            {NAV.map((group) => {
                const visible = group.items.filter((item) => can(item.permission));
                if (visible.length === 0) return null;

                return (
                    <div key={group.label} className="flex flex-col gap-1">
                        <span className="px-3 pb-1 text-[11px] font-medium text-ink-500">{group.label}</span>
                        {visible.map((item) => {
                            // /admin would otherwise match every child route.
                            const active = item.href === "/admin"
                                ? pathname === "/admin"
                                : pathname?.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onNavigate}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                                        active
                                            ? "bg-ink-700 text-ink-100"
                                            : "text-ink-300 hover:text-ink-100 hover:bg-ink-800"
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${active ? "text-green-500" : "text-ink-400"}`} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                );
            })}
        </nav>
    );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const { user, role } = useAdmin();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut(auth);
            router.push("/signin");
        } catch (err) {
            console.error("Admin sign-out failed:", err);
            setSigningOut(false);
        }
    };

    const initials = (user?.displayName || user?.email || "?").slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen bg-ink-950 text-ink-100 flex">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-60 shrink-0 flex-col gap-6 py-5 bg-ink-900 border-r border-ink-600 sticky top-0 h-screen overflow-y-auto">
                <Link href="/admin" className="px-6 flex flex-col gap-0.5">
                    <span className="text-lg font-light tracking-tight text-ink-100">Veinote</span>
                    <span className="text-[11px] text-green-500 font-medium">Admin</span>
                </Link>

                <NavLinks />

                <div className="mt-auto px-3 flex flex-col gap-1">
                    <Link
                        href="/platform"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open platform
                    </Link>
                    <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-xl bg-ink-850 border border-ink-600">
                        <div className="w-7 h-7 rounded-full bg-ink-700 border border-ink-500 flex items-center justify-center text-[11px] font-semibold text-ink-200 shrink-0">
                            {initials}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs text-ink-200 truncate">{user?.displayName || user?.email}</span>
                            <span className="text-[11px] text-ink-500">{role ? ROLE_LABELS[role] : ""}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            title="Sign out"
                            className="text-ink-500 hover:text-red-300 transition-colors shrink-0"
                        >
                            {signingOut ? <Spinner className="w-3.5 h-3.5" /> : <LogOut className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
                    <aside className="relative w-64 bg-ink-900 border-r border-ink-600 py-5 flex flex-col gap-6 overflow-y-auto">
                        <div className="px-6 flex items-center justify-between">
                            <span className="text-lg font-light tracking-tight">Veinote <span className="text-green-500 text-xs align-top">Admin</span></span>
                            <button onClick={() => setMobileOpen(false)} className="text-ink-400 hover:text-ink-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <NavLinks onNavigate={() => setMobileOpen(false)} />
                        <button
                            onClick={handleSignOut}
                            className="mt-auto mx-3 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-400 hover:text-red-300"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </aside>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col">
                <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-ink-900 border-b border-ink-600">
                    <button onClick={() => setMobileOpen(true)} className="text-ink-300 hover:text-ink-100">
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-light">Veinote <span className="text-green-500 text-[11px]">Admin</span></span>
                    <div className="w-7 h-7 rounded-full bg-ink-700 border border-ink-500 flex items-center justify-center text-[10px] font-semibold text-ink-200">
                        {initials}
                    </div>
                </header>

                <main className="flex-1 min-w-0 p-4 md:p-8 max-w-[1600px] w-full">{children}</main>
            </div>
        </div>
    );
}
