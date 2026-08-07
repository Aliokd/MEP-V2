'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * The confirmation between "publish" and the song actually going out.
 *
 * Publishing is the one action here that leaves the writer's own workspace, so it
 * asks for two things first: a legal acknowledgement, and who owns the song. Both
 * are cheap to answer and expensive to get wrong afterwards.
 *
 * Splits default to an even division and are only editable by the owner. They are
 * free-form rather than auto-balancing — dragging one person's share shouldn't
 * quietly rewrite everyone else's — so the total is shown as you go and publishing
 * is held until it lands on exactly 100%.
 */

export interface PublishMember {
    uid: string;
    name: string;
    isOwner: boolean;
    /** Shown simply as "Me" — the split rows are narrow and the reader knows who they are. */
    isMe?: boolean;
}

export interface PublishSplit {
    uid: string;
    name: string;
    percent: number;
}

export interface PublishDialogProps {
    open: boolean;
    title: string;
    coverUrl?: string | null;
    members: PublishMember[];
    /** Only the project owner may move the splits; everyone else sees them read-only. */
    canEditSplits: boolean;
    isPublishing?: boolean;
    onCancel: () => void;
    onPublish: (splits: PublishSplit[]) => void;
}

/** An even division that still totals exactly 100 — the leftover points from a
 *  three-way split have to land somewhere rather than leaving the song at 99%. */
function equalSplit(members: PublishMember[]): Record<string, number> {
    const n = members.length;
    if (!n) return {};
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    const out: Record<string, number> = {};
    members.forEach((m, i) => { out[m.uid] = base + (i < remainder ? 1 : 0); });
    return out;
}

/**
 * One share is set by hand; everyone else divides what's left, equally.
 *
 * This is the whole model of the splits: the row you drag is the one you're deciding, and the
 * rest follow from it. The top row — the owner — is the one normally dragged, so leaving it at
 * 100% gives everyone added below 0%, and pulling it to 80% hands 20% out evenly among them.
 *
 * Because the remainder is always dealt out in full, the shares total exactly 100 at every
 * moment. There is no arrangement of the sliders that leaves the song at 97% and no way to
 * reach a state the dialog then has to refuse.
 */
function distributeFrom(anchorKey: string, anchorPercent: number, allKeys: string[]): Record<string, number> {
    const others = allKeys.filter(k => k !== anchorKey);
    const next: Record<string, number> = {};
    if (others.length === 0) return { [anchorKey]: 100 };

    const anchor = Math.max(0, Math.min(100, Math.round(anchorPercent)));
    next[anchorKey] = anchor;

    const remainder = 100 - anchor;
    const base = Math.floor(remainder / others.length);
    // The odd points left over by an uneven division go to the earliest rows, one each,
    // rather than being dropped and leaving the total short.
    let spare = remainder - base * others.length;
    others.forEach(key => {
        next[key] = base + (spare > 0 ? 1 : 0);
        if (spare > 0) spare--;
    });
    return next;
}

/** The one shared checkbox in this dialog: a soft rounded square that fills in
 *  when it's satisfied. Used for both the legal consent and the split agreement.
 *
 *  Refusal is answered by shaking the whole SECTION this sits in, not the box alone —
 *  a 32px square twitching on its own is easy to miss, and the thing left outstanding
 *  is the step, not the tickbox. */
function ConsentBox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            title={label}
            onClick={onToggle}
            className={`shrink-0 w-[26px] h-[26px] rounded-[8px] flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                checked
                    ? 'bg-[#86BE7F] text-stone-900 shadow-sm'
                    : 'bg-[#E8E5DE] text-transparent hover:bg-[#DEDAD1]'
            }`}
        >
            <Check size={17} className="stroke-[4]" />
        </button>
    );
}

