"use client";

import { useEffect, useRef, useState } from 'react';
import { useMidi } from '../hooks/useMidi';

interface SynesthesiaCanvasProps {
    midiDataUrl?: string; // To be fetched and parsed
}

interface Particle {
    x: number;
    y: number;
    color: string;
    velocity: { x: number; y: number };
    life: number;
    size: number;
}

const NOTE_COLORS: Record<number, string> = {
    0: '#FF0000', // C
    1: '#FF7F00', // C#
    2: '#FFFF00', // D
    3: '#7FFF00', // D#
    4: '#00FF00', // E
    5: '#00FF7F', // F
    6: '#00FFFF', // F#
    7: '#007FFF', // G
    8: '#0000FF', // G#
    9: '#7F00FF', // A
    10: '#FF00FF', // A#
    11: '#FF007F', // B
};

export default function SynesthesiaCanvas({ midiDataUrl }: SynesthesiaCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const midiEvent = useMidi();
    const particles = useRef<Particle[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Handle incoming MIDI events
    useEffect(() => {
        if (midiEvent) {
            spawnParticles(midiEvent.note);
        }
    }, [midiEvent]);

    const spawnParticles = (note: number) => {
        const normalizedNote = note % 12;
        const color = NOTE_COLORS[normalizedNote] || '#FFFFFF';
        const canvas = canvasRef.current;
        if (!canvas) return;

        for (let i = 0; i < 20; i++) {
            particles.current.push({
                x: (note - 60) * 20 + canvas.width / 2, // Simple mapping
                y: canvas.height - 20,
                color,
                velocity: {
                    x: (Math.random() - 0.5) * 5,
                    y: -Math.random() * 8 - 4,
                },
                life: 1.0,
                size: Math.random() * 4 + 2,
            });
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            // Background with slight fade for trail effect
            ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw "Correct" notes overlay (Mock for now)
            if (midiDataUrl) {
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.3)'; // Gold translucent
                ctx.lineWidth = 2;
                // Mock drawing static lines where notes should be
                for (let i = 0; i < 8; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 100 + 50, 0);
                    ctx.lineTo(i * 100 + 50, canvas.height);
                    ctx.stroke();
                }
            }

            // Update and draw particles
            particles.current = particles.current.filter((p) => p.life > 0);
            particles.current.forEach((p) => {
                p.x += p.velocity.x;
                p.y += p.velocity.y;
                p.life -= 0.01;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}${Math.floor(p.life * 255).toString(16).padStart(2, '0')}`;
                ctx.fill();

                // Glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = p.color;
            });
            ctx.shadowBlur = 0;

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            canvas.width = canvas.parentElement?.clientWidth || 800;
            canvas.height = canvas.parentElement?.clientHeight || 400;
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [midiDataUrl]);

    return (
        <div className="w-full h-full relative bg-charcoal/90 rounded-t-3xl overflow-hidden border-t border-white/5">
            <div className="absolute top-4 left-6 z-10">
                <h3 className="text-gold-400 font-serif text-sm tracking-widest uppercase">Synesthesia Canvas</h3>
                <p className="text-alabaster/40 text-[10px] mt-1">Real-time Spectral Visualization</p>
            </div>
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
}
