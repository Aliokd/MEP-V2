'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * The confirmation between "publish" and the song actually going out.
 *
 * Publishing is the one action here that leaves the writer's own workspace, so it
 * asks for two things first: a legal acknowledgement, and who owns the song. Both
 * are cheap to answer and expensive to get wrong afterwards.
 *
 * The two are asked one at a time. Side by side, the legal line reads as fine print
 * beside the thing with sliders in it and gets ticked without being read — which is
 * the one outcome a legal acknowledgement cannot afford. So step 1 is the sentence and
 * nothing else, and the split only appears once that has actually been answered.
 *
 * Ownership is not one number. A song is two pieces of work that routinely belong to
 * different people — the words, and the music — so the split is kept as
 * two independent sets of shares that the owner sets separately. Total ownership is
 * what those two come to together: it is published, but it is never a screen of its
 * own, because it is a result rather than a third thing to decide.
 *
 * Each part defaults to an even division and is only editable by the owner.
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
    /** Total ownership: the lyrics and sound shares combined. Derived, never set by hand. */
    percent: number;
    lyricsPercent: number;
    soundPercent: number;
}

/** The two halves the owner actually sets. The total over them is derived and is
 *  published, but it isn't a tab: a screen you can't change is a screen people try to
 *  change, and it was the one opening by default.
 *
 *  The second half is labelled "Music" and keyed `sound`. The label was renamed; the
 *  key was not, because it is the shape of what leaves here — `soundPercent` on every
 *  PublishSplit, and whatever has already been written under that name. Renaming it
 *  would be a data migration wearing a copy change's clothes. */
type OwnershipPart = 'lyrics' | 'sound';

const EDITABLE_PARTS = ['lyrics', 'sound'] as const;
const PART_TABS: OwnershipPart[] = ['lyrics', 'sound'];

type PartSplits = { lyrics: Record<string, number>; sound: Record<string, number> };

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

/**
 * Total ownership: the lyrics and music shares, weighted equally.
 *
 * Words and music count for the same amount here — nothing in the song says one is worth
 * more than the other, and any other weighting would be this dialog quietly deciding on the
 * writer's behalf. So someone on 80% of the lyrics and 20% of the sound owns half the song.
 *
 * The average of two whole numbers is often a half, and rounding each row on its own would
 * land the song on 99% or 101%. The leftover points are dealt to the largest fractions first,
 * so the totals column adds up to exactly 100 like the two halves it comes from.
 */
function combineTotals(keys: string[], parts: PartSplits): Record<string, number> {
    const out: Record<string, number> = {};
    if (keys.length === 0) return out;

    const exact = keys.map(k => ((parts.lyrics[k] ?? 0) + (parts.sound[k] ?? 0)) / 2);
    keys.forEach((k, i) => { out[k] = Math.floor(exact[i]); });

    let spare = 100 - keys.reduce((sum, k) => sum + out[k], 0);
    const byFraction = exact
        .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
        .sort((a, b) => b.fraction - a.fraction);

    for (const { i } of byFraction) {
        if (spare <= 0) break;
        out[keys[i]] += 1;
        spare--;
    }
    return out;
}

/** Continue and Publish are the same button in two places — the step it ends, and the
 *  one after it. Green whatever the state of the form: greying it out reads as "broken",
 *  and a premature press is answered by shaking the thing still outstanding. */
const PRIMARY_BUTTON_CLASS =
    'flex-1 h-[54px] rounded-full text-[17px] font-semibold bg-[#86BE7F] text-stone-900 hover:bg-[#78B673] shadow-sm transition-all cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed';

