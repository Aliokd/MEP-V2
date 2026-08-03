/**
 * The one button the flow moves forward on, in one place.
 *
 * It is the carousel's and the quiz's button: a solid pill with the offset
 * shadow under it, pressed by translating onto that shadow rather than by
 * scaling. Everything after the quiz used to carry its own near-miss of it —
 * flat shadows, `rounded-[20px]`, four different paddings — so the control that
 * means "forward" changed shape three times between the first slide and the
 * last screen. Whatever else differs between these steps, the thing you press
 * should not.
 *
 * `PRIMARY_BUTTON` sizes to its label; `PRIMARY_BUTTON_BLOCK` fills its column,
 * which is what the form steps and the plans want. They differ in width and
 * nothing else — deliberately, since that is the only difference either screen
 * actually needs.
 */
/**
 * The press is `translate-y` against a matching drop in the shadow's offset, so
 * the pill travels exactly as far as the shadow it is sitting on and lands flush
 * on the surface. It used to clear the shadow entirely on `:active` — the pill
 * moved 5px while the shadow went from 5px to nothing in the same 100ms, which
 * reads as the button falling through the page rather than being pushed. Half
 * the travel, and a shadow left under it, is what a press feels like.
 *
 * `:active` alone also missed the keyboard: a button activated with the space
 * bar got no press at all. `:focus-visible` carries a ring instead, since a
 * keyboard user needs to see where they are before they need to see a push.
 */
const PRIMARY_BASE =
    'flex select-none items-center justify-center gap-2.5 rounded-full bg-[#86BE7F] text-stone-900 font-semibold tracking-tight shadow-[0_5px_0_0_#5F9857] transition-[transform,box-shadow,filter] duration-100 ease-out hover:brightness-[1.03] active:translate-y-[3px] active:shadow-[0_2px_0_0_#5F9857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f6b3a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#DCDDD4] disabled:pointer-events-none';

export const PRIMARY_BUTTON = `${PRIMARY_BASE} shrink-0 px-8 py-4 text-base sm:px-10 sm:text-lg`;

export const PRIMARY_BUTTON_BLOCK = `${PRIMARY_BASE} w-full px-8 py-4 text-lg`;

/**
 * The way back, where a step has one. Flat and quiet on purpose: it sits beside
 * the button above and must not compete with it, so it gets the same shape and
 * height and none of the weight.
 */
export const SECONDARY_BUTTON =
    'flex shrink-0 items-center justify-center gap-2 rounded-full border border-stone-300/80 bg-white/50 px-6 py-4 text-base font-semibold text-stone-600 transition-colors hover:border-stone-400 hover:bg-white hover:text-stone-900';
