"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CreditCard, Mail, Unlock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { TRIAL_DAYS } from '@/lib/paddle/config';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './buttonStyles';

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

// Three marks, one per stop, and nothing around them. The discs they used to
// sit in were doing two jobs badly: colour-coding the first stop as the good
// news and the other two as admin, and giving a glass panel three opaque chips
// to punch through it. The line beside each one already says which stop it is.
const STOPS = [
    { id: 'today', Icon: Unlock },
    { id: 'reminder', Icon: Mail },
    { id: 'end', Icon: CreditCard },
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
            className="space-y-8"
        >
            <div className="space-y-3 text-center">
                {/* The line break is in the string, not left to the browser.
                    Wrapped on width, "…try Veinote for free." breaks after
                    "for" and drops a single word onto the second line, which is
                    the one break a headline this size can't take. Each locale
                    marks its own split with a newline — where an English
                    sentence divides is not where a Norwegian one does — and
                    `whitespace-pre-line` is what honours it. Nothing else
                    changes: it still wraps normally on a narrow phone. */}
                <h1 className="whitespace-pre-line text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.25rem]">
                    {fill('onboarding.offer.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {fill('onboarding.offer.subtitle')}
                </p>
            </div>

            {/* Glass rather than the flat cream panel the rest of the flow
                uses. This screen is the one that sits over the painted page and
                asks for trust, and a panel you can see the page through reads as
                a note laid on it rather than a box put in front of it. Tinted
                white and blurred, in the same idiom as the quiz's control bar —
                which is also why the marks inside it lost their discs: opaque
                chips on glass look like holes cut in it.
                The rail that used to join the stops went with them, for the same
                reason and one more: it can only pass behind a mark that has a
                solid backing to hide it. */}
            <div className="rounded-[28px] border border-white/50 bg-white/25 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl backdrop-saturate-150 md:p-8">
                <ol className="space-y-7">
                    {STOPS.map(({ id, Icon }, i) => (
                        <motion.li
                            key={id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="flex gap-5"
                        >
                            <span className="grid h-7 w-7 shrink-0 place-items-center text-stone-900">
                                <Icon size={24} className="stroke-[1.8]" />
                            </span>

                            {/* One colour for all three lines. Grey labels and
                                grey body text on glass is two greys competing
                                with whatever the page is doing behind them;
                                black holds at any backdrop, and size and weight
                                carry the hierarchy on their own. */}
                            <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-stone-900/60">
                                    {fill(`onboarding.offer.timeline.${id}.label`)}
                                </p>
                                <p className="text-[17px] font-semibold leading-snug text-stone-900 md:text-[19px]">
                                    {fill(`onboarding.offer.timeline.${id}.title`)}
                                </p>
                                <p className="text-[14px] font-medium leading-relaxed text-stone-900/80">
                                    {fill(`onboarding.offer.timeline.${id}.desc`)}
                                </p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
            </div>

            <div className="mx-auto max-w-md space-y-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={onBack} className={SECONDARY_BUTTON}>
                        <ArrowLeft size={16} />
                        {t('onboarding.offer.back')}
                    </button>

                    <button
                        type="button"
                        onClick={onContinue}
                        className={`${PRIMARY_BUTTON} grow`}
                    >
                        {fill('onboarding.offer.cta')}
                        <ArrowRight className="h-5 w-5 stroke-[2.75px]" />
                    </button>
                </div>

                <p className="text-center text-[13px] font-medium text-stone-600">
                    {fill('onboarding.offer.footnote')}
                </p>
            </div>
        </motion.div>
    );
}
