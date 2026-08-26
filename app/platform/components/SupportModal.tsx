"use client";
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authedFetch } from '@/lib/authedFetch';
import * as btn from './buttonStyles';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
    
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset form states on close/open
    useEffect(() => {
        if (isOpen) {
            setSubject('');
            setMessage('');
            setStatus({ type: '', message: '' });
        }
    }, [isOpen]);

    // Swipe the sheet down to dismiss it (phones only — see the hook).
    const { swipeHandlers, swipeStyle } = useSheetSwipe(onClose);

    if (!isOpen || !mounted) return null;

    const handleSubmitSupportTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        setIsSending(true);
        setStatus({ type: '', message: '' });

        try {
            // The route stores the ticket with the Admin SDK and emails support.
            // It used to be written from here, but Firestore rules have no client
            // write path to `support_tickets`, so every one of those writes was denied.
            const response = await authedFetch('/api/support', {
                method: 'POST',
                body: JSON.stringify({
                    userId: user?.uid || 'anonymous',
                    userName: user?.displayName || 'Anonymous User',
                    userEmail: user?.email || 'no-email@veinote.com',
                    subject: subject.trim(),
                    message: message.trim(),
                    locale: language,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'API call failed');
            }

            // Success!
            setStatus({
                type: 'success',
                message: t('support.success') || 'Your message has been sent successfully! We will contact you back shortly.'
            });
            setSubject('');
            setMessage('');

            // Auto-close modal after success message
            setTimeout(() => {
                onClose();
            }, 3000);

        } catch (err: any) {
            console.error('Error submitting support ticket:', err);
            setStatus({
                type: 'error',
                message: t('support.error') || 'Failed to send message. Please check your connection or try again.'
            });
        } finally {
            setIsSending(false);
        }
    };

    return createPortal(
        <div 
            className="sheet-shell fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <form 
                onSubmit={handleSubmitSupportTicket}
                className="sheet-panel bg-white rounded-[16px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-lg w-full p-8 sm:p-10 flex flex-col gap-8 animate-in zoom-in-95 duration-200 relative max-h-[90dvh] overflow-y-auto no-scrollbar" {...swipeHandlers} style={swipeStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-3xl md:text-[38px] leading-[1.25] font-sans font-light text-stone-600 tracking-[-0.035em]">
                    {t('support.title') || 'Contact Support'}
                </h3>

                <div className="flex flex-col gap-6">
                    {/* User display info */}
                    {user?.email && (
                        <div className="text-stone-400 text-xs font-sans font-medium -mb-2 px-1">
                            {t('collab.invited_you') ? `Sending as: ` : `Från: `}
                            <span className="text-stone-700 font-semibold">{user.email}</span>
                        </div>
                    )}

                    {/* Subject Input */}
                    <input 
                        type="text" 
                        required
                        placeholder={t('support.subject_placeholder') || 'Subject / What is this about?'}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-full px-6 py-4 text-[17px] font-sans font-medium outline-none focus:bg-white focus:border-stone-400 transition-all placeholder:text-stone-500"
                        disabled={isSending}
                    />

                    {/* Message Textarea */}
                    <textarea
                        required
                        placeholder={t('support.message_placeholder') || 'Write your message or complaint here...'}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-[20px] px-6 py-4 text-[17px] font-sans font-medium outline-none focus:bg-white focus:border-stone-400 transition-all placeholder:text-stone-500 min-h-[160px] resize-none"
                        disabled={isSending}
                    />

                    {/* Action buttons */}
                    <div className="sheet-panel-footer flex items-center justify-end gap-3.5 mt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className={`${btn.secondary('md')} cursor-pointer`}
                            disabled={isSending}
                        >
                            {t('common.close') || 'Close'}
                        </button>
                        <button 
                            type="submit"
                            disabled={isSending || !subject.trim() || !message.trim()}
                            className={`${btn.primary('md')} cursor-pointer`}
                        >
                            {isSending 
                                ? (t('support.sending') || 'Sending...') 
                                : (t('support.send') || 'Send Message')}
                        </button>
                    </div>
                </div>

                {/* Status Message */}
                {status.message && (
                    <p className={`text-xs font-semibold text-center -mt-2 px-1 ${
                        status.type === 'success' ? 'text-emerald-650' : 'text-red-650'
                    }`}>
                        {status.message}
                    </p>
                )}
            </form>
        </div>,
        document.body
    );
}
