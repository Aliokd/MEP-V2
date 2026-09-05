"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import {
    FRAME_W,
    FRAME_H,
    BRAIN_SRC,
    BRAIN_GOLD_SRC,
    hitWeeklyGoal,
    REGION_ORDER,
    REGION_LAYOUT,
    REGION_POLYGONS,
    REGION_POINTS,
    REGION_MARKERS,
    REGION_COLORS,
    fillClipTop,
    type RegionKey,
} from './brainGeometry';

/**
 * The paper brain, the six callouts around it, and this week's level.
 *
 * The callouts sit three a side and each points at its part of the brain with
 * a leader line: a short horizontal run from the title, then a straight line
 * to a fixed point on that region's edge. The lines are drawn in an SVG laid
 * over the whole stage and measured from the live layout — the callout's title
 * box and the brain's box — so they stay attached at any width and re-attach
 * on resize. Everything is grey at rest; point at a lobe, or at a callout, and
 * that callout's title, description and line go white.
 *
 * The brain is the rendered image; over it sits an SVG in the render's frame
 * carrying six invisible hotspot polygons that route the pointer to the
 * callouts. The model itself is never drawn on: a traced zone can't follow its
 * real facets and read as a sticker.
 *
 * The level is the week's share of the weekly goal. At rest the brain is green
 * from the bottom up to it and grey above, with a line across at that height
 * and the percentage at its end. Reaching the target turns the brain gold.
 *
 * Point at a region and the meter steps aside: the whole brain takes that
 * region's colour, and so do its callout and leader line. The colour is not a
 * seventh image — it is a greyscale copy of the render with a colour layer
 * blended over it in `color` mode and masked to the brain's alpha, so the
 * facet shading is the render's and the hue is the palette's, for any colour,
 * with a crossfade. Leave, and the green meter returns.
 *
 * The sparks are temporary: once when a non-zero level first shows, then only
 * on a new 10% step. The brain tilts toward the cursor on a perspective stage.
 * Both off under reduced motion.
 */

interface MindPowerBrainProps {
    t: (key: string) => string;
    /** This week's share of the weekly goal, 0–1. */
    weeklyRatio: number;
}

const SPARKS = [
    { x: 15, y: 10, size: 22, delay: 0 },
    { x: 7, y: 24, size: 15, delay: 0.25 },
    { x: 85, y: 72, size: 22, delay: 0.1 },
    { x: 74, y: 84, size: 15, delay: 0.4 },
];

const stepOf = (ratio: number) => Math.floor(ratio * 10);

/** Tailwind's `lg` breakpoint, as state: the marker dots behave differently either side of it. */
const LARGE_QUERY = '(min-width: 1024px)';
const subscribeLarge = (onChange: () => void) => {
    const mq = window.matchMedia(LARGE_QUERY);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
};
const useIsLarge = () =>
    useSyncExternalStore(
        subscribeLarge,
        () => window.matchMedia(LARGE_QUERY).matches,
        () => false,
    );

type Lines = Partial<Record<RegionKey, string>>;

