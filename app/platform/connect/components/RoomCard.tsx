"use client";

import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Room } from '@/lib/rooms';

interface RoomCardProps {
    room: Room;
    viewerUid: string | null;
    onJoin: (room: Room) => void;
    t: (key: string) => string;
    locale: string;
}

/**
 * One room, in the sketch's shape: the name set in the lyric serif, a line of
 * facts beneath it, then the seats — every seat the room has, filled ones
 * showing who is in it, empty ones dashed with a "+" that takes the seat.
 *
 * The seat grid is the whole point of the card. It says at a glance how big
 * the room is, who is already there, and whether there is room for you.
 */
export default function RoomCard({ room, viewerUid, onJoin, t, locale }: RoomCardProps) {
    const joined = Boolean(viewerUid && room.participants.includes(viewerUid));
    const isHost = viewerUid === room.hostUid;
    const isDone = room.status === 'done';
    const full = room.participants.length >= room.seats;
    const canJoin = !isDone && !joined && !full && Boolean(viewerUid);

    const when = room.startsAt > 0
        ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })
            .format(new Date(room.startsAt))
        : '';

    // Kind first — "Live event" or "Collab room" is the thing that decides
    // whether you'd go somewhere or open the canvas — then topic, when, where,
    // how long, who's in, whose it is. Empty facts drop out.
    const facts = [
        t(`connect.room_type_${room.type}`),
        t(`connect.room_topic.${room.topic}`),
        when,
        room.location,
        room.durationMin > 0 ? `${room.durationMin} ${t('connect.room_min')}` : '',
        `${room.participants.length}/${room.seats} ${t('connect.room_people')}`,
        isHost ? t('connect.room_yours') : room.hostName,
    ].filter(Boolean);

    // Seats in order: host, then everyone who joined, then what is still free.
    const seats = Array.from({ length: room.seats }, (_, i) => room.participants[i] ?? null);
    const placesLeft = room.seats - room.participants.length;

    return (
        <article className={`bg-white border border-stone-200/60 rounded-[22px] p-5 sm:p-6 ${isDone ? 'opacity-70' : ''}`}>
            <Link href={`/platform/profile/rooms/${room.id}`} className="block group">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-lyrics text-[26px] sm:text-[30px] leading-[1.15] text-stone-900 group-hover:text-stone-700 transition-colors">
                        {room.title}
                    </h3>
                    {/* Top-right, in the same serif: the one number that decides
                        whether this card is for you. Silent once the room is done. */}
                    {!isDone && (
                        <span className="shrink-0 font-lyrics text-[17px] sm:text-[19px] leading-snug text-stone-600 pt-1">
                            {placesLeft > 0
                                ? t(placesLeft === 1 ? 'connect.room_place_left' : 'connect.room_places_left').replace('{n}', String(placesLeft))
                                : t('connect.room_full')}
                        </span>
                    )}
                </div>
                <p className="mt-1.5 font-lyrics text-[17px] sm:text-[19px] leading-snug text-stone-500 flex flex-wrap gap-x-4 gap-y-0.5">
                    {facts.map((fact, i) => <span key={i}>{fact}</span>)}
                </p>
                {room.details && (
                    <p className="mt-2 text-[14px] text-stone-600 leading-snug line-clamp-2">{room.details}</p>
                )}
            </Link>

            {/* Two seats per row at every width, as the sketch has it. Letting
                this widen to four columns on desktop turned a 4-seat room into
                one flat strip of small tiles and lost the sense of seats. */}
            <div className="grid grid-cols-2 gap-3 mt-5">
                {seats.map((uid, i) => {
                    if (uid) {
                        const name = uid === room.hostUid ? room.hostName : (room.participantNames[uid] || '');
                        return (
                            <div
                                key={uid}
                                className="aspect-[1.25/1] rounded-[16px] bg-[#EBEBE3] flex items-center justify-center px-3 text-center"
                            >
                                <span className="font-sans text-[15px] font-medium text-stone-800 leading-tight break-words">
                                    {name || t('connect.room_someone')}
                                </span>
                            </div>
                        );
                    }
                    // An open seat. Only the first free one is the join control —
                    // taking one seat is the same act however many are free, and
                    // four identical buttons would just be noise.
                    const isJoinControl = canJoin && i === room.participants.length;
                    return isJoinControl ? (
                        <button
                            key={`seat-${i}`}
                            type="button"
                            onClick={() => onJoin(room)}
                            aria-label={t('connect.room_join')}
                            className="aspect-[1.25/1] rounded-[16px] border border-dashed border-stone-400 hover:border-stone-700 hover:bg-stone-50 flex items-center justify-center transition-colors cursor-pointer active:scale-[0.98]"
                        >
                            <Plus className="w-7 h-7 text-stone-700 stroke-[1.25]" />
                        </button>
                    ) : (
                        // Still empty. On a room that has ended, no "+": there is
                        // nothing left to take, and the outline alone says the seat
                        // was never filled.
                        <div
                            key={`seat-${i}`}
                            aria-hidden="true"
                            className="aspect-[1.25/1] rounded-[16px] border border-dashed border-stone-300 flex items-center justify-center"
                        >
                            {!isDone && <Plus className="w-7 h-7 text-stone-300 stroke-[1.25]" />}
                        </div>
                    );
                })}
            </div>
        </article>
    );
}
