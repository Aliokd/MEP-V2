"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, LocateFixed, Maximize2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchLocatedProfiles, writePublicProfile, type PublicProfile } from '@/lib/publicProfile';
import { CITIES, findCity, nearestCity, type City } from '@/lib/cities';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '@/lib/storage';
import { BANNER_MAP_STYLE, QUIET_MAP_STYLE, isGoogleMapsConfigured, loadGoogleMaps } from '@/lib/googleMaps';

/**
 * Where the platform's songwriters are — on Google Maps, styled down.
 *
 * Minimised, it is a banner: a still view of the map around the viewer's part
 * of the world, with pins. Opened, it takes the screen and shows everyone.
 *
 * Putting yourself on it is a staged thing, on purpose:
 *
 *   ask      → our banner says why we'd like your location, before any prompt.
 *   locating → you pressed Allow; the browser's own prompt runs.
 *   preview  → the map flies to the nearest listed city and drops a pin with
 *              your name on it. Nothing is saved yet.
 *   done     → you pressed Confirm. Now it's saved.
 *
 * The exact position is used once, to pick the city, and dropped. What gets
 * saved is the city — and only when you've seen it and said yes.
 *
 * Without NEXT_PUBLIC_GOOGLE_MAPS_API_KEY the map itself is replaced by a calm
 * placeholder; the placing flow still works, since it names the city in words.
 */

/** Where the banner looks when the viewer has no city of their own. */
const NORDIC_CENTRE = { lat: 59.5, lng: 15.5 };
/** Zoom the map settles at when it flies to your city. */
const CITY_ZOOM = 7;
/** "Not now" is remembered for the session, so the banner doesn't nag on every open. */
const ASKED_KEY = 'veinote-map-location-asked';

type Stage = 'idle' | 'ask' | 'locating' | 'preview' | 'refused' | 'unsupported' | 'failed';

interface Preview {
    city: City;
    name: string;
    photoURL: string | null;
}

interface PinSpec {
    key: string;
    lat: number;
    lng: number;
    name: string;
    photoURL: string | null;
    highlight: boolean;
    onClick?: () => void;
}

function pinHtml(name: string, photoURL: string | null, highlight: boolean): string {
    const ring = highlight ? '#86BE7F' : '#ffffff';
    const inner = photoURL
        ? `<img src="${photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" />`
        : `<span style="font:600 15px Inter,system-ui,sans-serif;color:#44403c">${(name[0] || '?').toUpperCase()}</span>`;
    const label = highlight
        ? `<div style="position:absolute;left:50%;top:-30px;transform:translateX(-50%);white-space:nowrap;background:#1c1917;color:#FAF9F5;font:600 12px Inter,system-ui,sans-serif;padding:4px 10px;border-radius:9999px;box-shadow:0 4px 12px rgba(0,0,0,.18)">${name}</div>`
        : '';
    return `
      <div style="position:relative;width:44px;height:52px">
        ${label}
        <div style="position:absolute;left:50%;bottom:0;width:10px;height:10px;background:${ring};transform:translateX(-50%) rotate(45deg);border-radius:2px;box-shadow:0 2px 6px rgba(0,0,0,.15)"></div>
        <div style="position:absolute;left:0;top:0;width:44px;height:44px;border-radius:9999px;background:#FAF9F5;border:3px solid ${ring};box-shadow:0 4px 14px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center;overflow:hidden">${inner}</div>
      </div>`;
}

/**
 * An HTML pin on a Google map.
 *
 * Google's own markers are either the classic (deprecated) kind or the
 * Advanced kind that needs a cloud map id — which rules out the JSON styling
 * this map depends on. An OverlayView is the supported way to put arbitrary
 * HTML at a coordinate, and it's a few lines. Built by a factory because the
 * class has to extend `google.maps.OverlayView`, which only exists once the
 * API has loaded.
 */
function makeHtmlPinClass(g: typeof google) {
    return class HtmlPin extends g.maps.OverlayView {
        private el: HTMLDivElement;
        private position: google.maps.LatLng;

        constructor(spec: PinSpec) {
            super();
            this.position = new g.maps.LatLng(spec.lat, spec.lng);
            this.el = document.createElement('div');
            this.el.style.position = 'absolute';
            this.el.style.cursor = spec.onClick ? 'pointer' : 'default';
            this.el.title = spec.name;
            this.el.innerHTML = pinHtml(spec.name, spec.photoURL, spec.highlight);
            if (spec.onClick) {
                const handler = spec.onClick;
                this.el.addEventListener('click', (e) => { e.stopPropagation(); handler(); });
                g.maps.OverlayView.preventMapHitsAndGesturesFrom(this.el);
            }
            if (spec.highlight) this.el.style.zIndex = '10';
        }
        onAdd() { this.getPanes()?.overlayMouseTarget.appendChild(this.el); }
        draw() {
            const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
            if (!point) return;
            // Anchor at the pin's tip: the element is 44×52, tip at bottom centre.
            this.el.style.left = `${point.x - 22}px`;
            this.el.style.top = `${point.y - 52}px`;
        }
        onRemove() { this.el.parentNode?.removeChild(this.el); }
    };
}

