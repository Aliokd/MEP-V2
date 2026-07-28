"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Heart, Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// The six screens that run before the quiz. Titles are looked up under
// `onboarding.intro.slides.<id>` in the locale files. `image` stays null until
// the real artwork lands — point it at a path under /public and the stand-in
// art is swapped out automatically.
// The hover callback is a vestige of the interactive shapes slide — nothing
// consumes it today, but the prop stays on the type so a future slide can wire
// it back up without touching every Art component's signature.
type ArtProps = { onBubbleHover?: (key: string | null) => void };

type IntroSlide = {
    id: string;
    image: string | null;
    Art: ComponentType<ArtProps>;
};

// --- Stand-in artwork -------------------------------------------------------
// Deliberately text-free skeletons that echo the composition of each mockup.
// They exist so the flow reads correctly before the assets arrive.

const Panel = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
    <div className={`rounded-2xl bg-white border border-stone-200/70 shadow-[0_6px_20px_rgba(0,0,0,0.03)] ${className}`}>
        {children}
    </div>
);

const Bar = ({ w = 'w-full', tone = 'bg-stone-200' }: { w?: string; tone?: string }) => (
    <div className={`h-2 rounded-full ${w} ${tone}`} />
);

const PsychologyArt = () => (
    <div className="relative h-full w-full">
        <svg viewBox="0 0 340 180" preserveAspectRatio="none" className="h-full w-full" fill="none">
            <path d="M16 28 C 92 32, 122 122, 324 152" stroke="#363636" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <Panel className="absolute right-1 top-3 w-[44%] space-y-2 p-3">
            <Bar w="w-2/3" tone="bg-stone-300" />
            <Bar w="w-full" />
            <Bar w="w-5/6" />
            <Bar w="w-1/2" />
        </Panel>
    </div>
);

// The "modern way" composition, exactly as designed — with live labels. The
// scene ships as one SVG exported from the design file: the seven shapes at
// their exact designed spots, plus the design's outlined label paths. At
// runtime each outlined label is swapped for real text at the same position,
// size, tilt and alignment, so the copy comes from the locale files and
// translates like everything else while still sitting in the design's own
// composition. The entrance is the only motion: each shape drops in from above
// the frame onto its spot under a critically-damped spring, bottom-most first,
// then everything rests. No physics, no collisions, no hover.
const MODERN_WAY_SCENE_SRC = '/onboarding-cards/modern-way-scene.svg';
// Same spring the drop has always used: omega² and a damping ratio just under
// critical, so each shape eases in with the faintest settle instead of a bounce.
const SCENE_SPRING_K = 42;
const SCENE_DAMPING = 2 * Math.sqrt(SCENE_SPRING_K) * 0.92;
const SCENE_STAGGER_MS = 110;

// Where each live label sits, in the scene's own 901×646 design px — measured
// off the outlined type it replaces (first glyph's stem gives position, tilt
// and cap height; line pitch gives the leading), so the text lands where the
// design put it. Order matches the scene file's document order. The tilt is
// the shape's own rotation — except `see_life`, whose label is tilted +24.3°
// inside an unrotated shape, straight from its baked glyphs. Line breaks live
// in the locale strings: where a line wraps inside an irregular shape is
// per-language copy, not layout.
const SCENE_LABELS: Array<{
    key: string;
    x: number;
    y: number;
    rotateDeg: number;
    fontPx: number;
    linePx: number;
}> = [
    { key: 'master_lyrics', x: 50, y: 325, rotateDeg: 5, fontPx: 36, linePx: 39 },
    { key: 'tell_stories', x: 328, y: 501, rotateDeg: 0, fontPx: 31, linePx: 34.5 },
    { key: 'unlocked_creativity', x: 493, y: 466, rotateDeg: -7.18, fontPx: 33, linePx: 35 },
    { key: 'expanded_skills', x: 296, y: 331, rotateDeg: 0, fontPx: 38, linePx: 48 },
    { key: 'deeper_expertise', x: 27, y: 539, rotateDeg: -5.5, fontPx: 32, linePx: 34 },
    { key: 'ignite_imagination', x: 693, y: 503, rotateDeg: 0, fontPx: 34, linePx: 36 },
    { key: 'see_life', x: 694, y: 276, rotateDeg: 24.3, fontPx: 38, linePx: 43 },
];

const ModernWayArt = () => {
    const prefersReducedMotion = useReducedMotion();
    const { t } = useLanguage();
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        let cancelled = false;
        let rafId = 0;

        (async () => {
            const markup = await fetch(MODERN_WAY_SCENE_SRC).then((r) => r.text());
            if (cancelled || !host.isConnected) return;

            const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
            const svg = document.importNode(parsed, true) as unknown as SVGSVGElement;
            // The file's fixed px size becomes "fill the slide". Overflow must
            // stay visible so a shape mid-drop — above the viewBox — still
            // draws; the slide frame's own rounded overflow-hidden is what
            // clips the drop at the top edge.
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.setAttribute('overflow', 'visible');
            svg.setAttribute('aria-hidden', 'true');
            svg.style.width = '100%';
            svg.style.height = '100%';

            // The export strictly alternates shape, then that shape's outlined
            // label. Wrap each pair in a <g>, drop the outlined label, and set
            // the live text in its place — a foreignObject scales and rotates
            // with the scene, so the label keeps its designed size and tilt at
            // any frame width while the string itself stays translatable.
            const flat = Array.from(svg.children);
            const shapes: SVGGElement[] = [];
            for (let i = 0; i < flat.length; i += 2) {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                svg.insertBefore(g, flat[i]);
                g.appendChild(flat[i]);
                flat[i + 1]?.remove();

                const spec = SCENE_LABELS[i / 2];
                if (spec) {
                    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
                    // Generous fixed box; the div inside only fills what the
                    // text needs and everything else stays transparent.
                    fo.setAttribute('width', '420');
                    fo.setAttribute('height', '320');
                    fo.setAttribute('overflow', 'visible');
                    fo.setAttribute('transform', `translate(${spec.x} ${spec.y}) rotate(${spec.rotateDeg})`);

                    const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
                    div.className = 'font-sans';
                    div.style.fontSize = `${spec.fontPx}px`;
                    div.style.lineHeight = `${spec.linePx}px`;
                    div.style.fontWeight = '500';
                    div.style.color = '#000';
                    div.style.textAlign = 'left';
                    // The locale string's own newlines are the line breaks.
                    div.style.whiteSpace = 'pre-line';
                    div.textContent = t(`onboarding.intro.slides.modern_way.labels.${spec.key}`);
                    fo.appendChild(div);
                    g.appendChild(fo);
                }
                shapes.push(g);
            }

            // replaceChildren keeps a StrictMode double-mount from stacking two
            // copies of the scene.
            host.replaceChildren(svg);

            if (prefersReducedMotion) return; // already at rest as parsed

            // Bottom of the pile first, so the scene visibly builds upward
            // rather than arriving all at once. getBBox needs the node in the
            // document, hence measuring after the host adopts the svg. Each
            // drop distance clears the shape's own bottom edge past the frame
            // top, so every shape starts fully out of sight.
            const bodies = shapes
                .map((g) => {
                    const box = g.getBBox();
                    return { g, bottom: box.y + box.height };
                })
                .sort((a, b) => b.bottom - a.bottom)
                .map((b, rank) => ({
                    g: b.g,
                    delay: rank * SCENE_STAGGER_MS,
                    y: -(b.bottom + 24),
                    vy: 0,
                    done: false,
                }));

            for (const b of bodies) b.g.setAttribute('transform', `translate(0 ${b.y})`);

            let last = performance.now();
            const startAt = last;

            const tick = (now: number) => {
                // Clamped so a backgrounded tab resuming on a huge delta can't
                // integrate one enormous step and overshoot.
                const dt = Math.min((now - last) / 1000, 1 / 30);
                last = now;
                const elapsed = now - startAt;

                let allDone = true;
                for (const b of bodies) {
                    if (b.done) continue;
                    if (elapsed < b.delay) {
                        allDone = false;
                        continue;
                    }
                    b.vy += (SCENE_SPRING_K * -b.y - SCENE_DAMPING * b.vy) * dt;
                    b.y += b.vy * dt;
                    if (Math.abs(b.y) < 0.4 && Math.abs(b.vy) < 0.6) {
                        b.y = 0;
                        b.vy = 0;
                        b.done = true;
                    } else {
                        allDone = false;
                    }
                    b.g.setAttribute('transform', `translate(0 ${b.y})`);
                }

                if (!allDone) rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        })().catch(() => {
            // A failed fetch leaves the box empty; the slide's headline still
            // stands on its own, and the next navigation retries from scratch.
        });

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
        };
        // `t` re-runs this on a language switch: the scene rebuilds with the
        // new strings and replays its drop, same as the typing demo restarting.
    }, [prefersReducedMotion, t]);

    return <div ref={hostRef} className="relative h-full w-full overflow-hidden" />;
};

// --- "All the tools you need" slide -----------------------------------------
// A self-running miniature of the real create canvas. It opens on the thing a
// new project actually opens on: one empty white canvas sheet in the middle of
// the slide, caret blinking, with the canvas's own toolbar already docked
// underneath it. Nothing arrives later — the tools are the slide's promise, so
// they are on screen from the first frame and never move. What moves is the
// work: the project title and the lyric lines type themselves in, REC lights up
// mid-verse, and the recording it makes docks *between* two lines (cards live
// inside the lyric flow, not beside it) before the last line is written under
// it.
//
// Everything is laid out at the canvas's true pixel sizes — the sheet's own
// 32px radius and header rule, 30px lyric lines, a 54px toolbar, a 42px
// capsule — on a fixed DEMO_W × DEMO_H surface that is then scaled to whatever
// width the slide gives it. So this is not a redrawn approximation of the
// product; it is the product's own geometry, shrunk. The three toolbar glyphs
// below are the exact paths used in app/platform/create/page.tsx, for the same
// reason.
//
// The sheet is deliberately narrower than the surface: the real canvas is a
// centred column of paper on the workspace background, and letting the demo run
// full-bleed lost that — the lyrics read as text on a slide rather than text on
// a canvas.
const DEMO_W = 880;
const DEMO_H = 520;
const CANVAS_W = 620;

