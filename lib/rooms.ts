"use client";

import { useEffect, useState } from 'react';
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const ROOMS = 'rooms';
export const ROOM_MESSAGES = 'messages';

export type RoomType = 'collab' | 'live';

/**
 * What a room is *for*. Fixed rather than free text so the host has to choose
 * one when creating the room — that choice is the "prepare the questions" step:
 * it tells the people who might join what they'd be walking into.
 * Labels live under connect.room_topic.<id>.
 */
export const ROOM_TOPICS = ['lyrics', 'production', 'melody', 'instrument', 'mentoring', 'discussion'] as const;
export type RoomTopic = typeof ROOM_TOPICS[number];

export type RoomStatus = 'open' | 'done';

/** Owner plus at least one other — a room of one is not a room. */
export const MIN_SEATS = 2;
export const MAX_SEATS = 8;

export interface Room {
    id: string;
    hostUid: string;
    hostName: string;
    type: RoomType;
    topic: RoomTopic;
    title: string;
    /**
     * What the host brings and what they're after, in their own words — the
     * second half of every example room ("I have the lyrics and everything").
     * The topic says what kind of room it is; this says what's actually in it.
     */
    details: string;
    /** Epoch ms. */
    startsAt: number;
    durationMin: number;
    /** "On canvas" for a collab room, a place for a live event. Free text. */
    location: string;
    /** Capacity including the host. */
    seats: number;
    /** Everyone in the room, host first. */
    participants: string[];
    /** Display names keyed by uid — written on join so the seat grid needs no lookups. */
    participantNames: Record<string, string>;
    status: RoomStatus;
    createdAt: number;
    endedAt: number | null;
}

function toRoom(id: string, data: Record<string, any>): Room {
    const participants: string[] = Array.isArray(data.participants) ? data.participants : [];
    return {
        id,
        hostUid: data.hostUid,
        hostName: data.hostName ?? '',
        type: data.type === 'live' ? 'live' : 'collab',
        topic: (ROOM_TOPICS as readonly string[]).includes(data.topic) ? data.topic : 'discussion',
        title: data.title ?? '',
        details: typeof data.details === 'string' ? data.details : '',
        startsAt: typeof data.startsAt === 'number' ? data.startsAt : 0,
        durationMin: typeof data.durationMin === 'number' ? data.durationMin : 0,
        location: data.location ?? '',
        seats: typeof data.seats === 'number' ? Math.max(MIN_SEATS, data.seats) : MIN_SEATS,
        participants,
        participantNames: data.participantNames ?? {},
        status: data.status === 'done' ? 'done' : 'open',
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
        endedAt: typeof data.endedAt === 'number' ? data.endedAt : null,
    };
}

export interface RoomsResult {
    /** Still running, or yet to start — joinable if a seat is free. */
    open: Room[];
    /** Ended by the host. Kept, not deleted: what happened in a room is part of the record. */
    history: Room[];
    loading: boolean;
}

/** History only ever grows; the list shows the recent end of it. */
const HISTORY_LIMIT = 30;

/**
 * Open rooms and recent history, as two listeners.
 *
 * Two rather than one on purpose: a single capped read of the whole collection
 * would, once history is long enough, start dropping *open* rooms to make room
 * for old ones — the one thing the list must never do. Each listener filters on
 * a single field, so neither needs a composite index; ordering is done here.
 */
export function useRooms(enabled: boolean): RoomsResult {
    const [open, setOpen] = useState<Room[] | null>(null);
    const [history, setHistory] = useState<Room[] | null>(null);

    useEffect(() => {
        if (!enabled) { setOpen([]); setHistory([]); return; }

        const listen = (
            status: RoomStatus,
            cap: number,
            apply: (rows: Room[]) => void,
        ) => onSnapshot(
            query(collection(db, ROOMS), where('status', '==', status), limit(cap)),
            (snap) => {
                const rows: Room[] = [];
                snap.forEach((d) => rows.push(toRoom(d.id, d.data())));
                apply(rows);
            },
            (err) => {
                console.error(`[rooms] ${status} listener failed:`, err);
                apply([]);
            },
        );

        const unsubOpen = listen('open', 100, (rows) => setOpen(rows.sort((a, b) => a.startsAt - b.startsAt)));
        const unsubHistory = listen('done', HISTORY_LIMIT, (rows) =>
            setHistory(rows.sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))));
        return () => { unsubOpen(); unsubHistory(); };
    }, [enabled]);

    return {
        open: open ?? [],
        history: history ?? [],
        loading: enabled && (open === null || history === null),
    };
}

