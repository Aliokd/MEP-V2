"use client";

import { use, useEffect, useState } from 'react';
import { Check, Clock, Plus, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
    fetchUsersByUid,
    removeConnectionRequest,
    respondToConnectionRequest,
    sendConnectionRequest,
    useConnectionState,
    type PlatformUser,
} from '@/lib/connections';
import { ActivityBadge, songwriterTypeLabel } from '../../components/ConnectionList';

/**
 * Somebody else's profile.
 *
 * Under /platform/profile/ on purpose: the layout gives everything below that
 * path the focused treatment — no sidebar, a back button top-left, slide
 * transitions — which is exactly what a screen you step into from the Connect
 * roster wants.
 *
 * Everything shown comes from publicProfiles/{uid}. There is deliberately no
 * read of users/{uid} here: that document holds the email address, the Paddle
 * billing record and the onboarding answers, and none of it belongs on a page
 * one songwriter can open about another.
 */
export default function SongwriterProfilePage({ params }: { params: Promise<{ uid: string }> }) {
    const { uid } = use(params);
    const { user } = useAuth();
    const { t } = useLanguage();
    const { relationshipWith, byUid } = useConnectionState();

    const [person, setPerson] = useState<PlatformUser | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [found] = await fetchUsersByUid([uid]);
                if (!cancelled) setPerson(found ?? null);
            } catch (error) {
                console.error('Error loading songwriter profile:', error);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [uid]);

    const relationship = relationshipWith(uid);
    const existing = byUid[uid];

    const handleAction = async () => {
        if (!user) return;
        try {
            if (relationship === 'incoming' && existing) {
                await respondToConnectionRequest(existing.id, 'accepted');
            } else if ((relationship === 'outgoing' || relationship === 'connected') && existing) {
                await removeConnectionRequest(existing.id);
            } else {
                await sendConnectionRequest(user.uid, uid);
            }
        } catch (error) {
            console.error('Error updating connection:', error);
        }
    };

    if (!loaded) {
        return (
            <div className="space-y-8 max-w-2xl">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-stone-200/50 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-6 w-44 rounded-full bg-stone-200/50 animate-pulse" />
                        <div className="h-4 w-28 rounded-full bg-stone-200/40 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!person) {
        return (
            <div className="space-y-3 max-w-2xl text-stone-900 font-sans">
                <h1 className="text-2xl font-light tracking-tight">{t('profile.songwriter_not_found')}</h1>
                <p className="text-sm text-stone-500">{t('profile.songwriter_not_found_desc')}</p>
            </div>
        );
    }

    const specialty = songwriterTypeLabel(t, person.songwriterType);
    const isSelf = user?.uid === uid;

    // Same four meanings as the Connect card, said at full length — there is
    // room for words on a page, so the state never rests on an icon alone.
    const action = {
        none:      { icon: Plus,     label: t('connect.connect_action'), primary: true },
        declined:  { icon: Plus,     label: t('connect.connect_action'), primary: true },
        outgoing:  { icon: Clock,    label: t('connect.invite_sent'),    primary: false },
        incoming:  { icon: UserPlus, label: t('connect.accept_request'), primary: true },
        connected: { icon: Check,    label: t('connect.connected'),      primary: false },
    }[relationship];
    const ActionIcon = action.icon;

    return (
        <div className="space-y-8 max-w-2xl text-stone-900 font-sans">
            <div className="flex items-start gap-5">
                <div className="w-20 h-20 shrink-0 bg-stone-900 rounded-full flex items-center justify-center text-3xl font-sans text-[#DCDDD4] font-medium">
                    {person.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 space-y-1.5 pt-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-sans font-light tracking-tight text-stone-900">
                            {person.name}
                        </h1>
                        <ActivityBadge person={person} t={t} />
                    </div>
                    <p className="text-sm text-stone-500">
                        {[specialty, person.createdAt > 0
                            ? `${t('connect.member_since')} ${new Date(person.createdAt).getFullYear()}`
                            : ''
                        ].filter(Boolean).join(' · ')}
                    </p>
                </div>
            </div>

            {/* Nobody connects with themself, and arriving here from your own
                card would otherwise offer exactly that. */}
            {!isSelf && (
                <div className="space-y-2">
                    <button
                        onClick={handleAction}
                        aria-pressed={relationship === 'connected'}
                        className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                            action.primary
                                ? 'bg-[#86BE7F]/20 hover:bg-[#86BE7F]/35 text-[#3f6a3a]'
                                : 'bg-white border border-stone-200/70 text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <ActionIcon size={16} className="stroke-[2.5]" />
                        {action.label}
                    </button>

                    {relationship === 'outgoing' && (
                        <p className="text-xs text-stone-500">{t('profile.invite_sent_hint')}</p>
                    )}
                    {relationship === 'incoming' && (
                        <p className="text-xs text-stone-500">{t('profile.wants_to_connect')}</p>
                    )}
                </div>
            )}
        </div>
    );
}