/**
 * One thing to agree to: the sentence and its box, as a single control.
 *
 * The whole row is the target, not the 26px square at the end of it. Reading a line and
 * then having to travel to the far corner of the dialog to say yes to it taxes the one
 * action the step exists for, and on touch that square is well under the 44px anything
 * should be. Now the sentence is the button — the box is what it looks like, not where
 * it is.
 *
 * The box itself is drawn as a plain span: the row around it is already the checkbox,
 * and a button inside a button is both invalid and two owners for one job. Its hover
 * and press states come off the row, so pointing anywhere along the line lights the
 * square the same as pointing at it.
 *
 * The sentence is the accessible name — it is what is being agreed to, and a screen
 * reader announcing "I agree, checkbox" says nothing about what to. `label` stays as
 * the pointer tooltip.
 *
 * Refusal is answered by shaking the whole SECTION this sits in, not the box alone —
 * a 26px square twitching on its own is easy to miss, and the thing left outstanding
 * is the step, not the tickbox.
 */
function ConsentRow({ checked, onToggle, label, children }: {
    checked: boolean;
    onToggle: () => void;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            title={label}
            onClick={onToggle}
            // The padding widens the hit area past the text; the matching negative
            // margin gives that width back to the layout, so the row is bigger to the
            // pointer without moving anything around it.
            //
            // The width is stated rather than left to `auto`, and stated as the column
            // PLUS the two margins it is pushed out by. A bare `w-full` measured the
            // column before the margins moved the box, so the row ended 12px short on
            // the right; `auto` is no better, because a <button> is sized by its content
            // even as a flex container and stops wherever the sentence stops. Only the
            // calc makes the row reach the far edge, which is where the tick and every
            // row above it line up.
            className="group/consent w-[calc(100%+1.5rem)] -mx-3 -my-2 px-3 py-2 rounded-[16px] flex items-center justify-between gap-5 text-left transition-colors cursor-pointer hover:bg-stone-500/[0.05]"
        >
            <span className="text-[15px] leading-relaxed text-stone-500 font-medium max-w-[380px]">
                {children}
            </span>
            <span
                aria-hidden="true"
                // `transition-all` rather than colors and transform separately: the two
                // utilities each set transition-property, so the second silently wins.
                className={`shrink-0 w-[26px] h-[26px] rounded-[8px] border flex items-center justify-center transition-all group-active/consent:scale-95 ${
                    checked
                        ? 'bg-[#86BE7F] border-[#6FA869] text-stone-900 shadow-sm'
                        : 'bg-[#E8E5DE] border-stone-300 text-transparent group-hover/consent:bg-[#DEDAD1] group-hover/consent:border-stone-400'
                }`}
            >
                <Check size={17} className="stroke-[4]" />
            </span>
        </button>
    );
}

