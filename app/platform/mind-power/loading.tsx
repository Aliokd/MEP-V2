/**
 * What Mind Power looks like while it loads: the page's own shape, dim. The
 * brain is the real render, unlit, so the eye lands where it will land; the
 * callouts, strip, cards and activity lines hold their places at their sizes.
 * The platform-wide skeleton is three pale cards on paper — the wrong shape
 * and the wrong colour for this dark page, which is why this exists.
 */

const BRAIN = '/assets/mind-power/brain.webp';
const BRAIN_SM = '/assets/mind-power/brain-sm.webp';

const bar = 'rounded-full bg-white/[0.07]';

function Callout({ side }: { side: 'left' | 'right' }) {
    const align = side === 'left' ? 'items-end' : 'items-start';
    return (
        <div className={`flex flex-col gap-2 ${align}`}>
            <div className={`${bar} h-3 w-28`} />
            <div className={`${bar} h-6 w-48`} />
            <div className={`${bar} h-2.5 w-56`} />
            <div className={`${bar} h-2.5 w-52`} />
            <div className={`${bar} h-2.5 w-44`} />
        </div>
    );
}

export default function MindPowerLoading() {
    return (
        <main
            className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 pt-5 sm:pt-8 pb-20 flex flex-col gap-16 md:gap-20 animate-pulse"
            aria-busy="true"
            aria-label="Loading"
        >
            {/* Back, title, level; the description beneath. */}
            <header className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full border border-white/10" />
                    <div className={`${bar} h-8 w-64 sm:w-80`} />
                    <div className="ml-auto h-7 w-20 rounded-full border border-white/10" />
                </div>
                <div className="flex flex-col gap-2 sm:pl-14">
                    <div className={`${bar} h-3 w-full max-w-xl`} />
                    <div className={`${bar} h-3 w-4/5 max-w-lg`} />
                </div>
            </header>

            {/* The brain between its callouts. */}
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2.2fr)_minmax(220px,1fr)] lg:gap-6">
                <div className="hidden lg:flex min-h-[440px] flex-col justify-between py-2">
                    <Callout side="left" />
                    <Callout side="left" />
                    <Callout side="left" />
                </div>
                <div className="mx-auto w-full max-w-[620px]">
                    <img
                        src={BRAIN}
                        alt=""
                        width={1600}
                        height={1200}
                        draggable={false}
                        className="block w-full h-auto select-none opacity-60"
                        style={{ filter: 'grayscale(1) brightness(0.45)' }}
                    />
                </div>
                <div className="hidden lg:flex min-h-[440px] flex-col justify-between py-2">
                    <Callout side="right" />
                    <Callout side="right" />
                    <Callout side="right" />
                </div>
            </div>

            {/* Streaks: five small brains, the middle one boxed, and the panel under them. */}
            <section className="flex flex-col gap-6">
                <div className="flex items-baseline gap-4">
                    <div className={`${bar} h-7 w-32`} />
                    <div className={`${bar} h-5 w-16`} />
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={i}
                            className={`flex flex-col items-center gap-3 rounded-2xl px-1 py-3 ${i === 2 ? 'bg-white/[0.05]' : ''} ${i > 2 ? 'hidden lg:flex' : ''}`}
                        >
                            <img
                                src={BRAIN_SM}
                                alt=""
                                draggable={false}
                                className="w-full max-w-[220px] h-auto select-none opacity-50"
                                style={{ filter: 'grayscale(1) brightness(0.4)' }}
                            />
                            <div className={`${bar} h-3.5 w-16`} />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className={`${bar} h-3.5 w-40`} />
                    <div className={`${bar} h-3 w-72`} />
                </div>
            </section>

            {/* Stay ahead: four cards. */}
            <section className="flex flex-col gap-6">
                <div className={`${bar} h-7 w-36`} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="min-h-[250px] rounded-2xl border border-white/10 bg-white/[0.04]" />
                    ))}
                </div>
            </section>

            {/* Activities: four labelled rows. */}
            <section className="flex flex-col gap-8">
                <div className={`${bar} h-7 w-32`} />
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex flex-col gap-3">
                        <div className={`${bar} h-3 w-16`} />
                        <div className={`${bar} h-7 w-3/4 max-w-md`} />
                    </div>
                ))}
            </section>
        </main>
    );
}
