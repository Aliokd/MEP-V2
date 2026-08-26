"use client";

import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { X, Megaphone, Wrench, Sparkles, ArrowRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { pickLocale } from '@/lib/content';
import * as btn from './buttonStyles';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '@/lib/storage';
import {
    dismissedKey,
    readDismissed,
    visibleAnnouncements,
    type Announcement,
} from '@/lib/announcements';

const TONE = {
    banner: { wrap: 'bg-white border-stone-200/80', icon: 'bg-[#EAF3E8] text-[#4e7a49]', Icon: Megaphone },
    changelog: { wrap: 'bg-white border-stone-200/80', icon: 'bg-stone-100 text-stone-600', Icon: Sparkles },
    maintenance: { wrap: 'bg-amber-50/90 border-amber-200', icon: 'bg-amber-100 text-amber-700', Icon: Wrench },
} as const;

/**
 * Shows the announcements published in the admin console.
 *
 * The console has always been able to compose these, target them by tier and
 * language, and publish them — and until now nothing in the platform read the
 * collection, so publishing did nothing at all.
 *
 * The whole published set is fetched and filtered here rather than queried by
 * audience: audience is two array fields, which Firestore cannot filter together
 * in one query, and the alternative — a query per tier — would still leave the
 * locale match to the client. These are product messages, not personal data, so
 * there is nothing sensitive in a reader holding a banner meant for another tier
 * and not showing it.
 */
export default function AnnouncementBanner() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [tier, setTier] = useState<string | null>(null);

    // Only published documents: firestore.rules gates the collection on status,
    // and Firestore fails an entire list query when any document in the result
    // set fails the rule — an unfiltered read would return nothing at all.
    useEffect(() => {
        if (!user) {
            setAnnouncements([]);
            return;
        }
        const unsubscribe = onSnapshot(
            query(collection(db, 'announcements'), where('status', '==', 'published')),
            (snap) => setAnnouncements(snap.docs.map((d) => ({ ...(d.data() as Announcement), id: d.id }))),
            // A banner is not worth breaking a page over.
            () => setAnnouncements([]),
        );
        return () => unsubscribe();
    }, [user]);

    // The audience tier is the one an admin sets on the account, which is not the
    // same field as the billing plan — a comped account has no subscription.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        getDoc(doc(db, 'users', user.uid))
            .then((snap) => { if (!cancelled) setTier((snap.data()?.tier as string) || null); })
            .catch(() => { if (!cancelled) setTier(null); });
        return () => { cancelled = true; };
    }, [user]);

    useEffect(() => {
        if (!user) return;
        setDismissed(readDismissed(safeLocalStorageGetItem(dismissedKey(user.uid))));
    }, [user]);

    const dismiss = (id: string) => {
        if (!user) return;
        const next = new Set(dismissed);
        next.add(id);
        setDismissed(next);
        safeLocalStorageSetItem(dismissedKey(user.uid), JSON.stringify([...next]));
    };

    if (!user) return null;

    const visible = visibleAnnouncements(announcements, { tier, locale: language }, dismissed, Date.now());
    if (visible.length === 0) return null;

    return (
        <div className="w-full flex flex-col gap-2 mb-4">
            {/* Two at most. A stack of banners is a wall, and the point of an
                announcement is that it gets read. */}
            {visible.slice(0, 2).map((announcement) => {
                const tone = TONE[announcement.kind] || TONE.banner;
                const title = pickLocale(announcement.title, language);
                const body = announcement.body ? pickLocale(announcement.body, language) : '';
                const Icon = tone.Icon;

                return (
                    <div
                        key={announcement.id}
                        className={`w-full rounded-[18px] border px-4 py-3 flex items-start gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] ${tone.wrap}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tone.icon}`}>
                            <Icon size={15} strokeWidth={2} />
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <span className="text-sm font-semibold text-stone-800 leading-snug">{title}</span>
                            {body && <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{body}</p>}

                            {announcement.ctaHref && announcement.ctaLabel && (
                                <a
                                    href={announcement.ctaHref}
                                    className={`${btn.ghost('xs')} mt-1.5 self-start gap-1 text-sm font-medium text-stone-800`}
                                >
                                    {announcement.ctaLabel}
                                    <ArrowRight size={14} strokeWidth={2} />
                                </a>
                            )}
                        </div>

                        <button
                            onClick={() => dismiss(announcement.id)}
                            aria-label="Dismiss"
                            className={`${btn.iconGhost('xs')} cursor-pointer`}
                        >
                            <X size={15} strokeWidth={2} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
