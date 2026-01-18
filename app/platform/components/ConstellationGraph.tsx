"use client";

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface Node {
    id: string;
    title: string;
    x: number;
    y: number;
    status: 'LOCKED' | 'UNLOCKED' | 'MASTERED';
    dependencies: string[];
}

interface ConstellationGraphProps {
    lessons: any[];
    progress: any[];
}

export default function ConstellationGraph({ lessons, progress }: ConstellationGraphProps) {
    const router = useRouter();
    const [nodes, setNodes] = useState<Node[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Basic layout algorithm (could be improved with d3-force or similar)
        const layoutNodes = lessons.map((lesson, index) => {
            const userStatus = progress?.find(p => p.lessonId === lesson.id)?.status || 'LOCKED';

            return {
                id: lesson.id,
                title: lesson.title,
                x: 100 + (index % 3) * 200 + Math.random() * 50,
                y: 100 + Math.floor(index / 3) * 150 + Math.random() * 50,
                status: userStatus as any,
                dependencies: lesson.prerequisites?.map((p: any) => p.prerequisiteId) || []
            };
        });
        setNodes(layoutNodes);
    }, [lessons, progress]);

    const handleNodeClick = (lessonId: string) => {
        // Warp speed effect trigger (simulated with navigation transition)
        router.push(`/platform/lesson/${lessonId}`);
    };

    return (
        <div ref={containerRef} className="w-full h-[calc(100vh-100px)] overflow-hidden relative bg-charcoal">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-900/40 via-transparent to-transparent" />
            </div>

            <svg className="w-full h-full">
                {/* Draw Edges */}
                {nodes.map(node =>
                    node.dependencies.map(depId => {
                        const depNode = nodes.find(n => n.id === depId);
                        if (!depNode) return null;
                        return (
                            <line
                                key={`${node.id}-${depId}`}
                                x1={depNode.x}
                                y1={depNode.y}
                                x2={node.x}
                                y2={node.y}
                                stroke="white"
                                strokeWidth="1"
                                strokeOpacity="0.1"
                                strokeDasharray="4 4"
                            />
                        );
                    })
                )}

                {/* Draw Nodes */}
                {nodes.map(node => {
                    const isLocked = node.status === 'LOCKED';
                    const isMastered = node.status === 'MASTERED';

                    return (
                        <motion.g
                            key={node.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.1 }}
                            className="cursor-pointer"
                            onClick={() => !isLocked && handleNodeClick(node.id)}
                        >
                            {/* Glow for Mastered */}
                            {isMastered && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="25"
                                    fill="url(#goldGlow)"
                                    className="animate-pulse"
                                />
                            )}

                            {/* Node Core */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r="12"
                                fill={isLocked ? 'rgba(255,255,255,0.1)' : 'transparent'}
                                stroke={isLocked ? '#444' : isMastered ? '#C5A059' : '#FFF'}
                                strokeWidth={isMastered ? '3' : '2'}
                                className={isMastered ? 'drop-shadow-[0_0_8px_rgba(197,160,89,0.8)]' : ''}
                            />

                            {/* Label */}
                            <text
                                x={node.x}
                                y={node.y + 30}
                                textAnchor="middle"
                                className={`text-[10px] font-sans uppercase tracking-widest ${isLocked ? 'fill-white/20' : 'fill-white'
                                    }`}
                            >
                                {node.title}
                            </text>
                        </motion.g>
                    );
                })}

                <defs>
                    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#C5A059" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
                    </radialGradient>
                </defs>
            </svg>
        </div>
    );
}
