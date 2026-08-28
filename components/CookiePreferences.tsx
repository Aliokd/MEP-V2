"use client";

import { useState, useSyncExternalStore } from 'react';
import { ShieldCheck, BarChart3, Video, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
    getConsentSnapshot,
    getServerConsentSnapshot,
    subscribeConsent,
    writeConsent,
    type ConsentCategory,
    type ConsentState,
} from '@/lib/cookieConsent';

/**
 * The cookie settings panel: one row per category, a switch on each, saved as a
 * whole.
 *
 * Written once and used twice — inside the dialog the consent bar opens, and on
 * the /cookies page the footer links to. They are the same decision reached from
 * two directions, so they are the same control; only the frame around it differs.
 *
 * Nothing here is applied until Save. A switch that took effect the instant it
 * moved would mean someone exploring the panel had already changed their answer
 * three times, and there would be no way to look without agreeing.
 */

const ROWS: { id: ConsentCategory; Icon: LucideIcon; locked?: boolean }[] = [
    { id: 'necessary', Icon: ShieldCheck, locked: true },
    { id: 'analytics', Icon: BarChart3 },
    { id: 'replay', Icon: Video },
];

interface Draft {
    analytics: boolean;
    replay: boolean;
}

export default function CookiePreferences({
    onSaved,
    className = '',
}: {
    /** Called after the answer is stored — the dialog closes itself on it. */
    onSaved?: (state: ConsentState) => void;
    className?: string;
}) {
    const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);

    /*
     * Remounting the form on a change of stored answer, rather than syncing an
     * effect into it, is what makes the switches right on the first paint:
     * useState reads the real answer in its initialiser instead of starting at
     * "not answered" (the only thing the server render can assume) and correcting
     * itself afterwards. It is also how an answer given in another tab lands
     * here — the key changes, and the half-edited draft that is now answering a
     * stale question goes with it.
     */
    const key = consent ? `${consent.analytics}-${consent.replay}` : 'unanswered';

    return <PreferencesForm key={key} initial={consent} onSaved={onSaved} className={className} />;
}

