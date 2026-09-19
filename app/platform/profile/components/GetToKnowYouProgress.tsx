"use client";

/**
 * How far along "Get to know you" is: a count and a bar. The more that is
 * answered, the more of the bar is filled, which is the whole of what it says.
 */
export default function GetToKnowYouProgress({
    answered,
    total,
    t,
    className = '',
}: {
    answered: number;
    total: number;
    t: (key: string) => string;
    className?: string;
}) {
    const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
    const label = t('profile.gtky_answered').replace('{n}', String(answered)).replace('{total}', String(total));
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-stone-600 tabular-nums">{label}</span>
                <span className="text-stone-500 tabular-nums">{percent}%</span>
            </div>
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-stone-900/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={t('profile.gtky_title')}
            >
                <div
                    className="h-full rounded-full bg-[#86BE7F] transition-[width] duration-700 ease-out"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
