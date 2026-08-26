/**
 * The platform's buttons, in one place — the onboarding's system, brought in.
 *
 * A visitor meets the green pill with the solid offset shadow five times before
 * they ever reach /platform, and it means one thing throughout: this is the way
 * forward. Then they signed in and every screen invented its own control. The
 * same "save" was a black pill on Profile, a `rounded-[20px]` stone-800 slab in
 * a Create dialog, and a white bordered chip in the Practice toolbar. Nothing
 * was wrong with any one of them; together they meant the product stopped
 * speaking in the voice it had used to get the user here.
 *
 * So the roles below are the onboarding's, widened to what the platform
 * actually has to say. `primary` is the green pill, unchanged in colour, shape
 * and press from `app/onboarding/components/buttonStyles.ts` — deliberately, so
 * the two halves of the product are the same product. Everything else exists
 * because a screen behind the login has controls the onboarding never needed: a
 * toolbar of twenty icons, a destructive action, a row of filters.
 *
 * The rule that keeps it legible is the onboarding's rule: green is the one
 * thing to press. A screen with two green pills on it has a bug in this file's
 * application, not in this file.
 */

/**
 * Press and focus, shared by every filled role.
 *
 * The press is `translate-y` against a matching drop in the shadow's offset, so
 * the pill travels exactly as far as the shadow it sits on and lands flush on
 * the surface — never clearing the shadow entirely, which reads as the button
 * falling through the page rather than being pushed. `:focus-visible` carries a
 * ring instead of a press, since a button activated with the space bar gets no
 * pointer feedback and a keyboard user needs to see where they are first.
 *
 * That ring is an `outline`, not Tailwind's `ring` + `ring-offset`, which is
 * where the onboarding's version can't be copied verbatim. `ring-offset` paints
 * a solid band in a colour you have to name up front, and the onboarding only
 * ever sits on one (#DCDDD4). The platform puts these buttons on #E4E4DF, on
 * #FAF9F5 cards, on #F0F0EA panels, inside white dialogs and over the Create
 * canvas — a named offset colour would be wrong on four surfaces out of five.
 * `outline-offset` leaves the gap transparent, so it is right on all of them.
 */
const PRESS =
    'transition-[transform,box-shadow,filter] duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f6b3a] disabled:pointer-events-none';

const SHAPE = 'inline-flex select-none items-center justify-center rounded-full tracking-tight';

/**
 * Sizes.
 *
 * The offset shadow scales with the control. A 5px shadow under a 32px toolbar
 * pill is a third of its height and reads as a mistake rather than as depth, so
 * each step down takes the shadow — and the travel that has to match it — with
 * it. `lg` is the onboarding's own geometry to the pixel; it is what a screen's
 * single main action should use, and the smaller steps exist for the rows and
 * toolbars where that button would not fit.
 */
export type ButtonSize = 'bare' | 'xs' | 'sm' | 'md' | 'lg' | 'touch' | 'hero';

const FILLED_SIZE: Record<ButtonSize, string> = {
    xs: 'gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold',
    sm: 'gap-2 px-5 py-2.5 text-[13.5px] font-semibold',
    md: 'gap-2.5 px-6 py-3 text-[15px] font-semibold',
    lg: 'gap-2.5 px-8 py-4 text-base font-semibold sm:px-10 sm:text-lg',
    /**
     * Thumb-sized below `md`, ordinary above it. Several screens — the lesson's
     * Back/Next pair, Practice's start button, the Create sheets — had already
     * grown their own version of this, because on a phone these are the only way
     * through and a 40px desktop control is not a target.
     *
     * Both breakpoints live in this one string on purpose. A caller appending
     * `h-14 text-[17px]` next to a size that already sets `py-3 text-[15px]`
     * would be relying on which of two same-specificity rules Tailwind happens
     * to emit last, which is not a thing to rely on. A `md:` variant always
     * wins over a bare one, so keeping the pair together makes the outcome a
     * fact rather than a coin toss.
     */
    touch: 'gap-2.5 h-14 px-8 text-[17px] font-semibold md:h-auto md:px-6 md:py-3 md:text-[15px]',
    /** `touch`, for the one CTA a landing screen is built around. */
    hero: 'gap-3 h-16 px-8 text-[17px] font-semibold md:h-auto md:px-10 md:py-5 md:text-lg',
    /**
     * No geometry at all — colour, shape, press and focus only.
     *
     * The escape hatch for the few controls whose size is dictated by what is
     * inside them rather than by a scale: the Practice song selector, which is a
     * serif title at two breakpoints, and the toolbar buttons that pair a phone
     * tap target with a desktop icon. Those used to be a reason to skip this
     * file entirely and hand-roll the whole button; this way they still get the
     * one press and the one focus ring, and only say what is genuinely theirs.
     */
    bare: '',
};

