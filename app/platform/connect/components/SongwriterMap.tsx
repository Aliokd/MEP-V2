"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, LocateFixed, MapPin, Maximize2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchLocatedProfiles, writePublicProfile, type PublicProfile } from '@/lib/publicProfile';
import {
    removeConnectionRequest,
    respondToConnectionRequest,
    sendConnectionRequest,
    useConnectionState,
    type Relationship,
} from '@/lib/connections';
import VerifiedMark from '@/app/platform/components/VerifiedMark';
import * as btn from '@/app/platform/components/buttonStyles';
import { CITIES, loadWorldCities, nearestCityIn, searchCities, type City } from '@/lib/cities';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '@/lib/storage';
import GlobeMap, { type PinSpec } from './GlobeMap';

/**
 * Where the platform's songwriters are — on a globe we draw ourselves (see
 * GlobeMap for the map itself).
 *
 * Minimised, it is a banner: a still view of the map around the viewer's part
 * of the world, with pins. Opened, it takes the screen as a globe you can spin
 * and zoom into, and shows everyone.
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
 */

/** Where the banner looks when the viewer has no city of their own. */
const NORDIC_CENTRE = { lat: 59.5, lng: 15.5 };
/** Where the globe faces when it opens for a viewer with no city: Europe, with Africa below. */
const GLOBE_CENTRE = { lat: 42, lng: 15 };
/** Zoom the map settles at when it flies to your city. */
const CITY_ZOOM = 7;
/** "Not now" is remembered for the session, so the banner doesn't nag on every open. */
const ASKED_KEY = 'veinote-map-location-asked';

type Stage = 'idle' | 'ask' | 'locating' | 'preview' | 'refused' | 'unsupported' | 'failed';

interface Preview {
    city: City;
    name: string;
    photoURL: string | null;
    /** How far the browser's position was from the city chosen for it; undefined when picked by hand. */
    distanceKm?: number;
}

/**
 * Beyond this, the nearest listed city is probably not *your* city. Bali was
 * snapping to Jakarta — right country, 960 km out — and nothing said so. Above
 * the line the preview says how far, and points at the search. With every
 * city over 100k loaded, a good match is usually well inside this.
 */
const FAR_FROM_CITY_KM = 60;

/**
 * The card above a pin: who this is, where, their profile and a way to
 * connect — a white card floating over the map, the way a world clock floats
 * a city's card over its pin. Nothing on it needs the map to be read.
 *
 * Connect is the roster's button, with the roster's meanings: it asks, it
 * shows the ask is out, it accepts theirs, or it shows you are connected.
 * Your own card has no Connect; you are already you.
 */
