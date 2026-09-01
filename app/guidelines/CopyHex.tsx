"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * The hex code, and one click to take it away with you.
 *
 * A media-kit page whose whole job is handing over values should not make
 * anyone select six characters by hand, so the code itself is the button.
 *
 * The confirmation is a swap in place rather than a toast: the answer belongs
 * where the click was, and forty swatches sharing one toast would be a queue of
 * notifications about the same thing.
 */
export default function CopyHex({ hex }: { hex: string }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // A swatch clicked and then scrolled past must not set state after unmount.
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(hex);
        } catch {
            // Older browsers, and any page served without a secure context.
            const field = document.createElement('textarea');
            field.value = hex;
            field.setAttribute('readonly', '');
            field.style.cssText = 'position:fixed;top:-1000px';
            document.body.appendChild(field);
            field.select();
            try { document.execCommand('copy'); } catch { /* nothing left to try */ }
            field.remove();
        }
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1400);
    };

    return (
        <button
            type="button"
            onClick={copy}
            // The label carries the value: a row of buttons all reading "Copy"
            // tells a screen reader nothing about which colour it is on.
            aria-label={`Copy ${hex}`}
            title={`Copy ${hex}`}
            className="group -ml-1 flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-xs text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f6b3a] cursor-pointer"
        >
            {hex}
            {copied
                ? <Check size={12} className="stroke-[2.5] text-[#5F9857]" />
                : <Copy size={12} className="stroke-[2] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
            <span className="sr-only" role="status">{copied ? 'Copied' : ''}</span>
        </button>
    );
}
