"use client";

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Brain } from 'lucide-react';

/**
 * The brain in the header pill: the simple line icon, always in the same dark
 * grey — the bar beside it is what changes colour, green to gold, when the
 * week is golden.
 *
 * When the week's score goes up, the points just earned float off the icon
 * — "+4" for showing up, "+15" for a craft area, and so on — and three plus
 * sparks burst around it. The sparks also come on their own every few minutes
 * while the tab is visible, a small sign of life. Off under reduced motion,
 * except the number, which is information.
 */

const AMBIENT_MS = 4 * 60 * 1000;
const POINTS_MS = 1800;

const SPARKS = [
    { x: -30, y: -20, size: 9, delay: 0 },
    { x: 92, y: -6, size: 7, delay: 0.18 },
    { x: 84, y: 66, size: 9, delay: 0.32 },
];

interface MindPowerPillBrainProps {
    /** This week's progress toward golden, 0–100. */
    percent: number;
    /** This week's score, out of 100. */
    points: number;
    size?: 'sm' | 'md';
}

export default function MindPowerPillBrain({ percent, points, size = 'md' }: MindPowerPillBrainProps) {
    const reduceMotion = useReducedMotion();
    const [burst, setBurst] = useState(0);
    const [gained, setGained] = useState<{ n: number; key: number } | null>(null);
    const lastPoints = useRef<number | null>(null);
    const golden = percent >= 100;

    // Points earned: the difference since the last reading, shown once. The
    // first reading is just the page finding out where the week stands.
    useEffect(() => {
        if (lastPoints.current === null) {
            lastPoints.current = points;
            return;
        }
        const diff = points - lastPoints.current;
        lastPoints.current = points;
        if (diff <= 0) return;
        setGained({ n: diff, key: Date.now() });
        if (!reduceMotion) setBurst(b => b + 1);
        const id = window.setTimeout(() => setGained(null), POINTS_MS);
        return () => window.clearTimeout(id);
    }, [points, reduceMotion]);

    // And a burst every few minutes while someone is looking.
    useEffect(() => {
        if (reduceMotion) return;
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') setBurst(b => b + 1);
        }, AMBIENT_MS);
        return () => clearInterval(id);
    }, [reduceMotion]);

    const px = size === 'sm' ? 16 : 19;

    return (
        <span className="relative block shrink-0" style={{ width: px, height: px }} data-pill-brain data-golden={golden || undefined} aria-hidden>
            <Brain size={px} strokeWidth={1.5} className="block text-stone-600" />
            {gained && (
                <span
                    key={gained.key}
                    data-points-gained
                    className={`pointer-events-none absolute left-1/2 -top-1 whitespace-nowrap font-lyrics text-[13px] font-medium leading-none tabular-nums ${
                        golden ? 'text-[#B8892A]' : 'text-[#4F8A48]'
                    } ${reduceMotion ? '' : 'mind-power-points'}`}
                    style={{ transform: 'translateX(-50%)' }}
                >
                    +{gained.n}
                </span>
            )}
            {burst > 0 && (
                <span className="pointer-events-none absolute inset-0" key={burst}>
                    {SPARKS.map((s, i) => (
                        <svg
                            key={i}
                            className="absolute mind-power-plus"
                            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
                            viewBox="0 0 10 10"
                        >
                            <rect x="4" y="0" width="2" height="10" fill="#86BE7F" />
                            <rect x="0" y="4" width="10" height="2" fill="#86BE7F" />
                        </svg>
                    ))}
                </span>
            )}
        </span>
    );
}
