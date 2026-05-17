"use client";

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const WORD_CONFIGS = [
    { text: "Apprendre", color: "#B3E0F2" }, // Light Blue
    { text: "Famous", color: "#FFE270" },   // Yellow
    { text: "Appreciate", color: "#8E9E71" }, // Olive Green
    { text: "Down", color: "#FFE270" },     // Yellow
    { text: "Free", color: "#D1A3D1" },      // Purple
    { text: "How", color: "#8E9E71" },       // Olive Green
    { text: "Parler", color: "#B3E0F2" },    // Light Blue
    { text: "Dangerous", color: "#D1A3D1" },  // Purple
    // Duplicates to fill the pile as in the image
    { text: "Apprendre", color: "#B3E0F2" }, 
    { text: "Famous", color: "#FFE270" },   
    { text: "Appreciate", color: "#8E9E71" }, 
    { text: "Down", color: "#FFE270" },     
    { text: "How", color: "#8E9E71" },       
    { text: "Dangerous", color: "#D1A3D1" }
];

export default function FallingWords() {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        
        let initRaf: number;
        let cleanup: (() => void) | null = null;
        
        const initSimulation = () => {
            const container = containerRef.current;
            if (!container) return;
            
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            // Wait until layout actually gives us dimensions before setting up physics
            if (width === 0 || height === 0) {
                initRaf = requestAnimationFrame(initSimulation);
                return;
            }

            const { Engine, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

        const engine = Engine.create();
        engineRef.current = engine;

        // Boundaries
        const floor = Bodies.rectangle(width / 2, height + 50, width * 2, 100, { isStatic: true });
        const leftWall = Bodies.rectangle(-50, height / 2, 100, height * 2, { isStatic: true });
        const rightWall = Bodies.rectangle(width + 50, height / 2, 100, height * 2, { isStatic: true });
        // Optional ceiling so they don't get thrown out
        const ceiling = Bodies.rectangle(width / 2, -500, width * 2, 100, { isStatic: true });

        Composite.add(engine.world, [floor, leftWall, rightWall, ceiling]);

        // Add mouse control
        const mouse = Mouse.create(container);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });
        Composite.add(engine.world, mouseConstraint);

        // Allow scroll through the canvas instead of swallowing it
        const safeUntether = () => {
            if (mouseConstraint.mouse && mouseConstraint.mouse.element) {
                const element = mouseConstraint.mouse.element;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mouseAny = mouseConstraint.mouse as any;
                element.removeEventListener("mousewheel", mouseAny.mousewheel);
                element.removeEventListener("DOMMouseScroll", mouseAny.mousewheel);
                // Keep touchstart/move/end intact for mobile grab support,
                // but use `touch-none` in CSS to prevent page scroll while dragging
            }
        };
        safeUntether();

        const bodiesAndElems: { body: Matter.Body; elem: HTMLDivElement }[] = [];

        WORD_CONFIGS.forEach((config, index) => {
            const elem = document.createElement("div");
            elem.innerText = config.text;
            // add classes (match design: bold black sans-serif text, pill shape, solid colors)
            elem.className = "absolute flex items-center justify-center text-black font-sans font-bold px-6 py-3 md:px-8 md:py-4 select-none will-change-transform whitespace-nowrap cursor-grab active:cursor-grabbing text-lg md:text-2xl";
            elem.style.borderRadius = "9999px"; // Pill shape
            elem.style.backgroundColor = config.color;

            elem.style.left = "0px";
            elem.style.top = "0px";
            
            container.appendChild(elem);

            // Force reflow to get dimensions synchronously
            let w = elem.offsetWidth;
            let h = elem.offsetHeight;

            // Fallback dimensions just in case
            if (w === 0) w = 120;
            if (h === 0) h = 50;

            // Create physical body
            // Random position slightly spread out
            const x = width / 2 + (Math.random() - 0.5) * (width * 0.4);
            const y = -100 - (index * 100); 
            
            // Physics body with chamfer for roundest possible shape (h / 2)
            const body = Bodies.rectangle(x, y, w, h, {
                restitution: 0.6, // Bouncing
                friction: 0.2, // slightly more friction to help them pile stably 
                frictionAir: 0.005,
                density: 0.05,
                chamfer: { radius: h / 2 }, // Perfect pill chamfer
                angle: (Math.random() - 0.5) * 1.5, // Initial rotation
            });

            Composite.add(engine.world, body);
            bodiesAndElems.push({ body, elem });
        });

        // Loop for updating DOM elements
        let rafId: number;
        const update = () => {
            bodiesAndElems.forEach(({ body, elem }) => {
                const { x, y } = body.position;
                elem.style.transform = `translate(${x - elem.offsetWidth / 2}px, ${y - elem.offsetHeight / 2}px) rotate(${body.angle}rad)`;
            });
            rafId = requestAnimationFrame(update);
        };

        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);
        
        update();

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;
            if (newWidth === 0 || newHeight === 0) return;
            Matter.Body.setPosition(floor, { x: newWidth / 2, y: newHeight + 50 });
            Matter.Body.setPosition(rightWall, { x: newWidth + 50, y: newHeight / 2 });
        };
        window.addEventListener('resize', handleResize);

        cleanup = () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(rafId);
            Runner.stop(runner);
            Engine.clear(engine);
            if (container) {
                container.innerHTML = '';
            }
        };

        }; // End of initSimulation

        // start initialization loop
        initSimulation();

        return () => {
            cancelAnimationFrame(initRaf);
            if (cleanup) cleanup();
        };
    }, []);

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 z-0 overflow-hidden pointer-events-auto touch-none"
        />
    );
}
