#!/usr/bin/env node
/**
 * Rebuilds lib/worldCities.generated.ts from GeoNames' cities15000 dump.
 *
 *   1. Download https://download.geonames.org/export/dump/cities15000.zip
 *   2. Unzip cities15000.txt somewhere
 *   3. node scripts/build-world-cities.mjs path/to/cities15000.txt
 *
 * What gets in:
 *   - anywhere in the world: population >= 100,000
 *   - Norway, Sweden, Denmark, Finland, Iceland: population >= 15,000 — the
 *     home market at a finer grain, so Ålesund and Bodø are cities and not
 *     "235 km from Bergen"
 *   - never feature code PPLX, "section of populated place": GeoNames lists
 *     Södermalm, Bushwick and Dubai Marina over 100k, and nobody says they
 *     live in Bushwick when asked which city they are in
 *
 * Output is sorted by population, descending, so a list search that keeps
 * source order ranks big cities first for free.
 *
 * GeoNames data is CC BY 4.0; the map credits it in the city picker.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = process.argv[2];
if (!src) {
    console.error('usage: node scripts/build-world-cities.mjs <cities15000.txt>');
    process.exit(1);
}

const GLOBAL_MIN_POP = 100_000;
const NORDIC_MIN_POP = 15_000;
const NORDIC = new Set(['NO', 'SE', 'DK', 'FI', 'IS']);

// Tab-separated columns per GeoNames readme.
const COL = { id: 0, name: 1, lat: 4, lng: 5, featureCode: 7, country: 8, population: 14 };

const rows = readFileSync(src, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter((c) => c[COL.featureCode] !== 'PPLX')
    .map((c) => ({
        id: c[COL.id],
        name: c[COL.name],
        country: c[COL.country],
        lat: Number(Number(c[COL.lat]).toFixed(4)),
        lng: Number(Number(c[COL.lng]).toFixed(4)),
        population: Number(c[COL.population]),
    }))
    .filter((c) => c.population >= (NORDIC.has(c.country) ? NORDIC_MIN_POP : GLOBAL_MIN_POP))
    .sort((a, b) => b.population - a.population);

const out = resolve('lib/worldCities.generated.ts');
const body = rows.map((c) => `    ${JSON.stringify([c.id, c.name, c.country, c.lat, c.lng])},`).join('\n');
writeFileSync(
    out,
    `// GENERATED — do not edit by hand. Source: GeoNames cities15000 (CC BY 4.0,
// https://www.geonames.org/). Population ≥ ${GLOBAL_MIN_POP.toLocaleString('en')} worldwide,
// ≥ ${NORDIC_MIN_POP.toLocaleString('en')} in the Nordics, districts (PPLX) excluded. Rebuild with
// scripts/build-world-cities.mjs. ${rows.length} cities.
//
// Loaded lazily by the songwriter map, only when it opens: the module is a
// few hundred KB and nothing else on the platform needs it.
export type WorldCityTuple = [id: string, name: string, country: string, lat: number, lng: number];
export const WORLD_CITIES: WorldCityTuple[] = [
${body}
];
`,
);

const nordic = rows.filter((c) => NORDIC.has(c.country)).length;
console.log(`wrote ${out}: ${rows.length} cities (${nordic} Nordic), ${(body.length / 1024).toFixed(0)} KB`);