export default function PublishDialog({
    open, title, members, canEditSplits, isPublishing, onCancel, onPublish,
}: PublishDialogProps) {
    const { t } = useLanguage();
    /** Which of the two questions is on screen. Only ever advanced by answering the one showing. */
    const [step, setStep] = useState<1 | 2>(1);
    const [legalAccepted, setLegalAccepted] = useState(false);
    const [ownershipAccepted, setOwnershipAccepted] = useState(false);
    /** The two halves are held separately; the total is computed from them on every render. */
    const [splits, setSplits] = useState<PartSplits>({ lyrics: {}, sound: {} });
    /** Which half of the song the rows below are currently showing. */
    const [activePart, setActivePart] = useState<OwnershipPart>('lyrics');
    /** Co-writers named by hand here. They may have no Veinote account at all — a split is a
     *  credit, and the person who wrote the second verse deserves one whether or not they use
     *  the app. Kept local to the dialog and emitted with an empty uid. */
    const [guests, setGuests] = useState<Array<{ id: string; name: string }>>([]);
    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [guestDraft, setGuestDraft] = useState('');
    const [renamingGuestId, setRenamingGuestId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    /** Bumped each time publishing is attempted while something is still missing.
     *  It keys the boxes below, so they remount and their shake animation replays —
     *  a plain class toggle would only ever animate on the first attempt. */
    const [refusedAt, setRefusedAt] = useState(0);

    /** The panel holding whichever step is showing — the thing the view is taken to. */
    const stepRef = useRef<HTMLDivElement>(null);

    const memberKey = members.map(m => m.uid).join(',');

    // A fresh dialog starts from an even split and unchecked boxes every time —
    // consent carried over from a previous publish isn't consent.
    useEffect(() => {
        if (!open) return;
        setStep(1);
        setLegalAccepted(false);
        setOwnershipAccepted(false);
        setSplits({ lyrics: equalSplit(members), sound: equalSplit(members) });
        // Opens on the words, which is the half most songs are argued over.
        setActivePart('lyrics');
        setGuests([]);
        setIsAddingGuest(false);
        setGuestDraft('');
        setRenamingGuestId(null);
        setRenameDraft('');
        setRefusedAt(0);
        // members is covered by memberKey; depending on the array itself would reset
        // the splits on every parent render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, memberKey]);

    /**
     * Take the view to the step that just opened.
     *
     * Step 2 is several times taller than step 1 — tabs, a share row per person, the
     * add-a-co-writer box — so on a short viewport the dialog it grows into overflows,
     * and the browser holds the scroll position step 1 left behind. That parks the
     * ownership heading above the fold: the writer taps Continue and appears to get
     * dropped into the middle of a list of sliders with no idea what they answer.
     *
     * Aligned to the top of the panel rather than centred, so the heading and the hint
     * that explain the sliders are the first things in view. Only on the way forward:
     * going back shrinks the dialog, which the browser resolves on its own.
     */
    useEffect(() => {
        if (!open || step === 1) return;
        stepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [open, step]);

    /** Project members first, then anyone credited by hand, as one list of split rows. */
    const rows = useMemo(
        () => [
            ...members.map(m => ({ key: m.uid, uid: m.uid, name: m.name, label: m.name, isMe: !!m.isMe, isGuest: false })),
            ...guests.map(g => ({ key: g.id, uid: '', name: g.name, label: g.name, isMe: false, isGuest: true })),
        ],
        [members, guests]
    );

    const totals = useMemo(
        () => combineTotals(rows.map(r => r.key), splits),
        [rows, splits]
    );

    /** First name only. A full name runs across the graduations and crowds the share
     *  figure, and these rows are read at a glance — the whole name is still on the
     *  row's tooltip. The same name has to appear on the share and in the total under
     *  it, so it's worked out in one place. */
    const rowLabel = (row: { isMe: boolean; name: string }) =>
        row.isMe ? (t('collab.me') || 'Me') : (row.name.trim().split(/\s+/)[0] || row.name);

    /** The shares the rows are showing: whichever half is open. */
    const shownSplits = splits[activePart];

    // Both halves have to land on 100 for the song to be fully accounted for. distributeFrom
    // keeps them there by construction, so this is a guard rather than a state to design for.
    const totalIsValid = useMemo(
        () => EDITABLE_PARTS.every(
            part => rows.reduce((sum, r) => sum + (splits[part][r.key] ?? 0), 0) === 100
        ),
        [rows, splits]
    );
    const canPublish = legalAccepted && ownershipAccepted && totalIsValid && !isPublishing;

    // A lone songwriter owns the whole song — there is nobody to divide it with, so the bar is
    // shown full and fixed rather than being draggable into a state that can never total 100
    // and, with the error line gone, would silently refuse to publish. Crediting a co-writer by
    // hand ends that: from then on the shares are the writer's to set.
    const isSoloSong = rows.length === 1;
    const canDragRows = canEditSplits && !isSoloSong;

    /** The top row — the owner — is the share everything else is derived from. */
    const anchorKey = rows[0]?.key ?? '';

    /** Re-deals BOTH halves around the owner's current share in each — a name added or dropped
     *  is a name on the whole song, not on whichever tab happened to be open at the time. */
    const redealAround = (keys: string[]) => {
        setSplits(prev => ({
            lyrics: distributeFrom(anchorKey, prev.lyrics[anchorKey] ?? 100, keys),
            sound: distributeFrom(anchorKey, prev.sound[anchorKey] ?? 100, keys),
        }));
    };

    const addGuest = () => {
        const name = guestDraft.trim();
        if (!name) { setIsAddingGuest(false); setGuestDraft(''); return; }
        const id = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        setGuests(prev => [...prev, { id, name: name.slice(0, 40) }]);
        // Re-deal around the owner's current share: still on 100% and the new name starts at
        // 0%, already down at 80% and the 20% is shared out among everyone below.
        redealAround([...rows.map(r => r.key), id]);
        setGuestDraft('');
        setIsAddingGuest(false);
    };

    // Names are typed in a hurry and get typos. Clicking one opens it for editing on the
    // row itself — no separate field, and the share it holds is untouched.
    const startRenameGuest = (id: string, current: string) => {
        setRenamingGuestId(id);
        setRenameDraft(current);
    };

    const commitRenameGuest = () => {
        const id = renamingGuestId;
        if (!id) return;
        const name = renameDraft.trim();
        // An empty box means "I didn't mean to change it", not "remove the credit" —
        // removing is what the × beside the row is for.
        if (name) {
            setGuests(prev => prev.map(g => (g.id === id ? { ...g, name: name.slice(0, 40) } : g)));
        }
        setRenamingGuestId(null);
        setRenameDraft('');
    };

    const removeGuest = (id: string) => {
        if (renamingGuestId === id) { setRenamingGuestId(null); setRenameDraft(''); }
        setGuests(prev => prev.filter(g => g.id !== id));
        // What they held goes back into the pot and is re-dealt to whoever is left.
        redealAround(rows.map(r => r.key).filter(k => k !== id));
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
     *  deals the remainder out to the others (see distributeFrom), within the open half only:
     *  moving the lyrics never silently moves the sound. */
    const setPercent = (rowKey: string, value: number) => {
        if (!canDragRows) return;
        const part = activePart;
        setSplits(prev => ({
            ...prev,
            [part]: distributeFrom(rowKey, value, rows.map(r => r.key)),
        }));
    };

    /** A refusal belongs to the step that earned it. Carrying it across would have the
     *  ownership panel shaking the moment it appears — its box is unticked on arrival,
     *  which is the normal state of a step nobody has answered yet, not a refusal. */
    const goToStep = (next: 1 | 2) => {
        setRefusedAt(0);
        setStep(next);
    };

    /** Same bargain as Publish below: the button always clicks, and refuses by shaking
     *  the sentence that hasn't been answered rather than going quiet. */
    const attemptContinue = () => {
        if (!legalAccepted) {
            setRefusedAt(Date.now());
            return;
        }
        goToStep(2);
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
        onPublish(rows.map(r => ({
            uid: r.uid,
            name: r.name,
            percent: totals[r.key] ?? 0,
            lyricsPercent: splits.lyrics[r.key] ?? 0,
            soundPercent: splits.sound[r.key] ?? 0,
        })));
    };

    const partLabel = (part: OwnershipPart) =>
        part === 'lyrics' ? (t('publish.part_lyrics') || 'Lyrics')
        : (t('publish.part_sound') || 'Music');

    /**
     * What the tickbox is actually confirming, which is not the same sentence in every song.
     *
     * Alone, there is nobody to have agreed with and nothing was divided — the honest
     * statement is simply that the whole of both halves is the writer's. Asking a solo
     * writer to confirm that everyone agreed is asking them to answer for a room that
     * isn't there. And someone who can't move the shares isn't vouching for the others
     * either; they are saying the split they were handed is one they accept.
     */
    const ownershipBody =
        isSoloSong
            ? (t('publish.ownership_body_solo') || 'This song is mine alone — all the words and all the music.')
        : !canEditSplits
            ? (t('publish.ownership_body_readonly') || 'I agree with how this song has been split.')
        : (t('publish.ownership_body') || 'Everyone credited on this song has agreed to how it’s split.');

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
                    <div className="flex flex-col gap-3">
                        {/* ── Where we are ────────────────────────────────────
                            Small and grey, directly above the heading and flush with its
                            left edge: the line before the title, saying how far in you
                            are and how much is left. Dots showed the first without ever
                            saying the second — two of them could as easily have been a
                            carousel — and this is a form, where knowing there is exactly
                            one more question is the thing worth telling. */}
                        <span
                            aria-live="polite"
                            className="text-[12.5px] font-medium text-stone-400 tracking-tight"
                        >
                            {step === 1
                                ? (t('publish.step_one') || 'Step 1/2')
                                : (t('publish.step_two') || 'Step 2/2')}
                        </span>

                        {/* Each step names itself. Carrying one dialog title over both left
                            the split under a heading about protection, with its own name in
                            smaller type underneath saying the same thing twice.

                            `text-balance` for the narrow breakpoints where the longer title
                            still wraps: an even break beats one orphaned word. */}
                        <h2 className="text-balance text-[34px] md:text-[40px] leading-[1.05] font-bold text-stone-800 tracking-[-0.02em]">
                            {step === 1
                                ? (t('publish.title') || 'Protecting your song')
                                : (t('publish.ownership') || 'Song ownership')}
                        </h2>
                    </div>

                    {/* Only one step is ever mounted. `scroll-mt-4` keeps the panel off the
                        very edge of the scroll box when the view is taken to it. */}
                    <div
                        key={`step-${step}`}
                        ref={stepRef}
                        className="scroll-mt-4 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                    {step === 1 ? (
                    /* ── Step 1: legal consent ───────────────────────────────
                        Keyed on the refusal so the whole block remounts and replays its
                        shake — a class toggle would only ever animate the first time. */
                    <div
                        key={`legal-${refusedAt}`}
                        className={refusedAt > 0 && !legalAccepted ? 'publish-consent-shake' : ''}
                    >
                        <ConsentRow
                            checked={legalAccepted}
                            onToggle={() => setLegalAccepted(v => !v)}
                            label={t('publish.legal_accept') || 'I agree'}
                        >
                            {t('publish.legal_body')
                                || 'Everything in this song — the words, the recordings, anything I’ve added — is my own work, or something I have the right to publish.'}
                        </ConsentRow>
                    </div>
                    ) : (
                    /* ── Step 2: ownership ───────────────────────────────────
                        The refusal shake is aimed at whatever is actually outstanding, and
                        on this step that is almost always one unticked box — so the box's
                        row is what moves, not the whole panel. Shaking tabs, shares and a
                        summary that are all perfectly filled in says "something here is
                        wrong" and leaves the reader to find it.

                        The panel itself only shakes for a split that doesn't add up, where
                        the shares genuinely are the problem. It keeps the key: remounting
                        the subtree is what lets whichever animation applies replay on every
                        refusal instead of only the first. */
                    <div
                        key={`ownership-${refusedAt}`}
                        className={`flex flex-col gap-3 ${
                            refusedAt > 0 && !totalIsValid ? 'publish-consent-shake' : ''
                        }`}
                    >
                        {/* ── Which half is on the rows below ────────────────────
                            A song is two pieces of work that can belong to different people, so
                            the words and the music are set separately. Only those two are
                            here: the total over them is what gets published, but it is arrived
                            at rather than chosen, and as a tab it was a screen that looked
                            draggable and wasn't. */}
                        <div
                            role="tablist"
                            aria-label={t('publish.ownership') || 'Song ownership'}
                            className="flex items-center gap-1 p-1 rounded-[14px] bg-[#EFECE5] border border-stone-300/50"
                        >
                            {PART_TABS.map(part => {
                                const isActive = activePart === part;
                                return (
                                    <button
                                        key={part}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActivePart(part)}
                                        className={`flex-1 h-9 rounded-[10px] text-[14px] font-medium transition-colors cursor-pointer ${
                                            isActive
                                                ? 'bg-[#FAF8F4] text-stone-800 shadow-sm'
                                                : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                    >
                                        {partLabel(part)}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {rows.map(m => {
                                const percent = shownSplits[m.key] ?? 0;
                                // A hand-credited name is the owner's to rename or drop.
                                // A project member is neither.
                                const isEditableGuest = m.isGuest && canEditSplits;
                                const isRenaming = renamingGuestId === m.key;
                                const label = rowLabel(m);
                                return (
                                    // One pill per person, running the full width of the dialog:
                                    // an outer track carrying the graduations, an inset bar
                                    // inside it showing the share, the name at the left and the
                                    // figure at the right. The marker rides the inner bar's
                                    // leading edge and is clamped so it stays on the track at
                                    // both 0% and 100%. The taller it is and the further it
                                    // runs, the less precision a drag demands — which is the
                                    // whole reason the track carries nothing but the share.
                                    //
                                    // The wrapper exists only to hang the removal button off:
                                    // it has no overflow of its own, so the button can sit out
                                    // past the pill's edge, where the pill's own `overflow-hidden`
                                    // would have clipped it.
                                    <div key={m.key} className="group/split relative">
                                    <div className="relative w-full flex items-center h-12 rounded-[14px] bg-[#EFECE5] border border-stone-300/50 overflow-hidden">
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
                                                canDragRows ? 'bg-stone-600' : 'bg-stone-400'
                                            }`}
                                            // Sits INSIDE the bar rather than on its lip: the same
                                            // inner-width maths, pulled back by its own 3px plus a
                                            // 5px margin so it clears the bar's rounded end instead
                                            // of straddling it. The clamp parks it at the left
                                            // inset when the share is 0 and there is no bar yet.
                                            style={{ left: `clamp(4px, calc(${percent} * (100% - 8px) / 100 - 4px), calc(100% - 12px))` }}
                                        />

                                        {/* A guest's name is editable where it sits. It has to
                                            rise above the drag surface (z-30 over the range's
                                            z-20) to be clickable at all, so it is kept tight to
                                            the text — the rest of the pill still drags. */}
                                        {isRenaming ? (
                                            <input
                                                autoFocus
                                                value={renameDraft}
                                                maxLength={40}
                                                onChange={(e) => setRenameDraft(e.target.value)}
                                                onFocus={(e) => e.currentTarget.select()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); commitRenameGuest(); }
                                                    if (e.key === 'Escape') { e.preventDefault(); setRenamingGuestId(null); setRenameDraft(''); }
                                                }}
                                                onBlur={commitRenameGuest}
                                                aria-label={t('publish.rename_credit') || 'Edit name'}
                                                className="relative z-30 ml-4 mr-2 flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] font-medium text-stone-800 caret-stone-700"
                                            />
                                        ) : isEditableGuest ? (
                                            <button
                                                type="button"
                                                onClick={() => startRenameGuest(m.key, m.name)}
                                                title={`${m.name} — ${t('publish.rename_credit') || 'Edit name'}`}
                                                className="relative z-30 pl-4 pr-2 min-w-0 text-[15px] font-medium text-stone-700 truncate cursor-text hover:text-stone-900 hover:underline decoration-stone-400 underline-offset-4 transition-colors"
                                            >
                                                {label}
                                            </button>
                                        ) : (
                                            <span
                                                className="relative z-10 pl-4 pr-2 min-w-0 text-[15px] font-medium text-stone-700 truncate pointer-events-none"
                                                title={m.name}
                                            >
                                                {label}
                                            </span>
                                        )}
                                        {/* The same inset on every row, removable or not. Reserving
                                            room inside the pill for the × put the figures on two
                                            different margins, and a column of percentages that
                                            doesn't line up is worse than a button with nowhere to
                                            live — which is why the × moved out of the pill. */}
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
                                            disabled={!canDragRows}
                                            onChange={(e) => setPercent(m.key, Number(e.target.value))}
                                            aria-label={`${label} — ${partLabel(activePart)}`}
                                            className="publish-split-range absolute inset-0 z-20 w-full h-full m-0 cursor-grab active:cursor-grabbing disabled:cursor-default"
                                        />

                                    </div>

                                    {/* Removal lives in the dialog's own side margin, just past the
                                        pill, and only while the row is under the pointer. Outside,
                                        it costs the track no width and takes no space from the
                                        figure, so every row keeps the same edges whether or not it
                                        can be removed.

                                        24px set 4px clear of the pill fits the 28px of padding the
                                        dialog has at its narrowest, so the button lands in the
                                        margin rather than against the dialog's rounded edge, which
                                        would clip it. */}
                                    {isEditableGuest && (
                                        <button
                                            type="button"
                                            onClick={() => removeGuest(m.key)}
                                            aria-label={`${t('publish.remove_credit') || 'Remove'} ${m.name}`}
                                            title={t('publish.remove_credit') || 'Remove'}
                                            className="absolute top-1/2 left-full ml-1 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 opacity-0 group-hover/split:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <X size={13} strokeWidth={2.5} />
                                        </button>
                                    )}
                                    </div>
                                );
                            })}

                            {/* Credit someone who isn't in the project — a co-writer with no
                                Veinote account still wrote what they wrote. On show from the
                                start: it used to fade in on hover, which hid the one control
                                that answers "where do I put the person who wrote this with me"
                                from anyone who didn't happen to sweep the pointer over the
                                shares — and from touch, where there is no hover to sweep. */}
                            {canEditSplits && (
                                <div>
                                    {isAddingGuest ? (
                                        <div className="flex items-center h-12 rounded-[14px] border border-dashed border-stone-300 bg-[#F5F2EC] px-4 gap-2">
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
                                            className="w-full h-12 rounded-[14px] border border-dashed border-stone-300 hover:border-stone-400 bg-transparent hover:bg-[#F1EEE8] text-stone-500 hover:text-stone-700 text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Plus size={15} className="stroke-[2.4]" />
                                            {t('publish.add_credit') || 'Add a co-writer'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── What the two halves come to ────────────────────────
                            The number that actually gets published is neither of the two
                            being dragged — it is the average of them — so with Total gone
                            from the tabs there was nowhere the writer could see what they
                            had just agreed to own.

                            Figures only, and deliberately not a set of tracks: a bar here
                            would look like a third thing to drag, and this one cannot be
                            moved. It answers "so what do I end up with", nothing more.

                            Not shown at all on a song with one name on it: both halves are
                            100% and so is the average, so the summary is the row above it
                            said a second time. It earns its place the moment there is a
                            second name to divide with — including a co-writer credited by
                            hand, since `rows` is what this counts. */}
                        {!isSoloSong && (
                        <div className="mt-1 pt-4 border-t border-stone-300/50 flex flex-col gap-2.5">
                            {/* Where the figures come from, on the word rather than on the page:
                                it reads as a caveat when it's always on show, and it is only
                                ever asked once.

                                Drawn rather than left to `title`, which took a second of holding
                                still to appear and could be missed entirely — for a hint nobody
                                knows is there, a delay is the same as nothing. This one shows on
                                contact, and on keyboard focus, since the heading is reachable by
                                tab for exactly that.

                                The wrapper is `self-start` so it is only as wide as the word:
                                stretched across the column, the tooltip would answer a pointer
                                resting anywhere on the row. */}
                            <div className="relative self-start group">
                                <h4
                                    tabIndex={0}
                                    aria-describedby="publish-summary-hint"
                                    className="text-[15px] font-semibold text-stone-600 tracking-tight cursor-help outline-none"
                                >
                                    {t('publish.summary') || 'Summary'}
                                </h4>
                                <div
                                    id="publish-summary-hint"
                                    role="tooltip"
                                    className="pointer-events-none absolute z-40 left-0 bottom-full mb-2 w-max max-w-[280px] px-3 py-2 rounded-[10px] bg-stone-800 text-[12.5px] font-medium leading-snug text-stone-100 shadow-[0_8px_24px_rgba(0,0,0,0.18)] opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
                                >
                                    {t('publish.split_hint_total') || 'The words and the music, counted equally'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {rows.map(m => (
                                    <div key={m.key} className="flex items-baseline justify-between gap-4">
                                        <span className="text-[14.5px] font-medium text-stone-500 truncate" title={m.name}>
                                            {rowLabel(m)}
                                        </span>
                                        <span className="text-[14.5px] font-semibold text-stone-700 tabular-nums shrink-0">
                                            {totals[m.key] ?? 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}

                        {/* ── The agreement ──────────────────────────────────────
                            Last thing in the step, directly above Publish: it is the only
                            box left to tick, and asking for it here means it is answered
                            after the split has been set and read rather than before it
                            exists.

                            Ruled off from the summary above it because they are different
                            kinds of thing — one is what the song comes to, the other is what
                            the writer is putting their name to — and the tick was reading as
                            though it belonged to the list of figures. */}
                        <div className="mt-1 pt-4 border-t border-stone-300/50">
                            {/* The shake sits on this wrapper rather than on the rule above
                                it: a hairline sliding back and forth reads as the layout
                                breaking, and the rule isn't what's outstanding. */}
                            <div className={refusedAt > 0 && !ownershipAccepted ? 'publish-consent-shake' : ''}>
                                <ConsentRow
                                    checked={ownershipAccepted}
                                    onToggle={() => setOwnershipAccepted(v => !v)}
                                    label={t('publish.ownership_accept') || 'I agree with this split'}
                                >
                                    {ownershipBody}
                                </ConsentRow>
                            </div>
                        </div>

                        {/* No red line when the split doesn't add up. Pressing Publish shakes
                            the shares themselves, which says the same thing without scolding
                            someone mid-way through dragging a slider. */}
                    </div>
                    )}
                    </div>

                    {/* ── Actions ─────────────────────────────────────────────
                        "Go back" walks back through the steps before it leaves: from the
                        split it returns to the legal line, and only from there does it
                        close the dialog. Leaving from step 2 is what Escape and the
                        backdrop are for. */}
                    <div className="flex items-center gap-4 pt-1">
                        <button
                            type="button"
                            onClick={() => { if (step === 2) goToStep(1); else onCancel(); }}
                            disabled={isPublishing}
                            className="h-[54px] px-4 rounded-full text-[16px] font-medium text-stone-500 hover:text-stone-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {t('publish.go_back') || 'Go back'}
                        </button>
                        {step === 1 ? (
                            <button
                                type="button"
                                onClick={attemptContinue}
                                aria-disabled={!legalAccepted}
                                title={!legalAccepted ? (t('publish.needs_legal') || 'Confirm the legal step first') : undefined}
                                className={PRIMARY_BUTTON_CLASS}
                            >
                                {t('publish.continue') || 'Continue'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={attemptPublish}
                                disabled={!!isPublishing}
                                aria-disabled={!canPublish}
                                title={
                                    !ownershipAccepted ? (t('publish.needs_ownership') || 'Confirm the ownership split first')
                                    : !totalIsValid ? (t('publish.needs_total') || 'Splits must add up to 100%')
                                    : undefined
                                }
                                className={PRIMARY_BUTTON_CLASS}
                            >
                                {isPublishing
                                    ? (t('publish.publishing') || 'Publishing…')
                                    : (t('publish.confirm') || 'Publish now')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
