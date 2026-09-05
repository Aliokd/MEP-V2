import Link from 'next/link';
import { Download } from 'lucide-react';
import type { Metadata } from 'next';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import CopyHex from './CopyHex';
import { resolveServerLocale } from '@/lib/server-locale';

/**
 * Brand guidelines and logo downloads — the shared language between product
 * and marketing, published where a collaborator can be handed one link.
 *
 * Deliberately English-only (see APP_OWNED_SEGMENTS in lib/i18n.ts): it's a
 * media-kit page for marketers, press, and partners, and a three-locale
 * version would triple the maintenance of a page whose audience works in
 * English anyway. The footer label still localizes.
 *
 * Every value here is the shipped product's, not an aspiration: the hex codes
 * come from the live pages and SVG artwork, the button is the onboarding
 * "Next" button, and the lyric specimen uses the same font-lyrics face the
 * canvas renders. When the product changes, this page changes with it.
 */

export const metadata: Metadata = {
    title: 'Brand Guidelines | Veinote',
    description:
        "Veinote's brand guidelines: logo downloads and usage, colors, typography, and voice: the shared language for everything we make.",
    alternates: { canonical: '/guidelines' },
};

const CORE_COLORS = [
    { name: 'Paper', hex: '#E6E3DB', use: "Marketing background. The brand's ground." },
    { name: 'Ink', hex: '#363636', use: 'Headlines, body, logo on light.' },
    { name: 'Veinote Green', hex: '#86BE7F', use: 'CTAs and brand accent. Reserved for action.' },
    { name: 'Lime', hex: '#EDFF8E', use: 'Energy moments: urgency, highlights, tags.' },
];

const ACCENT_COLORS = [
    { name: 'Periwinkle', hex: '#A2B0DF' },
    { name: 'Veinote Green', hex: '#86BE7F' },
    { name: 'Cream', hex: '#FBFFED' },
    { name: 'Blossom Pink', hex: '#FBB1FF' },
    { name: 'Sage', hex: '#ADCDC0' },
    { name: 'Warm Gray', hex: '#B5B7AA' },
    { name: 'Lime', hex: '#EDFF8E' },
];

const SURFACE_COLORS = [
    { name: 'App Paper', hex: '#FAF9F5', use: 'Product background (lighter than marketing paper).' },
    { name: 'Sage Paper', hex: '#EFF0E7', use: 'Q&A / calm sections.' },
    { name: 'Stone Green', hex: '#D7D8CD', use: 'Feature sections.' },
    { name: 'Footer Moss', hex: '#D3D6CB', use: 'Footer, closing sections.' },
    { name: 'Gold', hex: '#C5A059', use: 'Premium accents.' },
    { name: 'Press Green', hex: '#5F9857', use: "Only as the primary button's offset shadow." },
];

const QUARTET = [
    { name: 'Chords', hex: '#86BE7F' },
    { name: 'Lyrics', hex: '#8EC9F0' },
    { name: 'Melody', hex: '#B79DF0' },
    { name: 'Vibe', hex: '#F0A8C9' },
];

/*
 * One entry per mark, listing the formats that exist for it rather than a
 * single "SVG / PNG" link — which is what this was, pointing at one file and
 * naming two. The PNGs are rendered from the vectors by
 * scripts/build-brand-rasters.mjs; the icon has no vector, so it offers the
 * one format it has instead of a button that would 404.
 */
