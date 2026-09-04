"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { Flame } from 'lucide-react';
import {
    fetchUsersByUid,
    removeConnectionRequest,
    respondToConnectionRequest,
    useConnectionState,
    type ConnectionRequest,
    type PlatformUser,
} from '@/lib/connections';
import { hasActivityBadge } from '@/lib/publicProfile';
import VerifiedMark from '@/app/platform/components/VerifiedMark';
import * as btn from '@/app/platform/components/buttonStyles';

/**
 * The user's connections, expanded to people, plus the requests still waiting on
 * them. `useConnectionState` streams both live; this refetches names whenever
 * either changes, so accepting a request moves someone from one list to the
 * other immediately. Shared by the profile shelf and the full Connections page.
 *
 * Only *accepted* connections reach `people` — a request nobody has answered is
 * not a connection, and shows up under `requests` instead.
 */
export function useConnectionPeople(user: User | null) {
    const { connections, incoming, byUid } = useConnectionState();
    const [people, setPeople] = useState<PlatformUser[]>([]);
    const [peopleLoaded, setPeopleLoaded] = useState(false);
    const [requesters, setRequesters] = useState<Array<{ request: ConnectionRequest; person: PlatformUser }>>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await fetchUsersByUid(connections);
                if (!cancelled) setPeople(list);
            } catch (error) {
                console.error('Error loading connections for profile:', error);
            } finally {
                if (!cancelled) setPeopleLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [connections]);

    // Keyed on the ids so this refetches when a request arrives or is answered,
    // not on every render of the array that carries them.
    const incomingKey = incoming.map((r) => r.id).join(',');
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const profiles = await fetchUsersByUid(incoming.map((r) => r.fromUid));
                if (cancelled) return;
                const byUidLookup = new Map(profiles.map((p) => [p.uid, p]));
                setRequesters(
                    incoming
                        .map((request) => {
                            const person = byUidLookup.get(request.fromUid);
                            return person ? { request, person } : null;
                        })
                        .filter((row): row is { request: ConnectionRequest; person: PlatformUser } => Boolean(row)),
                );
            } catch (error) {
                console.error('Error loading connection requests:', error);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incomingKey]);

    /** Ends an accepted connection. Either side's document may be the one that exists. */
    const disconnect = async (targetUid: string) => {
        if (!user) return;
        const existing = byUid[targetUid];
        if (!existing) return;
        try {
            await removeConnectionRequest(existing.id);
        } catch (error) {
            console.error('Error removing connection:', error);
        }
    };

    const accept = async (requestId: string) => {
        try {
            await respondToConnectionRequest(requestId, 'accepted');
        } catch (error) {
            console.error('Error accepting connection request:', error);
        }
    };

    const decline = async (requestId: string) => {
        try {
            await respondToConnectionRequest(requestId, 'declined');
        } catch (error) {
            console.error('Error declining connection request:', error);
        }
    };

    return { people, peopleLoaded, disconnect, requesters, accept, decline };
}

/** The time-on-platform badge, shown wherever a songwriter is listed by name. */
export function ActivityBadge({ person, t }: { person: PlatformUser; t: (key: string) => string }) {
    if (!hasActivityBadge(person)) return null;
    return (
        <span
            title={t('connect.badge_active_tooltip')}
            className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[#86BE7F]/20 px-2 py-0.5 text-[10.5px] font-semibold text-[#3f6b3a]"
        >
            <Flame className="w-2.5 h-2.5" />
            {t('connect.badge_active')}
        </span>
    );
}

interface PendingRequestsProps {
    requesters: Array<{ request: ConnectionRequest; person: PlatformUser }>;
    t: (key: string) => string;
    onAccept: (requestId: string) => void;
    onDecline: (requestId: string) => void;
}

/** Requests waiting on this user — the only place a connection becomes real. */
export function PendingRequests({ requesters, t, onAccept, onDecline }: PendingRequestsProps) {
    if (requesters.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-sm font-sans font-semibold text-stone-700 mb-1">
                {t('profile.connection_requests')}
                <span className="ml-2 text-xs font-medium text-stone-400">{requesters.length}</span>
            </h3>
            <div>
                {requesters.map(({ request, person }, idx) => {
                    const specialty = songwriterTypeLabel(t, person.songwriterType);
                    return (
                        <div
                            key={request.id}
                            className={`w-full flex items-center gap-3.5 py-3.5 ${
                                idx < requesters.length - 1 ? 'border-b border-stone-200/60' : ''
                            }`}
                        >
                            <Link
                                href={`/platform/profile/u/${person.uid}`}
                                className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                            >
                                <div className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center text-sm font-sans text-[#DCDDD4] font-medium shrink-0">
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="font-sans text-sm font-medium text-stone-800 truncate">
                                            {person.name}
                                        </p>
                                        {person.verified && <VerifiedMark size={15} label={t('profile.verified_label')} />}
                                    <ActivityBadge person={person} t={t} />
                                    </div>
                                    <p className="text-xs text-stone-500 mt-0.5">
                                        {specialty || t('profile.wants_to_connect')}
                                    </p>
                                </div>
                            </Link>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => onDecline(request.id)}
                                    className={`${btn.ghost('xs')} cursor-pointer`}
                                >
                                    {t('profile.decline_request')}
                                </button>
                                <button
                                    onClick={() => onAccept(request.id)}
                                    className={`${btn.primary('xs')} cursor-pointer`}
                                >
                                    {t('profile.accept_request')}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface ConnectionListProps {
    connections: PlatformUser[];
    t: (key: string) => string;
    onDisconnect: (uid: string) => void;
}

/** The songwriter-type answer from onboarding, as a readable specialty line. */
export const songwriterTypeLabel = (t: (key: string) => string, typeId: string | null): string => {
    if (!typeId) return '';
    const key = `onboarding.questions.songwriter_type.options.${typeId}.title`;
    const label = t(key);
    return label === key ? '' : label;
};

/** Rows of connected songwriters — shared by the profile shelf and the full page. */
export default function ConnectionList({ connections, t, onDisconnect }: ConnectionListProps) {
    return (
        <div>
            {connections.map((person, idx) => {
                const specialty = songwriterTypeLabel(t, person.songwriterType);
                return (
                    <div
                        key={person.uid}
                        className={`w-full flex items-center gap-3.5 py-3.5 group ${
                            idx < connections.length - 1 ? 'border-b border-stone-200/60' : ''
                        }`}
                    >
                        {/* Name and avatar open their profile — the same screen the
                            Connect roster leads to, reachable from here too. */}
                        <Link
                            href={`/platform/profile/u/${person.uid}`}
                            className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                        >
                            <div className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center text-sm font-sans text-[#DCDDD4] font-medium shrink-0">
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <p className="font-sans text-sm font-medium text-stone-800 truncate group-hover:text-stone-950 transition-colors">
                                        {person.name}
                                    </p>
                                    {person.verified && <VerifiedMark size={15} label={t('profile.verified_label')} />}
                                    <ActivityBadge person={person} t={t} />
                                </div>
                                {specialty && (
                                    <p className="text-xs text-stone-500 mt-0.5">{specialty}</p>
                                )}
                            </div>
                        </Link>
                        <button
                            onClick={() => onDisconnect(person.uid)}
                            className={`${btn.ghost('xs')} shrink-0 cursor-pointer`}
                        >
                            {t('profile.disconnect')}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
