/**
 * 16-bit PCM mono WAV from a rendered AudioBuffer.
 *
 * WAV rather than anything compressed: a few hundred kilobytes for five
 * seconds, every browser plays it, and encoding it is forty lines with no
 * dependency. Shared by the practices that render what they played — the
 * canvas's audio card takes any audio the browser can play.
 */
export function encodeWav(buffer: AudioBuffer): Blob {
    const samples = buffer.getChannelData(0);
    const rate = buffer.sampleRate;
    const bytes = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(bytes);
    const ascii = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };
    ascii(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    view.setUint32(16, 16, true);       // chunk size
    view.setUint16(20, 1, true);        // PCM
    view.setUint16(22, 1, true);        // mono
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true); // byte rate
    view.setUint16(32, 2, true);        // block align
    view.setUint16(34, 16, true);       // bits per sample
    ascii(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
}

let sharedCtx: AudioContext | null = null;
/** One live context for Practice; browsers cap how many can exist. */
export function liveAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedCtx) sharedCtx = new Ctor();
    // Autoplay policy suspends the context until a gesture; every caller is
    // inside a press, so it may resume here.
    if (sharedCtx.state === 'suspended') void sharedCtx.resume();
    return sharedCtx;
}
