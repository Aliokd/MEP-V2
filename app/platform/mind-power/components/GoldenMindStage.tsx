"use client";

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BRAIN_SRC, BRAIN_GOLD_SRC, FRAME_W, FRAME_H, fillClipTop } from './brainGeometry';

/**
 * The golden-mind animation, as a stage that can stand anywhere: the weekly
 * celebration popup and the shared streak card both play it.
 *
 * The brain fills green from the bottom, 0 to 100%, in one CSS transition
 * that the level line shares — the clip and the line are the same number on
 * the same curve, so they cannot drift apart — with the plus sparks bursting
 * at each step. At the top the green crossfades to gold as the brain leans in
 * a little, and a handful of gold confetti falls beneath it. Under reduced
 * motion the brain is simply gold.
 *
 * `tone` picks the line and number colours for the ground it sits on: paper
 * white on the dark popup, ink on the paper share page.
 */

const FILL_MS = 2200;
const FILL_EASE = 'cubic-bezier(0.45, 0, 0.55, 1)';
const TICK_MS = 40;

/** Around the brain, not on it: the model spans 24–81% of the frame's width. */
const SPARKS = [
    { x: 14, y: 16, size: 20, delay: 0 },
    { x: 8, y: 36, size: 14, delay: 0.2 },
    { x: 87, y: 56, size: 20, delay: 0.1 },
    { x: 84, y: 76, size: 14, delay: 0.35 },
];

/** Gold only — the confetti is the brain's own colour, thrown. */
const CONFETTI_COLORS = ['#F1D066', '#E8CC8C', '#DCAE3C', '#FFF1AE', '#C5A059'];
const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
    left: 8 + ((i * 37) % 84),
    delay: (i % 5) * 0.09,
    drift: ((i % 3) - 1) * 26,
    spin: 220 + (i % 4) * 60,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 5 + (i % 3) * 2,
    h: 8 + (i % 2) * 4,
}));

/** The same curve as FILL_EASE, near enough, for the number that counts along. */
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

const TONES = {
    dark: { line: '#F5F4EE', number: '#D6C9AE', shadow: 'rgba(0,0,0,0.5)' },
    light: { line: '#363636', number: '#7A6A45', shadow: 'rgba(54,54,54,0.28)' },
} as const;

export type StagePhase = 'filling' | 'gold';

interface GoldenMindStageProps {
    /** True to run; flipping it true again replays from empty. */
    play: boolean;
    tone?: keyof typeof TONES;
    className?: string;
}

