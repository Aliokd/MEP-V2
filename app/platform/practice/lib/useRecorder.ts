"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { setRecordingAudioSession, releaseRecordingAudioSession } from '@/lib/audioSession';

/**
 * Recording a take, for the practices that ask for one.
 *
 * The app already records in two places — the canvas REC button and the Demo
 * Studio — but both are hand-rolled inside app/platform/create/page.tsx and are
 * near-identical copies of each other. Rather than make a third copy, the parts
 * that are purely mechanical live here: the codec ladder, the constraints and
 * their fallback, the iOS audio-session calls, assembling the blob, and letting
 * go of the microphone afterwards.
 *
 * What it deliberately does not do is upload, or know what the take is for.
 */

/** Matches the canvas recorder, so takes across the app weigh the same. */
const BITS_PER_SECOND = 128000;

/**
 * Codecs in the order we want them. Chrome and Firefox take the first, Safari
 * falls through to audio/mp4, and the last two are there for browsers that
 * support neither. Asking for a type that is not supported throws, hence the
 * check rather than a bare construction.
 */
const MIME_LADDER = [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/aac',
];

/**
 * Raw mic, not a phone call. Echo cancellation and noise suppression are tuned
 * for speech and will chew the tail off a guitar note, and auto gain will pump
 * on anything with dynamics.
 */
const CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount: 1,
    },
};

export interface Take {
    /** An object URL. Revoked when it is replaced or the hook unmounts. */
    url: string;
    blob: Blob;
    /** Seconds, counted by the timer rather than read off the file: a webm from
     *  MediaRecorder reports Infinity for its duration until it is fully seeked. */
    seconds: number;
    mimeType: string;
}

export type RecorderError = 'insecure' | 'denied' | 'unavailable';

interface UseRecorderOptions {
    /** Stop on its own at this many seconds, so a forgotten session is bounded. */
    maxSeconds?: number;
}

export function useRecorder({ maxSeconds = 120 }: UseRecorderOptions = {}) {
    const [isRecording, setIsRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [take, setTake] = useState<Take | null>(null);
    const [error, setError] = useState<RecorderError | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const secondsRef = useRef(0);
    /** So the timer's stop and the user's stop go through the same path. */
    const stopRef = useRef<() => void>(() => {});
    /** Revoked on replace and on unmount; a take's URL outlives its blob otherwise. */
    const urlRef = useRef<string | null>(null);

    const releaseStream = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        releaseRecordingAudioSession();
    }, []);

    const stop = useCallback(() => {
        const rec = recorderRef.current;
        if (!rec || rec.state === 'inactive') return;
        // The blob is assembled in onstop; releasing the stream is what actually
        // turns the browser's recording indicator off.
        rec.stop();
    }, []);
    // In an effect, not the render body: assigning to a ref while rendering is
    // a write during render, and React can render without committing.
    useEffect(() => { stopRef.current = stop; }, [stop]);

    const start = useCallback(async () => {
        setError(null);
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            // Almost always an http:// origin that is not localhost.
            setError('insecure');
            return;
        }

        // Before the ask, not after: on iOS the category has to be in place when
        // the permission prompt resolves or playback afterwards routes to the earpiece.
        setRecordingAudioSession();

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
        } catch {
            // Some devices reject the exact constraints rather than negotiating.
            // Worth one plain retry before calling it a refusal.
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
                releaseRecordingAudioSession();
                setError('denied');
                return;
            }
        }
        streamRef.current = stream;

        const options: MediaRecorderOptions = { audioBitsPerSecond: BITS_PER_SECOND };
        if (typeof MediaRecorder !== 'undefined') {
            const supported = MIME_LADDER.find(type => MediaRecorder.isTypeSupported(type));
            if (supported) options.mimeType = supported;
        }

        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(stream, options);
        } catch {
            try {
                recorder = new MediaRecorder(stream);
            } catch {
                releaseStream();
                setError('unavailable');
                return;
            }
        }
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const mimeType = recorder.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type: mimeType });
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setTake({ url, blob, seconds: secondsRef.current, mimeType });
            setIsRecording(false);
            releaseStream();
        };

        secondsRef.current = 0;
        setSeconds(0);
        // No timeslice: one dataavailable at stop is all a short take needs.
        recorder.start();
        setIsRecording(true);

        timerRef.current = setInterval(() => {
            secondsRef.current += 1;
            setSeconds(secondsRef.current);
            if (secondsRef.current >= maxSeconds) stopRef.current();
        }, 1000);
    }, [maxSeconds, releaseStream]);

    /** Throw the take away and go again. */
    const discard = useCallback(() => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setTake(null);
        setSeconds(0);
        secondsRef.current = 0;
    }, []);

    // Leaving the step mid-take must not leave the microphone open.
    useEffect(() => () => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach(track => track.stop());
        releaseRecordingAudioSession();
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    }, []);

    return { isRecording, seconds, take, error, start, stop, discard };
}