const ToolsCameraIcon = () => (
    <svg width="22" height="22" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M31.4959 9.28033H24.4654V7.87423C24.4654 7.05381 24.1395 6.26699 23.5594 5.68686C22.9793 5.10673 22.1924 4.78082 21.372 4.78082H14.6228C13.8023 4.78082 13.0155 5.10673 12.4354 5.68686C11.8553 6.26699 11.5293 7.05381 11.5293 7.87423V9.28033H4.49886C3.97677 9.28033 3.47607 9.48772 3.1069 9.8569C2.73772 10.2261 2.53033 10.7268 2.53033 11.2489V26.9971C2.53033 27.5192 2.73772 28.0199 3.1069 28.3891C3.47607 28.7583 3.97677 28.9657 4.49886 28.9657H31.4959C32.018 28.9657 32.5187 28.7583 32.8879 28.3891C33.257 28.0199 33.4644 27.5192 33.4644 26.9971V11.2489C33.4644 10.7268 33.257 10.2261 32.8879 9.8569C32.5187 9.48772 32.018 9.28033 31.4959 9.28033ZM13.2167 7.87423C13.2167 7.50131 13.3648 7.14366 13.6285 6.87997C13.8922 6.61628 14.2498 6.46813 14.6228 6.46813H21.372C21.7449 6.46813 22.1026 6.61628 22.3663 6.87997C22.63 7.14366 22.7781 7.50131 22.7781 7.87423V9.28033H13.2167V7.87423ZM4.49886 10.9676H31.4959C31.5705 10.9676 31.642 10.9973 31.6948 11.05C31.7475 11.1027 31.7771 11.1743 31.7771 11.2489V16.0296H26.7152V14.6235C26.7152 14.3997 26.6263 14.1852 26.4681 14.0269C26.3099 13.8687 26.0953 13.7798 25.8715 13.7798C25.6478 13.7798 25.4332 13.8687 25.275 14.0269C25.1167 14.1852 25.0279 14.3997 25.0279 14.6235V16.0296H10.9669V14.6235C10.9669 14.3997 10.878 14.1852 10.7198 14.0269C10.5616 13.8687 10.347 13.7798 10.1232 13.7798C9.89949 13.7798 9.68491 13.8687 9.52669 14.0269C9.36847 14.1852 9.27959 14.3997 9.27959 14.6235V16.0296H4.21764V11.2489C4.21764 11.1743 4.24727 11.1027 4.30001 11.05C4.35275 10.9973 4.42428 10.9676 4.49886 10.9676ZM31.4959 27.2784H4.49886C4.42428 27.2784 4.35275 27.2487 4.30001 27.196C4.24727 27.1432 4.21764 27.0717 4.21764 26.9971V17.7169H9.27959V19.123C9.27959 19.3468 9.36847 19.5613 9.52669 19.7196C9.68491 19.8778 9.89949 19.9667 10.1232 19.9667C10.347 19.9667 10.5616 19.8778 10.7198 19.7196C10.878 19.5613 10.9669 19.3468 10.9669 19.123V17.7169H25.0279V19.123C25.0279 19.3468 25.1167 19.5613 25.275 19.7196C25.4332 19.8778 25.6478 19.9667 25.8715 19.9667C26.0953 19.9667 26.3099 19.8778 26.4681 19.7196C26.6263 19.5613 26.7152 19.3468 26.7152 19.123V17.7169H31.7771V26.9971C31.7771 27.0717 31.7475 27.1432 31.6948 27.196C31.642 27.2487 31.5705 27.2784 31.4959 27.2784Z" fill="#4B4B4B" />
    </svg>
);

const DemoStudioIcon = () => (
    <svg width="22" height="22" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M29.7667 2.70959C29.6655 2.63067 29.5477 2.57585 29.4222 2.54929C29.2968 2.52272 29.1669 2.52513 29.0424 2.55631L11.0424 7.05631C10.86 7.10207 10.6981 7.20746 10.5825 7.35574C10.4668 7.50402 10.404 7.68669 10.404 7.87475V23.9215C9.57323 23.2164 8.52657 22.8163 7.43734 22.7873C6.34811 22.7584 5.28167 23.1023 4.41461 23.7622C3.54755 24.4221 2.93189 25.3584 2.6696 26.4159C2.4073 27.4735 2.5141 28.5889 2.97231 29.5775C3.43052 30.5661 4.21264 31.3685 5.18917 31.8519C6.16569 32.3353 7.27803 32.4706 8.34197 32.2355C9.40591 32.0004 10.3576 31.4089 11.0395 30.559C11.7214 29.7091 12.0926 28.6519 12.0915 27.5622V15.2829L28.404 11.2047V19.4215C27.5732 18.7164 26.5266 18.3163 25.4373 18.2873C24.3481 18.2584 23.2817 18.6023 22.4146 19.2622C21.5475 19.9221 20.9319 20.8584 20.6696 21.9159C20.4073 22.9735 20.5141 24.0889 20.9723 25.0775C21.4305 26.0661 22.2126 26.8685 23.1892 27.3519C24.1657 27.8353 25.278 27.9706 26.342 27.7355C27.4059 27.5004 28.3576 26.9089 29.0395 26.059C29.7214 25.2091 30.0926 24.1519 30.0915 23.0622V3.37475C30.0915 3.24648 30.0622 3.1199 30.0059 3.00464C29.9496 2.88938 29.8678 2.78848 29.7667 2.70959ZM7.31024 30.656C6.69836 30.656 6.10021 30.4745 5.59145 30.1346C5.08268 29.7947 4.68615 29.3115 4.45199 28.7462C4.21783 28.1809 4.15657 27.5588 4.27594 26.9587C4.39531 26.3586 4.68996 25.8073 5.12263 25.3746C5.5553 24.942 6.10655 24.6473 6.70668 24.5279C7.30681 24.4086 7.92886 24.4698 8.49417 24.704C9.05948 24.9382 9.54266 25.3347 9.8826 25.8434C10.2225 26.3522 10.404 26.9504 10.404 27.5622C10.404 28.3828 10.078 29.1697 9.49786 29.7499C8.91766 30.33 8.13076 30.656 7.31024 30.656ZM12.0915 13.5447V8.53287L28.404 4.45475V9.46662L12.0915 13.5447ZM25.3102 26.156C24.6984 26.156 24.1002 25.9745 23.5914 25.6346C23.0827 25.2947 22.6862 24.8115 22.452 24.2462C22.2178 23.6809 22.1566 23.0588 22.2759 22.4587C22.3953 21.8586 22.69 21.3073 23.1226 20.8746C23.5553 20.442 24.1066 20.1473 24.7067 20.0279C25.3068 19.9086 25.9289 19.9698 26.4942 20.204C27.0595 20.4382 27.5427 20.8347 27.8826 21.3434C28.2225 21.8522 28.404 22.4504 28.404 23.0622C28.404 23.8828 28.078 24.6697 27.4979 25.2499C26.9177 25.83 26.1308 26.156 25.3102 26.156Z" fill="#4B4B4B" />
    </svg>
);

const InspirationsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 35 35" fill="none" aria-hidden="true">
        <path d="M23.7892 9.29688C23.7892 9.56728 23.7091 9.83161 23.5588 10.0564C23.4086 10.2813 23.1951 10.4565 22.9452 10.56C22.6954 10.6635 22.4205 10.6905 22.1553 10.6378C21.8901 10.585 21.6465 10.4548 21.4553 10.2636C21.2641 10.0724 21.1339 9.82881 21.0811 9.5636C21.0284 9.29839 21.0555 9.0235 21.1589 8.77368C21.2624 8.52385 21.4376 8.31033 21.6625 8.1601C21.8873 8.00987 22.1516 7.92969 22.422 7.92969C22.7846 7.92969 23.1324 8.07373 23.3888 8.33013C23.6452 8.58653 23.7892 8.93427 23.7892 9.29688ZM32.5392 10.9375C32.5394 11.0727 32.5062 11.2059 32.4425 11.3251C32.3788 11.4444 32.2867 11.5461 32.1742 11.6211L29.258 13.5639V16.4062C29.2536 20.1034 27.783 23.648 25.1687 26.2623C22.5544 28.8766 19.0099 30.3472 15.3127 30.3516H3.28142C2.9208 30.3516 2.5675 30.2498 2.26223 30.0578C1.95697 29.8658 1.71214 29.5914 1.55598 29.2664C1.39981 28.9413 1.33864 28.5788 1.37953 28.2205C1.42042 27.8622 1.5617 27.5227 1.78709 27.2412L1.79666 27.2289L13.3986 13.3096V10.5123C13.3986 6.09356 16.9383 2.48145 21.29 2.46094H21.3283C23.0291 2.46042 24.685 3.00676 26.0515 4.0193C27.4181 5.03184 28.4229 6.45692 28.9176 8.08418L32.1742 10.2539C32.2867 10.3289 32.3788 10.4306 32.4425 10.5499C32.5062 10.6691 32.5394 10.8023 32.5392 10.9375ZM30.2396 10.9375L27.7541 9.28047C27.5865 9.16886 27.4658 8.99952 27.415 8.80469C27.064 7.45768 26.276 6.26519 25.1745 5.41409C24.073 4.56298 22.7203 4.10136 21.3283 4.10156H21.2969C17.8461 4.11797 15.0392 6.99453 15.0392 10.5123V13.6062C15.0395 13.7986 14.9723 13.9849 14.8492 14.1326L3.06677 28.2707C3.03572 28.311 3.01655 28.3592 3.0114 28.4099C3.00626 28.4605 3.01535 28.5116 3.03766 28.5573C3.05997 28.6031 3.09461 28.6417 3.13767 28.6688C3.18074 28.696 3.23052 28.7106 3.28142 28.7109H7.09041L16.8699 16.975C17.0097 16.8098 17.2092 16.7066 17.4248 16.6878C17.6404 16.669 17.8547 16.7362 18.021 16.8747C18.1873 17.0133 18.2921 17.2119 18.3126 17.4273C18.3331 17.6428 18.2676 17.8576 18.1304 18.025L9.22595 28.7109H15.3127C18.575 28.7073 21.7026 27.4098 24.0094 25.103C26.3162 22.7962 27.6137 19.6685 27.6174 16.4062V13.125C27.6172 12.9898 27.6504 12.8566 27.7141 12.7374C27.7778 12.6181 27.8699 12.5164 27.9824 12.4414L30.2396 10.9375Z" fill="#4B4B4B" />
    </svg>
);

// The capsule's resting waveform. Same voice-shaped fallback curve the real
// player draws before its peaks are decoded, so the bars read as a recording
// rather than as decoration.
const WAVE_BARS = 40;
const WAVE_PEAKS = Array.from({ length: WAVE_BARS }, (_, i) => {
    const wave = 0.35 * Math.sin(i * 0.15) + 0.45 * Math.sin(i * 0.35) + 0.2 * Math.sin(i * 0.8);
    const distFromCenter = Math.abs(i - (WAVE_BARS - 1) / 2);
    const scaling = Math.max(0.1, 1 - (distFromCenter / ((WAVE_BARS - 1) / 2)) * 0.85);
    return Math.max(0.12, (0.2 + Math.abs(wave) * 0.8) * scaling);
});

// Demo timing, all in ms. Per-character rates rather than fixed durations, so
// the pacing stays even in every language — the Norwegian and Swedish lines
// aren't the same length as the English ones.
//
// Deliberately slow — around a sixth of a real typist. The lyrics aren't here
// to be read, they're here to show someone thinking one line at a time, and at
// transcription speed that reads as a machine filling a field. The cost is that
// the recording, which is the slide's payoff, doesn't land until ~6s; the loop
// is what covers that, since anyone still on the slide sees the whole beat come
// round again.
const TITLE_CHAR_MS = 52;
const LINE_CHAR_MS = 62;
// A held beat on the bare canvas before anything is typed — long enough to take
// in what this starts from: an empty sheet with the horizon illustration still
// on it and the full toolbar underneath. It is the opening shot, not a pause,
// so it gets a second and a half.
const EMPTY_HOLD = 1500;
const AFTER_TITLE = 320;
const BETWEEN_LINES = 240;
// REC lights up a beat after the second line, runs, and the capsule it produces
// drops into the flow the moment it stops. The card has to visibly come FROM
// the toolbar button, or it's just another element fading in.
const BEFORE_REC = 280;
const REC_RUN = 1400;
const AFTER_CAPSULE = 600;
// How long the finished canvas holds before the loop wipes it and starts over
// from the empty sheet.
const DEMO_HOLD = 2400;

