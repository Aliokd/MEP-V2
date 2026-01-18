"use client";

import { useEffect, useState, useCallback } from 'react';

/**
 * useMidi Hook
 * Simulated MIDI listener using keyboard for now.
 * Keys A-K map to a scale.
 */
export function useMidi() {
    const [midiData, setMidiData] = useState<{ note: number; velocity: number; timestamp: number } | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const keyMap: Record<string, number> = {
                'a': 60, // C4
                'w': 61, // C#4
                's': 62, // D4
                'e': 63, // D#4
                'd': 64, // E4
                'f': 65, // F4
                't': 66, // F#4
                'g': 67, // G4
                'y': 68, // G#4
                'h': 69, // A4
                'u': 70, // A#4
                'j': 71, // B4
                'k': 72, // C5
            };

            if (keyMap[e.key.toLowerCase()]) {
                setMidiData({
                    note: keyMap[e.key.toLowerCase()],
                    velocity: 100,
                    timestamp: Date.now(),
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return midiData;
}
