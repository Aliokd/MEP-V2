"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CreditCard, Mail, Unlock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { TRIAL_DAYS } from '@/lib/paddle/config';

// The offer, made before any price is shown. Its only job is to take the fear
// out of what comes next: the visitor is about to be asked for a card, and the
// honest way to ask is to show them, in order, exactly what that card will and
// won't do — including the day it gets charged and the mail that arrives first.
//
// So this screen is a timeline rather than a pitch. Nothing here is hidden
// behind a "terms apply": the reminder and the charge are given the same weight
// as the free access, because a trial people trust is the one that converts.
//
// The days come off TRIAL_DAYS in lib/paddle/config, which is also what Paddle
// bills against — this screen cannot promise a length the subscription doesn't
// honour.
const REMINDER_DAY = Math.max(TRIAL_DAYS - 1, 1);

const STOPS = [
    { id: 'today', Icon: Unlock, tone: 'bg-[#86BE7F]/20 text-[#3f6b3a]' },
    { id: 'reminder', Icon: Mail, tone: 'bg-white text-stone-600' },
    { id: 'end', Icon: CreditCard, tone: 'bg-white text-stone-600' },
] as const;

export default function TrialOffer({ onBack, onContinue }: {
    onBack: () => void;
    onContinue: () => void;
}) {
    const { t } = useLanguage();

    const fill = (key: string) =>
        t(key).replace('{days}', String(TRIAL_DAYS)).replace('{day}', String(REMINDER_DAY));

    return (
        <motion.div
            key="offer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
        >
            <div className="space-y-3 text-center">
                <p className="text-sm font-medium text-stone-500">{t('onboarding.offer.eyebrow')}</p>
                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.25rem]">
                    {fill('onboarding.offer.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {fill('onboarding.offer.subtitle')}
                </p>
            </div>

            <div className="rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:p-10">
                <ol className="relative space-y-8">
                    {/* The rail behind the stops. Inset top and bottom so it
                        runs between the first and last markers rather than
                        past them. */}
                    <span
                        aria-hidden="true"
                        className="absolute bottom-6 left-[23px] top-6 w-px bg-stone-300/70"
                    />

                    {STOPS.map(({ id, Icon, tone }, i) => (
                        <motion.li
                            key={id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="relative flex gap-5"
                        >
                            <span
                                className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-stone-200/70 ${tone}`}
                            >
                                <Icon size={20} className="stroke-[1.8]" />
                            </span>

                            <div className="space-y-1.5 pt-1">
                                <p className="text-xs font-semibold text-stone-500">
                                    {fill(`onboarding.offer.timeline.${id}.label`)}
                                </p>
                                <p className="text-[17px] font-semibold leading-snug text-[#363636] md:text-[19px]">
                                    {fill(`onboarding.offer.timeline.${id}.title`)}
                                </p>
                                <p className="text-[14px] font-medium leading-relaxed text-stone-600">
                                    {fill(`onboarding.offer.timeline.${id}.desc`)}
                                </p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
            </div>

            <div className="mx-auto max-w-md space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white/40 px-5 py-4 text-base font-semibold text-stone-600 shadow-sm transition-all hover:border-stone-400 hover:bg-white hover:text-stone-900"
                    >
                        <ArrowLeft size={16} />
                        {t('onboarding.offer.back')}
                    </button>

                    <button
                        type="button"
                        onClick={onContinue}
                        className="flex flex-grow items-center justify-center gap-2 rounded-full bg-[#86BE7F] px-6 py-4 text-base font-semibold text-stone-900 shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
                    >
                        {fill('onboarding.offer.cta')}
                        <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                    </button>
                </div>

                <p className="text-center text-[13px] font-medium text-stone-600">
                    {fill('onboarding.offer.footnote')}
                </p>
            </div>
        </motion.div>
    );
}