/** One room, live. */
export function useRoom(roomId: string | null): { room: Room | null; loading: boolean } {
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) { setRoom(null); setLoading(false); return; }
        const unsubscribe = onSnapshot(
            doc(db, ROOMS, roomId),
            (snap) => {
                setRoom(snap.exists() ? toRoom(snap.id, snap.data()) : null);
                setLoading(false);
            },
            (err) => {
                console.error('[rooms] Room listener failed:', err);
                setRoom(null);
                setLoading(false);
            },
        );
        return unsubscribe;
    }, [roomId]);

    return { room, loading };
}

export interface CreateRoomInput {
    hostUid: string;
    hostName: string;
    type: RoomType;
    topic: RoomTopic;
    title: string;
    details: string;
    startsAt: number;
    durationMin: number;
    location: string;
    seats: number;
}

/** Room "details" are a sentence or two, not a document. Mirrored in the rules. */
export const DETAILS_MAX = 300;

export async function createRoom(input: CreateRoomInput): Promise<string> {
    const seats = Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(input.seats)));
    const ref = await addDoc(collection(db, ROOMS), {
        hostUid: input.hostUid,
        hostName: input.hostName,
        type: input.type,
        topic: input.topic,
        title: input.title.trim(),
        details: input.details.trim().slice(0, DETAILS_MAX),
        startsAt: input.startsAt,
        durationMin: input.durationMin,
        location: input.location.trim(),
        seats,
        // The host holds the first seat from the moment the room exists.
        participants: [input.hostUid],
        participantNames: { [input.hostUid]: input.hostName },
        status: 'open',
        createdAt: Date.now(),
        endedAt: null,
    });
    return ref.id;
}

/** Takes a free seat. The rules refuse this once the room is full or done. */
export async function joinRoom(room: Room, uid: string, name: string): Promise<void> {
    await updateDoc(doc(db, ROOMS, room.id), {
        participants: arrayUnion(uid),
        [`participantNames.${uid}`]: name,
    });
}

/** Gives a seat back. The host cannot leave — they end the room instead. */
export async function leaveRoom(room: Room, uid: string): Promise<void> {
    await updateDoc(doc(db, ROOMS, room.id), { participants: arrayRemove(uid) });
}

/** Host only. Nothing is deleted: the room moves to history, chat and all. */
export async function endRoom(room: Room): Promise<void> {
    await updateDoc(doc(db, ROOMS, room.id), { status: 'done', endedAt: Date.now() });
}

// ── room chat ────────────────────────────────────────────────────────────────

export interface RoomMessage {
    id: string;
    senderUid: string;
    senderName: string;
    text: string;
    createdAt: number;
}

const MESSAGE_LIMIT = 300;

/**
 * The room's chat. Plain text, gated by the rules to the room's participants.
 *
 * Deliberately NOT end-to-end encrypted like direct messages (lib/e2ee.ts):
 * that scheme derives one key from two people's key pairs, and does not extend
 * to a room whose membership changes. A room's chat also has to outlive the
 * room — "when the activity is done we keep it in history" — which means being
 * readable to whoever was in it, later, from any device. Both point the same
 * way. What this *does* guarantee is that only members can read or write.
 */
export function useRoomMessages(roomId: string | null): { messages: RoomMessage[]; loading: boolean } {
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) { setMessages([]); setLoading(false); return; }
        const unsubscribe = onSnapshot(
            query(collection(db, ROOMS, roomId, ROOM_MESSAGES), orderBy('createdAt', 'asc'), limit(MESSAGE_LIMIT)),
            (snap) => {
                const rows: RoomMessage[] = [];
                snap.forEach((d) => {
                    const data = d.data();
                    rows.push({
                        id: d.id,
                        senderUid: data.senderUid,
                        senderName: data.senderName ?? '',
                        text: data.text ?? '',
                        createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
                    });
                });
                setMessages(rows);
                setLoading(false);
            },
            (err) => {
                console.error('[rooms] Chat listener failed:', err);
                setMessages([]);
                setLoading(false);
            },
        );
        return unsubscribe;
    }, [roomId]);

    return { messages, loading };
}

export async function sendRoomMessage(roomId: string, senderUid: string, senderName: string, text: string): Promise<void> {
    const body = text.trim();
    if (!body) return;
    await addDoc(collection(db, ROOMS, roomId, ROOM_MESSAGES), {
        senderUid,
        senderName,
        text: body,
        createdAt: serverTimestamp(),
    });
}
