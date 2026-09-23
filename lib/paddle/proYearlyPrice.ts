import "server-only";
import { FALLBACK_PRICING, getPriceId } from "./config";
import { getPaddle } from "./server";

/**
 * What a year of Veinote Pro costs, as Paddle's catalog says today.
 *
 * The Golden program's activation card strikes this figure through to zero,
 * so it has to be the real price, and it has to move when the price does
 * rather than wait for someone to edit a number in the page's copy.
 *
 * Read on the server from the configured Pro yearly price (internal plan id
 * `max`), so a public page pulls in no billing script to show a number. That
 * is the catalog's list price in its own currency; a country override in
 * Paddle is what the checkout applies, not what this reads.
 *
 * Paddle is only asked once every ten minutes per server instance. When it
 * is not configured, or does not answer, the figure falls back to the one in
 * config (the monthly-equivalent there, times twelve), so the card never
 * shows nothing.
 */

export interface YearlyPrice {
    /** Whole units of the currency, e.g. 468 for $468.00. */
    amount: number;
    /** ISO 4217, e.g. "USD". */
    currency: string;
    source: "paddle" | "fallback";
}

const TTL_MS = 10 * 60 * 1000;
let cached: { value: YearlyPrice; at: number } | null = null;

function fallback(): YearlyPrice {
    return { amount: FALLBACK_PRICING.max.yearly * 12, currency: "USD", source: "fallback" };
}

/** Minor units per major for a currency: 2 for USD and SEK, 0 for JPY. */
function minorDigits(currency: string): number {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export async function proYearlyPrice(): Promise<YearlyPrice> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

    const paddle = getPaddle();
    const priceId = getPriceId("max", "yearly");
    if (!paddle || !priceId) return fallback();

    try {
        const price = await paddle.prices.get(priceId);
        const currency = price.unitPrice.currencyCode;
        const minor = Number(price.unitPrice.amount);
        if (!currency || !Number.isFinite(minor) || minor <= 0) return fallback();

        const value: YearlyPrice = {
            amount: Math.round(minor / 10 ** minorDigits(currency)),
            currency,
            source: "paddle",
        };
        cached = { value, at: Date.now() };
        return value;
    } catch (err) {
        console.error("[paddle] reading the Pro yearly price failed; showing the fallback:", err);
        return fallback();
    }
}