// An untouched canvas: nothing typed, nothing recorded, caret waiting on the
// first line. The toolbar isn't in here — it is never absent. Held at module
// scope so it's referentially stable; the rAF loop below bails out of
// committing when the state hasn't actually changed.
const DEMO_START_STATE = {
    titleChars: 0,
    lineChars: [0, 0, 0],
    recording: false,
    capsule: false,
    caret: 0 as number | 'title' | null,
};

const Caret = () => (
    <span className="ml-[2px] inline-block h-[0.95em] w-[2px] translate-y-[0.14em] bg-stone-400 motion-safe:animate-pulse" />
);

const CreateCanvasArt = () => {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();

    // The demo is authored at DEMO_W and scaled down to fit; 0 means "not
    // measured yet", which keeps the full-size surface from flashing.
    const [scale, setScale] = useState(0);
    const [frame, setFrame] = useState<HTMLDivElement | null>(null);

    // A callback ref rather than useRef + an effect: this measures the moment
    // the node is attached, so the surface has its real scale on the very
    // first paint. Leaving that to the ResizeObserver below would mean one
    // frame at scale(0) — invisible — before it delivers.
    const attachFrame = useCallback((node: HTMLDivElement | null) => {
        setFrame(node);
        if (node) setScale(node.getBoundingClientRect().width / DEMO_W);
    }, []);

    const script = useMemo(() => {
        const title = t('onboarding.intro.slides.tools.demo.project');
        const lines = [
            t('onboarding.intro.slides.tools.demo.line_1'),
            t('onboarding.intro.slides.tools.demo.line_2'),
            t('onboarding.intro.slides.tools.demo.line_3'),
        ];

        const titleEnd = EMPTY_HOLD + title.length * TITLE_CHAR_MS;
        const starts: number[] = [];
        const ends: number[] = [];

        starts[0] = titleEnd + AFTER_TITLE;
        ends[0] = starts[0] + lines[0].length * LINE_CHAR_MS;
        starts[1] = ends[0] + BETWEEN_LINES;
        ends[1] = starts[1] + lines[1].length * LINE_CHAR_MS;

        // REC runs, and the capsule it produced lands between line 2 and line
        // 3 — the third line is only written once there's a recording sitting
        // in the flow above it.
        const recAt = ends[1] + BEFORE_REC;
        const capsuleAt = recAt + REC_RUN;
        starts[2] = capsuleAt + AFTER_CAPSULE;
        ends[2] = starts[2] + lines[2].length * LINE_CHAR_MS;

        return { title, lines, titleEnd, starts, ends, recAt, capsuleAt, end: ends[2] + DEMO_HOLD };
    }, [t]);

    const finalState = useMemo(
        () => ({
            titleChars: script.title.length,
            lineChars: script.lines.map((line) => line.length),
            recording: false,
            capsule: true,
            // The caret rests on the last line, the way it would after typing.
            caret: 2 as number | 'title' | null,
        }),
        [script],
    );

    const [animated, setAnimated] = useState(DEMO_START_STATE);

    // Reduced motion is a rendering choice, not something to drive through
    // state — the loop below simply never starts, and the finished canvas is
    // what gets drawn.
    const state = prefersReducedMotion ? finalState : animated;

    useEffect(() => {
        if (prefersReducedMotion) return;

        let rafId = 0;
        const start = performance.now();

        const charsAt = (elapsed: number, from: number, rate: number, total: number) =>
            elapsed <= from ? 0 : Math.min(total, Math.floor((elapsed - from) / rate));

        const tick = (now: number) => {
            // Wraps, so the canvas empties and writes itself again for as long
            // as the visitor sits on the slide. A demo that plays once and
            // freezes reads as a screenshot to anyone who arrives ten seconds
            // late — and this slide's whole claim is that things happen here.
            const elapsed = (now - start) % script.end;

            const titleChars = charsAt(elapsed, EMPTY_HOLD, TITLE_CHAR_MS, script.title.length);
            const lineChars = script.lines.map((line, i) => charsAt(elapsed, script.starts[i], LINE_CHAR_MS, line.length));

            // Before anything is typed the caret waits on the first lyric line,
            // which is where a genuinely empty canvas parks it. From then on it
            // follows the work: the title while that's being named, then the
            // newest line — including through the recording, since that's where
            // the writer left off.
            let caret: number | 'title' | null = 0;
            if (elapsed >= EMPTY_HOLD && elapsed < script.titleEnd) {
                caret = 'title';
            } else if (elapsed >= script.titleEnd) {
                script.lines.forEach((_, i) => {
                    if (elapsed >= script.starts[i]) caret = i;
                });
            }

            const next = {
                titleChars,
                lineChars,
                recording: elapsed >= script.recAt && elapsed < script.capsuleAt,
                capsule: elapsed >= script.capsuleAt,
                caret,
            };

            // Only commit when something actually changed — the loop runs at
            // display rate but the demo only advances a character at a time.
            // The first tick is also what rewinds the demo to the start when
            // the script changes (a language switch), since at elapsed ≈ 0
            // every count is 0 anyway.
            setAnimated((prev) =>
                prev.titleChars === next.titleChars &&
                prev.recording === next.recording &&
                prev.capsule === next.capsule &&
                prev.caret === next.caret &&
                prev.lineChars.every((c, i) => c === next.lineChars[i])
                    ? prev
                    : next,
            );

            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafId);
    }, [script, prefersReducedMotion]);

    // Keeps the scale honest as the slide reflows (orientation change, window
    // resize); the first measurement already happened in `attachFrame`.
    useEffect(() => {
        if (!frame) return;

        const observer = new ResizeObserver(([entry]) => {
            setScale(entry.contentRect.width / DEMO_W);
        });
        observer.observe(frame);
        return () => observer.disconnect();
    }, [frame]);

    // The card slot between line 2 and line 3 is occupied from the moment REC
    // is pressed: first by the take being recorded, then by the card it became.
    const slotFilled = state.recording || state.capsule;

    // A genuinely untouched project — nothing typed, nothing recorded. The real
    // canvas only draws its horizon illustration while this is true, so the
    // demo's illustration leaves the moment the first character lands and comes
    // back when the loop wipes the sheet.
    const blank = state.titleChars === 0 && state.lineChars.every((c) => c === 0) && !slotFilled;

    return (
        <div ref={attachFrame} className="relative h-full w-full overflow-hidden">
            <div
                className="absolute left-0 top-0 flex flex-col items-center gap-4"
                style={{
                    width: DEMO_W,
                    height: DEMO_H,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    opacity: scale ? 1 : 0,
                }}
            >
                {/* The canvas itself: the real card's own white sheet, 32px
                    radius and hairline border, held to a centred column so it
                    reads as paper on the workspace rather than as the slide. */}
                <div
                    className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-stone-200/60 bg-white p-7 shadow-[0_12px_40px_rgba(0,0,0,0.03)]"
                    style={{ width: CANVAS_W }}
                >
                    {/* The empty canvas's own horizon, anchored to the bottom
                        edge at the same half opacity the real one uses. Only the
                        landmark still is carried here, not the looping sky video
                        that sits behind it in the app — a second video on a
                        carousel that already streams three of them costs more
                        than the drifting clouds are worth at this size.

                        It fades rather than unmounts so the loop can bring it
                        back, and stays behind the writing at every moment. */}
                    <motion.img
                        src="/assets/Canvas%20empty/bottom.webp"
                        alt=""
                        aria-hidden="true"
                        initial={false}
                        animate={{ opacity: blank ? 0.5 : 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: 'easeOut' }}
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-auto w-full select-none"
                    />

                    {/* Project title, under the canvas header's own rule. The
                        row is held at a fixed height — an empty span collapses
                        it to 0, and the lyric block would drop as the title
                        typed. */}
                    <div className="relative z-10 flex shrink-0 items-center border-b border-stone-200/40 pb-4">
                        <span className="flex h-[26px] items-center font-sans text-[20px] font-medium leading-none text-stone-400">
                            {script.title.slice(0, state.titleChars)}
                            {state.caret === 'title' && <Caret />}
                        </span>
                    </div>

                    {/* Lyric flow — the canvas's own 30px lines, with the
                        recording docked between the second and third of them. */}
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
                        {script.lines.map((line, i) => (
                            <div
                                key={i}
                                className="w-full text-center font-sans text-[30px] font-normal leading-[1.4] tracking-[-0.035em] text-stone-700"
                            >
                                {line.slice(0, state.lineChars[i])}
                                {state.caret === i && <Caret />}
                                {/* Holds the row's height open before it's typed, so
                                    the block doesn't grow line by line and shove the
                                    lyrics around mid-demo. */}
                                {state.lineChars[i] === 0 && state.caret !== i && <span className="invisible">.</span>}

                                {i === 1 && (
                                    <motion.div
                                        initial={false}
                                        animate={
                                            slotFilled
                                                ? { opacity: 1, scale: 1, y: 0 }
                                                : { opacity: 0, scale: 0.94, y: 6 }
                                        }
                                        transition={
                                            prefersReducedMotion
                                                ? { duration: 0 }
                                                : { type: 'spring', stiffness: 260, damping: 22 }
                                        }
                                        // A grid rather than a swap: the take and
                                        // the finished card share one cell and
                                        // cross-fade in place, so the card lands
                                        // exactly where the red bars were instead
                                        // of the row rebuilding itself. The slot
                                        // keeps its height even while empty, which
                                        // is what stops the lyrics jumping when the
                                        // recording arrives.
                                        className="my-3 grid place-items-center"
                                    >
                                        {/* The take, mid-flight: the same capsule
                                            shell, but red, with its waveform
                                            sweeping in left to right over exactly
                                            as long as REC is held. */}
                                        <motion.div
                                            className="[grid-area:1/1] flex h-[42px] shrink-0 items-center gap-4 rounded-full border border-[#FF4040]/25 bg-white px-5 shadow-[0_8px_30px_rgba(255,64,64,0.10)]"
                                            initial={false}
                                            animate={{ opacity: state.recording ? 1 : 0 }}
                                            transition={{ duration: 0.22 }}
                                        >
                                            <span className="flex items-center gap-2 text-xs font-bold text-[#FF4040]">
                                                <span className="h-2.5 w-2.5 rounded-full bg-[#FF4040] motion-safe:animate-pulse" />
                                                {t('creative.recording_status')}
                                            </span>
                                            <div className="h-4 w-px bg-stone-200" />
                                            {/* Clipped rather than resized, so the
                                                capsule's width never changes as the
                                                take fills in. Driven off `recording`
                                                rather than mount, so the sweep runs
                                                again on every pass of the loop; the
                                                rewind waits out the fade so the bars
                                                aren't seen retreating. */}
                                            <motion.div
                                                className="flex h-[32px] w-[160px] items-center justify-between"
                                                initial={false}
                                                animate={{ clipPath: state.recording ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
                                                transition={
                                                    state.recording
                                                        ? { duration: REC_RUN / 1000, ease: 'linear' }
                                                        : { duration: 0, delay: 0.35 }
                                                }
                                            >
                                                {WAVE_PEAKS.map((peak, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="shrink-0 rounded-[2px] bg-[#FF4040]"
                                                        style={{ height: `${Math.max(3, peak * 28)}px`, width: '1.5px' }}
                                                    />
                                                ))}
                                            </motion.div>
                                        </motion.div>

                                        {/* The card it became — a real audio card,
                                            sitting in the lyric flow. */}
                                        <motion.div
                                            className="[grid-area:1/1] flex h-[42px] shrink-0 items-center gap-4 rounded-full border border-stone-200/60 bg-white px-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                                            initial={false}
                                            animate={{ opacity: state.capsule ? 1 : 0 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <span className="text-xs font-bold text-stone-800">
                                                {t('onboarding.intro.slides.tools.demo.recording')}
                                            </span>
                                            <div className="h-4 w-px bg-stone-200" />
                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                                                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                                {t('card.play')}
                                            </span>
                                            <div className="h-4 w-px bg-stone-200" />
                                            <div className="flex h-[32px] w-[160px] items-center justify-between">
                                                {WAVE_PEAKS.map((peak, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="shrink-0 rounded-[2px] bg-stone-300"
                                                        style={{ height: `${Math.max(3, peak * 28)}px`, width: '1.5px' }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="h-4 w-px bg-stone-200" />
                                            <span className="font-mono text-[10px] font-bold text-stone-500">0:12</span>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* The canvas toolbar, at its real 54px scale — present from the
                    first frame and never animated in. It is the slide's whole
                    claim, so it sits under the empty canvas the way it sits
                    under a real one, and only REC ever changes.

                    Glyphs only, no labels: that's the toolbar's own shape below
                    `lg` in the app, and it's the right one here — at this size
                    the labels were the only thing in the demo trying to be read,
                    and the eye went to them instead of to the canvas. */}
                <div className="flex shrink-0 justify-center pb-1">
                    <div className="flex w-fit items-center gap-3.5 rounded-full border border-stone-200/60 bg-white p-3 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
                        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-stone-200/60 bg-white shadow-[0px_1.8px_9px_rgba(0,0,0,0.04)]">
                            <Check size={26} className="stroke-[2.5px] text-stone-900" />
                        </div>

                        {/* Held down while the take runs — the card in the flow
                            above has to visibly come from this button, so this is
                            the one control that ever changes state. */}
                        <motion.div
                            initial={false}
                            animate={
                                prefersReducedMotion
                                    ? { scale: 1 }
                                    : { scale: state.recording ? 1.08 : 1 }
                            }
                            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                            className={`flex h-[54px] w-[54px] items-center justify-center rounded-full border transition-colors duration-300 ${
                                state.recording
                                    ? 'border-transparent bg-[#FF4040] shadow-[0_0_0_6px_rgba(255,64,64,0.14)]'
                                    : 'border-stone-200/50 bg-white shadow-[0px_1.8px_9px_rgba(0,0,0,0.04)]'
                            }`}
                        >
                            <div
                                className={`h-[18px] w-[18px] shrink-0 rounded-full transition-colors duration-300 ${
                                    state.recording ? 'bg-white motion-safe:animate-pulse' : 'bg-[#FF4040]'
                                }`}
                            />
                        </motion.div>

                        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-stone-200/50 bg-white shadow-[0px_1.8px_9px_rgba(0,0,0,0.04)]">
                            <ToolsCameraIcon />
                        </div>

                        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-stone-200/50 bg-white shadow-[0px_1.8px_9px_rgba(0,0,0,0.04)]">
                            <DemoStudioIcon />
                        </div>

                        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-stone-200/50 bg-white shadow-[0px_1.8px_9px_rgba(0,0,0,0.04)]">
                            <InspirationsIcon />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- "Live collab" slide ----------------------------------------------------
// A playable miniature of the real Demo Studio. Unlike the canvas demo above —
// which runs itself on a script — this one is driven by the visitor: they can
// add a track, drag tracks into a new order, turn the knobs and show/hide the
// lyrics panel. Everything that would touch a project in the real app (REC,
// Play, Send to canvas, the export menu, the per-track ⋯) is deliberately
// inert, so the slide can never promise something the onboarding can't do.
//
// Same approach as CreateCanvasArt: the whole thing is authored at the real
// studio's own pixel sizes — 64px track rows, 44px knobs, a 176px instrument
// capsule — on a fixed surface that is then scaled to whatever width the slide
// gives it, so this is the product's geometry shrunk rather than a redrawing.
// Two authored surfaces exist because a 1180px layout scaled into a phone-width
// slide would be illegible: below the `lg` breakout (see the frame in
// IntroCarousel) the compact surface drops the knob column and the utility
// pills, which are the parts that stop reading first.
const STUDIO_W = 1180;
const STUDIO_H = 640;
const STUDIO_COMPACT_W = 560;
const STUDIO_COMPACT_H = 440;
// Below this measured width the compact surface is used. It sits between the
// two widths the frame can actually hand us (≈560 under `lg`, ≥900 above it),
// so the choice never flickers mid-range.
const STUDIO_COMPACT_BELOW = 620;

type DemoTrackType = 'guitar' | 'piano' | 'vocals';

type DemoTrack = {
    id: number;
    type: DemoTrackType;
    volume: number;
    pan: number;
    eq: number;
    reverb: number;
    compressor: boolean;
};

// The studio's own instrument art, and its own per-instrument nudges — each PNG
// is framed differently, so they only line up in the capsule with these offsets.
const DEMO_INSTRUMENTS: Record<DemoTrackType, { src: string; className: string }> = {
    guitar: { src: '/assets/studio_guitar.png', className: 'max-w-[130%] max-h-[130%] translate-x-3 translate-y-[2px]' },
    piano: { src: '/assets/studio_piano.png', className: 'max-w-[180%] max-h-[180%] translate-x-[52px] translate-y-3' },
    vocals: { src: '/assets/studio_vocals.png', className: 'max-w-[130%] max-h-[130%] translate-x-3 translate-y-3' },
};

const DEMO_TRACKS: DemoTrack[] = [
    { id: 1, type: 'guitar', volume: 70, pan: 0, eq: 0, reverb: 18, compressor: true },
    { id: 2, type: 'vocals', volume: 82, pan: 0, eq: 0, reverb: 30, compressor: true },
];

// The single track the visitor is allowed to create. A piano rather than the
// real app's default guitar: the demo already opens with a guitar, and an
// identical twin row wouldn't read as "I just made that".
const DEMO_NEW_TRACK: DemoTrack = { id: 3, type: 'piano', volume: 64, pan: -15, eq: 2, reverb: 25, compressor: true };

// The studio's empty timeline: 85 flat ticks, the same silent-waveform
// placeholder the real TrackWaveform draws before anything is recorded.
const DEMO_WAVE_TICKS = Array.from({ length: 85 });
// The compact timeline is barely 130px wide; 85 ticks there pack into a solid
// grey bar rather than reading as a waveform.
const DEMO_WAVE_TICKS_COMPACT = Array.from({ length: 34 });

// --- The three collaborators ------------------------------------------------
// What sells "live collab" is seeing other people at work in the same session,
// so three cursors drift through the studio on their own slow loops: one
// writing in the lyrics panel, one on the first track, one on the second. Each
// carries a round video bubble of its owner, the way the real session shows a
// collaborator's face beside their pointer.
//
// Each clip is cropped square and cut down to a 240px, 8-second, silent loop
// (from the sources in `public/Onboarding assets/Song live collab`, 14MB of
// portrait video between them) — the bubble is 42px on screen, so anything
// larger is bytes nobody can see. Set `video` to null and the disc falls back
// to a plain tinted placeholder, the same arrangement as the slide artwork at
// the top of this file.
//
// The clips are matched to what each cursor is doing: hands at a keyboard for
// the one writing lyrics, a singer at a mic for the one on the vocal track,
// hands on a fretboard for the one on the guitar track.
//
// No cursor here wanders on a timer — every movement is caused by work the
// viewer can see happening. The lyricist rides the typing caret (see
// useTypedLyrics), and each musician sweeps their track's timeline only while
// their take is recording (see useRecordingLoop), red bars rising behind them.
// Between takes they sit parked beside the thing they own, and the video in
// the disc becomes the only movement.
//
// The anchors below are those parked spots, in the surface's own authored
// pixels so they travel with everything else when the demo is scaled; each
// variant needs its own because the compact layout puts the rows and the panel
// somewhere else. The mid-take positions are never authored — they're measured
// off the real timeline capsules, which move when the lyrics panel opens,
// closes, or the layout swaps.
type DemoCursor = {
    key: string;
    color: string;
    video: string | null;
    /**
     * Playback speed for the clip. The sources were shot at ordinary speed but
     * are cropped to a tiny disc, and motion that reads as normal at full frame
     * reads as frantic once it's that small — there's no room for the eye to
     * follow a hand, so it registers as jitter. Slowing the busiest clip down
     * is what makes it look like playing rather than fidgeting.
     */
    rate?: number;
    wide: [number, number];
    compact: [number, number];
};

const DEMO_CURSORS: DemoCursor[] = [
    {
        // At the head of the lyrics panel, where the typing is happening.
        key: 'lyricist',
        color: '#A1B5EE',
        video: '/onboarding-cards/collab-lyricist.mp4',
        wide: [40, 116],
        compact: [16, 66],
    },
    {
        // On the first track's mixer knobs — the VOL knob, specifically — so
        // the guitarist reads as someone dialing in their own sound.
        key: 'guitarist',
        color: '#92CF90',
        video: '/onboarding-cards/collab-guitarist.mp4',
        // The strumming hand is the fastest thing in any of these clips and the
        // one that reads worst at disc size; half speed turns it back into a
        // recognisable motion.
        rate: 0.5,
        // Tip on the VOL knob (centre ~575,132 with the header row gone).
        wide: [566, 124],
        // Compact has no knob column; the capsule is the nearest equivalent.
        compact: [260, 93],
    },
    {
        // Beside the second track, out along its timeline.
        key: 'vocalist',
        color: '#F7B3FF',
        video: '/onboarding-cards/collab-vocalist.mp4',
        // Out along the second track's timeline (y 184–228 with the header
        // row gone).
        wide: [850, 196],
        compact: [390, 159],
    },
];

// The lyrics panel writes itself, a character at a time, on a loop. The slide's
// claim is that someone else is in the project working right now, and text
// appearing letter by letter is what actually says that — a finished block of
// lyrics with a pointer hovering over it is just a screenshot.
//
// Rates are per character rather than per line, so the pace stays even in every
// language; the Norwegian and Swedish lines aren't the same length as the
// English ones and a fixed duration would sprint through one and crawl in
// another.
// Paced like someone thinking about the words rather than transcribing them —
// fast typing on a slide nobody asked to read just looks like a loading bar.
const LYRIC_CHAR_MS = 95;
const LYRIC_START_MS = 600;
const LYRIC_LINE_GAP_MS = 620;
// How long the finished verse sits there before the loop wipes and retypes it.
const LYRIC_HOLD_MS = 3200;

function useTypedLyrics(lines: string[]) {
    const prefersReducedMotion = useReducedMotion();

    const [typed, setTyped] = useState<{ counts: number[]; caret: number; typing: boolean }>(() => ({
        counts: lines.map(() => 0),
        caret: 0,
        typing: false,
    }));

    // Reduced motion is a rendering choice, not a state transition: the loop
    // below simply never starts and the finished verse is what gets drawn.
    // Pushing it through setState instead would mean an extra render on mount
    // for a value that was knowable during the first one.
    const finished = useMemo(
        () => ({ counts: lines.map((line) => line.length), caret: lines.length - 1, typing: false }),
        [lines],
    );
    const state = prefersReducedMotion ? finished : typed;

    useEffect(() => {
        if (prefersReducedMotion) return;

        const text = lines;
        const starts: number[] = [];
        const ends: number[] = [];
        let at = LYRIC_START_MS;
        text.forEach((line, i) => {
            starts[i] = at;
            ends[i] = at + line.length * LYRIC_CHAR_MS;
            at = ends[i] + LYRIC_LINE_GAP_MS;
        });
        const total = (ends[ends.length - 1] ?? 0) + LYRIC_HOLD_MS;

        let raf = 0;
        const startedAt = performance.now();

        const tick = (now: number) => {
            const elapsed = (now - startedAt) % total;

            let caret = 0;
            const counts = text.map((line, i) => {
                if (elapsed <= starts[i]) return 0;
                if (elapsed < ends[i]) caret = i;
                else caret = Math.max(caret, i);
                return Math.min(line.length, Math.floor((elapsed - starts[i]) / LYRIC_CHAR_MS));
            });

            // True from the first character to the last, false through the
            // hold at the end. The lyricist's video rides on this, so that the
            // hands only move while words are actually appearing.
            const typing = elapsed >= starts[0] && elapsed < ends[ends.length - 1];

            // The loop runs at display rate but the text only advances one
            // character at a time, so most frames have nothing to commit.
            setTyped((prev) =>
                prev.caret === caret &&
                prev.typing === typing &&
                prev.counts.length === counts.length &&
                prev.counts.every((c, i) => c === counts[i])
                    ? prev
                    : { counts, caret, typing },
            );

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
        // `lines` is memoised by the caller, so this restarts the typing when
        // the words actually change (a language switch) and not on every render.
    }, [lines, prefersReducedMotion]);

    return state;
}

// --- The recording takes ----------------------------------------------------
// The two musicians take turns laying down a take, guitar first, then vocals.
// While a take runs, that cursor rides its track's timeline left to right and
// red bars rise behind it, jittering like a live level meter; when the sweep
// reaches the end the take is done and the bars settle black — the same red-
// while-recording, dark-when-recorded language as the real studio. Then both
// waveforms hold for a beat, wipe, and the loop starts over.
// --- The opening camera -----------------------------------------------------
// One slow move, played once per visit to the slide:
//
//   wide for a beat → zoom in on the lyrics panel, where the words are being
//   written → glide right, still close, across the tracks → pull back out to
//   the whole studio.
//
// The recording loop is timed so the guitar take starts just as the glide
// reaches the tracks — the trip right is what catches the musicians at work,
// and the pull-back then shows all three going at once.
//
// Authored as scale+translate keyframes with a top-left origin rather than an
// animated transform-origin: for a focus point c at zoom z inside a W×H
// surface, translate = W/2 − c·z centres c in the frame, and every move is
// then one smoothly interpolable pair of numbers. Holds are repeated
// keyframes; easeInOut on each segment makes every move leave and land softly.
const CAMERA_KEY_MS = [0, 1000, 3000, 5500, 8500, 11500, 13500];
const CAMERA_TOTAL_MS = CAMERA_KEY_MS[CAMERA_KEY_MS.length - 1];
const CAMERA_TIMES = CAMERA_KEY_MS.map((t) => t / CAMERA_TOTAL_MS);

type CameraFocus = { x: number; y: number; z: number };

const buildCameraPath = (W: number, H: number, lyrics: CameraFocus, tracks: CameraFocus) => {
    const centre = (f: CameraFocus) => ({ x: W / 2 - f.x * f.z, y: H / 2 - f.y * f.z });
    const l = centre(lyrics);
    const tr = centre(tracks);
    return {
        scale: [1, 1, lyrics.z, lyrics.z, tracks.z, tracks.z, 1],
        x: [0, 0, l.x, l.x, tr.x, tr.x, 0],
        y: [0, 0, l.y, l.y, tr.y, tr.y, 0],
    };
};

// Focus points sit at least half a viewport (W/2z × H/2z) from every surface
// edge, so a close framing never pans past the scene onto blank background.
const CAMERA_PATH_WIDE = buildCameraPath(
    STUDIO_W,
    STUDIO_H,
    { x: 310, y: 200, z: 1.9 }, // the lyric lines, filling the left of the frame
    { x: 800, y: 185, z: 1.75 }, // both track rows, knobs through timelines
);
const CAMERA_PATH_COMPACT = buildCameraPath(
    STUDIO_COMPACT_W,
    STUDIO_COMPACT_H,
    { x: 156, y: 124, z: 1.8 },
    { x: 375, y: 140, z: 1.6 },
);

// The takes wait for the camera: the guitar take begins as the glide arrives
// at the tracks (CAMERA_KEY_MS[4]), a shade early so the sweep is already
// moving when the framing settles.
const REC_START_MS = 8200;
const REC_SWEEP_MS = 6500;
const REC_GAP_MS = 1100;
const REC_HOLD_MS = 4200;

// Voice-shaped pseudo-waveform — the same sine mix the canvas demo's capsule
// uses, so a "finished take" here looks like a recording does elsewhere in the
// product rather than like random noise.
const REC_PEAKS = Array.from({ length: 85 }, (_, i) => {
    const wave = 0.35 * Math.sin(i * 0.15) + 0.45 * Math.sin(i * 0.35) + 0.2 * Math.sin(i * 0.8);
    return Math.max(0.14, 0.25 + Math.abs(wave) * 0.75);
});

type RecordingRow = { state: 'idle' | 'recording' | 'done'; bars: number };

// Drives the two takes off one clock, exactly the shape of useTypedLyrics:
// a rAF loop that quantises to whole bars and only commits when one lands,
// so the display-rate loop produces ~13 renders a second, not 60.
function useRecordingLoop(barCount: number): [RecordingRow, RecordingRow] {
    const prefersReducedMotion = useReducedMotion();

    const [rows, setRows] = useState<[RecordingRow, RecordingRow]>([
        { state: 'idle', bars: 0 },
        { state: 'idle', bars: 0 },
    ]);

    // Reduced motion: both takes already on tape, nothing sweeps.
    const finished = useMemo<[RecordingRow, RecordingRow]>(
        () => [
            { state: 'done', bars: barCount },
            { state: 'done', bars: barCount },
        ],
        [barCount],
    );

    useEffect(() => {
        if (prefersReducedMotion) return;

        const starts = [REC_START_MS, REC_START_MS + REC_SWEEP_MS + REC_GAP_MS];
        const total = starts[1] + REC_SWEEP_MS + REC_HOLD_MS;

        let raf = 0;
        const startedAt = performance.now();

        const tick = (now: number) => {
            const elapsed = (now - startedAt) % total;

            const next = starts.map((start): RecordingRow => {
                if (elapsed < start) return { state: 'idle', bars: 0 };
                if (elapsed < start + REC_SWEEP_MS) {
                    return {
                        state: 'recording',
                        bars: Math.min(barCount, Math.floor(((elapsed - start) / REC_SWEEP_MS) * barCount)),
                    };
                }
                return { state: 'done', bars: barCount };
            }) as [RecordingRow, RecordingRow];

            setRows((prev) =>
                prev[0].state === next[0].state &&
                prev[0].bars === next[0].bars &&
                prev[1].state === next[1].state &&
                prev[1].bars === next[1].bars
                    ? prev
                    : next,
            );

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [prefersReducedMotion, barCount]);

    return prefersReducedMotion ? finished : rows;
}

// The session cursor, drawn from the same path the real studio uses for a
// remote collaborator's pointer.
const DemoCursorArrow = ({ color, size }: { color: string; size: number }) => (
    <svg width={size} height={size} viewBox="0 0 134 134" fill="none" className="drop-shadow-md">
        <path
            d="M26.0776 24.6597C26.0776 17.2078 34.1446 12.5503 40.5981 16.2763L115.143 59.3147C122.598 63.6193 121.147 74.7852 112.838 77.0404L74.0838 87.5595C72.4453 88.0043 70.9525 88.8721 69.7553 90.0761L42.6222 117.362C36.5318 123.487 26.0776 119.174 26.0776 110.536L26.0776 24.6597Z"
            fill={color}
            stroke="white"
            strokeWidth="8"
        />
    </svg>
);

// The face inside a cursor's disc.
//
// The lyricist's clip is driven rather than left to autoplay: hands typing away
// under a panel that has finished writing itself reads as a loop running on its
// own, which is exactly what it is. Tying it to the typing means the hands move
// while words appear, stop when the verse is done, and start over from the top
// when it retypes — the two halves of the same performance.
const DemoCursorVideo = ({ cursor, playing }: { cursor: DemoCursor; playing: boolean }) => {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        if (playing) {
            // Rewind on every restart so the clip opens on the same frame the
            // first character does, rather than resuming wherever it paused.
            video.currentTime = 0;
            // Autoplay can still be refused; a held frame is a fine fallback.
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }, [playing]);

    return (
        <video
            ref={ref}
            src={cursor.video ?? undefined}
            autoPlay={playing}
            muted
            loop
            playsInline
            aria-hidden="true"
            // Set here rather than as an attribute — playbackRate is a property
            // with no HTML equivalent, and it's reset by each load.
            onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = cursor.rate ?? 1;
            }}
            className="h-full w-full object-cover"
        />
    );
};

const DemoCursorLayer = ({ compact, live }: {
    compact: boolean;
    // Per-cursor live state, keyed by DEMO_CURSORS key. `anchor` is where the
    // cursor should be right now in authored surface pixels — the lyricist's
    // caret, or a musician's spot on the timeline mid-take — and null means
    // "sit on your parked anchor". `busy` is whether that collaborator is
    // performing right now; it drives their video, so the hands only move
    // while their work is actually happening.
    live: Record<string, { anchor: [number, number] | null; busy: boolean }>;
}) => {
    const arrowSize = compact ? 20 : 28;
    // The face is the point of this layer, so it's carried at twice the size it
    // used to be — at 42px the clips were unreadable, which made three
    // expensive videos decode for what amounted to coloured dots.
    const bubbleSize = compact ? 60 : 84;

    // How far back the face is pulled from where the arrow-relative offset alone
    // would put it, as a share of its own width.
    //
    // That offset is anchored to the arrow, so it doesn't grow with the bubble:
    // doubling the disc pushed its centre half its own growth further right,
    // and the pair stopped reading as one thing — the arrow looked stuck to the
    // circle's top-left corner rather than leading it. Pulling back by a share
    // of the bubble's width restores the optical balance at any size, and keeps
    // the arrowhead clear of the disc instead of buried under it.
    const bubbleLeft = arrowSize * 0.62 - bubbleSize * 0.22;

    return (
        <div className="pointer-events-none absolute inset-0 z-40 select-none">
            {DEMO_CURSORS.map((cursor) => {
                const state = live[cursor.key] ?? { anchor: null, busy: false };
                // A lyricist pointer with no lyrics under it has nothing to
                // point at — the panel is closed, or the first caret
                // measurement hasn't landed yet.
                if (cursor.key === 'lyricist' && !state.anchor) return null;

                const [x, y] = state.anchor ?? (compact ? cursor.compact : cursor.wide);

                return (
                    <motion.div
                        key={cursor.key}
                        className="absolute left-0 top-0"
                        initial={false}
                        // Live targets advance in steps — a character landing, a
                        // bar landing — so a spring lets the pointer trail them
                        // the way a hand does instead of teleporting. It also
                        // carries a musician out to the start of their take and
                        // back to their parked spot when it's done.
                        animate={{ x, y }}
                        transition={{ type: 'spring', stiffness: 170, damping: 22, mass: 0.6 }}
                    >
                        <DemoCursorArrow color={cursor.color} size={arrowSize} />
                        {/* The face rides just off the pointer's tail, ringed in
                            that cursor's own colour so the two read as one
                            person. */}
                        <div
                            className="absolute overflow-hidden rounded-full border-2 shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                            style={{
                                width: bubbleSize,
                                height: bubbleSize,
                                left: bubbleLeft,
                                top: arrowSize * 0.62,
                                backgroundColor: cursor.color,
                                borderColor: cursor.color,
                            }}
                        >
                            {cursor.video ? (
                                <DemoCursorVideo cursor={cursor} playing={state.busy} />
                            ) : (
                                <div
                                    className="h-full w-full"
                                    style={{ background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.65), ${cursor.color} 70%)` }}
                                />
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

const DemoKnob = ({ value, min, max, defaultValue, onChange }: {
    value: number;
    min: number;
    max: number;
    defaultValue: number;
    onChange: (val: number) => void;
}) => {
    // Drag distance is read in screen pixels while the knob is painted at the
    // surface's scale. Correcting for that would make the knob feel heavier the
    // smaller the slide gets; leaving it alone keeps the same wrist movement
    // everywhere, which matters more here than matching the real app exactly.
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const startValue = value;
        const range = max - min;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = startY - moveEvent.clientY;
            const deltaValue = (deltaY / 2.5) * (range / 100);
            onChange(Math.max(min, Math.min(max, startValue + deltaValue)));
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const angle = -135 + ((value - min) / (max - min)) * 270;

    return (
        <div
            onMouseDown={handleMouseDown}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onChange(defaultValue);
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-stone-200/80 bg-white shadow-[0_2.5px_6px_rgba(0,0,0,0.07)] transition-all hover:bg-stone-50 active:scale-95 cursor-ns-resize"
        >
            <div
                className="absolute h-[16px] w-[1.5px] origin-bottom rounded-full bg-stone-600"
                style={{ left: 'calc(50% - 0.75px)', bottom: '50%', transform: `rotate(${angle}deg)` }}
            />
        </div>
    );
};

const StudioDemoArt = () => {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();

    const [tracks, setTracks] = useState<DemoTrack[]>(DEMO_TRACKS);
    const [showLyrics, setShowLyrics] = useState(true);

    // The opening camera move runs as one keyframed animation (see
    // CAMERA_PATH_WIDE) — no state to sequence; the ref is what the cursor
    // measurements are taken against. One-shot per mount, and AnimatePresence
    // remounts the slide on every visit, so every visit gets the tour.
    const cameraRef = useRef<HTMLDivElement | null>(null);

    // Whether the tour has landed on its final wide frame. The track rows'
    // layout animations (reorder, add-track) are held off until then: layout
    // projection re-measures the rows on every recording-loop commit, and
    // measurements taken while the camera transform is mid-flight read as the
    // rows having moved — framer then "corrects" them, which showed up as the
    // tracks twitching back and forth for the whole tour.
    const [cameraSettled, setCameraSettled] = useState(false);

    useEffect(() => {
        if (prefersReducedMotion) {
            setCameraSettled(true);
            return;
        }
        const timer = setTimeout(() => setCameraSettled(true), CAMERA_TOTAL_MS);
        return () => clearTimeout(timer);
    }, [prefersReducedMotion]);
    // Which row the pointer is over the grip of — `draggable` is only switched
    // on there, exactly as in the real studio, so a drag started anywhere else
    // in the row (on a knob, say) can never reorder the list.
    const [grabbedId, setGrabbedId] = useState<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const [scale, setScale] = useState(0);
    const [compact, setCompact] = useState(false);
    const [frame, setFrame] = useState<HTMLDivElement | null>(null);

    // Measured on attach rather than in an effect so the surface has its real
    // scale on the first paint — see the same note on CreateCanvasArt.
    const measure = useCallback((width: number) => {
        const isCompact = width < STUDIO_COMPACT_BELOW;
        setCompact(isCompact);
        setScale(width / (isCompact ? STUDIO_COMPACT_W : STUDIO_W));
    }, []);

    const attachFrame = useCallback((node: HTMLDivElement | null) => {
        setFrame(node);
        if (node) measure(node.getBoundingClientRect().width);
    }, [measure]);

    useEffect(() => {
        if (!frame) return;
        const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
        observer.observe(frame);
        return () => observer.disconnect();
    }, [frame, measure]);

    const canAddTrack = tracks.length < DEMO_TRACKS.length + 1;

    const updateParam = (id: number, key: keyof DemoTrack, value: number | boolean) => {
        setTracks((prev) => prev.map((track) => (track.id === id ? { ...track, [key]: value } : track)));
    };

    // Reorder-on-hover, like the real studio: the list rearranges under the
    // pointer as you drag rather than waiting for a drop.
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setTracks((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(draggedIndex, 1);
            updated.splice(index, 0, moved);
            return updated;
        });
        setDraggedIndex(index);
    };

    // Memoised so its identity only changes when the language does — the typing
    // effect below keys off this array, and a fresh one every render would
    // restart the verse from a blank panel on every state change in the studio.
    const lyricLines = useMemo(
        () => [
            t('onboarding.intro.slides.tools.demo.line_1'),
            t('onboarding.intro.slides.tools.demo.line_2'),
            t('onboarding.intro.slides.tools.demo.line_3'),
        ],
        [t],
    );
    const typedLyrics = useTypedLyrics(lyricLines);

    // The lyricist's pointer rides the caret, so its position is measured off
    // the real caret element rather than authored as coordinates — the caret
    // moves with the text, the language, and the layout, and no hand-written
    // path could keep up with all three.
    //
    // The surface sits at the frame's own top-left with a top-left transform
    // origin, so dividing the offset between the two rects by the scale gives
    // the caret straight back in authored pixels.
    const caretRef = useRef<HTMLSpanElement | null>(null);
    const [caretAnchor, setCaretAnchor] = useState<[number, number] | null>(null);

    useEffect(() => {
        const camera = cameraRef.current;
        if (!camera || !scale || !showLyrics) {
            setCaretAnchor(null);
            return;
        }
        const caret = caretRef.current;
        // Between lines there's a beat with no caret rendered. Holding the last
        // anchor through it keeps the pointer where the writer left off, which
        // is what a real one would do.
        if (!caret) return;

        // Measured against the camera wrapper rather than the frame: the
        // wrapper shares every transform the caret is under (surface scale AND
        // the camera zoom), so client offsets divided by its effective scale
        // come back in authored pixels no matter where the zoom is mid-flight.
        const camRect = camera.getBoundingClientRect();
        const effScale = camRect.width / (compact ? STUDIO_COMPACT_W : STUDIO_W);
        const caretRect = caret.getBoundingClientRect();
        // Nudged so the arrow's tip — about a fifth of the way into its box —
        // lands on the caret itself rather than the pointer's top-left corner.
        // The vertical nudge is a fraction of the caret's own height so it
        // still lands right when the compact layout shrinks the type.
        setCaretAnchor([
            (caretRect.left - camRect.left) / effScale - 3,
            (caretRect.top - camRect.top + caretRect.height * 0.14) / effScale,
        ]);
    }, [scale, compact, showLyrics, typedLyrics, lyricLines]);

    // The recording takes. Rows are positional — the takes belong to the first
    // and second visual rows, matching the cursors' parked anchors, so a
    // reordered or added track doesn't strand the animation. The mid-take
    // cursor position is measured off the row's real timeline capsule, the
    // same way the caret is: the capsule moves when lyrics open or close and
    // widens when they hide, and a measured anchor follows all of it.
    const barCount = compact ? DEMO_WAVE_TICKS_COMPACT.length : DEMO_WAVE_TICKS.length;
    const recRows = useRecordingLoop(barCount);
    const timelineRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [recAnchors, setRecAnchors] = useState<Array<[number, number] | null>>([null, null]);

    useEffect(() => {
        const camera = cameraRef.current;
        if (!camera || !scale) {
            setRecAnchors([null, null]);
            return;
        }
        // Camera-relative for the same reason as the caret above.
        const camRect = camera.getBoundingClientRect();
        const effScale = camRect.width / (compact ? STUDIO_COMPACT_W : STUDIO_W);
        setRecAnchors(
            [0, 1].map((i) => {
                if (recRows[i].state !== 'recording') return null;
                const el = timelineRefs.current[i];
                if (!el) return null;
                const r = el.getBoundingClientRect();
                // Tip on the newest bar, vertically centred on the strip; the
                // small constants take the pointer's own tip offset back out.
                return [
                    (r.left - camRect.left + r.width * (recRows[i].bars / barCount)) / effScale - 6,
                    (r.top - camRect.top + r.height / 2) / effScale - 5,
                ] as [number, number];
            }),
        );
    }, [scale, recRows, barCount, showLyrics, compact]);

    const surfaceW = compact ? STUDIO_COMPACT_W : STUDIO_W;
    const surfaceH = compact ? STUDIO_COMPACT_H : STUDIO_H;
    const lyricsWidth = compact ? 190 : 280;

    // Passive controls are all drawn in the same washed-out gray, so the only
    // things that look pressable are the ones that actually are — everything
    // white-and-shadowed on this slide responds to the hand.
    const passiveButton = 'flex items-center justify-center gap-2 rounded-full border border-stone-200/60 bg-stone-100/60 font-bold text-stone-400 cursor-default';

    return (
        <div ref={attachFrame} className="relative h-full w-full overflow-hidden">
            {/* The live-meter jitter for bars mid-take. scaleY rather than
                height so 85 bars animate on the compositor, not in layout. */}
            <style>{`@keyframes demoRecPulse { 0%, 100% { transform: scaleY(0.55); } 50% { transform: scaleY(1.25); } }`}</style>
            <div
                className="absolute left-0 top-0 text-left"
                style={{
                    width: surfaceW,
                    height: surfaceH,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    opacity: scale ? 1 : 0,
                }}
            >
                {/* The camera. Everything — panels, cursors — rides inside it,
                    so the whole tour is one transform over the whole scene;
                    the frame's overflow-hidden crops whatever a close framing
                    pushes outside. Being a transformed element, it's also the
                    containing block for the cursor layer's absolute
                    positioning, so the cursors' authored coordinates stay
                    valid at any zoom. */}
                <motion.div
                    ref={cameraRef}
                    className="flex h-full w-full items-stretch"
                    style={{ transformOrigin: '0px 0px' }}
                    initial={false}
                    animate={
                        prefersReducedMotion
                            ? { scale: 1, x: 0, y: 0 }
                            : compact
                                ? CAMERA_PATH_COMPACT
                                : CAMERA_PATH_WIDE
                    }
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: CAMERA_TOTAL_MS / 1000, times: CAMERA_TIMES, ease: 'easeInOut' }
                    }
                >
                {/* Three collaborators at work, over the whole surface so a
                    cursor can cross from the lyrics panel into the studio card
                    the way a real one does. Sits above both, below nothing —
                    and pointer-events-none throughout, so it never steals a
                    click from the controls underneath. */}
                {scale > 0 && (
                    <DemoCursorLayer
                        compact={compact}
                        live={{
                            lyricist: { anchor: caretAnchor, busy: typedLyrics.typing },
                            guitarist: { anchor: recAnchors[0], busy: recRows[0].state === 'recording' },
                            vocalist: { anchor: recAnchors[1], busy: recRows[1].state === 'recording' },
                        }}
                    />
                )}

                {/* Lyrics panel — the canvas's own lines, carried over from the
                    previous slide so the studio reads as the same song. */}
                <div
                    className={`relative z-10 flex shrink-0 flex-col overflow-hidden rounded-l-[36px] bg-[#E5E4DE] transition-all duration-300 ease-out ${
                        showLyrics
                            ? 'border-b border-l border-t border-stone-200/80 border-r border-r-[#D2D1C9] opacity-100'
                            : 'w-0 border-transparent opacity-0'
                    }`}
                    style={showLyrics ? { width: lyricsWidth, padding: compact ? '20px 16px' : '36px 24px 36px 36px' } : undefined}
                >
                    <div className="flex h-full shrink-0 flex-col" style={{ width: lyricsWidth - (compact ? 32 : 60) }}>
                        <h3 className={`shrink-0 font-sans font-medium tracking-tight text-stone-500 ${compact ? 'mb-4 text-[17px]' : 'mb-8 text-[26px]'}`}>
                            {t('studio.lyrics_sidebar')}
                        </h3>
                        <div className={`flex flex-col font-sans font-medium tracking-tight text-stone-700 ${compact ? 'gap-3 text-[12px] leading-snug' : 'gap-6 text-[17px] leading-relaxed'}`}>
                            {lyricLines.map((line, i) => (
                                // The finished line is always present but
                                // invisible, and the typed prefix is drawn over
                                // it. That reserves each line's real height —
                                // including however many rows it wraps to — so
                                // the panel can't grow line by line and shove
                                // the lyrics around while they're being typed.
                                <p key={i} className="relative">
                                    <span className="invisible" aria-hidden="true">{line}</span>
                                    <span className="absolute inset-0">
                                        {line.slice(0, typedLyrics.counts[i] ?? 0)}
                                        {typedLyrics.caret === i && (
                                            // Wrapped rather than measured directly
                                            // because Caret is a plain component with
                                            // no ref to forward, and this is the
                                            // element the lyricist's pointer follows.
                                            <span ref={caretRef} className="inline-block">
                                                <Caret />
                                            </span>
                                        )}
                                    </span>
                                </p>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Studio card */}
                <div
                    className={`relative z-20 flex min-w-0 flex-grow flex-col bg-white shadow-[0_15px_45px_rgba(0,0,0,0.06)] ${
                        showLyrics ? 'rounded-l-none rounded-r-[36px] border-b border-r border-t' : 'rounded-[36px] border'
                    } border-stone-200/80 ${compact ? 'gap-3 p-4' : 'gap-6 p-7'}`}
                >
                    {/* Header */}
                    <div className={`flex w-full items-center justify-between px-1 ${compact ? 'mb-1' : 'mb-2'}`}>
                        <div className="flex min-w-0 items-center gap-3">
                            <h3 className={`shrink-0 font-sans font-medium tracking-tight text-stone-500 ${compact ? 'text-[17px]' : 'text-[26px]'}`}>
                                {t('onboarding.intro.slides.collab.demo.title')}
                            </h3>
                            {/* Sits where the real studio stacks its collaborator
                                avatars — the one spot in the header that's already
                                reserved for "who/what is live right now". The one
                                green dot on the slide: everything passive is
                                grayed, so the badge alone carries "this is live". */}
                            <span className={`flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200/70 bg-stone-50 px-2.5 py-1 font-semibold text-stone-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-[#86BE7F]" />
                                {t('onboarding.intro.slides.collab.demo.hint')}
                            </span>
                        </div>
                    </div>

                    {/* Track list */}
                    <div className="relative flex w-full flex-col gap-2.5">
                        {tracks.map((track, idx) => (
                            <motion.div
                                key={track.id}
                                layout={cameraSettled}
                                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                draggable={grabbedId === track.id}
                                onDragStart={() => setDraggedIndex(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={() => setDraggedIndex(null)}
                                className={`group relative flex w-full select-none items-center rounded-2xl border border-stone-200/70 bg-stone-50/70 transition-colors hover:bg-stone-100/80 ${
                                    compact ? 'h-14 gap-2 px-3' : 'h-16 gap-3 px-4 py-1'
                                } ${draggedIndex === idx ? 'opacity-60' : ''}`}
                            >
                                {/* Drag grip — live */}
                                <div
                                    onMouseEnter={() => setGrabbedId(track.id)}
                                    onMouseLeave={() => setGrabbedId(null)}
                                    onTouchStart={() => setGrabbedId(track.id)}
                                    onTouchEnd={() => setGrabbedId(null)}
                                    className="flex w-5 shrink-0 cursor-grab items-center justify-center text-stone-300 opacity-60 transition-all hover:text-stone-500 group-hover:opacity-100 active:cursor-grabbing"
                                    aria-label={t('studio.drag_to_reorder')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                                        {[5, 12, 19].map((cy) => (
                                            <g key={cy}>
                                                <circle cx="9" cy={cy} r="1.25" fill="currentColor" />
                                                <circle cx="15" cy={cy} r="1.25" fill="currentColor" />
                                            </g>
                                        ))}
                                    </svg>
                                </div>

                                {/* Instrument capsule */}
                                <div
                                    className={`relative flex h-11 shrink-0 items-center justify-between overflow-hidden rounded-full border border-stone-200/40 bg-[#F9F8F6] pl-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                                        compact ? 'w-[128px]' : 'w-44'
                                    }`}
                                >
                                    <div className={`z-10 flex w-full min-w-0 items-center gap-1.5 ${compact ? 'pr-[56px]' : 'pr-[80px]'}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-stone-400">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                        <span className="truncate text-[14px] font-extrabold leading-none text-stone-700">
                                            {t(`instruments.${track.type}`)}
                                        </span>
                                    </div>
                                    <div className="pointer-events-none absolute right-0 top-[-6px] flex h-14 w-[155px] shrink-0 items-center justify-end overflow-hidden">
                                        <img
                                            src={DEMO_INSTRUMENTS[track.type].src}
                                            alt=""
                                            aria-hidden="true"
                                            className={`transform select-none object-contain ${DEMO_INSTRUMENTS[track.type].className}`}
                                        />
                                    </div>
                                </div>

                                {/* Knobs — live */}
                                {!compact && (
                                    <div className="relative flex h-11 w-[240px] shrink-0 select-none items-center justify-between px-2">
                                        <DemoKnob value={track.volume} min={0} max={100} defaultValue={80} onChange={(v) => updateParam(track.id, 'volume', v)} />
                                        <DemoKnob value={track.pan} min={-50} max={50} defaultValue={0} onChange={(v) => updateParam(track.id, 'pan', v)} />
                                        <DemoKnob value={track.eq} min={-12} max={12} defaultValue={0} onChange={(v) => updateParam(track.id, 'eq', v)} />
                                        <DemoKnob value={track.reverb} min={0} max={100} defaultValue={0} onChange={(v) => updateParam(track.id, 'reverb', v)} />
                                        <button
                                            type="button"
                                            onClick={() => updateParam(track.id, 'compressor', !track.compressor)}
                                            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all active:scale-95 ${
                                                track.compressor
                                                    ? 'border-stone-200/80 bg-white shadow-[0_2.5px_6px_rgba(0,0,0,0.07)]'
                                                    : 'border-stone-200/40 bg-[#F5F4F0] shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.06)]'
                                            }`}
                                        >
                                            <span className={`select-none text-[12px] font-bold tracking-wide ${track.compressor ? 'text-stone-600' : 'text-stone-400'}`}>
                                                {track.compressor ? 'ON' : 'OFF'}
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* The timeline. min-w-0 is load-bearing: the
                                    ticks are shrink-0, so without it the strip's
                                    min-content becomes the timeline's floor and
                                    the whole row pushes past the card.

                                    The first two rows carry the recording takes:
                                    bars behind the sweep rise red and jitter like
                                    a level meter, settle black once the take is
                                    done, and rows past the second (the added
                                    piano) stay empty ticks. */}
                                <div className="h-11 min-w-0 flex-grow">
                                    <div
                                        ref={(el) => {
                                            timelineRefs.current[idx] = el;
                                        }}
                                        className="flex h-full w-full items-center overflow-hidden rounded-full border border-stone-200/50 bg-white px-1 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                                    >
                                        <div className="flex h-[28px] w-full items-center justify-between px-3">
                                            {(compact ? DEMO_WAVE_TICKS_COMPACT : DEMO_WAVE_TICKS).map((_, i) => {
                                                const rec = idx <= 1 ? recRows[idx] : null;
                                                const onTape = !!rec && i < rec.bars;
                                                const isRecording = rec?.state === 'recording';
                                                // 85 peaks, sampled sparser in compact
                                                // so both densities draw the same shape.
                                                const peak = REC_PEAKS[Math.floor(i * (REC_PEAKS.length / barCount))] ?? 0.2;
                                                return (
                                                    <div
                                                        key={i}
                                                        className="shrink-0 rounded-[2px]"
                                                        style={{
                                                            height: onTape ? `${Math.max(3, peak * 26)}px` : '3px',
                                                            width: '1.5px',
                                                            backgroundColor: onTape ? (isRecording ? '#FF4040' : '#44403c') : '#e6e4e2',
                                                            transition: 'background-color 450ms ease, height 200ms ease',
                                                            animation:
                                                                onTape && isRecording
                                                                    ? `demoRecPulse 640ms ease-in-out ${-((i * 97) % 640)}ms infinite`
                                                                    : undefined,
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Track options — passive */}
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100/80 text-stone-500 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                                        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                        <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                                    </svg>
                                </div>
                            </motion.div>
                        ))}

                        {/* Add track — the one thing the visitor can create here */}
                        {canAddTrack && (
                            <motion.div layout={cameraSettled} className={`flex w-full shrink-0 items-center justify-center ${compact ? 'h-14' : 'h-16'}`}>
                                <button
                                    type="button"
                                    onClick={() => setTracks((prev) => [...prev, DEMO_NEW_TRACK])}
                                    className={`flex items-center justify-center gap-1.5 rounded-full border border-dashed border-stone-300 bg-stone-100/40 font-medium text-stone-500 shadow-sm transition-all duration-200 hover:border-stone-400 hover:bg-stone-100/70 hover:text-stone-700 active:scale-[0.98] ${
                                        compact ? 'h-11 w-[200px] text-[14px]' : 'h-14 w-[260px] text-[16px]'
                                    }`}
                                >
                                    <Plus size={compact ? 17 : 20} className="stroke-[2.2] text-stone-500" />
                                    <span>{t('creative.add_track')}</span>
                                </button>
                            </motion.div>
                        )}
                    </div>

                    <div className="flex-grow" />

                    {/* Transport, at the bottom of the card */}
                    <div className="flex w-full flex-col gap-3">
                        {/* Utility pills and the time ruler — passive */}
                        {!compact && (
                            <div className="flex w-full select-none items-center gap-3 px-4 pb-3 pt-2">
                                {/* 460px is the track row's left column measured
                                    exactly — grip 20 + capsule 176 + knobs 240,
                                    plus the three 12px gaps — so the ruler below
                                    starts where the timelines above it start. */}
                                {/* Deliberately empty gray shapes — the utilities
                                    keep their footprints so the layout still
                                    reads as the studio, but carry no icons or
                                    text that could invite a click or compete
                                    with the live parts of the demo. */}
                                <div className="flex w-[460px] shrink-0 items-center gap-2.5">
                                    <div className="flex h-10 w-11 shrink-0 items-center justify-center">
                                        <div className="h-11 w-11 rounded-full border-2 border-stone-200/50 bg-stone-100/60" />
                                    </div>
                                    <div className="h-10 w-[155px] shrink-0 rounded-full border border-stone-200/60 bg-stone-100/60" />
                                    <div className="h-10 w-[72px] shrink-0 rounded-full border border-stone-200/60 bg-stone-100/60" />
                                    <div className="h-10 w-10 shrink-0 rounded-full border border-stone-200/60 bg-stone-100/60" />
                                </div>

                                <div className="h-10 flex-grow rounded-full border border-stone-250/20 bg-stone-100/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]" />
                                <div className="w-8 shrink-0" />
                            </div>
                        )}

                        <div className="my-1 h-[1px] w-full bg-stone-200/50" />

                        {/* Compact keeps the same five controls but stacks them:
                            side by side they need ~400px and the compact card
                            only ever has ~330px to give. */}
                        {(() => {
                            const pill = compact ? 'px-3.5 py-2 text-[11px]' : 'px-8 py-3.5 text-[15px]';

                            // Show/hide lyrics — live
                            const lyricsButton = (
                                <button
                                    type="button"
                                    onClick={() => setShowLyrics((prev) => !prev)}
                                    className={`flex items-center justify-center rounded-full border font-bold shadow-[0_1.5px_4px_rgba(0,0,0,0.05)] transition-all active:scale-95 ${pill} ${
                                        showLyrics
                                            ? 'border-[#D2D1C9] bg-[#E5E4DE] text-stone-700 hover:bg-[#DAD9D2]'
                                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50/50'
                                    }`}
                                >
                                    {showLyrics ? t('creative.hide_lyrics') : t('creative.show_lyrics')}
                                </button>
                            );

                            // REC and Play — empty gray shapes at the real
                            // buttons' footprints (content sizing is gone, so
                            // the widths are written out).
                            const transportButtons = (
                                <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-3'}`}>
                                    <div className={`${passiveButton} ${compact ? 'h-[33px] w-16' : 'h-[50px] w-[110px]'}`} />
                                    <div className={`${passiveButton} ${compact ? 'h-[33px] w-24' : 'h-[50px] w-[170px]'}`} />
                                </div>
                            );

                            // Send to canvas and the export menu — same
                            const sendButtons = (
                                <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
                                    <div className={`${passiveButton} ${compact ? 'h-[33px] w-24' : 'h-[50px] w-[180px]'}`} />
                                    <div className={`${passiveButton} ${compact ? 'h-8 w-8' : 'h-12 w-12'}`} />
                                </div>
                            );

                            // Compact keeps all five controls but stacks them into
                            // two rows: side by side they need ~400px and the
                            // compact card only ever has ~330px to give.
                            return compact ? (
                                <div className="flex w-full flex-col gap-2.5 px-1 pb-1">
                                    <div className="flex items-center justify-center">{transportButtons}</div>
                                    <div className="flex items-center justify-between gap-2">
                                        {lyricsButton}
                                        {sendButtons}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex w-full items-center justify-between gap-2 px-4 pb-1">
                                    {lyricsButton}
                                    {transportButtons}
                                    {sendButtons}
                                </div>
                            );
                        })()}
                    </div>

                </div>
                </motion.div>
            </div>
        </div>
    );
};

const PublishArt = () => (
    <Panel className="mx-auto flex h-full w-full max-w-sm flex-col items-center justify-center gap-6 p-6">
        <div className="h-20 w-20 rounded-full bg-gradient-to-r from-stone-300 to-stone-100" />
        <div className="flex items-center gap-2.5">
            <Heart className="h-5 w-5 fill-[#E4A0B7] text-[#E4A0B7]" />
            <Bar w="w-16" />
        </div>
    </Panel>
);

const OwnArt = () => (
    <Panel className="mx-auto flex h-full w-full max-w-sm flex-col justify-center gap-4 p-6">
        <div className="space-y-2">
            <Bar w="w-3/4" tone="bg-stone-300" />
            <Bar w="w-1/2" />
        </div>
        <div className="h-px bg-stone-200" />
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#86BE7F]/30" />
            <Bar w="w-28" />
        </div>
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-stone-200" />
            <Bar w="w-20" />
        </div>
    </Panel>
);

const SLIDES: IntroSlide[] = [
    { id: 'psychology', image: null, Art: PsychologyArt },
    { id: 'modern_way', image: null, Art: ModernWayArt },
    { id: 'tools', image: null, Art: CreateCanvasArt },
    { id: 'collab', image: null, Art: StudioDemoArt },
    { id: 'publish', image: null, Art: PublishArt },
    { id: 'own', image: null, Art: OwnArt },
];

export default function IntroCarousel({ onComplete, startAtEnd = false }: {
    onComplete: () => void;
    // True when the user backed out of the quiz — the carousel opens on its
    // last slide so the journey reverses step for step.
    startAtEnd?: boolean;
}) {
    const { t } = useLanguage();
    const [index, setIndex] = useState(startAtEnd ? SLIDES.length - 1 : 0);
    // Which shape on the modern_way slide the pointer is over, if any — the
    // headline swaps to that shape's own line while it's hovered.
    const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);

    const slide = SLIDES[index];
    const isLast = index === SLIDES.length - 1;
    const title = hoveredBubble
        ? t(`onboarding.intro.slides.modern_way.hover_titles.${hoveredBubble}`)
        : t(`onboarding.intro.slides.${slide.id}.title`);

    const goTo = (next: number) => {
        // A hover can't outlive its slide — without this, leaving via
        // keyboard/tap while a shape is hovered would strand the headline
        // on that shape's line.
        setHoveredBubble(null);
        setIndex(next);
    };

    const handleNext = () => {
        if (isLast) {
            onComplete();
            return;
        }
        goTo(index + 1);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
        >
            {/* One frame for all six slides: same width, same padding, same
                height. The height isn't set here — it falls out of the parts,
                because every slide stacks the same fixed-height title block on
                the same fixed-height art box (below) inside the same padding,
                so the box physically cannot change size between steps. Each
                slide's artwork then fits itself INSIDE the art box instead of
                dictating the frame's shape the way it used to. */}
            <div
                className="overflow-hidden rounded-[28px] border border-stone-200/70 bg-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.02)] px-4 py-10 md:px-8 md:py-12"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-10"
                    >
                        {/* The headline rolls like a counter when it changes —
                            the outgoing line slides up and out while the
                            incoming one rises in from below, clipped to the
                            h2. popLayout takes the exiting line out of flow so
                            the two can pass each other. Fixed two-line height
                            so the layout never jumps between 1- and 2-line
                            titles. */}
                        {/* `relative` is load-bearing: popLayout takes the
                            outgoing line out of flow with position:absolute, and
                            an absolutely-positioned element is only clipped by an
                            ancestor's overflow if that ancestor is its containing
                            block. Without this the containing block is the page's
                            <main>, and the exiting line flies up over the artwork
                            in plain sight instead of disappearing into the h2. */}
                        <h2 className="relative mx-auto max-w-md overflow-hidden px-6 text-center text-3xl font-sans font-light leading-[1.1] tracking-tight text-[#363636] md:text-[2.75rem]">
                            <span className="grid min-h-[2.2em] place-items-center">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    <motion.span
                                        key={title}
                                        initial={{ y: '120%', opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: '-120%', opacity: 0 }}
                                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        className="block"
                                    >
                                        {title}
                                    </motion.span>
                                </AnimatePresence>
                            </span>
                        </h2>
                        {/* The art box: one fixed height on every slide, which
                            is what holds the frame constant. Each artwork keeps
                            its own aspect ratio INSIDE it — `h-full` plus an
                            aspect-ratio makes the browser derive the width from
                            the height, and `max-w-full` caps it on narrow
                            screens (where the art simply ends up shorter than
                            the box, anchored to its top edge). The shapes slide
                            keeps its design canvas's own 901:646 and the two
                            demos their authored surfaces, so nothing is ever
                            squashed to fit. */}
                        <div className="h-[240px] w-full sm:h-[320px] md:h-[440px]">
                            <div
                                className={`mx-auto h-full max-w-full ${
                                    slide.id === 'tools'
                                        ? 'aspect-[880/520]'
                                        : slide.id === 'collab'
                                            // Two ratios for the studio demo's two
                                            // authored surfaces: compact below md,
                                            // full mixer above it.
                                            ? 'aspect-[560/440] md:aspect-[1180/640]'
                                            : slide.id === 'modern_way'
                                                ? ''
                                                : 'w-full'
                                }`}
                                style={
                                    slide.id === 'modern_way'
                                        ? { aspectRatio: '901 / 646' }
                                        : undefined
                                }
                            >
                                {slide.image ? (
                                    <img src={slide.image} alt={title} className="h-full w-full object-contain" />
                                ) : (
                                    <slide.Art onBubbleHover={setHoveredBubble} />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Back on the left, dots in the middle, Next on the right — the
                same seats these controls hold in the quiz that follows, so the
                hand doesn't have to relearn the page between steps. The Back
                slot keeps its width on the first slide so the dots don't shift
                when the button appears. */}
            <div className="flex items-center justify-between gap-4">
                <div className="w-[34px] shrink-0">
                    {index > 0 && (
                        <button
                            type="button"
                            onClick={() => goTo(index - 1)}
                            aria-label={t('onboarding.go_back')}
                            className="flex items-center justify-center rounded-full border border-stone-300 bg-white/40 p-2 text-stone-600 shadow-sm transition-all hover:border-stone-400 hover:bg-white hover:text-stone-900"
                        >
                            <ArrowLeft size={16} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {SLIDES.map((s, i) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={t(`onboarding.intro.slides.${s.id}.title`)}
                            aria-current={i === index}
                            className={`h-2 w-2 rounded-full transition-all duration-300 ${
                                i === index ? 'scale-110 bg-stone-800' : 'bg-stone-400/50 hover:bg-stone-500/60'
                            }`}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-full bg-[#86BE7F] px-6 py-3.5 text-base font-semibold text-stone-900 shadow-sm transition-all hover:opacity-95 active:scale-[0.98] sm:px-10"
                >
                    {isLast ? t('onboarding.intro.get_started') : t('onboarding.intro.next')}
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                </button>
            </div>
        </motion.div>
    );
}
