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
    { id: 'los_angeles', label: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
    { id: 'nashville', label: 'Nashville', country: 'US', lat: 36.1627, lng: -86.7816 },
    { id: 'chicago', label: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
    { id: 'austin', label: 'Austin', country: 'US', lat: 30.2672, lng: -97.7431 },
    { id: 'toronto', label: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
    { id: 'montreal', label: 'Montréal', country: 'CA', lat: 45.5017, lng: -73.5673 },
    { id: 'mexico_city', label: 'Ciudad de México', country: 'MX', lat: 19.4326, lng: -99.1332 },
    { id: 'sao_paulo', label: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
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
    { id: 'singapore', label: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
    { id: 'jakarta', label: 'Jakarta', country: 'ID', lat: -6.2088, lng: 106.8456 },
    { id: 'manila', label: 'Manila', country: 'PH', lat: 14.5995, lng: 120.9842 },
    { id: 'bangkok', label: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
    { id: 'seoul', label: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.9780 },
    { id: 'tokyo', label: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
    { id: 'shanghai', label: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
    { id: 'sydney', label: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
    { id: 'melbourne', label: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
    { id: 'auckland', label: 'Auckland', country: 'NZ', lat: -36.8485, lng: 174.7633 },
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
 * The listed city closest to a coordinate — how a browser location becomes a
 * pin. This is the whole privacy mechanism: the exact position is used once,
 * here, to pick a city, and is never stored. Someone in a village gets the
 * nearest city on the list, which is the most precise thing the map will ever
 * say about them.
 */
export function nearestCity(lat: number, lng: number): { city: City; distanceKm: number } {
    let best = CITIES[0];
    let bestDistance = Infinity;
    for (const city of CITIES) {
        const d = distanceKm(lat, lng, city.lat, city.lng);
        if (d < bestDistance) { best = city; bestDistance = d; }
    }
    return { city: best, distanceKm: bestDistance };
}
