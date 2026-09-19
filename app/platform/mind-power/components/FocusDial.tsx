"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from 'framer-motion';
import { formatFocusTime } from '@/lib/focusTimer';

/**
 * The focus timer's face: a sixty-minute dial. Around the outside, the minutes
 * of an hour with a tick for each and a numeral every five; inside that, a
 * thick arc that runs clockwise from the top to however many minutes are left;
 * in the middle, a darker face with its own ring of ticks, a hand at the same
 * minute, and the time in figures. Green while it counts, gold once it has run
 * to zero, since finishing a session is a healthy day in Mind Power.
 *
 * Before a session starts the arc is the control: drag its end around the ring
 * (or use the arrow keys with the dial focused) and the length follows, a
 * minute at a time. Once the clock is running the ring is read-only, for the
 * same reason the preset buttons hide then — changing the length mid-session
 * would throw away the time already put in.
 *
 * Drawn to a 320-unit square and scaled by CSS. Only the arc, the hand, the
 * knob and the figures change from second to second; the rest is plain markup.
 */

const CENTER = 160;
const DISC_R = 152;
const ARC_R = 98;
const ARC_WIDTH = 26;
const FACE_R = 76;
const HOUR_SECONDS = 60 * 60;
const CIRCUMFERENCE = 2 * Math.PI * ARC_R;
/** How far from the centre a press counts as taking hold of the ring, in dial units. */
const GRIP_INNER = FACE_R;
const GRIP_OUTER = DISC_R;

const polar = (r: number, degrees: number) => {
    const rad = ((degrees - 90) * Math.PI) / 180;
    return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
};

interface FocusDialProps {
    remainingSeconds: number;
    isRunning: boolean;
    isComplete: boolean;
    /** When set, the ring can be dragged (and the dial keyed) to choose the length in minutes. */
    onSetMinutes?: (minutes: number) => void;
    className?: string;
}

