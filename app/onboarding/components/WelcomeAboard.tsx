"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';
import { TRIAL_DAYS } from '@/lib/paddle/config';
import { PRIMARY_BUTTON_BLOCK } from './buttonStyles';

// The last screen of the flow, and the first one that isn't selling anything.
// It confirms what just happened — the trial is running, this is what it opens
// — and then gets out of the way with a single door into the product.
//
// It is also where Paddle lands after a successful checkout (the overlay's
// successUrl is `/onboarding?step=welcome`), so it has to stand on its own with
// no state carried over from the rest of the flow.
const NEXT_STEPS = ['canvas', 'tools', 'community'] as const;

export default function WelcomeAboard({ signupsOpen, onRestart }: {
    /**
     * Pre-launch the flow reaches this screen without an account or a charge,
     * so the door into the product is replaced by the waiting list. See
     * SIGNUPS_OPEN in the onboarding page.
     */
    signupsOpen: boolean;
    onRestart: () => void;
}) {
    const { t, language } = useLanguage();

    const fill = (key: string) => t(key).replace('{days}', String(TRIAL_DAYS));

    return (
        <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
        >
            <div className="space-y-3 text-center">
                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.5rem]">
                    {t('onboarding.welcome.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {fill('onboarding.welcome.subtitle')}
                </p>
            </div>

            <div className="space-y-6 rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:p-10">
                <p className="text-xs font-semibold text-stone-500">
                    {t('onboarding.welcome.steps_label')}
                </p>

                <ul className="space-y-4">
                    {NEXT_STEPS.map((id, i) => (
                        <motion.li
                            key={id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="flex gap-3.5"
                        >
                            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#86BE7F]/20">
                                <Check size={14} className="stroke-[3px] text-[#3f6b3a]" />
                            </span>
                            <span className="text-[15px] font-medium leading-snug text-[#363636] md:text-[16px]">
                                {t(`onboarding.welcome.steps.${id}`)}
                            </span>
                        </motion.li>
                    ))}
                </ul>

                {signupsOpen ? (
                    <Link
                        href="/platform/create"
                        className={PRIMARY_BUTTON_BLOCK}
                    >
                        {t('onboarding.welcome.cta')}
                        <ArrowRight className="h-5 w-5 stroke-[2.5px]" />
                    </Link>
                ) : (
                    <div className="space-y-4 border-t border-stone-200/70 pt-6">
                        <p className="text-sm leading-relaxed text-stone-600">
                            {t('onboarding.welcome.prelaunch.body')}
                        </p>

                        <Link
                            href={`${localizePath('/waiting-list', language)}?from=onboarding`}
                            className={PRIMARY_BUTTON_BLOCK}
                        >
                            {t('home.nav.waitlist')}
                            <ArrowRight className="h-5 w-5 stroke-[2.5px]" />
                        </Link>

                        <button
                            type="button"
                            onClick={onRestart}
                            className="w-full text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
                        >
                            {t('onboarding.welcome.prelaunch.restart')}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
