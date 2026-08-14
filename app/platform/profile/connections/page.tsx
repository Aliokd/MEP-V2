"use client";
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Users } from 'lucide-react';
import ConnectionList, { useConnectionPeople } from '../components/ConnectionList';
import { leaveProfileTo } from '../useMySongs';

/**
 * The full connections list. Lives under /platform/profile so the layout gives
 * it the same focused treatment as the profile itself: no sidebar, back button
 * top-left, slide transitions.
 */
export default function ConnectionsPage() {
    const { user } = useAuth();
    const { t } = useLanguage();

    const { people, peopleLoaded, disconnect } = useConnectionPeople(user);

    if (!user) return null;

    return (
        <div className="space-y-8 text-stone-900 font-sans">
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

            {!peopleLoaded && (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-12 rounded-[12px] bg-stone-200/40 animate-pulse" />
                    ))}
                </div>
            )}

            {peopleLoaded && people.length === 0 && (
                <div className="py-6 flex flex-col items-start gap-3">
                    <p className="text-xs text-stone-500">{t('profile.no_connections')}</p>
                    <button
                        onClick={() => leaveProfileTo('/platform/connect')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-xs font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
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
