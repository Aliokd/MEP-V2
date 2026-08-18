"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';

/*
 * The app-wide Inter (app/layout.tsx) ships static instances at 300-700, so
 * anything lighter than 300 silently renders AS 300. The numeral wants a true
 * hairline, so this pulls one extra weight — scoped here, with preload off, so
 * only a visitor who actually lands on this screen downloads it instead of
 * every page carrying a font file for one error state.
 */
const numeral = Inter({
    subsets: ['latin'],
    weight: ['200'],
    display: 'swap',
    preload: false,
});

/**
 * The full-bleed "dead end" screen: the field photograph, a big numeral, one
 * line of explanation and a single way out. Used by app/not-found.tsx, and
 * built to be reused by any other empty/error state that wants the same
 * treatment — pass a different code and copy.
 *
 * It paints as a fixed layer above the site nav (z-50) on purpose. This screen
 * is a dead end by design and the photo is the whole point of it; a floating
 * logo and a row of marketing links over the sky is exactly the noise the
 * design removes. The one way out lives in the button.
 */
export default function ErrorScreen({
    code,
    title,
    action,
}: {
    /** The large numeral. */
    code: string;
    /** One line under it. Keep it short — it sits on the horizon. */
    title: string;
    /** The single way out. Defaults to a link home. */
    action?: React.ReactNode;
}) {
    const { language, t } = useLanguage();

    // The screen covers the site nav visually, but a covered nav is still in the
    // tab order and the accessibility tree. This flag lets globals.css take it
    // out of the document entirely for as long as this screen is mounted.
    useEffect(() => {
        document.documentElement.dataset.chromeless = 'true';
        return () => {
            delete document.documentElement.dataset.chromeless;
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[60] overflow-hidden bg-[#6f8f52] font-sans">
            {/* Not next/image: images.unoptimized is on, so this is the same
                bytes with none of the wrapper markup. AVIF (101 KB) with a WebP
                fallback for Safari < 16.4.

                One resolution on purpose. The source master is 1920×1080 and
                unusually soft to begin with, so a full-bleed backdrop is already
                being upscaled on any wide or hi-DPI screen — there is no detail
                below 1920 worth serving, and a srcset can latch onto the smaller
                candidate during a narrow first layout and never re-pick the
                large one, which is exactly how this ends up looking blurry. */}
            <picture>
                <source type="image/avif" srcSet="/assets/404/error-404.avif" />
                <source type="image/webp" srcSet="/assets/404/error-404.webp" />
                <img
                    src="/assets/404/error-404.webp"
                    alt=""
                    width={1920}
                    height={1080}
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                />
            </picture>

            {/* The sky the numeral sits on is nearly white. A short scrim off the
                top keeps white text legible there without reading as a filter. */}
            <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/25 to-transparent"
            />

            {/* Anchored above centre so the man and the television stay clear of
                the copy at every aspect ratio. */}
            <div className="relative flex h-full flex-col items-center justify-center px-6 pb-[38vh] text-center text-white">
                {/* leading-[0.82] trims the empty band Inter leaves above and
                    below a lone numeral. At this size line-height:1 would push
                    the subtitle a third of a screen away from it. */}
                <p className={`${numeral.className} text-[clamp(152px,19vw,344px)] font-extralight leading-[0.82] tracking-tight drop-shadow-[0_1px_18px_rgba(0,0,0,0.22)]`}>
                    {code}
                </p>

                <h1 className="mt-6 text-[clamp(19px,2vw,34px)] font-normal leading-snug drop-shadow-[0_1px_14px_rgba(0,0,0,0.22)]">
                    {title}
                </h1>

                <div className="mt-5">
                    {action ?? (
                        <Link
                            href={localizePath('/', language)}
                            className="inline-flex items-center justify-center rounded-full bg-black/90 px-8 py-2.5 text-base font-medium text-white shadow-lg transition-all hover:bg-black active:scale-[0.98]"
                        >
                            {t('not_found.home')}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