export default function PublishDialog({
    open, title, members, canEditSplits, isPublishing, onCancel, onPublish,
}: PublishDialogProps) {
    const { t } = useLanguage();
    const [legalAccepted, setLegalAccepted] = useState(false);
    const [ownershipAccepted, setOwnershipAccepted] = useState(false);
    const [splits, setSplits] = useState<Record<string, number>>({});
    /** Co-writers named by hand here. They may have no Veinote account at all — a split is a
     *  credit, and the person who wrote the second verse deserves one whether or not they use
     *  the app. Kept local to the dialog and emitted with an empty uid. */
    const [guests, setGuests] = useState<Array<{ id: string; name: string }>>([]);
    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [guestDraft, setGuestDraft] = useState('');
    /** Bumped each time publishing is attempted while something is still missing.
     *  It keys the boxes below, so they remount and their shake animation replays —
     *  a plain class toggle would only ever animate on the first attempt. */
    const [refusedAt, setRefusedAt] = useState(0);

    const memberKey = members.map(m => m.uid).join(',');

    // A fresh dialog starts from an even split and unchecked boxes every time —
    // consent carried over from a previous publish isn't consent.
    useEffect(() => {
        if (!open) return;
        setLegalAccepted(false);
        setOwnershipAccepted(false);
        setSplits(equalSplit(members));
        setGuests([]);
        setIsAddingGuest(false);
        setGuestDraft('');
        setRefusedAt(0);
        // members is covered by memberKey; depending on the array itself would reset
        // the splits on every parent render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, memberKey]);

    /** Project members first, then anyone credited by hand, as one list of split rows. */
    const rows = useMemo(
        () => [
            ...members.map(m => ({ key: m.uid, uid: m.uid, name: m.name, label: m.name, isMe: !!m.isMe, isGuest: false })),
            ...guests.map(g => ({ key: g.id, uid: '', name: g.name, label: g.name, isMe: false, isGuest: true })),
        ],
        [members, guests]
    );

    const total = useMemo(
        () => rows.reduce((sum, r) => sum + (splits[r.key] ?? 0), 0),
        [rows, splits]
    );

    const totalIsValid = total === 100;
    const canPublish = legalAccepted && ownershipAccepted && totalIsValid && !isPublishing;

    // A lone songwriter owns the whole song — there is nobody to divide it with, so the bar is
    // shown full and fixed rather than being draggable into a state that can never total 100
    // and, with the error line gone, would silently refuse to publish. Crediting a co-writer by
    // hand ends that: from then on the shares are the writer's to set.
    const isSoloSong = rows.length === 1;
    const splitsAreAdjustable = canEditSplits && !isSoloSong;

    /** The top row — the owner — is the share everything else is derived from. */
    const anchorKey = rows[0]?.key ?? '';

    const addGuest = () => {
        const name = guestDraft.trim();
        if (!name) { setIsAddingGuest(false); setGuestDraft(''); return; }
        const id = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        setGuests(prev => [...prev, { id, name: name.slice(0, 40) }]);
        // Re-deal around the owner's current share: still on 100% and the new name starts at
        // 0%, already down at 80% and the 20% is shared out among everyone below.
        setSplits(prev => distributeFrom(
            anchorKey,
            prev[anchorKey] ?? 100,
            [...rows.map(r => r.key), id]
        ));
        setGuestDraft('');
        setIsAddingGuest(false);
    };

    const removeGuest = (id: string) => {
        setGuests(prev => prev.filter(g => g.id !== id));
        // What they held goes back into the pot and is re-dealt to whoever is left.
        setSplits(prev => distributeFrom(
            anchorKey,
            prev[anchorKey] ?? 100,
            rows.map(r => r.key).filter(k => k !== id)
        ));
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isPublishing) onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, isPublishing, onCancel]);

    if (!open) return null;

    /** `rowKey` is a member's uid or a hand-credited name's local id — splits are keyed by
     *  whichever, since a credited co-writer may have no account to key on. Setting one share
     *  deals the remainder out to the others (see distributeFrom). */
    const setPercent = (rowKey: string, value: number) => {
        if (!splitsAreAdjustable) return;
        setSplits(distributeFrom(rowKey, value, rows.map(r => r.key)));
    };

    /**
     * The button stays clickable when the form isn't satisfied, and answers by
     * shaking whatever is still outstanding. A `disabled` button fires no click at
     * all, so pressing it would tell the writer nothing about why nothing happened.
     */
    const attemptPublish = () => {
        if (isPublishing) return;
        if (!canPublish) {
            setRefusedAt(Date.now());
            return;
        }
        // Hand-credited names carry no uid — there may be no account behind them.
        onPublish(rows.map(r => ({ uid: r.uid, name: r.name, percent: splits[r.key] ?? 0 })));
    };

    return (
        <div
            // Blurred backdrop so the dialog is the only thing in focus.
            className="fixed inset-0 z-[130] bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-scrollbar animate-in fade-in duration-200"
            onClick={() => { if (!isPublishing) onCancel(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('publish.title') || 'Protecting your song'}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[560px] my-auto bg-[#FAF8F4] rounded-[32px] shadow-[0_28px_80px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            >
                {/* ── Header loop ───────────────────────────────────────────────
                    Muted, looping, decorative — `aria-hidden` because it carries no
                    information the copy below doesn't. The poster paints the first
                    frame immediately so the header is never a blank rectangle while
                    the video is still arriving. */}
                <div className="relative h-[230px] shrink-0 bg-[#EFE7DE] overflow-hidden">
                    {/* The clip is already framed on the palms and the moon, so this
                        just centres it — no object-position nudging needed. */}
                    <video
                        src="/Create/publish-loop.mp4"
                        poster="/Create/publish-loop-poster.webp"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    {/* The beige shade that hands the video over to the content: opaque
                        at the bottom so the type below starts on solid ground, clear at
                        the top so the sky is untouched. Doing this as a gradient rather
                        than a hard edge is what stops the header reading as a pasted-in
                        rectangle.
                        It reaches full opacity at 88% and is pulled a pixel past the
                        header's own edge: on a fractional device pixel ratio the two
                        boxes round differently and a hairline of video survives along
                        the seam, which is exactly where the eye is because the title
                        sits on it. */}
                    <div
                        className="absolute inset-x-0 -bottom-px h-[64%] pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, rgba(250,248,244,0) 0%, rgba(250,248,244,0.72) 52%, #FAF8F4 88%, #FAF8F4 100%)' }}
                    />
                </div>

                <div className="px-7 md:px-9 pb-7 md:pb-8 -mt-10 relative flex flex-col gap-6">
                    <h2 className="text-[34px] md:text-[40px] leading-[1.05] font-bold text-stone-800 tracking-[-0.02em]">
                        {t('publish.title') || 'Protecting your song'}
                    </h2>

                    {/* ── Legal consent ───────────────────────────────────────
                        Keyed on the refusal so the whole block remounts and replays its
                        shake — a class toggle would only ever animate the first time. */}
                    <div
                        key={`legal-${refusedAt}`}
                        className={`flex items-start justify-between gap-5 ${
                            refusedAt > 0 && !legalAccepted ? 'publish-consent-shake' : ''
                        }`}
                    >
                        <p className="text-[15px] leading-relaxed text-stone-500 font-medium max-w-[380px]">
                            {t('publish.legal_body')
                                || 'Everything in this song — the words, the recordings, anything I’ve added — is my own work, or something I have the right to publish.'}
                        </p>
                        <ConsentBox
                            checked={legalAccepted}
                            onToggle={() => setLegalAccepted(v => !v)}
                            label={t('publish.legal_accept') || 'I agree'}
                        />
                    </div>

                    <div className="h-px bg-stone-300/50" />

                    {/* ── Ownership ─────────────────────────────────────────── */}
                    <div
                        key={`ownership-${refusedAt}`}
                        className={`flex flex-col gap-3 ${
                            refusedAt > 0 && (!ownershipAccepted || !totalIsValid) ? 'publish-consent-shake' : ''
                        }`}
                    >
                        <div className="flex items-center justify-between gap-5">
                            <div className="min-w-0">
                                <h3 className="text-[19px] font-semibold text-stone-700 tracking-tight">
                                    {t('publish.ownership') || 'Song ownership'}
                                </h3>
                                {splitsAreAdjustable && (
                                    <p className="mt-1 text-[12.5px] font-medium text-stone-400">
                                        {t('publish.split_hint') || 'Split equally by default — drag to change'}
                                    </p>
                                )}
                            </div>
                            <ConsentBox
                                checked={ownershipAccepted}
                                onToggle={() => setOwnershipAccepted(v => !v)}
                                label={t('publish.ownership_accept') || 'I agree with this split'}
                            />
                        </div>

                        {/* `group` so the add-a-name box below fades in when the pointer is
                            anywhere over the shares. */}
                        <div className="group flex flex-col gap-2.5">
                            {rows.map(m => {
                                const percent = splits[m.key] ?? 0;
                                // First name only. A full name runs across the graduations and
                                // crowds the share figure, and these rows are read at a glance —
                                // the whole name is still on the row's tooltip.
                                const label = m.isMe
                                    ? (t('collab.me') || 'Me')
                                    : (m.name.trim().split(/\s+/)[0] || m.name);
                                return (
                                    // One pill per person: an outer track carrying the
                                    // graduations, an inset bar inside it showing the share,
                                    // the name at the left and the figure at the right. The
                                    // marker rides the inner bar's leading edge and is clamped
                                    // so it stays on the track at both 0% and 100%.
                                    <div key={m.key} className="group/split flex items-center gap-1.5">
                                    <div className="relative flex-1 min-w-0 flex items-center h-11 rounded-[14px] bg-[#EFECE5] border border-stone-300/50 overflow-hidden">
                                        {/* The share runs across an inner track inset equally on
                                            both sides, so a full 100% still stops short of the
                                            rounded edge instead of running into it. Width is the
                                            percentage OF that inner width — hence the unitless
                                            `percent * (100% - 8px) / 100` rather than a plain %,
                                            which would measure against the full track and push
                                            the end past the inset. */}
                                        <div
                                            className="absolute top-[4px] bottom-[4px] left-[4px] rounded-[10px] bg-[#E0DBD0]"
                                            style={{ width: `calc(${percent} * (100% - 8px) / 100)` }}
                                        />

                                        {/* Above the bar, so the ruler runs unbroken across both */}
                                        <div className="publish-split-ticks absolute inset-x-3 inset-y-0 pointer-events-none" />

                                        <div
                                            className={`absolute top-[7px] bottom-[7px] w-[3px] rounded-full ${
                                                splitsAreAdjustable ? 'bg-stone-600' : 'bg-stone-400'
                                            }`}
                                            // Sits INSIDE the bar rather than on its lip: the same
                                            // inner-width maths, pulled back by its own 3px plus a
                                            // 5px margin so it clears the bar's rounded end instead
                                            // of straddling it. The clamp parks it at the left
                                            // inset when the share is 0 and there is no bar yet.
                                            style={{ left: `clamp(4px, calc(${percent} * (100% - 8px) / 100 - 4px), calc(100% - 12px))` }}
                                        />

                                        <span
                                            className="relative z-10 pl-4 pr-2 min-w-0 text-[15px] font-medium text-stone-700 truncate pointer-events-none"
                                            title={m.name}
                                        >
                                            {label}
                                        </span>
                                        <span className="relative z-10 ml-auto pl-2 pr-4 text-[15px] font-semibold text-stone-700 tabular-nums pointer-events-none">
                                            {percent}%
                                        </span>

                                        {/* Invisible, and covering the whole pill, so the share
                                            can be grabbed or clicked anywhere across it. */}
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={percent}
                                            disabled={!splitsAreAdjustable}
                                            onChange={(e) => setPercent(m.key, Number(e.target.value))}
                                            aria-label={`${label} share`}
                                            className="publish-split-range absolute inset-0 z-20 w-full h-full m-0 cursor-grab active:cursor-grabbing disabled:cursor-default"
                                        />
                                    </div>

                                    {/* Removal sits OUTSIDE the track, in the margin beside it —
                                        inside, it shared the pill with the share figure and sat on
                                        top of the drag surface. The slot is reserved on every row,
                                        including members who can't be removed, so all the tracks
                                        stay the same width and nothing shifts on hover. */}
                                    <div className="w-7 shrink-0 flex items-center justify-center">
                                        {m.isGuest && canEditSplits && (
                                            <button
                                                type="button"
                                                onClick={() => removeGuest(m.key)}
                                                aria-label={`${t('publish.remove_credit') || 'Remove'} ${m.name}`}
                                                title={t('publish.remove_credit') || 'Remove'}
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 opacity-0 group-hover/split:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                                            >
                                                <X size={13} strokeWidth={2.5} />
                                            </button>
                                        )}
                                    </div>
                                    </div>
                                );
                            })}

                            {/* Credit someone who isn't in the project — a co-writer with no
                                Veinote account still wrote what they wrote. Kept quiet until the
                                pointer is over the shares (or something here has focus, so it is
                                reachable by keyboard), and it holds its space either way so the
                                dialog doesn't jump as it appears. */}
                            {canEditSplits && (
                                <div
                                    // `mr-[34px]` matches the removal slot beside the tracks
                                    // (w-7 plus the row's gap), so this box lines up with them
                                    // instead of running wider than everything above it.
                                    className={`mr-[34px] transition-opacity duration-200 ${
                                        isAddingGuest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                                    }`}
                                >
                                    {isAddingGuest ? (
                                        <div className="flex items-center h-11 rounded-[14px] border border-dashed border-stone-300 bg-[#F5F2EC] px-4 gap-2">
                                            <input
                                                autoFocus
                                                value={guestDraft}
                                                maxLength={40}
                                                onChange={(e) => setGuestDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); addGuest(); }
                                                    if (e.key === 'Escape') { e.preventDefault(); setIsAddingGuest(false); setGuestDraft(''); }
                                                }}
                                                onBlur={addGuest}
                                                placeholder={t('publish.credit_placeholder') || 'Their name'}
                                                aria-label={t('publish.add_credit') || 'Add a co-writer'}
                                                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] font-medium text-stone-700 placeholder:text-stone-400"
                                            />
                                            <span className="text-[12px] font-medium text-stone-400 shrink-0">
                                                {t('common.save') || 'Save'} ⏎
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingGuest(true)}
                                            className="w-full h-11 rounded-[14px] border border-dashed border-stone-300 hover:border-stone-400 bg-transparent hover:bg-[#F1EEE8] text-stone-400 hover:text-stone-600 text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Plus size={15} className="stroke-[2.4]" />
                                            {t('publish.add_credit') || 'Add a co-writer'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* No red line when the split doesn't add up. Pressing Publish shakes
                            this whole section, which says the same thing without scolding
                            someone mid-way through dragging a slider. */}
                    </div>

                    {/* ── Actions ───────────────────────────────────────────── */}
                    <div className="flex items-center gap-4 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isPublishing}
                            className="h-[54px] px-4 rounded-full text-[16px] font-medium text-stone-500 hover:text-stone-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {t('publish.go_back') || 'Go back'}
                        </button>
                        <button
                            type="button"
                            onClick={attemptPublish}
                            disabled={!!isPublishing}
                            aria-disabled={!canPublish}
                            title={
                                !legalAccepted ? (t('publish.needs_legal') || 'Confirm the legal step first')
                                : !ownershipAccepted ? (t('publish.needs_ownership') || 'Confirm the ownership split first')
                                : !totalIsValid ? (t('publish.needs_total') || 'Splits must add up to 100%')
                                : undefined
                            }
                            // Green whatever the state of the form. Greying it out reads as
                            // "broken", and the shake already answers a premature press by
                            // pointing at the step that is actually outstanding.
                            className="flex-1 h-[54px] rounded-full text-[17px] font-semibold bg-[#86BE7F] text-stone-900 hover:bg-[#78B673] shadow-sm transition-all cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isPublishing
                                ? (t('publish.publishing') || 'Publishing…')
                                : (t('publish.confirm') || 'Publish now')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