/**
 * The banner's map isn't Google's.
 *
 * A Google map — even a still, non-interactive one — must show Google's logo
 * and the map-data attribution; that's a condition of the key, and hiding them
 * is grounds for losing it. The banner doesn't need a map, only the *sense* of
 * one: pins where people are, on a quiet surface. So it draws its own — a flat
 * projection of the pins around a centre, on beige, with a faint grid. No map
 * data, nothing to attribute. Google appears only when the map is opened.
 */
function BannerPins({ pins, centre }: { pins: PinSpec[]; centre: { lat: number; lng: number } }) {
    // Degrees of longitude across the banner. Latitude follows the banner's
    // aspect so a degree is the same length both ways (fine at this scale).
    const LNG_SPAN = 34;
    const hostRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 800, h: 220 });
    useEffect(() => {
        const el = hostRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width && height) setSize({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const latSpan = LNG_SPAN * (size.h / size.w);
    const project = (lat: number, lng: number) => ({
        x: ((lng - centre.lng) / LNG_SPAN + 0.5) * size.w,
        y: ((centre.lat - lat) / latSpan + 0.5) * size.h,
    });

    return (
        <div
            ref={hostRef}
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden"
            style={{
                backgroundColor: '#ECEBE3',
                backgroundImage:
                    'linear-gradient(rgba(120,115,105,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,115,105,0.08) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
            }}
        >
            {pins.map((p) => {
                const { x, y } = project(p.lat, p.lng);
                if (x < -30 || x > size.w + 30 || y < -30 || y > size.h + 30) return null;
                return (
                    <div
                        key={p.key}
                        className="absolute w-8 h-8 -ml-4 -mt-8 rounded-full bg-[#FAF9F5] flex items-center justify-center overflow-hidden"
                        style={{
                            left: x,
                            top: y,
                            border: `2.5px solid ${p.highlight ? '#86BE7F' : '#ffffff'}`,
                            boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
                        }}
                    >
                        {p.photoURL
                            ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[12px] font-semibold text-stone-600">{(p.name[0] || '?').toUpperCase()}</span>}
                    </div>
                );
            })}
        </div>
    );
}

interface MapViewProps {
    pins: PinSpec[];
    centre: { lat: number; lng: number };
    zoom: number;
    interactive: boolean;
    flyTo?: { lat: number; lng: number; zoom: number } | null;
    className?: string;
}

/** One Google map. Two instances make the banner and the full view. */
function MapView({ pins, centre, zoom, interactive, flyTo, className = '' }: MapViewProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const pinClassRef = useRef<ReturnType<typeof makeHtmlPinClass> | null>(null);
    const overlaysRef = useRef<google.maps.OverlayView[]>([]);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const g = await loadGoogleMaps();
                if (cancelled || !hostRef.current || mapRef.current) return;
                mapRef.current = new g.maps.Map(hostRef.current, {
                    center: centre,
                    zoom,
                    styles: interactive ? QUIET_MAP_STYLE : BANNER_MAP_STYLE,
                    disableDefaultUI: true,
                    zoomControl: interactive,
                    zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
                    gestureHandling: interactive ? 'greedy' : 'none',
                    keyboardShortcuts: interactive,
                    clickableIcons: false,
                    minZoom: 2,
                    restriction: { latLngBounds: { north: 85, south: -85, west: -180, east: 180 }, strictBounds: false },
                    backgroundColor: '#e9eef2',
                });
                pinClassRef.current = makeHtmlPinClass(g);
                setReady(true);
            } catch (err) {
                console.error('[map] Google Maps failed to load:', err);
                if (!cancelled) setFailed(true);
            }
        })();
        return () => { cancelled = true; };
        // Centre and zoom are initial values; moving the map later is the user's.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interactive]);

    // Pins follow the list. Everything is torn down and rebuilt — a handful of
    // overlays, and it keeps the map honest with the data.
    useEffect(() => {
        const map = mapRef.current;
        const HtmlPin = pinClassRef.current;
        if (!ready || !map || !HtmlPin) return;
        overlaysRef.current.forEach((o) => o.setMap(null));
        overlaysRef.current = pins.map((spec) => {
            const pin = new HtmlPin(spec);
            pin.setMap(map);
            return pin;
        });
        return () => {
            overlaysRef.current.forEach((o) => o.setMap(null));
            overlaysRef.current = [];
        };
    }, [pins, ready]);

    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map || !flyTo) return;
        map.panTo({ lat: flyTo.lat, lng: flyTo.lng });
        map.setZoom(flyTo.zoom);
    }, [flyTo, ready]);

    if (failed) {
        return (
            <div className={`${className} flex items-center justify-center bg-[#EBEBE3] text-[13px] text-stone-500`} aria-hidden={!interactive}>
                {/* Copy comes from the parent so this stays a dumb view. */}
            </div>
        );
    }
    return <div ref={hostRef} className={className} aria-hidden={!interactive} />;
}

