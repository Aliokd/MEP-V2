"use client";
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Users } from 'lucide-react';
import ConnectionList, { PendingRequests, useConnectionPeople } from '../components/ConnectionList';
import { leaveProfileTo } from '../useMySongs';
import * as btn from '@/app/platform/components/buttonStyles';

/**
 * The full connections list. Lives under /platform/profile so the layout gives
 * it the same focused treatment as the profile itself: no sidebar, back button
 * top-left, slide transitions.
 */
export default function ConnectionsPage() {
    const { user } = useAuth();
    const { t } = useLanguage();

    const { people, peopleLoaded, disconnect, requesters, accept, decline } = useConnectionPeople(user);

    if (!user) return null;

    return (
        <div className="space-y-8 px-5 md:px-0 text-stone-900 font-sans">
            <header className="space-y-2">
                <h1 className="text-3xl font-sans font-light tracking-tight text-stone-900">
                    {t('profile.connections')}
                    {peopleLoaded && people.length > 0 && (
                        <span className="ml-3 text-base font-normal text-stone-400">{people.length}</span>
                    )}
                </h1>
                <p className="text-stone-500 font-sans max-w-2xl text-sm font-normal">
                    {t('profile.connections_subtitle')}
                </p>
            </header>

            {/* Requests first: they're the only thing here that needs an answer. */}
            <div className="max-w-2xl">
                <PendingRequests requesters={requesters} t={t} onAccept={accept} onDecline={decline} />
            </div>

            {!peopleLoaded && (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-12 rounded-[12px] bg-stone-200/40 animate-pulse" />
                    ))}
                </div>
            )}

            {peopleLoaded && people.length === 0 && requesters.length === 0 && (
                <div className="py-6 flex flex-col items-start gap-3">
                    <p className="text-[13px] text-stone-600">{t('profile.no_connections')}</p>
                    <button
                        onClick={() => leaveProfileTo('/platform/connect')}
                        className={`${btn.secondary('xs')} cursor-pointer`}
                    >
                        <Users size={14} />
                        {t('profile.no_connections_cta')}
                    </button>
                </div>
            )}

            {peopleLoaded && people.length > 0 && (
                <div className="max-w-2xl">
                    <ConnectionList connections={people} t={t} onDisconnect={disconnect} />
                </div>
            )}
        </div>
    );
}
