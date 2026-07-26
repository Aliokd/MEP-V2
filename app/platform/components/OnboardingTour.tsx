"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { safeLocalStorageSetItem } from '@/lib/storage';

export interface TourStep {
    target: string;
    title: string;
    description: string;
}

interface OnboardingTourProps {
    steps: TourStep[];
    storageKey: string;
    skipLabel: string;
    backLabel: string;
    nextLabel: string;
    doneLabel: string;
}

interface Rect { top: number; left: number; width: number; height: number; }

// Some tour targets exist twice in the DOM at once (e.g. a mobile-only and a
// desktop-only copy of the same pill, toggled with responsive classes), and
// off-canvas elements like the mobile sidebar drawer stay mounted but sit
// outside the viewport. Only the one actually on screen should be spotlighted.
function findVisibleElement(selector: string): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) continue;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) continue;
        return el;
    }
    return null;
}

export default function OnboardingTour({ steps, storageKey, skipLabel, backLabel, nextLabel, doneLabel }: OnboardingTourProps) {
    const [mounted, setMounted] = useState(false);
    const [dismissed, setDismissed] = useState(true);
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const attemptsRef = useRef(0);
    const cancelledRef = useRef(false);

    useEffect(() => {
        setMounted(true);
        try {
            setDismissed(!!localStorage.getItem(storageKey));
        } catch {
            setDismissed(true);
        }
    }, [storageKey]);

    const finish = useCallback(() => {
        setDismissed(true);
        safeLocalStorageSetItem(storageKey, 'true');
    }, [storageKey]);

    const step = steps[stepIndex];
    // The parent recreates `steps` (and every step object) on each of its own
    // renders — often, since it lives under a layout with frequent timers — so
    // effects below key off this primitive string rather than `step` itself,
    // otherwise they'd see a "new" step every render and never stop resetting.
    const target = step?.target;

    const measure = useCallback(() => {
        if (!target) return;
        const el = findVisibleElement(target);
        if (el) {
            const r = el.getBoundingClientRect();
            setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }
    }, [target]);

    // Find (and keep retrying for) this step's target. Real app content mounts
    // async — e.g. the create canvas auto-creates a note on first load — so the
    // element may not exist yet when the step becomes active.
    useEffect(() => {
        if (dismissed || !target) return;
        cancelledRef.current = false;
        attemptsRef.current = 0;
        setRect(null);

        const tryFind = () => {
            if (cancelledRef.current) return;
            const el = findVisibleElement(target);
            if (el) {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                measure();
            } else if (attemptsRef.current < 15) {
                attemptsRef.current += 1;
                setTimeout(tryFind, 200);
            } else if (!cancelledRef.current) {
                // Never showed up (e.g. this device layout hides it) — don't stall the tour.
                setStepIndex(i => (i < steps.length - 1 ? i + 1 : i));
                if (stepIndex >= steps.length - 1) finish();
            }
        };
        tryFind();

        return () => { cancelledRef.current = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepIndex, dismissed, target, measure, finish, steps.length]);

    useEffect(() => {
        if (dismissed || !rect) return;
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [dismissed, rect, measure]);

    useEffect(() => {
        if (dismissed) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dismissed, finish]);

    if (!mounted || dismissed || !step || !rect) return null;

    const isLast = stepIndex === steps.length - 1;
    const padding = 8;
    const spot = {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
    };
    const radius = Math.min(24, Math.min(spot.width, spot.height) / 2);

    const tooltipWidth = 320;
    const margin = 16;
    const spaceBelow = window.innerHeight - (spot.top + spot.height);
    const placeAbove = spaceBelow < 200 && spot.top > 200;
    const tooltipTop = placeAbove
        ? Math.max(margin, spot.top - margin)
        : Math.min(window.innerHeight - margin, spot.top + spot.height + margin);
    const rawLeft = spot.left + spot.width / 2 - tooltipWidth / 2;
    const tooltipLeft = Math.min(Math.max(margin, rawLeft), window.innerWidth - tooltipWidth - margin);

    return createPortal(
        <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
            {/* Click-catcher: keeps the rest of the app inert while the tour is active */}
            <div className="fixed inset-0" onClick={finish} />

            {/* Spotlight cutout around the target */}
            <div
                className="fixed pointer-events-none transition-all duration-300 ease-out"
                style={{
                    top: spot.top,
                    left: spot.left,
                    width: spot.width,
                    height: spot.height,
                    borderRadius: radius,
                    boxShadow: '0 0 0 9999px rgba(20,20,18,0.6)',
                }}
            />
            <div
                className="fixed pointer-events-none transition-all duration-300 ease-out border-2 border-white/90"
                style={{
                    top: spot.top,
                    left: spot.left,
                    width: spot.width,
                    height: spot.height,
                    borderRadius: radius,
                }}
            />

            {/* Tooltip card */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed bg-white rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-stone-200/70 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
                style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth, maxWidth: `calc(100vw - ${margin * 2}px)` }}
            >
                <button
                    onClick={finish}
                    aria-label={skipLabel}
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                >
                    <X size={16} />
                </button>

                <div className="flex items-center gap-1.5">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === stepIndex ? 'w-6 bg-stone-900' : 'w-1.5 bg-stone-200'
                            }`}
                        />
                    ))}
                </div>

                <div className="flex flex-col gap-1.5 pr-4">
                    <h3 className="text-lg font-sans font-semibold text-stone-900 leading-snug">{step.title}</h3>
                    <p className="text-[14px] font-medium text-stone-600 leading-relaxed">{step.description}</p>
                </div>

                <div className="flex items-center justify-between gap-3 mt-1">
                    <button
                        onClick={finish}
                        className="text-[13px] font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                    >
                        {skipLabel}
                    </button>
                    <div className="flex items-center gap-2">
                        {stepIndex > 0 && (
                            <button
                                onClick={() => setStepIndex(i => Math.max(0, i - 1))}
                                className="flex items-center gap-1 px-3.5 py-2 rounded-full border border-stone-200 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 transition-all cursor-pointer active:scale-95"
                            >
                                <ChevronLeft size={14} />
                                {backLabel}
                            </button>
                        )}
                        <button
                            onClick={() => (isLast ? finish() : setStepIndex(i => i + 1))}
                            className="flex items-center gap-1 px-4 py-2 rounded-full bg-stone-900 text-white text-[13px] font-semibold hover:bg-stone-800 transition-all cursor-pointer active:scale-95"
                        >
                            {isLast ? doneLabel : nextLabel}
                            {!isLast && <ChevronRight size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