const LOGO_DOWNLOADS = [
    {
        name: 'Wordmark (ink)',
        note: 'The primary logo. For paper and any light background.',
        previewClass: 'bg-[#E6E3DB]',
        img: '/assets/brand/veinote-wordmark-ink.svg',
        svg: '/assets/brand/veinote-wordmark-ink.svg',
        png: '/assets/brand/veinote-wordmark-ink.png',
    },
    {
        name: 'Wordmark (white)',
        note: 'For photography and dark grounds.',
        previewClass: 'bg-[#363636]',
        img: '/assets/brand/veinote-wordmark-white.svg',
        svg: '/assets/brand/veinote-wordmark-white.svg',
        png: '/assets/brand/veinote-wordmark-white.png',
    },
    {
        name: 'Serif lockup ™',
        note: 'The large display lockup, as used in the site footer.',
        previewClass: 'bg-[#D3D6CB]',
        img: '/assets/brand/veinote-logo-serif.svg',
        svg: '/assets/brand/veinote-logo-serif.svg',
        png: '/assets/brand/veinote-logo-serif.png',
    },
    {
        name: 'Icon',
        note: 'Avatars, favicons, and app-icon contexts.',
        previewClass: 'bg-[#FAF9F5]',
        img: '/assets/brand/veinote-icon.png',
        png: '/assets/brand/veinote-icon.png',
        iconPreview: true,
    },
];

function DownloadPill({ href, label, name }: { href: string; label: string; name: string }) {
    return (
        <a
            href={href}
            download
            // The visible text is just the format; the accessible name says
            // which mark it belongs to, since the page carries seven of them.
            aria-label={`Download ${name} as ${label}`}
            className="flex items-center gap-1.5 rounded-full border border-stone-400/60 px-3.5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-white transition-colors"
        >
            <Download size={14} className="stroke-[2.25px]" />
            {label}
        </a>
    );
}

function Swatch({ name, hex, use }: { name: string; hex: string; use?: string }) {
    return (
        <div className="rounded-2xl overflow-hidden border border-stone-300/60 bg-[#F7F6F1]">
            <div className="h-20" style={{ backgroundColor: hex }} />
            <div className="px-4 py-3">
                <div className="font-semibold text-[15px] text-stone-800">{name}</div>
                <CopyHex hex={hex} />
                {use && <div className="text-xs text-stone-500 mt-1 leading-relaxed">{use}</div>}
            </div>
        </div>
    );
}

function SectionHeading({ n, children }: { n: string; children: React.ReactNode }) {
    return (
        <h2 className="border-t-2 border-stone-800 pt-4 mt-16 text-2xl md:text-3xl font-semibold tracking-tight text-stone-800">
            <span className="text-stone-400 mr-3">{n}</span>
            {children}
        </h2>
    );
}

