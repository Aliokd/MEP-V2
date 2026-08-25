"use client";

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function ResetPasswordForm() {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [oobCode, setOobCode] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();

    // Verify the oobCode on mount
    useEffect(() => {
        const checkResetCode = async () => {
            const code = searchParams.get('oobCode');
            if (!code) {
                setError(t('reset_password.invalid_request'));
                setIsVerifying(false);
                return;
            }

            setOobCode(code);
            try {
                // Verify the action code is valid and has not expired
                await verifyPasswordResetCode(auth, code);
            } catch (err: any) {
                console.error('Verify reset code error:', err);
                setError(t('reset_password.invalid_or_expired'));
            } finally {
                setIsVerifying(false);
            }
        };

        checkResetCode();
    }, [searchParams]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!password || !confirmPassword) {
            setError(t('reset_password.fill_all_fields'));
            return;
        }
        if (password.length < 6) {
            setError(t('onboarding.errors.password_short'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('reset_password.passwords_dont_match'));
            return;
        }
        if (!oobCode) {
            setError(t('reset_password.code_missing'));
            return;
        }

        setIsLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setSuccess(t('reset_password.success_message'));
            setTimeout(() => {
                router.push('/signin');
            }, 3000);
        } catch (err: any) {
            console.error('Confirm password reset error:', err);
            setError(t('reset_password.generic_error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white/60 border border-stone-200/80 p-6 sm:p-10 rounded-[20px] shadow-sm backdrop-blur-md w-full">
            {isVerifying ? (
                <div className="text-center space-y-4 flex flex-col items-center py-8">
                    <div className="w-10 h-10 border-4 border-[#86BE7F] border-t-transparent rounded-full animate-spin" />
                    <h3 className="text-lg font-sans font-light tracking-tight text-stone-900">{t('reset_password.verifying')}</h3>
                </div>
            ) : error ? (
                <div className="space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => router.push('/signin')}
                        className="w-full h-16 md:h-[72px] border border-stone-300 hover:bg-stone-50/50 text-stone-850 text-base md:text-lg font-semibold rounded-full transition-all active:scale-[0.99]"
                    >
                        {t('signin.back_to_signin')}
                    </button>
                </div>
            ) : success ? (
                <div className="space-y-6 text-center flex flex-col items-center py-4">
                    <div className="p-3 bg-green-500/10 text-green-700 rounded-full w-fit">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-sans font-light text-stone-900">{t('reset_password.success_title')}</h3>
                    <p className="text-stone-600 text-sm font-medium">
                        {success} {t('reset_password.redirecting')}
                    </p>
                </div>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="text-center space-y-2 flex flex-col items-center mb-6">
                        <h3 className="text-2xl font-sans font-light tracking-tight text-stone-900">{t('reset_password.choose_new_password')}</h3>
                        <p className="text-stone-600 text-sm font-medium">{t('reset_password.enter_new_password_desc')}</p>
                    </div>
                    <div className="space-y-4 text-left">
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('reset_password.new_password_placeholder')}
                                className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 pl-5 pr-12 md:py-5 md:pl-8 md:pr-14 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} className="w-5 h-5" /> : <Eye size={20} className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('reset_password.confirm_new_password_placeholder')}
                                className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 pl-5 pr-12 md:py-5 md:pl-8 md:pr-14 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={20} className="w-5 h-5" /> : <Eye size={20} className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center gap-3 py-3.5 md:py-5 text-base md:text-xl font-semibold bg-[#86BE7F] hover:opacity-95 text-stone-900 transition-all rounded-[20px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? t('reset_password.resetting') : t('reset_password.reset_button')}
                        {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                    </button>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    const { t: resetT } = useLanguage();

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-[#DCDDD4] relative overflow-hidden font-sans">
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
                    <h2 className="text-5xl md:text-6xl font-sans font-light text-stone-900 tracking-tight">{resetT('reset_password.page_title')}</h2>
                    <p className="text-stone-600 font-sans font-normal text-base md:text-lg">{resetT('reset_password.page_subtitle')}</p>
                </div>

                <Suspense fallback={
                    <div className="bg-white/60 border border-stone-200/80 p-10 rounded-[20px] shadow-sm backdrop-blur-md w-full text-center space-y-4 flex flex-col items-center py-8">
                        <div className="w-10 h-10 border-4 border-[#86BE7F] border-t-transparent rounded-full animate-spin" />
                        <h3 className="text-lg font-sans font-light tracking-tight text-stone-900">{resetT('reset_password.loading_form')}</h3>
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </motion.div>
        </div>
    );
}
