"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    setDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

/**
 * Peer-to-peer voice calling for a Create project.
 *
 * Topology is a full mesh: every participant holds one RTCPeerConnection per peer. That's only
 * viable because project membership is capped at 5 (see MAX_PROJECT_MEMBERS in collabUtils.ts),
 * so each client manages at most 4 audio-only connections — no SFU or media server needed.
 *
 * Signalling rides the `projects/{id}/signaling` subcollection: one document per offer / answer /
 * ICE candidate, addressed `from` → `to`. Documents carry an `expiresAt` so a Firestore TTL policy
 * can reap them; they are pure garbage once a handshake completes.
 *
 * Deliberately kept out of page.tsx: this is ~300 lines of connection lifecycle that has nothing
 * to do with the canvas, and the peer/stream bookkeeping is far easier to reason about isolated.
 */

// Public STUN only. Roughly 10-20% of networks (symmetric NAT, restrictive corporate/mobile) need
// a TURN relay to connect at all; that costs money, so the provider choice is left to config
// rather than hardcoded. Without TURN those users will simply fail to connect.
const ICE_SERVERS: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
];

const SIGNAL_TTL_MS = 5 * 60 * 1000;

export interface CallParticipant {
    uid: string;
    name: string;
    muted: boolean;
}

interface UseVoiceCallArgs {
    projectId: string | null;
    userId: string | null;
    userName: string;
    /**
     * True while Demo Studio is capturing. The call is suspended in BOTH directions while this
     * holds — see the effect below for why muting only the microphone is not enough.
     */
    isRecording: boolean;
    onNotify?: (message: string, color?: string) => void;
}

