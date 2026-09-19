"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { OFFBOARDING_REASONS, OFFBOARDING_NOTE_MAX, type OffboardingKind, type OffboardingReason } from '@/lib/offboarding';
import * as btn from '@/app/platform/components/buttonStyles';

interface OffboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Cancelling the subscription, or deleting the account. */
    kind: OffboardingKind;
    /** When the subscription ends, already formatted; only the cancel sheet reads it. */
    endsAt?: string;
    onConfirm: (reasons: OffboardingReason[], note: string) => Promise<void>;
    t: (key: string) => string;
}

/**
 * The sheet on the way out. Both kinds start with the same question, why,
 * asked as a handful of reasons to tick and a line to write. Cancelling
 * confirms on the same screen: it is reversible until the period ends, and a
 * second step would only be in the way. Deleting turns the page to one plain
 * confirmation of what goes, since nothing about it can be undone.
 *
 * The sheet itself is mounted only while open, so every opening starts from
 * a blank form without anything having to reset it.
 */
export default function OffboardingModal(props: OffboardingModalProps) {
    if (!props.isOpen) return null;
    return createPortal(<OffboardingSheet {...props} />, document.body);
}

function OffboardingSheet({ onClose, kind, endsAt = '', onConfirm, t }: OffboardingModalProps) {
    const [reasons, setReasons] = useState<OffboardingReason[]>([]);
    const [note, setNote] = useState('');
    const [step, setStep] = useState<'why' | 'confirm'>('why');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, busy]);

    const toggle = (reason: OffboardingReason) =>
        setReasons(prev => (prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]));

    const confirm = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            await onConfirm(reasons, note.trim());
        } catch (err) {
            console.error(`[offboarding] ${kind} failed:`, err);
            setError(t(kind === 'cancel' ? 'profile.billing.cancel_error' : 'profile.offboarding.error'));
            setBusy(false);
        }
    };

    const isDelete = kind === 'delete';
    const title = step === 'confirm'
        ? t('profile.offboarding.confirm_title')
        : isDelete
          ? t('profile.offboarding.why_title')
          : t('profile.billing.cancel_title');
    const intro = step === 'confirm'
        ? t('profile.offboarding.confirm_desc')
        : isDelete
          ? t('profile.offboarding.why_desc')
          : (endsAt ? t('profile.billing.cancel_desc').replace('{date}', endsAt) : t('profile.billing.cancel_desc_nodate'));

    return (
        <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[4px]" onClick={busy ? undefined : onClose} />

            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,520px)] max-h-[90vh] overflow-y-auto bg-[#FAF9F5] rounded-[24px] p-7 md:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.18)] font-sans text-stone-900 space-y-6"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                        <p className="text-[13.5px] text-stone-600 leading-relaxed">{intro}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label={t('common.close')}
                        className={`${btn.iconGhost('sm')} -mr-2 -mt-1 cursor-pointer`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {step === 'why' && (
                    <>
                        <div className="space-y-3">
                            {!isDelete && <p className="text-[13px] font-medium text-stone-700">{t('profile.offboarding.why_short')}</p>}
                            <div className="flex flex-wrap gap-2">
                                {OFFBOARDING_REASONS.map(reason => {
                                    const on = reasons.includes(reason);
                                    return (
                                        <button
                                            key={reason}
                                            type="button"
                                            onClick={() => toggle(reason)}
                                            aria-pressed={on}
                                            className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors cursor-pointer active:scale-[0.98] ${
                                                on
                                                    ? 'border-stone-900 bg-stone-900 text-[#DCDDD4]'
                                                    : 'border-stone-200 bg-white/60 text-stone-700 hover:border-stone-400 hover:text-stone-900'
                                            }`}
                                        >
                                            {t(`profile.offboarding.reason_${reason}`)}
                                        </button>
                                    );
                                })}
                            </div>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value.slice(0, OFFBOARDING_NOTE_MAX))}
                                placeholder={t('profile.offboarding.note_placeholder')}
                                rows={3}
                                className="w-full rounded-[16px] border border-stone-300/80 bg-white/60 focus:bg-white focus:border-stone-500 outline-none px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 resize-none transition-colors"
                            />
                        </div>

                        {error && <p className="text-[13px] text-red-700 font-medium">{error}</p>}

                        <div className="flex items-center justify-end gap-2 pt-1">
                            {isDelete ? (
                                <>
                                    <button type="button" onClick={onClose} className={`${btn.ghost('sm')} cursor-pointer`}>
                                        {t('common.cancel')}
                                    </button>
                                    <button type="button" onClick={() => setStep('confirm')} className={`${btn.primary('sm')} cursor-pointer`}>
                                        {t('profile.offboarding.continue')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" onClick={onClose} disabled={busy} className={`${btn.primary('sm')} cursor-pointer`}>
                                        {t('profile.billing.cancel_keep')}
                                    </button>
                                    <button type="button" onClick={confirm} disabled={busy} className={`${btn.secondary('sm')} cursor-pointer`}>
                                        {busy && <Loader2 size={14} className="animate-spin" />}
                                        {t('profile.billing.cancel_confirm')}
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}

                {step === 'confirm' && (
                    <>
                        <p className="text-[13.5px] text-stone-600 leading-relaxed">{t('profile.offboarding.confirm_sub')}</p>

                        {error && <p className="text-[13px] text-red-700 font-medium">{error}</p>}

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setStep('why')} disabled={busy} className={`${btn.ghost('sm')} cursor-pointer`}>
                                {t('profile.offboarding.back')}
                            </button>
                            {/* The one destructive button on the platform, and it is red. */}
                            <button type="button" onClick={confirm} disabled={busy} className={`${btn.danger('sm')} cursor-pointer`}>
                                {busy && <Loader2 size={14} className="animate-spin" />}
                                {busy ? t('profile.offboarding.deleting') : t('profile.offboarding.confirm_action')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
