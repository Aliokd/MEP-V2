import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Shirt, Package, Users, MapPin, Music, BookOpen, Dumbbell, Globe } from 'lucide-react';
import Logo from '@/components/Logo';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import { getTicket } from '@/lib/goldenTickets';
import GoldenBadge from '../components/GoldenBadge';
import TakeTicket from '../components/TakeTicket';
import { GOLDEN, TEAM, firstName } from '../content';

/**
 * One songwriter's page: the ticket with their name on it, what it holds,
 * what Veinote is for, and the form that takes it. Server-rendered from the
 * Admin SDK; the browser receives the public fields and nothing else (the
 * code and any address on file stay on the server).
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { slug } = await params;
    const ticket = await getTicket(slug);
    const title = ticket ? `${ticket.name}, your golden ticket | Veinote` : `${GOLDEN.programName} | Veinote`;
    return {
        title,
        description: GOLDEN.wallSubtitle,
        robots: { index: false, follow: false },
        openGraph: {
            title,
            description: GOLDEN.wallSubtitle,
            ...(ticket?.photoUrl ? { images: [{ url: ticket.photoUrl }] } : {}),
        },
    };
}

export default async function GoldenTicketPage({ params }: { params: Params }) {
    const { slug } = await params;
    const ticket = await getTicket(slug);
    if (!ticket) notFound();

    const name = firstName(ticket.name);

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans text-stone-900">
            {/* The page's own header: where it came from, and the one thing to do. */}
            <header className="sticky top-0 z-40 bg-[#E6E3DB]/85 backdrop-blur-lg border-b border-stone-300/20">
                <div className="px-5 md:px-[10%] py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <Link href="/" className="inline-block hover:opacity-80 transition-opacity [&_svg]:w-[84px] md:[&_svg]:w-[104px]">
                            <Logo size="lg" />
                        </Link>
                        <Link href="/golden" className="mt-1 flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-900 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span className="truncate">{GOLDEN.backLabel}</span>
                        </Link>
                    </div>
                    <a
                        href="#ticket"
                        className="btn-press shrink-0 px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-semibold inline-flex items-center gap-2 select-none"
                    >
                        <span>{GOLDEN.cta}</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                    </a>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-12 md:pt-20 pb-14 px-6 md:px-[10%]">
                <div className="max-w-3xl">
                    <div className="relative inline-block">
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-[24px] overflow-hidden bg-[#DCDDD4] border border-stone-900/5">
                            {ticket.photoUrl ? (
                                <img src={ticket.photoUrl} alt={ticket.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-light text-stone-900/20 select-none">
                                    {ticket.name.trim().charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <GoldenBadge size={56} tone="gold" className="absolute -top-4 -right-5 drop-shadow-sm" />
                    </div>

                    <p className="mt-8 text-xs text-stone-500 tabular-nums">
                        {GOLDEN.programName} · Ticket {ticket.number}
                    </p>
                    <h1 className="mt-3 text-4xl md:text-6xl leading-[1.08] tracking-tight font-light">
                        {renderHero(GOLDEN.heroTitle, name)}
                    </h1>
                    <p className="mt-6 text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl">{GOLDEN.heroBody}</p>
                    {ticket.note && (
                        <blockquote className="mt-8 border-l-2 border-[#C5A059] pl-5 text-stone-700 leading-relaxed max-w-2xl">
                            {ticket.note}
                        </blockquote>
                    )}
                </div>
            </section>

            {/* Benefits */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-14 border-t border-stone-400/20 pt-14">
                    <div>
                        <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.benefitsTitle}</h2>
                        <ul className="mt-6 space-y-3.5">
                            {GOLDEN.benefits.map((line) => (
                                <li key={line} className="flex items-start gap-3 text-stone-700 leading-relaxed">
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#C5A059] shrink-0" />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {GOLDEN.perks.map((perk) => (
                            <div key={perk.id} className="bg-white/45 border border-stone-300/50 rounded-[24px] p-5 md:p-6 flex flex-col gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#E6E3DB] flex items-center justify-center text-stone-800">
                                    {perk.id === 'tee' ? <Shirt className="w-6 h-6" strokeWidth={1.6} /> : <Package className="w-6 h-6" strokeWidth={1.6} />}
                                </div>
                                <div>
                                    <p className="font-semibold">{perk.title}</p>
                                    <p className="text-sm text-stone-600 mt-1">{perk.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
                <div className="border-t border-stone-400/20 pt-14">
                    <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.missionTitle}</h2>
                    <p className="mt-4 text-stone-600 leading-relaxed max-w-2xl">{GOLDEN.missionBody}</p>
                    <div className="mt-10 relative rounded-[28px] overflow-hidden bg-[#1F1F1F] text-white min-h-[320px] md:min-h-[420px] flex items-end">
                        <img
                            src="/assets/mind-power/brain-gold.webp"
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="relative p-7 md:p-10 max-w-xl">
                            <p className="text-[#E9B94F] text-sm font-medium">{GOLDEN.mindPower.eyebrow}</p>
                            <p className="mt-2 text-2xl md:text-3xl tracking-tight">{GOLDEN.mindPower.title}</p>
                            <p className="mt-3 text-white/80 leading-relaxed">{GOLDEN.mindPower.body}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Together */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
                <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.togetherTitle}</h2>
                <div className="mt-8 grid md:grid-cols-[1.4fr_1fr] gap-4 md:gap-5">
                    {GOLDEN.together.map((tile) => (
                        <div
                            key={tile.id}
                            className={`relative rounded-[28px] overflow-hidden min-h-[260px] md:min-h-[340px] flex items-end ${tile.id === 'events' ? 'bg-[#2A2A2A] text-white' : 'bg-white/45 border border-stone-300/50'}`}
                        >
                            {tile.id === 'events' && (
                                <>
                                    <img src="/assets/footer_bg_stockholm.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                                </>
                            )}
                            <div className="relative p-7 md:p-9 max-w-md">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 ${tile.id === 'events' ? 'bg-white/15' : 'bg-[#E6E3DB]'}`}>
                                    {tile.id === 'events' ? <MapPin className="w-5 h-5" strokeWidth={1.7} /> : <Users className="w-5 h-5" strokeWidth={1.7} />}
                                </div>
                                <p className="text-xl md:text-2xl tracking-tight">{tile.title}</p>
                                <p className={`mt-2 leading-relaxed ${tile.id === 'events' ? 'text-white/80' : 'text-stone-600'}`}>{tile.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Create */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
                <h2 className="text-2xl md:text-3xl tracking-tight max-w-2xl">{GOLDEN.createTitle}</h2>
                <div className="mt-8 grid md:grid-cols-[1.5fr_1fr] gap-4 md:gap-5">
                    <div className="rounded-[28px] bg-white/45 border border-stone-300/50 p-7 md:p-9 flex flex-col justify-between min-h-[280px]">
                        <div className="w-11 h-11 rounded-2xl bg-[#E6E3DB] flex items-center justify-center">
                            <Music className="w-5 h-5" strokeWidth={1.7} />
                        </div>
                        <div>
                            <p className="font-lyrics text-2xl md:text-3xl text-stone-700 leading-snug tracking-[-0.03em] max-w-md">
                                Every line you write is yours. No AI-generated songs. You create them. You own them.
                            </p>
                            <p className="mt-5 text-stone-600 leading-relaxed max-w-md">{GOLDEN.createBody}</p>
                        </div>
                    </div>
                    <div className="grid gap-4 md:gap-5">
                        {GOLDEN.pillars.map((pillar) => (
                            <div key={pillar.id} className="rounded-[24px] bg-white/45 border border-stone-300/50 px-6 py-5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#E6E3DB] flex items-center justify-center shrink-0">
                                    {pillar.id === 'learn' && <BookOpen className="w-5 h-5" strokeWidth={1.7} />}
                                    {pillar.id === 'practice' && <Dumbbell className="w-5 h-5" strokeWidth={1.7} />}
                                    {pillar.id === 'connect' && <Globe className="w-5 h-5" strokeWidth={1.7} />}
                                </div>
                                <div>
                                    <p className="font-semibold">{pillar.title}</p>
                                    <p className="text-sm text-stone-600">{pillar.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Vision */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
                <div className="border-t border-stone-400/20 pt-14 grid lg:grid-cols-2 gap-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.visionTitle}</h2>
                        <p className="mt-4 text-stone-600 leading-relaxed max-w-xl">{GOLDEN.visionBody}</p>
                        <ol className="mt-8 flex flex-wrap items-center gap-2">
                            {GOLDEN.visionSteps.map((step, i) => (
                                <li key={step} className="flex items-center gap-2">
                                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${i === 0 ? 'bg-stone-900 text-white border-stone-900' : 'bg-white/50 border-stone-300/60 text-stone-700'}`}>
                                        {step}
                                    </span>
                                    {i < GOLDEN.visionSteps.length - 1 && <ArrowRight className="w-4 h-4 text-stone-400" />}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.longTermTitle}</h2>
                        <ul className="mt-6 space-y-3.5">
                            {GOLDEN.longTerm.map((line) => (
                                <li key={line} className="flex items-start gap-3 text-stone-700 leading-relaxed">
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#C5A059] shrink-0" />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* The ticket */}
            <section className="px-6 md:px-[10%] pb-10">
                <div className="max-w-2xl mx-auto">
                    <TakeTicket slug={ticket.slug} status={ticket.status} />
                    <p className="mt-6 text-center text-xs text-stone-500">
                        {GOLDEN.footnotePhotos}{' '}
                        <Link href="/terms" className="underline underline-offset-2 hover:text-stone-800">{GOLDEN.footnoteTerms}</Link>
                    </p>
                </div>
            </section>

            {/* Team */}
            <section className="px-6 md:px-[10%] pt-10 pb-20 md:pb-28">
                <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.teamTitle}</h2>
                <div className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                    {TEAM.map((member) => (
                        <div key={member.name} className="flex flex-col gap-2">
                            <div className="aspect-[3/4] rounded-[20px] overflow-hidden bg-[#DCDDD4] border border-stone-900/5">
                                {member.photoUrl && (
                                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <p className="text-sm font-semibold leading-tight">{member.name}</p>
                            <p className="text-xs text-stone-500 -mt-1">{member.role}</p>
                        </div>
                    ))}
                    <div className="aspect-[3/4] rounded-[20px] bg-stone-900/[0.06] flex items-end p-4">
                        <p className="text-sm font-semibold">{GOLDEN.teamMore}</p>
                    </div>
                </div>
            </section>

            <SiteFooterStrip language="en" currentPath={`/golden/${ticket.slug}`} />
        </div>
    );
}

/** "Hey {name}, ..." with the name in bold, the signature display style. */
function renderHero(template: string, name: string) {
    const [before, after] = template.split('{name}');
    return (
        <>
            {before}
            <span className="font-semibold">{name}</span>
            {after}
        </>
    );
}
