"use client";

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LAUNCH_DATE } from '@/lib/uiFlags';

// The campaign flow's last screen — WelcomeAboard's counterpart for the
// waitlist variant, where nothing was bought and no account exists.
//
// One sentence, deliberately: the address is in, launch day is a date they can
// hold, and the plan they were promised arrives by email with the offer
// attached rather than being read here. The verdict screen is skipped in this
// flow for that reason — the plan is something we send, not a page we make
// them sit through before telling them the join worked.

/**
 * Launch day in the reader's own language — "September 19", "19. september",
 * "19 september". Parsed as UTC noon so a timezone can't roll the date back a
 * day for anyone west of the meridian.
 */
function formatLaunchDate(language: string): string {
    const parsed = new Date(`${LAUNCH_DATE}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return LAUNCH_DATE;
    try {
        return new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric' }).format(parsed);
    } catch {
        // An unknown locale tag is not worth losing the date over.
        return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' }).format(parsed);
    }
}

export default function WaitlistSecured() {
    const { t, language } = useLanguage();

    return (
        <motion.div
            key="waitlist-secured"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-md space-y-8 text-center"
        >
            <div className="flex flex-col items-center gap-5">
                {/* The mark alone, drawn large in the page's own ink. In a
                    green disc it read as a status chip on a form; at this size
                    it is the answer to what just happened. */}
                <Check size={64} strokeWidth={2.25} className="text-stone-900" aria-hidden="true" />

                <div className="space-y-3">
                    <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.25rem]">
                        {t('onboarding.waitlist.secured.title')}
                    </h1>
                    <p className="text-[15px] font-medium leading-relaxed text-stone-700 md:text-base">
                        {t('onboarding.waitlist.secured.body').replace('{date}', formatLaunchDate(language))}
                    </p>
                </div>
            </div>

            {/* No buttons. There is nothing left to do here and nowhere they
                need to be sent — the next thing that happens is an email. A
                row of controls under this would only invite a press that
                changes nothing. */}
        </motion.div>
    );
}