/**
 * Depth per size: the resting shadow, the travel, and the shadow left under it.
 *
 * Written out per size rather than computed, because Tailwind's scanner reads
 * these files as text — an arbitrary value assembled from a variable at runtime
 * never reaches the generated stylesheet and would sit inert in the DOM.
 */
const DEPTH: Record<ButtonSize, { green: string; red: string; dark: string }> = {
    xs: {
        green: 'shadow-[0_2px_0_0_#5F9857] active:translate-y-[1px] active:shadow-[0_1px_0_0_#5F9857]',
        red: 'shadow-[0_2px_0_0_#A84343] active:translate-y-[1px] active:shadow-[0_1px_0_0_#A84343]',
        dark: 'shadow-[0_2px_0_0_#0c0a09] active:translate-y-[1px] active:shadow-[0_1px_0_0_#0c0a09]',
    },
    sm: {
        green: 'shadow-[0_3px_0_0_#5F9857] active:translate-y-[2px] active:shadow-[0_1px_0_0_#5F9857]',
        red: 'shadow-[0_3px_0_0_#A84343] active:translate-y-[2px] active:shadow-[0_1px_0_0_#A84343]',
        dark: 'shadow-[0_3px_0_0_#0c0a09] active:translate-y-[2px] active:shadow-[0_1px_0_0_#0c0a09]',
    },
    md: {
        green: 'shadow-[0_4px_0_0_#5F9857] active:translate-y-[2px] active:shadow-[0_2px_0_0_#5F9857]',
        red: 'shadow-[0_4px_0_0_#A84343] active:translate-y-[2px] active:shadow-[0_2px_0_0_#A84343]',
        dark: 'shadow-[0_4px_0_0_#0c0a09] active:translate-y-[2px] active:shadow-[0_2px_0_0_#0c0a09]',
    },
    lg: {
        green: 'shadow-[0_5px_0_0_#5F9857] active:translate-y-[3px] active:shadow-[0_2px_0_0_#5F9857]',
        red: 'shadow-[0_5px_0_0_#A84343] active:translate-y-[3px] active:shadow-[0_2px_0_0_#A84343]',
        dark: 'shadow-[0_5px_0_0_#0c0a09] active:translate-y-[3px] active:shadow-[0_2px_0_0_#0c0a09]',
    },
    // A phone-sized control carries the phone-sized shadow; `md:` drops it back
    // to the desktop one, same as the padding above it.
    touch: {
        green: 'shadow-[0_5px_0_0_#5F9857] active:translate-y-[3px] active:shadow-[0_2px_0_0_#5F9857] md:shadow-[0_4px_0_0_#5F9857] md:active:translate-y-[2px]',
        red: 'shadow-[0_5px_0_0_#A84343] active:translate-y-[3px] active:shadow-[0_2px_0_0_#A84343] md:shadow-[0_4px_0_0_#A84343] md:active:translate-y-[2px]',
        dark: 'shadow-[0_5px_0_0_#0c0a09] active:translate-y-[3px] active:shadow-[0_2px_0_0_#0c0a09] md:shadow-[0_4px_0_0_#0c0a09] md:active:translate-y-[2px]',
    },
    hero: {
        green: 'shadow-[0_5px_0_0_#5F9857] active:translate-y-[3px] active:shadow-[0_2px_0_0_#5F9857]',
        red: 'shadow-[0_5px_0_0_#A84343] active:translate-y-[3px] active:shadow-[0_2px_0_0_#A84343]',
        dark: 'shadow-[0_5px_0_0_#0c0a09] active:translate-y-[3px] active:shadow-[0_2px_0_0_#0c0a09]',
    },
    bare: {
        green: 'shadow-[0_4px_0_0_#5F9857] active:translate-y-[2px] active:shadow-[0_2px_0_0_#5F9857]',
        red: 'shadow-[0_4px_0_0_#A84343] active:translate-y-[2px] active:shadow-[0_2px_0_0_#A84343]',
        dark: 'shadow-[0_4px_0_0_#0c0a09] active:translate-y-[2px] active:shadow-[0_2px_0_0_#0c0a09]',
    },
};

