"use client";

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { geoArea, geoBounds, geoCentroid, geoDistance, geoInterpolate, geoOrthographic, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import type { GeometryCollection, Topology, Polygon as TopoPolygon, MultiPolygon as TopoMultiPolygon } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry, MultiLineString, MultiPolygon, Position } from 'geojson';
import { Minus, Plus } from 'lucide-react';

/**
 * The songwriter map, drawn by us.
 *
 * A globe, the way a phone's world clock draws one: pale land on light-blue
 * water, no roads. Zoomed out it is a sphere on dark blue that you spin with
 * a drag and flick; zoomed in far enough the curve flattens out and it reads
 * as a plain map of the region, and borders, country names and then city
 * names come in as there is room for them. One projection does both — an
 * orthographic globe seen close up *is* a flat map — so there is no seam.
 *
 * It replaced a Google map. That needed a billed key, shipped Google's logo
 * and attribution on every surface (which the banner then hid, against the
 * terms of the key), and drew a road atlas that had to be styled down until
 * only the geography was left. Land and borders from Natural Earth, public
 * domain, and a projection give the geography directly.
 *
 * Two grades of geography, both Natural Earth country files under /geo, read
 * the same way: land is the union of the countries, borders are the lines
 * where two of them meet, and each country's name and centre come along.
 *
 *   coarse  countries-110m (108 KB). Enough for the banner, for the globe at
 *           any size, and for anything in motion.
 *   fine    countries-50m (756 KB). Fetched only when the full view opens.
 *           Bali is on this one and not the coarse one, and the person who
 *           put themselves there should not sit in the sea.
 *
 * How it stays smooth: nothing draws from a React render. Pointer moves write
 * the view into a ref and ask for one frame; the frame draws the canvas and
 * then, once, mirrors the view into state for the HTML pins. And the fine set
 * is expensive — forty-two thousand points to project, whatever is on screen,
 * about thirty milliseconds a frame — so it is drawn only at rest, and in
 * motion only when zoomed in far enough that most of it can be culled by its
 * bounds first. Everything else in motion is the coarse set, at three or four
 * milliseconds. The frame that ends a motion redraws fine; the eye reads that
 * as the map sharpening as it settles, and never sees a frame that ran long.
 */

export interface PinSpec {
    key: string;
    lat: number;
    lng: number;
    name: string;
    photoURL: string | null;
    highlight: boolean;
    onClick?: () => void;
}

/** A named place to label when zoomed in. The list's order is its rank: first means most important. */
export interface CityLabel {
    label: string;
    lat: number;
    lng: number;
}

export interface GlobeMapProps {
    pins: PinSpec[];
    centre: { lat: number; lng: number };
    /** A zoom level as Google Maps counts them, or 'globe' to fit the whole sphere in view. */
    zoom: number | 'globe';
    interactive: boolean;
    flyTo?: { lat: number; lng: number; zoom: number } | null;
    /** Cities to name once zoomed in, most important first. */
    cities?: CityLabel[] | null;
    /**
     * Draws a pin's card. Given, every pin on the visible side of the globe
     * carries its card, placed above it (below when there is no room) and
     * kept inside the box. Two cards never overlap: where they would, the
     * later pin's waits, and appears once the globe is turned to give it room.
     * A pin that turns past the horizon takes its card with it.
     */
    renderPinCard?: (spec: PinSpec) => React.ReactNode;
    /**
     * Which of the two palettes to draw in. Defaults to following `interactive`,
     * which is what Connect wants: the opened map is the page, so it gets the
     * blue; the minimised panel sits on beige and is drawn in beige.
     *
     * They come apart on the Golden page, which shows a globe that can be
     * turned but sits in a beige page as one section among several, where blue
     * water would cut a hole in it.
     */
    palette?: 'interactive' | 'still';
    /**
     * How wide a pin's card is laid out as. The map places cards and resolves
     * overlaps against this number rather than measuring, so a card narrower
     * than it claims still reserves the full width and its neighbours are held
     * back: a row of name pills at the default 288 leaves one name on the globe.
     */
    cardWidth?: number;
    className?: string;
}

/**
 * Two palettes. Opened, the map is the page: blue water, pale land, dark sky.
 * Minimised, it is a panel on the platform's beige page, so it is drawn in
 * that page's own tones — water a step below the surface, land a step above —
 * and sits in the layout instead of cutting a blue hole in it.
 */
const PALETTE = {
    interactive: { space: '#1E3C74', water: '#D4E4F4', land: '#EEF1F6', rim: 'rgba(15,35,75,0.28)' },
    // A warm rim, not the navy one: on beige a blue shadow is the thing that
    // keeps the globe looking like it was cut from another page.
    still: { space: '#E1E0D9', water: '#E1E0D9', land: '#F6F6F0', rim: 'rgba(122,112,88,0.26)' },
} as const;
const BORDER = 'rgba(88,104,130,0.42)';
const COUNTRY_TEXT = '#6B7684';
const CITY_TEXT = '#2F3640';
const CITY_DOT = '#5B6470';

