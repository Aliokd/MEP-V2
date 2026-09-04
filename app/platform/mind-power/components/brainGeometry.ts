/**
 * The paper brain: the asset, and the six hover regions drawn over it.
 *
 * The brain is a rendered image (public/assets/mind-power/brain.webp — a
 * low-poly paper model, recoloured to the product green from the original grey
 * render), not something drawn in code. What IS drawn is the set of invisible
 * hotspot polygons that sit over it: one per region, traced against the render
 * in its own 2000×1500 frame, so hovering the frontal lobe means hovering the
 * frontal lobe of the picture.
 *
 * The polygons follow the lobes as far as a side view allows. Deep structures
 * (the hippocampus, the corpus callosum) cannot be seen on a surface, so they
 * take the patch of surface nearest to where they live. The callosum sits last
 * in the list so the centre of the brain resolves to it where zones overlap.
 */

/** The render's frame; the hotspot viewBox and both assets share this aspect. */
export const FRAME_W = 2000;
export const FRAME_H = 1500;

export const BRAIN_SRC = '/assets/mind-power/brain.webp';
/** A 480px cut for the streak grid, where twelve of them render at once. */
export const BRAIN_SM_SRC = '/assets/mind-power/brain-sm.webp';

/**
 * The same render in gold — the brain a week earns by reaching the weekly
 * target. Built by scripts/build-brain-assets.mjs from the original grey
 * render, with the silhouette lifted from brain.webp, so the two line up
 * exactly and swapping between them moves nothing.
 */
export const BRAIN_GOLD_SRC = '/assets/mind-power/brain-gold.webp';
export const BRAIN_GOLD_SM_SRC = '/assets/mind-power/brain-gold-sm.webp';

/** Reached the weekly target: a WeekCell ratio is capped at 1, so 1 means done. */
export const hitWeeklyGoal = (ratio: number) => ratio >= 1;

/**
 * Where the brain actually sits inside its frame, as fractions. The render has
 * generous transparent margins; the grid crops to this so the small brains read
 * at a useful size.
 */
export const BRAIN_CONTENT = { left: 0.24, top: 0.15, width: 0.57, height: 0.68 };

/**
 * The top inset, as a percentage of the frame, that leaves the bottom `ratio`
 * of the BRAIN showing — measured against the brain's own extent, not the
 * frame. Clipping against the frame reads wrong because of the margins: a 30%
 * week would green only a sliver of the model.
 */
export function fillClipTop(ratio: number): number {
    const r = Math.min(1, Math.max(0, ratio));
    return (BRAIN_CONTENT.top + BRAIN_CONTENT.height * (1 - r)) * 100;
}

export type RegionKey =
    | 'prefrontal'
    | 'hippocampus'
    | 'reward'
    | 'auditory'
    | 'callosum'
    | 'language';

/** Column and row on the page: left/right of the brain, top/middle/bottom. */
export const REGION_LAYOUT: Record<RegionKey, { side: 'left' | 'right'; row: 0 | 1 | 2 }> = {
    prefrontal: { side: 'left', row: 0 },
    hippocampus: { side: 'left', row: 1 },
    reward: { side: 'left', row: 2 },
    auditory: { side: 'right', row: 0 },
    callosum: { side: 'right', row: 1 },
    language: { side: 'right', row: 2 },
};

export const REGION_ORDER: RegionKey[] = [
    'prefrontal',
    'hippocampus',
    'reward',
    'auditory',
    'callosum',
    'language',
];

/**
 * The colour the whole brain takes while a region is pointed at — with its
 * callout and leader line in the same colour.
 *
 * All six are Veinote's own (see the brand guide, /guidelines): three from the
 * reserved category quartet — which is the Mind Power celebration gradient —
 * two from the confirmed accent palette, and core lime. Kept clear of the
 * progress green (#86BE7F) and the goal gold (#C5A059), so a tinted brain
 * never reads as a level. The two pinks sit mid-left and bottom-right, apart.
 */
export const REGION_COLORS: Record<RegionKey, string> = {
    prefrontal: '#A2B0DF', // periwinkle (accent palette)
    hippocampus: '#F0A8C9', // vibe pink (category quartet)
    reward: '#EDFF8E', // lime (core)
    auditory: '#B79DF0', // melody purple (category quartet)
    callosum: '#8EC9F0', // lyrics blue (category quartet)
    language: '#FBB1FF', // blossom pink (accent palette)
};

/**
 * Where each callout's leader line meets the brain, in frame coordinates: a
 * point on the edge of the region nearest its callout, so the line arrives at
 * the surface rather than crossing the model.
 */
export const REGION_POINTS: Record<RegionKey, [number, number]> = {
    prefrontal: [700, 380],
    hippocampus: [560, 640],
    reward: [820, 900],
    auditory: [1150, 300],
    callosum: [1300, 560],
    language: [1350, 830],
};

/**
 * Where each region's marker dot sits on small screens, in frame coordinates —
 * inside the lobe rather than on its edge, since a dot marks a place where a
 * leader line only arrives at one.
 */
export const REGION_MARKERS: Record<RegionKey, [number, number]> = {
    prefrontal: [700, 480],
    hippocampus: [640, 690],
    reward: [900, 900],
    auditory: [1200, 400],
    callosum: [1080, 600],
    language: [1300, 800],
};

/**
 * Hotspot outlines in frame coordinates (see FRAME_W/H). Drawn in this order,
 * so later polygons win where they overlap — the callosum is last on purpose.
 */
export const REGION_POLYGONS: { region: RegionKey; points: string }[] = [
    // Deliberately overlapping: the first cut left slivers of surface owned by
    // no region, so a pointer resting in a sulcus lit nothing. Draw order
    // decides the overlaps, and the callosum comes last to claim the centre.
    // Frontal lobe: the large left bulge, from the frontal pole up over the crown.
    { region: 'prefrontal', points: '460,640 520,450 690,300 880,220 1010,230 1000,540 930,700 760,780 600,780 500,740' },
    // Lower frontal and the front of the temporal lobe.
    { region: 'hippocampus', points: '500,720 600,760 780,760 940,660 1010,680 1020,880 900,980 750,970 620,920 530,830' },
    // The underside toward the temporal pole.
    { region: 'reward', points: '740,940 900,970 1010,860 1120,880 1170,1010 1100,1080 950,1070 840,1020' },
    // Upper back: parietal crown down to the superior temporal region.
    { region: 'auditory', points: '990,230 1200,250 1420,320 1570,470 1620,660 1450,720 1240,700 1080,600 1020,420' },
    // Posterior temporal and the occipital edge.
    { region: 'language', points: '1230,690 1450,710 1620,690 1630,910 1500,1020 1300,1020 1130,1010 1080,900 990,860 1160,740' },
    // The centre band.
    { region: 'callosum', points: '900,520 1040,410 1220,450 1270,600 1200,740 1010,760 890,680' },
];