export default async function GuidelinesPage() {
    const { language } = await resolveServerLocale();

    return (
        <div className="min-h-screen bg-[#E6E3DB] font-sans text-stone-800">
            <div className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                {/* Hero. No wordmark above the title: the page hands out the logo
                    further down, under rules about how to use it, and a loose one
                    up here was the page breaking its own first instruction. */}
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] max-w-2xl">
                    Guidelines
                </h1>
                <p className="text-stone-600 mt-5 max-w-xl leading-relaxed">
                    The shared language for everything we make, extracted from the shipped
                    product. If your content matches this page, it looks and sounds like it
                    came from the same hands as the app.
                </p>

                {/* 1 · What Veinote is */}
                <SectionHeading n="1">What Veinote is</SectionHeading>
                <blockquote className="border-l-[3px] border-[#86BE7F] pl-5 my-6 text-lg font-medium max-w-xl">
                    Veinote is the home of human songwriting. No AI-generated songs. You
                    create them, you own them.
                </blockquote>
                <p className="max-w-2xl leading-relaxed">
                    <strong className="font-semibold">The promise:</strong> the complete songwriting
                    journey, from first lyric idea to finished song.{' '}
                    <strong className="font-semibold">The four pillars</strong>, always in this
                    order: <em>Learn. Create. Practice. Connect.</em>
                </p>
                <ul className="list-disc pl-5 mt-4 space-y-2 max-w-2xl text-[15px] leading-relaxed">
                    <li>&ldquo;The home of human songwriting&rdquo; is the tagline.</li>
                    <li>&ldquo;No AI-generated songs. You create them. You own them.&rdquo; is the stance.</li>
                    <li>&ldquo;The complete songwriting journey.&rdquo; is the promise.</li>
                    <li>&ldquo;Designed by humans with love, in Stockholm.&rdquo; is the sign-off.</li>
                </ul>

                {/* 2 · Logo */}
                <SectionHeading n="2">Logo: downloads &amp; usage</SectionHeading>
                <p className="text-stone-600 mt-3 max-w-2xl leading-relaxed">
                    The Veinote wordmark is a hand-drawn italic script, the brand&rsquo;s most
                    expressive asset. It never gets redrawn, stretched, or set in a font.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {LOGO_DOWNLOADS.map((logo) => (
                        <div
                            key={logo.name}
                            className="rounded-3xl overflow-hidden border border-stone-300/60 bg-[#F7F6F1] flex flex-col"
                        >
                            <div className={`${logo.previewClass} h-36 flex items-center justify-center p-8`}>
                                <img
                                    src={logo.img}
                                    alt={logo.name}
                                    className={logo.iconPreview ? 'h-16 w-16 rounded-2xl' : 'w-full max-w-[220px] h-auto'}
                                />
                            </div>
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-semibold text-[15px]">{logo.name}</div>
                                    <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{logo.note}</div>
                                </div>
                                {/* One button per format, each naming what it
                                    actually fetches. */}
                                <div className="shrink-0 flex items-center gap-2">
                                    {logo.svg && <DownloadPill href={logo.svg} label="SVG" name={logo.name} />}
                                    {logo.png && <DownloadPill href={logo.png} label="PNG" name={logo.name} />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <ul className="list-disc pl-5 mt-6 space-y-2 max-w-2xl text-[15px] leading-relaxed">
                    <li>Ink (#363636) on light backgrounds; white on photography or dark grounds.</li>
                    <li>Never on the brand green, never <em>in</em> the brand green.</li>
                    <li>Clear space: at least the height of the &ldquo;V&rdquo; on all sides.</li>
                    <li>No taglines inside the lockup, no shadows or outlines, no rotation.</li>
                </ul>

                {/* 3 · Color */}
                <SectionHeading n="3">Color</SectionHeading>
                <p className="text-stone-600 mt-3 max-w-2xl leading-relaxed">
                    Warm paper and ink with one green voice. Backgrounds are always warm
                    neutrals, never pure white, never cold gray. Green is for action; lime is
                    for moments of energy, used sparingly.
                </p>
                <h3 className="font-bold mt-8 mb-3">Core palette</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {CORE_COLORS.map((c) => <Swatch key={c.name} {...c} />)}
                </div>
                <h3 className="font-bold mt-8 mb-3">Accent palette: the blob collage</h3>
                <p className="text-stone-600 text-[15px] max-w-2xl leading-relaxed mb-3">
                    Decorative colors for illustration shapes, social tiles, and backgrounds
                    behind short statements. Text on a blob is always ink, often slightly
                    rotated; shapes stay organic. Use several together.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    {ACCENT_COLORS.map((c) => <Swatch key={c.name + c.hex} {...c} />)}
                </div>
                <h3 className="font-bold mt-8 mb-3">Supporting surfaces</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {SURFACE_COLORS.map((c) => <Swatch key={c.name} {...c} />)}
                </div>
                <h3 className="font-bold mt-8 mb-3">The reserved quartet</h3>
                <p className="text-stone-600 text-[15px] max-w-2xl leading-relaxed mb-3">
                    Four colors are permanently reserved for the four creative categories in
                    the product. Content about these topics uses the matching color, never
                    swapped.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {QUARTET.map((c) => (
                        <div key={c.name} className="rounded-2xl p-5 text-stone-800" style={{ backgroundColor: c.hex }}>
                            <div className="font-bold">{c.name}</div>
                            <div className="font-mono text-xs opacity-70">{c.hex}</div>
                        </div>
                    ))}
                </div>
                <ul className="list-disc pl-5 mt-6 space-y-2 max-w-2xl text-[15px] leading-relaxed">
                    <li>Text on green is always dark ink, never white.</li>
                    <li>Green never becomes a background for long text; it&rsquo;s a button, a line, a dot.</li>
                    <li>Roughly 80% warm neutral surfaces, 15% ink, 5% green/lime/accents combined.</li>
                </ul>

                {/* 4 · Typography */}
                <SectionHeading n="4">Typography: two voices</SectionHeading>
                <p className="text-stone-600 mt-3 max-w-2xl leading-relaxed">
                    <strong className="font-semibold text-stone-800">Inter</strong> (300–700) is the
                    product&rsquo;s voice: interface, headlines, body.{' '}
                    <strong className="font-semibold text-stone-800">Fraunces</strong> is the
                    songwriter&rsquo;s voice, reserved for lyrics, and only lyrics.
                </p>
                <div className="rounded-3xl border border-stone-300/60 bg-[#F7F6F1] px-7 py-8 mt-6">
                    <div className="text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                        The complete <span className="font-bold">songwriting</span> journey.
                    </div>
                    <div className="font-mono text-[11px] text-stone-400 mt-3">
                        Display · Inter Light + Bold emphasis · tracking −2% · sentence case
                    </div>
                </div>
                <div className="rounded-3xl border border-stone-300/60 bg-[#FAF9F5] px-7 py-10 mt-4 text-center">
                    <div className="font-lyrics font-medium text-2xl md:text-3xl tracking-[-0.035em] leading-[1.4] text-stone-600 max-w-md mx-auto">
                        I stayed too long in something
                        <br />
                        that was over
                    </div>
                    <div className="font-mono text-[11px] text-stone-400 mt-4">
                        Lyrics · Fraunces Medium · tracking −3.5% · soft stone ink · centered
                    </div>
                </div>
                <ul className="list-disc pl-5 mt-6 space-y-2 max-w-2xl text-[15px] leading-relaxed">
                    <li>
                        Whenever a lyric is quoted (social post, video overlay, ad) it&rsquo;s set
                        in Fraunces. Everything around it stays in Inter. The serif/sans contrast
                        is the signal &ldquo;this is a lyric.&rdquo;
                    </li>
                    <li>Fraunces is never used for UI, headlines, or marketing display type.</li>
                    <li>Sentence case everywhere. No all-caps, no Title Case Headlines.</li>
                    <li>Emphasis inside a headline is a weight change, not a color change.</li>
                </ul>

                {/* 5 · Buttons & UI */}
                <SectionHeading n="5">UI &amp; graphic language</SectionHeading>
                <p className="text-stone-600 mt-3 max-w-2xl leading-relaxed">
                    Soft, generous, unhurried. The canonical primary button is the onboarding
                    &ldquo;Next&rdquo;. Try pressing it:
                </p>
                <div className="flex items-center gap-5 mt-6 mb-2">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/55 text-stone-700">
                        ←
                    </span>
                    <button
                        type="button"
                        className="flex items-center gap-2.5 rounded-full bg-[#86BE7F] px-10 py-4 text-lg font-bold tracking-tight text-stone-900 shadow-[0_5px_0_0_#5F9857] transition-[transform,box-shadow] duration-100 hover:brightness-[1.03] active:translate-y-[5px] active:shadow-[0_0_0_0_#5F9857]"
                    >
                        Next →
                    </button>
                </div>
                <ul className="list-disc pl-5 mt-6 space-y-2 max-w-2xl text-[15px] leading-relaxed">
                    <li>
                        Full-round pill, green fill, <strong className="font-semibold">bold dark ink text</strong> (never
                        white), and the solid 5px offset shadow in Press Green #5F9857. On press it
                        travels down and the shadow collapses. It pushes in, like a key on an
                        instrument.
                    </li>
                    <li>One green button per view: green is the color of the one thing to press.</li>
                    <li>Secondary actions recede: translucent white circles or plain text. Never solid black buttons.</li>
                    <li>Primary buttons are never disabled. Pressing an incomplete one shakes and explains.</li>
                    <li>Action pills are full-round; inputs 12–16px radius; cards and media 24–36px.</li>
                    <li>Illustrations are organic blobs and hand-drawn linework: no isometric 3D, no stock-flat people, no emoji as design elements.</li>
                </ul>

                {/* 6 · Voice */}
                <SectionHeading n="6">Voice &amp; tone</SectionHeading>
                <p className="text-stone-600 mt-3 max-w-2xl leading-relaxed">
                    Veinote sounds like a trusted co-writer: warm, direct, craft-obsessed,
                    allergic to hype. Short declarative sentences carry the biggest ideas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="rounded-3xl border border-stone-300/60 bg-[#F7F6F1] p-6">
                        <div className="text-xs font-bold tracking-wide text-[#53884D] mb-3">Sounds like us</div>
                        <ul className="space-y-3 text-[15px] leading-relaxed">
                            <li>&ldquo;You create them. You own them.&rdquo;</li>
                            <li>&ldquo;Finish ugly, then fix it.&rdquo;</li>
                            <li>&ldquo;Only 13 spots left before early access closes.&rdquo;</li>
                        </ul>
                    </div>
                    <div className="rounded-3xl border border-stone-300/60 bg-[#EDE4DC] p-6">
                        <div className="text-xs font-bold tracking-wide text-[#B4443C] mb-3">Doesn&rsquo;t sound like us</div>
                        <ul className="space-y-3 text-[15px] leading-relaxed">
                            <li>&ldquo;Unlock your creative potential with our revolutionary platform! 🚀&rdquo;</li>
                            <li>&ldquo;LIMITED TIME OFFER! ACT NOW!!!&rdquo;</li>
                            <li>&ldquo;Leverage our best-in-class solution.&rdquo;</li>
                        </ul>
                    </div>
                </div>
                <ul className="list-disc pl-5 mt-6 space-y-2 max-w-2xl text-[15px] leading-relaxed">
                    <li>Talk to one songwriter (&ldquo;you&rdquo;), never to &ldquo;creators&rdquo; or &ldquo;users&rdquo;.</li>
                    <li>We say &ldquo;Q&amp;A&rdquo;, not &ldquo;FAQ&rdquo;; &ldquo;waiting list&rdquo;, not &ldquo;waitlist&rdquo; in prose.</li>
                    <li>We never mock people who use AI. We celebrate people who don&rsquo;t.</li>
                    <li>Credentials are evidence, not adjectives: platinum records, 250+ released songs.</li>
                    <li>No em dashes. Break the sentence instead: a comma, a full stop, a colon, or brackets.</li>
                </ul>

                {/* 7 · Languages */}
                <SectionHeading n="7">Languages</SectionHeading>
                <ul className="list-disc pl-5 mt-4 space-y-2 max-w-2xl text-[15px] leading-relaxed">
                    <li>Everything ships in English, Norwegian, and Swedish, and the Nordic versions must read native, never translated.</li>
                    <li>Norwegian: &ldquo;låtskriving&rdquo;, imperative &ldquo;Lag&rdquo; (never &ldquo;Skap&rdquo;). Swedish: &ldquo;låtskrivande&rdquo;.</li>
                    <li>The product term &ldquo;canvas&rdquo; stays &ldquo;canvas&rdquo; in all three languages.</li>
                    <li>
                        Norwegian content lives under <span className="font-mono text-[13px]">/no/</span>, Swedish under{' '}
                        <span className="font-mono text-[13px]">/sv/</span>. Nordic social posts link there.
                    </li>
                </ul>

                <p className="text-stone-500 text-sm mt-16 max-w-2xl leading-relaxed">
                    Living document: it changes when the product does. Questions this page
                    doesn&rsquo;t answer:{' '}
                    <Link href="/about" className="underline underline-offset-4 hover:text-stone-700">
                        get in touch
                    </Link>{' '}
                    and we&rsquo;ll add the answer here.
                </p>
            </div>

            <SiteFooterStrip language={language} currentPath="/guidelines" />
        </div>
    );
}