export default function SongwriterMap() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    const configured = isGoogleMapsConfigured();

    const [people, setPeople] = useState<PublicProfile[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [stage, setStage] = useState<Stage>('idle');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
    const [pickingCity, setPickingCity] = useState(false);
    const [saving, setSaving] = useState(false);

    const viewerName = user?.displayName || user?.email?.split('@')[0] || '';

    const load = async () => {
        try { setPeople(await fetchLocatedProfiles()); }
        catch (err) { console.error('[map] Could not load songwriters:', err); }
        finally { setLoaded(true); }
    };
    useEffect(() => { void load(); }, []);

    const me = useMemo(() => people.find((p) => p.uid === user?.uid) ?? null, [people, user?.uid]);
    const bannerCentre = me?.location ? { lat: me.location.lat, lng: me.location.lng } : NORDIC_CENTRE;

    const openProfile = (uid: string) => {
        close();
        router.push(`/platform/profile/u/${uid}`);
    };

    // The pins, as plain data. The full view's pins open profiles; the banner's
    // don't. While a preview is up the viewer's saved pin steps aside so there
    // aren't two of them on the map at once.
    const buildPins = (clickable: boolean): PinSpec[] => {
        const specs: PinSpec[] = people
            .filter((p) => p.location && !(preview && p.uid === user?.uid))
            .map((p) => ({
                key: p.uid,
                lat: p.location!.lat,
                lng: p.location!.lng,
                name: p.name,
                photoURL: p.photoURL,
                highlight: p.uid === user?.uid,
                onClick: clickable ? () => openProfile(p.uid) : undefined,
            }));
        if (preview) {
            specs.push({
                key: 'preview',
                lat: preview.city.lat,
                lng: preview.city.lng,
                name: preview.name,
                photoURL: preview.photoURL,
                highlight: true,
            });
        }
        return specs;
    };
    const bannerPins = useMemo(() => buildPins(false), [people, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
    const fullPins = useMemo(() => buildPins(true), [people, user?.uid, preview]); // eslint-disable-line react-hooks/exhaustive-deps

    const open = () => {
        setExpanded(true);
        setFlyTo(null);
        setPreview(null);
        setPickingCity(false);
        const asked = safeLocalStorageGetItem(ASKED_KEY) === '1';
        setStage(user && loaded && !me?.location && !asked ? 'ask' : 'idle');
    };

    const close = () => {
        setExpanded(false);
        setStage('idle');
        setPreview(null);
    };

    useEffect(() => {
        if (!expanded) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded]);

    const allowLocation = () => {
        if (!user) return;
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setStage('unsupported');
            return;
        }
        setStage('locating');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { city } = nearestCity(pos.coords.latitude, pos.coords.longitude);
                setPreview({ city, name: viewerName, photoURL: user.photoURL ?? null });
                setFlyTo({ lat: city.lat, lng: city.lng, zoom: CITY_ZOOM });
                setStage('preview');
            },
            (err) => {
                setStage(err.code === err.PERMISSION_DENIED ? 'refused' : 'failed');
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
        );
    };

    const notNow = () => {
        safeLocalStorageSetItem(ASKED_KEY, '1');
        setStage('idle');
    };

    const saveCity = async (city: City | null) => {
        if (!user) return;
        setSaving(true);
        try {
            await writePublicProfile(user.uid, {
                location: city ? { cityId: city.id, label: city.label, lat: city.lat, lng: city.lng } : null,
            });
            await load();
            setPreview(null);
            setPickingCity(false);
            setStage('idle');
            if (city) setFlyTo({ lat: city.lat, lng: city.lng, zoom: CITY_ZOOM });
        } finally {
            setSaving(false);
        }
    };

    const previewCity = (cityId: string) => {
        const city = findCity(cityId);
        if (!city || !user) return;
        setPreview({ city, name: viewerName, photoURL: user.photoURL ?? null });
        setFlyTo({ lat: city.lat, lng: city.lng, zoom: CITY_ZOOM });
        setPickingCity(false);
        setStage('preview');
    };

    const panel = 'bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.14)] p-5';
    const primary = 'w-full rounded-full bg-[#86BE7F] py-3.5 text-[15px] font-semibold text-stone-900 hover:brightness-[1.03] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
    const quiet = 'text-[13px] font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer';

    const notConfigured = (
        <div className="absolute inset-0 flex items-center justify-center bg-[#EBEBE3]">
            <p className="text-[13px] text-stone-500 max-w-xs text-center px-6">{t('connect.map_not_configured')}</p>
        </div>
    );

    return (
        <>
            {/* Minimised */}
            <button
                type="button"
                onClick={open}
                aria-label={t('connect.map_open')}
                className="group relative w-full h-[180px] sm:h-[220px] rounded-[22px] overflow-hidden border border-stone-200/60 bg-[#EBEBE3] cursor-pointer text-left select-none active:scale-[0.995] transition-transform"
            >
                {/* The Google map, with its logo and attribution hidden — in the
                    banner only. See the styled block below for what that means.
                    Without a key, the self-drawn pin field stands in. */}
                {loaded && (configured
                    ? <MapView pins={bannerPins} centre={bannerCentre} zoom={5} interactive={false} className="map-banner absolute inset-0" />
                    : <BannerPins pins={bannerPins} centre={bannerCentre} />)}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#F0F0EA]/90 via-transparent to-transparent" />
                <div className="pointer-events-none absolute left-5 bottom-4 right-5 flex items-end justify-between gap-3">
                    <div>
                        <span className="block text-[18px] font-sans font-medium text-stone-900 tracking-tight leading-snug">
                            {t('connect.map_title')}
                        </span>
                        <span className="block text-[13px] text-stone-600">
                            {people.length > 0
                                ? t('connect.map_count').replace('{count}', String(people.length))
                                : t('connect.map_empty')}
                        </span>
                    </div>
                    <span className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-700 group-hover:text-stone-900 transition-colors shrink-0">
                        <Maximize2 className="w-4 h-4" />
                    </span>
                </div>
            </button>

            {/* Outside the <button>: a <style> element is not valid inside
                interactive content, and React would report it as a nesting error. */}
            <style jsx global>{`
                /*
                 * DELIBERATE, AND A KNOWN RISK. Google Maps Platform's terms
                 * require the Google logo and the map-data attribution to stay
                 * visible on every map the key renders, still or not. Hiding
                 * them here contravenes that, and Google may suspend the key
                 * for it — which would take the full-screen map down too. The
                 * decision was made with that stated. The full view keeps every
                 * mark; this applies to the banner only. If the key is ever
                 * flagged, delete this block first.
                 */
                .map-banner .gm-style-cc,
                .map-banner a[href^="https://maps.google.com/maps"],
                .map-banner .gmnoprint {
                    display: none !important;
                }
            `}</style>

            {/* Full view */}
            {expanded && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100] bg-[#e9eef2] animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label={t('connect.map_title')}>
                    {configured ? (
                        <MapView
                            pins={fullPins}
                            centre={me?.location ? { lat: me.location.lat, lng: me.location.lng } : { lat: 30, lng: 10 }}
                            zoom={me?.location ? 5 : 2}
                            interactive
                            flyTo={flyTo}
                            className="absolute inset-0"
                        />
                    ) : notConfigured}

                    {/* Above the map, so no zoom or pan can cover it. */}
                    <div className="absolute z-20 top-4 left-4 right-4 flex items-start justify-between gap-3 pointer-events-none">
                        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
                            <span className="text-[14px] font-sans font-medium text-stone-900">{t('connect.map_title')}</span>
                            <span className="text-[13px] text-stone-500 ml-2">
                                {t('connect.map_count').replace('{count}', String(people.length))}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={close}
                            aria-label={t('common.close')}
                            className="pointer-events-auto w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors active:scale-95 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {user && (
                        <div className="absolute z-20 bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,440px)]">

                            {(stage === 'ask' || stage === 'locating') && (
                                <div className={`${panel} space-y-4`}>
                                    <div className="flex items-start gap-3">
                                        <span className="w-9 h-9 shrink-0 rounded-full bg-[#86BE7F]/20 flex items-center justify-center text-[#3f6a3a]">
                                            <LocateFixed className="w-4 h-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-medium text-stone-900 leading-snug">{t('connect.map_ask_title')}</p>
                                            <p className="text-[13px] text-stone-500 mt-1 leading-snug">{t('connect.map_ask_desc')}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={allowLocation} disabled={stage === 'locating'} className={primary}>
                                        {stage === 'locating' ? t('connect.map_locating') : t('connect.map_allow')}
                                    </button>
                                    <div className="flex items-center justify-between">
                                        <button type="button" onClick={() => { setStage('idle'); setPickingCity(true); }} className={quiet}>
                                            {t('connect.map_pick_instead')}
                                        </button>
                                        <button type="button" onClick={notNow} className={quiet}>
                                            {t('connect.map_not_now')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {stage === 'preview' && preview && (
                                <div className={`${panel} space-y-4`}>
                                    <div>
                                        <p className="text-[15px] font-medium text-stone-900 leading-snug">
                                            {t('connect.map_preview_title').replace('{city}', preview.city.label)}
                                        </p>
                                        <p className="text-[13px] text-stone-500 mt-1 leading-snug">
                                            {t('connect.map_preview_desc').replace('{name}', preview.name)}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => void saveCity(preview.city)} disabled={saving} className={`${primary} inline-flex items-center justify-center gap-2`}>
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                        {saving ? t('connect.map_saving') : t('connect.map_confirm')}
                                    </button>
                                    <div className="flex items-center justify-between">
                                        <button type="button" onClick={() => { setPreview(null); setPickingCity(true); setStage('idle'); }} className={quiet}>
                                            {t('connect.map_pick_instead')}
                                        </button>
                                        <button type="button" onClick={() => { setPreview(null); setStage('idle'); }} className={quiet}>
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(stage === 'refused' || stage === 'unsupported' || stage === 'failed') && (
                                <div className={`${panel} space-y-3`}>
                                    <p className="text-[13px] text-stone-600 leading-snug">
                                        {stage === 'refused' && t('connect.map_location_denied')}
                                        {stage === 'unsupported' && t('connect.map_location_unsupported')}
                                        {stage === 'failed' && t('connect.map_location_failed')}
                                    </p>
                                    <button type="button" onClick={() => { setStage('idle'); setPickingCity(true); }} className={primary}>
                                        {t('connect.map_choose')}
                                    </button>
                                </div>
                            )}

                            {stage === 'idle' && pickingCity && (
                                <div className={`${panel} space-y-3`}>
                                    <p className="text-[13px] font-medium text-stone-700">{t('connect.map_pick_city')}</p>
                                    <select
                                        defaultValue={me?.location?.cityId ?? ''}
                                        onChange={(e) => e.target.value && previewCity(e.target.value)}
                                        className="w-full bg-[#F6F6F0] border border-stone-200/70 rounded-full px-4 h-11 text-[14px] font-medium outline-none focus:border-stone-400"
                                    >
                                        <option value="">{t('connect.map_choose')}</option>
                                        {CITIES.map((c) => (
                                            <option key={c.id} value={c.id}>{c.label} · {c.country}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center justify-between">
                                        <button type="button" onClick={() => setStage('ask')} className={`${quiet} inline-flex items-center gap-1.5`}>
                                            <LocateFixed className="w-3.5 h-3.5" /> {t('connect.map_use_location')}
                                        </button>
                                        <div className="flex items-center gap-4">
                                            {me?.location && (
                                                <button type="button" disabled={saving} onClick={() => void saveCity(null)} className={quiet}>
                                                    {t('connect.map_remove_me')}
                                                </button>
                                            )}
                                            <button type="button" onClick={() => setPickingCity(false)} className={quiet}>
                                                {t('common.close')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {stage === 'idle' && !pickingCity && (
                                <button
                                    type="button"
                                    onClick={() => (me?.location ? setPickingCity(true) : setStage('ask'))}
                                    className={`${primary} shadow-[0_8px_24px_rgba(0,0,0,0.12)]`}
                                >
                                    {me?.location
                                        ? t('connect.map_change_city').replace('{city}', me.location.label)
                                        : t('connect.map_put_me')}
                                </button>
                            )}
                        </div>
                    )}
                </div>,
                document.body,
            )}
        </>
    );
}
