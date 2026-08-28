"use client";

import { use, useEffect, useRef, useState } from 'react';
import { Lock, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchUsersByUid, useConnectionState, type PlatformUser } from '@/lib/connections';
import { useConversation } from '@/lib/chat';

/**
 * One private thread with a connection.
 *
 * Bodies are encrypted in the browser before they are written and decrypted
 * after they are read — Firestore holds ciphertext only. lib/e2ee.ts documents
 * exactly what that protects and, more importantly, what it doesn't.
 *
 * Gated on an accepted connection: a discussion is something two people agreed
 * to, and the same consent that opens collaboration opens this.
 */
export default function ChatPage({ params }: { params: Promise<{ uid: string }> }) {
    const { uid } = use(params);
    const { user } = useAuth();
    const { t } = useLanguage();
    const { relationshipWith, loading: connectionsLoading } = useConnectionState();

    const [person, setPerson] = useState<PlatformUser | null>(null);
    const [personLoaded, setPersonLoaded] = useState(false);
    const [draft, setDraft] = useState('');

    const { messages, state, send, sending } = useConversation(user?.uid ?? null, uid);

    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' });
    }, [messages.length]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [found] = await fetchUsersByUid([uid]);
                if (!cancelled) setPerson(found ?? null);
            } catch (error) {
                console.error('Error loading songwriter for chat:', error);
            } finally {
                if (!cancelled) setPersonLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [uid]);

    const isConnected = relationshipWith(uid) === 'connected';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || state !== 'ready') return;
        const body = draft;
        setDraft('');
        await send(body);
    };

    if (!personLoaded || connectionsLoading) {
        return (
            <div className="max-w-2xl space-y-4 px-5 md:px-0">
                <div className="h-6 w-40 rounded-full bg-stone-200/50 animate-pulse" />
                <div className="h-24 rounded-[18px] bg-stone-200/40 animate-pulse" />
            </div>
        );
    }

    if (!person) {
        return (
            <div className="max-w-2xl space-y-3 px-5 md:px-0 text-stone-900 font-sans">
                <h1 className="text-2xl font-light tracking-tight">{t('profile.songwriter_not_found')}</h1>
                <p className="text-sm text-stone-500">{t('profile.songwriter_not_found_desc')}</p>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="max-w-2xl space-y-3 px-5 md:px-0 text-stone-900 font-sans">
                <h1 className="text-2xl font-light tracking-tight">{t('chat.not_connected')}</h1>
                <p className="text-sm text-stone-500">{t('chat.not_connected_desc')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl flex flex-col px-5 md:px-0 text-stone-900 font-sans">
            <header className="space-y-2 mb-6">
                <h1 className="text-2xl font-sans font-light tracking-tight text-stone-900">
                    {person.name}
                </h1>
                {/* Said plainly and once, at the top. A padlock on every bubble
                    would be decoration; this is a statement about the thread. */}
                <p className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Lock size={12} className="shrink-0" />
                    {t('chat.encrypted_notice')}
                </p>
            </header>

            {state === 'unsupported' && (
                <p className="text-sm text-stone-500 mb-4">{t('chat.unsupported')}</p>
            )}

            {state === 'awaiting-peer-key' && (
                <p className="text-sm text-stone-500 mb-4">
                    {t('chat.awaiting_peer_key').replace('{name}', person.name)}
                </p>
            )}

            <div className="flex flex-col gap-3 min-h-[240px] max-h-[55dvh] overflow-y-auto no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2">
                {state === 'ready' && messages.length === 0 && (
                    <p className="text-sm text-stone-400 py-8">
                        {t('chat.empty').replace('{name}', person.name)}
                    </p>
                )}

                {messages.map((message) => {
                    const mine = message.senderUid === user?.uid;
                    return (
                        <div
                            key={message.id}
                            className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-[18px] px-4 py-2.5 text-[14.5px] leading-relaxed ${
                                    mine
                                        ? 'bg-[#86BE7F]/20 text-stone-800'
                                        : 'bg-white border border-stone-200/70 text-stone-800'
                                } ${message.pending ? 'opacity-60' : ''}`}
                            >
                                {message.text === null
                                    // Not an error state to shout about — see the
                                    // device-bound note in lib/e2ee.ts.
                                    ? <span className="italic text-stone-400">{t('chat.undecryptable')}</span>
                                    : message.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-4">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={state !== 'ready'}
                    placeholder={t('chat.placeholder')}
                    className="flex-1 min-w-0 bg-white border border-stone-200/70 rounded-full px-5 h-12 text-[15px] font-medium outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400 disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={state !== 'ready' || sending || !draft.trim()}
                    aria-label={t('chat.send')}
                    className="h-12 w-12 shrink-0 aspect-square rounded-full bg-[#86BE7F] text-stone-900 flex items-center justify-center transition-all hover:brightness-[1.03] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Send size={18} className="stroke-[2.2]" />
                </button>
            </form>
        </div>
    );
}
