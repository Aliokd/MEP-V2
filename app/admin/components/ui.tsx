"use client";

import React from "react";
import { clsx } from "clsx";

/**
 * Shared primitives for the admin console. Dark by construction — these are only
 * used under app/admin/**, so they hard-code the ink ramp rather than reacting to
 * a theme class. The platform's light UI never imports from here.
 */

export function Panel({
    className,
    children,
    ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={clsx("bg-ink-850 border border-ink-600 rounded-2xl", className)}
            {...rest}
        >
            {children}
        </div>
    );
}

export function PanelHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink-600">
            <div className="flex flex-col gap-0.5 min-w-0">
                <h2 className="text-sm font-semibold text-ink-100 truncate">{title}</h2>
                {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export function PageHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1.5 min-w-0">
                <h1 className="text-2xl font-light text-ink-100 tracking-tight">{title}</h1>
                {description && <p className="text-sm text-ink-400 max-w-2xl">{description}</p>}
            </div>
            {action}
        </div>
    );
}

type Tone = "neutral" | "green" | "gold" | "red" | "blue";

const TONE_CLASSES: Record<Tone, string> = {
    neutral: "bg-ink-700 text-ink-200 border-ink-500",
    green: "bg-green-500/10 text-green-400 border-green-500/30",
    gold: "bg-gold-500/10 text-gold-300 border-gold-500/30",
    red: "bg-red-500/10 text-red-300 border-red-500/30",
    blue: "bg-sky-500/10 text-sky-300 border-sky-500/30",
};

export function Badge({
    tone = "neutral",
    children,
    className,
}: {
    tone?: Tone;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap",
                TONE_CLASSES[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

export function StatTile({
    label,
    value,
    delta,
    hint,
    tone = "neutral",
    href,
}: {
    label: string;
    value: string | number;
    delta?: string;
    hint?: string;
    tone?: Tone;
    href?: string;
}) {
    const body = (
        <>
            <span className="text-xs text-ink-400">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-ink-100 tabular-nums">{value}</span>
                {delta && (
                    <span
                        className={clsx(
                            "text-xs font-medium tabular-nums",
                            tone === "red" ? "text-red-300" : "text-green-400",
                        )}
                    >
                        {delta}
                    </span>
                )}
            </div>
            {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
        </>
    );

    const className = clsx(
        "flex flex-col gap-1.5 p-4 rounded-2xl border bg-ink-850 transition-colors",
        tone === "red" ? "border-red-500/30" : "border-ink-600",
        href && "hover:bg-ink-800 hover:border-ink-500 cursor-pointer",
    );

    if (href) {
        return (
            <a href={href} className={className}>
                {body}
            </a>
        );
    }
    return <div className={className}>{body}</div>;
}

export function Button({
    variant = "secondary",
    size = "md",
    className,
    ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
}) {
    return (
        <button
            className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
                size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2",
                variant === "primary" && "bg-green-500 text-ink-950 hover:bg-green-400",
                variant === "secondary" && "border border-ink-500 text-ink-200 hover:bg-ink-700 hover:text-ink-100",
                variant === "ghost" && "text-ink-300 hover:text-ink-100 hover:bg-ink-800",
                variant === "danger" && "border border-red-500/40 text-red-300 hover:bg-red-500/10",
                className,
            )}
            {...rest}
        />
    );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={clsx(
                "w-full bg-ink-700 border border-ink-600 rounded-xl px-3.5 py-2 text-sm text-ink-100 placeholder:text-ink-500",
                "focus:outline-none focus:border-green-500/60 transition-colors",
                className,
            )}
            {...rest}
        />
    );
}

/** Forwards its ref: the markdown toolbar needs the element to read a selection. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    function Textarea({ className, ...rest }, ref) {
        return (
            <textarea
                ref={ref}
                className={clsx(
                    "w-full bg-ink-700 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500",
                    "focus:outline-none focus:border-green-500/60 transition-colors resize-y",
                    className,
                )}
                {...rest}
            />
        );
    },
);

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={clsx(
                "bg-ink-700 border border-ink-600 rounded-xl px-3 py-2 text-sm text-ink-100",
                "focus:outline-none focus:border-green-500/60 transition-colors",
                className,
            )}
            {...rest}
        >
            {children}
        </select>
    );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
            <p className="text-sm text-ink-200">{title}</p>
            {description && <p className="text-xs text-ink-500 max-w-sm">{description}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

export function Spinner({ className }: { className?: string }) {
    return (
        <div
            className={clsx(
                "w-4 h-4 border-2 border-ink-500 border-t-green-500 rounded-full animate-spin",
                className,
            )}
        />
    );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
    return (
        <div className="flex flex-col gap-2 p-4 animate-pulse">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-ink-800" />
            ))}
        </div>
    );
}

/** Compact relative time ("3m", "2h", "5d") for dense admin tables. */
export function timeAgo(value: number | string | null | undefined): string {
    if (!value) return "—";
    const ms = typeof value === "number" ? value : Date.parse(value);
    if (Number.isNaN(ms)) return "—";

    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ms).toLocaleDateString();
}
