"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Heart, Loader2, MessageSquare, MoreHorizontal, Pause, Plus, Repeat } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

// The five screens that run before the quiz. Titles are looked up under
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

// The institution marks are their own SVG files rather than inline markup, so
// they stay byte-identical to what was supplied and can be swapped without
// touching this component.
// Where the claim comes from — Harvard Health Publishing, the same institution
// as the first mark below it.
const SCIENCE_SOURCE = 'https://www.health.harvard.edu/blog/why-is-music-good-for-the-brain-2020100721062';

// The highlighter that draws itself across the claim.
//
// A background gradient whose width is animated, not an SVG stroke: the phrase
// is live text that rewraps with the language and the viewport, and a drawn
// path would have to be re-measured every time it did. A background follows the
// text for free, and clips to each line if the phrase ever wraps.
//
// The stop positions put the band across the lower two-thirds of the line
// rather than behind the whole of it, which is where a real marker lands — over
// the x-height, with the ascenders standing clear above it.
// Held back from the solid ink so the words stay the thing being read and the
// mark stays behind them — a full-strength band competes with its own text.
const MARKER_COLOR = 'rgba(220, 242, 60, 0.55)';
// Taller than a strict x-height band: it now starts above the lowercase and
// runs past the baseline, which is how a real marker overshoots.
const MARKER_BAND = `linear-gradient(transparent 22%, ${MARKER_COLOR} 22%, ${MARKER_COLOR} 100%)`;
// Long enough to read as a hand drawing it rather than a box appearing.
const MARKER_SWEEP_MS = 900;
// A beat after the step arrives, so the eye has landed on the sentence before
// the emphasis moves under it.
const MARKER_DELAY_MS = 650;

const SCIENCE_LOGOS = [
    { src: '/onboarding-cards/logo-harvard-medical.svg', alt: 'Harvard Medical School', className: 'h-[39px] md:h-[47px]' },
];

