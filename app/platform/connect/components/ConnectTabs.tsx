"use client";

export type ConnectTab = 'all' | 'people' | 'songs' | 'rooms' | 'business';

/**
 * What a tab's pill says. A tier name means the tier opens it; `soon` means
 * the view is not ready and the tab takes no press.
 */
export type TabLocks = Partial<Record<ConnectTab, 'pro' | 'max' | 'soon'>>;

interface ConnectTabsProps {
    active: ConnectTab;
    onChange: (tab: ConnectTab) => void;
    /**
     * A tab listed here carries a pill. A tier's pill is the caller's to
     * explain; `soon` makes the tab inert and says so on it.
     */
    locks: TabLocks;
    t: (key: string) => string;
}

const TABS: ConnectTab[] = ['all', 'people', 'songs', 'rooms', 'business'];

/**
 * The five views of Connect. Underline on the active one, nothing else — the
 * headline weight comes from the type, not from chrome. A tab that is still
 * being built says "Coming soon" beside its name and cannot be selected.
 */
export default function ConnectTabs({ active, onChange, locks, t }: ConnectTabsProps) {
    return (
        <nav
            role="tablist"
            aria-label={t('connect.tabs_label')}
            className="flex items-end gap-6 sm:gap-8 mb-7 overflow-x-auto no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4"
        >
            {TABS.map((tab) => {
                const isActive = tab === active;
                const lock = locks[tab];
                const soon = lock === 'soon';
                return (
                    <button
                        key={tab}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        aria-disabled={soon || undefined}
                        disabled={soon}
                        onClick={soon ? undefined : () => onChange(tab)}
                        className={`relative shrink-0 flex items-center gap-2 pb-2 text-[24px] sm:text-[27px] font-lyrics leading-none transition-colors ${
                            soon
                                ? 'text-stone-400 cursor-default'
                                : isActive ? 'text-stone-900 cursor-pointer' : 'text-stone-400 hover:text-stone-700 cursor-pointer'
                        }`}
                    >
                        {t(`connect.tab_${tab}`)}
                        {soon ? (
                            // The platform's quiet pill, not the tier gradient: this
                            // is a note about readiness, not a plan.
                            <span className="inline-flex items-center rounded-full bg-[#F6F6F0] border border-stone-200/70 px-2.5 py-1 text-[11px] font-semibold text-stone-500 leading-none">
                                {t('common.coming_soon')}
                            </span>
                        ) : lock && (
                            /* Same pill the tier banner wears, at tab scale — so the tab
                               and the banner it leads to read as one thing. */
                            <span className="inline-flex items-center rounded-full bg-gradient-to-br from-[#DFDED6] via-[#D2D1C5] to-[#C2C1B2] border border-white/70 px-2.5 py-1 text-[11px] font-semibold text-stone-900 shadow-sm leading-none">
                                {t(lock === 'max' ? 'connect.pro.max_badge' : 'connect.pro.pro_badge')}
                            </span>
                        )}
                        {/* Underline sits on the text, not the pill */}
                        <span
                            aria-hidden="true"
                            className={`absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-stone-900 transition-opacity duration-200 ${
                                isActive ? 'opacity-100' : 'opacity-0'
                            }`}
                        />
                    </button>
                );
            })}
        </nav>
    );
}