/**
 * Disabled.
 *
 * Flat and grey: the shadow is the thing that says "pressable", so a disabled
 * control that keeps it is lying about what it will do. This is the pair
 * Practice already used before this file existed — kept, so nothing on that
 * screen changed meaning when it moved over.
 */
const DISABLED =
    'disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none disabled:translate-y-0 disabled:brightness-100';

/**
 * The one button a screen moves forward on. Green, and the only fill of its
 * kind in view.
 */
export function primary(size: ButtonSize = 'md'): string {
    return [
        SHAPE,
        PRESS,
        FILLED_SIZE[size],
        'bg-[#86BE7F] text-stone-900 hover:brightness-[1.03]',
        DEPTH[size].green,
        DISABLED,
    ].join(' ');
}

/** `primary`, filling its column — what dialogs, forms and the mobile sheets want. */
export function primaryBlock(size: ButtonSize = 'md'): string {
    return `${primary(size)} w-full`;
}

/**
 * Destructive. The same pill and the same press, in the one other colour the
 * product is allowed to shout in — so "delete" is recognisably a button of this
 * family and unmistakably not the green one.
 *
 * #D45C5C rather than the #FF4040 scattered around Create today: that red is
 * the recording indicator's, it is tuned to blink against a waveform, and a
 * button wearing it competes with the transport controls beside it.
 */
export function danger(size: ButtonSize = 'md'): string {
    return [
        SHAPE,
        PRESS,
        FILLED_SIZE[size],
        'bg-[#D45C5C] text-white hover:brightness-[1.05]',
        DEPTH[size].red,
        DISABLED,
    ].join(' ');
}

/**
 * Dark. The action that is neither the way forward nor destructive, but still
 * has to be found without hunting — "Publish" beside a green "Save", the
 * sign-in on the platform's own signed-out landing.
 *
 * It keeps the shape and the press and drops the colour. Deliberately rare: two
 * filled buttons side by side is already one more than most rows need.
 */
export function dark(size: ButtonSize = 'md'): string {
    return [
        SHAPE,
        PRESS,
        FILLED_SIZE[size],
        'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800',
        DEPTH[size].dark,
        DISABLED,
    ].join(' ');
}

/**
 * The way back, and everything beside the main action. Flat and quiet on
 * purpose: it sits next to the button above and must not compete with it, so it
 * gets the same shape and height and none of the weight.
 *
 * No offset shadow, therefore no travel — it presses with a hairline colour
 * change. Giving it depth would make it a second primary.
 */
const OUTLINE_SIZE: Record<ButtonSize, string> = {
    xs: 'gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold',
    sm: 'gap-2 px-5 py-2.5 text-[13.5px] font-semibold',
    md: 'gap-2 px-6 py-3 text-[15px] font-semibold',
    lg: 'gap-2 px-6 py-4 text-base font-semibold',
    touch: 'gap-2 h-14 px-8 text-[17px] font-semibold md:h-auto md:px-6 md:py-3 md:text-[15px]',
    hero: 'gap-3 h-16 px-8 text-[17px] font-semibold md:h-auto md:px-10 md:py-5 md:text-lg',
    bare: '',
};

const FOCUS_FLAT =
    'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f6b3a]';