const PsychologyArt = () => {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();

    // Held in state rather than triggered by a CSS delay so the sweep starts
    // when the step is actually mounted. Reduced motion gets the finished
    // highlight on the first paint — the emphasis is the point, the drawing of
    // it is not — and `swept` is derived rather than set in the effect, so
    // nothing re-renders just to arrive at a value known during the first one.
    const [swept, setSwept] = useState(false);
    const marked = prefersReducedMotion || swept;

    useEffect(() => {
        if (prefersReducedMotion) return;
        const id = setTimeout(() => setSwept(true), MARKER_DELAY_MS);
        return () => clearTimeout(id);
    }, [prefersReducedMotion]);

    return (
        <div className="flex h-full w-full flex-col px-0 text-center">
            {/* A light container under the whole claim — the words, the quote and
                the mark. On the painted backdrop they were type floating on a
                gradient, with nothing saying where the statement began or ended;
                a pane of near-white gives it an edge to sit inside without
                turning it into a card that competes with the demo steps.

                Tinted white rather than frosted: `backdrop-filter` inside an
                ancestor that is overflow-hidden with a radius is the exact shape
                of the WebKit bug this carousel already hit once, where the
                composited layer draws against black instead of what is behind it.
                A plain alpha background composites normally everywhere. */}
            <div className="flex h-full w-full flex-col items-center justify-start gap-6 rounded-[28px] border border-white/40 bg-white/5 px-5 py-7 shadow-[0_8px_30px_rgba(0,0,0,0.02)] md:gap-8 md:px-10 md:py-8">
            <div className="space-y-4 md:space-y-5">
                {/* The claim. The second line carries the underline, so the
                    emphasis sits on the finding itself rather than on the whole
                    sentence — and it stays on the right words in every language
                    because the split is in the locale file, not a regex here. */}
                <p className="mx-auto max-w-[30ch] font-sans text-[28px] font-normal leading-[1.3] tracking-tight text-black md:text-[38px]">
                    {/* Each half is a block, so the line breaks where the copy
                        says it does instead of wherever the measure happens to
                        run out — which would move with the font, the width and
                        the language. */}
                    <span className="block">{t('onboarding.intro.slides.psychology.science.claim_lead')}</span>
                    {/* The underlined half is the citation: the emphasis and the
                        source are the same words, rather than a footnote under
                        the quote that nobody follows. */}
                    {/* `inline-block`, not `block`: the marker is this
                        element's own background, so a full-width box would
                        stripe the whole line rather than the words. The
                        preceding span is a block, which is what still puts this
                        on its own line. */}
                    <a
                        href={SCIENCE_SOURCE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block underline decoration-black/80 decoration-[1.5px] underline-offset-[6px] transition-opacity hover:opacity-70"
                        style={{
                            backgroundImage: MARKER_BAND,
                            backgroundRepeat: 'no-repeat',
                            // Grows from the left edge, so it reads as a stroke
                            // travelling across rather than a panel fading up.
                            backgroundPosition: '0 0',
                            backgroundSize: marked ? '100% 100%' : '0% 100%',
                            transition: prefersReducedMotion
                                ? 'none'
                                : `background-size ${MARKER_SWEEP_MS}ms cubic-bezier(0.25, 0.8, 0.3, 1)`,
                        }}
                    >
                        {t('onboarding.intro.slides.psychology.science.claim_stress')}
                    </a>
                </p>

                {/* The finding, set as a pull quote — the mark is decorative and
                    sits outside the flow so the text block keeps a straight left
                    edge instead of being indented by its own punctuation. */}
                <figure className="relative mx-auto max-w-[38rem] pl-10 text-left md:pl-[52px]">
                    {/* The supplied mark rather than a typographic quote: a
                        text " is the serif face's glyph and would drift with
                        whatever font loads, where this is fixed artwork. Sized
                        in px so it stays put against the quote's own scale. */}
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 36 29"
                        fill="none"
                        className="absolute left-0 top-[5px] h-auto w-[29px] md:top-[7px] md:w-[36px]"
                    >
                        <path d="M20.1113 20.854C20.1113 16.4719 23.6638 12.9195 28.0459 12.9195C32.428 12.9195 35.9805 16.4719 35.9805 20.854C35.9805 25.2361 32.428 28.7886 28.0459 28.7886C23.6638 28.7886 20.1113 25.2361 20.1113 20.854Z" fill="black"/>
                        <path d="M20.1414 21.8638C20.0755 16.1847 20.0023 4.84471 31.4284 9.97538e-05L33.1445 4.04763C24.677 7.63784 24.4684 15.8189 24.5379 21.8122L20.1414 21.8638Z" fill="black"/>
                        <path d="M0.000593677 20.8533C0.000594062 16.4557 3.56557 12.8907 7.96319 12.8907C12.3608 12.8907 15.9258 16.4557 15.9258 20.8533C15.9258 25.2509 12.3608 28.8159 7.96319 28.8159C3.56557 28.8159 0.000593293 25.2509 0.000593677 20.8533Z" fill="black"/>
                        <path d="M0.0242075 21.8638C-0.0417026 16.1847 -0.114908 4.84471 11.3112 9.97538e-05L13.0273 4.04763C4.55977 7.63784 4.35119 15.8189 4.42074 21.8122L0.0242075 21.8638Z" fill="black"/>
                    </svg>
                    <blockquote className="whitespace-pre-line font-sans text-[18px] font-normal leading-[1.55] text-black md:text-[23px]">
                        {t('onboarding.intro.slides.psychology.science.quote')}
                    </blockquote>
                </figure>
            </div>

            {/* Pushed to the foot of the box, so the slack in a box sized for
                    the demo steps falls between the quote and the marks rather
                    than under them — which also puts the space below the logos
                    inside the pane's own bottom padding, the same as the sides. */}
                <div className="mt-auto w-full">
                    {/* Centred. `justify-between` was right while there were two
                        marks to spread to the edges; with one it just pins that
                        mark to the left. */}
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                    {SCIENCE_LOGOS.map((logo) => (
                        <img
                            key={logo.src}
                            src={logo.src}
                            alt={logo.alt}
                            className={`w-auto ${logo.className}`}
                        />
                    ))}
                </div>
                </div>
            </div>
        </div>
    );
};

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
// How far the pile is allowed to run past the bottom of its crop, in the
// scene's own user units.
//
// The lowest point in the composition is the teal capsule's rounded tip — a
// single tangent point. Cropping to it puts the *tip* on the frame's edge and
// leaves every flat-bottomed shape beside it floating ten units clear, which
// reads as the pile hovering rather than resting. Cropping to where the flat
// bottoms actually sit instead lands them on the edge and lets the capsule's
// tip bleed the difference, where the frame's own overflow clip takes it.
const SCENE_FLOOR_BLEED = 10;

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
    /**
     * How the lines sit against each other, not against the shape. Left is the
     * default and what the design uses almost everywhere; the crescent is set
     * as a banner following its arc, so its lines centre on one another.
     */
    align?: 'left' | 'center';
}> = [
    { key: 'master_lyrics', x: 50, y: 325, rotateDeg: 5, fontPx: 36, linePx: 39 },
    { key: 'tell_stories', x: 328, y: 501, rotateDeg: 0, fontPx: 31, linePx: 34.5 },
    { key: 'unlocked_creativity', x: 493, y: 466, rotateDeg: -7.18, fontPx: 33, linePx: 35 },
    { key: 'expanded_skills', x: 296, y: 331, rotateDeg: 0, fontPx: 38, linePx: 48 },
    { key: 'deeper_expertise', x: 27, y: 539, rotateDeg: -5.5, fontPx: 32, linePx: 34 },
    { key: 'ignite_imagination', x: 693, y: 528.6, rotateDeg: 0, fontPx: 34, linePx: 36 },
    // The only centred label, so the only one whose x/y is a middle rather
    // than a top-left. Taken from the centre of the outlined label the design
    // itself set on this arc — the band's own midline, not the shape's
    // bounding-box centre, which for a crescent falls in the empty bite.
    { key: 'see_life', x: 737, y: 338, rotateDeg: 24.3, fontPx: 38, linePx: 43, align: 'center' },
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
            // Scale to the box's width and sit on its floor. Cropped to the
            // artwork (below) the pile is much wider than it is tall, so width
            // is always the binding dimension — which is what carries it out to
            // both side edges — and YMax parks it on the bottom instead of
            // centring it with a gap underneath. The room left over is above,
            // which is where the headline already sits.
            svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
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
                shapes.push(g);
            }

            // replaceChildren keeps a StrictMode double-mount from stacking two
            // copies of the scene.
            host.replaceChildren(svg);

            // Crop the canvas down to the artwork. The design file reserves its
            // top ~38% for a title it never draws — that headline is set in real
            // type above the frame — so rendering the raw canvas stranded the
            // pile in the lower half with dead air around it. Cropping to the
            // shapes' own union makes the pile itself the picture. Measured
            // rather than hard-coded, so redrawn art re-crops itself.
            //
            // Measured on the wrapper `g`, and measured *before* the labels go
            // in — both deliberate. getBBox on an element ignores that
            // element's own `transform`, so asking the rotated rects directly
            // returns their unrotated boxes: three of these seven are rotated,
            // and the answer was out by ten user units, which cropped the left
            // edge off the blue blob and left a sliver under the pile. A parent
            // `g` has no transform of its own and reports its children with
            // theirs applied, which is the number wanted. Labels are added in
            // the second pass below so they can't widen this.
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const g of shapes) {
                const b = g.getBBox();
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
            }
            if (!Number.isFinite(minX)) return;
            svg.setAttribute(
                'viewBox',
                `${minX} ${minY} ${maxX - minX} ${maxY - minY - SCENE_FLOOR_BLEED}`,
            );

            shapes.forEach((g, shapeIndex) => {
                const spec = SCENE_LABELS[shapeIndex];
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
                    // inline-block is what makes centring mean "centre the
                    // lines on each other" — a block would fill the
                    // foreignObject's fixed width and centre against that
                    // instead, throwing the label off its shape entirely.
                    div.style.display = 'inline-block';
                    div.style.textAlign = spec.align ?? 'left';
                    // The locale string's own newlines are the line breaks.
                    div.style.whiteSpace = 'pre-line';
                    div.textContent = t(`onboarding.intro.slides.modern_way.labels.${spec.key}`);
                    fo.appendChild(div);
                    g.appendChild(fo);

                    // A centred label centres on its anchor, not just on
                    // itself. `align` alone only sets the lines against each
                    // other — the block still grows down and to the right from
                    // `x`/`y`, so a longer string drifts off the shape, which is
                    // what happens whenever the copy or the language changes.
                    // Backing off half the measured size on both axes makes
                    // `x`/`y` the block's true middle, so it stays put however
                    // many lines a translation runs to. The extra translate
                    // comes after the rotate so it runs along the label's own
                    // axis rather than the canvas's, and a foreignObject's
                    // offsetWidth/Height are already in user units, so they
                    // need no unscaling.
                    if (spec.align === 'center') {
                        fo.setAttribute(
                            'transform',
                            `translate(${spec.x} ${spec.y}) rotate(${spec.rotateDeg}) translate(${-div.offsetWidth / 2} ${-div.offsetHeight / 2})`,
                        );
                    }
                }
            });

            if (prefersReducedMotion) return; // already at rest as parsed

            // Bottom of the pile first, so the scene visibly builds upward
            // rather than arriving all at once. Each shape starts just clear of
            // the crop's top edge — measured from the crop rather than the
            // canvas origin, so every shape falls the same short distance
            // instead of one scaled to wherever it happens to sit.
            const bodies = shapes
                .map((g) => {
                    const box = g.getBBox();
                    return { g, bottom: box.y + box.height };
                })
                .sort((a, b) => b.bottom - a.bottom)
                .map((b, rank) => ({
                    g: b.g,
                    delay: rank * SCENE_STAGGER_MS,
                    y: -(b.bottom - minY + 24),
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
// the slide, its horizon illustration still on it, caret blinking, with the
// canvas's own toolbar already docked underneath. Nothing arrives later — the
// tools are the slide's promise, so they are on screen from the first frame and
// never move.
//
// What moves is the work, in two scenes on the one canvas, looping:
//
//   1. Reading. A photo of a handwritten page is dropped onto the canvas and
//      scanned where it lies, and it gives up its lines. This opens the slide
//      because it's the shortest distance from "I have lyrics somewhere" to
//      "they're on the canvas" — nothing to sit through first.
//
//   2. Writing. The canvas clears. A line goes down by hand, REC lights up and
//      a take is recorded with the meter live under it; the card it becomes
//      docks into the flow (cards live inside the lyric flow, not beside it)
//      and then transcribes itself, and the words it was carrying land
//      underneath.
//
//   3. Tools. The toolbox opens over the canvas: the tuner turns to the note
//      it hears and settles in tune, then tap tempo takes a few taps. Finally
//      Complete is pressed and the canvas is saved.
//
// One verse, three ways in — photographed, typed, sung — which is the actual
// claim being made, rather than a list of buttons. The scenes never share the
// canvas: each clears out completely before the next arrives, so each is read
// on its own.
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
const CANVAS_W = 800;
// The camera, in two nested moves, because one alone could never do it. The
// frame is a fixed 880x520 box: a card that fills it cannot grow inside it, so
// scaling the card is capped at the margin it has to grow into, and that cap is
// a few percent. Scaling only the content gets as close as you like but leaves
// the card sitting still around it, which is not a camera move.
//
// So both. The card pushes in to exactly the frame width — 800 to 880 — which
// is the most it can do without its own sides being cut, and the content pushes
// in further inside it. Everything on screen at any instant belongs to one of
// those two layers and scales with it, so nothing is ever a different size from
// the thing beside it.
//
// The origin sits near the top, so what overflows is the bottom — the margin
// under the card, then the last few pixels of the toolbar. That is the one edge
// allowed to be cropped.
const CANVAS_ZOOM = 1.09;
const CONTENT_ZOOM = 1.18;
// The camera pulls back a beat BEFORE the toolbox opens, so the panel does not
// arrive while the canvas is still moving under it. The pull-back runs for as
// long as this lead, so the two never overlap.
const ZOOM_OUT_LEAD = 420;

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
// What makes typing read as a person is the unevenness, not the speed. A fixed
// rate gave the first version away — characters arriving on a metronome read as
// a field being filled by a machine however slow you set the metronome — so
// every character gets its own delay, with an extra breath after each space.
// With that in place the rate itself can sit at a comfortable writing pace
// rather than a crawl; at ~92ms it was uneven AND laboured, and only the second
// of those was doing any work.
//
// The rhythm is generated, not random: the same line always types the same way,
// so nothing flickers between renders and a language switch just re-derives it.
const TYPE_BASE_MS = 42;
const TYPE_WORD_PAUSE_MS = 80;

const charTimes = (line: string, seed: number) => {
    const times: number[] = [];
    let at = 0;
    for (let i = 0; i < line.length; i++) {
        // Cheap hash → a stable 0..1 per (line, character).
        const h = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
        const r = h - Math.floor(h);
        at += TYPE_BASE_MS * (0.55 + r * 1.0);
        // The pause lands on the character AFTER a space, i.e. between words.
        if (i > 0 && line[i - 1] === ' ') at += TYPE_WORD_PAUSE_MS * (0.4 + r);
        times.push(at);
    }
    return times;
};

const lineDuration = (times: number[]) => times[times.length - 1] ?? 0;

// A held beat on the bare canvas before anything is typed — long enough to take
// in what this starts from: an empty sheet with the horizon illustration still
// on it and the full toolbar underneath. It is the opening shot, not a pause.
const EMPTY_HOLD = 220;
// The canvas names itself while the first line is going down — the way the app
// does when you start writing without naming anything. It fades up quietly
// behind the writing rather than typing itself, because a second caret in the
// header would pull the eye straight off the lyrics.
const TITLE_AFTER = 1300;

// --- Scene one: one line by hand, then one by voice ---------------------------
// REC lights up a beat after the line is down, runs, and the capsule it produces
// drops into the flow the moment it stops. The card has to visibly come FROM the
// toolbar button, or it's just another element fading in. The take is long
// enough to watch — a recording that's over before you've registered it started
// is just a flicker. Then the card transcribes itself, and the words it was
// carrying land on the canvas under it.
const BEFORE_REC = 180;
const REC_RUN = 1800;
const AFTER_CAPSULE = 240;
const TRANSCRIBE_RUN = 1200;
const AFTER_TRANSCRIPT = 420;

// --- Act one: a page dropped in and read ---------------------------------------
// The scan starts as the page lands rather than after a beat of it sitting
// there: the pause read as the demo waiting for something, and there is nothing
// to look at between the drop and the sweep. One pass of the sweep, not the
// app's 3s round trip — the band crosses the page once and the words are there.
// The page lands already being scanned — nothing in between, because a page
// sitting there untouched is the demo waiting for something.
//
// The pause that used to be here existed to stop two animations fighting: the
// scan lights a glow around the page's edge, and lighting an edge that was still
// moving into place was the flash. The fix now is that the glow fades up over
// exactly the arrival, so the two move together rather than one landing on top
// of the other. The arrival is shorter for the same reason, and a tween rather
// than a spring — a spring with any life in it overshoots, and an overshoot
// under a glow reads as a flicker at this size.
const PHOTO_IN_MS = 380;
const PHOTO_SETTLE = 0;
// Whatever is being worked on is shown at full size, and steps back once it has
// given up what it was holding: the page after the scan, the recording after the
// transcription. It reads as attention moving on rather than as things shrinking
// — and it is transform only, so nothing below either of them ever moves.
//
// The page steps back further than the card because it is the larger object; the
// same ratio on a 54px pill would barely register.
// The page is held large for the whole scan and drops back to its own size once
// the words are out of it. 1.45 is close to the ceiling: the growth is anchored
// to the top of the page (see transformOrigin below) so it expands downward into
// the space the extracted lines will occupy, and at this scale its lower edge
// lands about 30px short of the bottom of the window. Anchored at the centre
// instead, anything past about 1.09 would have its top clipped.
const PHOTO_SCAN_SCALE = 1.45;
const PHOTO_DONE_SCALE = 1;
const CARD_DONE_SCALE = 0.94;
const WORK_SETTLE_MS = 520;
// Long enough for the edge to run out and back once and the shimmer to cross
// twice — under a second and neither has time to register as anything.
const SCAN_RUN = 1600;
const AFTER_EXTRACT = 620;

// --- Moving down the canvas ----------------------------------------------------
// Between acts nothing is cleared: the canvas scrolls on to fresh space, the way
// it does when you keep writing down one. One screen per scroll, and the scroll
// itself is the transition — there is no gap on either side of it.
const SCROLL_MS = 700;
// How much of the previous screen stays showing after the scroll. A lyric line
// is 42px, so this leaves most of the last one clipped along the top edge —
// enough to read as the same canvas continuing, not enough to compete with what
// is happening below it.
const SCROLL_PEEK = 34;
// A beat of blank canvas before the writing starts, so the second act doesn't
// open mid-sentence.
const WRITE_OPEN = 120;

// --- The toolbox, over the top of the same canvas -------------------------------
// The panel opens over what was just written — which stays visible around it and
// is still there when the panel closes. The tuner finds its note and settles in
// tune, then tap tempo takes a few taps. A glimpse of each, not a tour.
const TOOLS_OPEN = 0;
// The dial stays on one note and the needle does the work: it opens well flat,
// overshoots sharp, and settles dead centre — a string being brought up to
// pitch. It used to turn the ring from A round to E as well, which looked
// better in the abstract but was wrong in every frame it was caught in: the
// wedge marks the note being read, so a ring mid-travel put a note under the
// marker that the needle wasn't reading. Note and needle now agree throughout,
// and every frame of it is a state a real tuner could be in.
// One move, and the whole dial makes it together: it opens holding A and reading
// well sharp, then the ring turns to the low E actually being played while the
// needle swings from sharp to just under pitch. Both start at the same instant
// and land at the same instant — see the matched transitions in DemoTunerDial.
//
// Simplified down to this from a five-step settle. Every extra step was another
// chance for the two halves of the dial to be caught disagreeing, and none of
// them said anything the single move doesn't.
//
// Both readings are real: A2 is 110Hz and low E 82.41Hz, bent by c cents as
// f·2^(c/1200), so the number, the note and the needle are one statement.
const TUNER_STEPS = [
    { at: 0, note: 0, cents: 26, hz: '111.7' },
    { at: 250, note: 7, cents: -2, hz: '82.3' },
] as const;
const TUNER_RUN = 2000;
const TAP_INTERVAL = 420;
// What the taps read out. Four presses settling on a tempo, the way tapping one
// in actually goes.
const TAP_BPM = [72, 86, 92, 94] as const;
// The pad's own four colours, from handleTapTempo in the create canvas. The app
// picks the next one at random; the demo walks them in order, because a scripted
// scene that reshuffles itself on every loop reads as a glitch.
const TAP_TINTS = ['#FBFFED', '#EDFF8E', '#ADCDC0', '#86BE7F'] as const;
const TEMPO_RUN = 1900;
const TOOLS_CLOSE = 240;

// --- The finish: Complete -------------------------------------------------------
// The panel closes onto the canvas it was covering, that canvas is saved — the
// travelling gradient runs round its outline and the toast lands at the top —
// and then the demo scrolls on down to blank canvas, which is where the loop
// starts over. Both ends of the loop are empty, so the rewind is invisible and
// needs no pause around it.
const BEFORE_SAVE = 120;
const SAVE_RUN = 1800;
// Everything after the save used to be a scroll down to a blank screen and a
// hold on it. The wrap does not need either: the reset and the snap back to the
// top happen in the same frame, and the top of the canvas is blank right then,
// so the seam is invisible on its own. This is only a beat to register that the
// canvas was saved.
const AFTER_SAVE = 100;
// Then the canvas keeps going the way it has been going all along: one more
// screen down, which carries the work up and off the top and leaves blank
// canvas behind it. That blank screen is where the loop restarts, so the jump
// home has nothing on it to see — no fade needed to cover the reset, because
// there is nothing on screen at the moment it happens.
//
// It used to rewind instead, scrolling back up through the work to the top.
// That put the finished canvas back on screen for the last half second of
// every pass, which is the opposite of an ending.

// The top of the canvas, untouched: unnamed, nothing on it, nothing recorded.
// The toolbar isn't in here — it is never absent. Held at module scope so it's
// referentially stable; the rAF loop below bails out of committing when the
// state hasn't actually changed.
const DEMO_START_STATE = {
    view: 0,
    title: false,
    typedChars: 0,
    recording: false,
    capsule: false,
    transcribing: false,
    transcript: false,
    photo: false,
    scanning: false,
    extracted: false,
    zoom: false,
    tools: false,
    tempo: false,
    tunerStep: 0,
    taps: 0,
    saving: false,
    caret: true,
};

const Caret = () => (
    <span className="ml-[2px] inline-block h-[0.95em] w-[2px] translate-y-[0.14em] bg-stone-400 motion-safe:animate-pulse" />
);

// --- The guitar tuner, as the toolbox actually draws it ------------------------
// Same 600×295 dial as renderGuitarTuner in app/platform/create/page.tsx, down to
// the numbers: ticks on a 235 radius spanning ±75°, the note ring at 210/100 with
// its labels at 155 counter-rotated to stay upright, the red needle at the top,
// and the pale wedge marking dead centre. The rotations use the app's own
// transitions — 1.2s for the ring, 0.5s for the needle — because that unhurried
// swing IS what the tuner looks like in use.
//
// Only the ±20 cent numerals are dropped: at the size this plays back they'd be
// two pixels tall.
const TUNER_NOTES = ['A', 'B♭', 'B', 'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭'];
const TUNER_CENTRE_Y = 295;
// Where the hub's reading sits — the app pushes it 35px above the dial's centre
// so it lands in the middle of the visible dome rather than the whole circle.
const TUNER_CONTENT_Y = TUNER_CENTRE_Y - 35;

const polar = (cx: number, cy: number, r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

const wedgePath = (cx: number, cy: number, r: number, from: number, to: number) => {
    const start = polar(cx, cy, r, to);
    const end = polar(cx, cy, r, from);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 0 0 ${end.x} ${end.y}`;
};

const DemoTunerDial = ({ noteIndex, cents, hz }: { noteIndex: number; cents: number; hz: string }) => {
    const ringRotation = 90 - noteIndex * 30;
    const needleAngle = (Math.max(-30, Math.min(30, cents)) / 20) * 50;

    return (
        // No overflow-visible: the dial is a full circle centred ON the bottom
        // edge, so everything below y=295 has to be clipped away by the viewBox.
        // Left to spill it hangs the lower half of the note ring over the tab row
        // and out through the toolbar. The app clips it the same way.
        <svg viewBox="0 0 600 295" fill="none" className="h-full w-full" aria-hidden="true">
            <defs>
                <linearGradient id="demoTunerFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                </linearGradient>
            </defs>
            {/* Fine-tuning arc: ticks fading out towards the extremes */}
            {Array.from({ length: 61 }).map((_, idx) => {
                const angle = -75 + idx * 2.5;
                const isCentre = idx === 30;
                const isMajor = idx % 5 === 0;
                const len = isCentre ? 28 : isMajor ? 20 : 11;
                const start = polar(300, TUNER_CENTRE_Y, 235, angle);
                const end = polar(300, TUNER_CENTRE_Y, 235 + len, angle);
                const opacity = Math.max(0.08, Math.cos((Math.abs(idx - 30) / 30) * Math.PI * 0.46));

                return (
                    <line
                        key={idx}
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={isCentre ? '#1C1917' : isMajor ? '#78716C' : '#D6D3D1'}
                        strokeWidth={isCentre ? 2.5 : isMajor ? 1.5 : 0.8}
                        strokeOpacity={opacity}
                    />
                );
            })}

            {/* The needle, reading how far off the note is. On the app's own dial
                this moves in 0.5s while the ring takes 1.2s, which is right when
                the two are reacting to a live signal independently. Here they are
                one scripted move, so the needle is given the ring's duration and
                easing exactly: they leave together and arrive together, rather
                than the needle finishing early and sitting still while the ring
                is still turning under it. */}
            <g
                style={{
                    transform: `rotate(${needleAngle}deg)`,
                    transformOrigin: `300px ${TUNER_CENTRE_Y}px`,
                    transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <line x1="300" y1="70" x2="300" y2="40" stroke="#FF3F5A" strokeWidth="2.2" />
            </g>

            {/* Dead centre, marked */}
            <path
                d={wedgePath(300, TUNER_CENTRE_Y, 155, -15, 15)}
                fill="none"
                stroke="#F4F3EC"
                strokeWidth="110"
            />

            {/* The note ring, turning to bring the detected note to the top */}
            <g
                style={{
                    transform: `rotate(${ringRotation}deg)`,
                    transformOrigin: `300px ${TUNER_CENTRE_Y}px`,
                    transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <circle cx="300" cy={TUNER_CENTRE_Y} r="210" stroke="#EAEAEA" strokeWidth="1.5" fill="none" />
                <circle cx="300" cy={TUNER_CENTRE_Y} r="100" stroke="#EAEAEA" strokeWidth="1" fill="none" />

                {Array.from({ length: 120 }).map((_, idx) => {
                    const start = polar(300, TUNER_CENTRE_Y, 203, idx * 3);
                    const end = polar(300, TUNER_CENTRE_Y, 210, idx * 3);
                    return <line key={idx} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#EAEAEA" strokeWidth="1" />;
                })}

                {TUNER_NOTES.map((label, idx) => {
                    const pos = polar(300, TUNER_CENTRE_Y, 155, -90 + idx * 30);
                    const isActive = idx === noteIndex;
                    return (
                        <text
                            key={label}
                            x={pos.x}
                            y={pos.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{
                                transform: `rotate(${-ringRotation}deg)`,
                                transformOrigin: `${pos.x}px ${pos.y}px`,
                                transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            className={`font-sans text-[25px] transition-colors duration-300 ${
                                isActive ? 'fill-black font-extrabold' : 'fill-stone-400 font-bold'
                            }`}
                        >
                            {label.length > 1 ? (
                                <>
                                    {label[0]}
                                    <tspan dy="-6" dx="0.5" fontSize="55%" fontWeight="bold">
                                        {label[1]}
                                    </tspan>
                                </>
                            ) : (
                                label
                            )}
                        </text>
                    );
                })}
            </g>

            {/* The app's own fade into the bottom edge, so the ring and its
                labels dissolve rather than being sliced off by the viewBox. */}
            <rect x="0" y="215" width="600" height="80" fill="url(#demoTunerFade)" />

            {/* The hub, and the reading. Without this the dial was all dial and
                no instrument: ticks and a needle, but nothing anywhere saying
                what note it had found or how far off it was. This is the app's
                own active hub — dark disc, the note in white, its frequency
                beside it, and the green dot that says it's listening. */}
            <circle cx="300" cy={TUNER_CENTRE_Y} r="100" fill="#FFFFFF" stroke="#EAEAEA" strokeWidth="1" />
            <circle
                cx="300"
                cy={TUNER_CENTRE_Y}
                r="90"
                fill="#1C1917"
                className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            />
            <circle cx="268" cy={TUNER_CONTENT_Y} r="5.5" fill="#10B981" className="motion-safe:animate-pulse" />
            <text
                x="300"
                y={TUNER_CONTENT_Y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-sans text-[46px] font-black tracking-tight"
            >
                {TUNER_NOTES[noteIndex][0]}
            </text>
            <text
                x="318"
                y={TUNER_CONTENT_Y + 9}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-stone-400 font-sans text-[11.5px] font-bold tracking-tight"
            >
                {hz} HZ
            </text>
        </svg>
    );
};

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

    // The canvas names itself. A plain name rather than the clock time it used
    // to carry: a timestamp in the header invites you to read it, and there is
    // nothing there to read.
    const autoTitle = t('onboarding.intro.slides.tools.demo.project');

    const script = useMemo(() => {
        // Four lines of one verse, and none of them typed twice: the first two
        // are lifted off a photographed page, the third is written by hand, the
        // fourth is what the recording turns into.
        const lines = [
            t('onboarding.intro.slides.tools.demo.line_3'),
            t('onboarding.intro.slides.tools.demo.line_4'),
            t('onboarding.intro.slides.tools.demo.line_1'),
            t('onboarding.intro.slides.tools.demo.line_2'),
        ];

        // The one typed line carries its own per-character clock, so the pacing
        // is that line's own rhythm rather than a rate applied to it.
        const typed = charTimes(lines[2], 1);

        // --- Act one: a page dropped in, scanned, and read ---
        const photoAt = EMPTY_HOLD;
        const scanAt = photoAt + PHOTO_SETTLE;
        const extractAt = scanAt + SCAN_RUN;
        // WORK_SETTLE_MS is in here because the extracted lines wait for the page
        // to finish shrinking before they appear (see their delay) — without it
        // the canvas would scroll on while they were still arriving.
        const actOneEnd = extractAt + WORK_SETTLE_MS + AFTER_EXTRACT;

        // --- Act two: further down the same canvas, write and record ---
        const typeStart = actOneEnd + SCROLL_MS + WRITE_OPEN;
        const typeEnd = typeStart + lineDuration(typed);
        const recAt = typeEnd + BEFORE_REC;
        const capsuleAt = recAt + REC_RUN;
        const transcribeAt = capsuleAt + AFTER_CAPSULE;
        const transcriptAt = transcribeAt + TRANSCRIBE_RUN;
        const actTwoEnd = transcriptAt + AFTER_TRANSCRIPT;

        // --- The toolbox, over the top of that same canvas ---
        const toolsAt = actTwoEnd;
        const tunerAt = toolsAt + TOOLS_OPEN;
        const tempoAt = tunerAt + TUNER_RUN;
        const toolsCloseAt = tempoAt + TEMPO_RUN;

        // --- Complete, and straight back round ---
        const saveAt = toolsCloseAt + TOOLS_CLOSE + BEFORE_SAVE;
        const rewindAt = saveAt + SAVE_RUN + AFTER_SAVE;

        return {
            lines,
            typed,
            photoAt,
            scanAt,
            extractAt,
            actOneEnd,
            typeStart,
            recAt,
            capsuleAt,
            transcribeAt,
            transcriptAt,
            actTwoEnd,
            toolsAt,
            tunerAt,
            tempoAt,
            toolsCloseAt,
            saveAt,
            // The canvas names itself while the first thing is landing on it.
            titleAt: EMPTY_HOLD + TITLE_AFTER,
            rewindAt,
            end: rewindAt + SCROLL_MS,
        };
    }, [t]);

    // Reduced motion gets the canvas as it stands at the end of act one — the
    // page on it and the words already taken off — since that's the frame that
    // carries the slide on its own. The toolbox and the save are movement by
    // definition, so neither is worth freezing into a still.
    const finalState = useMemo(
        () => ({
            view: 0,
            title: true,
            typedChars: 0,
            recording: false,
            capsule: false,
            transcribing: false,
            transcript: false,
            photo: true,
            scanning: false,
            extracted: true,
            zoom: false,
            tools: false,
            tempo: false,
            tunerStep: TUNER_STEPS.length - 1,
            taps: TAP_BPM.length,
            saving: false,
            caret: false,
        }),
        [],
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

        // How many characters are down, given the line's own clock. Linear
        // rather than a binary search: the line is under 30 characters, and the
        // scan stops at the first one that hasn't landed yet.
        const charsAt = (local: number, times: number[]) => {
            if (local <= 0) return 0;
            let n = 0;
            while (n < times.length && times[n] <= local) n += 1;
            return n;
        };

        const tick = (now: number) => {
            // Wraps, so the canvas empties and fills itself again for as long as
            // the visitor sits on the slide. A demo that runs once and freezes
            // reads as a screenshot to anyone who arrives ten seconds late — and
            // this slide's whole claim is that things happen here.
            const elapsed = (now - start) % script.end;

            // Which stretch of canvas is in view. Nothing is ever cleared: the
            // canvas scrolls on to fresh space, the way it does when you keep
            // writing down one, and stays there until the loop wraps.
            // Back to the top for the rewind, so the last thing the loop does is
            // scroll up through the work rather than blink it away.
            // 0 the top of the canvas, 1 the writing, 2 the blank below it that
            // the loop restarts from.
            const view = elapsed >= script.rewindAt ? 2 : elapsed < script.actOneEnd ? 0 : 1;

            // Which step of the tuner's little performance we're on: it hears an
            // A well flat, turns to the E actually being played, and comes to
            // rest in tune.
            let tunerStep = 0;
            TUNER_STEPS.forEach((step, i) => {
                if (elapsed - script.tunerAt >= step.at) tunerStep = i;
            });

            const next = {
                view,
                title: elapsed >= script.titleAt,
                typedChars: charsAt(elapsed - script.typeStart, script.typed),
                recording: elapsed >= script.recAt && elapsed < script.capsuleAt,
                capsule: elapsed >= script.capsuleAt,
                transcribing: elapsed >= script.transcribeAt && elapsed < script.transcriptAt,
                transcript: elapsed >= script.transcriptAt,
                photo: elapsed >= script.photoAt,
                scanning: elapsed >= script.scanAt && elapsed < script.extractAt,
                extracted: elapsed >= script.extractAt,
                // Close in from the moment the canvas has scrolled to the
                // writing, and back out again as the toolbox opens — the panel
                // needs the whole card to sit in.
                zoom: elapsed >= script.actOneEnd && elapsed < script.toolsAt - ZOOM_OUT_LEAD,
                tools: elapsed >= script.toolsAt && elapsed < script.toolsCloseAt,
                tempo: elapsed >= script.tempoAt,
                tunerStep,
                taps: Math.max(
                    0,
                    Math.min(TAP_BPM.length, Math.floor((elapsed - script.tempoAt) / TAP_INTERVAL) + 1),
                ),
                // Complete is pressed once, and the celebration runs from there.
                saving: elapsed >= script.saveAt && elapsed < script.saveAt + SAVE_RUN,
                // The caret only belongs to the line being typed by hand — from
                // the moment that stretch of canvas opens until REC takes over.
                // Nothing else here is written at a keyboard, so it never sits
                // blinking at work it isn't doing.
                caret: elapsed >= script.actOneEnd && elapsed < script.recAt,
            };

            // Only commit when something actually changed — the loop runs at
            // display rate but the demo only advances a character at a time.
            // The first tick is also what rewinds the demo to the start when
            // the script changes (a language switch), since at elapsed ≈ 0
            // everything is back at its opening value anyway.
            setAnimated((prev) =>
                prev.view === next.view &&
                prev.title === next.title &&
                prev.typedChars === next.typedChars &&
                prev.recording === next.recording &&
                prev.capsule === next.capsule &&
                prev.transcribing === next.transcribing &&
                prev.transcript === next.transcript &&
                prev.photo === next.photo &&
                prev.scanning === next.scanning &&
                prev.extracted === next.extracted &&
                prev.zoom === next.zoom &&
                prev.tools === next.tools &&
                prev.tempo === next.tempo &&
                prev.tunerStep === next.tunerStep &&
                prev.taps === next.taps &&
                prev.saving === next.saving &&
                prev.caret === next.caret
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

    // The canvas is taller than the window it's read through: three screens of
    // it stacked, scrolled one at a time. Each screen is exactly the height of
    // that window, so the scroll target is a multiple of it and nothing has to
    // be measured per-scene — but the window's own height does have to be, since
    // it falls out of the sheet's padding, header and toolbar rather than being
    // set anywhere.
    const [flow, setFlow] = useState<HTMLDivElement | null>(null);
    const [flowH, setFlowH] = useState(0);

    useEffect(() => {
        if (!flow) return;

        const observer = new ResizeObserver(([entry]) => setFlowH(entry.contentRect.height));
        observer.observe(flow);
        setFlowH(flow.clientHeight);
        return () => observer.disconnect();
    }, [flow]);

    // The camera, as two numbers: how big the canvas is drawn right now, and
    // where it is scrolled to. The scroll target is in the parent's pixels — CSS
    // applies the scale first and the translate second — so it has to account for
    // the zoom itself, or a zoomed canvas scrolls to the wrong place.
    const zoom = state.zoom ? CONTENT_ZOOM : 1;
    const scrollY =
        state.view === 0
            ? 0
            : state.view === 1
                ? SCROLL_PEEK - zoom * flowH
                // No peek on the last one: the point is that nothing is left
                // showing, so the restart underneath it is invisible.
                : -zoom * 2 * flowH;

    // The card slot under the writing is occupied from the moment REC is
    // pressed: first by the take being recorded, then by the card it became.
    const slotFilled = state.recording || state.capsule;

    const lyricRow = 'w-full text-center font-sans text-[30px] font-normal leading-[1.4] tracking-[-0.035em] text-stone-700';
    // Every card in the flow sits in a row of its own that keeps its height
    // whether or not the card is there yet. Nothing in this demo may clip: a
    // wrapper with overflow-hidden — which is what an animated height needs —
    // slices the coloured glow off the cards' shadows at the row's edge.
    const cardRow = 'flex w-full shrink-0 items-center justify-center';
    // One screen of canvas. The first sits centred, the way a short verse sits in
    // the middle of an otherwise empty page.
    const screen = 'flex w-full shrink-0 flex-col justify-center gap-1';
    // The second starts at the top instead, so the new line lands directly under
    // the tail of the previous screen showing above it. Centred, it opened a
    // hole between the two — the writing looked like a separate block rather
    // than the next line of the same verse.
    const screenTop = 'flex w-full shrink-0 flex-col justify-start gap-1';

    return (
        // This box does not clip. The push-in grows the card past the bottom of
        // it, and clipping there cut the card's own bottom edge off mid-zoom —
        // but there is no need to cut anything, because the carousel frame this
        // sits in has 24–32px of its own padding underneath, and the overflow is
        // ~21px of it at the `md` scale. So the zoom spends that margin instead
        // of eating the design. The frame still clips at its own rounded edge,
        // well below, so nothing escapes onto the page.
        //
        // The save outline also lives out here, 5px outside the card, which is
        // why the card is held 8px clear of the top and bottom (see the wrapper
        // below) — that inset is what stopped the ring being sliced in half back
        // when this box did clip.
        <div ref={attachFrame} className="relative h-full w-full">
            <div
                className="absolute left-0 top-0 flex items-center justify-center"
                style={{
                    width: DEMO_W,
                    height: DEMO_H,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    opacity: scale ? 1 : 0,
                }}
            >
                {/* A wrapper the sheet's own overflow can't clip, so the save
                    ring — which sits outside the card — and the toast above it
                    have somewhere to live. */}
                <motion.div
                    className="relative flex flex-col"
                    // The outer half of the camera. At rest the card is 800 wide in
                    // an 880 frame; zoomed it is exactly 880, so its sides land on
                    // the frame's and are never cut. The origin sits at 15% down,
                    // which keeps the top edge just inside the frame and sends the
                    // overflow out of the bottom instead — the card's own bottom
                    // margin first, then the last few pixels of the toolbar. That
                    // is the one edge that may be cropped.
                    //
                    // 8px is held clear top and bottom at rest for the save ring,
                    // which sits outside the card.
                    initial={false}
                    animate={{ scale: state.zoom ? CANVAS_ZOOM : 1 }}
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: ZOOM_OUT_LEAD / 1000, ease: [0.32, 0, 0.2, 1] }
                    }
                    style={{
                        width: CANVAS_W,
                        height: 'calc(100% - 16px)',
                        transformOrigin: '50% 15%',
                    }}
                >
                    {/* Saved: the travelling multicolour outline the app runs
                        round the canvas card, and the status pill it drops at the
                        top. Keyed on the press so every pass of the loop restarts
                        the 2s animation rather than showing a finished one. The
                        sheet below is opaque and stacks above this, so only the
                        few pixels sticking out past its edge are ever seen. */}
                    {state.saving && <div key="save-ring" className="demo-save-ring" />}

                    <AnimatePresence>
                        {state.saving && (
                            <motion.div
                                key="save-toast"
                                role="status"
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                                // Top right of the canvas, clear of the project
                                // name on the left, and without the app's status
                                // dot: the dot is there to say "something is
                                // happening", and this arrives once the thing has
                                // already happened.
                                className="pointer-events-none absolute right-7 top-5 z-50 whitespace-nowrap rounded-full bg-stone-900 px-5 py-2.5 font-sans text-[13px] font-medium text-white shadow-lg"
                            >
                                {t('common.saved')}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* The canvas itself: the real card's own white sheet, 32px
                        radius and hairline border. Everything lives inside it —
                        including the toolbar, which in the app is a child of this
                        card and not a bar under it. */}
                    <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-[32px] border border-stone-200/60 bg-white p-7 shadow-[0_12px_40px_rgba(0,0,0,0.03)]">
                        {/* The empty canvas's own horizon, along the bottom edge at
                            the half opacity the real one uses, and left there for
                            the whole demo. Only the landmark still is carried, not
                            the looping sky video that sits behind it in the app — a
                            second video on a carousel that already streams three of
                            them costs more than the drifting clouds are worth here.

                            Pushed down rather than cut down. At the card's full
                            width the artwork stands 174px tall, which reaches up
                            into the writing area and put temple roofs behind the
                            lyrics. Capping its height fixed that but sliced the
                            roofs and treetops off mid-air, which looked worse than
                            the problem it solved. Dropping it below the card's own
                            bottom edge keeps every shape whole and leaves only the
                            skyline showing, which is all it was ever for. */}
                        <img
                            src="/assets/Canvas%20empty/bottom.webp"
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 -bottom-[58px] z-0 h-auto w-full select-none opacity-50"
                        />

                        {/* The canvas names itself, quietly, while the first
                            thing is landing on it — no caret, no typing, just a
                            fade. The row is held at a fixed height so the flow
                            below doesn't shift when the name arrives. */}
                        <div className="relative z-10 flex shrink-0 items-center border-b border-stone-200/40 pb-4">
                            <motion.span
                                initial={false}
                                animate={{ opacity: state.title ? 1 : 0 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: 'easeOut' }}
                                className="flex h-[26px] items-center font-sans text-[19px] font-normal leading-none text-stone-400/80"
                            >
                                {autoTitle}
                            </motion.span>
                        </div>

                        {/* The window onto the canvas. The canvas itself is the
                            column inside, three screens tall, which slides up as
                            the demo works its way down it — nothing is ever
                            cleared, so everything written stays written. */}
                        <div ref={setFlow} className="relative z-10 min-h-0 flex-1 overflow-hidden">
                            <motion.div
                                className="flex w-full flex-col"
                                initial={false}
                                // Scroll and zoom are one move on one element, so
                                // every line on screen is always the same size as
                                // every other. Scaling only the writing screen left
                                // the line peeking above it at the old size — two
                                // sizes of the same verse a few pixels apart.
                                //
                                // With the scale here the offsets have to be scaled
                                // with it: a screen is flowH tall unscaled, so it
                                // stands zoom*flowH tall on screen, and the scroll
                                // target has to be computed from the zoom it is
                                // animating towards.
                                animate={{ y: scrollY, scale: zoom }}
                                transition={
                                    // Arriving back at the top is the loop seam,
                                    // not a move: it only ever happens at the
                                    // wrap, with the canvas blank at both ends of
                                    // it, so it snaps rather than scrolling back
                                    // up through work that is no longer there.
                                    prefersReducedMotion || state.view === 0
                                        ? { duration: 0 }
                                        : { duration: SCROLL_MS / 1000, ease: [0.65, 0, 0.35, 1] }
                                }
                                style={{ transformOrigin: '50% 0%', visibility: flowH ? 'visible' : 'hidden' }}
                            >
                                {/* --- Screen one: the photographed page --- */}
                                <div className={screen} style={{ height: flowH }}>
                                    {/* Dropped straight onto the canvas: no card
                                        around it, no filename, no Scan button —
                                        and no shadow either, since the photo is a
                                        thing lying on the page rather than a panel
                                        floating over it. It arrives from above
                                        with a tilt that straightens as it lands,
                                        the way a dragged file does. */}
                                    <div className={`${cardRow} my-2`}>
                                        <motion.div
                                            initial={false}
                                            animate={
                                                state.photo
                                                    ? {
                                                          opacity: 1,
                                                          y: 0,
                                                          rotate: 0,
                                                          // Held large for the whole
                                                          // scan, then down to its own
                                                          // size once the words are out
                                                          // — the page is the subject
                                                          // for as long as the scan is
                                                          // working on it, and after
                                                          // that the words are.
                                                          // Transform only, so the lines
                                                          // below it never move to make
                                                          // room and never move back.
                                                          scale: state.extracted ? PHOTO_DONE_SCALE : PHOTO_SCAN_SCALE,
                                                      }
                                                    : { opacity: 0, y: -18, rotate: -3, scale: PHOTO_SCAN_SCALE * 0.9 }
                                            }
                                            transition={
                                                // Instant on the way out. The loop
                                                // resets every state at once and
                                                // snaps the canvas back to the top
                                                // in the same frame; animating the
                                                // page's exit meant it was still
                                                // sitting there, sliding away,
                                                // while the top of the canvas
                                                // arrived — which read as the image
                                                // flashing back in.
                                                prefersReducedMotion || !state.photo
                                                    ? { duration: 0 }
                                                    : {
                                                          duration: PHOTO_IN_MS / 1000,
                                                          ease: [0.16, 1, 0.3, 1],
                                                          // The step back down is its
                                                          // own, slower move: arriving
                                                          // is an event, finishing is a
                                                          // release.
                                                          scale: {
                                                              duration: WORK_SETTLE_MS / 1000,
                                                              ease: [0.16, 1, 0.3, 1],
                                                          },
                                                      }
                                            }
                                            // No overflow-hidden out here: the scan
                                            // lights the page's own edge, and that
                                            // sits outside it. The clipping happens
                                            // one level in, around the image.
                                            //
                                            // 310, not 340. The glow needs room to
                                            // exist: at 340 this screen's contents
                                            // came to 324px in a 315px window, so the
                                            // page was already having its top cut off
                                            // before the halo was even drawn. At 310
                                            // — with the row's margin down a step too
                                            // — there is 8px of slack above and
                                            // below, which the halo fits inside.
                                            className="relative w-full max-w-[310px]"
                                            // Grows downward, not outward from its
                                            // middle. The page sits near the top of a
                                            // clipped window with a few pixels above
                                            // it, so scaling about the centre would
                                            // put its top through that edge; anchored
                                            // to the top it expands into the space
                                            // the extracted lines are holding open
                                            // below, which is empty until they land.
                                            style={{ transformOrigin: '50% 0%' }}
                                        >
                                            {/* The scan, said the way it reads
                                                fastest: the page's own outline lit
                                                up and moving. The halo is the same
                                                gradient blurred out behind it, which
                                                is what stops the edge looking like a
                                                border someone drew on. Both sit
                                                UNDER the image — it's opaque, so all
                                                that shows is what pokes out past its
                                                corners.

                                                Wrapped so the pair can fade up as
                                                one, over exactly as long as the page
                                                takes to arrive. They start at the
                                                same instant it does now, and without
                                                the fade the glow would snap on around
                                                an edge still moving into place. */}
                                            {state.scanning && (
                                                <motion.span
                                                    className="pointer-events-none absolute inset-0"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: prefersReducedMotion ? 0 : PHOTO_IN_MS / 1000 }}
                                                    aria-hidden="true"
                                                >
                                                    <span
                                                        className="demo-scan-halo"
                                                        style={{ animationDuration: `${SCAN_RUN}ms` }}
                                                    />
                                                    <span
                                                        className="demo-scan-edge"
                                                        style={{ animationDuration: `${SCAN_RUN}ms` }}
                                                    />
                                                </motion.span>
                                            )}

                                            {/* The master's own 979×599, so the
                                                photo is drawn at its own shape and
                                                nothing is re-cropped here. Master is
                                                `written music.jpg` under
                                                public/Onboarding assets; the
                                                derivative is 720px wide for 20KB. */}
                                            <div className="relative aspect-[979/599] w-full overflow-hidden rounded-[18px]">
                                                <img
                                                    src="/onboarding-cards/handwritten-lyrics.webp"
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="h-full w-full select-none object-cover"
                                                />
                                                {/* And the work happening inside it: a
                                                    skeleton shimmer running down the
                                                    page, four times over the run.
                                                    Down rather than across, because
                                                    that is the direction a page is
                                                    read in — a band crossing sideways
                                                    looked like light moving over the
                                                    paper. Quick and repeated, because
                                                    one slow pass reads as a single
                                                    sweep of glare, and this has to
                                                    read as work in progress. */}
                                                {state.scanning && (
                                                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                                                        <div
                                                            className="demo-scan-shimmer absolute -inset-x-8 top-0 h-1/2 -skew-y-6 bg-gradient-to-b from-transparent via-white/75 to-transparent"
                                                            style={{ animationDuration: `${SCAN_RUN / 4}ms` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* What the scan lifted off the page. Both
                                        lines arrive together and they arrive
                                        FROM the photograph — starting up at the
                                        page, small and transparent, and settling
                                        into the flow below it.

                                        No stagger and no lead-in delay. Holding
                                        them back until the page had finished
                                        shrinking, then dealing them out one
                                        after the other, put most of a second
                                        between the scan finishing and the first
                                        word appearing — which read as the demo
                                        thinking rather than as text being lifted
                                        off a page. Moving them out of the image
                                        is what ties them to it; waiting is not.

                                        `y` is negative and `scale` under 1 at
                                        rest, so the words begin where the photo
                                        is and travel down to where they belong. */}
                                    {[0, 1].map((i) => (
                                        <div key={i} className={lyricRow}>
                                            <motion.span
                                                className="inline-block"
                                                initial={false}
                                                animate={{
                                                    opacity: state.extracted ? 1 : 0,
                                                    y: state.extracted ? 0 : -46,
                                                    scale: state.extracted ? 1 : 0.82,
                                                }}
                                                transition={
                                                    // Instant on the way out, like
                                                    // the page above: the loop
                                                    // resets everything in the same
                                                    // frame it snaps the canvas back
                                                    // to the top, and anything still
                                                    // animating out is seen doing it.
                                                    prefersReducedMotion || !state.extracted
                                                        ? { duration: 0 }
                                                        : { duration: 0.52, ease: [0.16, 1, 0.3, 1] }
                                                }
                                            >
                                                {script.lines[i]}
                                            </motion.span>
                                        </div>
                                    ))}
                                </div>

                                {/* --- Screen two: written and sung. Top-aligned,
                                    so the first line typed here picks up directly
                                    under the scanned line still showing above the
                                    fold. --- */}
                                <div className={screenTop} style={{ height: flowH }}>
                                    <div className={lyricRow}>
                                        {script.lines[2].slice(0, state.typedChars)}
                                        {state.caret && <Caret />}
                                        {state.typedChars === 0 && !state.caret && <span className="invisible">.</span>}
                                    </div>

                                    {/* The recording: the take, then the card it
                                        became, sharing one grid cell so the card
                                        lands exactly where the red bars were. */}
                                    <div className={`${cardRow} my-3`}>
                                        <motion.div
                                            initial={false}
                                            animate={
                                                slotFilled
                                                    ? { opacity: 1, scale: 1, y: 0 }
                                                    : { opacity: 0, scale: 0.94, y: 6 }
                                            }
                                            transition={
                                                prefersReducedMotion || !slotFilled
                                                    ? { duration: 0 }
                                                    : { type: 'spring', stiffness: 260, damping: 22 }
                                            }
                                            className="grid place-items-center"
                                        >
                                            {/* The take, mid-flight: the same
                                                capsule shell, but red, its meter
                                                sweeping in left to right over
                                                exactly as long as REC is held —
                                                and every bar alive while it does,
                                                because a level meter that doesn't
                                                move isn't recording anything. */}
                                            <motion.div
                                                className="[grid-area:1/1] flex h-[54px] shrink-0 items-center gap-5 rounded-full border border-[#FF4040]/25 bg-white px-6 shadow-[0_10px_34px_rgba(255,64,64,0.12)]"
                                                initial={false}
                                                animate={{ opacity: state.recording ? 1 : 0 }}
                                                transition={{ duration: 0.22 }}
                                            >
                                                <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-bold text-[#FF4040]">
                                                    <span className="h-3 w-3 rounded-full bg-[#FF4040] motion-safe:animate-pulse" />
                                                    {t('creative.recording_status')}
                                                </span>
                                                <div className="h-5 w-px shrink-0 bg-stone-200" />
                                                {/* Clipped rather than resized, so
                                                    the capsule's width never changes
                                                    as the take fills in. Driven off
                                                    `recording` rather than mount, so
                                                    the sweep runs again on every pass
                                                    of the loop; the rewind waits out
                                                    the fade so the bars aren't seen
                                                    retreating. */}
                                                <motion.div
                                                    className="flex h-[38px] w-[200px] items-center justify-between"
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
                                                            className={`shrink-0 rounded-[2px] bg-[#FF4040] ${state.recording ? 'live-wave-bar' : ''}`}
                                                            style={{
                                                                height: `${Math.max(3, peak * 28)}px`,
                                                                width: '1.5px',
                                                                // Each bar on its own
                                                                // clock, so the row
                                                                // breathes unevenly the
                                                                // way a voice does.
                                                                animationDuration: `${520 + (idx % 7) * 90}ms`,
                                                                animationDelay: `-${(idx % 11) * 130}ms`,
                                                            }}
                                                        />
                                                    ))}
                                                </motion.div>
                                            </motion.div>

                                            {/* The card it became — a real audio
                                                card, sitting in the lyric flow, and
                                                then working: while the transcription
                                                runs it wears the same treatment the
                                                page wore while it was being read.
                                                One visual language for "this is
                                                being worked on", whether the thing
                                                being read is a photograph or a
                                                recording. */}
                                            <motion.div
                                                className="[grid-area:1/1] relative"
                                                initial={false}
                                                animate={{
                                                    opacity: state.capsule ? 1 : 0,
                                                    // Full size while it works, then
                                                    // it steps back once the words it
                                                    // was carrying are on the canvas.
                                                    scale: state.transcript ? CARD_DONE_SCALE : 1,
                                                }}
                                                transition={{
                                                    opacity: { duration: 0.25 },
                                                    scale:
                                                        prefersReducedMotion || !state.capsule
                                                            ? { duration: 0 }
                                                            : { duration: WORK_SETTLE_MS / 1000, ease: [0.16, 1, 0.3, 1] },
                                                }}
                                            >
                                                {/* The same edge and halo as the
                                                    scanned page, at pill radius. */}
                                                {state.transcribing && (
                                                    <motion.span
                                                        className="pointer-events-none absolute inset-0"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                                                        aria-hidden="true"
                                                    >
                                                        <span
                                                            className="demo-scan-halo"
                                                            style={{
                                                                animationDuration: `${TRANSCRIBE_RUN}ms`,
                                                                borderRadius: 9999,
                                                            }}
                                                        />
                                                        <span
                                                            className="demo-scan-edge"
                                                            style={{
                                                                animationDuration: `${TRANSCRIBE_RUN}ms`,
                                                                borderRadius: 9999,
                                                            }}
                                                        />
                                                    </motion.span>
                                                )}

                                            <div
                                                className="relative flex h-[54px] shrink-0 items-center gap-5 overflow-hidden rounded-full border border-stone-200/60 bg-white px-6 shadow-[0_10px_34px_rgba(0,0,0,0.07)]"
                                            >
                                                <span className="shrink-0 whitespace-nowrap text-[13px] font-bold text-stone-800">
                                                    {t('onboarding.intro.slides.tools.demo.recording')}
                                                </span>
                                                <div className="h-5 w-px shrink-0 bg-stone-200" />
                                                <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-stone-600">
                                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                    {t('card.play')}
                                                </span>
                                                <div className="h-5 w-px shrink-0 bg-stone-200" />
                                                <div className="flex h-[38px] w-[200px] items-center justify-between">
                                                    {WAVE_PEAKS.map((peak, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="shrink-0 rounded-[2px] bg-stone-300"
                                                            style={{ height: `${Math.max(4, peak * 34)}px`, width: '2px' }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="h-5 w-px shrink-0 bg-stone-200" />
                                                {/* Working, said with a spinner and
                                                    nothing else. The word
                                                    "Transcribing…" used to sit here
                                                    instead of the duration, and it
                                                    made the capsule ~60px wider than
                                                    the canvas could hold — the flex
                                                    row gave way at its weakest point
                                                    and broke the card's own title
                                                    onto two lines. The skeleton
                                                    appearing below already says what
                                                    is happening; this slot only has
                                                    to keep its width. */}
                                                <span className="flex w-[34px] shrink-0 items-center justify-center">
                                                    {state.transcribing ? (
                                                        <Loader2 size={13} className="animate-spin text-stone-500" />
                                                    ) : (
                                                        <span className="font-mono text-[11px] font-bold text-stone-500">0:12</span>
                                                    )}
                                                </span>

                                                {/* And the skeleton pass over the
                                                    card itself — along its length
                                                    rather than down it, because a
                                                    band crossing a 54px pill top to
                                                    bottom is gone before it reads as
                                                    anything. Three passes over the
                                                    transcription. */}
                                                {state.transcribing && (
                                                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                                                        <div
                                                            className="demo-scan-shimmer-x absolute -inset-y-4 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                                                            style={{ animationDuration: `${TRANSCRIBE_RUN / 3}ms` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            </motion.div>
                                        </motion.div>
                                    </div>

                                    {/* What the recording turned into — and,
                                        while it's being worked out, the app's own
                                        lyric skeleton standing in for it. Both
                                        share one grid cell so the words resolve
                                        exactly where the bars were, and the row
                                        holds its height from the start, so the
                                        card above never jumps. */}
                                    <div className={`${lyricRow} grid place-items-center`}>
                                        <motion.div
                                            className="[grid-area:1/1] flex w-full max-w-[300px] animate-pulse select-none flex-col gap-2.5"
                                            initial={false}
                                            animate={{ opacity: state.transcribing ? 1 : 0 }}
                                            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                                        >
                                            <div className="mx-auto h-3.5 w-[70%] rounded-full bg-stone-200/70" />
                                            <div className="mx-auto h-3.5 w-[55%] rounded-full bg-stone-200/70" />
                                        </motion.div>

                                        <motion.span
                                            className="[grid-area:1/1] inline-block"
                                            initial={false}
                                            animate={{ opacity: state.transcript ? 1 : 0, y: state.transcript ? 0 : 10 }}
                                            transition={
                                                prefersReducedMotion || !state.transcript
                                                    ? { duration: 0 }
                                                    : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
                                            }
                                        >
                                            {script.lines[3]}
                                        </motion.span>
                                    </div>
                                </div>

                                {/* --- Screen three: blank canvas below the work,
                                    which is where the loop restarts. Empty by
                                    design — the wrap happens while this is what is
                                    on screen, so there is nothing to see it
                                    happen. --- */}
                                <div className={screen} style={{ height: flowH }} />
                            </motion.div>
                        </div>

                        {/* The toolbox panel. An overlay rather than flow content:
                            it opens OVER the canvas the visitor was just writing
                            on, which stays visible around it and is still there
                            when the panel closes. Anchored just above the toolbar
                            that opened it, exactly as in the app. */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-[104px] z-20 flex justify-center">
                            <motion.div
                                initial={false}
                                animate={
                                    state.tools
                                        ? { opacity: 1, scale: 1, y: 0 }
                                        : { opacity: 0, scale: 0.95, y: 16 }
                                }
                                transition={
                                    prefersReducedMotion
                                        ? { duration: 0 }
                                        : { type: 'spring', stiffness: 260, damping: 26 }
                                }
                                className="flex w-full max-w-[740px] flex-col gap-3 rounded-[36px] border border-stone-200/80 bg-white p-6 shadow-[0_15px_45px_rgba(0,0,0,0.06)]"
                            >
                                {/* One box, two tools: the dial and the tap pad
                                    are the same size and cross-fade, so switching
                                    tabs doesn't resize the panel under the
                                    pointer.

                                    The dial is height-bound, not width-bound — it
                                    keeps its 600x295 shape and fits itself to
                                    whichever is tighter — so this number, not the
                                    panel width, is what makes the tuner bigger.
                                    250px leaves the panel 22px clear of the card
                                    top and 30px above the toolbar. */}
                                <div className="relative h-[250px] w-full overflow-hidden">
                                    <motion.div
                                        className="absolute inset-0"
                                        initial={false}
                                        animate={{ opacity: state.tempo ? 0 : 1 }}
                                        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                                    >
                                        <DemoTunerDial
                                            noteIndex={TUNER_STEPS[state.tunerStep].note}
                                            cents={TUNER_STEPS[state.tunerStep].cents}
                                            hz={TUNER_STEPS[state.tunerStep].hz}
                                        />
                                    </motion.div>

                                    <motion.div
                                        className="absolute inset-0 flex select-none flex-col items-center justify-center rounded-3xl"
                                        initial={false}
                                        animate={{ opacity: state.tempo ? 1 : 0 }}
                                        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                                        // The pad changes colour on every tap, out
                                        // of the app's own four.
                                        style={{
                                            backgroundColor: TAP_TINTS[Math.max(0, state.taps - 1) % TAP_TINTS.length],
                                            transition: 'background-color 400ms ease-in-out',
                                        }}
                                    >
                                        <span className="font-sans text-[116px] font-black leading-none tracking-tight text-black">
                                            {TAP_BPM[Math.min(TAP_BPM.length - 1, Math.max(0, state.taps - 1))]}
                                        </span>
                                        <span className="mt-2 font-sans text-[14px] font-extrabold tracking-[0.25em] text-black">
                                            BPM
                                        </span>
                                    </motion.div>
                                </div>

                                {/* The panel's own tab row, switching itself from
                                    the tuner to tap tempo. */}
                                <div className="flex w-full select-none items-center gap-[7px] rounded-full border border-[#E1E1E1] bg-[rgba(241,241,241,0.5)] p-[7px]">
                                    {[
                                        { label: t('canvas.tuner'), on: !state.tempo },
                                        { label: t('canvas.tap_tempo'), on: state.tempo },
                                    ].map((tab) => (
                                        <div
                                            key={tab.label}
                                            className={`flex flex-1 items-center justify-center rounded-full py-4 transition-all duration-200 ${
                                                tab.on ? 'bg-white shadow-[0px_3.6px_18px_rgba(0,0,0,0.05)]' : ''
                                            }`}
                                        >
                                            <span
                                                className="font-sans text-[18px] font-normal transition-colors duration-200"
                                                style={{ color: tab.on ? '#1A1A1A' : '#757575' }}
                                            >
                                                {tab.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* The canvas toolbar, at its real 54px scale — inside the
                            card, pinned to its bottom edge, exactly where the app
                            puts it. Present from the first frame and never
                            animated in: it is the slide's whole claim, so it sits
                            under the empty canvas the way it sits under a real
                            one, and only REC and the toolbox ever change.

                            Glyphs only, no labels: that's the toolbar's own shape
                            below `lg` in the app, and it's the right one here — at
                            this size the labels were the only thing in the demo
                            trying to be read, and the eye went to them instead of
                            to the canvas. */}
                        <div className="relative z-30 mt-auto flex shrink-0 justify-center pt-3">
                            <div className="flex w-fit items-center gap-3.5 rounded-full border border-stone-200/60 bg-white p-3 shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
                                {/* Complete. Deliberately NOT carrying the app's
                                    resting colour mesh: at this size the mesh
                                    turned the quietest control in the toolbar into
                                    the loudest thing on the canvas. White circle,
                                    black check — the press is a dip, and the colour
                                    belongs to the outline it fires. */}
                                <motion.div
                                    initial={false}
                                    animate={
                                        prefersReducedMotion ? { scale: 1 } : { scale: state.saving ? 0.94 : 1 }
                                    }
                                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                                    className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-stone-200/60 bg-white shadow-[0px_1.8px_9px_rgba(0,0,0,0.04)]"
                                >
                                    <Check size={26} className="stroke-[2.5px] text-stone-900" />
                                </motion.div>

                                {/* Held down while the take runs — the card in the
                                    flow above has to visibly come from this button,
                                    so this is the one control that ever changes
                                    state. */}
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

                                {/* The toolbox — pressed in while its panel is
                                    open, so the panel visibly belongs to this
                                    button. */}
                                <div
                                    className={`flex h-[54px] w-[54px] items-center justify-center rounded-full border transition-all duration-300 ${
                                        state.tools
                                            ? 'scale-95 border-stone-300 bg-stone-100 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.06)]'
                                            : 'border-stone-200/50 bg-white shadow-[0px_1.8px_9px_rgba(0,0,0,0.04)]'
                                    }`}
                                >
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
                </motion.div>
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
// Below this measured width the compact surface is used. The line sits below
// every width the full-bleed frame can actually hand us on desktop — the
// carousel's column is 716px, so the studio measures ~714 there — and above
// anything a phone gives it. It was briefly 720, which put the desktop
// measurement 6px on the WRONG side: the phone layout (no knob column,
// truncated names) rendered full-size on desktop and read as the studio
// being squeezed. The wide mixer at ~714px is a 0.6 scale — small at the
// wide framing, but the camera's close framings carry the detail, which is
// their job.
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
// Each clip is a 240px, silent, ~8-second loop derived from the square masters
// in `public/Onboarding assets/Song live collab` — guitar.mp4, lyricist.mp4 and
// singing.mp4, 640px and 30MB between them. The bubble is 84px on screen, so
// 240 covers it at 2× and anything beyond that is bytes nobody can see; the
// derivatives land at 43–59KB each. Set `video` to null and the disc falls back
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
        // Native speed. This clip once ran at 0.5 to tame the strumming hand,
        // but the 24fps source stretched to half rate means each frame is held
        // for two — visible judder, which at disc size read as a glitch. Real
        // speed is smooth; a busy hand is the lesser evil.
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
// 100ms a character: brisk enough that the verse is down in ~9.5s of the
// cycle, still slow enough to read as writing rather than a progress bar.
// It starts at 300ms — while the camera is still diving toward the panel —
// so the scene opens on work already happening, not on a wait.
const LYRIC_CHAR_MS = 100;
const LYRIC_START_MS = 300;
const LYRIC_LINE_GAP_MS = 600;
// How long the finished verse sits there before the loop wipes and retypes it.
const LYRIC_HOLD_MS = 3200;

// `startedAtMs` and `loopTotalMs` are handed in rather than owned here — see
// the call site in StudioDemoArt. They tie this loop to the same clock and
// the same cycle length as the recording takes, so the lyricist visibly
// resumes writing at the exact instant the second take finishes, not on an
// unrelated timer of its own. Without that, the two loops drift apart after
// one cycle (the natural typing length is shorter than a full guitar+vocal
// take) and the lyricist looks like it's restarting at random.
function useTypedLyrics(lines: string[], startedAtMs: number, loopTotalMs: number) {
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
        // Held at the finished verse for whatever's left of loopTotalMs — that
        // stretch covers the entire guitar-then-vocal take, so the lyrics only
        // wipe and retype when the shared cycle wraps.
        const total = loopTotalMs;

        let raf = 0;

        const tick = (now: number) => {
            const elapsed = (now - startedAtMs) % total;

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
        // `startedAtMs`/`loopTotalMs` are stable for the component's whole life.
    }, [lines, prefersReducedMotion, startedAtMs, loopTotalMs]);

    return state;
}

// --- The recording takes ----------------------------------------------------
// The two musicians take turns laying down a take, guitar first, then vocals.
// While a take runs, that cursor rides its track's timeline left to right and
// red bars rise behind it, jittering like a live level meter; when the sweep
// reaches the end the take is done and the bars settle black — the same red-
// while-recording, dark-when-recorded language as the real studio. Then both
// waveforms hold for a beat, wipe, and the loop starts over.
// --- The camera -------------------------------------------------------------
// One take of a tour, on a loop, cut to the session script (see CYCLE_MS):
//
//   arrive and zoom straight in on the lyrics — no settling beat; the slide
//   opens already moving → hold there while the words appear and the guitarist
//   dials in → snap right to the tracks for the takes → pull back out just as
//   the vocal take ends, so the closing add-track happens on the wide frame →
//   start again.
//
// Authored as scale+translate keyframes with a top-left origin: every framing
// is one smoothly interpolable pair of numbers. Holds are repeated keyframes;
// easeInOut on each segment makes every move leave and land softly. The path
// opens and closes on the same wide values, so the loop seam is invisible.
//
// The beats, in ms. Read as pairs: a hold, then the move out of it.
//
//   0 →150    wide for a blink — a keyframe needs somewhere to start, but the
//             slide opens with the camera already moving
//   →750      zoom in on the lyrics      (600ms)
//   →3300     hold: just long enough for the FIRST line to be typed (~3.1s in
//             the slowest language) — one line is the point made, and the
//             camera moves on while lines two and three carry on behind it
//   →4000     dolly right to the tracks  (700ms)
//   →9100     hold: guitar take, vocal setup
//   →10000    pull back out              (900ms) — right as the vocal take
//             STARTS, so the last take plays out on the whole studio
//   →CYCLE_MS hold wide: the take finishes at 13600, and the finished scene
//             then just sits — a few quiet seconds of the completed session —
//             before the loop starts over (trailing keyframe, CAMERA_TIMES)
//
// The moves are quick on purpose — 600–900ms is a glance, not a journey — and
// the holds are where the time goes.
const CAMERA_KEY_MS = [0, 150, 750, 3300, 4000, 9100, 10000];

// A close framing is described by which edge of the scene it hugs, not by a
// point to centre on. Pinning is what the framings are actually for — "the
// lyrics panel and what's beside it", "the track rows out to the ⋯ button" —
// and expressing it directly means the numbers stay correct when z changes,
// instead of every focus coordinate having to be recomputed by hand.
type CameraFocus = { pin: 'left' | 'right'; z: number };

// The wide frame is pulled in by `inset` authored pixels rather than sitting at
// a flat 1, so that zoomed out the studio has a little air around it instead of
// butting against the container. It's done here, in the camera, precisely
// because it must NOT apply while zoomed in: as padding on the frame it would
// shrink the viewport the close framings are measured against and start
// cropping the studio again, which is the whole reason that padding came off.
//
// Only left, right and bottom get the margin. Horizontally the inset is
// explicit; vertically the top stays flush at y=0 (the frame already carries
// its own padding above the art, which is the headline's gap) and the bottom
// margin falls out of the uniform scale as H·2·inset/W — within a pixel or two
// of the side margins on both surfaces, so it reads as even.
//
// The close framings get the same `inset` on the edge they hug. Zoomed in the
// scene is wider than the frame, so only the pinned side can have a margin —
// the far side is off-frame by definition — but that near edge butting flat
// against the container was what made a push-in read as the studio being
// clipped rather than approached.
const buildCameraPath = (W: number, H: number, inset: number, lyrics: CameraFocus, tracks: CameraFocus) => {
    // Solve the translate directly for the pinned edge: left edge at `inset`,
    // or right edge (translate + W·z) at W − inset. Top stays flush.
    const close = (f: CameraFocus) => ({
        x: f.pin === 'left' ? inset : W - inset - W * f.z,
        y: 0,
    });
    const l = close(lyrics);
    const tr = close(tracks);
    const frame = { scale: (W - inset * 2) / W, x: inset, y: 0 };
    return {
        // The frame the tour opens and closes on, and where the camera parks
        // when someone reaches into the demo.
        frame,
        // The trailing pair repeats the wide frame: the tour proper finishes at
        // CAMERA_KEY_MS's last beat and then sits there until the cycle ends.
        path: {
            scale: [frame.scale, frame.scale, lyrics.z, lyrics.z, tracks.z, tracks.z, frame.scale, frame.scale],
            x: [frame.x, frame.x, l.x, l.x, tr.x, tr.x, frame.x, frame.x],
            y: [frame.y, frame.y, l.y, l.y, tr.y, tr.y, frame.y, frame.y],
        },
    };
};

// Authored pixels, so they shrink with everything else as the demo scales.
const CAMERA_INSET = 26;
const CAMERA_INSET_COMPACT = 14;

// z is 1.25, walked back from 1.45 (and 2 before that). At 2× the viewport was
// only 590px of a 1180px surface, too narrow to hold one track row end to end;
// 1.45 fixed that but still opened so close that the studio read as a cropped
// fragment rather than a room being looked into. 1.25 keeps a 944px viewport —
// four fifths of the surface — so the push-in reads as attention moving across
// the studio while the whole thing stays recognisable around it.
//
// Both framings share a flush top, so the move between them is a pure
// horizontal dolly: nothing drifts vertically.
const CAMERA_PATH_WIDE = buildCameraPath(
    STUDIO_W,
    STUDIO_H,
    CAMERA_INSET,
    // The lyrics panel entire (x 0–280), with the studio card running off to
    // the right of it.
    { pin: 'left', z: 1.25 },
    // The whole studio card — grip, instrument capsule, knobs, timeline and
    // the ⋯ button — with both rows and Add track inside it vertically.
    { pin: 'right', z: 1.25 },
);
const CAMERA_PATH_COMPACT = buildCameraPath(
    STUDIO_COMPACT_W,
    STUDIO_COMPACT_H,
    CAMERA_INSET_COMPACT,
    { pin: 'left', z: 1.25 },
    { pin: 'right', z: 1.25 },
);

// --- The cycle --------------------------------------------------------------
// One take of a session, played over and over. Everything on this slide — the
// camera, the typing, the knob-twiddling, the takes — is measured from one
// clock against this one length, so the scene at t=0 is identical every pass
// and the loop has no seam to notice.
//
// The work overlaps the way a real session's would: the guitarist dials in
// WHILE the lyricist types, and the vocalist dials in WHILE the guitar take
// runs. Each pair is legible because they're doing different kinds of thing in
// different places, and the camera framing of the moment always contains both.
//
//   0          reset: two tracks, knobs at their opening positions, empty
//              timelines, blank lyrics panel; camera diving in already
//   300        the lyricist starts writing (runs to ~9.7s — lines two and
//              three land while the camera is already over on the tracks)
//   1200–3300  the guitarist sets up alongside the first line: three knobs,
//              then the compressor (starting inside the lyrics framing, which
//              at z1.25 still shows the knob column)
//   4300       the guitarist records (4.5s), a beat after the camera lands on
//              the tracks at 4000
//   5500–7300  the vocalist sets up while the guitar take runs
//   9100       the vocalist records (4.5s), ending 13600
//   9100       …and the camera pulls back out AS the take starts (9100–10000),
//              so the last recording plays out over the whole studio
//   13600      the take ends; the finished session sits still — both waveforms
//              on tape, nobody doing anything — for the closing beat
//   16800      loop, same order, forever
const CYCLE_MS = 16800;

const REC_SWEEP_MS = 4500;
// Each musician's setup steps run before their take: you watch someone dial
// their sound in and then commit it, rather than a take appearing from nowhere.
const REC_STARTS = [4300, 9100] as const;
const REC_TOTAL_MS = CYCLE_MS;

// The camera runs on this same cycle, and NOT as a fire-and-forget framer
// animation: its position is re-derived every frame from the same clock the
// typing, knob work and takes read (see the useAnimationFrame in
// StudioDemoArt). A self-timed animation looked identical on the first pass
// but desynced the moment anything restarted it — a hover parking the camera,
// a dev hot-reload — because the animation went back to ITS zero while the
// clock kept running, after which every zoom landed on the wrong beat of the
// script. Deriving from the clock makes that class of glitch impossible: the
// camera cannot be anywhere the clock doesn't say it is.
const CAMERA_LOOP_MS = CYCLE_MS;
const CAMERA_KEYS_FULL = [...CAMERA_KEY_MS, CAMERA_LOOP_MS];

// The default easeInOut cubic, applied inside each keyframe segment — the same
// leave-soft-land-soft the framer keyframes gave every move.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The tour's framing at a moment on the shared clock. */
const evaluateCameraPath = (
    path: { scale: number[]; x: number[]; y: number[] },
    elapsedMs: number,
): { scale: number; x: number; y: number } => {
    const t = ((elapsedMs % CAMERA_LOOP_MS) + CAMERA_LOOP_MS) % CAMERA_LOOP_MS;
    let i = CAMERA_KEYS_FULL.length - 2;
    for (let k = 0; k < CAMERA_KEYS_FULL.length - 1; k += 1) {
        if (t < CAMERA_KEYS_FULL[k + 1]) {
            i = k;
            break;
        }
    }
    const span = CAMERA_KEYS_FULL[i + 1] - CAMERA_KEYS_FULL[i];
    const p = span > 0 ? easeInOutCubic((t - CAMERA_KEYS_FULL[i]) / span) : 1;
    const lerp = (values: number[]) => values[i] + (values[i + 1] - values[i]) * p;
    return { scale: lerp(path.scale), x: lerp(path.x), y: lerp(path.y) };
};

// How quickly the camera glides onto a new target — the time constant of the
// exponential smoothing in the frame loop. During the tour the target moves
// continuously and this lag is imperceptible; its job is soaking up any
// discontinuity (a layout swap, a paused tab resuming) as an ease.
const CAMERA_GLIDE_TAU_MS = 120;

// --- The setup steps --------------------------------------------------------
// What each musician does before their take: reach for a control, change it,
// move to the next. `knob` is the index within the row's control strip (0–3 are
// the VOL/PAN/EQ/REV dials, 4 is the compressor switch), which is both what the
// cursor flies to and what gets changed.
//
// The cursor arrives SETUP_LEAD_MS before the value moves — a hand gets there
// first — and the whole run is spaced so each change is a separate, readable
// beat rather than a flurry.
type SetupStep = {
    at: number;
    /** Which track row, and so which cursor: 0 guitarist, 1 vocalist. */
    row: 0 | 1;
    knob: 0 | 1 | 2 | 3 | 4;
    param: 'volume' | 'pan' | 'eq' | 'reverb' | 'compressor';
    value: number | boolean;
};

const SETUP_LEAD_MS = 450;

const SETUP_STEPS: SetupStep[] = [
    // The guitarist, working while the lyricist types: bring the level up,
    // place it slightly left, add some air, then switch the compressor off.
    { at: 1200, row: 0, knob: 0, param: 'volume', value: 86 },
    { at: 1900, row: 0, knob: 1, param: 'pan', value: -18 },
    { at: 2600, row: 0, knob: 3, param: 'reverb', value: 38 },
    // 700ms apart rather than 900 so the run ends (3300 + 900 reach-window =
    // 4200) before the take arms at 4300 — the setup anchor must let go of the
    // cursor before the sweep claims it.
    { at: 3300, row: 0, knob: 4, param: 'compressor', value: false },
    // The vocalist, working while the guitar take runs: level, a touch of top
    // end, compressor on — finishing just before their own take at 11800.
    // Nothing is scripted after that take: it plays out on the wide frame and
    // the finished session then sits still until the loop wraps.
    { at: 5500, row: 1, knob: 0, param: 'volume', value: 92 },
    { at: 6400, row: 1, knob: 2, param: 'eq', value: 5 },
    { at: 7300, row: 1, knob: 4, param: 'compressor', value: true },
];

// Voice-shaped pseudo-waveform — the same sine mix the canvas demo's capsule
// uses, so a "finished take" here looks like a recording does elsewhere in the
// product rather than like random noise.
const REC_PEAKS = Array.from({ length: 85 }, (_, i) => {
    const wave = 0.35 * Math.sin(i * 0.15) + 0.45 * Math.sin(i * 0.35) + 0.2 * Math.sin(i * 0.8);
    return Math.max(0.14, 0.25 + Math.abs(wave) * 0.75);
});

type RecordingRow = { state: 'idle' | 'recording' | 'done'; bars: number };

// Drives the two takes off one clock, exactly the shape of useTypedLyrics —
// which is fed this same `startedAtMs`, so the two loops stay in lockstep.
// A rAF loop that quantises to whole bars and only commits when one lands,
// so the display-rate loop produces ~13 renders a second, not 60.
function useRecordingLoop(barCount: number, startedAtMs: number): [RecordingRow, RecordingRow] {
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

        let raf = 0;

        const tick = (now: number) => {
            const elapsed = (now - startedAtMs) % REC_TOTAL_MS;

            const next = REC_STARTS.map((start): RecordingRow => {
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
    }, [prefersReducedMotion, barCount, startedAtMs]);

    return prefersReducedMotion ? finished : rows;
}

/** Where the setup script has got to, on the same clock as everything else. */
type ScriptState = {
    /** How many whole cycles have elapsed — changing it is the reset signal. */
    cycle: number;
    /** Index into SETUP_STEPS of the step being performed, or -1 for none. */
    step: number;
    /** True while a cursor is on its way to, or working, a row's controls. */
    reaching: [boolean, boolean];
};

// The third loop on the shared clock, alongside the typing and the takes. Like
// them it runs at display rate but commits only when the script actually moves
// on, which is a handful of times per cycle.
function useStudioScript(startedAtMs: number): ScriptState {
    const prefersReducedMotion = useReducedMotion();
    const [state, setState] = useState<ScriptState>({ cycle: 0, step: -1, reaching: [false, false] });

    useEffect(() => {
        if (prefersReducedMotion) return;

        let raf = 0;
        const tick = (now: number) => {
            const total = now - startedAtMs;
            const cycle = Math.floor(total / CYCLE_MS);
            const elapsed = total % CYCLE_MS;

            // The step whose moment has arrived, counting the lead-in during
            // which the cursor is travelling but nothing has changed yet.
            let step = -1;
            for (let i = 0; i < SETUP_STEPS.length; i += 1) {
                if (elapsed >= SETUP_STEPS[i].at - SETUP_LEAD_MS) step = i;
            }

            // A musician is "reaching" while any of their steps' own windows
            // contains this moment — from a step's lead-in to 900ms past it.
            // Consecutive steps 900ms apart chain into one continuous stretch,
            // while a row whose steps come in separate visits (the vocalist's
            // pre-take setup and their post-take tweaks) gets separate
            // stretches instead of one window swallowing the take between.
            const reaching = ([0, 1] as const).map((row) =>
                SETUP_STEPS.some(
                    (s) => s.row === row && elapsed >= s.at - SETUP_LEAD_MS && elapsed < s.at + 900,
                ),
            ) as [boolean, boolean];

            setState((prev) =>
                prev.cycle === cycle &&
                prev.step === step &&
                prev.reaching[0] === reaching[0] &&
                prev.reaching[1] === reaching[1]
                    ? prev
                    : { cycle, step, reaching },
            );

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [startedAtMs, prefersReducedMotion]);

    return state;
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
            // Colour, for now. These ran black-and-white for a while (three
            // clips from three rooms read more like one cast in mono) — if
            // that's wanted back, it's the `grayscale` utility on this line.
            className="h-full w-full object-cover"
        />
    );
};

// The idle wander each pointer does when its owner isn't mid-task: a few
// authored pixels, over nine to thirteen seconds, on a loop. Deliberately tiny
// and deliberately slow — enough that the cursors read as attached to people
// rather than pinned to the artwork, not enough to pull the eye off whatever
// is actually happening. Each has its own shape and period so the three never
// fall into step with one another.
const CURSOR_DRIFT = [
    { x: [0, 7, -4, 5, 0], y: [0, -5, 6, -2, 0], ms: 9000 },
    { x: [0, -6, 5, -3, 0], y: [0, 4, -6, 3, 0], ms: 11000 },
    { x: [0, 5, -7, 3, 0], y: [0, -4, 5, -5, 0], ms: 13000 },
];

const DemoCursorLayer = ({ compact, live }: {
    compact: boolean;
    // Per-cursor live state, keyed by DEMO_CURSORS key. `anchor` is where the
    // cursor should be right now in authored surface pixels — the lyricist's
    // caret, or a musician's spot on the timeline mid-take — and null means
    // "sit on your parked anchor". `busy` is whether that collaborator is
    // engaged in anything (it stills the idle drift so the pointer can sit on
    // its target); `face` is the narrower spotlight moments that earn the
    // video disc. Knob-tweaking is busy but not face: a pointer nudging dials
    // reads on its own, and the disc over the knob column hid the very
    // controls being adjusted.
    live: Record<string, { anchor: [number, number] | null; busy: boolean; face: boolean }>;
}) => {
    // Grown from 28/84 (and 42 before that): the cursors are the slide's cast,
    // and at the camera's wide framing they were reading as incidental marks
    // rather than as people. These sizes are authored pixels, so they scale
    // with the surface like everything else.
    const arrowSize = compact ? 30 : 44;
    const bubbleSize = compact ? 88 : 128;

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
            {/* All three pointers are always here — a collaborator doesn't
                vanish because they've stopped for a second, and three quiet
                cursors idling around the room is what says other people are in
                it. What comes and goes is the face: it appears only while its
                owner is actually working, which turns the disc into a spotlight
                on whatever is happening rather than three videos competing for
                attention at once. */}
            {DEMO_CURSORS.map((cursor, i) => {
                const state = live[cursor.key] ?? { anchor: null, busy: false, face: false };
                // A lyricist pointer with no lyrics under it has nothing to
                // point at — the panel is closed, or the first caret
                // measurement hasn't landed yet.
                const follows = cursor.key === 'lyricist';
                if (follows && !state.anchor) return null;

                const [x, y] = state.anchor ?? (compact ? cursor.compact : cursor.wide);
                const drift = CURSOR_DRIFT[i % CURSOR_DRIFT.length];

                return (
                    <motion.div
                        key={cursor.key}
                        className="absolute left-0 top-0"
                        initial={false}
                        animate={{ x, y }}
                        transition={
                            follows
                                // Short and linear rather than a spring: a spring
                                // trailed a character or two behind the text and
                                // read as lag, but snapping straight to each
                                // character read as jumping. At 130ms against a
                                // 150ms keystroke the pointer is always gliding
                                // and always caught up by the next letter.
                                ? { duration: 0.13, ease: 'linear' }
                                // A musician's sweep advances a bar at a time
                                // along a much longer run, where a spring is what
                                // makes it glide instead of step, and what
                                // carries them to and from their parked spot.
                                : { type: 'spring', stiffness: 170, damping: 22, mass: 0.6 }
                        }
                    >
                        {/* Idle drift. Nested so it composes with the anchor
                            above instead of fighting it: the outer transform
                            says where this person is, this one says they're
                            alive. It stops while they're working — a pointer
                            laying down a take shouldn't wander off its own
                            timeline. */}
                        <motion.div
                            animate={state.busy ? { x: 0, y: 0 } : { x: drift.x, y: drift.y }}
                            transition={
                                state.busy
                                    ? { duration: 0.5, ease: 'easeOut' }
                                    : { duration: drift.ms / 1000, repeat: Infinity, ease: 'easeInOut' }
                            }
                        >
                            <DemoCursorArrow color={cursor.color} size={arrowSize} />
                            {/* The face rides just off the pointer's tail. No
                                ring: three coloured outlines around three moving
                                video discs was more colour than a slide this
                                quiet wants, and the pointer alone already says
                                whose face it is. The shadow is what lifts the
                                disc off the page now. */}
                            <AnimatePresence>
                                {state.face && (
                                    <motion.div
                                        key="face"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.32, ease: 'easeOut' }}
                                        className="absolute overflow-hidden rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                                        style={{
                                            width: bubbleSize,
                                            height: bubbleSize,
                                            left: bubbleLeft,
                                            top: arrowSize * 0.62,
                                            backgroundColor: cursor.color,
                                        }}
                                    >
                                        {cursor.video ? (
                                            // Mounted only while they're working,
                                            // so the clip always plays from here.
                                            <DemoCursorVideo cursor={cursor} playing />
                                        ) : (
                                            <div
                                                className="h-full w-full"
                                                style={{ background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.65), ${cursor.color} 70%)` }}
                                            />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
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
    // Tracked so the needle transition below can switch off during a drag —
    // eased motion under a live pointer reads as the knob resisting the hand.
    const [dragging, setDragging] = useState(false);

    // Drag distance is read in screen pixels while the knob is painted at the
    // surface's scale. Correcting for that would make the knob feel heavier the
    // smaller the slide gets; leaving it alone keeps the same wrist movement
    // everywhere, which matters more here than matching the real app exactly.
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
        const startY = e.clientY;
        const startValue = value;
        const range = max - min;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = startY - moveEvent.clientY;
            const deltaValue = (deltaY / 2.5) * (range / 100);
            onChange(Math.max(min, Math.min(max, startValue + deltaValue)));
        };
        const handleMouseUp = () => {
            setDragging(false);
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
                style={{
                    left: 'calc(50% - 0.75px)',
                    bottom: '50%',
                    transform: `rotate(${angle}deg)`,
                    // The setup script sets a value in one jump; this is what
                    // turns that jump into a hand turning the dial. Off while
                    // dragging, where the pointer IS the motion.
                    transition: dragging ? 'none' : 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
            />
        </div>
    );
};

const StudioDemoArt = () => {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();

    const [tracks, setTracks] = useState<DemoTrack[]>(DEMO_TRACKS);
    const [showLyrics, setShowLyrics] = useState(true);

    // The camera tour loops on the shared clock, and nothing interrupts it —
    // the pointer used to park it at the wide frame, but a camera the mouse
    // could stop kept getting caught mid-glitch (and the demo reads better as
    // a film that simply plays). The ref is what the cursor measurements are
    // taken against.
    const cameraRef = useRef<HTMLDivElement | null>(null);

    // Layout animations (drag-reorder, add-track) stay off while anything can
    // move the camera: layout projection re-measures the rows on every
    // recording-loop commit, and measurements taken while the camera transform
    // is mid-flight read as the rows having moved — framer then "corrects"
    // them, which showed up as the tracks twitching back and forth. With the
    // tour now uninterruptible, the camera is only ever still for reduced
    // motion, so that's the one place they're enabled.
    const layoutReady = prefersReducedMotion === true;
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

    // One shared clock for every looping animation on this slide — the lyrics
    // typing and both recording takes are all measured from this same instant,
    // so forcing them to the same total (REC_TOTAL_MS) keeps them in lockstep
    // forever, not just on the first cycle. Set once on first render rather
    // than via useRef's initial-value argument, so `performance.now()` isn't
    // re-evaluated (harmlessly, but needlessly) on every re-render.
    const sequenceStartRef = useRef<number | null>(null);
    if (sequenceStartRef.current === null) sequenceStartRef.current = performance.now();
    const sequenceStart = sequenceStartRef.current;

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
    const typedLyrics = useTypedLyrics(lyricLines, sequenceStart, REC_TOTAL_MS);

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
        // The anchor is the pointer's top-left, but what must touch the caret
        // is its TIP, which sits ~19% into the SVG's box on both axes —
        // backing the anchor off by that much lands the tip's point, not the
        // box corner, at either arrow size.
        //
        // The tip rides at the caret's left edge but BELOW the line (1.2×
        // the caret's height): tip-at-middle put the arrow across the words
        // and the disc square over the lines beneath. Hung under the text,
        // the pointer points up at the letters appearing and the disc clears
        // the writing entirely.
        setCaretAnchor([
            (caretRect.left - camRect.left) / effScale - (compact ? 30 : 44) * 0.19,
            (caretRect.top - camRect.top + caretRect.height * 1.2) / effScale - (compact ? 30 : 44) * 0.18,
        ]);
    }, [scale, compact, showLyrics, typedLyrics, lyricLines]);

    // The recording takes. Rows are positional — the takes belong to the first
    // and second visual rows, matching the cursors' parked anchors, so a
    // reordered or added track doesn't strand the animation. The mid-take
    // cursor position is measured off the row's real timeline capsule, the
    // same way the caret is: the capsule moves when lyrics open or close and
    // widens when they hide, and a measured anchor follows all of it.
    const barCount = compact ? DEMO_WAVE_TICKS_COMPACT.length : DEMO_WAVE_TICKS.length;
    const recRows = useRecordingLoop(barCount, sequenceStart);
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

    // --- The setup script ---------------------------------------------------
    // The musicians' knob work, on the same clock as the takes, so the whole
    // cycle is one performance.
    const script = useStudioScript(sequenceStart);
    // [row][knob] — the five controls in each row's strip. Only rendered on the
    // full surface; compact drops the knob column entirely.
    const knobRefs = useRef<Array<Array<HTMLDivElement | null>>>([[], []]);
    const [setupAnchors, setSetupAnchors] = useState<Array<[number, number] | null>>([null, null]);

    // Applying the script to the studio's own state. Reset first, so a cycle
    // always opens on the same two tracks with the same settings no matter
    // what the last one — or the visitor — left behind.
    useEffect(() => {
        setTracks(DEMO_TRACKS);
    }, [script.cycle]);

    useEffect(() => {
        if (script.step < 0) return;
        const s = SETUP_STEPS[script.step];
        setTracks((prev) => prev.map((track, i) => (i === s.row ? { ...track, [s.param]: s.value } : track)));
    }, [script.step, script.cycle]);

    // Where each musician's pointer should be while they're setting up: on the
    // control they're about to change. Measured the same camera-relative way
    // as the caret and the take sweeps.
    useEffect(() => {
        const cam = cameraRef.current;
        if (!cam || !scale) {
            setSetupAnchors([null, null]);
            return;
        }
        const camRect = cam.getBoundingClientRect();
        const effScale = camRect.width / (compact ? STUDIO_COMPACT_W : STUDIO_W);
        const centreOf = (el: Element | null): [number, number] | null => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            // Tip a little inside the control's top-left quadrant, so the
            // pointer reads as resting on it rather than covering it.
            return [
                (r.left - camRect.left + r.width * 0.42) / effScale - 5,
                (r.top - camRect.top + r.height * 0.34) / effScale - 4,
            ];
        };

        const step = script.step >= 0 ? SETUP_STEPS[script.step] : null;
        const knobAnchor = (row: 0 | 1) =>
            step && step.row === row && script.reaching[row] ? centreOf(knobRefs.current[row]?.[step.knob] ?? null) : null;
        setSetupAnchors([knobAnchor(0), knobAnchor(1)]);
    }, [scale, compact, showLyrics, script, tracks.length]);

    const surfaceW = compact ? STUDIO_COMPACT_W : STUDIO_W;
    const surfaceH = compact ? STUDIO_COMPACT_H : STUDIO_H;
    const lyricsWidth = compact ? 190 : 280;
    const camera = compact ? CAMERA_PATH_COMPACT : CAMERA_PATH_WIDE;

    // The camera's transform, written every frame from the shared clock — see
    // the note on CAMERA_KEYS_FULL for why this is not a framer animation.
    const camX = useMotionValue(camera.frame.x);
    const camY = useMotionValue(camera.frame.y);
    const camScale = useMotionValue(camera.frame.scale);

    useAnimationFrame((_, delta) => {
        const target = prefersReducedMotion
            ? camera.frame
            : evaluateCameraPath(camera.path, performance.now() - sequenceStart);
        // Exponential glide toward the target: frame-rate independent, and
        // invisible while the tour's target moves continuously — its job is
        // soaking up any discontinuity (a layout swap, a paused tab resuming)
        // as an ease instead of a cut.
        const alpha = prefersReducedMotion ? 1 : 1 - Math.exp(-delta / CAMERA_GLIDE_TAU_MS);
        camX.set(camX.get() + (target.x - camX.get()) * alpha);
        camY.set(camY.get() + (target.y - camY.get()) * alpha);
        camScale.set(camScale.get() + (target.scale - camScale.get()) * alpha);
    });

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
                    style={{ transformOrigin: '0px 0px', x: camX, y: camY, scale: camScale }}
                >
                {/* Three collaborators at work, over the whole surface so a
                    cursor can cross from the lyrics panel into the studio card
                    the way a real one does. Sits above both, below nothing —
                    and pointer-events-none throughout, so it never steals a
                    click from the controls underneath. */}
                {scale > 0 && (
                    <DemoCursorLayer
                        compact={compact}
                        // A musician's turn runs setup → take (→ Add track, for
                        // the vocalist). The setup anchor wins while they're at
                        // the controls, the take's sweep once they're rolling;
                        // with neither they fall back to their parked spot and
                        // drift. `busy` covers the whole turn (it stills the
                        // drift so the pointer can sit on its targets); the
                        // face disc only comes up for the spotlight beats —
                        // the takes, and the closing add-track — never the
                        // knob work, where it covered the dials being turned.
                        live={{
                            lyricist: {
                                anchor: caretAnchor,
                                busy: typedLyrics.typing,
                                face: typedLyrics.typing,
                            },
                            guitarist: {
                                anchor: setupAnchors[0] ?? recAnchors[0],
                                busy: script.reaching[0] || recRows[0].state === 'recording',
                                face: recRows[0].state === 'recording',
                            },
                            vocalist: {
                                anchor: setupAnchors[1] ?? recAnchors[1],
                                busy: script.reaching[1] || recRows[1].state === 'recording',
                                // The disc only for the take; all knob work —
                                // including the closing tweaks under the
                                // zoom-out — plays as a bare pointer.
                                face: recRows[1].state === 'recording',
                            },
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
                                layout={layoutReady}
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

                                {/* Knobs — live. Each is also a target the setup
                                    script's cursors fly to, hence the refs: the
                                    strip only exists on the full surface, and
                                    only the first two rows are scripted. */}
                                {!compact && (
                                    <div className="relative flex h-11 w-[240px] shrink-0 select-none items-center justify-between px-2">
                                        {([0, 1, 2, 3, 4] as const).map((k) => (
                                            <div
                                                key={k}
                                                ref={(el) => {
                                                    if (idx > 1) return;
                                                    if (!knobRefs.current[idx]) knobRefs.current[idx] = [];
                                                    knobRefs.current[idx][k] = el;
                                                }}
                                                className="pointer-events-none absolute h-11 w-11"
                                                style={{ left: 8 + k * 56 }}
                                            />
                                        ))}
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
                            <motion.div layout={layoutReady} className={`flex w-full shrink-0 items-center justify-center ${compact ? 'h-14' : 'h-16'}`}>
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

// --- "Share your success" slide -------------------------------------------
// A shared project as it actually appears in Connect: the record slides out of
// its sleeve behind the card and turns, the tonearm drops, the lyric spotlight
// walks the verse, and the engagement row collects likes.
//
// This is a rebuild of that card, not a reuse of it. The live PostCard lives
// inside ConnectTab and is wired to Firestore, auth, the edit/delete menu and
// comment threads — none of which belongs in onboarding, and none of which can
// be stubbed cheaply. What is shared is the part that matters here: the vinyl's
// conic gradient, its groove rings and spindle, the tonearm path, the card
// panel, the lyric spotlight's type scale and the footer buttons are all the
// same markup and the same classes, so it reads as the same component. If that
// card's styling changes, this is the second place to change.
// The authored surface hugs the card and the record peeking out behind it, so
// the card scales up to whatever room the slide has rather than floating in a
// box with slack around it. Shrinking these is what makes the card bigger.
const COMMUNITY_W = 604;
const COMMUNITY_H = 372;

// The verse walks a line at a time; the record keeps turning throughout.
const COMMUNITY_LINE_MS = 2300;
// Roughly how often a like lands. Deliberately uneven — a metronomic counter
// reads as a progress bar rather than as people arriving.
const COMMUNITY_LIKE_MS = [1500, 2600, 1900, 3100];
const COMMUNITY_HEART_MS = 1700;
// The poster's face, cropped square from the vocalist clip already shipping for
// the collaboration step — one more 1KB derivative rather than a new asset.
const COMMUNITY_AVATAR = '/onboarding-cards/avatar-elin.webp';

const PublishArt = () => {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();

    const lines = useMemo(
        () => t('onboarding.intro.slides.publish.demo.lines').split('\n'),
        [t],
    );

    // Authored at a fixed surface and scaled to whatever width the slide gives
    // it, the same way the canvas and studio demos work — so the card keeps
    // Connect's real proportions instead of reflowing into a different layout.
    const [scale, setScale] = useState(0);
    const [frame, setFrame] = useState<HTMLDivElement | null>(null);
    // Fit by whichever axis binds. Width is the usual one — the surface is
    // wider than it is tall — but on a short box the height has to win or the
    // card would be clipped by the frame it sits in.
    const fit = (w: number, h: number) => Math.min(w / COMMUNITY_W, h / COMMUNITY_H);
    const attachFrame = useCallback((node: HTMLDivElement | null) => {
        setFrame(node);
        if (node) {
            const box = node.getBoundingClientRect();
            setScale(Math.min(box.width / COMMUNITY_W, box.height / COMMUNITY_H));
        }
    }, []);

    useEffect(() => {
        if (!frame) return;
        const observer = new ResizeObserver(([entry]) => {
            setScale(fit(entry.contentRect.width, entry.contentRect.height));
        });
        observer.observe(frame);
        return () => observer.disconnect();
    }, [frame]);

    const [activeLine, setActiveLine] = useState(0);
    const [kudos, setKudos] = useState(128);
    const [hearts, setHearts] = useState<Array<{ id: number; drift: number }>>([]);
    const heartId = useRef(0);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

    // Walk the verse.
    useEffect(() => {
        if (prefersReducedMotion) return;
        const id = setInterval(
            () => setActiveLine((i) => (i + 1) % lines.length),
            COMMUNITY_LINE_MS,
        );
        return () => clearInterval(id);
    }, [lines.length, prefersReducedMotion]);

    // Centre the live line. Assigning scrollTop rather than calling
    // scrollIntoView, which would also scroll the page behind the carousel.
    useEffect(() => {
        const scroller = scrollerRef.current;
        const line = lineRefs.current[activeLine];
        if (!scroller || !line) return;
        scroller.scrollTop = line.offsetTop - (scroller.clientHeight - line.clientHeight) / 2;
    }, [activeLine]);

    // Likes arrive on an uneven cadence, each one throwing a heart.
    useEffect(() => {
        if (prefersReducedMotion) return;
        let step = 0;
        let timer: ReturnType<typeof setTimeout>;

        const beat = () => {
            setKudos((n) => n + 1);
            const id = heartId.current++;
            // A little sideways scatter so a run of them doesn't read as one
            // heart flickering in place.
            const drift = -14 + Math.random() * 28;
            setHearts((prev) => [...prev, { id, drift }]);
            setTimeout(
                () => setHearts((prev) => prev.filter((h) => h.id !== id)),
                COMMUNITY_HEART_MS,
            );
            timer = setTimeout(beat, COMMUNITY_LIKE_MS[step++ % COMMUNITY_LIKE_MS.length]);
        };

        timer = setTimeout(beat, COMMUNITY_LIKE_MS[0]);
        return () => clearTimeout(timer);
    }, [prefersReducedMotion]);

    // The card arrives closed and opens a beat later, so the record sliding
    // out of its sleeve, the tonearm swinging down and the panel shifting
    // right all play as the transition they are in the feed — rather than
    // being the state the slide simply appears in. The CSS transitions on
    // each piece do the work; this only flips the flag they read.
    const [opened, setOpened] = useState(false);
    useEffect(() => {
        if (prefersReducedMotion) return;
        const id = setTimeout(() => setOpened(true), 420);
        return () => clearTimeout(id);
    }, [prefersReducedMotion]);
    // Reduced motion gets the destination with no journey.
    const playing = prefersReducedMotion || opened;

    return (
        <div ref={attachFrame} className="relative h-full w-full overflow-hidden">
            <div
                className="absolute left-1/2 top-1/2"
                style={{
                    width: COMMUNITY_W,
                    height: COMMUNITY_H,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    transformOrigin: 'center',
                    opacity: scale ? 1 : 0,
                }}
            >
                {/* Left inset leaves room for the sleeve and record to peek out
                    from behind the card, exactly as they do in the feed. */}
                <div className="relative ml-14">
                    {/* Sleeve the record slides out of */}
                    <div
                        className={`absolute top-0 h-[240px] w-[230px] rounded-l-[24px] border-y border-l border-stone-300/30 bg-[#EBEBE3] transition-all duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none z-0 ${
                            playing ? '-left-6 opacity-100' : 'left-6 opacity-0'
                        }`}
                    />

                    {/* The record */}
                    <div
                        className={`pointer-events-none absolute top-1 z-0 h-[230px] w-[230px] select-none transition-all duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${
                            playing ? '-left-10 scale-100 opacity-100' : 'left-6 scale-75 opacity-0'
                        }`}
                    >
                        <div
                            className={`relative flex h-full w-full items-center justify-center rounded-full bg-[conic-gradient(from_0deg,#070605_0%,#4c4a46_12.5%,#070605_25%,#4c4a46_37.5%,#070605_50%,#4c4a46_62.5%,#070605_75%,#4c4a46_87.5%,#070605_100%)] shadow-[0_4px_24px_rgba(0,0,0,0.3)] ${
                                playing ? 'animate-spin-reverse' : ''
                            }`}
                            style={{ animationDuration: '4.5s' }}
                        >
                            <div className="pointer-events-none absolute inset-5 rounded-full border border-stone-700/15" />
                            <div className="pointer-events-none absolute inset-10 rounded-full border border-stone-700/20" />
                            <div className="pointer-events-none absolute inset-16 rounded-full border border-stone-700/15" />
                            <div className="pointer-events-none absolute inset-22 rounded-full border border-stone-700/20" />
                            <div className="pointer-events-none absolute inset-28 rounded-full border border-stone-700/15" />
                            <div className="shadow-3xs relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-stone-300 bg-[#FAF9F5]">
                                <div className="h-2 w-2 rounded-full bg-stone-900" />
                            </div>
                        </div>
                    </div>

                    {/* Tonearm */}
                    <div
                        className={`pointer-events-none absolute top-0 z-[5] h-36 w-12 origin-[32px_20px] transition-all duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${
                            playing ? '-left-2 rotate-[10deg] scale-100 opacity-100' : 'left-6 rotate-[-35deg] scale-95 opacity-0'
                        }`}
                    >
                        <svg className="h-full w-full drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.22)]" viewBox="0 0 48 144" fill="none">
                            <path d="M32 20 C 28 28, 16 38, 16 52 L 16 116" stroke="#EBEBE3" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                            <rect x="10" y="116" width="12" height="18" rx="2.5" fill="#EBEBE3" />
                        </svg>
                    </div>

                    {/* The card. overflow stays visible here, unlike the feed's,
                        so the hearts can leave the footer and rise past its
                        edge; the lyric viewport below does its own clipping. */}
                    <div
                        className={`relative z-10 flex w-[548px] flex-col justify-between rounded-[24px] border border-stone-200/60 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition-[transform,box-shadow] duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${
                            playing ? 'translate-x-3' : 'translate-x-0'
                        }`}
                    >
                        <div className="flex flex-grow flex-col justify-between p-6 pb-2">
                            {/* Header */}
                            <div className="relative mb-4 flex items-start justify-between">
                                <div className="flex flex-col">
                                    <span className="font-sans text-[20px] font-medium leading-snug tracking-tight text-[#2c2a29]">
                                        {t('onboarding.intro.slides.publish.demo.project')}
                                    </span>
                                    <span className="mt-1 flex items-center gap-2">
                                        <img
                                            src={COMMUNITY_AVATAR}
                                            alt=""
                                            aria-hidden="true"
                                            className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-stone-200/70"
                                        />
                                        <span className="font-sans text-[14px] font-normal text-stone-400">
                                            {t('onboarding.intro.slides.publish.demo.author')}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="z-20 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white shadow-sm">
                                        <Pause className="h-3.5 w-3.5 fill-white stroke-white" />
                                    </div>
                                    <span className="select-none rounded-full bg-[#F6F6F0] px-3 py-1 font-sans text-[13px] font-normal leading-none text-stone-500">
                                        {t('onboarding.intro.slides.publish.demo.badge')}
                                    </span>
                                </div>
                            </div>

                            {/* Lyric spotlight */}
                            <div className="relative mb-4 flex h-[196px] items-center py-2">
                                <div
                                    ref={scrollerRef}
                                    className="h-[196px] flex-1 select-none overflow-hidden scroll-smooth text-left"
                                >
                                    <div className="h-4 shrink-0" />
                                    {lines.map((line, idx) => (
                                        <div
                                            key={idx}
                                            ref={(el) => {
                                                lineRefs.current[idx] = el;
                                            }}
                                            className={`origin-left py-0.5 font-sans text-[34px] font-normal leading-[40px] tracking-wide text-[#656565] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                                idx === activeLine
                                                    ? 'translate-x-1.5 scale-102 opacity-100'
                                                    : 'translate-x-0 scale-95 opacity-15'
                                            }`}
                                        >
                                            {line}
                                        </div>
                                    ))}
                                    <div className="h-8 shrink-0" />
                                </div>
                            </div>

                            {/* Engagement */}
                            <div className="mt-2 flex items-center justify-between border-t border-stone-100/50 pt-2">
                                <div className="flex select-none items-center gap-6">
                                    {/* Likes — the counter climbs and each new one
                                        throws a heart up out of the icon. */}
                                    <div className="relative flex items-center gap-2 rounded-lg px-2 py-1 font-semibold text-stone-900">
                                        <Heart className="h-[17px] w-[17px] fill-[#FF4040] stroke-[#FF4040]" />
                                        <span className="font-sans text-[13px] font-medium leading-none tabular-nums">
                                            {kudos}
                                        </span>
                                        <div className="pointer-events-none absolute bottom-1 left-1.5">
                                            <AnimatePresence>
                                                {hearts.map((h) => (
                                                    <motion.div
                                                        key={h.id}
                                                        className="absolute"
                                                        initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
                                                        animate={{ opacity: [0, 1, 1, 0], y: -78, x: h.drift, scale: [0.4, 1, 1, 0.85] }}
                                                        transition={{ duration: COMMUNITY_HEART_MS / 1000, ease: 'easeOut', times: [0, 0.18, 0.72, 1] }}
                                                    >
                                                        <Heart className="h-[15px] w-[15px] fill-[#FF4040] stroke-[#FF4040]" />
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-full px-2 py-1 text-stone-555">
                                        <MessageSquare className="h-[17px] w-[17px] fill-none stroke-stone-500" />
                                        <span className="font-sans text-[13px] font-medium leading-none">24</span>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-lg px-2 py-1 text-stone-550">
                                        <Repeat className="h-[17px] w-[17px] stroke-stone-500" />
                                        <span className="font-sans text-[13px] font-medium leading-none">9</span>
                                    </div>
                                </div>

                                <div className="p-1 text-stone-400">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// No backdrop images on the carousel any more. Each step used to carry a soft,
// out-of-focus photograph at 30% behind its artwork; all of them are gone, and
// the frame is back to the plain neutral wash it had before they existed.
//
// Why they didn't work is worth keeping. Even at 30% they tinted the whole
// frame, so each step arrived in a different colour and the artwork — which is
// the actual argument on every one of these screens — sat on a surface that
// changed underneath it. Neutral lets the demo, the shapes and the lyric card
// be the only things on the screen with colour in them.
//
// The derived webp files go with this. The masters are untouched in
// `public/Onboarding assets/Song live collab` if the idea ever comes back.

// The pitch, in the order it's told: what this is, who you do it with, what you
// do it with, where it goes, and why any of it works. "Own your songs" used to
// close the run; it said the same thing the publish slide already says, so the
// run is five steps and that one is gone.
// Backdrops, by step id — a map rather than a field on the slide, because the
// opening step deliberately has none. The shapes pile is already a full-frame
// composition in its own colours; an image under it was one layer too many, and
// the plain cream is what lets the pile be the picture. Every step after it
// carries one.
//
// Each is a soft, out-of-focus image rather than a photograph of anything, and
// each sits at 30% over the card's cream — the image tints the surface rather
// than replacing it. At that strength they read as the frame being coloured,
// not as a picture, which is the point: the demo in front has to stay the thing
// being looked at.
//
// Derived at 960×720, WebP quality 55, from the masters in `public/Onboarding
// assets/Song live collab` — 514–1046px wide portraits totalling 593KB, shipped
// at 247KB. The frame is landscape, so `object-cover` on a 9:16 source would
// crop away most of the image and leave a flat wash; matching the derivative's
// shape to the frame's is what keeps each one legible. Regenerate with:
//
//   sharp(src).resize(960, 720, { fit: 'cover', position: 'centre' })
//             .webp({ quality: 55, effort: 6 })
//
// The set is lopsided — psychology is 7KB, publish 123KB. Not a mistake in the
// settings: the sky master is heavy film grain, and grain is noise, so it
// barely responds to quality or resolution. Blurring it away nearly halves it,
// at about 1% mean pixel difference once composited at 30%. Left in, because
// the grain is most of what that image is.
//
// Masters, for when one of these needs rebuilding: tools is `3.1.jpg` (and was
// `3.jpg` before it, whose derivative the recipe above reproduces byte for byte
// at 36,676 — which is how it was identified after being overwritten once).
// Worth knowing that the derivative's size is a fingerprint of its master, since
// nothing else here records which file each one came from.
//
// tools is the heavy one now, at 146KB: 3.1.jpg is dense film grain over a soft
// teal wash, and grain is noise, so it barely responds to quality — 55 down to
// 35 buys 36KB and starts eating the wash. A 1.2px blur takes it to 32KB, but
// that is the whole texture gone, and the texture is what the image is. Same
// call as the sky, for the same reason.
// The `-on-cream` derivatives are these images already composited over the
// card's own #FCF7DE — at 30%, or 70% for science, which arrives soft in the
// file and only needed holding back a little. They are drawn at full opacity.
//
// This used to be done at runtime: the raw image at `opacity-30` over the
// cream. It rendered correctly in Chrome and near-black in Safari, where the
// whole card went dark and the #363636 headline vanished into it while the
// opaque white panels in front stayed right. A partial opacity promotes the
// <img> to its own composited layer, and this one sits inside an ancestor that
// is `overflow: hidden` with a 28px radius — WebKit has a long-standing family
// of bugs where a composited layer clipped to a rounded rect composites against
// black rather than against what is behind it.
//
// Baking the blend removes the mechanism rather than working around it: with no
// sub-1 opacity there is no separate layer and nothing left to blend wrongly.
// The pixels are identical to what the runtime blend produced (verified to
// within 0.3/255), and the files got much smaller as a bonus — 395KB to 87KB,
// because the film grain that made them expensive is most of what fading to 30%
// was throwing away anyway.
//
// New filenames rather than overwriting: an opaque image is now drawn at full
// strength, so a stale cached copy of the *un*faded original would render at
// full contrast instead of subtly. Changing the path makes that impossible.
//
// Regenerate from the masters with:
//   out = op * (src over #FCF7DE) + (1 - op) * #FCF7DE
const SLIDE_BACKDROPS: Record<string, string> = {
    collab: '/onboarding-cards/backdrop-collab-on-cream.webp',
    tools: '/onboarding-cards/backdrop-tools-on-cream.webp',
    publish: '/onboarding-cards/sky-backdrop-on-cream.webp',
    psychology: '/onboarding-cards/backdrop-science-on-cream.webp',
};

const SLIDES: IntroSlide[] = [
    { id: 'modern_way', image: null, Art: ModernWayArt },
    { id: 'collab', image: null, Art: StudioDemoArt },
    { id: 'tools', image: null, Art: CreateCanvasArt },
    { id: 'publish', image: null, Art: PublishArt },
    { id: 'psychology', image: null, Art: PsychologyArt },
];

export default function IntroCarousel({ onComplete, startAtEnd = false, onIndexChange }: {
    onComplete: () => void;
    // True when the user backed out of the quiz — the carousel opens on its
    // last slide so the journey reverses step for step.
    startAtEnd?: boolean;
    /**
     * Reports which slide is showing. The page needs it because the painted
     * backdrop behind this card is a page-level element: it belongs to the
     * opening slide only, and the carousel is the only thing that knows when
     * that slide is on screen. Pass a stable setter — this fires on mount and
     * on every move.
     */
    onIndexChange?: (index: number) => void;
}) {
    const { t } = useLanguage();
    const [index, setIndex] = useState(startAtEnd ? SLIDES.length - 1 : 0);

    useEffect(() => {
        onIndexChange?.(index);
    }, [index, onIndexChange]);
    // Which shape on the modern_way slide the pointer is over, if any — the
    // headline swaps to that shape's own line while it's hovered.
    const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);

    // Whether the actions row is currently pinned to the bottom edge rather
    // than sitting in flow under the carousel. Only used to fade in the scrim
    // behind it — see the sentinel at the end of the render.
    const [actionsStuck, setActionsStuck] = useState(false);
    const stickySentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = stickySentinelRef.current;
        if (!sentinel || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            ([entry]) => setActionsStuck(!entry.isIntersecting),
            // Fully-in-view or not: the row is pinned precisely when the
            // marker below it has been pushed past the bottom of the screen.
            { threshold: 1 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

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
            {/* One frame for all five slides: identical width and identical
                height on every step, measured. The height isn't set here — it
                falls out of the parts, because every slide stacks the same
                two-line title block on an art box whose height is chosen to
                make up for whatever padding that slide gives up. Some slides do
                run their artwork edge to edge (see below), so the padding is
                not the same everywhere; what is the same is the total. Each
                slide's artwork then fits itself INSIDE the art box instead of
                dictating the frame's shape the way it used to. */}
            <div
                // The studio demo runs full-bleed from `md` up: it's a whole
                // product UI, and the side and bottom gutters were costing it
                // ~10% of its linear size for nothing — at the camera tour's
                // closest framing that read as the container cropping the
                // studio. The whole padding set is swapped rather than
                // overridden: `md:px-0` after `md:px-8` does nothing, since
                // same-variant utilities from one family are ordered by the
                // build, not by this class list. (Cancelling it from the art
                // box instead doesn't work either — `space-y-10` sets
                // `margin-bottom: 0` at a specificity no single utility beats.)
                // The art box takes the freed 48px back as height, so the
                // frame's outer size is unchanged and the box stays constant
                // across all five slides. The headline is unaffected — it
                // carries its own `px-6` and centres itself.
                // One surface on every step. The cream is the card's own, not
                // something showing through it: the page carries a painted
                // ground, and a translucent wash over that would just pick up
                // whatever happened to be behind it.
                className={`relative overflow-hidden rounded-[28px] border border-stone-200/70 bg-[#FCF7DE] shadow-[0_8px_30px_rgba(0,0,0,0.02)] ${
                    slide.id === 'collab'
                        ? 'px-4 py-6 md:px-0 md:pb-0 md:pt-7'
                        // The shapes and community slides both run edge to
                        // edge, so their artwork meets the frame.
                        : slide.id === 'modern_way' || slide.id === 'publish'
                            ? 'px-0 pb-0 pt-6 md:pt-7'
                            : 'px-4 py-6 md:px-8 md:py-8'
                }`}
            >
                {/* Every backdrop is mounted, and only the current step's is at
                    30% — the rest sit at zero. Rendering just the active image
                    would mean fetching it at the moment the step changes, and a
                    backdrop arriving a beat after the slide it belongs to is
                    exactly the flinch the instant swap below exists to avoid.
                    Mounting the set costs 247KB once, on a screen that already
                    streams three videos.

                    Filtered, not mapped over every slide: the opening step has
                    no backdrop and must render no <img> at all, since one with
                    an undefined `src` still fires a request — for the page
                    itself, which then decodes as a broken image.

                    They live outside the keyed slide below on purpose, so a
                    step change doesn't unmount and refetch them.

                    Still no white scrim at the top. The community step's
                    vignette is also still gone, though its reason is back now
                    that the sky is: it kept the white lyric card from
                    dissolving into the clouds behind it. */}
                {/* Full strength, never a fraction: the fade is already in the
                    file (see SLIDE_BACKDROPS). The inactive ones are hidden at
                    `opacity-0`, which draws nothing at all — it is only a
                    partial opacity that makes WebKit blend a composited layer,
                    and there is no longer one of those here. */}
                {SLIDES.filter((s) => SLIDE_BACKDROPS[s.id]).map((s) => (
                    <img
                        key={s.id}
                        src={SLIDE_BACKDROPS[s.id]}
                        alt=""
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center ${
                            s.id === slide.id ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                ))}

                {/* No AnimatePresence here, and no motion on the swap: moving
                    between slides is instant. That is also what fixes the
                    height. `mode="wait"` held the outgoing slide for its exit
                    animation, removed it, and only then mounted the next one —
                    and in the beat between the two the frame had no child at
                    all, so it collapsed to its own padding and sprang back.
                    That flinch was the transition, not the layout: with the
                    swap instant there is never a frame without a slide in it,
                    and the box is the same height from the first paint to the
                    last.

                    `key` stays. It isn't for animation — it forces each slide's
                    artwork to mount fresh, so the demos start from the top of
                    their loops rather than resuming mid-take. */}
                <div key={slide.id} className="relative z-10 space-y-2 md:space-y-2.5">
                        {/* The mark lives inside the card here rather than
                            floating above the page — on a painted backdrop it
                            needs the card's ground to sit on to stay legible.
                            The page hides its own copy on this step. */}
                        <Link href="/" className="mx-auto block w-fit transition-opacity hover:opacity-80">
                            <svg viewBox="0 0 151 39" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-[104px] md:w-[124px]" aria-label="Veinote">
                                <path d="M26.8756 9.80365C27.7045 8.52842 28.0552 7.52417 27.9276 6.79091C27.832 6.05765 27.4016 5.51568 26.6365 5.16499C25.8713 4.8143 24.8671 4.59113 23.6237 4.49549L23.8628 3.53906C24.1816 3.57094 24.7555 3.60282 25.5844 3.6347C26.4452 3.6347 27.3538 3.65064 28.3102 3.68252C29.2985 3.68252 30.0796 3.68252 30.6535 3.68252C31.323 3.68252 31.9606 3.66658 32.5663 3.6347C33.172 3.60282 33.73 3.57094 34.2401 3.53906L34.0009 4.49549C33.2358 4.71865 32.5344 5.02152 31.8968 5.40409C31.2911 5.75478 30.6535 6.3127 29.984 7.07784C29.3145 7.8111 28.5493 8.84723 27.6885 10.1862L9.85119 37.6357C9.24545 37.5719 8.63972 37.54 8.03398 37.54C7.46012 37.54 6.87033 37.5719 6.26459 37.6357L2.48671 7.55605C2.35918 6.40834 2.02444 5.62726 1.48246 5.21281C0.940486 4.76647 0.446332 4.52737 0 4.49549L0.239107 3.53906C1.16365 3.57094 2.35918 3.60282 3.8257 3.6347C5.32411 3.66658 6.80657 3.68252 8.27309 3.68252C9.99465 3.68252 11.5728 3.66658 13.0074 3.6347C14.4739 3.60282 15.6694 3.57094 16.594 3.53906L16.3549 4.49549C15.3347 4.52737 14.5217 4.65489 13.916 4.87806C13.3103 5.10122 12.8958 5.48379 12.6726 6.02577C12.4814 6.56774 12.4335 7.39665 12.5292 8.51248L14.8246 29.6017L12.6726 31.6102L26.8756 9.80365Z" fill="#363636"/>
                                <path d="M134.341 27.212C135.521 26.7019 136.653 26.1281 137.737 25.4905C138.821 24.821 139.777 24.1036 140.606 23.3385C141.849 22.1589 142.869 20.804 143.666 19.2737C144.463 17.7115 144.862 16.0378 144.862 14.2525C144.862 13.7105 144.798 13.3438 144.671 13.1526C144.543 12.9613 144.352 12.8656 144.097 12.8656C143.427 12.8656 142.694 13.2323 141.897 13.9655C141.1 14.6669 140.319 15.6233 139.554 16.8348C138.789 18.0144 138.087 19.3693 137.45 20.8996C136.844 22.398 136.35 23.9602 135.967 25.5861C135.585 27.1801 135.393 28.7423 135.393 30.2726C135.393 32.0898 135.744 33.3172 136.445 33.9548C137.179 34.5925 138.119 34.9113 139.267 34.9113C140 34.9113 141.004 34.6562 142.28 34.1461C143.555 33.6041 144.814 32.6477 146.058 31.2768L146.823 31.6594C146.153 32.7115 145.26 33.7317 144.145 34.72C143.029 35.7083 141.722 36.5212 140.223 37.1589C138.725 37.7646 137.067 38.0675 135.25 38.0675C133.783 38.0675 132.444 37.8124 131.233 37.3023C130.053 36.7922 129.113 36.043 128.411 35.0547C127.71 34.0345 127.359 32.7912 127.359 31.3247C127.359 29.5393 127.646 27.7381 128.22 25.9209C128.794 24.1036 129.607 22.3661 130.659 20.7083C131.711 19.0186 132.97 17.5202 134.437 16.2131C135.935 14.906 137.577 13.8699 139.363 13.1047C141.148 12.3396 143.077 11.957 145.149 11.957C146.679 11.957 147.97 12.2918 149.022 12.9613C150.074 13.5989 150.601 14.6031 150.601 15.974C150.601 17.1855 150.266 18.3332 149.596 19.4172C148.927 20.4692 148.018 21.4416 146.87 22.3343C145.755 23.2269 144.479 24.0239 143.045 24.7253C141.642 25.4267 140.191 26.0324 138.693 26.5425C137.195 27.0526 135.728 27.4511 134.293 27.7381L134.341 27.212Z" fill="#363636"/>
                                <path d="M131.023 12.626L130.879 13.5824H113.711L113.951 12.626H131.023ZM119.928 33.3326C119.705 34.0658 119.705 34.6238 119.928 35.0063C120.151 35.357 120.502 35.5324 120.98 35.5324C121.618 35.5324 122.255 35.1976 122.893 34.5281C123.563 33.8267 124.121 32.8703 124.567 31.6588L125.332 29.6503H126.241L125.332 32.3762C124.694 34.2252 123.738 35.6439 122.463 36.6323C121.219 37.5887 119.705 38.0669 117.92 38.0669C116.389 38.0669 115.21 37.7162 114.381 37.0148C113.552 36.2816 113.058 35.3251 112.898 34.1455C112.739 32.9341 112.867 31.5951 113.281 30.1286L120.359 5.5484C121.921 5.51652 123.323 5.45276 124.567 5.35712C125.81 5.26147 127.022 5.10207 128.201 4.87891L119.928 33.3326Z" fill="#363636"/>
                                <path d="M102.856 12.9135C102.219 12.9135 101.501 13.3598 100.704 14.2525C99.9391 15.1451 99.174 16.3407 98.4088 17.8391C97.6437 19.3375 96.9423 21.0112 96.3047 22.8603C95.6671 24.7094 95.157 26.6063 94.7744 28.551C94.3918 30.4958 94.2005 32.3608 94.2005 34.1461C94.2005 35.2301 94.2962 35.9952 94.4875 36.4415C94.7106 36.8879 95.0454 37.111 95.4917 37.111C96.0974 37.111 96.7829 36.6966 97.548 35.8677C98.3132 35.0069 99.0624 33.8592 99.7956 32.4246C100.561 30.958 101.262 29.3162 101.9 27.499C102.537 25.6499 103.047 23.737 103.43 21.7604C103.845 19.7838 104.052 17.855 104.052 15.974C104.052 14.6988 103.94 13.8699 103.717 13.4873C103.494 13.1047 103.207 12.9135 102.856 12.9135ZM87.0273 30.0813C87.0273 28.5829 87.2346 27.0048 87.649 25.347C88.0635 23.6892 88.6851 22.0792 89.5141 20.517C90.343 18.923 91.395 17.4884 92.6703 16.2131C93.9774 14.906 95.4917 13.8699 97.2133 13.1047C98.9348 12.3396 100.896 11.957 103.095 11.957C105.71 11.957 107.718 12.6425 109.121 14.0133C110.524 15.3842 111.225 17.3608 111.225 19.9432C111.225 21.4416 111.018 23.0197 110.603 24.6775C110.189 26.3353 109.567 27.9612 108.738 29.5553C107.909 31.1174 106.841 32.5521 105.534 33.8592C104.259 35.1344 102.761 36.1546 101.039 36.9198C99.3174 37.6849 97.3567 38.0675 95.157 38.0675C92.5427 38.0675 90.5342 37.382 89.1315 36.0111C87.7287 34.6403 87.0273 32.6637 87.0273 30.0813Z" fill="#363636"/>
                                <path d="M66.5958 37.398H58.9922L64.8264 16.6913C64.9858 16.2131 65.0814 15.8146 65.1133 15.4958C65.1452 15.177 65.0974 14.9379 64.9699 14.7785C64.8742 14.5872 64.667 14.4916 64.3482 14.4916C63.8062 14.4916 63.312 14.7307 62.8657 15.2089C62.4513 15.6871 61.989 16.5798 61.4789 17.8869L60.4746 20.5649H59.566L60.905 16.8826C61.5108 15.1292 62.3397 13.8699 63.3917 13.1047C64.4438 12.3396 65.735 11.957 67.2653 11.957C68.4449 11.957 69.3694 12.1643 70.0389 12.5787C70.7403 12.9613 71.2185 13.4873 71.4735 14.1568C71.7286 14.8263 71.8402 15.5596 71.8083 16.3566C71.7764 17.1217 71.6648 17.8869 71.4735 18.652L66.5958 37.398ZM67.9348 29.9378C69.21 26.2397 70.3896 23.2269 71.4735 20.8996C72.5575 18.5723 73.6096 16.7551 74.6298 15.448C75.6818 14.109 76.7498 13.2004 77.8338 12.7222C78.9496 12.2121 80.1292 11.957 81.3726 11.957C82.9347 11.957 84.0665 12.2918 84.7679 12.9613C85.4693 13.5989 85.8359 14.4756 85.8678 15.5914C85.8996 16.6754 85.6924 17.8709 85.2461 19.178L80.5118 33.3332C80.2248 34.2258 80.177 34.8156 80.3683 35.1025C80.5596 35.3895 80.8146 35.5329 81.1335 35.5329C81.4841 35.5329 81.8986 35.3417 82.3768 34.9591C82.855 34.5446 83.3651 33.6041 83.9071 32.1376L84.8157 29.6509H85.7243L84.5288 33.1419C84.0824 34.4809 83.4926 35.5011 82.7594 36.2024C82.058 36.9038 81.2769 37.382 80.4161 37.6371C79.5872 37.924 78.7583 38.0675 77.9294 38.0675C76.973 38.0675 76.1441 37.924 75.4427 37.6371C74.7732 37.3501 74.2472 36.9357 73.8646 36.3937C73.4183 35.7561 73.1792 34.9431 73.1473 33.9548C73.1473 32.9665 73.4023 31.6913 73.9124 30.1291L78.1207 17.5043C78.312 16.9623 78.4395 16.4841 78.5033 16.0697C78.567 15.6233 78.5511 15.2726 78.4555 15.0176C78.3598 14.7625 78.1526 14.635 77.8338 14.635C77.2599 14.635 76.6064 15.0495 75.8731 15.8784C75.1399 16.7073 74.3747 17.8391 73.5777 19.2737C72.7807 20.7083 71.9677 22.3661 71.1388 24.2471C70.3099 26.1281 69.5129 28.1366 68.7477 30.2726C68.0145 32.3767 67.3769 34.4968 66.8349 36.6328L67.9348 29.9378Z" fill="#363636"/>
                                <path d="M51.7705 5.06906C51.7705 3.34749 52.3284 2.07226 53.4442 1.24335C54.56 0.414451 55.9469 0 57.6047 0C59.0074 0 60.0595 0.270987 60.7609 0.812963C61.4941 1.35494 61.8608 2.1679 61.8608 3.25185C61.8608 4.75025 61.2869 5.96172 60.1392 6.88627C59.0234 7.77893 57.6366 8.22527 55.9787 8.22527C54.6079 8.22527 53.5558 7.95428 52.8225 7.4123C52.1212 6.87033 51.7705 6.08925 51.7705 5.06906ZM49.762 16.6418C50.2083 15.3028 50.0648 14.6333 49.3316 14.6333C48.8534 14.6333 48.407 14.8565 47.9926 15.3028C47.5781 15.7173 47.1477 16.4984 46.7014 17.6461L45.6015 20.5632H44.6929L46.0319 16.8331C46.4782 15.6216 47.0362 14.6652 47.7057 13.9638C48.407 13.2306 49.22 12.7045 50.1445 12.3857C51.0691 12.0669 52.0733 11.9075 53.1573 11.9075C54.3688 11.9075 55.3411 12.1147 56.0744 12.5292C56.8076 12.9436 57.3337 13.4856 57.6525 14.1551C57.9713 14.7927 58.1307 15.51 58.1307 16.3071C58.1307 17.0722 58.0032 17.8373 57.7481 18.6025L52.7747 33.3315C52.5197 34.1285 52.4719 34.6704 52.6313 34.9574C52.7907 35.2124 53.0298 35.3399 53.3486 35.3399C53.6355 35.3399 54.0021 35.1805 54.4485 34.8617C54.8948 34.511 55.373 33.6662 55.8831 32.3272L56.8874 29.6492H57.796L56.6004 33.1402C56.1222 34.4792 55.5165 35.4994 54.7832 36.2007C54.05 36.9021 53.237 37.3803 52.3443 37.6354C51.4835 37.9223 50.6228 38.0658 49.762 38.0658C48.3592 38.0658 47.2115 37.7788 46.3188 37.205C45.4581 36.5992 44.932 35.6906 44.7407 34.4792C44.5495 33.2358 44.7567 31.6896 45.3624 29.8405L49.762 16.6418Z" fill="#363636"/>
                                <path d="M28.91 27.3525C29.9302 26.8743 30.9345 26.3005 31.9228 25.631C32.9111 24.9615 33.8197 24.2282 34.6486 23.4312C35.9238 22.1878 36.96 20.7691 37.757 19.1751C38.5859 17.581 39.0003 15.8595 39.0003 14.0104C39.0003 13.5641 38.9366 13.2612 38.8091 13.1018C38.6815 12.9105 38.4902 12.8149 38.2352 12.8149C37.5976 12.8149 36.8962 13.1815 36.1311 13.9147C35.3978 14.6161 34.6645 15.5726 33.9313 16.784C33.198 17.9636 32.5285 19.3026 31.9228 20.801C31.3489 22.2994 30.8707 23.8456 30.4881 25.4397C30.1375 27.0018 29.9621 28.5162 29.9621 29.9827C29.9621 31.8318 30.3287 33.0752 31.062 33.7128C31.7953 34.3185 32.7517 34.6214 33.9313 34.6214C34.5689 34.6214 35.5253 34.3823 36.8006 33.9041C38.0758 33.4258 39.351 32.5491 40.6263 31.2739L41.3914 31.6565C40.69 32.7085 39.7655 33.7287 38.6178 34.717C37.4701 35.7053 36.1151 36.5183 34.553 37.1559C32.9908 37.7616 31.2374 38.0645 29.2926 38.0645C27.7942 38.0645 26.4074 37.8095 25.1322 37.2994C23.8888 36.7893 22.8846 36.0401 22.1194 35.0518C21.3862 34.0316 21.0195 32.7882 21.0195 31.3217C21.0195 29.4407 21.3065 27.5757 21.8803 25.7266C22.4861 23.8775 23.3309 22.1241 24.4148 20.4663C25.4988 18.8085 26.79 17.3419 28.2884 16.0667C29.8187 14.7596 31.5083 13.7394 33.3574 13.0061C35.2065 12.2729 37.1831 11.9062 39.2873 11.9062C40.977 11.9062 42.3797 12.2569 43.4955 12.9583C44.6433 13.6278 45.2171 14.6799 45.2171 16.1145C45.2171 17.326 44.8983 18.4737 44.2607 19.5577C43.6231 20.6097 42.7463 21.5821 41.6305 22.4748C40.5147 23.3355 39.2554 24.1166 37.8526 24.818C36.4499 25.5194 34.9674 26.1251 33.4052 26.6352C31.875 27.1453 30.3606 27.5438 28.8622 27.8307L28.91 27.3525Z" fill="#363636"/>
                            </svg>
                        </Link>
                    {/* Every title is two lines, and where it breaks is set
                        in the locale string rather than left to the box —
                        same arrangement as the shape labels on the
                        modern_way slide. Two reasons. The break is a
                        per-language editorial call (the Norwegian and
                        Swedish titles don't divide where the English ones
                        do), and, more importantly, a title that wrapped to
                        three lines on its own would push this block taller
                        and the whole frame with it, so the carousel would
                        change size between steps. `min-h` still holds two
                        lines open, so a short title can't shrink the frame
                        either.

                        The size is a clamp rather than breakpoint steps
                        because what has to hold is a property of the text,
                        not of the viewport: the longest line in any locale
                        is 22 characters, and this keeps that line inside
                        the box at every width down to a 320px phone. Fixed
                        steps would let it wrap somewhere between two
                        breakpoints and take the frame's height with it. */}
                    {/* The headline swaps with the slide, in the same paint.
                        It used to roll like a counter — the old line out
                        the top, the new one up from below — which is
                        exactly the kind of motion between steps that is
                        gone now. `min-h` still holds the two lines open, so
                        the block is the same height whichever title is in
                        it. */}
                    <h2 className="mx-auto max-w-2xl px-3 text-center text-[clamp(1.15rem,4.8vw,2.75rem)] font-sans font-light leading-[1.1] tracking-tight text-[#363636] sm:px-6">
                        <span className="grid min-h-[2.2em] place-items-center">
                            {/* The locale string's own newline is the line
                                break. */}
                            <span className="block whitespace-pre-line">{title}</span>
                        </span>
                    </h2>
                    {/* The art box: one fixed height on every slide, which
                        is what holds the frame constant. Each artwork keeps
                        its own aspect ratio INSIDE it — `h-full` plus an
                        aspect-ratio makes the browser derive the width from
                        the height, and `max-w-full` caps it on narrow
                        screens (where the art simply ends up shorter than
                        the box, anchored to its top edge). The two demos
                        keep their authored surfaces; the shapes slide
                        instead fills the box and lets the SVG fit itself,
                        so nothing is ever squashed. */}
                    {/* 488 = the shared 440 plus the 48px of frame padding
                        the studio slide gives up above, so every slide's art
                        block still occupies the same total height and the
                        frame cannot change size between steps. Below `md`
                        the studio keeps the shared inset: its compact
                        surface is far taller relative to its width, and
                        full-bleed there would need half again as much
                        height as the box has. */}
                    <div
                        className={`w-full ${
                            // One height per slide rather than a shared base
                            // with overrides: two `md:h-*` utilities in one
                            // list are resolved by build order, not by this
                            // list's order.
                            //
                            // Steps 2–5 all come to the same total, because each
                            // bleeding slide adds back exactly the padding it
                            // drops. The frame is `py-6` (24 a side) below `md`
                            // and `md:py-8` (32) at it, so:
                            //
                            //   padded    192 + 48 = 240 | 256 + 48 = 304 | 352 + 64 = 416
                            //   collab    192 + 48 = 240 | 256 + 48 = 304 | 388 + 28 = 416
                            //   bleeding  216 + 24 = 240 | 280 + 24 = 304 | 388 + 28 = 416
                            //
                            // A bleeding step gives up its bottom padding, so it
                            // takes that back as art height and lands on the
                            // same total. Collab keeps its side and bottom
                            // padding below `md` and only bleeds from `md` up,
                            // which is why its first two columns match the
                            // padded steps rather than the bleeding ones.
                            //
                            // The headline reserves two lines regardless of what
                            // it holds (see the `min-h` on it above): matching
                            // these boxes exactly still leaves the frame jumping
                            // if a one-line title makes its own card shorter.
                            slide.id === 'modern_way' || slide.id === 'publish'
                                ? 'h-[216px] sm:h-[280px] md:h-[388px]'
                                : slide.id === 'collab'
                                    ? 'h-[192px] sm:h-[256px] md:h-[388px]'
                                    : 'h-[192px] sm:h-[256px] md:h-[352px]'
                        }`}
                    >
                        <div
                            className={`mx-auto h-full max-w-full ${
                                slide.id === 'tools'
                                    ? 'aspect-[880/520]'
                                    : slide.id === 'collab'
                                        // Below md the compact surface gets an
                                        // exact-ratio box. From `md` the wrapper
                                        // fills the whole art box instead of
                                        // keeping the surface's ratio: the box
                                        // is 488px against a ratio-height of
                                        // ~485 at the frame's real width, and
                                        // that 3px remainder sat below the
                                        // studio as a visible sliver at every
                                        // camera position. Filling the box puts
                                        // the remainder inside the demo's own
                                        // clip, where the wide frame counts it
                                        // as bottom margin and any zoom-in
                                        // covers it entirely.
                                        ? 'aspect-[560/440] md:aspect-auto md:h-full md:w-full'
                                        // The shapes slide takes no ratio of
                                        // its own — it fills the box and the
                                        // SVG's preserveAspectRatio fits the
                                        // pile inside it.
                                        : 'w-full'
                            }`}
                        >
                            {slide.image ? (
                                <img src={slide.image} alt={title} className="h-full w-full object-contain" />
                            ) : (
                                <slide.Art onBubbleHover={setHoveredBubble} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Back on the left, dots in the middle, Next on the right — the
                same seats these controls hold in the quiz that follows, so the
                hand doesn't have to relearn the page between steps. The Back
                slot keeps its width on the first slide so the dots don't shift
                when the button appears.

                Sticky rather than fixed, which is the whole point: on a screen
                tall enough for the carousel this row sits exactly where it
                always has, in flow, untouched. Only when the page has to scroll
                does it lift off and hold the bottom edge, so the artwork keeps
                its full size and there is still no step nobody can advance
                past. (Requires that no ancestor be a scroll container — see the
                `overflow-x-clip` on the page shell.) */}
            {/* items-center centres the boxes, but the CTA hangs a 6px solid
                shadow below its face and a shadow takes up no layout, so its
                visual mass sat half that low against the back arrow and dots.
                The matching bottom margin on the button gives the shadow the
                space it occupies, which puts the face back on the row's line. */}
            <div className="sticky bottom-4 z-20 flex items-center justify-center gap-4">
                {/* Only drawn once the row is actually floating over content —
                    which is to say, only on a screen too short to hold the step.
                    A scrim that were always on would change the look of the
                    screens that never needed it.

                    Glass, not a wash: this sits over a painted backdrop and
                    over the demos, and a cream gradient across them reads as a
                    band of paper laid on the picture. A blur keeps whatever is
                    behind it visible as itself while still giving the controls
                    something to be legible against — and it matches the quiz's
                    own actions bar, which the visitor meets a screen later.

                    Inset to the row rather than bled to the edges, so it reads
                    as a pill holding the controls instead of a full-width
                    curtain across the bottom of the card. */}
                <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-x-4 -bottom-3 -top-3 -z-10 rounded-[36px] bg-[#DCDDD4]/35 backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-300 ${
                        actionsStuck ? 'opacity-100' : 'opacity-0'
                    }`}
                />

                {/* Step one is the opening screen, not a step in a sequence, so
                    it carries one control and nothing else: no back (there is
                    nothing behind it) and no dots (they would be counting a
                    journey that hasn't begun). The button runs the full width
                    it is given, which is what makes it read as the way in
                    rather than as the next in a row. */}
                {index === 0 ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="mx-auto flex w-full max-w-[440px] items-center justify-center gap-3 rounded-full bg-[#86BE7F] px-10 py-6 text-xl font-medium tracking-tight text-stone-900 mb-[6px] shadow-[0_6px_0_0_#5F9857] transition-[transform,box-shadow] duration-100 hover:brightness-[1.03] active:translate-y-[6px] active:shadow-[0_0_0_0_#5F9857] sm:text-2xl"
                    >
                        {t('onboarding.intro.get_started')}
                        <ArrowRight className="h-7 w-7 stroke-[1.75px] sm:h-8 sm:w-8" />
                    </button>
                ) : (
                    <>
                        {/* Back, dots and CTA travel as one group, centred as
                            a group rather than spread across the row. In flow,
                            not pinned — pinning these left centres the CTA on
                            its own and leaves the controls stranded out at the
                            edge. */}
                        <div className="flex items-center gap-5">
                        <button
                            type="button"
                            onClick={() => goTo(index - 1)}
                            aria-label={t('onboarding.go_back')}
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/55 text-stone-700 transition-colors hover:bg-white hover:text-stone-900"
                        >
                            <ArrowLeft size={22} className="stroke-[2.25px]" />
                        </button>

                        {/* Where you are, in five dots: the one you're on is
                            larger and solid, the ones behind you stay solid but
                            small, the ones ahead are faint. They're buttons, not
                            decoration — the carousel has no state to build up,
                            so jumping straight to a step costs nothing. */}
                        <div className="flex shrink-0 items-center gap-2">
                            {SLIDES.map((s, i) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => goTo(i)}
                                    aria-label={t(`onboarding.intro.slides.${s.id}.title`)}
                                    aria-current={i === index}
                                    className={`rounded-full transition-all duration-300 ${
                                        i === index
                                            ? 'h-3 w-3 bg-stone-900'
                                            : i < index
                                                ? 'h-2 w-2 bg-stone-900'
                                                : 'h-2 w-2 bg-stone-900/20 hover:bg-stone-900/40'
                                    }`}
                                />
                            ))}
                        </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleNext}
                            // The press is the shadow, not a scale: the button
                            // carries a solid offset beneath it, and on `active`
                            // it drops by exactly that offset while the shadow
                            // collapses to nothing. The two cancel, so the face
                            // lands where the shadow was and the whole control
                            // reads as pushed into the page rather than merely
                            // shrinking.
                            className="flex w-full max-w-[340px] items-center justify-center gap-3 rounded-full bg-[#86BE7F] px-10 py-5 text-lg font-medium tracking-tight text-stone-900 mb-[6px] shadow-[0_6px_0_0_#5F9857] transition-[transform,box-shadow] duration-100 hover:brightness-[1.03] active:translate-y-[6px] active:shadow-[0_0_0_0_#5F9857] sm:text-xl"
                        >
                            {t('onboarding.intro.next')}
                            <ArrowRight className="h-6 w-6 stroke-[1.75px] sm:h-7 sm:w-7" />
                        </button>
                    </>
                )}

            </div>

            {/* Tells the row above whether it is currently stuck. A bottom-
                sticky element is pinned exactly while the thing after it is
                pushed out of view, so watching this 1px marker is the whole
                test — no scroll listener, no measuring. */}
            {/* `!mt-0` because the wrapper's `space-y-8` would otherwise hang
                32px of dead air off the bottom of the page for a 1px marker. */}
            <div ref={stickySentinelRef} aria-hidden="true" className="h-px w-full !mt-0" />
        </motion.div>
    );
}
