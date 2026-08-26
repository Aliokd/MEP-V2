"use client";

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { fetchUsersByUid, useConnections, type PlatformUser } from '@/lib/connections';
import * as btn from '@/app/platform/components/buttonStyles';

export interface InvitePick {
    uid: string;
    name: string;
}

interface InviteCollaboratorFieldProps {
    /** What the sender has typed — a name to filter by, or an email address. */
    query: string;
    onQueryChange: (value: string) => void;
    /** The connection they picked from the list, or null while they're still typing. */
    picked: InvitePick | null;
    onPick: (pick: InvitePick | null) => void;
    /** Owner + current collaborators + anyone already invited: nobody to suggest twice. */
    excludeUids: string[];
    disabled?: boolean;
}

export const isEmailAddress = (value: string): boolean => /^\S+@\S+\.\S+$/.test(value.trim());

/**
 * The people field in the share dialog.
 *
 * Inviting used to mean knowing a collaborator's email address by heart, which is
 * the one thing you rarely know about someone you met on the platform. The people
 * a writer has connected with in Connect are suggested by name instead, and typing
 * still works — for an address, or for a name that filters the list.
 *
 * The suggestions are connections only, never the full user roster: a search box
 * over every account turns the dialog into a people directory, and the point here
 * is the handful of people you actually write with.
 */
export default function InviteCollaboratorField({
    query,
    onQueryChange,
    picked,
    onPick,
    excludeUids,
    disabled,
}: InviteCollaboratorFieldProps) {
    const { t } = useLanguage();
    const { connections } = useConnections();
    const [friends, setFriends] = useState<PlatformUser[]>([]);
    const [friendsLoaded, setFriendsLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await fetchUsersByUid(connections);
                if (!cancelled) setFriends(list);
            } catch (error) {
                console.error('Error loading connections for invite:', error);
            } finally {
                if (!cancelled) setFriendsLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [connections]);

    // Resolves an onboarding answer id to its localized label, exactly as Connect
    // and the profile do. Someone who skipped the quiz simply shows no second line.
    const songwriterTypeLabel = (typeId: string | null): string => {
        if (!typeId) return '';
        const key = `onboarding.questions.songwriter_type.options.${typeId}.title`;
        const label = t(key);
        return label === key ? '' : label;
    };

    const available = useMemo(
        () => friends.filter(friend => !excludeUids.includes(friend.uid)),
        [friends, excludeUids],
    );

    // An email in the box is an invite to someone who isn't in this list at all,
    // so it stops filtering rather than emptying the suggestions to no purpose.
    const typed = query.trim().toLowerCase();
    const suggestions = useMemo(() => {
        if (!typed || isEmailAddress(typed)) return available;
        return available.filter(friend => friend.name.toLowerCase().includes(typed));
    }, [available, typed]);

    if (picked) {
        return (
            <div className="flex items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-full pl-6 pr-2 py-2.5">
                <span className="text-[17px] font-sans font-medium text-stone-700 truncate">{picked.name}</span>
                <button
                    type="button"
                    onClick={() => onPick(null)}
                    aria-label={t('collab.invite_clear')}
                    className={`${btn.iconGhost('sm')} cursor-pointer`}
                >
                    <X size={16} className="stroke-[2.2]" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <input
                type="text"
                autoComplete="off"
                disabled={disabled}
                placeholder={t('collab.invite_search_placeholder')}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-full px-6 py-4 text-[17px] font-sans font-medium outline-none focus:bg-white focus:border-stone-400 transition-all placeholder:text-stone-500 disabled:opacity-60"
            />

            {/* Suggestions stay out of the way until there is something to suggest —
                an empty panel under the box reads as a broken feature. */}
            {friendsLoaded && (
                <div className="flex flex-col gap-2">
                    {suggestions.length > 0 && (
                        <>
                            <h4 className="text-[14px] font-sans font-medium text-stone-400 px-1">
                                {t('collab.invite_connections_title')}
                            </h4>
                            <div className="flex flex-col max-h-52 overflow-y-auto no-scrollbar">
                                {suggestions.map(friend => {
                                    const specialty = songwriterTypeLabel(friend.songwriterType);
                                    return (
                                        <button
                                            key={friend.uid}
                                            type="button"
                                            onClick={() => {
                                                onPick({ uid: friend.uid, name: friend.name });
                                                onQueryChange('');
                                            }}
                                            className={`${btn.neutral('bare')} flex-col items-start rounded-xl px-4 py-2.5 text-left cursor-pointer`}
                                        >
                                            <span className="text-[15px] font-sans font-medium text-stone-700 leading-snug">
                                                {friend.name}
                                            </span>
                                            {specialty && (
                                                <span className="text-[12.5px] font-sans text-stone-400 leading-snug">
                                                    {specialty}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {suggestions.length === 0 && (
                        <p className="text-[13px] font-sans text-stone-400 px-1 leading-relaxed">
                            {isEmailAddress(typed)
                                ? t('collab.invite_not_on_veinote')
                                : typed
                                    ? t('collab.invite_no_match')
                                    : friends.length === 0
                                        ? t('collab.invite_no_connections')
                                        : t('collab.invite_all_in')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