export default function FocusDial({ remainingSeconds, isRunning, isComplete, onSetMinutes, className = '' }: FocusDialProps) {
    const reducedMotion = useReducedMotion();
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState(false);
    // The minute last chosen by hand, to tell 0 from 60 at the top of the dial.
    const lastMinutesRef = useRef(Math.round(remainingSeconds / 60));

    const interactive = !!onSetMinutes;
    // A full ring when done, otherwise the minutes left, on an hour's face.
    const fraction = isComplete ? 1 : Math.min(1, Math.max(0, remainingSeconds / HOUR_SECONDS));
    const degrees = fraction * 360;
    const handFrom = polar(50, degrees);
    const handTo = polar(66, degrees);
    const knob = polar(ARC_R, degrees);
    // The arc glides between seconds while running; a reset, a new length or a
    // drag snaps, so the ring never appears to move on its own.
    const glide = isRunning && !reducedMotion && !dragging;

    /** Where a pointer sits on the dial: its distance from the centre and its minute. */
    const locate = useCallback((e: { clientX: number; clientY: number }) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const scale = 320 / rect.width;
        const x = (e.clientX - rect.left) * scale - CENTER;
        const y = (e.clientY - rect.top) * scale - CENTER;
        const distance = Math.hypot(x, y);
        const angle = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
        return { distance, angle };
    }, []);

    const choose = useCallback(
        (angle: number) => {
            if (!onSetMinutes) return;
            let minutes = Math.round(angle / 6);
            // The top of the dial is both 0 and 60: coming round from the high
            // side it is the full hour, from the low side it is the first minute.
            if (minutes === 0 || minutes === 60) minutes = lastMinutesRef.current > 30 ? 60 : 1;
            if (minutes !== lastMinutesRef.current) {
                lastMinutesRef.current = minutes;
                onSetMinutes(minutes);
            }
        },
        [onSetMinutes],
    );

    const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
        if (!interactive) return;
        const at = locate(e);
        if (!at || at.distance < GRIP_INNER || at.distance > GRIP_OUTER) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // A pointer the browser does not know (a synthetic event); the drag still works while over the dial.
        }
        setDragging(true);
        choose(at.angle);
    };
    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        if (!dragging) return;
        const at = locate(e);
        if (at) choose(at.angle);
    };
    const endDrag = (e: PointerEvent<SVGSVGElement>) => {
        if (!dragging) return;
        setDragging(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
        if (!onSetMinutes) return;
        const current = Math.max(1, Math.round(remainingSeconds / 60));
        const step: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 };
        let next: number | null = null;
        if (e.key in step) next = current + step[e.key];
        else if (e.key === 'Home') next = 1;
        else if (e.key === 'End') next = 60;
        if (next === null) return;
        e.preventDefault();
        next = Math.min(60, Math.max(1, next));
        lastMinutesRef.current = next;
        onSetMinutes(next);
    };

    const outerTicks = Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        return { i, major, a: polar(major ? 114 : 120, i * 6), b: polar(130, i * 6) };
    });
    const innerTicks = Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        return { i, major, a: polar(major ? 60 : 63, i * 6), b: polar(68, i * 6) };
    });

    const time = formatFocusTime(remainingSeconds);
    const minutesNow = Math.round(remainingSeconds / 60);

    return (
        <svg
            ref={svgRef}
            viewBox="0 0 320 320"
            // The disc's shadow falls outside the drawing; do not clip it.
            overflow="visible"
            className={`${className} select-none ${interactive ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            style={{ touchAction: interactive ? 'none' : undefined }}
            role={interactive ? 'slider' : 'img'}
            aria-label={time}
            aria-valuemin={interactive ? 1 : undefined}
            aria-valuemax={interactive ? 60 : undefined}
            aria-valuenow={interactive ? minutesNow : undefined}
            aria-valuetext={interactive ? time : undefined}
            tabIndex={interactive ? 0 : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
            data-focus-dial
            data-fraction={fraction.toFixed(3)}
            data-interactive={interactive || undefined}
        >
            <defs>
                <linearGradient id="focus-dial-green" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6FAE68" />
                    <stop offset="100%" stopColor="#A9DE9F" />
                </linearGradient>
                <linearGradient id="focus-dial-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#C5A059" />
                    <stop offset="100%" stopColor="#F1D066" />
                </linearGradient>
                <filter id="focus-dial-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.45" />
                </filter>
                <filter id="focus-dial-inset" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
                </filter>
                <filter id="focus-dial-knob" x="-60%" y="-60%" width="220%" height="220%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                </filter>
            </defs>

            {/* The disc, lifted off the card. */}
            <circle cx={CENTER} cy={CENTER} r={DISC_R} fill="#333333" filter="url(#focus-dial-shadow)" />

            {/* The hour around the edge. */}
            {outerTicks.map(tick => (
                <line
                    key={tick.i}
                    x1={tick.a.x}
                    y1={tick.a.y}
                    x2={tick.b.x}
                    y2={tick.b.y}
                    stroke={tick.major ? '#B8B6AE' : '#6B6A66'}
                    strokeWidth={tick.major ? 3 : 2}
                    strokeLinecap="round"
                />
            ))}
            {outerTicks
                .filter(tick => tick.major)
                .map(tick => {
                    const p = polar(141, tick.i * 6);
                    return (
                        <text
                            key={`n${tick.i}`}
                            x={p.x}
                            y={p.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="12"
                            fill="#9A9893"
                            className="font-sans tabular-nums"
                        >
                            {tick.i}
                        </text>
                    );
                })}

            {/* The track the arc runs on, then the arc itself. */}
            <circle cx={CENTER} cy={CENTER} r={ARC_R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={ARC_WIDTH} />
            <circle
                cx={CENTER}
                cy={CENTER}
                r={ARC_R}
                fill="none"
                stroke={isComplete ? 'url(#focus-dial-gold)' : 'url(#focus-dial-green)'}
                strokeWidth={ARC_WIDTH}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                style={{ transition: glide ? 'stroke-dashoffset 1s linear' : 'none' }}
                data-focus-arc
            />

            {/* The face, sunk into the ring. */}
            <circle cx={CENTER} cy={CENTER} r={FACE_R} fill="#1E1E1E" filter="url(#focus-dial-inset)" />
            {innerTicks.map(tick => (
                <line
                    key={`i${tick.i}`}
                    x1={tick.a.x}
                    y1={tick.a.y}
                    x2={tick.b.x}
                    y2={tick.b.y}
                    stroke={tick.major ? '#8E8C86' : '#4E4D4A'}
                    strokeWidth={tick.major ? 2.5 : 1.5}
                    strokeLinecap="round"
                />
            ))}

            {/* The hand: a heavy mark at the same minute as the arc's end. */}
            <line
                x1={handFrom.x}
                y1={handFrom.y}
                x2={handTo.x}
                y2={handTo.y}
                stroke="#F5F4EE"
                strokeWidth={6}
                strokeLinecap="round"
                style={{ transition: glide ? 'x1 1s linear, y1 1s linear, x2 1s linear, y2 1s linear' : 'none' }}
                data-focus-hand
            />

            <text
                x={CENTER}
                y={CENTER + 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="40"
                fontWeight={300}
                fill={isComplete ? '#F1D066' : '#F5F4EE'}
                className="font-lyrics tabular-nums"
                style={{ letterSpacing: '-0.02em' }}
            >
                {time}
            </text>

            {/* The grip at the arc's end, only while the ring can be dragged. */}
            {interactive && (
                <circle
                    cx={knob.x}
                    cy={knob.y}
                    r={dragging ? 11 : 9}
                    fill="#F5F4EE"
                    stroke="#2B2B2B"
                    strokeWidth={3}
                    filter="url(#focus-dial-knob)"
                    style={{ transition: 'r 120ms ease-out' }}
                    data-focus-knob
                />
            )}
        </svg>
    );
}
