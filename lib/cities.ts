/**
 * The cities a songwriter can place themself in.
 *
 * A fixed list rather than a geocoder: it needs no external service, nothing
 * to allow in the CSP, and — the real reason — it keeps location to the level
 * of a city. Nobody is asked for an address, and nobody's pin is more precise
 * than "Stockholm". Nordic cities first, since that is where most of the
 * platform is; the rest is where songwriters tend to be.
 */
export interface City {
    id: string;
    label: string;
    country: string;
    lat: number;
    lng: number;
}

export const CITIES: City[] = [
    // Nordics
    { id: 'stockholm', label: 'Stockholm', country: 'SE', lat: 59.3293, lng: 18.0686 },
    { id: 'gothenburg', label: 'Göteborg', country: 'SE', lat: 57.7089, lng: 11.9746 },
    { id: 'malmo', label: 'Malmö', country: 'SE', lat: 55.6050, lng: 13.0038 },
    { id: 'uppsala', label: 'Uppsala', country: 'SE', lat: 59.8586, lng: 17.6389 },
    { id: 'oslo', label: 'Oslo', country: 'NO', lat: 59.9139, lng: 10.7522 },
    { id: 'bergen', label: 'Bergen', country: 'NO', lat: 60.3913, lng: 5.3221 },
    { id: 'trondheim', label: 'Trondheim', country: 'NO', lat: 63.4305, lng: 10.3951 },
    { id: 'stavanger', label: 'Stavanger', country: 'NO', lat: 58.9700, lng: 5.7331 },
    { id: 'tromso', label: 'Tromsø', country: 'NO', lat: 69.6492, lng: 18.9553 },
    { id: 'copenhagen', label: 'København', country: 'DK', lat: 55.6761, lng: 12.5683 },
    { id: 'aarhus', label: 'Aarhus', country: 'DK', lat: 56.1629, lng: 10.2039 },
    { id: 'helsinki', label: 'Helsinki', country: 'FI', lat: 60.1699, lng: 24.9384 },
    { id: 'tampere', label: 'Tampere', country: 'FI', lat: 61.4978, lng: 23.7610 },
    { id: 'reykjavik', label: 'Reykjavík', country: 'IS', lat: 64.1466, lng: -21.9426 },
    // Europe
    { id: 'london', label: 'London', country: 'GB', lat: 51.5074, lng: -0.1278 },
    { id: 'manchester', label: 'Manchester', country: 'GB', lat: 53.4808, lng: -2.2426 },
    { id: 'dublin', label: 'Dublin', country: 'IE', lat: 53.3498, lng: -6.2603 },
    { id: 'berlin', label: 'Berlin', country: 'DE', lat: 52.5200, lng: 13.4050 },
    { id: 'hamburg', label: 'Hamburg', country: 'DE', lat: 53.5511, lng: 9.9937 },
    { id: 'amsterdam', label: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
    { id: 'paris', label: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
    { id: 'madrid', label: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
    { id: 'barcelona', label: 'Barcelona', country: 'ES', lat: 41.3874, lng: 2.1686 },
    { id: 'lisbon', label: 'Lisboa', country: 'PT', lat: 38.7223, lng: -9.1393 },
    { id: 'rome', label: 'Roma', country: 'IT', lat: 41.9028, lng: 12.4964 },
    { id: 'milan', label: 'Milano', country: 'IT', lat: 45.4642, lng: 9.1900 },
    { id: 'vienna', label: 'Wien', country: 'AT', lat: 48.2082, lng: 16.3738 },
    { id: 'prague', label: 'Praha', country: 'CZ', lat: 50.0755, lng: 14.4378 },
    { id: 'warsaw', label: 'Warszawa', country: 'PL', lat: 52.2297, lng: 21.0122 },
    { id: 'tallinn', label: 'Tallinn', country: 'EE', lat: 59.4370, lng: 24.7536 },
    { id: 'riga', label: 'Rīga', country: 'LV', lat: 56.9496, lng: 24.1052 },
    { id: 'athens', label: 'Athens', country: 'GR', lat: 37.9838, lng: 23.7275 },
    { id: 'istanbul', label: 'İstanbul', country: 'TR', lat: 41.0082, lng: 28.9784 },
    // Americas
    { id: 'new_york', label: 'New York', country: 'US', lat: 40.7128, lng: -74.0060 },
    { id: 'boston', label: 'Boston', country: 'US', lat: 42.3601, lng: -71.0589 },
    { id: 'philadelphia', label: 'Philadelphia', country: 'US', lat: 39.9526, lng: -75.1652 },
    { id: 'atlanta', label: 'Atlanta', country: 'US', lat: 33.7490, lng: -84.3880 },
    { id: 'miami', label: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918 },
    { id: 'nashville', label: 'Nashville', country: 'US', lat: 36.1627, lng: -86.7816 },
    { id: 'chicago', label: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
    { id: 'minneapolis', label: 'Minneapolis', country: 'US', lat: 44.9778, lng: -93.2650 },
    { id: 'austin', label: 'Austin', country: 'US', lat: 30.2672, lng: -97.7431 },
    { id: 'houston', label: 'Houston', country: 'US', lat: 29.7604, lng: -95.3698 },
    { id: 'denver', label: 'Denver', country: 'US', lat: 39.7392, lng: -104.9903 },
    { id: 'los_angeles', label: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
    { id: 'san_francisco', label: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194 },
    { id: 'seattle', label: 'Seattle', country: 'US', lat: 47.6062, lng: -122.3321 },
    { id: 'vancouver', label: 'Vancouver', country: 'CA', lat: 49.2827, lng: -123.1207 },
    { id: 'toronto', label: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
    { id: 'montreal', label: 'Montréal', country: 'CA', lat: 45.5017, lng: -73.5673 },
    { id: 'mexico_city', label: 'Ciudad de México', country: 'MX', lat: 19.4326, lng: -99.1332 },
    { id: 'bogota', label: 'Bogotá', country: 'CO', lat: 4.7110, lng: -74.0721 },
    { id: 'lima', label: 'Lima', country: 'PE', lat: -12.0464, lng: -77.0428 },
    { id: 'santiago', label: 'Santiago', country: 'CL', lat: -33.4489, lng: -70.6693 },
    { id: 'sao_paulo', label: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
    { id: 'rio', label: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lng: -43.1729 },
    { id: 'buenos_aires', label: 'Buenos Aires', country: 'AR', lat: -34.6037, lng: -58.3816 },
    // Africa & Middle East
    { id: 'lagos', label: 'Lagos', country: 'NG', lat: 6.5244, lng: 3.3792 },
    { id: 'nairobi', label: 'Nairobi', country: 'KE', lat: -1.2921, lng: 36.8219 },
    { id: 'cape_town', label: 'Cape Town', country: 'ZA', lat: -33.9249, lng: 18.4241 },
    { id: 'johannesburg', label: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473 },
    { id: 'cairo', label: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357 },
    { id: 'dubai', label: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
    { id: 'tel_aviv', label: 'Tel Aviv', country: 'IL', lat: 32.0853, lng: 34.7818 },
    // Asia & Oceania
    { id: 'mumbai', label: 'Mumbai', country: 'IN', lat: 19.0760, lng: 72.8777 },
    { id: 'delhi', label: 'Delhi', country: 'IN', lat: 28.6139, lng: 77.2090 },
    { id: 'bangalore', label: 'Bengaluru', country: 'IN', lat: 12.9716, lng: 77.5946 },
    { id: 'karachi', label: 'Karachi', country: 'PK', lat: 24.8607, lng: 67.0011 },
    { id: 'dhaka', label: 'Dhaka', country: 'BD', lat: 23.8103, lng: 90.4125 },
    { id: 'colombo', label: 'Colombo', country: 'LK', lat: 6.9271, lng: 79.8612 },
    { id: 'singapore', label: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
    { id: 'kuala_lumpur', label: 'Kuala Lumpur', country: 'MY', lat: 3.1390, lng: 101.6869 },
    { id: 'jakarta', label: 'Jakarta', country: 'ID', lat: -6.2088, lng: 106.8456 },
    { id: 'bandung', label: 'Bandung', country: 'ID', lat: -6.9175, lng: 107.6191 },
    { id: 'yogyakarta', label: 'Yogyakarta', country: 'ID', lat: -7.7956, lng: 110.3695 },
    { id: 'surabaya', label: 'Surabaya', country: 'ID', lat: -7.2575, lng: 112.7521 },
    { id: 'denpasar', label: 'Bali (Denpasar)', country: 'ID', lat: -8.6705, lng: 115.2126 },
    { id: 'manila', label: 'Manila', country: 'PH', lat: 14.5995, lng: 120.9842 },
    { id: 'cebu', label: 'Cebu', country: 'PH', lat: 10.3157, lng: 123.8854 },
    { id: 'bangkok', label: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
    { id: 'chiang_mai', label: 'Chiang Mai', country: 'TH', lat: 18.7883, lng: 98.9853 },
    { id: 'ho_chi_minh', label: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lng: 106.6297 },
    { id: 'hanoi', label: 'Hanoi', country: 'VN', lat: 21.0278, lng: 105.8342 },
    { id: 'hong_kong', label: 'Hong Kong', country: 'HK', lat: 22.3193, lng: 114.1694 },
    { id: 'taipei', label: 'Taipei', country: 'TW', lat: 25.0330, lng: 121.5654 },
    { id: 'seoul', label: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.9780 },
    { id: 'tokyo', label: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
    { id: 'osaka', label: 'Osaka', country: 'JP', lat: 34.6937, lng: 135.5023 },
    { id: 'shanghai', label: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
    { id: 'beijing', label: 'Beijing', country: 'CN', lat: 39.9042, lng: 116.4074 },
    { id: 'sydney', label: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
    { id: 'melbourne', label: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
    { id: 'brisbane', label: 'Brisbane', country: 'AU', lat: -27.4698, lng: 153.0251 },
    { id: 'perth', label: 'Perth', country: 'AU', lat: -31.9505, lng: 115.8605 },
    { id: 'auckland', label: 'Auckland', country: 'NZ', lat: -36.8485, lng: 174.7633 },
    { id: 'wellington', label: 'Wellington', country: 'NZ', lat: -41.2865, lng: 174.7762 },
];

export function findCity(id: string | null | undefined): City | null {
    if (!id) return null;
    return CITIES.find((c) => c.id === id) ?? null;
}

/** Great-circle distance in km. */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The city in `cities` closest to a coordinate — how a browser location becomes
 * a pin. This is the whole privacy mechanism: the exact position is used once,
 * here, to pick a city, and is never stored. Someone in a village gets the
 * nearest city on the list, which is the most precise thing the map will ever
 * say about them.
 */
export function nearestCityIn(cities: readonly City[], lat: number, lng: number): { city: City; distanceKm: number } {
    let best = cities[0];
    let bestDistance = Infinity;
    for (const city of cities) {
        const d = distanceKm(lat, lng, city.lat, city.lng);
        if (d < bestDistance) { best = city; bestDistance = d; }
    }
    return { city: best, distanceKm: bestDistance };
}

/** Nearest on the hand-picked list only. Kept for callers that never load the world set. */
export function nearestCity(lat: number, lng: number): { city: City; distanceKm: number } {
    return nearestCityIn(CITIES, lat, lng);
}

/**
 * The world's cities over 100,000 people, and the Nordics' over 15,000 —
 * GeoNames, CC BY 4.0, districts excluded; see scripts/build-world-cities.mjs
 * — with the hand-picked list merged in wherever GeoNames has nothing within
 * 10 km, so a curated label like "Bali (Denpasar)" is never lost.
 *
 * Why the world set at all: Bali snapping to Jakarta, 960 km away, was the
 * hand-picked list on its own; it was never going to be dense enough outside
 * the Nordics.
 *
 * Loaded lazily and cached: the generated module is ~300 KB and only the map
 * needs it, so it stays out of every other page's bundle.
 */
let worldCitiesPromise: Promise<City[]> | null = null;

export function loadWorldCities(): Promise<City[]> {
    if (worldCitiesPromise) return worldCitiesPromise;
    worldCitiesPromise = import('./worldCities.generated').then(({ WORLD_CITIES }) => {
        const world: City[] = WORLD_CITIES.map(([id, label, country, lat, lng]) => ({
            id: `gn:${id}`,
            label,
            country,
            lat,
            lng,
        }));
        // Curated entries fill the gaps only — a second "Stockholm" 2 km from
        // GeoNames' would just make the search list stutter.
        for (const c of CITIES) {
            const covered = world.some((w) => distanceKm(c.lat, c.lng, w.lat, w.lng) < 10);
            if (!covered) world.push(c);
        }
        return world;
    });
    return worldCitiesPromise;
}

/** Strip accents so "Goteborg" finds Göteborg and "Malmo" finds Malmö. */
function fold(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Type-ahead over a city list. Prefix matches first (what you'd expect typing
 * "Sto"), then the rest; within each group the list's own order holds, and the
 * world set is sorted by population, so "San" gives San Francisco before San
 * Fernando.
 */
export function searchCities(cities: readonly City[], query: string, limit = 8): City[] {
    const q = fold(query.trim());
    if (!q) return [];
    const prefix: City[] = [];
    const inner: City[] = [];
    for (const c of cities) {
        const name = fold(c.label);
        if (name.startsWith(q)) prefix.push(c);
        else if (name.includes(q)) inner.push(c);
        if (prefix.length >= limit) break;
    }
    return [...prefix, ...inner].slice(0, limit);
}
