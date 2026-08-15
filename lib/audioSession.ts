/**
 * iOS/Safari audio session management.
 *
 * Two iOS-only behaviours make audio silently fail in a web app, with no error and
 * no rejected promise — playback "runs" (timeupdate fires, the timer counts up) but
 * nothing comes out of the phone:
 *
 * 1. The hardware ring/silent switch. On iOS an <audio> element is treated as a
 *    *transient* sound by default, so a phone with the side switch flipped to silent
 *    plays it at zero volume. Plenty of people leave that switch on permanently.
 *
 * 2. Play-and-record routing. The moment getUserMedia() is called, iOS moves the page
 *    into a record-capable audio session and routes output to the earpiece receiver
 *    (the tiny speaker by your ear) instead of the loudspeaker. Everything afterwards
 *    sounds silent-to-inaudible unless you hold the phone to your head — and it can
 *    persist after recording, since a cached AudioContext keeps the session alive.
 *
 * `navigator.audioSession` (Safari 16.4+ / iOS 16.4+) fixes both by letting us state
 * intent: 'playback' means "this is media the user asked to hear", which overrides the
 * silent switch and routes to the main speaker.
 *
 * Everything here is a safe no-op on browsers without the API.
 */

type AudioSessionType = 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';

function getAudioSession(): { type: AudioSessionType } | null {
    if (typeof navigator === 'undefined') return null;
    const session = (navigator as any).audioSession;
    return session && typeof session === 'object' ? session : null;
}

function setType(type: AudioSessionType) {
    const session = getAudioSession();
    if (!session) return;
    try {
        session.type = type;
    } catch {
        // Older/partial implementations can throw on assignment — never let audio
        // routing config break the actual play/record call that follows it.
    }
}

/**
 * Call immediately before `.play()` on any audio the user explicitly asked to hear.
 * Overrides the iOS silent switch and pulls output back to the loudspeaker if a
 * previous recording left the session routed to the earpiece.
 */
export function setPlaybackAudioSession() {
    setType('playback');
}

/** Call when starting a recording, so iOS grants mic input for the session. */
export function setRecordingAudioSession() {
    setType('play-and-record');
}

/**
 * Call after recording stops. Returning to 'playback' (rather than 'auto') is
 * deliberate: 'auto' lets iOS fall back to the earpiece routing that play-and-record
 * established, which is exactly the "I recorded, now playback is silent" bug.
 */
export function releaseRecordingAudioSession() {
    setType('playback');
}