export default function GoldenMindStage({ play, tone = 'dark', className = '' }: GoldenMindStageProps) {
    const reduceMotion = useReducedMotion();
    const [phase, setPhase] = useState<StagePhase>('filling');
    /** The transition's target: 0 at mount, 1 a frame later. */
    const [target, setTarget] = useState(0);
    const [percent, setPercent] = useState(0);
    const [burst, setBurst] = useState(0);
    const lastStep = useRef(0);

    // The fill: one CSS transition, released on the frame after the empty state
    // has painted. Alongside it, on the wall clock, the number that counts up
    // and a spark burst on every 20% step; reaching the top is what turns it gold.
    useEffect(() => {
        if (!play) return;
        lastStep.current = 0;
        if (reduceMotion) {
            setTarget(1);
            setPercent(100);
            setBurst(0);
            setPhase('gold');
            return;
        }
        setTarget(0);
        setPercent(0);
        setBurst(0);
        setPhase('filling');
        const release = window.setTimeout(() => setTarget(1), 20);
        const started = performance.now() + 20;
        const id = setInterval(() => {
            const p = Math.min(1, Math.max(0, (performance.now() - started) / FILL_MS));
            const r = easeInOut(p);
            setPercent(Math.round(r * 100));
            const step = Math.floor(r * 5);
            if (step > lastStep.current) {
                lastStep.current = step;
                setBurst(b => b + 1);
            }
            if (p >= 1) {
                clearInterval(id);
                setPhase('gold');
            }
        }, TICK_MS);
        return () => {
            window.clearTimeout(release);
            clearInterval(id);
        };
    }, [play, reduceMotion]);

    const colors = TONES[tone];
    const gold = phase === 'gold';
    const clipTop = fillClipTop(gold ? 1 : target);
    const fillTransition = reduceMotion ? 'none' : `${FILL_MS}ms ${FILL_EASE}`;

    return (
        <div className={`relative aspect-[4/3] ${className}`} data-golden-stage data-phase={phase} aria-hidden>
            <div
                className="absolute inset-0"
                style={{
                    transform: gold ? 'scale(1.08)' : 'scale(1)',
                    transition: reduceMotion ? 'none' : 'transform 1100ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
            >
                {/* Unlit paper. */}
                <img
                    src={BRAIN_SRC}
                    alt=""
                    width={FRAME_W}
                    height={FRAME_H}
                    draggable={false}
                    className="block w-full h-auto select-none"
                    style={{ filter: `grayscale(1) brightness(0.72) drop-shadow(-16px 20px 22px ${colors.shadow})` }}
                />
                {/* The green, rising to the level in one smooth transition. */}
                <img
                    src={BRAIN_SRC}
                    alt=""
                    width={FRAME_W}
                    height={FRAME_H}
                    draggable={false}
                    data-fill
                    className="absolute inset-0 block w-full h-auto select-none"
                    style={{
                        clipPath: `inset(${clipTop.toFixed(3)}% 0 0 0)`,
                        transition: `clip-path ${fillTransition}`,
                        willChange: 'clip-path',
                    }}
                />
                {/* The gold, crossfading over the full green at the top. */}
                <img
                    src={BRAIN_GOLD_SRC}
                    alt=""
                    width={FRAME_W}
                    height={FRAME_H}
                    draggable={false}
                    className="absolute inset-0 block w-full h-auto select-none"
                    style={{ opacity: gold ? 1 : 0, transition: reduceMotion ? 'none' : 'opacity 1100ms ease-out' }}
                />

                {/* The level line: the same number as the clip, on the same curve.
                    The box ends at the arrow's tip, clear of the model's right edge
                    (81% of the frame); the number hangs outside it, so neither can
                    push the arrow back over the brain. */}
                <div
                    data-level-line
                    className="absolute left-[12%] right-[11%] flex items-center pointer-events-none"
                    style={{
                        top: `${clipTop.toFixed(3)}%`,
                        opacity: gold ? 0 : 1,
                        transform: 'translateY(-50%)',
                        transition: `top ${fillTransition}, opacity 500ms ease-out`,
                    }}
                >
                    <span className="h-[3px] flex-1 rounded-full" style={{ backgroundColor: colors.line }} />
                    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0 -ml-px block" data-arrow>
                        <path d="M16 0 L0 8 L16 16 Z" fill={colors.line} />
                    </svg>
                    <span
                        className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap font-lyrics text-[20px] leading-none tabular-nums"
                        style={{ color: colors.number }}
                        data-percent
                    >
                        {percent}%
                    </span>
                </div>

                {/* Sparks, one burst per step. */}
                {burst > 0 && !gold && (
                    <div className="absolute inset-0 pointer-events-none" key={burst}>
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
                    </div>
                )}
            </div>

            {/* Confetti, a little of it, once — falling from under the brain. */}
            {gold && !reduceMotion && (
                <div className="absolute inset-x-[14%] top-[78%] h-[200px] pointer-events-none" data-confetti>
                    {CONFETTI.map((c, i) => (
                        <span
                            key={i}
                            className="golden-confetti absolute block rounded-[2px]"
                            style={{
                                left: `${c.left}%`,
                                width: c.w,
                                height: c.h,
                                backgroundColor: c.color,
                                animationDelay: `${c.delay}s`,
                                ['--drift' as string]: `${c.drift}px`,
                                ['--spin' as string]: `${c.spin}deg`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