export function useVoiceCall({ projectId, userId, userName, isRecording, onNotify }: UseVoiceCallArgs) {
    const [isCallActive, setIsCallActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [participants, setParticipants] = useState<CallParticipant[]>([]);
    // Everyone currently in the huddle, tracked whether or not *we* are in it — this is what lets
    // a member be invited to a huddle that's already running.
    const [huddleRoster, setHuddleRoster] = useState<CallParticipant[]>([]);

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<{ [uid: string]: RTCPeerConnection }>({});
    // Remote audio is played through plain <audio> elements rather than Web Audio. Demo Studio
    // closes and recreates its AudioContext whenever the low-latency preference flips, and routing
    // call audio through that graph would entangle the call with an unrelated lifecycle.
    const remoteAudioRef = useRef<{ [uid: string]: HTMLAudioElement }>({});
    const unsubSignalRef = useRef<(() => void) | null>(null);
    const unsubRosterRef = useRef<(() => void) | null>(null);
    const isCallActiveRef = useRef(false);

    const notify = useCallback((msg: string, color?: string) => {
        if (onNotify) onNotify(msg, color);
    }, [onNotify]);

    const sendSignal = useCallback(async (to: string, type: string, payload: any) => {
        if (!projectId || !userId) return;
        try {
            await addDoc(collection(db, "projects", projectId, "signaling"), {
                from: userId,
                to,
                type,
                payload: JSON.stringify(payload),
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + SIGNAL_TTL_MS)
            });
        } catch (err) {
            console.error("Signal send failed:", err);
        }
    }, [projectId, userId]);

    const attachRemoteAudio = useCallback((peerUid: string, stream: MediaStream) => {
        let el = remoteAudioRef.current[peerUid];
        if (!el) {
            el = document.createElement('audio');
            el.autoplay = true;
            // Never route a peer's audio into the recording path.
            (el as any).playsInline = true;
            remoteAudioRef.current[peerUid] = el;
            document.body.appendChild(el);
        }
        el.srcObject = stream;
        // Joining a call is itself a user gesture, so autoplay is normally permitted; swallow the
        // rejection rather than surfacing it if a browser disagrees.
        el.play().catch(() => {});
    }, []);

    const teardownPeer = useCallback((peerUid: string) => {
        const pc = peersRef.current[peerUid];
        if (pc) {
            try {
                pc.onicecandidate = null;
                pc.ontrack = null;
                pc.onconnectionstatechange = null;
                pc.close();
            } catch { /* already closed */ }
            delete peersRef.current[peerUid];
        }
        const el = remoteAudioRef.current[peerUid];
        if (el) {
            try {
                el.srcObject = null;
                el.remove();
            } catch { /* detached */ }
            delete remoteAudioRef.current[peerUid];
        }
    }, []);

    const createPeer = useCallback((peerUid: string): RTCPeerConnection => {
        const existing = peersRef.current[peerUid];
        if (existing) return existing;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current[peerUid] = pc;

        const local = localStreamRef.current;
        if (local) local.getTracks().forEach(track => pc.addTrack(track, local));

        pc.onicecandidate = (event) => {
            if (event.candidate) sendSignal(peerUid, 'ice', event.candidate.toJSON());
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) attachRemoteAudio(peerUid, event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                teardownPeer(peerUid);
                setParticipants(prev => prev.filter(p => p.uid !== peerUid));
            }
        };

        return pc;
    }, [sendSignal, attachRemoteAudio, teardownPeer]);

    const handleSignal = useCallback(async (data: any, signalDocId: string) => {
        if (!projectId || !userId) return;
        const from = data.from as string;
        if (!from || from === userId) return;

        let payload: any;
        try {
            payload = JSON.parse(data.payload);
        } catch {
            return;
        }

        try {
            if (data.type === 'offer') {
                const pc = createPeer(from);
                await pc.setRemoteDescription(new RTCSessionDescription(payload));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal(from, 'answer', answer);
            } else if (data.type === 'answer') {
                const pc = peersRef.current[from];
                // Only apply an answer to a connection still awaiting one; a duplicate delivery
                // would otherwise throw an InvalidStateError.
                if (pc && pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload));
                }
            } else if (data.type === 'ice') {
                const pc = peersRef.current[from];
                if (pc && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(payload));
                }
            }
        } catch (err) {
            console.error("Signal handling failed:", err);
        } finally {
            // Consume the signal so it isn't reprocessed and doesn't accumulate.
            deleteDoc(doc(db, "projects", projectId, "signaling", signalDocId)).catch(() => {});
        }
    }, [projectId, userId, createPeer, sendSignal]);

    const leaveCall = useCallback(async () => {
        isCallActiveRef.current = false;
        setIsCallActive(false);
        setIsConnecting(false);
        setParticipants([]);

        if (unsubSignalRef.current) { unsubSignalRef.current(); unsubSignalRef.current = null; }
        if (unsubRosterRef.current) { unsubRosterRef.current(); unsubRosterRef.current = null; }

        Object.keys(peersRef.current).forEach(teardownPeer);

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }

        if (projectId && userId) {
            deleteDoc(doc(db, "projects", projectId, "callParticipants", userId)).catch(() => {});
        }
    }, [projectId, userId, teardownPeer]);

    const joinCall = useCallback(async () => {
        if (!projectId || !userId || isCallActiveRef.current) return;
        setIsConnecting(true);

        try {
            // A dedicated capture with echo cancellation, noise suppression and AGC ON.
            // Deliberately NOT reusing Demo Studio's microphone stream: that one disables all
            // three (correct for recording music, feedback howl for speech), and
            // stopAllStudioAudio() stops its tracks on every new recording, which would kill
            // the call the moment someone hit REC.
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            localStreamRef.current = stream;
        } catch (err) {
            console.error("Call microphone access failed:", err);
            setIsConnecting(false);
            notify('Microphone access is needed to join the call.', 'rose');
            return;
        }

        isCallActiveRef.current = true;
        setIsCallActive(true);
        setIsConnecting(false);

        // Announce ourselves. Other clients watch this collection to know who to dial.
        await setDoc(doc(db, "projects", projectId, "callParticipants", userId), {
            uid: userId,
            name: userName,
            joinedAt: serverTimestamp()
        }).catch(err => console.error("Failed to announce call presence:", err));

        // Inbound signalling addressed to us.
        unsubSignalRef.current = onSnapshot(
            query(collection(db, "projects", projectId, "signaling"), where("to", "==", userId)),
            (snap) => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') handleSignal(change.doc.data(), change.doc.id);
                });
            },
            (err) => console.warn("Signalling listener error:", err.message)
        );

        // Roster: dial anyone already in the call, drop anyone who left.
        unsubRosterRef.current = onSnapshot(
            collection(db, "projects", projectId, "callParticipants"),
            async (snap) => {
                const roster: CallParticipant[] = [];
                const seen = new Set<string>();

                snap.forEach(d => {
                    const data = d.data();
                    if (d.id === userId) return;
                    seen.add(d.id);
                    roster.push({ uid: d.id, name: data.name || 'Collaborator', muted: false });
                });

                setParticipants(roster);

                // Drop peers who have left.
                Object.keys(peersRef.current).forEach(uid => {
                    if (!seen.has(uid)) teardownPeer(uid);
                });

                // Dial new peers. Only the lexicographically-lower uid initiates, so two clients
                // discovering each other simultaneously don't both send an offer (glare).
                for (const peer of roster) {
                    if (peersRef.current[peer.uid]) continue;
                    if (userId < peer.uid) {
                        const pc = createPeer(peer.uid);
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            await sendSignal(peer.uid, 'offer', offer);
                        } catch (err) {
                            console.error("Offer creation failed:", err);
                        }
                    }
                }
            },
            (err) => console.warn("Call roster listener error:", err.message)
        );
    }, [projectId, userId, userName, handleSignal, createPeer, sendSignal, teardownPeer, notify]);

    const toggleMute = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        setIsMuted(prev => {
            const next = !prev;
            stream.getAudioTracks().forEach(t => { t.enabled = !next; });
            return next;
        });
    }, []);

    /**
     * Suspend the call in BOTH directions while Demo Studio is recording.
     *
     * Muting only the outgoing microphone is insufficient: direct monitoring is on by default and
     * routes audio to the speakers, so with no headphones a peer's voice would be picked straight
     * back up by the microphone and baked into the take.
     */
    useEffect(() => {
        if (!isCallActive) return;

        const stream = localStreamRef.current;
        if (stream) {
            stream.getAudioTracks().forEach(t => {
                t.enabled = isRecording ? false : !isMuted;
            });
        }
        Object.values(remoteAudioRef.current).forEach(el => { el.muted = isRecording; });

        if (isRecording) {
            notify('Call paused while recording', 'amber');
        }
    }, [isRecording, isCallActive, isMuted, notify]);

    // Leave the call when the project changes or the page goes away, otherwise peer connections
    // and the microphone would leak (the browser's recording indicator would stay lit).
    useEffect(() => {
        return () => {
            if (isCallActiveRef.current) leaveCall();
        };
    }, [projectId, leaveCall]);

    useEffect(() => {
        const onPageHide = () => { if (isCallActiveRef.current) leaveCall(); };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, [leaveCall]);

    /**
     * Always-on huddle roster.
     *
     * Separate from the in-call roster listener because it has to run when we are NOT in the
     * huddle — that's the whole basis of "someone started a huddle, come join". The in-call
     * listener additionally drives peer dialling, which this one deliberately does not.
     */
    useEffect(() => {
        if (!projectId || !userId) {
            setHuddleRoster([]);
            return;
        }
        const unsub = onSnapshot(
            collection(db, "projects", projectId, "callParticipants"),
            (snap) => {
                const roster: CallParticipant[] = [];
                snap.forEach(d => {
                    const data = d.data();
                    roster.push({ uid: d.id, name: data.name || 'Collaborator', muted: false });
                });
                setHuddleRoster(roster);
            },
            (err) => console.warn("Huddle roster listener error:", err.message)
        );
        return () => unsub();
    }, [projectId, userId]);

    // Others already in the huddle. Drives the "join the huddle" invite for members who aren't in
    // it yet, so it must exclude us regardless of whether we've joined.
    const huddleOthers = huddleRoster.filter(p => p.uid !== userId);

    return {
        isCallActive,
        isConnecting,
        isMuted,
        participants,
        callParticipantCount: participants.length,
        // A huddle is "running" only if someone *else* is in it — being alone in a huddle you
        // started shouldn't make the app tell you to join your own huddle.
        isHuddleRunning: huddleOthers.length > 0,
        huddleOthers,
        joinCall,
        leaveCall,
        toggleMute
    };
}