export function secondary(size: ButtonSize = 'md'): string {
    return [
        SHAPE,
        FOCUS_FLAT,
        OUTLINE_SIZE[size],
        'border border-stone-300/80 bg-white/50 text-stone-600 hover:border-stone-400 hover:bg-white hover:text-stone-900',
        'disabled:pointer-events-none disabled:border-stone-200 disabled:text-stone-300',
    ].join(' ');
}

/**
 * No border, no fill until you point at it. For the actions that are offers
 * rather than steps — "Skip", "Cancel", "Change email" — where even the quiet
 * pill's outline is more furniture than the row can carry.
 */
export function ghost(size: ButtonSize = 'md'): string {
    return [
        SHAPE,
        FOCUS_FLAT,
        OUTLINE_SIZE[size],
        'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900',
        'disabled:pointer-events-none disabled:text-stone-300',
    ].join(' ');
}

/**
 * `secondary`, for the handful of controls that sit on a dark scrim rather than
 * on the app: the guide's video step, and anything else painted over a blurred
 * backdrop.
 *
 * It is a separate function rather than `secondary` plus a few overriding
 * classes, because "override the fill" would mean two `bg-` utilities of equal
 * specificity on one element and no defined winner between them. A role that
 * names its surface has one value for each property and nothing to resolve.
 */
export function scrim(size: ButtonSize = 'sm'): string {
    return [
        SHAPE,
        FOCUS_FLAT,
        'backdrop-blur-sm focus-visible:outline-white',
        OUTLINE_SIZE[size],
        'border border-white/25 bg-stone-900/45 text-white hover:bg-stone-900/65',
        'disabled:pointer-events-none disabled:text-white/40',
    ].join(' ');
}

/**
 * A circle with an icon in it — the onboarding's Back button, which is the one
 * control on that screen nobody should be drawn to, generalised.
 *
 * Create's toolbars are made almost entirely of these, so the sizes go smaller
 * than anything the onboarding needed. The `lg` circle is the 56px one the quiz
 * and the carousel put beside their dots.
 */
const ICON_SIZE: Record<ButtonSize, string> = {
    xs: 'h-7 w-7',
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
    /** A phone's tap target, an ordinary icon button from `md` up. */
    touch: 'h-10 w-10 md:h-9 md:w-9',
    hero: 'h-16 w-16 md:h-14 md:w-14',
    bare: '',
};

export function icon(size: ButtonSize = 'md'): string {
    return [
        'inline-flex shrink-0 select-none items-center justify-center rounded-full',
        FOCUS_FLAT,
        ICON_SIZE[size],
        'bg-white/55 text-stone-700 hover:bg-white hover:text-stone-900',
        'disabled:pointer-events-none disabled:text-stone-300 disabled:hover:bg-white/55',
    ].join(' ');
}

/**
 * A filled circle — `primary` with no room for a label. The Connect feed's
 * play/pause sits on a card that is itself a link, so its one control has to be
 * the loudest thing in that corner without a word to say so.
 */
export function iconPrimary(size: ButtonSize = 'md'): string {
    return [
        'inline-flex shrink-0 select-none items-center justify-center rounded-full',
        PRESS,
        ICON_SIZE[size],
        'bg-[#86BE7F] text-stone-900 hover:brightness-[1.03]',
        DEPTH[size].green,
        DISABLED,
    ].join(' ');
}

/**
 * The shape, the focus ring, and nothing else — no fill, no text colour, not
 * even a hover.
 *
 * Create's canvas is where this earns its place. Its toolbars are full of
 * controls that mean something specific by their colour: the delete that turns
 * red under the pointer, the chord cell that is tinted by the chord in it, the
 * slot that is dashed until something is dropped on it. Those are not a role
 * this file can name, and overriding them from here would only produce pairs of
 * equal-specificity utilities with no defined winner.
 *
 * What they were still missing is the part that has nothing to do with colour:
 * they were `rounded-[12px]` and `rounded-[16px]` squares with no keyboard
 * focus ring, in a product whose every other control is a circle. This gives
 * them that much and leaves the rest alone.
 */
