"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Circle } from 'lucide-react';
import { submitVerificationRequest, BIO_MIN, BIO_MAX } from '@/lib/verification';
import * as btn from '@/app/platform/components/buttonStyles';

interface VerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    uid: string;
    /** Current display name — the "real name" requirement is judged on this. */
    name: string;
    photoURL: string;
    /** A previous request's biography, so a re-submission after a decline starts from it. */
    initialBio?: string;
    t: (key: string) => string;
}

/**
 * "Real name" can't be proven client-side; what can be asked for is a first and
 * last name rather than a handle. Anything with two words passes here and the
 * admin makes the actual call.
 */
export const hasRealName = (name: string) => name.trim().split(/\s+/).filter(Boolean).length >= 2;

/**
 * The Get verified sheet: three requirements as a checklist, with the one that
 * has to be typed — the biography — filled in right here. Name and photo are
 * edited where they already live on the profile, so the checklist just says so.
 */
export default function VerifyModal({ isOpen, onClose, uid, name, photoURL, initialBio = '', t }: VerifyModalProps) {
    const [bio, setBio] = useState(initialBio);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    useEffect(() => {
        if (isOpen) { setBio(initialBio); setError(''); setIsSending(false); }
    }, [isOpen, initialBio]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const nameOk = hasRealName(name);
    const photoOk = Boolean(photoURL);
    const trimmed = bio.trim();
    const bioOk = trimmed.length >= BIO_MIN && trimmed.length <= BIO_MAX;
    const canSubmit = nameOk && photoOk && bioOk && !isSending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setIsSending(true);
        setError('');
        try {
            await submitVerificationRequest({ uid, name: name.trim(), bio: trimmed, photoURL });
            onClose();
        } catch (err) {
            console.error('Error submitting verification request:', err);
            setError(t('profile.verify_error'));
            setIsSending(false);
        }
    };

    const Requirement = ({ met, title, hint }: { met: boolean; title: string; hint?: string }) => (
        <div className="flex items-start gap-3">
            <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                met ? 'bg-[#86BE7F]/25 text-[#3f6b3a]' : 'bg-stone-200/70 text-stone-400'
            }`}>
                {met ? <Check size={12} strokeWidth={3} /> : <Circle size={7} strokeWidth={3} />}
            </span>
            <div className="min-w-0">
                <p className={`text-sm font-medium ${met ? 'text-stone-800' : 'text-stone-700'}`}>{title}</p>
                {!met && hint && <p className="text-[13px] text-stone-500 mt-0.5">{hint}</p>}
            </div>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label={t('profile.verify_modal_title')}>
            <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[4px]" onClick={onClose} />

            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,520px)] max-h-[90vh] overflow-y-auto bg-[#FAF9F5] rounded-[24px] p-7 md:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.18)] font-sans text-stone-900 space-y-6"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold tracking-tight">{t('profile.verify_modal_title')}</h2>
                        <p className="text-[13.5px] text-stone-600">{t('profile.verify_modal_intro')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close')}
                        className={`${btn.iconGhost('sm')} -mr-2 -mt-1 cursor-pointer`}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <Requirement met={nameOk} title={t('profile.verify_req_name')} hint={t('profile.verify_req_name_hint')} />
                    <Requirement met={photoOk} title={t('profile.verify_req_photo')} hint={t('profile.verify_req_photo_hint')} />
                    <Requirement met={bioOk} title={t('profile.verify_req_bio')} />
                </div>

                <div className="space-y-2">
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                        placeholder={t('profile.verify_bio_placeholder')}
                        rows={5}
                        className="w-full rounded-[16px] border border-stone-300/80 bg-white/60 focus:bg-white focus:border-stone-500 outline-none px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 resize-none transition-colors"
                    />
                    <p className={`text-[12px] text-right tabular-nums ${bioOk ? 'text-stone-400' : 'text-stone-500'}`}>
                        {trimmed.length} / {BIO_MAX}
                        {trimmed.length < BIO_MIN && ` · ${t('profile.verify_bio_min')} ${BIO_MIN}`}
                    </p>
                </div>

                {error && <p className="text-[13px] text-red-700 font-medium">{error}</p>}

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className={`${btn.ghost('sm')} cursor-pointer`}>
                        {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={!canSubmit} className={`${btn.primary('sm')} cursor-pointer`}>
                        {isSending ? t('profile.verify_submitting') : t('profile.verify_submit')}
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
}