/** Room between the fitted globe and the edge of its box. */
const GLOBE_PADDING = 12;
const MAX_ZOOM = 10;
const FLY_MS = 1100;
/** From here, at rest, the fine coastline and the borders are drawn. */
const FINE_ZOOM = 3.2;
/** From here the fine set is drawn even in motion: the window is small enough that culling leaves little to project. */
const MOVING_FINE_ZOOM = 6.5;
/** Country names show between FINE_ZOOM and here; past it the cities take over the room. */
const COUNTRY_NAME_MAX_ZOOM = 6.8;
const CITY_NAME_ZOOM = 5;
/** A country smaller than this on screen keeps its name to itself until zoomed closer. */
const MIN_COUNTRY_PX2 = 2200;
/** Radians from the view centre past which a point is on the far side, or too near the rim to sit well. */
const HORIZON = (85 * Math.PI) / 180;
/**
 * Names live on the surface, and near the rim the surface turns away from
 * you: on a real globe a name there is foreshortened to a sliver. Flat text
 * cannot do that, so instead it fades from LABEL_FADE_FROM and is gone by
 * LABEL_HORIZON — well inside the pins' horizon, because a name has width
 * and a pin does not, and a name hanging half over the edge into space is
 * what makes a globe stop looking like one.
 */
const LABEL_HORIZON = (62 * Math.PI) / 180;
const LABEL_FADE_FROM = (44 * Math.PI) / 180;
/** Per 16 ms, what a flick keeps of its speed. 0.94 runs out in a second or so. */
const INERTIA_FRICTION = 0.94;

/**
 * Google counts zoom so that the world is 256·2^z pixels wide. Keeping that
 * scale means the zoom numbers the rest of the map already uses (5 for a
 * region, 7 for a city) mean the same thing here as they did there.
 */
function radiusForZoom(zoom: number): number {
    return (256 * Math.pow(2, zoom)) / (2 * Math.PI);
}
function zoomForRadius(radius: number): number {
    return Math.log2((radius * 2 * Math.PI) / 256);
}
function fitZoom(w: number, h: number): number {
    return zoomForRadius(Math.max(40, Math.min(w, h) / 2 - GLOBE_PADDING));
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface View { lng: number; lat: number; zoom: number }
interface Size { w: number; h: number }

function projectionFor(view: View, size: Size) {
    return geoOrthographic()
        .translate([size.w / 2, size.h / 2])
        .scale(radiusForZoom(view.zoom))
        .rotate([-view.lng, -view.lat, 0])
        .clipAngle(90);
}

interface CountryLabel { name: string; centroid: [number, number]; areaSr: number }
/** Lon/lat bounds as d3 reports them: [[west, south], [east, north]], west > east when it crosses the antimeridian. */
type Bounds = [[number, number], [number, number]];
interface Piece<C> { coords: C; bounds: Bounds }
/** One grade of geography, ready to draw. */
interface Geo {
    land: MultiPolygon;
    borders: MultiLineString;
    /** The same land and borders in pieces, each with its bounds, for drawing only what is in view. */
    landPieces: Piece<Position[][]>[];
    borderPieces: Piece<Position[]>[];
    countries: CountryLabel[];
}

/**
 * The lon/lat window the viewport covers, with a margin — or null when the
 * view is wide enough that it is cheaper to draw the hemisphere than to ask.
 *
 * This is what keeps the fine geography affordable in motion. Projecting a
 * point costs the same whether it lands on screen or a continent away, and
 * the fine set has forty-two thousand of them; zoomed in on one city, all but
 * a few hundred are somewhere else. Comparing each piece's bounds with this
 * window is a handful of comparisons, and the rest never reaches the projection.
 */
interface Window { west: number; east: number; south: number; north: number }
function geoWindow(v: View, size: Size): Window | null {
    const R = radiusForZoom(v.zoom);
    const halfW = ((size.w / 2) / R) * (180 / Math.PI) * 1.3 + 1;
    const halfH = ((size.h / 2) / R) * (180 / Math.PI) * 1.3 + 1;
    if (halfW > 60 || halfH > 60) return null;
    const cosLat = Math.max(0.2, Math.cos((v.lat * Math.PI) / 180));
    const lngHalf = halfW / cosLat;
    if (lngHalf >= 180) return null;
    return { west: v.lng - lngHalf, east: v.lng + lngHalf, south: v.lat - halfH, north: v.lat + halfH };
}

/** Longitude ranges within [-180, 180], split where a span crosses the antimeridian. */
function lngRanges(west: number, east: number): [number, number][] {
    if (east - west >= 360) return [[-180, 180]];
    let w = ((west + 180) % 360 + 360) % 360 - 180;
    let e = w + (east >= west ? east - west : east - west + 360);
    if (e > 180) return [[w, 180], [-180, e - 360]];
    return [[w, e]];
}
function inWindow(b: Bounds, win: Window): boolean {
    const [[w, s], [e, n]] = b;
    if (n < win.south || s > win.north) return false;
    const a = lngRanges(w, e);
    const c = lngRanges(win.west, win.east);
    return a.some(([a0, a1]) => c.some(([c0, c1]) => a0 <= c1 && c0 <= a1));
}

const geoPromises: Partial<Record<'coarse' | 'fine', Promise<Geo>>> = {};
const GEO_URL = { coarse: '/geo/countries-110m.json', fine: '/geo/countries-50m.json' } as const;

/**
 * Where a country's name goes: the centre of its largest piece of land.
 * The centre of the whole thing puts France in the Atlantic, halfway to
 * French Guiana.
 */
function labelPoint(f: Feature<Geometry>): [number, number] {
    const g = f.geometry;
    if (g.type === 'MultiPolygon') {
        let best: [number, number] | null = null;
        let bestArea = -1;
        for (const coords of g.coordinates) {
            const piece = { type: 'Polygon', coordinates: coords } as const;
            const a = geoArea(piece);
            if (a > bestArea) { bestArea = a; best = geoCentroid(piece); }
        }
        if (best) return best;
    }
    return geoCentroid(f);
}

function loadGeo(grade: 'coarse' | 'fine'): Promise<Geo> {
    if (!geoPromises[grade]) {
        geoPromises[grade] = fetch(GEO_URL[grade], { cache: 'force-cache' })
            .then((r) => { if (!r.ok) throw new Error(`countries ${grade}: HTTP ${r.status}`); return r.json() as Promise<Topology>; })
            .then((topo) => {
                const countries = topo.objects.countries as GeometryCollection<{ name?: string }>;
                // Only polygons can be unioned; the file carries no other kind,
                // but its type allows for empty geometries, so say so to merge.
                const polygons = countries.geometries.filter(
                    (g): g is TopoPolygon<{ name?: string }> | TopoMultiPolygon<{ name?: string }> => g.type === 'Polygon' || g.type === 'MultiPolygon',
                );
                const land = merge(topo, polygons);
                const borders = mesh(topo, countries, (a, b) => a !== b);
                const features = feature(topo, countries) as FeatureCollection<Geometry, { name?: string }>;
                const labels: CountryLabel[] = features.features
                    .filter((f) => f.properties?.name)
                    .map((f) => ({ name: f.properties!.name!, centroid: labelPoint(f), areaSr: geoArea(f) }))
                    .sort((a, b) => b.areaSr - a.areaSr);
                const landPieces = land.coordinates.map((coords) => ({
                    coords,
                    bounds: geoBounds({ type: 'Polygon', coordinates: coords }) as Bounds,
                }));
                const borderPieces = borders.coordinates.map((coords) => ({
                    coords,
                    bounds: geoBounds({ type: 'LineString', coordinates: coords }) as Bounds,
                }));
                return { land, borders, landPieces, borderPieces, countries: labels };
            })
            .catch((err) => { delete geoPromises[grade]; throw err; });
    }
    return geoPromises[grade]!;
}

interface Box { x0: number; y0: number; x1: number; y1: number }
const overlaps = (a: Box, b: Box) => !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);

