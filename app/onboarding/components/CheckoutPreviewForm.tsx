"use client";

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * The card form, as it will feel — a stand-in for Paddle's inline checkout so
 * the last screen of the flow can be walked and reviewed before payments are
 * live.
 *
 * READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 * It takes card-shaped input and does nothing with it, on purpose. Every field
 * is local state and dies with the component: nothing is submitted, stored,
 * logged, or read back out. There is no network call in this file and there
 * must never be one — the moment this posts anywhere it stops being a mockup of
 * a checkout and becomes an unlicensed one.
 *
 * Three things keep it honest, and all three should survive future edits:
 *
 *   1. It only renders where there is no real checkout to run. PaywallPlans
 *      mounts it under `!purchasable`, so the day Paddle is configured this
 *      disappears on its own and the genuine iframe takes the space. It cannot
 *      end up sitting next to a live payment form.
 *   2. `autoComplete="off"` throughout, so a browser or password manager never
 *      drops a real saved card into a form that isn't going anywhere.
 *   3. The section header carries a preview tag. It is small, because the point
 *      of this screen is to feel like the real thing — but it is there, because
 *      a form that looks exactly like a card form and says nothing is one a
 *      real person could type a real card into.
 *
 * Anything typed is accepted. Formatting is cosmetic — spacing the digits,
 * inserting the slash in the expiry — and nothing is validated, because the job
 * is the feel of filling it in, not the correctness of what goes in.
 */

// Where the spaces fall in a printed card number. Amex prints 4-6-5; everyone
// else prints in fours, which is why this is keyed on the brand rather than
// applied blindly every four digits.
const AMEX_GROUPS = [4, 6, 5];
const DEFAULT_GROUPS = [4, 4, 4, 4];

const brandOf = (digits: string): 'amex' | 'visa' | 'mastercard' | null => {
    if (/^3[47]/.test(digits)) return 'amex';
    if (/^4/.test(digits)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
    return null;
};

const groupDigits = (digits: string, groups: number[]) => {
    const out: string[] = [];
    let at = 0;
    for (const size of groups) {
        if (at >= digits.length) break;
        out.push(digits.slice(at, at + size));
        at += size;
    }
    return out.join(' ');
};

/**
 * The countries offered, as ISO codes rather than names — `Intl.DisplayNames`
 * turns them into whatever language the page is in, so this list never needs
 * translating and never drifts between locales.
 */
const COUNTRIES = ['SE', 'NO', 'DK', 'FI', 'GB', 'DE', 'NL', 'FR', 'ES', 'US', 'CA', 'AU'];

const FIELD =
    'w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-[15px] font-medium text-stone-900 outline-none transition-colors placeholder:font-normal placeholder:text-stone-400 focus:border-[#86BE7F]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-stone-600';

/** The card marks, drawn rather than fetched — no network, even for a logo. */
const BrandMark = ({ brand }: { brand: ReturnType<typeof brandOf> }) => {
    if (!brand) return null;

    if (brand === 'visa') {
        return (
            <span className="rounded bg-[#1434CB] px-1.5 py-1 text-[10px] font-bold italic tracking-tight text-white">
                VISA
            </span>
        );
    }
    if (brand === 'mastercard') {
        return (
            <span aria-hidden="true" className="flex items-center">
                <span className="h-4 w-4 rounded-full bg-[#EB001B]" />
                <span className="-ml-1.5 h-4 w-4 rounded-full bg-[#F79E1B] mix-blend-multiply" />
            </span>
        );
    }
    return (
        <span className="rounded bg-[#006FCF] px-1.5 py-1 text-[10px] font-bold tracking-tight text-white">
            AMEX
        </span>
    );
};

export default function CheckoutPreviewForm() {
    const { t, language } = useLanguage();
    const [number, setNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');
    const [country, setCountry] = useState('SE');
    const [postal, setPostal] = useState('');

    const digits = number.replace(/\D/g, '');
    const brand = brandOf(digits);
    const maxDigits = brand === 'amex' ? 15 : 16;

    const countryNames = new Intl.DisplayNames([language], { type: 'region' });

    const handleNumber = (raw: string) => {
        const cleaned = raw.replace(/\D/g, '').slice(0, maxDigits);
        setNumber(groupDigits(cleaned, brandOf(cleaned) === 'amex' ? AMEX_GROUPS : DEFAULT_GROUPS));
    };

    // The slash arrives on its own as soon as there is a month to separate, and
    // survives being backspaced through — typing "12" then deleting shouldn't
    // strand a "/" the visitor has to clear by hand.
    const handleExpiry = (raw: string) => {
        const cleaned = raw.replace(/\D/g, '').slice(0, 4);
        setExpiry(cleaned.length >= 3 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned);
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="cp-number" className={LABEL}>
                    {t('onboarding.paywall.checkout_form.card_number')}
                </label>
                <div className="relative">
                    <input
                        id="cp-number"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={number}
                        onChange={(e) => handleNumber(e.target.value)}
                        placeholder="1234 1234 1234 1234"
                        className={`${FIELD} pr-16`}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                        <BrandMark brand={brand} />
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="cp-expiry" className={LABEL}>
                        {t('onboarding.paywall.checkout_form.expiry')}
                    </label>
                    <input
                        id="cp-expiry"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={expiry}
                        onChange={(e) => handleExpiry(e.target.value)}
                        placeholder={t('onboarding.paywall.checkout_form.expiry_placeholder')}
                        className={FIELD}
                    />
                </div>
                <div>
                    <label htmlFor="cp-cvc" className={LABEL}>
                        {t('onboarding.paywall.checkout_form.cvc')}
                    </label>
                    <input
                        id="cp-cvc"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3))}
                        placeholder={brand === 'amex' ? '1234' : '123'}
                        className={FIELD}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="cp-name" className={LABEL}>
                    {t('onboarding.paywall.checkout_form.name')}
                </label>
                <input
                    id="cp-name"
                    type="text"
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('onboarding.paywall.checkout_form.name_placeholder')}
                    className={FIELD}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="cp-country" className={LABEL}>
                        {t('onboarding.paywall.checkout_form.country')}
                    </label>
                    <select
                        id="cp-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={`${FIELD} appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10`}
                        style={{
                            backgroundImage:
                                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                        }}
                    >
                        {COUNTRIES.map((code) => (
                            <option key={code} value={code}>
                                {countryNames.of(code) ?? code}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="cp-postal" className={LABEL}>
                        {t('onboarding.paywall.checkout_form.postal')}
                    </label>
                    <input
                        id="cp-postal"
                        type="text"
                        autoComplete="off"
                        value={postal}
                        onChange={(e) => setPostal(e.target.value)}
                        placeholder="123 45"
                        className={FIELD}
                    />
                </div>
            </div>

            {/* The total, last, where every checkout puts it. It is the one
                number on this form that is not a placeholder: nothing is
                charged today, and that stays true whether or not the fields
                above are filled in. */}
            <div className="flex items-baseline justify-between border-t border-white/60 pt-4">
                <span className="text-[13px] font-semibold text-stone-600">
                    {t('onboarding.paywall.checkout_form.due_today')}
                </span>
                <span className="text-xl font-sans font-bold tracking-tight text-stone-900">$0.00</span>
            </div>
        </div>
    );
}
