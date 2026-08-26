/**
 * The burst used to mark the two moments in the flow worth marking: the plan
 * landing, and the card going in.
 *
 * Fourteen pieces, three colours, all of them small. A screenful of paper would
 * be marking these louder than they deserve — this is a nod, not a parade.
 *
 * Fixed rather than random: a burst that is different every time is a burst
 * nobody tuned. The pieces are placed to clear the middle of whatever they sit
 * behind, where the words or the mark are, and to gather at its ends.
 *
 * `x` is where a piece starts across the box, the rest is where it goes: `dx`
 * and `dy` in px from there, `r` degrees of turn on the way, `d` ms of delay so
 * they do not all leave on the same frame. The animation itself, and its
 * reduced-motion opt-out, live on `.confetti-piece` in globals.css.
 *
 * Absolutely positioned and `-z-10`, so it needs a positioned parent and paints
 * behind that parent's own content.
 */
const CONFETTI = [
    { x: 8, dx: -34, dy: -46, r: -140, d: 0, w: 6, h: 6, c: '#86BE7F', round: true },
    { x: 15, dx: -18, dy: 44, r: 120, d: 90, w: 4, h: 9, c: '#363636', round: false },
    { x: 22, dx: -30, dy: -28, r: 80, d: 40, w: 5, h: 5, c: '#5F9857', round: false },
    { x: 30, dx: -8, dy: -54, r: -60, d: 140, w: 5, h: 5, c: '#86BE7F', round: true },
    { x: 38, dx: -14, dy: 40, r: 100, d: 30, w: 4, h: 8, c: '#BBBEB2', round: false },
    { x: 46, dx: 6, dy: -50, r: 150, d: 110, w: 5, h: 5, c: '#363636', round: true },
    { x: 54, dx: -4, dy: 46, r: -110, d: 70, w: 5, h: 5, c: '#86BE7F', round: false },
    { x: 62, dx: 16, dy: -44, r: 90, d: 20, w: 4, h: 9, c: '#5F9857', round: false },
    { x: 70, dx: 12, dy: 42, r: -80, d: 130, w: 5, h: 5, c: '#BBBEB2', round: true },
    { x: 78, dx: 30, dy: -30, r: 130, d: 60, w: 5, h: 5, c: '#86BE7F', round: false },
    { x: 85, dx: 22, dy: 46, r: -100, d: 100, w: 4, h: 8, c: '#363636', round: false },
    { x: 92, dx: 36, dy: -48, r: 70, d: 10, w: 6, h: 6, c: '#5F9857', round: true },
    { x: 4, dx: -40, dy: 30, r: 110, d: 150, w: 5, h: 5, c: '#BBBEB2', round: false },
    { x: 96, dx: 42, dy: 26, r: -120, d: 80, w: 5, h: 5, c: '#86BE7F', round: true },
] as const;

/** How long the last piece is still on screen — 1150ms of animation, 150ms of delay. */
export const CONFETTI_MS = 1300;

interface ConfettiProps {
    /**
     * Overrides the three built-in colours, cycled across the pieces in order.
     *
     * The default palette is two greens and a charcoal, tuned for a burst that
     * paints behind its subject on a light ground. Over a green fill the two
     * greens all but vanish, so a caller putting the burst on top of one has to
     * supply colours that read against it.
     */
    colors?: readonly string[];
}

export default function Confetti({ colors }: ConfettiProps = {}) {
    return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
            {CONFETTI.map((p, i) => (
                <span
                    key={i}
                    className={`confetti-piece absolute top-1/2 block ${p.round ? 'rounded-full' : 'rounded-[1px]'}`}
                    style={{
                        left: `${p.x}%`,
                        width: p.w,
                        height: p.h,
                        background: colors ? colors[i % colors.length] : p.c,
                        animationDelay: `${p.d}ms`,
                        ['--cx' as string]: `${p.dx}px`,
                        ['--cy' as string]: `${p.dy}px`,
                        ['--cr' as string]: `${p.r}deg`,
                    } as React.CSSProperties}
                />
            ))}
        </span>
    );
}