/**
 * Presses that begin on these belong to the control, not to the map: a pin,
 * or a button on a card. Not the card itself — it has nothing to scroll and
 * nothing to drag, and with cards always on and this size, a pointer resting
 * on one is where a pinch or a wheel most often begins. Swallowing those left
 * people unable to zoom back out.
 */
const OWN_CONTROLS = '[data-map-pin],[data-map-card] button,[data-map-card] a,[data-map-card] input';
const CARD_WIDTH = 288;
const CARD_GAP = 12;
/** Room to keep between two cards, and between a card and the box's edge. */
const CARD_MARGIN = 8;

export default function GlobeMap({ pins, centre, zoom, interactive, flyTo, cities, renderPinCard, palette, cardWidth = CARD_WIDTH, className = '' }: GlobeMapProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Everything the frame reads lives in refs, so a frame never sees a stale
    // closure and never has to wait on a render.
    const sizeRef = useRef<Size>({ w: 0, h: 0 });
    const viewRef = useRef<View | null>(null);
    const coarseRef = useRef<Geo | null>(null);
    const fineRef = useRef<Geo | null>(null);
    const citiesRef = useRef<CityLabel[] | null>(cities ?? null);
    const fontRef = useRef('system-ui, sans-serif');
    const movingRef = useRef(false);
    const frameRef = useRef<number | null>(null);
    const animRef = useRef<number | null>(null);
    const inertiaRef = useRef<number | null>(null);

    // State exists for what React must lay out: the pins, and the cursor.
    const [size, setSize] = useState<Size>({ w: 0, h: 0 });
    const [view, setView] = useState<View | null>(null);
    const [dragging, setDragging] = useState(false);
    // Each card's height, measured once it exists, so "is there room above
    // the pin" and "would these two overlap" are asked of the real cards and
    // not a guess. Until a card is measured a typical height stands in; a
    // wrong first answer costs one re-render, the first time it appears.
    const [cardHeights, setCardHeights] = useState<Record<string, number>>({});
    const measureCard = (key: string) => (el: HTMLDivElement | null) => {
        if (!el || !el.offsetHeight) return;
        const h = el.offsetHeight;
        setCardHeights((cur) => (cur[key] === h ? cur : { ...cur, [key]: h }));
    };

    const draw = () => {
        const canvas = canvasRef.current;
        const v = viewRef.current;
        const { w, h } = sizeRef.current;
        if (!canvas || !v || !w || !h) return;
        const dpr = window.devicePixelRatio || 1;
        const pw = Math.round(w * dpr);
        const ph = Math.round(h * dpr);
        if (canvas.width !== pw || canvas.height !== ph) {
            canvas.width = pw;
            canvas.height = ph;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const R = radiusForZoom(v.zoom);
        // Clipped to the box (with a margin) as well as to the hemisphere, so
        // the canvas never rasterises a coastline that is off-screen.
        const projection = projectionFor(v, sizeRef.current).clipExtent([[-40, -40], [w + 40, h + 40]]);
        const path = geoPath(projection, ctx);

        // Which grade, and how much of it: fine at rest once zoomed past the
        // globe, fine in motion only when close in, coarse otherwise — and
        // either one cut down to the pieces inside the visible window when the
        // view is narrow enough for that to be worth asking.
        const wantFine = v.zoom >= (movingRef.current ? MOVING_FINE_ZOOM : FINE_ZOOM);
        const geo = (wantFine && fineRef.current) || coarseRef.current;
        let land: GeoPermissibleObjects | null = null;
        let borders: GeoPermissibleObjects | null = null;
        if (geo) {
            const win = geoWindow(v, sizeRef.current);
            land = win
                ? { type: 'MultiPolygon', coordinates: geo.landPieces.filter((p) => inWindow(p.bounds, win)).map((p) => p.coords) }
                : geo.land;
            // Borders and names belong to the map you can move around in. The
            // banner and the card are a still glimpse under a title, and at
            // their size a border is a hair and a name is grit.
            if (interactive && v.zoom >= FINE_ZOOM) {
                borders = win
                    ? { type: 'MultiLineString', coordinates: geo.borderPieces.filter((p) => inWindow(p.bounds, win)).map((p) => p.coords) }
                    : geo.borders;
            }
        }

        const pal = PALETTE[palette ?? (interactive ? 'interactive' : 'still')];
        ctx.fillStyle = pal.space;
        ctx.fillRect(0, 0, w, h);

        ctx.beginPath();
        path({ type: 'Sphere' });
        ctx.fillStyle = pal.water;
        ctx.fill();

        if (land) {
            ctx.beginPath();
            path(land);
            ctx.fillStyle = pal.land;
            ctx.fill();
        }

        if (borders) {
            ctx.beginPath();
            path(borders);
            ctx.strokeStyle = BORDER;
            ctx.lineWidth = v.zoom >= 6 ? 0.9 : 0.6;
            ctx.stroke();
        }

        // Shade only while the globe is a globe: once it is bigger than the
        // box the rim is off-screen, and a gradient across a flat map would
        // just be a smudge over one corner of it.
        if (R < Math.max(w, h)) {
            const cx = w / 2;
            const cy = h / 2;
            const shade = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.15, cx, cy, R);
            shade.addColorStop(0, 'rgba(255,255,255,0.12)');
            shade.addColorStop(0.55, 'rgba(255,255,255,0)');
            shade.addColorStop(1, pal.rim);
            ctx.beginPath();
            path({ type: 'Sphere' });
            ctx.fillStyle = shade;
            ctx.fill();
        }

        if (interactive) drawNames(ctx, projection, v, R, w, h);
    };

    /**
     * Country names, then city names, each placed only where nothing already
     * sits. Candidates come in rank order — big countries first, big cities
     * first — so when two want the same spot the one that matters more wins.
     */
    const drawNames = (
        ctx: CanvasRenderingContext2D,
        projection: ReturnType<typeof projectionFor>,
        v: View,
        R: number,
        w: number,
        h: number,
    ) => {
        const taken: Box[] = [];
        const claim = (b: Box) => {
            if (taken.some((t) => overlaps(t, b))) return false;
            taken.push(b);
            return true;
        };
        // Where a name may go, and how strongly: null past the label horizon,
        // fading from full to nothing across the band before it.
        const visible = (lng: number, lat: number): { x: number; y: number; alpha: number } | null => {
            const d = geoDistance([lng, lat], [v.lng, v.lat]);
            if (d > LABEL_HORIZON) return null;
            const p = projection([lng, lat]);
            if (!p) return null;
            const [x, y] = p;
            if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return null;
            const alpha = d <= LABEL_FADE_FROM ? 1 : (LABEL_HORIZON - d) / (LABEL_HORIZON - LABEL_FADE_FROM);
            return { x, y, alpha };
        };
        // When the rim is on screen, a name's box must sit wholly on the disc;
        // one that would cross the edge is left out rather than cut in half.
        const rimOnScreen = R < Math.hypot(w / 2, h / 2);
        const onDisc = (b: Box) =>
            !rimOnScreen ||
            [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].every(([x, y]) => Math.hypot(x - w / 2, y - h / 2) < R - 6);

        // Names come from whichever grade has arrived; both carry them.
        const named = fineRef.current ?? coarseRef.current;
        if (named && v.zoom >= FINE_ZOOM && v.zoom <= COUNTRY_NAME_MAX_ZOOM) {
            ctx.font = `600 12px ${fontRef.current}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = COUNTRY_TEXT;
            for (const c of named.countries) {
                // Sorted by area, so the first too-small country ends the list.
                if (c.areaSr * R * R < MIN_COUNTRY_PX2) break;
                const p = visible(c.centroid[0], c.centroid[1]);
                if (!p) continue;
                const half = ctx.measureText(c.name).width / 2 + 4;
                const box = { x0: p.x - half, y0: p.y - 9, x1: p.x + half, y1: p.y + 9 };
                if (!onDisc(box) || !claim(box)) continue;
                ctx.globalAlpha = p.alpha;
                ctx.fillText(c.name, p.x, p.y);
            }
            ctx.globalAlpha = 1;
        }

        const cities = citiesRef.current;
        if (cities && v.zoom >= CITY_NAME_ZOOM) {
            const limit = v.zoom >= 7 ? 60 : 30;
            ctx.font = `500 12px ${fontRef.current}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            let shown = 0;
            for (const c of cities) {
                if (shown >= limit) break;
                const p = visible(c.lng, c.lat);
                if (!p) continue;
                const tw = ctx.measureText(c.label).width;
                const box = { x0: p.x - 6, y0: p.y - 9, x1: p.x + 10 + tw, y1: p.y + 9 };
                if (!onDisc(box) || !claim(box)) continue;
                shown++;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = CITY_DOT;
                ctx.stroke();
                ctx.fillStyle = CITY_TEXT;
                ctx.fillText(c.label, p.x + 7, p.y);
            }
            ctx.globalAlpha = 1;
        }
    };

    /** Draws now and mirrors the view into state for the pins. */
    const paint = () => {
        draw();
        setView(viewRef.current ? { ...viewRef.current } : null);
    };

    /**
     * One frame for however many events arrived before it.
     *
     * With a timer behind it: a browser stops issuing animation frames to a
     * window it believes is covered, and keeps doing so for a moment after it
     * is uncovered, while pointer events and timers carry on. Without the
     * timer, a drag that began in that moment would move nothing until the
     * frames came back; with it the map paints within a tenth of a second
     * either way. Whichever fires first cancels the other.
     */
    const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestRender = () => {
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            if (fallbackRef.current !== null) { clearTimeout(fallbackRef.current); fallbackRef.current = null; }
            paint();
        });
        fallbackRef.current = setTimeout(() => {
            fallbackRef.current = null;
            if (frameRef.current === null) return;
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            paint();
        }, 120);
    };

    const minZoom = () => (sizeRef.current.w && sizeRef.current.h ? fitZoom(sizeRef.current.w, sizeRef.current.h) - 0.2 : 0);
    const clampView = (v: View): View => ({
        lng: v.lng,
        lat: Math.max(-85, Math.min(85, v.lat)),
        zoom: Math.max(minZoom(), Math.min(MAX_ZOOM, v.zoom)),
    });

    const stopInertia = () => {
        if (inertiaRef.current !== null) cancelAnimationFrame(inertiaRef.current);
        inertiaRef.current = null;
    };
    const stopAnimation = () => {
        if (animRef.current !== null) cancelAnimationFrame(animRef.current);
        animRef.current = null;
    };
    /** Ends any motion and draws the settled frame, fine grade and all. */
    const settle = () => {
        movingRef.current = false;
        paint();
    };

    /**
     * Zooming glides. A wheel notch or a button press moves a target; every
     * frame the view closes a third of the distance to it, so several notches
     * in a row read as one accelerating movement rather than a series of
     * jumps, and it lands without a bump. The point under the cursor when the
     * wheel turned stays under the cursor throughout. While it glides the map
     * counts as in motion, so it draws from the light coastline and sharpens
     * only when it stops.
     */
    const zoomTargetRef = useRef<number | null>(null);
    const zoomAnchorRef = useRef<{ px: [number, number]; geo: [number, number] } | null>(null);
    const zoomLoopRef = useRef<number | null>(null);
    const stopZoom = () => {
        if (zoomLoopRef.current !== null) cancelAnimationFrame(zoomLoopRef.current);
        zoomLoopRef.current = null;
        zoomTargetRef.current = null;
        zoomAnchorRef.current = null;
    };
    const zoomToward = (target: number, anchorPx: [number, number] | null) => {
        const v = viewRef.current;
        if (!v) return;
        stopAnimation();
        stopInertia();
        zoomTargetRef.current = clampView({ ...v, zoom: target }).zoom;
        if (anchorPx) {
            const geo = projectionFor(v, sizeRef.current).invert?.(anchorPx) ?? null;
            zoomAnchorRef.current = geo ? { px: anchorPx, geo: [geo[0], geo[1]] } : null;
        } else {
            zoomAnchorRef.current = null;
        }
        if (zoomLoopRef.current !== null) return;
        movingRef.current = true;
        const step = () => {
            const cur = viewRef.current;
            const goal = zoomTargetRef.current;
            if (!cur || goal === null) { zoomLoopRef.current = null; settle(); return; }
            let zoom = cur.zoom + (goal - cur.zoom) * 0.32;
            const done = Math.abs(goal - zoom) < 0.003;
            if (done) zoom = goal;
            let next: View = { ...cur, zoom };
            const anchor = zoomAnchorRef.current;
            if (anchor) {
                const after = projectionFor(next, sizeRef.current).invert?.(anchor.px) ?? null;
                if (after) next = { ...next, lng: next.lng + (anchor.geo[0] - after[0]), lat: next.lat + (anchor.geo[1] - after[1]) };
            }
            viewRef.current = clampView(next);
            if (done) { zoomLoopRef.current = null; zoomTargetRef.current = null; zoomAnchorRef.current = null; settle(); return; }
            paint();
            zoomLoopRef.current = requestAnimationFrame(step);
        };
        zoomLoopRef.current = requestAnimationFrame(step);
    };

    /** Glides from the current view to `to` along the great circle. */
    const animateTo = (to: View, ms = FLY_MS) => {
        const from = viewRef.current;
        if (!from) { viewRef.current = clampView(to); paint(); return; }
        stopAnimation();
        stopInertia();
        stopZoom();
        const target = clampView(to);
        const along = geoInterpolate([from.lng, from.lat], [target.lng, target.lat]);
        const started = performance.now();
        movingRef.current = true;
        const step = (now: number) => {
            const t = Math.min(1, (now - started) / ms);
            const e = easeInOut(t);
            const [lng, lat] = along(e);
            viewRef.current = { lng, lat, zoom: from.zoom + (target.zoom - from.zoom) * e };
            if (t < 1) { paint(); animRef.current = requestAnimationFrame(step); }
            else { animRef.current = null; settle(); }
        };
        animRef.current = requestAnimationFrame(step);
    };

    // Body font, once: canvas text cannot read CSS variables, and the sans is
    // registered under a generated family name, not "Inter".
    useEffect(() => {
        const family = getComputedStyle(document.body).fontFamily;
        if (family) fontRef.current = family;
    }, []);

    // Geography: coarse for everyone, the fine set behind it for the
    // interactive view. Each arrival asks for one frame.
    useEffect(() => {
        let cancelled = false;
        loadGeo('coarse').then((g) => { if (cancelled) return; coarseRef.current = g; requestRender(); }).catch((err) => console.error('[map] geography failed to load:', err));
        if (interactive) {
            loadGeo('fine').then((g) => { if (cancelled) return; fineRef.current = g; requestRender(); }).catch((err) => console.error('[map] fine geography failed to load:', err));
        }
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interactive]);

    useEffect(() => {
        citiesRef.current = cities ?? null;
        requestRender();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cities]);

    useEffect(() => {
        const el = hostRef.current;
        if (!el) return;
        const take = (width: number, height: number) => {
            if (!width || !height) return;
            sizeRef.current = { w: width, h: height };
            setSize({ w: width, h: height });
            requestRender();
        };
        // Measured now, not only when the observer first reports: an observer
        // reports during a rendering step, and a tab that is hidden or covered
        // gets none until it is shown. The box has a size the moment it is in
        // the document, so the first frame need not wait for that.
        const rect = el.getBoundingClientRect();
        take(rect.width, rect.height);
        const ro = new ResizeObserver(([entry]) => take(entry.contentRect.width, entry.contentRect.height));
        ro.observe(el);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The starting view. For a still map it follows the props — the banner
    // re-centres when the viewer saves a new city. For the interactive map it
    // is set once; after that the view belongs to whoever is dragging it.
    useEffect(() => {
        if (!size.w || !size.h) return;
        if (interactive && viewRef.current) return;
        viewRef.current = { lng: centre.lng, lat: centre.lat, zoom: zoom === 'globe' ? fitZoom(size.w, size.h) : zoom };
        paint();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centre.lat, centre.lng, zoom, interactive, size.w, size.h]);

    useEffect(() => {
        if (!flyTo || !interactive) return;
        animateTo({ lng: flyTo.lng, lat: flyTo.lat, zoom: flyTo.zoom });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flyTo, interactive]);

    useEffect(() => () => {
        stopAnimation();
        stopInertia();
        stopZoom();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Drag to spin, flick to keep it spinning, pinch and wheel to zoom.
    // Pointer events cover mouse, touch and pen alike; `touch-action: none` on
    // the host keeps the page from scrolling or zooming itself meanwhile.
    useEffect(() => {
        const el = hostRef.current;
        if (!el || !interactive) return;

        const pointers = new Map<number, { x: number; y: number }>();
        let start: { view: View; x: number; y: number; dist: number } | null = null;
        // The last ~100 ms of movement, for the speed a flick leaves behind.
        let trail: { t: number; lng: number; lat: number }[] = [];

        // These listeners are on the box itself, so they hear a press on a pin
        // or on a card before React does — a stopPropagation in the pin's own
        // handler comes too late for them. So they ask where the press began.
        const ownControl = (e: Event) => (e.target as Element | null)?.closest?.(OWN_CONTROLS) != null;

        const midpoint = () => {
            const pts = [...pointers.values()];
            return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
        };
        const spread = () => {
            const [a, b] = [...pointers.values()];
            return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
        };
        const begin = () => {
            const v = viewRef.current;
            if (!v) return;
            const { x, y } = midpoint();
            start = { view: v, x, y, dist: spread() };
        };

        const onDown = (e: PointerEvent) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (ownControl(e)) return;
            stopAnimation();
            stopInertia();
            stopZoom();
            // Capture keeps the drag alive when the pointer leaves the box. It
            // throws for a pointer the browser is not tracking, and a drag that
            // cannot be captured is still a drag, so that is not fatal here.
            try { el.setPointerCapture(e.pointerId); } catch { /* uncaptured, still handled */ }
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            begin();
            trail = [];
            movingRef.current = true;
            setDragging(true);
        };
        const onMove = (e: PointerEvent) => {
            if (!pointers.has(e.pointerId) || !start) return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const { x, y } = midpoint();
            let zoomNow = start.view.zoom;
            if (pointers.size >= 2 && start.dist > 0) zoomNow = start.view.zoom + Math.log2(spread() / start.dist);
            // A pixel of drag turns the globe by the angle that pixel subtends
            // at its radius — the spot under the finger stays under the finger,
            // so it is a slow spin zoomed out and a fine nudge zoomed in.
            const degPerPx = (180 / Math.PI) / radiusForZoom(zoomNow);
            const next = clampView({
                lng: start.view.lng - (x - start.x) * degPerPx,
                lat: start.view.lat + (y - start.y) * degPerPx,
                zoom: zoomNow,
            });
            viewRef.current = next;
            const now = performance.now();
            trail.push({ t: now, lng: next.lng, lat: next.lat });
            while (trail.length > 1 && now - trail[0].t > 100) trail.shift();
            requestRender();
        };
        const onUp = (e: PointerEvent) => {
            pointers.delete(e.pointerId);
            if (pointers.size > 0) { begin(); return; }
            start = null;
            setDragging(false);

            // A flick: whatever speed the hand had at the end carries on and
            // runs down. Below a walking pace it just stops where it is.
            const first = trail[0];
            const last = trail[trail.length - 1];
            const dt = first && last ? last.t - first.t : 0;
            let vLng = dt > 0 ? (last.lng - first.lng) / dt : 0;
            let vLat = dt > 0 ? (last.lat - first.lat) / dt : 0;
            const v = viewRef.current;
            // Speed on screen, not in degrees: a flick zoomed in covers fewer
            // degrees for the same movement of the hand.
            const pxPerDeg = v ? radiusForZoom(v.zoom) * (Math.PI / 180) : 0;
            if (!v || Math.hypot(vLng, vLat) * pxPerDeg < 0.15) { settle(); return; }

            let lastT = performance.now();
            const run = (now: number) => {
                const step = now - lastT;
                lastT = now;
                const keep = Math.pow(INERTIA_FRICTION, step / 16);
                vLng *= keep;
                vLat *= keep;
                const cur = viewRef.current;
                if (!cur) { inertiaRef.current = null; settle(); return; }
                viewRef.current = clampView({ lng: cur.lng + vLng * step, lat: cur.lat + vLat * step, zoom: cur.zoom });
                if (Math.hypot(vLng, vLat) * pxPerDeg < 0.01) { inertiaRef.current = null; settle(); return; }
                paint();
                inertiaRef.current = requestAnimationFrame(run);
            };
            inertiaRef.current = requestAnimationFrame(run);
        };

        // Zoom towards the pointer: whatever was under it before is under it
        // after, so you zoom into the place you are looking at rather than
        // into the middle of the screen and then hunt for it.
        const onWheel = (e: WheelEvent) => {
            // Wherever the wheel turns over the map — card, pin, or water — it
            // zooms the map. Nothing on it scrolls.
            e.preventDefault();
            const v = viewRef.current;
            if (!v) return;
            // A notch is 0.4 of a zoom level: three notches for a full level.
            // Trackpads send many small deltas and glide just the same.
            const lines = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
            const from = zoomTargetRef.current ?? v.zoom;
            const rect = el.getBoundingClientRect();
            zoomToward(from - lines * 0.004, [e.clientX - rect.left, e.clientY - rect.top]);
        };

        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointercancel', onUp);
            el.removeEventListener('wheel', onWheel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interactive]);

    // Where each pin sits, from the same projection the canvas used. A pin on
    // the far side of the globe is not drawn; one just past the rim would
    // float off the edge, so the cut is a little short of the horizon.
    const placed: { spec: PinSpec; x: number; y: number }[] = [];
    if (view && size.w && size.h) {
        const projection = projectionFor(view, size);
        for (const spec of pins) {
            if (geoDistance([spec.lng, spec.lat], [view.lng, view.lat]) > HORIZON) continue;
            const p = projection([spec.lng, spec.lat]);
            if (!p) continue;
            const [x, y] = p;
            if (x < -60 || x > size.w + 60 || y < -60 || y > size.h + 60) continue;
            placed.push({ spec, x, y });
        }
        // The highlighted pin paints last, so it is never under a neighbour.
        placed.sort((a, b) => Number(a.spec.highlight) - Number(b.spec.highlight));
    }

    const zoomBy = (delta: number) => {
        const v = viewRef.current;
        if (v) zoomToward((zoomTargetRef.current ?? v.zoom) + delta, null);
    };

    const hostStyle: CSSProperties = interactive
        ? { touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }
        : {};

    return (
        <div ref={hostRef} className={`${className} overflow-hidden select-none`} style={hostStyle} aria-hidden={!interactive}>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ width: size.w || undefined, height: size.h || undefined }} />

            {/* A pin is a small black dot centred on the coordinate itself — no
                tip, no photo, no name tag — so where it sits is exactly where the
                person is. Your own dot wears the green ring. Everything else about
                the person is on the card above it. */}
            {placed.map(({ spec, x, y }) => {
                const Tag = spec.onClick ? 'button' : 'div';
                return (
                    <Tag
                        key={spec.key}
                        data-map-pin=""
                        type={spec.onClick ? 'button' : undefined}
                        onClick={spec.onClick ? (e: React.MouseEvent) => { e.stopPropagation(); spec.onClick?.(); } : undefined}
                        title={spec.name}
                        aria-label={spec.onClick ? spec.name : undefined}
                        // A 24px target around a 10px dot: enough to hit, small enough to be precise.
                        className={`absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center ${spec.onClick ? 'cursor-pointer' : ''} ${spec.highlight ? 'z-10' : ''}`}
                        style={{ left: x, top: y }}
                    >
                        <span
                            className={`block rounded-full bg-stone-900 shadow-[0_1px_4px_rgba(0,0,0,0.35)] ${
                                spec.highlight ? 'w-3 h-3 ring-2 ring-[#86BE7F]' : 'w-2.5 h-2.5 ring-2 ring-white'
                            }`}
                        />
                    </Tag>
                );
            })}

            {/* A card for every pin on the visible side, each floating above its
                pin and following it as the globe turns. Kept inside the box:
                near an edge it slides sideways rather than off, and with no
                room above it goes below. Cards are laid down in order, your own
                first, and one that would land on another waits its turn. */}
            {renderPinCard && (() => {
                const taken: Box[] = [];
                const cards: React.ReactNode[] = [];
                const ordered = [...placed].sort((a, b) => Number(b.spec.highlight) - Number(a.spec.highlight));
                for (const hit of ordered) {
                    const height = cardHeights[hit.spec.key] ?? 240;
                    const pinTop = hit.y - 8;
                    const left = Math.max(CARD_MARGIN, Math.min(size.w - cardWidth - CARD_MARGIN, hit.x - cardWidth / 2));
                    const above = pinTop >= height + CARD_GAP + CARD_MARGIN;
                    const top = above ? pinTop - CARD_GAP - height : hit.y + 8 + CARD_GAP;
                    const box: Box = { x0: left - CARD_MARGIN, y0: top - CARD_MARGIN, x1: left + cardWidth + CARD_MARGIN, y1: top + height + CARD_MARGIN };
                    if (taken.some((t) => overlaps(t, box))) continue;
                    taken.push(box);
                    cards.push(
                        <div
                            key={hit.spec.key}
                            ref={measureCard(hit.spec.key)}
                            data-map-card=""
                            className="absolute z-30 map-card-in"
                            style={{
                                width: cardWidth,
                                left,
                                top,
                                transformOrigin: above ? 'bottom center' : 'top center',
                            }}
                        >
                            {renderPinCard(hit.spec)}
                        </div>,
                    );
                }
                return (
                    <>
                        {cards}
                        {/* tailwindcss-animate is not installed here, so the entrance is written out. */}
                        <style jsx global>{`
                            .map-card-in { animation: map-card-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both; }
                            @keyframes map-card-in {
                                from { opacity: 0; transform: translateY(6px) scale(0.96); }
                                to { opacity: 1; transform: none; }
                            }
                            @media (prefers-reduced-motion: reduce) { .map-card-in { animation: none; } }
                        `}</style>
                    </>
                );
            })()}

            {interactive && (
                <div className="absolute z-20 right-4 bottom-6 flex flex-col gap-2">
                    <button type="button" onClick={() => zoomBy(1)} aria-label="+" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors active:scale-95 cursor-pointer">
                        <Plus className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => zoomBy(-1)} aria-label="−" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors active:scale-95 cursor-pointer">
                        <Minus className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