export function plain(size: ButtonSize = 'bare'): string {
    return [
        SHAPE,
        FOCUS_FLAT,
        OUTLINE_SIZE[size],
        'disabled:pointer-events-none',
    ].join(' ');
}

/**
 * Shape, hover and focus — and no colour at all.
 *
 * For the controls that carry their own palette because the state, not the
 * role, is what the colour is saying: the feed's like/repost toggles, a word
 * token tinted by the exercise it belongs to. Handing those a `text-` of our
 * own would put two same-specificity colour utilities on one element and leave
 * which one wins up to the order Tailwind happened to emit them in.
 */
export function neutral(size: ButtonSize = 'xs'): string {
    return [
        SHAPE,
        FOCUS_FLAT,
        OUTLINE_SIZE[size],
        'hover:bg-stone-900/5',
        'disabled:pointer-events-none disabled:opacity-40',
    ].join(' ');
}

/** `icon`, with nothing under it until hovered. For icons sitting on a card. */
export function iconGhost(size: ButtonSize = 'md'): string {
    return [
        'inline-flex shrink-0 select-none items-center justify-center rounded-full',
        FOCUS_FLAT,
        ICON_SIZE[size],
        'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900',
        'disabled:pointer-events-none disabled:text-stone-300 disabled:hover:bg-transparent',
    ].join(' ');
}

/**
 * A row in a dropdown — the canvas menus, the sort and view pickers, the
 * per-track overflow menus.
 *
 * The one role in this file that is not a pill, and the reason is that it is
 * not a button you aim at: it is a line in a list you are already reading down.
 * A stadium-shaped full-width row reads as a control that stops short of the
 * panel it is in, which is exactly the wrong impression for something whose
 * hover state is meant to fill that panel edge to edge.
 *
 * `danger` is for the one row per menu that removes something. It stays a row —
 * turning it into a filled red pill would make the most destructive item the
 * most eye-catching thing in the menu.
 */
export function menuItem(tone: 'default' | 'danger' = 'default'): string {
    return [
        'flex w-full select-none items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-left text-[14px] font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3f6b3a]',
        tone === 'danger'
            ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
            : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900',
        'disabled:pointer-events-none disabled:opacity-50',
    ].join(' ');
}

/**
 * One seat of a segmented control — the monthly/yearly switch, the view
 * toggles. It looks like `chip` and is built the opposite way round: the
 * selected fill is a single indicator the parent slides between the seats, so
 * the seat itself must stay transparent or the two fills stack and the slide
 * has nothing to travel over.
 *
 * That is why this is its own role rather than `chip` with the border removed.
 * A `chip` that happened to be transparent would drift back to having a
 * background the first time someone tidied it.
 */
export function segment(selected: boolean, size: ButtonSize = 'xs'): string {
    return [
        SHAPE,
        'relative z-10 whitespace-nowrap',
        FOCUS_FLAT,
        OUTLINE_SIZE[size],
        selected ? 'text-stone-900' : 'text-stone-500 hover:text-stone-900',
        'disabled:pointer-events-none disabled:text-stone-300',
    ].join(' ');
}

/**
 * The two-state controls: filters, tabs, view switches, the Create toolbar's
 * toggles. Not "a button you press to do a thing" but "a button that is
 * currently on or off", which is why the selected state is the dark fill rather
 * than the green — green would promise that pressing it moves you forward.
 *
 * Flat in both states. A chip that gained depth when selected would be the
 * loudest thing in a row of twelve.
 */
export function chip(selected: boolean, size: ButtonSize = 'sm'): string {
    return [
        SHAPE,
        'whitespace-nowrap',
        FOCUS_FLAT,
        OUTLINE_SIZE[size],
        selected
            ? 'bg-stone-900 text-[#FAF9F5] hover:bg-stone-800'
            : 'border border-stone-300/80 bg-white/50 text-stone-600 hover:border-stone-400 hover:bg-white hover:text-stone-900',
        'disabled:pointer-events-none disabled:opacity-50',
    ].join(' ');
}
