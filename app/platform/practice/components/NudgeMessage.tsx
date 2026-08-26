"use client";

import { motion } from 'framer-motion';

interface NudgeMessageProps {
    /** The hook's count. Nothing renders at zero. */
    count: number;
    /** What to do — not what went wrong. */
    children: React.ReactNode;
}

/**
 * The line that says what is missing. No timer: it belongs to the step that
 * earned it and goes when that step is satisfied, so whoever calls this owns
 * clearing the count. Re-keyed on each press so the fade-in replays and
 * role="status" announces again.
 */
export default function NudgeMessage({ count, children }: NudgeMessageProps) {
    if (count === 0) return null;
    return (
        <motion.p
            key={count}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            role="status"
            // #5B8E54 is the onboarding's nudge green: readable at 13px without
            // reading as an error, which red or amber would.
            className="text-center text-[13px] font-normal text-[#5B8E54]"
        >
            {children}
        </motion.p>
    );
}
