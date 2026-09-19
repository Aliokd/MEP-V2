/*
 * The phrases Developing a melody hands out: two bars each, as scale degrees
 * (tonic = 0, seventh = 6) with null for a rest, so the same shape sounds in
 * every key. Written rather than generated: a phrase worth answering has a
 * shape — a rise, a turn, a landing — and a random walk has none.
 *
 * Eight of them, short, none too clever. The exercise is the answer, not the
 * call.
 */
export const MELODY_EXAMPLES: (number | null)[][] = [
    [0, 1, 2, 4, null, 2, 1, 0],       // up the scale and back down
    [4, 4, 2, 2, 0, null, 1, 2],       // a step-down, then a turn up
    [0, 2, 4, null, 4, 2, 0, null],    // the triad, up and down
    [2, 2, 3, 4, null, 4, 2, 0],       // leaning up to the fifth, falling home
    [0, null, 2, 4, 5, 4, null, 2],    // reaching past the fifth
    [4, 2, 0, null, 0, 2, 4, null],    // falling first, then climbing
    [0, 0, 1, 2, null, 2, 1, null],    // a repeated note, a small rise
    [5, 4, 2, null, 4, 2, 1, 0],       // starting high, walking down
];
