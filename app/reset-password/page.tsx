"use client";

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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
                setError('Invalid request. The password reset code is missing.');
                setIsVerifying(false);
                return;
            }

            setOobCode(code);
            try {
                // Verify the action code is valid and has not expired
                await verifyPasswordResetCode(auth, code);
            } catch (err: any) {
                console.error('Verify reset code error:', err);
                setError('This password reset link is invalid or has expired.');
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
            setError('Please fill in all fields.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!oobCode) {
            setError('Reset code is missing. Please request a new link.');
            return;
        }

        setIsLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setSuccess('Your password has been reset successfully.');
            setTimeout(() => {
                router.push('/signin');
            }, 3000);
        } catch (err: any) {
            console.error('Confirm password reset error:', err);
            setError(err.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white/60 border border-stone-200/80 p-10 rounded-[20px] shadow-sm backdrop-blur-md w-full">
            {isVerifying ? (
                <div className="text-center space-y-4 flex flex-col items-center py-8">
                    <div className="w-10 h-10 border-4 border-[#86BE7F] border-t-transparent rounded-full animate-spin" />
                    <h3 className="text-lg font-sans font-light tracking-tight text-stone-900">Verifying link validity...</h3>
                </div>
            ) : error ? (
                <div className="space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => router.push('/signin')}
                        className="w-full py-5 border border-stone-300 hover:bg-stone-50/50 text-stone-850 text-lg font-semibold rounded-[20px] transition-all"
                    >
                        Back to Sign In
                    </button>
                </div>
            ) : success ? (
                <div className="space-y-6 text-center flex flex-col items-center py-4">
                    <div className="p-3 bg-green-500/10 text-green-700 rounded-full w-fit">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-sans font-light text-stone-900">Password Reset!</h3>
                    <p className="text-stone-600 text-sm font-medium">
                        {success} Redirecting to sign in...
                    </p>
                </div>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="text-center space-y-2 flex flex-col items-center mb-6">
                        <h3 className="text-2xl font-sans font-light tracking-tight text-stone-900">Choose a new password</h3>
                        <p className="text-stone-600 text-sm font-medium">Enter your new secure password below.</p>
                    </div>
                    <div className="space-y-4 text-left">
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New Password"
                            className="w-full bg-white border border-stone-200 rounded-[20px] py-5 px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-xl font-medium placeholder:text-stone-500"
                            disabled={isLoading}
                        />
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm New Password"
                            className="w-full bg-white border border-stone-200 rounded-[20px] py-5 px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-xl font-medium placeholder:text-stone-500"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center gap-3 py-5 text-xl font-semibold bg-[#86BE7F] hover:opacity-95 text-stone-900 transition-all rounded-[20px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                        {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                    </button>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-[#DCDDD4] relative overflow-hidden font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-12 space-y-2 flex flex-col items-center">
                    <h2 className="text-5xl md:text-6xl font-sans font-light text-stone-900 tracking-tight">Reset password</h2>
                    <p className="text-stone-600 font-sans font-normal text-base md:text-lg">Secure your access to Veinote.</p>
                </div>

                <Suspense fallback={
                    <div className="bg-white/60 border border-stone-200/80 p-10 rounded-[20px] shadow-sm backdrop-blur-md w-full text-center space-y-4 flex flex-col items-center py-8">
                        <div className="w-10 h-10 border-4 border-[#86BE7F] border-t-transparent rounded-full animate-spin" />
                        <h3 className="text-lg font-sans font-light tracking-tight text-stone-900">Loading form...</h3>
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </motion.div>
        </div>
    );
}
