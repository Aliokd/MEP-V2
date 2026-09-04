"use client";

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PenLine, Plus, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
    endRoom,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    useRoom,
    useRoomMessages,
} from '@/lib/rooms';

/**
 * Inside a room: the seats, and the chat that opens once someone has joined.
 *
 * Under /platform/profile/ for the same reason the songwriter profile is —
 * that path gets the focused layout (no sidebar, back button, slide), which
 * is what a screen you step into from the Connect list wants.
 */
export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const { room, loading } = useRoom(id);
    const { messages } = useRoomMessages(id);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);

    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

    const viewerName = user?.displayName || user?.email?.split('@')[0] || '';
    const isMember = Boolean(user && room?.participants.includes(user.uid));
    const isHost = Boolean(user && room && room.hostUid === user.uid);
    const isDone = room?.status === 'done';
    const full = room ? room.participants.length >= room.seats : true;
    // Chat exists once there's someone to talk to — owner alone is a plan, not a room.
    const chatOpen = Boolean(room && room.participants.length >= 2);

    const act = async (fn: () => Promise<void>) => {
        setBusy(true);
        try { await fn(); } catch (err) { console.error('Room action failed:', err); } finally { setBusy(false); }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !room || !draft.trim() || isDone) return;
        const body = draft;
        setDraft('');
        await act(() => sendRoomMessage(room.id, user.uid, viewerName, body));
    };

    if (loading) {
        return (
            <div className="max-w-2xl space-y-4 px-5 md:px-0">
                <div className="h-8 w-56 rounded-full bg-stone-200/50 animate-pulse" />
                <div className="h-5 w-80 rounded-full bg-stone-200/40 animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {[0, 1, 2].map((i) => <div key={i} className="aspect-[1.25/1] rounded-[16px] bg-stone-200/40 animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="max-w-2xl px-5 md:px-0 text-stone-900 font-sans space-y-2">
                <h1 className="text-2xl font-light tracking-tight">{t('connect.room_not_found')}</h1>
                <p className="text-sm text-stone-500">{t('connect.room_not_found_desc')}</p>
            </div>
        );
    }

    const when = room.startsAt > 0
        ? new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(room.startsAt))
        : '';
    const facts = [
        t(`connect.room_topic.${room.topic}`),
        when,
        room.durationMin > 0 ? `${room.durationMin} ${t('connect.room_min')}` : '',
        room.location,
        `${room.participants.length}/${room.seats} ${t('connect.room_people')}`,
        isHost ? t('connect.room_yours') : room.hostName,
    ].filter(Boolean);
    const seats = Array.from({ length: room.seats }, (_, i) => room.participants[i] ?? null);

    return (
        <div className="max-w-2xl px-5 md:px-0 text-stone-900 font-sans space-y-8">
            <header>
                <div className="flex items-start justify-between gap-4">
                    <h1 className="font-lyrics text-[30px] sm:text-[36px] leading-[1.15] text-stone-900">{room.title}</h1>
                    {isDone && (
                        <span className="shrink-0 rounded-full bg-[#F6F6F0] px-3 py-1 text-[11.5px] font-semibold text-stone-500">
                            {t('connect.room_status_done')}
                        </span>
                    )}
                </div>
                <p className="mt-2 font-lyrics text-[18px] sm:text-[20px] leading-snug text-stone-500 flex flex-wrap gap-x-4 gap-y-0.5">
                    {facts.map((f, i) => <span key={i}>{f}</span>)}
                </p>
                {room.details && (
                    <p className="mt-3 text-[15px] text-stone-700 leading-relaxed max-w-xl whitespace-pre-wrap">{room.details}</p>
                )}
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {seats.map((uid, i) => {
                    if (uid) {
                        const name = uid === room.hostUid ? room.hostName : (room.participantNames[uid] || t('connect.room_someone'));
                        return (
                            <div key={uid} className="aspect-[1.25/1] rounded-[16px] bg-[#EBEBE3] flex flex-col items-center justify-center px-3 text-center gap-1">
                                <span className="font-sans text-[15px] font-medium text-stone-800 leading-tight break-words">{name}</span>
                                {uid === room.hostUid && <span className="text-[11px] text-stone-500">{t('connect.room_hosting')}</span>}
                            </div>
                        );
                    }
                    const isJoinControl = !isDone && !isMember && !full && Boolean(user) && i === room.participants.length;
                    return isJoinControl ? (
                        <button
                            key={`seat-${i}`}
                            type="button"
                            disabled={busy}
                            onClick={() => user && act(() => joinRoom(room, user.uid, viewerName))}
                            aria-label={t('connect.room_join')}
                            className="aspect-[1.25/1] rounded-[16px] border border-dashed border-stone-400 hover:border-stone-700 hover:bg-stone-50 flex items-center justify-center transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        >
                            <Plus className="w-7 h-7 text-stone-700 stroke-[1.25]" />
                        </button>
                    ) : (
                        <div key={`seat-${i}`} aria-hidden="true" className="aspect-[1.25/1] rounded-[16px] border border-dashed border-stone-300 flex items-center justify-center">
                            {!isDone && <Plus className="w-7 h-7 text-stone-300 stroke-[1.25]" />}
                        </div>
                    );
                })}
            </div>

            {/* What the host can do with the room, and what a guest can. Quiet
                text actions — ending a room or leaving it should be deliberate,
                not the loudest thing on the page. */}
            {!isDone && isMember && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {room.type === 'collab' && (
                        <Link href="/platform/create" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors">
                            <PenLine size={15} /> {t('connect.room_open_canvas')}
                        </Link>
                    )}
                    {isHost ? (
                        <button type="button" disabled={busy} onClick={() => act(() => endRoom(room))} className="text-sm font-medium text-stone-400 hover:text-stone-800 hover:underline transition-colors cursor-pointer disabled:opacity-50">
                            {t('connect.room_end')}
                        </button>
                    ) : (
                        <button type="button" disabled={busy} onClick={() => user && act(() => leaveRoom(room, user.uid))} className="text-sm font-medium text-stone-400 hover:text-stone-800 hover:underline transition-colors cursor-pointer disabled:opacity-50">
                            {t('connect.room_leave')}
                        </button>
                    )}
                </div>
            )}

            {/* Chat — for members, once the room has more than its host in it. */}
            {isMember && (
                <section className="space-y-4 border-t border-stone-200/60 pt-7" aria-label={t('connect.room_chat')}>
                    {!chatOpen && (
                        <p className="text-sm text-stone-400">{t('connect.room_chat_waiting')}</p>
                    )}
                    {chatOpen && (
                        <>
                            <div className="flex flex-col gap-3 max-h-[50dvh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
                                {messages.length === 0 && (
                                    <p className="text-sm text-stone-400 py-6">{t('connect.room_chat_empty')}</p>
                                )}
                                {messages.map((m) => {
                                    const mine = m.senderUid === user?.uid;
                                    return (
                                        <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                                            {!mine && <span className="text-[11px] text-stone-400 mb-0.5 px-1">{m.senderName}</span>}
                                            <div className={`max-w-[80%] rounded-[18px] px-4 py-2.5 text-[14.5px] leading-relaxed ${mine ? 'bg-[#86BE7F]/20 text-stone-800' : 'bg-white border border-stone-200/70 text-stone-800'}`}>
                                                {m.text}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={endRef} />
                            </div>

                            {isDone ? (
                                <p className="text-xs text-stone-400">{t('connect.room_chat_closed')}</p>
                            ) : (
                                <form onSubmit={handleSend} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={t('connect.room_chat_placeholder')}
                                        className="flex-1 min-w-0 bg-white border border-stone-200/70 rounded-full px-5 h-12 text-[15px] font-medium outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={busy || !draft.trim()}
                                        aria-label={t('connect.room_chat_send')}
                                        className="h-12 w-12 shrink-0 aspect-square rounded-full bg-[#86BE7F] text-stone-900 flex items-center justify-center transition-all hover:brightness-[1.03] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <Send size={18} className="stroke-[2.2]" />
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
