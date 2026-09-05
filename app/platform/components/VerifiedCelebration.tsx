"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { safeLocalStorageSetItem } from '@/lib/storage';
import VerifiedMark from './VerifiedMark';
import * as btn from './buttonStyles';

/**
 * The moment the verified seal lands: a congratulations popup, once.
 *
 * Mounted once in the platform layout, so it can arrive on whichever screen the
 * songwriter happens to be on — including live, in the same session, the moment
 * an admin approves them. The trigger is the seal itself (publicProfiles.verified
 * with its verifiedAt stamp), not the request document: an account can be
 * verified by script without ever filing a request, and it is the seal the rest
 * of the product shows.
 *
 * Once means once per approval, on every device. Dismissing writes the stamp it
 * celebrated onto users/{uid}.verificationCelebratedAt, and nothing opens until
 * that field has been read — so a popup dismissed on the phone does not replay
 * on the laptop. A re-approval after a revoke carries a newer stamp and is a new
 * moment. The local copy of the stamp is only there to keep the popup from
 * flashing back in the second before the write comes round.
 *
 * To preview it in a browser console:
 *   window.dispatchEvent(new CustomEvent('veinote-verified-preview'))
 */

const PREVIEW_EVENT = 'veinote-verified-preview';
const localKey = (uid: string) => `veinote-verified-celebrated-${uid}`;

export default function VerifiedCelebration() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    const uid = user?.uid ?? null;

    const [open, setOpen] = useState(false);
    // The stamp being celebrated, so dismissing marks exactly this approval.
    const stampRef = useRef<number | null>(null);
    // What the account has already celebrated, read once per account.
    const celebratedRef = useRef<number | null>(null);

    const close = useCallback(() => {
        setOpen(false);
        const stamp = stampRef.current;
        if (!uid || !stamp) return;
        celebratedRef.current = stamp;
        safeLocalStorageSetItem(localKey(uid), String(stamp));
        updateDoc(doc(db, 'users', uid), { verificationCelebratedAt: stamp })
            .catch(err => console.warn('[verification] Could not record the celebration:', err));
    }, [uid]);

    useEffect(() => {
        if (!uid) return;
        let cancelled = false;
        celebratedRef.current = null;

        const consider = (verifiedAt: number) => {
            if (cancelled || celebratedRef.current === null) return;
            let local = 0;
            try { local = Number(localStorage.getItem(localKey(uid)) || 0); } catch { /* fine */ }
            if (verifiedAt <= Math.max(celebratedRef.current, local)) return;
            stampRef.current = verifiedAt;
            setOpen(true);
        };

        let unsubscribe: (() => void) | null = null;
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'users', uid));
                const v = snap.exists() ? snap.data()?.verificationCelebratedAt : 0;
                if (cancelled) return;
                celebratedRef.current = typeof v === 'number' ? v : 0;
            } catch (err) {
                // Cannot tell what was celebrated: better to stay quiet than to
                // replay a popup this account may already have seen.
                console.warn('[verification] Could not read the celebration record:', err);
                return;
            }
            unsubscribe = onSnapshot(
                doc(db, 'publicProfiles', uid),
                (snap) => {
                    if (!snap.exists()) return;
                    const data = snap.data() || {};
                    if (data.verified === true && typeof data.verifiedAt === 'number') consider(data.verifiedAt);
                },
                (err) => console.warn('[verification] Seal listener failed:', err),
            );
        })();

        const preview = () => { stampRef.current = null; setOpen(true); };
        window.addEventListener(PREVIEW_EVENT, preview);
        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
            window.removeEventListener(PREVIEW_EVENT, preview);
        };
    }, [uid]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, close]);

    if (!open || typeof document === 'undefined') return null;

    const firstName = (user?.displayName || '').trim().split(' ')[0];
    const title = firstName
        ? t('profile.verify_congrats_title').replace('{name}', firstName)
        : t('profile.verify_congrats_title_noname');

    const seeProfile = () => {
        close();
        router.push('/platform/profile');
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={close}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('profile.verify_congrats_eyebrow')}
                onClick={e => e.stopPropagation()}
                className="golden-pop-in relative w-full max-w-[560px] overflow-hidden rounded-3xl bg-[#2a2a2a] px-8 pb-10 pt-12 text-[#F5F4EE] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-14"
            >
                <div className="relative flex flex-col items-center gap-7 text-center">
                    {/* The seal, on paper: the mark is ink on the platform's paper
                        colour wherever it appears, and a dark card is the one place
                        that pairing would vanish — so it brings its own plate. */}
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#F5F4EE] shadow-[0_12px_40px_rgba(134,190,127,0.35)]">
                        <VerifiedMark size={64} label={t('profile.verify_congrats_eyebrow')} />
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <span className="font-lyrics text-[24px] leading-none text-stone-300">{t('profile.verify_congrats_eyebrow')}</span>
                        <h2 className="font-lyrics font-normal text-[26px] sm:text-[32px] leading-[1.15] text-[#F5F4EE] max-w-[22ch]">
                            {title}
                        </h2>
                    </div>

                    <p className="max-w-[40ch] text-[15px] leading-relaxed text-stone-400">
                        {t('profile.verify_congrats_body')}
                    </p>

                    <div className="flex items-center gap-6 pt-1">
                        <button
                            type="button"
                            onClick={close}
                            className="text-[18px] text-stone-300 underline decoration-stone-500 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86BE7F] cursor-pointer"
                        >
                            {t('profile.verify_congrats_got_it')}
                        </button>
                        <button type="button" onClick={seeProfile} className={btn.primary('lg')}>
                            {t('profile.verify_congrats_cta')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
