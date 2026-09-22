"use client";

import { useMemo, useState } from 'react';
import GlobeMap, { type PinSpec } from '@/app/platform/connect/components/GlobeMap';
import { GOLDEN } from '../content';

/**
 * Connect's own globe, on a page nobody is signed in to.
 *
 * Inside the product this map is drawn from `publicProfiles`, which the rules
 * keep to signed-in readers, and rightly: it is where real songwriters said
 * they are. A visitor holding an invitation has no account and must not be
 * shown those people, so the pins here are examples — invented names in real
 * cities, standing for what the map holds rather than showing who is on it.
 *
 * That distinction is the reason this is not the Connect component with its
 * fetch disabled. `GlobeMap` takes its pins as a prop and fetches nothing, so
 * the page passes its own and there is no code path here that could ever reach
 * a real profile.
 *
 * The map is the same drawing, though, and stays interactive: it can be turned
 * and pulled about, which is most of what makes a globe worth showing.
 */
export default function TogetherMap() {
    const [active, setActive] = useState<string | null>(GOLDEN.mapPins[0]?.key ?? null);

    const pins = useMemo<PinSpec[]>(
        () =>
            GOLDEN.mapPins.map((pin) => ({
                key: pin.key,
                lat: pin.lat,
                lng: pin.lng,
                name: pin.name,
                // No faces. A photograph beside an invented name is the one
                // thing that would turn an illustration into a claim about a
                // person; the map draws its own initial when there is none.
                photoURL: null,
                highlight: pin.key === active,
                onClick: () => setActive(pin.key),
            })),
        [active],
    );

    const cities = useMemo(
        () => GOLDEN.mapPins.map((pin) => ({ label: pin.city, lat: pin.lat, lng: pin.lng })),
        [],
    );

    return (
        <div className="relative overflow-hidden rounded-[28px] border border-stone-300/50 bg-white/45">
            <GlobeMap
                pins={pins}
                centre={{ lat: 56, lng: 10 }}
                zoom="globe"
                interactive
                // Turnable, but drawn in the page's own tones. `interactive`
                // would otherwise bring the blue water with it, which belongs to
                // the opened map in Connect where the map IS the page; here it
                // is one section of several on beige.
                palette="still"
                cities={cities}
                // A name beside each pin rather than a bare dot: the point of
                // the section is that these are people, and a dot on its own
                // says only that somewhere is occupied. The map keeps two cards
                // from overlapping by holding the later one back until the globe
                // is turned to give it room.
                renderPinCard={(spec) => (
                    // `w-fit`, not a block: a card that fills the width it is
                    // offered overlaps every other one, and the map answers an
                    // overlap by holding the later card back — so a stretched
                    // card leaves exactly one name on the globe.
                    <span className="pointer-events-none inline-block w-fit whitespace-nowrap rounded-full border border-stone-300/70 bg-[#FCF7DE] px-2.5 py-1 text-[12px] font-medium leading-none text-stone-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                        {spec.name}
                    </span>
                )}
                // Just wide enough for a first name, so the globe can hold a
                // dozen at once instead of one.
                cardWidth={96}
                className="h-[420px] w-full sm:h-[520px] md:h-[640px]"
            />
        </div>
    );
}