export default function MindPowerBrain({ t, weeklyRatio }: MindPowerBrainProps) {
    const [active, setActive] = useState<RegionKey | null>(null);
    const reduceMotion = useReducedMotion();
    const large = useIsLarge();

    // ---- Level fill ----
    const [fillRatio, setFillRatio] = useState(0);
    useEffect(() => {
        const id = setTimeout(() => setFillRatio(weeklyRatio), 40);
        return () => clearTimeout(id);
    }, [weeklyRatio]);

    const [settled, setSettled] = useState(false);
    useEffect(() => {
        if (fillRatio <= 0) return;
        const id = setTimeout(() => setSettled(true), 950);
        return () => clearTimeout(id);
    }, [fillRatio]);
    const speed = settled ? 'duration-[400ms]' : 'duration-[900ms]';

    // ---- Sparks ----
    const [burst, setBurst] = useState(0);
    const shownStepRef = useRef<number | null>(null);
    useEffect(() => {
        if (reduceMotion || weeklyRatio <= 0) return;
        const step = stepOf(weeklyRatio);
        if (shownStepRef.current !== null && step <= shownStepRef.current) return;
        shownStepRef.current = step;
        setBurst(b => b + 1);
        const id = setTimeout(() => setBurst(0), 2600);
        return () => clearTimeout(id);
    }, [weeklyRatio, reduceMotion]);

    // ---- Parallax ----
    const mx = useMotionValue(0.5);
    const my = useMotionValue(0.5);
    // A lean, not a turn: a few degrees is enough to feel the depth, and more
    // than that starts to warp the silhouette of the model.
    const rotateY = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 120, damping: 18, mass: 0.6 });
    const rotateX = useSpring(useTransform(my, [0, 1], [4, -4]), { stiffness: 120, damping: 18, mass: 0.6 });

    const handleMove = (e: MouseEvent<HTMLDivElement>) => {
        if (reduceMotion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width);
        my.set((e.clientY - rect.top) / rect.height);
    };
    const handleLeave = () => {
        mx.set(0.5);
        my.set(0.5);
        setActive(null);
    };

    const select = (region: RegionKey) => setActive(region);
    const toggle = (region: RegionKey) => setActive(prev => (prev === region ? null : region));

    // ---- Card carousel (below lg) ----
    // The cards ride in a horizontal snap track. Choosing a region — by its
    // marker dot, or by a card — brings that card to the middle; swiping the
    // track the other way makes the card that settles in the middle the region.
    const trackRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Partial<Record<RegionKey, HTMLDivElement | null>>>({});
    const setCardRef = useCallback(
        (region: RegionKey) => (el: HTMLDivElement | null) => {
            cardRefs.current[region] = el;
        },
        [],
    );
    useEffect(() => {
        const track = trackRef.current;
        const card = active ? cardRefs.current[active] : null;
        // offsetParent is null while the track is display:none (lg and up).
        if (!track || !card || track.offsetParent === null) return;
        const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
        track.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [active, reduceMotion]);

    const settleRef = useRef<number | null>(null);
    const handleTrackScroll = () => {
        if (settleRef.current !== null) window.clearTimeout(settleRef.current);
        settleRef.current = window.setTimeout(() => {
            settleRef.current = null;
            const track = trackRef.current;
            if (!track) return;
            const middle = track.scrollLeft + track.clientWidth / 2;
            let nearest: RegionKey | null = null;
            let best = Infinity;
            for (const region of REGION_ORDER) {
                const card = cardRefs.current[region];
                if (!card) continue;
                const gap = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
                if (gap < best) {
                    best = gap;
                    nearest = region;
                }
            }
            if (nearest && nearest !== active) select(nearest);
        }, 120);
    };
    useEffect(
        () => () => {
            if (settleRef.current !== null) window.clearTimeout(settleRef.current);
        },
        [],
    );

    // ---- Leader lines ----
    // Measured against the stage box (untransformed), not the tilting image,
    // so the lines meet the brain where it rests.
    const gridRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const titleRefs = useRef<Partial<Record<RegionKey, HTMLElement | null>>>({});
    const [lines, setLines] = useState<Lines>({});
    const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

    const measure = useCallback(() => {
        const grid = gridRef.current;
        const stage = stageRef.current;
        if (!grid || !stage) return;
        const G = grid.getBoundingClientRect();
        const B = stage.getBoundingClientRect();
        if (G.width === 0 || B.width === 0) return;

        const next: Lines = {};
        for (const region of REGION_ORDER) {
            const el = titleRefs.current[region];
            if (!el) continue;
            const T = el.getBoundingClientRect();
            if (T.width === 0) continue;
            const side = REGION_LAYOUT[region].side;
            const ax = (side === 'left' ? T.right + 12 : T.left - 12) - G.left;
            const ay = T.top + T.height / 2 - G.top;
            const [fx, fy] = REGION_POINTS[region];
            const bx = B.left - G.left + (fx / FRAME_W) * B.width;
            const by = B.top - G.top + (fy / FRAME_H) * B.height;
            // A short horizontal run away from the text, then straight to the brain.
            const dir = side === 'left' ? 1 : -1;
            const run = Math.max(28, Math.min(96, Math.abs(bx - ax) * 0.42));
            const ex = ax + dir * run;
            next[region] = `${ax.toFixed(1)},${ay.toFixed(1)} ${ex.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`;
        }
        setLines(next);
        setStageSize({ w: G.width, h: G.height });
    }, []);

    useLayoutEffect(() => {
        measure();
        const ro = new ResizeObserver(() => measure());
        if (gridRef.current) ro.observe(gridRef.current);
        for (const el of Object.values(titleRefs.current)) if (el) ro.observe(el);
        window.addEventListener('resize', measure);
        // Once more after the webfont has had a chance to swap in.
        const late = setTimeout(measure, 500);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
            clearTimeout(late);
        };
    }, [measure]);

    const left = REGION_ORDER.filter(r => REGION_LAYOUT[r].side === 'left');
    const right = REGION_ORDER.filter(r => REGION_LAYOUT[r].side === 'right');

    const clipTop = fillClipTop(fillRatio);
    const percent = Math.round(weeklyRatio * 100);
    const tint = active ? REGION_COLORS[active] : null;
    const goal = hitWeeklyGoal(weeklyRatio);
    const sparkColor = goal ? '#E0BF6E' : '#6FAF62';
    const depth = (z: number) => (reduceMotion ? undefined : `translateZ(${z}px)`);

    const setTitleRef = (region: RegionKey) => (el: HTMLElement | null) => {
        titleRefs.current[region] = el;
    };

    return (
        <div className="flex flex-col gap-6">
            <div
                ref={gridRef}
                className="relative grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,520px)_1fr] items-center gap-6 lg:gap-6"
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
            >
                {/* Left column of callouts — desktop only; below lg they list under the brain. */}
                <div className="hidden lg:flex flex-col justify-between gap-10 min-h-[440px] py-2">
                    {left.map(region => (
                        <Callout
                            key={region}
                            region={region}
                            side="left"
                            active={active === region}
                            titleRef={setTitleRef(region)}
                            onEnter={() => select(region)}
                            onClick={() => toggle(region)}
                            t={t}
                        />
                    ))}
                </div>

                {/* The stage: perspective on the parent, the tilt on the child. */}
                <div
                    ref={stageRef}
                    // z-10: the brain sits above the leader lines, so a line stops at
                    // the model's surface instead of running across it.
                    className="relative z-10 mx-auto w-full max-w-[520px]"
                    style={{ perspective: 1100 }}
                >
                    <motion.div
                        style={reduceMotion ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
                        className="relative"
                    >
                        {/* Unlit paper, greyed. Carries the shadow so it is cast by the
                            whole shape whatever the level. */}
                        <img
                            src={BRAIN_SRC}
                            alt={t('progress.mp_brain_aria')}
                            width={FRAME_W}
                            height={FRAME_H}
                            draggable={false}
                            fetchPriority="high"
                            onLoad={measure}
                            className="relative block w-full h-auto select-none"
                            style={{
                                filter: 'grayscale(1) brightness(0.72) drop-shadow(-22px 26px 26px rgba(0,0,0,0.55))',
                                transform: depth(24),
                            }}
                        />

                        {/* The lit share, rising to the level — gold once the target is hit. */}
                        <img
                            src={goal ? BRAIN_GOLD_SRC : BRAIN_SRC}
                            alt=""
                            width={FRAME_W}
                            height={FRAME_H}
                            draggable={false}
                            aria-hidden
                            className={`absolute inset-0 block w-full h-auto select-none transition-[clip-path,opacity] ${speed} ease-out`}
                            style={{ clipPath: `inset(${clipTop.toFixed(2)}% 0 0 0)`, opacity: tint ? 0 : 1, transform: depth(24) }}
                        />

                        {/* The region colour: a greyscale render with the colour blended over
                            it in `color` mode, masked to the brain. Isolated so the blend
                            sees only the grey copy beneath it, not the page. */}
                        <div
                            className={`absolute inset-0 pointer-events-none transition-opacity ${speed} ease-out`}
                            style={{ opacity: tint ? 1 : 0, transform: depth(24), isolation: 'isolate' }}
                            aria-hidden
                        >
                            <img
                                src={BRAIN_SRC}
                                alt=""
                                width={FRAME_W}
                                height={FRAME_H}
                                draggable={false}
                                className="block w-full h-auto select-none"
                                style={{ filter: 'grayscale(1) brightness(1.06)' }}
                            />
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: tint ?? 'transparent',
                                    mixBlendMode: 'color',
                                    // Half strength: the full colour overpowered the paper's
                                    // shading; at 50% the hue reads and the facets still do.
                                    opacity: 0.5,
                                    WebkitMaskImage: `url(${BRAIN_SRC})`,
                                    maskImage: `url(${BRAIN_SRC})`,
                                    WebkitMaskSize: '100% 100%',
                                    maskSize: '100% 100%',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                }}
                            />
                        </div>

                        {/* The level line. */}
                        <div
                            className={`absolute left-[4%] right-[2%] flex items-center pointer-events-none transition-[top,opacity] ${speed} ease-out`}
                            style={{
                                top: `${clipTop.toFixed(2)}%`,
                                opacity: tint ? 0 : 1,
                                transform: `translateY(-50%) ${depth(30) ?? ''}`,
                            }}
                            aria-hidden
                        >
                            <span className="h-[3px] flex-1 rounded-full bg-[#F5F4EE]" />
                            <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 -ml-px" aria-hidden>
                                <path d="M16 0 L0 8 L16 16 Z" fill="#F5F4EE" />
                            </svg>
                            <span className={`ml-2 font-lyrics text-[20px] leading-none tabular-nums ${goal ? 'text-[#E8CC8C]' : 'text-[#D6C9AE]'}`}>
                                {percent}%
                            </span>
                        </div>

                        {/* Sparks: mounted only while a burst is playing. */}
                        {burst > 0 && (
                            <div className="absolute inset-0 pointer-events-none" aria-hidden key={burst}>
                                {SPARKS.map((s, i) => (
                                    <svg
                                        key={i}
                                        className="absolute mind-power-plus"
                                        style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
                                        viewBox="0 0 10 10"
                                    >
                                        <rect x="4" y="0" width="2" height="10" fill={sparkColor} />
                                        <rect x="0" y="4" width="10" height="2" fill={sparkColor} />
                                    </svg>
                                ))}
                            </div>
                        )}

                        {/* Hotspots, in the render's frame. A transparent fill still receives
                            the pointer; `none` would not. */}
                        <svg
                            viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
                            className="absolute inset-0 w-full h-full"
                            style={{ transform: depth(25) }}
                            aria-hidden
                        >
                            <g>
                                {REGION_POLYGONS.map(({ region, points }) => (
                                    <polygon
                                        key={region}
                                        data-region={region}
                                        points={points}
                                        fill="transparent"
                                        className="cursor-pointer"
                                        onMouseEnter={() => select(region)}
                                        onClick={() => toggle(region)}
                                    />
                                ))}
                            </g>
                        </svg>

                        {/* Markers. Below lg, a dot on every region shows where it is and is
                            the thing to tap; the active one takes its region's colour. From lg
                            up, the callouts and leader lines do that work, so only the region
                            being pointed at gets a dot — white, marking the spot on the brain
                            the line is talking about — and it never catches the pointer. */}
                        <div className="absolute inset-0 pointer-events-none" style={{ transform: depth(26) }}>
                            {REGION_ORDER.map(region => {
                                const [fx, fy] = REGION_MARKERS[region];
                                const isActive = active === region;
                                const color = REGION_COLORS[region];
                                const shown = large ? isActive : true;
                                const tinted = isActive && !large;
                                return (
                                    <button
                                        key={region}
                                        type="button"
                                        data-marker={region}
                                        data-shown={shown || undefined}
                                        onClick={() => toggle(region)}
                                        aria-label={t(`progress.regions.${region}.title`)}
                                        aria-pressed={isActive}
                                        aria-hidden={!shown}
                                        tabIndex={shown && !large ? 0 : -1}
                                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-opacity duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] ${
                                            large ? 'pointer-events-none' : 'pointer-events-auto'
                                        } ${shown ? 'opacity-100' : 'opacity-0'}`}
                                        style={{ left: `${(fx / FRAME_W) * 100}%`, top: `${(fy / FRAME_H) * 100}%` }}
                                    >
                                        <span
                                            className="block rounded-full transition-[transform,background-color,box-shadow] duration-300 ease-out"
                                            style={{
                                                width: 11,
                                                height: 11,
                                                backgroundColor: tinted ? color : 'rgba(255,255,255,0.94)',
                                                boxShadow: tinted
                                                    ? `0 0 0 6px ${color}55, 0 1px 4px rgba(0,0,0,0.5)`
                                                    : isActive
                                                      ? '0 0 0 6px rgba(255,255,255,0.28), 0 1px 4px rgba(0,0,0,0.5)'
                                                      : '0 0 0 4px rgba(255,255,255,0.22), 0 1px 4px rgba(0,0,0,0.5)',
                                                transform: isActive ? 'scale(1.25)' : 'scale(1)',
                                            }}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>

                {/* Right column of callouts. */}
                <div className="hidden lg:flex flex-col justify-between gap-10 min-h-[440px] py-2">
                    {right.map(region => (
                        <Callout
                            key={region}
                            region={region}
                            side="right"
                            active={active === region}
                            titleRef={setTitleRef(region)}
                            onEnter={() => select(region)}
                            onClick={() => toggle(region)}
                            t={t}
                        />
                    ))}
                </div>

                {/* Leader lines, over the whole stage. */}
                {stageSize.w > 0 && (
                    <svg
                        className="absolute inset-0 z-0 hidden lg:block pointer-events-none"
                        width={stageSize.w}
                        height={stageSize.h}
                        viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
                        aria-hidden
                    >
                        {REGION_ORDER.map(region => {
                            const points = lines[region];
                            if (!points) return null;
                            const isActive = active === region;
                            return (
                                <polyline
                                    key={region}
                                    data-line={region}
                                    points={points}
                                    fill="none"
                                    stroke={isActive ? REGION_COLORS[region] : 'rgba(255,255,255,0.28)'}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    className="transition-[stroke,stroke-width] duration-300 ease-out"
                                />
                            );
                        })}
                    </svg>
                )}
            </div>

            {/* Below lg: the callouts as a horizontal carousel, the active one lit
                and brought to the middle. Bleeds to the page edge so the next card
                peeks in from the side. */}
            <div
                ref={trackRef}
                onScroll={handleTrackScroll}
                data-carousel
                className="lg:hidden mind-power-carousel -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 sm:-mx-6 sm:px-6"
            >
                {REGION_ORDER.map(region => (
                    <div
                        key={region}
                        ref={setCardRef(region)}
                        data-card={region}
                        className="w-[84%] max-w-[340px] shrink-0 snap-center"
                    >
                        <Callout
                            region={region}
                            side="stack"
                            active={active === region}
                            onEnter={() => undefined}
                            onClick={() => toggle(region)}
                            t={t}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

interface CalloutProps {
    region: RegionKey;
    side: 'left' | 'right' | 'stack';
    active: boolean;
    onEnter: () => void;
    onClick: () => void;
    t: (key: string) => string;
    titleRef?: (el: HTMLElement | null) => void;
}

/**
 * One callout: the anatomical name as a small, light sans eyebrow, the
 * function beneath it as the serif headline, then the description. Grey at
 * rest, in its region's colour when that region is the one pointed at. The
 * headline is what the leader line is measured from.
 */
function Callout({ region, side, active, onEnter, onClick, t, titleRef }: CalloutProps) {
    const base = `progress.regions.${region}`;
    const isStack = side === 'stack';
    const color = REGION_COLORS[region];

    return (
        <button
            type="button"
            onMouseEnter={onEnter}
            onClick={onClick}
            aria-pressed={active}
            className={`group flex flex-col gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86BE7F] ${
                side === 'left' ? 'items-end text-right' : 'items-start text-left'
            } ${isStack ? 'h-full w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4' : 'max-w-[300px]'}`}
        >
            <span className={`flex flex-col gap-0.5 ${side === 'left' ? 'items-end' : 'items-start'}`}>
                <span
                    className={`font-sans font-light leading-tight transition-colors duration-300 ${
                        isStack ? 'text-[13px]' : 'text-[14px]'
                    } ${active ? '' : 'text-stone-500 group-hover:text-stone-400'}`}
                    style={active ? { color, opacity: 0.85 } : undefined}
                >
                    {t(`${base}.title`)}
                </span>
                <span
                    ref={titleRef}
                    className={`font-lyrics font-normal leading-[1.1] transition-colors duration-300 ${
                        isStack ? 'text-[21px]' : 'text-[26px]'
                    } ${active ? '' : 'text-stone-400 group-hover:text-stone-300'}`}
                    style={active ? { color } : undefined}
                >
                    {t(`${base}.sub`)}
                </span>
            </span>
            <span
                className={`block text-[12.5px] leading-relaxed transition-colors duration-300 ${active ? '' : 'text-stone-500'}`}
                style={active ? { color } : undefined}
            >
                {t(`${base}.desc`)}
            </span>
        </button>
    );
}
