"use client";

export type ConnectTab = 'all' | 'people' | 'songs' | 'rooms' | 'business';

/** Which tier's pill a tab wears. */
export type TabLocks = Partial<Record<ConnectTab, 'pro' | 'max'>>;

interface ConnectTabsProps {
    active: ConnectTab;
    onChange: (tab: ConnectTab) => void;
    /**
     * A tab listed here carries that tier's pill. The caller decides what the
     * pill means: on Rooms it's a lock, shown only until the viewer has Pro;
     * on Business it's a name, shown to everyone, because Business is Max.
     */
    locks: TabLocks;
    t: (key: string) => string;
}

const TABS: ConnectTab[] = ['all', 'people', 'songs', 'rooms', 'business'];

/**
 * The five views of Connect. Underline on the active one, nothing else — the
 * headline weight comes from the type, not from chrome. A locked tab wears the
 * pill of the tier that opens it: Pro on Rooms, Max on Business.
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
                return (
                    <button
                        key={tab}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        onClick={() => onChange(tab)}
                        className={`relative shrink-0 flex items-center gap-2 pb-2 text-[24px] sm:text-[27px] font-lyrics leading-none transition-colors cursor-pointer ${
                            isActive ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'
                        }`}
                    >
                        {t(`connect.tab_${tab}`)}
                        {/* Same pill the tier banner wears, at tab scale — so the tab
                            and the banner it leads to read as one thing. */}
                        {lock && (
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