function SongwriterCard({
    person,
    isMe,
    relationship,
    onOpen,
    onConnect,
}: {
    person: PublicProfile;
    isMe: boolean;
    relationship: Relationship;
    onOpen: () => void;
    onConnect: () => void;
}) {
    const { t, language } = useLanguage();
    const connectLabel = {
        none: t('connect.connect_action'),
        declined: t('connect.connect_action'),
        outgoing: t('connect.invite_sent'),
        incoming: t('connect.accept_request'),
        connected: t('connect.connected'),
    }[relationship];
    const typeKey = person.songwriterType ? `onboarding.questions.songwriter_type.options.${person.songwriterType}.title` : null;
    const typeLabel = typeKey ? t(typeKey) : '';
    const specialty = typeLabel && typeLabel !== typeKey ? typeLabel : null;
    const locale = language === 'no' ? 'nb-NO' : language === 'sv' ? 'sv-SE' : 'en-GB';
    const since = person.createdAt
        ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(person.createdAt))
        : null;
    const initial = (person.name[0] || '?').toUpperCase();

    return (
        <div className="relative bg-white rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-5 text-left font-sans select-none">
            <div className="flex items-center gap-3">
                <span className="w-11 h-11 shrink-0 rounded-full bg-[#FAF9F5] border-2 border-[#EBEBE3] overflow-hidden flex items-center justify-center">
                    {person.photoURL
                        ? <img src={person.photoURL} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[15px] font-semibold text-stone-600">{initial}</span>}
                </span>
                <div className="min-w-0">
                    <p className="text-[19px] font-medium text-stone-900 tracking-tight leading-tight truncate">
                        {person.name}
                        {person.verified && <VerifiedMark size={16} label={t('profile.verified_label')} className="ml-1.5 align-[-2px]" />}
                    </p>
                    {specialty && <p className="text-[13px] text-stone-500 leading-snug truncate">{specialty}</p>}
                </div>
            </div>

            {/* The city is the card's big line, as the time is on a clock's:
                it is what a pin on a map is about. */}
            {person.location && (
                <p className="mt-3 text-[26px] font-medium text-stone-900 tracking-tight leading-none flex items-center gap-2">
                    <MapPin className="w-5 h-5 shrink-0 text-stone-400" />
                    <span className="truncate">{person.location.label}</span>
                </p>
            )}

            {since && <p className="mt-3 text-[13px] text-stone-500">{t('connect.member_since')} {since}</p>}

            {person.bio && (
                <p className="mt-3 text-[13px] text-stone-600 leading-snug line-clamp-2">{person.bio}</p>
            )}

            <div className="mt-4 flex gap-2">
                <button type="button" onClick={onOpen} className={`${btn.secondary('xs')} flex-1 justify-center cursor-pointer`}>
                    {t('connect.view_profile')}
                </button>
                {!isMe && (
                    <button
                        type="button"
                        onClick={onConnect}
                        aria-pressed={relationship === 'connected'}
                        className={`${relationship === 'connected' || relationship === 'outgoing' ? btn.secondary('xs') : btn.primary('xs')} flex-1 justify-center cursor-pointer`}
                    >
                        {connectLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

interface SongwriterMapProps {
    /**
     * How the minimised map is drawn. `banner` is the wide strip that leads
     * the People view; `card` is a tile the size of a songwriter card, so it
     * can sit first in the roster row on All. Both open the same full view.
     */
    variant?: 'banner' | 'card';
    /** Extra classes on the minimised element — the carousel's snap class, say. */
    className?: string;
    /**
     * Asked before opening from a press. The roster row is drag-to-scroll, so
     * a drag that happens to end on the card must not open the map; the row
     * knows whether the press was a drag, the card does not.
     */
    shouldOpen?: () => boolean;
}

export default function SongwriterMap({ variant = 'banner', className = '', shouldOpen }: SongwriterMapProps = {}) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    const [people, setPeople] = useState<PublicProfile[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [stage, setStage] = useState<Stage>('idle');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
    const [pickingCity, setPickingCity] = useState(false);
    const [saving, setSaving] = useState(false);
    // Where the viewer stands with each songwriter, for the cards' Connect.
    const { relationshipWith, byUid: connectionByUid } = useConnectionState();
    // The world city set, fetched when the map opens. Until it lands, the
    // hand-picked list stands in so the flow never waits on a download.
    const [worldCities, setWorldCities] = useState<City[] | null>(null);
    const [cityQuery, setCityQuery] = useState('');
    const cityPool = worldCities ?? CITIES;
    const cityMatches = useMemo(() => searchCities(cityPool, cityQuery), [cityPool, cityQuery]);

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
        router.push(uid === user?.uid ? '/platform/profile' : `/platform/profile/u/${uid}`);
    };

    /**
     * Connect, from a card: the same three moves the roster makes. Ask; or
     * accept theirs; or withdraw ours, which is also how you disconnect.
     */
    const connectWith = async (targetUid: string) => {
        if (!user) return;
        const relationship = relationshipWith(targetUid);
        const existing = connectionByUid[targetUid];
        try {
            if (relationship === 'incoming' && existing) await respondToConnectionRequest(existing.id, 'accepted');
            else if ((relationship === 'outgoing' || relationship === 'connected') && existing) await removeConnectionRequest(existing.id);
            else await sendConnectionRequest(user.uid, targetUid);
        } catch (err) {
            console.error('[map] Could not update connection:', err);
        }
    };

    // The pins, as plain data. The full view's pins open profiles; the
    // banner's do nothing. While a preview is up the viewer's saved pin steps
    // aside so there aren't two of them on the map.
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
        setCityQuery('');
        if (!worldCities) loadWorldCities().then(setWorldCities).catch((err) => console.error('[map] World cities failed to load:', err));
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

    // The full view must never let the browser zoom the page. The map handles
    // every wheel over itself, but the panels over it — the location card, the
    // title pill — are outside the map, and a trackpad pinch over one arrives
    // as a wheel with Ctrl held; left to the browser, that scales the whole
    // page, text and cards included, and the map then looks as if its labels
    // grew with the zoom. Plain wheels pass, so the city list still scrolls.
    const dialogRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = dialogRef.current;
        if (!expanded || !el) return;
        const onWheel = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [expanded]);

    const allowLocation = () => {
        if (!user) return;
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setStage('unsupported');
            return;
        }
        setStage('locating');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                // Snap against the full world set — waited for here if it is
                // still arriving, so the first fix is never matched against the
                // thin list and shown as a wrong city.
                let pool: City[] = cityPool;
                if (!worldCities) {
                    try { pool = await loadWorldCities(); setWorldCities(pool); } catch { /* thin list stands in */ }
                }
                const { city, distanceKm } = nearestCityIn(pool, pos.coords.latitude, pos.coords.longitude);
                setPreview({ city, name: viewerName, photoURL: user.photoURL ?? null, distanceKm });
                setFlyTo({ lat: city.lat, lng: city.lng, zoom: CITY_ZOOM });
                setStage('preview');
            },
            (err) => {
                setStage(err.code === err.PERMISSION_DENIED ? 'refused' : 'failed');
            },
            // High accuracy: on a phone that is GPS rather than a cell/IP guess,
            // which can be a whole city out. It only ever picks a city, so the
            // precision is spent on choosing the right one, not stored anywhere.
            { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5 * 60_000 },
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

    const previewCity = (city: City) => {
        if (!user) return;
        setPreview({ city, name: viewerName, photoURL: user.photoURL ?? null });
        setFlyTo({ lat: city.lat, lng: city.lng, zoom: CITY_ZOOM });
        setPickingCity(false);
        setCityQuery('');
        setStage('preview');
    };

    const panel = 'bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.14)] p-5';
    // The onboarding's own button: the green pill on its solid shadow, which
    // presses down. One family of main action everywhere, this panel included.
    const primary = `${btn.primaryBlock('lg')} cursor-pointer`;
    const quiet = 'text-[13px] font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer';

    return (
        <>
            {/* Minimised */}
            <button
                type="button"
                onClick={() => { if (!shouldOpen || shouldOpen()) open(); }}
                aria-label={t('connect.map_open')}
                className={`group relative overflow-hidden border border-stone-200/60 bg-[#EBEBE3] cursor-pointer text-left select-none active:scale-[0.995] transition-transform ${
                    variant === 'card'
                        // The songwriter card's exact footprint, so the row reads as
                        // one set of tiles with the map in the first slot.
                        ? 'min-w-[185px] max-w-[185px] shrink-0 min-h-[165px] rounded-[22px]'
                        : 'w-full h-[180px] sm:h-[220px] rounded-[22px]'
                } ${className}`}
            >
                {/* A still, close-in view of the viewer's part of the world: at
                    this zoom the globe is far bigger than the box, so it reads as
                    a flat pale map. The tile zooms out a step so a region shows,
                    not one city. The card carries no pins: at that size a name tag
                    and a photo cover the map, and the map is the point of the tile. */}
                <GlobeMap pins={variant === 'card' ? [] : bannerPins} centre={bannerCentre} zoom={variant === 'card' ? 4 : 5} interactive={false} className="absolute inset-0" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#F0F0EA]/90 via-transparent to-transparent" />
                {variant === 'card' ? (
                    <>
                        {/* Two words, one per line, where the songwriter cards keep
                            their name; the control bottom-right where their "+" is. */}
                        <span className="pointer-events-none absolute left-5 top-5 right-5 text-[21px] font-sans font-medium text-stone-700 tracking-tight leading-snug">
                            {t('connect.map_card_title')}
                            <br />
                            {t('connect.map_card_subtitle')}
                        </span>
                        <span className="pointer-events-none absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-700 group-hover:text-stone-900 transition-colors">
                            <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                    </>
                ) : (
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
                )}
            </button>

            {/* Full view: the whole globe, turned to face the viewer's own city
                if they have one, or Europe if not. Spin it, zoom in, and it
                flattens into a map of wherever you land. */}
            {expanded && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dialogRef}
                    className="fixed inset-0 z-[100] bg-[#1E3C74] animate-in fade-in duration-200"
                    // No page pinch-zoom from anywhere on the full view; the map's
                    // own pinch is handled by the map.
                    style={{ touchAction: 'none' }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('connect.map_title')}
                >
                    {/* The world city set doubles as the map's place names once it
                        is zoomed in; it is already fetched here for the picker. */}
                    <GlobeMap
                        pins={fullPins}
                        centre={me?.location ? { lat: me.location.lat, lng: me.location.lng } : GLOBE_CENTRE}
                        zoom="globe"
                        interactive
                        flyTo={flyTo}
                        cities={worldCities}
                        renderPinCard={(spec) => {
                            const person = people.find((p) => p.uid === spec.key);
                            if (!person) return null;
                            return (
                                <SongwriterCard
                                    person={person}
                                    isMe={person.uid === user?.uid}
                                    relationship={relationshipWith(person.uid)}
                                    onOpen={() => openProfile(person.uid)}
                                    onConnect={() => void connectWith(person.uid)}
                                />
                            );
                        }}
                        className="absolute inset-0"
                    />

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
                                        {/* The icon on its own, in ink, as the brand draws
                                            icons: no tinted disc behind it. */}
                                        <LocateFixed className="w-5 h-5 shrink-0 mt-0.5 text-stone-800" />

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
                                        {preview.distanceKm !== undefined && preview.distanceKm > FAR_FROM_CITY_KM && (
                                            <p className="text-[13px] text-[#8a6d1f] mt-2 leading-snug">
                                                {t('connect.map_far_from_city')
                                                    .replace('{city}', preview.city.label)
                                                    .replace('{km}', String(Math.round(preview.distanceKm)))}
                                            </p>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => void saveCity(preview.city)} disabled={saving} className={primary}>
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
                                    {/* Search, not a dropdown: the list is every city over 100k
                                        in the world, and nobody scrolls six thousand options. */}
                                    <input
                                        type="text"
                                        value={cityQuery}
                                        onChange={(e) => setCityQuery(e.target.value)}
                                        placeholder={t('connect.map_search_city')}
                                        autoFocus
                                        autoComplete="off"
                                        className="w-full bg-[#F6F6F0] border border-stone-200/70 rounded-full px-4 h-11 text-[14px] font-medium outline-none focus:border-stone-400 placeholder:text-stone-400"
                                    />
                                    {cityQuery.trim() && (
                                        <div className="max-h-56 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1">
                                            {cityMatches.length === 0 && (
                                                <p className="px-3 py-2 text-[13px] text-stone-400">{t('connect.map_no_city_match')}</p>
                                            )}
                                            {cityMatches.map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => previewCity(c)}
                                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F6F6F0] transition-colors cursor-pointer flex items-baseline justify-between gap-3"
                                                >
                                                    <span className="text-[14px] font-medium text-stone-800 truncate">{c.label}</span>
                                                    <span className="text-[12px] text-stone-400 shrink-0">{c.country}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[10.5px] text-stone-400">{t('connect.map_data_credit')}</p>
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
                                    className={primary}
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
