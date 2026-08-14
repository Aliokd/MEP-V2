"use client";
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { fetchUsersByUid, setConnection, useConnections, type PlatformUser } from '@/lib/connections';

/**
 * The user's connections, expanded to people. `useConnections` streams the live
 * uid list; this refetches names whenever it changes, so a disconnect drops the
 * row immediately. Shared by the profile shelf and the full Connections page.
 */
export function useConnectionPeople(user: User | null) {
    const { connections } = useConnections();
    const [people, setPeople] = useState<PlatformUser[]>([]);
    const [peopleLoaded, setPeopleLoaded] = useState(false);

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

    const disconnect = async (targetUid: string) => {
        if (!user) return;
        try {
            await setConnection(user.uid, targetUid, false);
        } catch (error) {
            console.error('Error removing connection:', error);
        }
    };

    return { people, peopleLoaded, disconnect };
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
                        <div className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center text-sm font-sans text-[#DCDDD4] font-medium shrink-0">
                            {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-sans text-sm font-medium text-stone-800 truncate">
                                {person.name}
                            </p>
                            {specialty && (
                                <p className="text-xs text-stone-500 mt-0.5">{specialty}</p>
                            )}
                        </div>
                        <button
                            onClick={() => onDisconnect(person.uid)}
                            className="text-xs font-medium text-stone-400 hover:text-stone-800 hover:underline transition-colors cursor-pointer shrink-0"
                        >
                            {t('profile.disconnect')}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