function PreferencesForm({
    initial,
    onSaved,
    className,
}: {
    initial: ConsentState | null;
    onSaved?: (state: ConsentState) => void;
    className: string;
}) {
    const { t } = useLanguage();

    // No answer yet means nothing is allowed yet, so the panel opens with the
    // optional rows off. Consent is given by switching them on, never by
    // failing to switch them off.
    const [draft, setDraft] = useState<Draft>({
        analytics: initial?.analytics ?? false,
        replay: initial?.replay ?? false,
    });
    const [saved, setSaved] = useState(false);

    const set = (patch: Partial<Draft>) => {
        setSaved(false);
        setDraft((current) => {
            const next = { ...current, ...patch };
            // Recording without counting is not on offer (see normalizeConsent),
            // so switching analytics off takes replay with it visibly, here,
            // rather than silently at save time.
            if (!next.analytics) next.replay = false;
            return next;
        });
    };

    const save = (state: Draft) => {
        const stored = writeConsent(state);
        setSaved(true);
        onSaved?.(stored);
    };

    return (
        <div className={`flex flex-col ${className}`}>
            {/* `sheet-panel-body`/`sheet-panel-footer` are what let this panel be
                dropped into the dialog and behave: the rows scroll, the two
                actions stay on screen. On the /cookies page they cost nothing —
                nothing constrains the height there, so there is nothing to
                scroll — beyond giving the buttons a thumb-sized width on a
                phone, which is where they wanted to be anyway. */}
            {/* `flex-1 min-h-0 overflow-y-auto` states the scrolling here rather
                than leaning on `.sheet-panel-body`, whose rules live inside a
                max-width:767px block: above that breakpoint the class does
                nothing, so inside the dialog the rows simply overflowed a panel
                that clips, and the save buttons sat below the cut with no way to
                reach them. The class stays for the phone-specific parts of that
                contract (overscroll containment, the pinned footer). On the
                /cookies page nothing constrains the height, so there is nothing
                to scroll and this is inert. */}
            <div className="sheet-panel-body flex flex-col flex-1 min-h-0 overflow-y-auto">
                {ROWS.map(({ id, Icon, locked }) => {
                    const on = locked || draft[id as keyof Draft];
                    // Replay depends on analytics, and a switch that does nothing
                    // when pressed is worse than one that explains itself.
                    const blocked = id === 'replay' && !draft.analytics;

                    const label = (
                        <span className="flex flex-col gap-1 min-w-0 text-left">
                            <span className="flex items-center gap-2">
                                <Icon className="w-4 h-4 shrink-0 text-stone-400" strokeWidth={1.75} />
                                <span className="text-[15px] font-medium text-stone-800">
                                    {t(`cookies.cat_${id}_title`)}
                                </span>
                            </span>
                            <span className="text-[13px] leading-relaxed text-stone-500">
                                {t(`cookies.cat_${id}_body`)}
                            </span>
                            {blocked && (
                                <span className="text-[12px] text-stone-400">{t('cookies.replay_needs_analytics')}</span>
                            )}
                        </span>
                    );

                    if (locked) {
                        return (
                            <div
                                key={id}
                                className="flex items-start justify-between gap-4 py-5 border-b border-stone-200/70"
                            >
                                {label}
                                <span className="shrink-0 mt-0.5 px-2.5 py-1 rounded-full bg-[#eaf5ec] text-[11px] font-semibold text-[#2f6f40]">
                                    {t('cookies.always_on')}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={id}
                            type="button"
                            role="switch"
                            aria-checked={on}
                            onClick={() => set({ [id]: !draft[id as keyof Draft] } as Partial<Draft>)}
                            // The whole row is the switch, the way the publish
                            // dialog's consent row is the whole sentence: the
                            // target is the thing being agreed to, not a 40px
                            // track sitting at the end of it.
                            className="group/row flex items-start justify-between gap-4 py-5 border-b border-stone-200/70 text-left transition-colors hover:bg-stone-500/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f6b3a] rounded-[4px] cursor-pointer"
                        >
                            {label}
                            <Switch on={on} />
                        </button>
                    );
                })}
            </div>

            <div className="sheet-panel-footer shrink-0 flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-5">
                {/* The region is always mounted and the WORDS are what appear:
                    a live region announces a change to its contents, so text
                    that is merely faded from opacity-0 to 1 is announced to
                    nobody — while still being read out in the page's ordinary
                    reading order, promising a save that hasn't happened. */}
                <p aria-live="polite" className="text-[13px] flex-1 text-[#2f6f40]">
                    {saved ? t('cookies.saved') : ''}
                </p>
                <button
                    type="button"
                    onClick={() => save({ analytics: false, replay: false })}
                    className="px-4 py-2.5 text-[13px] font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-full transition-all active:scale-95"
                >
                    {t('cookies.necessary')}
                </button>
                <button
                    type="button"
                    onClick={() => save(draft)}
                    className="px-5 py-2.5 text-[13px] font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-full transition-all active:scale-95"
                >
                    {t('cookies.save')}
                </button>
            </div>
        </div>
    );
}

/**
 * The platform's switch geometry (Profile's preference rows) with the publish
 * dialog's affirmative green for "allowed" — stone reads as off at a glance and
 * this panel is read at a glance.
 *
 * Presentational only: the row around it carries role="switch" and the press.
 */
function Switch({ on }: { on: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={`shrink-0 mt-0.5 w-10 h-6 rounded-full relative transition-colors ${
                on ? 'bg-[#86BE7F]' : 'bg-stone-200 group-hover/row:bg-stone-300'
            }`}
        >
            <span
                className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                    on ? 'left-5 bg-white' : 'left-1 bg-stone-400'
                }`}
            />
        </span>
    );
}
