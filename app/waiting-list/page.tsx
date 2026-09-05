"use client";

import { Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, AlertCircle, Check } from 'lucide-react';
import { inviteLandingPath } from '@/lib/uiFlags';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function WaitlistPage() {
    return (
        <Suspense fallback={null}>
            <WaitlistPageInner />
        </Suspense>
    );
}

function WaitlistPageInner() {
    const { language, t } = useLanguage();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [joined, setJoined] = useState(false);

    // Which CTA sent them here, so we can see which surface actually converts.
    const source = searchParams.get('from') || 'direct';
    // Set when a collaboration invite email sent them: the id of the invitation
    // waiting for them, so joining the list can be tied back to who invited them.
    const invite = searchParams.get('invite');

    // Invitations onboard now (inviteLandingPath); links mailed before that
    // change still point here and are forwarded rather than left on the list.
    useEffect(() => {
        if (invite) window.location.replace(inviteLandingPath(invite));
    }, [invite]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmed = email.trim();
        if (!trimmed) {
            setError(t('waitlist.errors.enter_email'));
            return;
        }

        setIsLoading(true);
        try {
            // /api/waitlist, not /api/waiting-list: the rename that moved this page
            // never moved the route, and the proxy redirect covers the page paths
            // only — this form was posting into a 404.
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmed, locale: language, source, invite }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error === 'invalid-email'
                    ? t('waitlist.errors.invalid_email')
                    : t('waitlist.errors.failed'));
                return;
            }

            setJoined(true);
        } catch (err) {
            console.error('Waitlist signup failed:', err);
            setError(t('waitlist.errors.failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-[#DCDDD4] relative overflow-hidden font-sans">
            {/* No logo here — the shared Navigation renders it, centered, for this
                page (see isAuthPage). Two of them stacked before. */}
            <div className="absolute top-8 right-6 md:top-12 md:right-10 z-50">
                <LanguageSwitcher variant="marketing" direction="down" tooltipSide="bottom" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-12 space-y-2 flex flex-col items-center">
                    <h1 className="text-5xl md:text-6xl font-sans font-light text-stone-900 tracking-tight">
                        {joined ? t('waitlist.done_title') : t('waitlist.title')}
                    </h1>
                    <p className="text-stone-600 font-sans font-normal text-base md:text-lg">
                        {joined ? t('waitlist.done_subtitle') : t('waitlist.subtitle')}
                    </p>
                </div>

                <div className="bg-white/60 border border-stone-200/80 p-6 sm:p-10 rounded-[20px] shadow-sm backdrop-blur-md">
                    {joined ? (
                        <div className="space-y-6">
                            <div className="text-center space-y-4 flex flex-col items-center">
                                <div className="w-14 h-14 bg-[#86BE7F]/20 rounded-full flex items-center justify-center text-[#3f6b3a]">
                                    <Check size={26} strokeWidth={2.5} />
                                </div>
                                <p className="text-stone-700/90 text-sm font-medium max-w-sm mx-auto">
                                    {t('waitlist.done_body_prefix')}{' '}
                                    <span className="font-semibold text-stone-900">{email.trim()}</span>
                                    {t('waitlist.done_body_suffix')}
                                </p>
                            </div>
                            <Link
                                href={localizePath('/', language)}
                                className="w-full flex items-center justify-center py-3.5 md:py-5 border border-stone-300 hover:bg-stone-50/50 text-stone-850 text-base md:text-lg font-semibold rounded-[20px] transition-all"
                            >
                                {t('waitlist.back_home')}
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('waitlist.email_placeholder')}
                                className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 px-5 md:py-5 md:px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                disabled={isLoading}
                                autoComplete="email"
                            />

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center gap-3 py-3.5 md:py-5 text-base md:text-xl font-semibold bg-[#86BE7F] hover:opacity-95 text-stone-900 transition-all rounded-[20px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? t('waitlist.joining') : t('waitlist.cta')}
                                {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                            </button>

                            <p className="text-xs text-stone-500 text-center leading-relaxed">
                                {t('waitlist.privacy_note')}
                            </p>
                        </form>
                    )}

                    <div className="mt-8 pt-8 border-t border-stone-200/80 text-center">
                        <p className="text-sm text-stone-600 font-sans font-medium">
                            {t('waitlist.have_account')}{' '}
                            <Link
                                href={localizePath('/signin', language)}
                                className="text-stone-900 transition-colors underline-offset-4 hover:underline font-bold"
                            >
                                {t('signin.sign_in')}
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
