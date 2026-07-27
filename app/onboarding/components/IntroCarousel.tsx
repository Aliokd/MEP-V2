"use client";

import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Heart } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// The six screens that run before the quiz. Titles are looked up under
// `onboarding.intro.slides.<id>` in the locale files. `image` stays null until
// the real artwork lands — point it at a path under /public and the stand-in
// art is swapped out automatically.
type IntroSlide = {
    id: string;
    image: string | null;
    Art: ComponentType;
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

const BLOBS = [
    { color: '#F6C9D8', className: 'left-[2%] top-[40%] h-24 w-28' },
    { color: '#CFE8B8', className: 'left-[24%] top-[6%] h-24 w-28' },
    { color: '#F6E9A8', className: 'right-[4%] top-[4%] h-24 w-28' },
    { color: '#C9E4DE', className: 'left-[18%] bottom-[2%] h-24 w-28' },
    { color: '#E6D6F2', className: 'right-[22%] top-[44%] h-24 w-28' },
    { color: '#FAD9B8', className: 'right-[0%] bottom-[6%] h-20 w-24' },
];

const ModernWayArt = () => (
    <div className="relative h-full w-full">
        {BLOBS.map((blob) => (
            <div
                key={blob.color}
                className={`absolute rounded-[46%_54%_52%_48%/48%_46%_54%_52%] ${blob.className}`}
                style={{ backgroundColor: blob.color }}
            />
        ))}
    </div>
);

const ToolsArt = () => (
    <Panel className="mx-auto flex h-full w-full max-w-sm flex-col justify-between p-5">
        <div className="space-y-3.5">
            <div className="flex items-center gap-2">
                <Bar w="w-16" />
                <Bar w="w-24" />
                <div className="h-2 w-10 rounded-full bg-[#F6C9D8]" />
                <Bar w="w-10" />
            </div>
            <div className="flex items-center gap-2">
                <Bar w="w-20" />
                <Bar w="w-14" />
                <Bar w="w-8" />
            </div>
            <div className="flex items-center gap-2">
                <Bar w="w-12" />
                <Bar w="w-20" />
            </div>
        </div>
        <div className="flex items-center justify-center gap-2 pt-4">
            {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-6 w-6 rounded-full border border-stone-200/80 bg-stone-100" />
            ))}
        </div>
    </Panel>
);

const COLLAB_ROWS = [
    { border: '#E4A0B7', cursor: '#86BE7F' },
    { border: '#8FB8E0', cursor: '#C9A0E4' },
];

const CollabArt = () => (
    <Panel className="mx-auto flex h-full w-full max-w-sm flex-col justify-center gap-4 p-5">
        {COLLAB_ROWS.map((row) => (
            <div
                key={row.border}
                className="flex items-center gap-3 rounded-xl border p-3.5"
                style={{ borderColor: `${row.border}66` }}
            >
                <div className="h-2 flex-1 rounded-full bg-stone-200" />
                <div
                    className="h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent"
                    style={{ borderLeftColor: row.cursor }}
                />
            </div>
        ))}
    </Panel>
);

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
    { id: 'tools', image: null, Art: ToolsArt },
    { id: 'collab', image: null, Art: CollabArt },
    { id: 'publish', image: null, Art: PublishArt },
    { id: 'own', image: null, Art: OwnArt },
];

export default function IntroCarousel({ onComplete }: { onComplete: () => void }) {
    const { t } = useLanguage();
    const [index, setIndex] = useState(0);

    const slide = SLIDES[index];
    const isLast = index === SLIDES.length - 1;
    const title = t(`onboarding.intro.slides.${slide.id}.title`);

    const handleNext = () => {
        if (isLast) {
            onComplete();
            return;
        }
        setIndex((prev) => prev + 1);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
        >
            <div className="rounded-[28px] border border-stone-200/70 bg-[#FAF9F5] px-6 py-10 shadow-[0_8px_30px_rgba(0,0,0,0.02)] md:px-12 md:py-14">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-10"
                    >
                        <h2 className="mx-auto max-w-md text-center text-3xl font-sans font-light leading-[1.1] tracking-tight text-[#363636] md:text-[2.75rem]">
                            {title}
                        </h2>
                        <div className="h-[220px] md:h-[280px]">
                            {slide.image ? (
                                <img src={slide.image} alt={title} className="h-full w-full object-contain" />
                            ) : (
                                <slide.Art />
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex flex-col-reverse items-center gap-5 sm:relative sm:flex-row sm:justify-center">
                <div className="flex items-center gap-1.5 sm:absolute sm:left-2">
                    {SLIDES.map((s, i) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setIndex(i)}
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
                    className="flex items-center gap-2 rounded-full bg-[#86BE7F] px-10 py-3.5 text-base font-semibold text-stone-900 shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
                >
                    {isLast ? t('onboarding.intro.get_started') : t('onboarding.intro.next')}
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                </button>
            </div>
        </motion.div>
    );
}
