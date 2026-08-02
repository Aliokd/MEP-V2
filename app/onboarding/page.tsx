"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { auth, db, googleProvider } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import Tooltip from '@/components/Tooltip';
import { getPriceId, isPlanPurchasable, type BillingPeriod, type PlanId } from '@/lib/paddle/config';
import { openCheckout } from '@/lib/paddle/checkout';
import IntroCarousel from './components/IntroCarousel';
import PaywallPlans from './components/PaywallPlans';
import QuestionCards from './components/QuestionCards';
import SwipeDeck, { type DeckState } from './components/SwipeDeck';
import GoalBox, { isCustom, customText } from './components/GoalBox';
import MoodOptions from './components/MoodOptions';
import AnalyzingAnswers from './components/AnalyzingAnswers';
import EmailCapture from './components/EmailCapture';
import VerdictReveal from './components/VerdictReveal';
import OtpVerify from './components/OtpVerify';
import TrialOffer from './components/TrialOffer';
import WelcomeAboard from './components/WelcomeAboard';

/**
 * The flow, in order:
 *
 *   intro → quiz → analyzing → email → verdict → offer → paywall
 *         → checkout → verify → welcome
 *
 * Signing up is split in two, and the halves sit at opposite ends on purpose.
 *
 * The email is asked for at the one moment the visitor most wants to continue:
 * the analysis has just read their answers back and the verdict is one press
 * away. One field, no password — a password is a second decision, and this is
 * the last step of something they are already doing rather than a form standing
 * between them and a product. The account that creates is unverified.
 *
 * The code that finishes it comes after the payment. Verifying means leaving
 * the page for an inbox, which is the one step in this flow that can lose
 * someone entirely, so it is spent last — after the card, when there is nothing
 * left to abandon.
 *
 * That ordering has one hard constraint behind it: the Paddle webhook resolves
 * a subscription to a user through `customData.uid` and nothing else, so a real
 * uid has to exist before checkout opens. That is why the email step creates
 * the account rather than merely recording an address, and why verification is
 * a flag flipped on an existing account rather than the thing that creates one.
 *
 * Checkout is not a step — it's Paddle's own overlay, opened over the paywall.
 * Its successUrl lands back on `?step=welcome`; see the note on that param
 * below for why verify isn't reachable that way.
 */
const STEPS = {
    INTRO: 'intro',
    QUIZ: 'quiz',
    ANALYZING: 'analyzing',
    EMAIL: 'email',
    VERDICT: 'verdict',
    OFFER: 'offer',
    PAYWALL: 'paywall',
    VERIFY: 'verify',
    WELCOME: 'welcome',
};

// The two steps that can be linked to directly: the plans (the in-platform Max
// upgrade sends people here) and the welcome screen (where Paddle returns after
// a successful checkout). The rest assume state built up on the way there and
// would land the visitor on a half-filled form.
const ADDRESSABLE_STEPS = new Set([STEPS.PAYWALL, STEPS.WELCOME]);

/**
 * Pre-launch: the flow itself is public so the draft can be shared and reviewed,
 * but the account step is closed. Reviewers walk every screen — including the
 * offer, the plans and the welcome — while the two steps that would touch the
 * outside world are skipped: no Firebase account is created and Paddle is never
 * opened. `Pay $0.00` goes straight to the welcome screen, which swaps its door
 * into the product for the waiting list.
 *
 * This replaced a redirect that sent signed-out visitors to the waiting list —
 * which made the draft impossible to show anyone without an account.
 *
 * Flip to `true` to reopen public signups. Nothing else needs changing: the
 * signup form and the checkout call are both still wired up behind this flag.
 */
const SIGNUPS_OPEN: boolean = false;

// Only the stable ids and answer values live here — every visible label is
// looked up under `onboarding.questions.<id>` in the locale files.
const QUESTIONS = [
    {
        id: 'songwriter_type',
        // Rendered as picture cards rather than the default option list —
        // its labels live under `options.<value>.title` / `.desc`.
        isCards: true,
        options: [
            { value: "lyricist" },
            { value: "melodist" },
            { value: "producer" },
            { value: "storyteller" },
            { value: "explorer" }
        ]
    },
    {
        id: 'struggle',
        // Dealt as a swipe deck rather than a list, and the only question that
        // takes more than one answer: its value is an array of every struggle
        // swiped right. See SwipeDeck.
        isDeck: true,
        options: [
            { value: "unfinished" },
            { value: "weak_melodies" },
            { value: "no_structure" },
            { value: "too_similar" },
            { value: "overthink" }
        ]
    },
    {
        id: 'dream_outcome',
        // Cards taken off the table and put in a box, plus any the visitor
        // writes themselves. Takes several answers, like the deck. See GoalBox.
        isGoals: true,
        options: [
            { value: "finish_songs" },
            { value: "unique_sound" },
            { value: "move_people" },
            { value: "release_music" },
            { value: "creative_fearless" }
        ]
    },
    {
        id: 'emotional_inspiration',
        // Picture pills — each option is a photograph of the mood it names,
        // washed pale. The colours that used to sit here were never read by
        // anything; the imagery lives in MoodOptions now.
        isVisual: true,
        options: [
            { value: "melancholic" },
            { value: "energetic" },
            { value: "cinematic" },
            { value: "dark" },
            { value: "intimate" }
        ]
    },
];

/**
 * The question folded inside the songwriter-type cards rather than asked on a
 * step of its own. Choosing a type doesn't advance the quiz — the other four
 * cards leave, the chosen one takes the full width, and this is asked on its
 * face. See the `nested` prop on QuestionCards.
 *
 * It is deliberately NOT in QUESTIONS: that array is the list of steps, and
 * this is not one. The step counter, the dots and the back button all count it
 * out correctly as a result, and the answer still lands in `answers` under its
 * own id, so the verdict reads it exactly as it did when it was step five.
 */
const NESTED_QUESTION = {
    id: 'creation_method',
    options: [
        { value: "lyric_phrase" },
        { value: "melody_head" },
        { value: "chords" },
        { value: "beat_production" },
        { value: "improvisation" }
    ],
};

// The mood question, reached by hand because its photographs are mounted from
// the first question onward rather than only while it is the one on screen —
// see the backdrop layer in the render.
// How long the chosen row stays on screen before the quiz moves on. Long
// enough to read as an answer being taken, short enough not to feel stuck.
const NESTED_ADVANCE_MS = 420;

const MOOD_QUESTION = QUESTIONS.find((q) => (q as any).isVisual)!;

export default function OnboardingPage() {
    return <OnboardingPageInner />;
}

function OnboardingPageInner() {
    const [currentStep, setCurrentStep] = useState(STEPS.INTRO);
    // Whether a return to the intro should open on its last slide (backing out
    // of the quiz) rather than the first (a fresh arrival).
    const [introStartAtEnd, setIntroStartAtEnd] = useState(false);
    // Which carousel slide is showing, reported up by IntroCarousel — the
    // painted page backdrop belongs to the first slide only.
    const [introIndex, setIntroIndex] = useState(0);
    // Which mood's photograph the page is wearing, reported up by MoodOptions.
    // Null on every other question — the quiz is otherwise bare paper.
    const [moodBackdrop, setMoodBackdrop] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    /**
     * The struggle deck's own record, held here rather than inside it.
     *
     * Two jobs. It survives the deck unmounting, so a visitor who goes forward
     * and comes back finds the cards where they left them instead of being
     * dealt all five again — the answer alone can't restore that, since a
     * passed card leaves nothing behind in it.
     *
     * And it is what Next reads on that question. Everywhere else an empty
     * answer means unanswered, but the deck is the one question whose answer
     * can legitimately be empty: a writer who claims none of the five
     * struggles has still answered it. One swipe either way is enough, and
     * that is a fact about the decisions, not about the kept list.
     */
    const [deckState, setDeckState] = useState<DeckState>({ decisions: [], written: [] });
    // How many times Next has been pressed on this question with nothing
    // chosen. A counter rather than a flag so the shake replays on every press,
    // not just the first — and resets to 0 whenever the question changes.
    const [nudgeCount, setNudgeCount] = useState(0);
    const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // One value per question, except the deck question, which answers with
    // every struggle that was swiped right.
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // The plan chosen on the paywall, kept here because the account step sits
    // between the choice and the checkout that acts on it.
    const [checkoutChoice, setCheckoutChoice] = useState<{ plan: PlanId; billing: BillingPeriod } | null>(null);
    const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');

    // Signup, split across the two ends of the flow: the address is taken at
    // the email step and the code that verifies it at the very end.
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const { language, t } = useLanguage();
    const { user } = useAuth();

    /**
     * Hands the chosen plan to Paddle. Everything that would make that
     * impossible — signups closed, no account, Paddle not configured, no price
     * id for this plan — lands on the welcome screen instead, so the flow
     * always has an ending rather than a button that does nothing.
     *
     * The overlay opens over the paywall, never over the account form: by the
     * time Paddle paints, the screen behind it should be the one showing the
     * plan being paid for.
     */
    const startCheckout = async (account: User | null, choice: { plan: PlanId; billing: BillingPeriod }) => {
        const priceId = getPriceId(choice.plan, choice.billing);

        // No account, no Paddle, or signups closed: fall through to the code
        // screen rather than the product. It is the next step in the flow
        // either way, and pre-launch it is the one that still needs reviewing.
        if (!SIGNUPS_OPEN || !account || !priceId || !isPlanPurchasable(choice.plan, choice.billing)) {
            setCurrentStep(STEPS.VERIFY);
            return;
        }

        setCheckoutError('');
        setIsOpeningCheckout(true);
        setCurrentStep(STEPS.PAYWALL);
        try {
            await openCheckout({
                priceId,
                uid: account.uid,
                email: account.email,
                locale: language,
                // Paddle owns the browser from here — this is how the flow gets
                // its last screen back.
                successUrl: `${window.location.origin}/onboarding?step=${STEPS.WELCOME}`,
            });
        } catch (err: any) {
            console.error('Paddle checkout failed to open:', err);
            setCheckoutError(t('onboarding.paywall.checkout_error'));
        } finally {
            setIsOpeningCheckout(false);
        }
    };

    const handlePlanChosen = (plan: PlanId, billing: BillingPeriod) => {
        const choice = { plan, billing };
        setCheckoutChoice(choice);
        setCheckoutError('');
        startCheckout(user, choice);
    };

    /**
     * The email step. Records the address and moves on to the verdict.
     *
     * NOT YET WIRED to anything: it does not create the Firebase account it is
     * supposed to, which is the piece that has to exist before Paddle can be
     * handed a uid. Until that lands, `startCheckout` still falls through to
     * its no-account branch, exactly as it does pre-launch — so nothing is
     * half-charged, and the flow is walkable end to end for review.
     *
     * When the backend arrives this posts { email, answers, locale } to a route
     * that creates the unverified user and returns its uid, and the error path
     * below surfaces a refusal (an address already fully signed up, say) rather
     * than swallowing it.
     */
    const handleEmailSubmit = (submitted: string) => {
        setEmail(submitted);
        setEmailError('');
        setCurrentStep(STEPS.VERDICT);
    };

    /**
     * The code at the end. Also not yet wired: any six digits are accepted, so
     * the screen can be walked. The real one posts the code, gets a custom
     * token back, signs in, and only then lands on welcome.
     */
    const handleVerify = (_code: string) => {
        setVerifyError('');
        setCurrentStep(STEPS.WELCOME);
    };

    const handleResendCode = () => {
        setVerifyError('');
    };

    // `?step=` lets the two addressable steps be linked to directly: the plans
    // (from the in-platform Max upgrade prompt) and the welcome screen (where
    // Paddle sends the browser after a successful checkout), instead of
    // replaying the quiz. Applied after mount rather than in the initial state
    // so SSR and hydration agree on the markup.
    useEffect(() => {
        const step = new URLSearchParams(window.location.search).get('step');
        if (step && ADDRESSABLE_STEPS.has(step)) setCurrentStep(step);
    }, []);

    const handleBack = () => {
        // On the cards step, back means "show me the five again" before it
        // means "leave the quiz". The chosen card has grown to fill the
        // screen and swallowed the grid, so that is the state a visitor is
        // actually trying to get out of — sending them to the carousel
        // instead would skip the step they are standing on.
        if ((currentQuestion as any).isCards && selectedOption) {
            handleClearCardChoice();
            return;
        }
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        } else {
            // From the first question, back means the intro — landing on its
            // last slide, so the journey reverses step for step instead of
            // dumping the user at the start of the carousel.
            setIntroStartAtEnd(true);
            setCurrentStep(STEPS.INTRO);
        }
    };

    useEffect(() => {
        const questionId = QUESTIONS[currentQuestionIndex]?.id;
        if (questionId) {
            const answer = answers[questionId];
            // The deck's answer is a list and has no single selected option —
            // it drives its own state and never reads this.
            setSelectedOption(typeof answer === 'string' ? answer : null);
        }
        // A nudge belongs to the question that earned it. Clear it on the way
        // in, and the moment an answer lands — the prompt has been answered, so
        // leaving it on screen would be nagging about something already done.
        setNudgeCount(0);
    }, [currentQuestionIndex, answers]);

    const currentQuestion = QUESTIONS[currentQuestionIndex];

    /**
     * The dots count beats, not steps. Choosing a songwriter type doesn't move
     * the quiz on — it expands the card and asks a second question on its face —
     * so that expansion is a beat of its own and gets its own dot. Five dots for
     * four steps, and the second fills the moment the card opens.
     */
    const QUIZ_BEATS = QUESTIONS.length + 1;
    const currentBeat =
        currentQuestionIndex === 0
            ? (selectedOption ? 1 : 0)
            : currentQuestionIndex + 1;

    // The current question's answer as a list, whichever shape it is stored in.
    // The goal box reads it to know what's in the box, and Next reads it to
    // know whether the question has been answered at all — `selectedOption`
    // alone can't say, since it stays null for the multi-answer questions.
    // The nested question's answer, kept apart from `currentValues` because it
    // belongs to a different question id even though it is asked on the same
    // step.
    const nestedAnswer = answers[NESTED_QUESTION.id];
    const nestedValue = typeof nestedAnswer === 'string' ? nestedAnswer : null;

    /**
     * The nested question answers and moves on by itself. It takes one value and
     * there is nothing else on that card to do, so making someone confirm with
     * Next is a press that carries no decision — the only question left is
     * whether they meant the row they just pressed.
     *
     * The short beat before leaving is what makes it readable: the row lights up
     * and the others step back, and that state has to be on screen long enough
     * to register as the answer being taken rather than the screen simply
     * changing under them.
     */
    const handleNestedAnswer = (value: string) => {
        setAnswers((prev) => ({ ...prev, [NESTED_QUESTION.id]: value }));
        setNudgeCount(0);

        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => {
            setCurrentQuestionIndex((index) => Math.min(index + 1, QUESTIONS.length - 1));
        }, NESTED_ADVANCE_MS);
    };

    /**
     * Takes back the card choice. Drops the nested answer with it: that
     * question was asked of a Lyricist, and keeping the reply after the visitor
     * says they are a Producer would carry an answer to a question nobody was
     * asked in that form.
     */
    const handleClearCardChoice = () => {
        setAnswers((prev) => {
            const next = { ...prev };
            delete next[QUESTIONS[0].id];
            delete next[NESTED_QUESTION.id];
            return next;
        });
        setSelectedOption(null);
    };

    const currentAnswer = answers[currentQuestion.id];
    const currentValues = Array.isArray(currentAnswer)
        ? currentAnswer
        : currentAnswer
          ? [currentAnswer]
          : [];

    // The answers resolved to the labels the visitor actually read on the way
    // here, in question order. `songwriter_type` keeps its label one level
    // deeper than the rest because it renders as picture cards, and the deck
    // question contributes one line per struggle it was given.
    const answerLabels = useMemo(
        () =>
            QUESTIONS.flatMap((q) => {
                const answer = answers[q.id];
                const values = Array.isArray(answer) ? answer : answer ? [answer] : [];
                return values.map((value) =>
                    // A goal the visitor wrote is already the label.
                    isCustom(value)
                        ? customText(value)
                        : t(
                              (q as any).isCards
                                  ? `onboarding.questions.${q.id}.options.${value}.title`
                                  : `onboarding.questions.${q.id}.options.${value}`,
                          ),
                );
            }),
        [answers, t],
    );

    const restartFlow = () => {
        setAnswers({});
        setSelectedOption(null);
        setDeckState({ decisions: [], written: [] });
        setCurrentQuestionIndex(0);
        setCheckoutChoice(null);
        setCheckoutError('');
        setIntroStartAtEnd(false);
        setCurrentStep(STEPS.INTRO);
    };

    /**
     * Records a choice — and nothing else. Answering used to advance the quiz
     * on a 400ms timer, which can't coexist with the Next button in the
     * controls: a step that leaves on its own gives you nothing to press. So
     * picking an option now only selects it, and Next is what moves.
     *
     * The trade is one extra tap per question for the ability to look at your
     * answer before committing to it, and to change it without going back.
     */
    const handleAnswer = (value: string) => {
        if (value === selectedOption) {
            // Tapping the chosen option again clears it — the visitor is
            // allowed to leave a question unanswered.
            setAnswers(prev => {
                const newAnswers = { ...prev };
                delete newAnswers[currentQuestion.id];
                return newAnswers;
            });
            setSelectedOption(null);
            return;
        }

        setSelectedOption(value);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    };

    const handleQuizNext = () => {
        // Nothing chosen: ask again rather than refuse. The counter is what
        // drives the shake — see the button's `key`.
        //
        // The cards step carries two questions, so both have to be answered
        // before it counts as done — otherwise choosing a type and pressing
        // Next would skip past the question printed on the card in front of
        // them.
        const answered = (currentQuestion as any).isCards
            ? currentValues.length > 0 && Boolean(nestedValue)
            : (currentQuestion as any).isDeck
              // One swipe, either way. See `deckState` — "none of these"
              // is an answer, and it leaves the kept list empty.
              ? deckState.decisions.length > 0 || currentValues.length > 0
              : currentValues.length > 0;

        if (!answered) {
            setNudgeCount((n) => n + 1);
            return;
        }
        setNudgeCount(0);
        if (currentQuestionIndex < QUESTIONS.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setCurrentStep(STEPS.ANALYZING);
        }
    };

    /**
     * The two questions that take a list — the deck and the goal box — both
     * report their whole answer on every change rather than one item at a time,
     * so claiming a struggle and taking a card back out of the box are the same
     * call. An empty list is a question left unanswered rather than an answer of
     * "none": the key is dropped, so the verdict falls back to its default line
     * instead of naming a struggle nobody claimed.
     */
    const handleMultiAnswer = (values: string[]) => {
        setAnswers(prev => {
            const next = { ...prev };
            if (values.length) next[currentQuestion.id] = values;
            else delete next[currentQuestion.id];
            return next;
        });
    };

    /**
     * The deck has dealt its last card. Records the answer and stops there.
     *
     * It used to move the quiz on by itself, which was right while the last
     * swipe was the end of the question. It isn't any more: the empty deck now
     * offers a card to write a struggle of their own on, and advancing on the
     * final swipe would take that away in the same frame it appeared. Next is
     * the way forward from here, as it is on every other question.
     */
    const handleDeckComplete = (values: string[]) => {
        handleMultiAnswer(values);
    };


    return (
        // `overflow-x-clip` rather than `overflow-hidden`: both clip sideways,
        // but `hidden` makes this element a scroll container, and a scroll
        // container between the document and a `position: sticky` child is
        // what silently stops the child from ever sticking. `clip` creates no
        // scroll container, so the carousel's actions row can pin itself to the
        // bottom of the viewport when the page is too short for it.
        <div className={`min-h-screen flex flex-col items-center px-6 bg-[#DCDDD4] relative overflow-x-clip font-sans ${
            // The questions sit at the top rather than centred. Centring left
            // the headline stranded in the middle of the screen with a long
            // reach up to the mark above it; anchored to the top it reads as
            // the mark's own heading. The whole justify set is swapped rather
            // than overridden — two `md:justify-*` utilities in one list are
            // resolved by build order, not by this list's order.
            currentStep === STEPS.QUIZ ? 'justify-start' : 'justify-start md:justify-center'
        } ${
            // Every other step floats the mark above the frame and needs the
            // headroom to clear it. The intro carries the mark inside its own
            // card, so that headroom is just a gap at the top of the screen.
            // The questions need only enough to clear the mark itself.
            //
            // The steps after the quiz take the same headroom as the quiz now.
            // They used to reserve pt-28 / py-32 — half a screen of nothing
            // between the mark and the headline on the taller ones, which on a
            // step like the trial offer pushed the timeline it exists to show
            // below the fold. The mark ends at ~64px; clearing it is all this
            // has to do.
            currentStep === STEPS.INTRO
                ? 'pb-3 pt-6 md:py-7'
                : currentStep === STEPS.QUIZ
                    ? 'pt-16 pb-10 md:pt-20 md:pb-12'
                    : 'pt-16 pb-10 md:pt-20 md:pb-16'
        }`}>
            {/* The painted backdrop. `fixed` rather than absolute so it stays
                put on a page long enough to scroll, and behind everything at
                z-0 — the flat #DCDDD4 above is what shows through wherever the
                image doesn't reach, and what a failed load falls back to.

                It belongs to the opening screens only. Two places drop it:

                — The questions. Those are a headline and a column of answer
                  cards with nothing else to hold the eye, so a painted
                  landscape behind them stops being atmosphere and becomes the
                  thing you look at, with the cards floating on a picture.

                — Every carousel slide after the first. From slide two on, the
                  card itself carries a backdrop, and a painted page behind a
                  tinted card is two pictures fighting through one border. The
                  opening slide keeps it precisely because its card is plain
                  cream — there, the page is the only colour on screen.

                Both fall back to the flat #DCDDD4 above. */}
            {currentStep !== STEPS.QUIZ && !(currentStep === STEPS.INTRO && introIndex > 0) && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url('/onboarding-cards/welcome-backdrop.webp')` }}
                />
            )}
            {/* The mood question is the one exception to the rule above: the
                questions drop the painted page, and then this question hands it
                to the visitor. Pointing at a feeling puts that feeling's own
                photograph behind the whole screen, full bleed, and letting go
                falls back to the one they chose.

                All five are mounted at once and crossfaded on opacity rather
                than swapped in on hover — `opacity: 0` still fetches, so no
                hover is ever answered with a blank frame.

                Mounted from the first question rather than from the fourth, for
                the same reason: these are full-bleed photographs and the set is
                450KB, which is a long wait if it starts when the question
                appears and no wait at all if it starts three questions earlier.
                Every layer stays invisible until `moodBackdrop` names one, and
                nothing but the mood question ever sets it.

                The scrim over them is a vertical gradient: near the page's own
                colour at the top and bottom, where the mark, the headline and
                the controls have to stay readable, and nearly clear across the
                middle band where the pills are and the picture should show. */}
            {currentStep === STEPS.QUIZ && (
                <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
                    {/* Blurred on purpose, and that is also the answer to the
                        resolution: the sources are ~960px wide, so stretched
                        across a full screen they were always going to be soft.
                        Soft by accident reads as a bad image; soft by decision
                        reads as depth of field, and the mood — which is all this
                        picture is here to carry — survives a blur intact.

                        One filter on the group rather than one per layer, and
                        held 64px outside the viewport on every side so the
                        blur's own faded edge is off screen rather than
                        vignetting the frame. A fixed inset rather than a scale:
                        a percentage overhang thins out on a short window, and
                        this has to clear the blur radius at every size. The
                        scrim stays outside it — blurring a gradient does
                        nothing, and moving one would drag its stops off the
                        edges it is there to protect. */}
                    <div className="absolute -inset-16 blur-[14px]">
                        {MOOD_QUESTION.options.map((option) => (
                            <div
                                key={option.value}
                                className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ${
                                    moodBackdrop === option.value ? 'opacity-100' : 'opacity-0'
                                }`}
                                style={{ backgroundImage: `url('/onboarding-moods/${option.value}-full.webp')` }}
                            />
                        ))}
                    </div>
                    <div
                        className={`absolute inset-0 transition-opacity duration-700 ${
                            moodBackdrop ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                            background:
                                'linear-gradient(180deg, rgba(220,221,212,0.92) 0%, rgba(220,221,212,0.62) 16%, rgba(220,221,212,0.12) 34%, rgba(220,221,212,0.12) 66%, rgba(220,221,212,0.62) 86%, rgba(220,221,212,0.92) 100%)',
                        }}
                    />
                </div>
            )}

            {/* No language selector here. Nothing on this page needs switching
                mid-flow. The locale still comes from the URL and the stored
                preference, so a visitor who picked Norwegian on the marketing
                site is still reading Norwegian here. Put it back when the flow
                is worth translating into on the spot. */}

            {/* Header / Logo */}
            {/* Small, and close to the top. It is a mark, not a headline — the
                question underneath is the headline, and every pixel the logo
                takes is distance between the two. */}
            <div className={`absolute top-5 left-0 right-0 flex justify-center md:top-7 z-40 pointer-events-none ${
                currentStep === STEPS.INTRO ? 'hidden' : ''
            }`}>
                <Link href="/" className="hover:opacity-80 transition-opacity pointer-events-auto">
                    <svg width="151" height="39" viewBox="0 0 151 39" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[84px] md:w-[104px] h-auto">
                        <path d="M26.8756 9.80365C27.7045 8.52842 28.0552 7.52417 27.9276 6.79091C27.832 6.05765 27.4016 5.51568 26.6365 5.16499C25.8713 4.8143 24.8671 4.59113 23.6237 4.49549L23.8628 3.53906C24.1816 3.57094 24.7555 3.60282 25.5844 3.6347C26.4452 3.6347 27.3538 3.65064 28.3102 3.68252C29.2985 3.68252 30.0796 3.68252 30.6535 3.68252C31.323 3.68252 31.9606 3.66658 32.5663 3.6347C33.172 3.60282 33.73 3.57094 34.2401 3.53906L34.0009 4.49549C33.2358 4.71865 32.5344 5.02152 31.8968 5.40409C31.2911 5.75478 30.6535 6.3127 29.984 7.07784C29.3145 7.8111 28.5493 8.84723 27.6885 10.1862L9.85119 37.6357C9.24545 37.5719 8.63972 37.54 8.03398 37.54C7.46012 37.54 6.87033 37.5719 6.26459 37.6357L2.48671 7.55605C2.35918 6.40834 2.02444 5.62726 1.48246 5.21281C0.940486 4.76647 0.446332 4.52737 0 4.49549L0.239107 3.53906C1.16365 3.57094 2.35918 3.60282 3.8257 3.6347C5.32411 3.66658 6.80657 3.68252 8.27309 3.68252C9.99465 3.68252 11.5728 3.66658 13.0074 3.6347C14.4739 3.60282 15.6694 3.57094 16.594 3.53906L16.3549 4.49549C15.3347 4.52737 14.5217 4.65489 13.916 4.87806C13.3103 5.10122 12.8958 5.48379 12.6726 6.02577C12.4814 6.56774 12.4335 7.39665 12.5292 8.51248L14.8246 29.6017L12.6726 31.6102L26.8756 9.80365Z" fill="#363636"/>
                        <path d="M134.341 27.212C135.521 26.7019 136.653 26.1281 137.737 25.4905C138.821 24.821 139.777 24.1036 140.606 23.3385C141.849 22.1589 142.869 20.804 143.666 19.2737C144.463 17.7115 144.862 16.0378 144.862 14.2525C144.862 13.7105 144.798 13.3438 144.671 13.1526C144.543 12.9613 144.352 12.8656 144.097 12.8656C143.427 12.8656 142.694 13.2323 141.897 13.9655C141.1 14.6669 140.319 15.6233 139.554 16.8348C138.789 18.0144 138.087 19.3693 137.45 20.8996C136.844 22.398 136.35 23.9602 135.967 25.5861C135.585 27.1801 135.393 28.7423 135.393 30.2726C135.393 32.0898 135.744 33.3172 136.445 33.9548C137.179 34.5925 138.119 34.9113 139.267 34.9113C140 34.9113 141.004 34.6562 142.28 34.1461C143.555 33.6041 144.814 32.6477 146.058 31.2768L146.823 31.6594C146.153 32.7115 145.26 33.7317 144.145 34.72C143.029 35.7083 141.722 36.5212 140.223 37.1589C138.725 37.7646 137.067 38.0675 135.25 38.0675C133.783 38.0675 132.444 37.8124 131.233 37.3023C130.053 36.7922 129.113 36.043 128.411 35.0547C127.71 34.0345 127.359 32.7912 127.359 31.3247C127.359 29.5393 127.646 27.7381 128.22 25.9209C128.794 24.1036 129.607 22.3661 130.659 20.7083C131.711 19.0186 132.97 17.5202 134.437 16.2131C135.935 14.906 137.577 13.8699 139.363 13.1047C141.148 12.3396 143.077 11.957 145.149 11.957C146.679 11.957 147.97 12.2918 149.022 12.9613C150.074 13.5989 150.601 14.6031 150.601 15.974C150.601 17.1855 150.266 18.3332 149.596 19.4172C148.927 20.4692 148.018 21.4416 146.87 22.3343C145.755 23.2269 144.479 24.0239 143.045 24.7253C141.642 25.4267 140.191 26.0324 138.693 26.5425C137.195 27.0526 135.728 27.4511 134.293 27.7381L134.341 27.212Z" fill="#363636"/>
                        <path d="M131.023 12.626L130.879 13.5824H113.711L113.951 12.626H131.023ZM119.928 33.3326C119.705 34.0658 119.705 34.6238 119.928 35.0063C120.151 35.357 120.502 35.5324 120.98 35.5324C121.618 35.5324 122.255 35.1976 122.893 34.5281C123.563 33.8267 124.121 32.8703 124.567 31.6588L125.332 29.6503H126.241L125.332 32.3762C124.694 34.2252 123.738 35.6439 122.463 36.6323C121.219 37.5887 119.705 38.0669 117.92 38.0669C116.389 38.0669 115.21 37.7162 114.381 37.0148C113.552 36.2816 113.058 35.3251 112.898 34.1455C112.739 32.9341 112.867 31.5951 113.281 30.1286L120.359 5.5484C121.921 5.51652 123.323 5.45276 124.567 5.35712C125.81 5.26147 127.022 5.10207 128.201 4.87891L119.928 33.3326Z" fill="#363636"/>
                        <path d="M102.856 12.9135C102.219 12.9135 101.501 13.3598 100.704 14.2525C99.9391 15.1451 99.174 16.3407 98.4088 17.8391C97.6437 19.3375 96.9423 21.0112 96.3047 22.8603C95.6671 24.7094 95.157 26.6063 94.7744 28.551C94.3918 30.4958 94.2005 32.3608 94.2005 34.1461C94.2005 35.2301 94.2962 35.9952 94.4875 36.4415C94.7106 36.8879 95.0454 37.111 95.4917 37.111C96.0974 37.111 96.7829 36.6966 97.548 35.8677C98.3132 35.0069 99.0624 33.8592 99.7956 32.4246C100.561 30.958 101.262 29.3162 101.9 27.499C102.537 25.6499 103.047 23.737 103.43 21.7604C103.845 19.7838 104.052 17.855 104.052 15.974C104.052 14.6988 103.94 13.8699 103.717 13.4873C103.494 13.1047 103.207 12.9135 102.856 12.9135ZM87.0273 30.0813C87.0273 28.5829 87.2346 27.0048 87.649 25.347C88.0635 23.6892 88.6851 22.0792 89.5141 20.517C90.343 18.923 91.395 17.4884 92.6703 16.2131C93.9774 14.906 95.4917 13.8699 97.2133 13.1047C98.9348 12.3396 100.896 11.957 103.095 11.957C105.71 11.957 107.718 12.6425 109.121 14.0133C110.524 15.3842 111.225 17.3608 111.225 19.9432C111.225 21.4416 111.018 23.0197 110.603 24.6775C110.189 26.3353 109.567 27.9612 108.738 29.5553C107.909 31.1174 106.841 32.5521 105.534 33.8592C104.259 35.1344 102.761 36.1546 101.039 36.9198C99.3174 37.6849 97.3567 38.0675 95.157 38.0675C92.5427 38.0675 90.5342 37.382 89.1315 36.0111C87.7287 34.6403 87.0273 32.6637 87.0273 30.0813Z" fill="#363636"/>
                        <path d="M66.5958 37.398H58.9922L64.8264 16.6913C64.9858 16.2131 65.0814 15.8146 65.1133 15.4958C65.1452 15.177 65.0974 14.9379 64.9699 14.7785C64.8742 14.5872 64.667 14.4916 64.3482 14.4916C63.8062 14.4916 63.312 14.7307 62.8657 15.2089C62.4513 15.6871 61.989 16.5798 61.4789 17.8869L60.4746 20.5649H59.566L60.905 16.8826C61.5108 15.1292 62.3397 13.8699 63.3917 13.1047C64.4438 12.3396 65.735 11.957 67.2653 11.957C68.4449 11.957 69.3694 12.1643 70.0389 12.5787C70.7403 12.9613 71.2185 13.4873 71.4735 14.1568C71.7286 14.8263 71.8402 15.5596 71.8083 16.3566C71.7764 17.1217 71.6648 17.8869 71.4735 18.652L66.5958 37.398ZM67.9348 29.9378C69.21 26.2397 70.3896 23.2269 71.4735 20.8996C72.5575 18.5723 73.6096 16.7551 74.6298 15.448C75.6818 14.109 76.7498 13.2004 77.8338 12.7222C78.9496 12.2121 80.1292 11.957 81.3726 11.957C82.9347 11.957 84.0665 12.2918 84.7679 12.9613C85.4693 13.5989 85.8359 14.4756 85.8678 15.5914C85.8996 16.6754 85.6924 17.8709 85.2461 19.178L80.5118 33.3332C80.2248 34.2258 80.177 34.8156 80.3683 35.1025C80.5596 35.3895 80.8146 35.5329 81.1335 35.5329C81.4841 35.5329 81.8986 35.3417 82.3768 34.9591C82.855 34.5446 83.3651 33.6041 83.9071 32.1376L84.8157 29.6509H85.7243L84.5288 33.1419C84.0824 34.4809 83.4926 35.5011 82.7594 36.2024C82.058 36.9038 81.2769 37.382 80.4161 37.6371C79.5872 37.924 78.7583 38.0675 77.9294 38.0675C76.973 38.0675 76.1441 37.924 75.4427 37.6371C74.7732 37.3501 74.2472 36.9357 73.8646 36.3937C73.4183 35.7561 73.1792 34.9431 73.1473 33.9548C73.1473 32.9665 73.4023 31.6913 73.9124 30.1291L78.1207 17.5043C78.312 16.9623 78.4395 16.4841 78.5033 16.0697C78.567 15.6233 78.5511 15.2726 78.4555 15.0176C78.3598 14.7625 78.1526 14.635 77.8338 14.635C77.2599 14.635 76.6064 15.0495 75.8731 15.8784C75.1399 16.7073 74.3747 17.8391 73.5777 19.2737C72.7807 20.7083 71.9677 22.3661 71.1388 24.2471C70.3099 26.1281 69.5129 28.1366 68.7477 30.2726C68.0145 32.3767 67.3769 34.4968 66.8349 36.6328L67.9348 29.9378Z" fill="#363636"/>
                        <path d="M51.7705 5.06906C51.7705 3.34749 52.3284 2.07226 53.4442 1.24335C54.56 0.414451 55.9469 0 57.6047 0C59.0074 0 60.0595 0.270987 60.7609 0.812963C61.4941 1.35494 61.8608 2.1679 61.8608 3.25185C61.8608 4.75025 61.2869 5.96172 60.1392 6.88627C59.0234 7.77893 57.6366 8.22527 55.9787 8.22527C54.6079 8.22527 53.5558 7.95428 52.8225 7.4123C52.1212 6.87033 51.7705 6.08925 51.7705 5.06906ZM49.762 16.6418C50.2083 15.3028 50.0648 14.6333 49.3316 14.6333C48.8534 14.6333 48.407 14.8565 47.9926 15.3028C47.5781 15.7173 47.1477 16.4984 46.7014 17.6461L45.6015 20.5632H44.6929L46.0319 16.8331C46.4782 15.6216 47.0362 14.6652 47.7057 13.9638C48.407 13.2306 49.22 12.7045 50.1445 12.3857C51.0691 12.0669 52.0733 11.9075 53.1573 11.9075C54.3688 11.9075 55.3411 12.1147 56.0744 12.5292C56.8076 12.9436 57.3337 13.4856 57.6525 14.1551C57.9713 14.7927 58.1307 15.51 58.1307 16.3071C58.1307 17.0722 58.0032 17.8373 57.7481 18.6025L52.7747 33.3315C52.5197 34.1285 52.4719 34.6704 52.6313 34.9574C52.7907 35.2124 53.0298 35.3399 53.3486 35.3399C53.6355 35.3399 54.0021 35.1805 54.4485 34.8617C54.8948 34.511 55.373 33.6662 55.8831 32.3272L56.8874 29.6492H57.796L56.6004 33.1402C56.1222 34.4792 55.5165 35.4994 54.7832 36.2007C54.05 36.9021 53.237 37.3803 52.3443 37.6354C51.4835 37.9223 50.6228 38.0658 49.762 38.0658C48.3592 38.0658 47.2115 37.7788 46.3188 37.205C45.4581 36.5992 44.932 35.6906 44.7407 34.4792C44.5495 33.2358 44.7567 31.6896 45.3624 29.8405L49.762 16.6418Z" fill="#363636"/>
                        <path d="M28.91 27.3525C29.9302 26.8743 30.9345 26.3005 31.9228 25.631C32.9111 24.9615 33.8197 24.2282 34.6486 23.4312C35.9238 22.1878 36.96 20.7691 37.757 19.1751C38.5859 17.581 39.0003 15.8595 39.0003 14.0104C39.0003 13.5641 38.9366 13.2612 38.8091 13.1018C38.6815 12.9105 38.4902 12.8149 38.2352 12.8149C37.5976 12.8149 36.8962 13.1815 36.1311 13.9147C35.3978 14.6161 34.6645 15.5726 33.9313 16.784C33.198 17.9636 32.5285 19.3026 31.9228 20.801C31.3489 22.2994 30.8707 23.8456 30.4881 25.4397C30.1375 27.0018 29.9621 28.5162 29.9621 29.9827C29.9621 31.8318 30.3287 33.0752 31.062 33.7128C31.7953 34.3185 32.7517 34.6214 33.9313 34.6214C34.5689 34.6214 35.5253 34.3823 36.8006 33.9041C38.0758 33.4258 39.351 32.5491 40.6263 31.2739L41.3914 31.6565C40.69 32.7085 39.7655 33.7287 38.6178 34.717C37.4701 35.7053 36.1151 36.5183 34.553 37.1559C32.9908 37.7616 31.2374 38.0645 29.2926 38.0645C27.7942 38.0645 26.4074 37.8095 25.1322 37.2994C23.8888 36.7893 22.8846 36.0401 22.1194 35.0518C21.3862 34.0316 21.0195 32.7882 21.0195 31.3217C21.0195 29.4407 21.3065 27.5757 21.8803 25.7266C22.4861 23.8775 23.3309 22.1241 24.4148 20.4663C25.4988 18.8085 26.79 17.3419 28.2884 16.0667C29.8187 14.7596 31.5083 13.7394 33.3574 13.0061C35.2065 12.2729 37.1831 11.9062 39.2873 11.9062C40.977 11.9062 42.3797 12.2569 43.4955 12.9583C44.6433 13.6278 45.2171 14.6799 45.2171 16.1145C45.2171 17.326 44.8983 18.4737 44.2607 19.5577C43.6231 20.6097 42.7463 21.5821 41.6305 22.4748C40.5147 23.3355 39.2554 24.1166 37.8526 24.818C36.4499 25.5194 34.9674 26.1251 33.4052 26.6352C31.875 27.1453 30.3606 27.5438 28.8622 27.8307L28.91 27.3525Z" fill="#363636"/>
                    </svg>
                </Link>
            </div>

            {/* The paywall's two plans, the intro carousel and the video answer
                cards all need more room than the plain question steps — the
                carousel because its frame is one constant box across all six
                slides, sized so the studio demo inside it stays legible. */}
            <main
                className={`w-full relative z-10 ${
                    currentStep === STEPS.QUIZ && (currentQuestion as any).isCards
                        ? 'max-w-4xl'
                        : currentStep === STEPS.INTRO || currentStep === STEPS.PAYWALL
                          // A fifth narrower than the 4xl it used to be. The
                          // carousel's frame is the widest thing in the flow and
                          // was reading as a slab; the paywall keeps 4xl because
                          // its two plans sit side by side.
                          ? currentStep === STEPS.INTRO
                              ? 'max-w-[716px]'
                              : 'max-w-4xl'
                          : 'max-w-2xl'
                }`}
            >
                {/* No AnimatePresence around the flow. It ran `mode="wait"`,
                    which held the outgoing step for its exit animation, removed
                    it, and only then mounted the next one — so between any two
                    steps there was a beat with nothing on screen, and the page
                    collapsed to its padding and sprang back. The same flinch
                    the carousel had between slides, one level up. Steps now
                    swap in a single paint; each one still fades itself in on
                    mount, which needs no coordination to leave. */}
                {currentStep === STEPS.INTRO && (
                        <IntroCarousel
                            key="intro"
                            startAtEnd={introStartAtEnd}
                            // A plain state setter, so the effect reporting the
                            // index doesn't re-run on every render.
                            onIndexChange={setIntroIndex}
                            onComplete={() => {
                                // The next arrival at the intro is a fresh one
                                // unless another back-out says otherwise.
                                setIntroStartAtEnd(false);
                                setCurrentStep(STEPS.QUIZ);
                            }}
                        />
                    )}

                    {currentStep === STEPS.QUIZ && (
                        <motion.div
                            key={`q-${currentQuestionIndex}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col"
                        >
                            {/* Question and answers together in one box of a
                                fixed height, so the controls under it land in
                                exactly the same place on all five questions.
                                Measured rather than guessed: the tallest of the
                                five needs 612px here, and the shortest 448, so
                                without this the Next button moved 164px between
                                one question and the next and the pointer had to
                                chase it.

                                From `md` only. Below it the picture cards stack
                                into a 1204px column while the swipe deck is
                                308px, and reserving the taller of those would
                                leave most questions floating in half a screen of
                                nothing. On a phone the thumb is already at the
                                bottom of the screen and the page scrolls; the
                                problem this solves is a mouse on a desktop.

                                The gap between the headline and the answers
                                still varies by question type — picture cards sit
                                closer than a column of text — but it varies
                                inside this box now, so it no longer moves
                                anything below it. */}
                            <div
                                className={`flex flex-col sm:min-h-[760px] md:min-h-[620px] ${
                                    (currentQuestion as any).isCards || (currentQuestion as any).isGoals
                                        ? 'space-y-7 md:space-y-8'
                                        : 'space-y-12'
                                }`}
                            >
                            {/* The progress bar that used to sit here is gone —
                                the dots in the controls below say the same
                                thing, and saying it twice on one screen made
                                the question compete with its own chrome. */}
                            {/* One line on anything wider than a phone, which
                                takes two things.

                                Width: the headline steps outside its column.
                                Most questions give `main` 2xl (672px), which is
                                the right measure for a stack of answer rows but
                                too narrow for a 40-character question. `left-1/2`
                                puts this box's left edge on the column's centre
                                and the translate pulls it back by half its own
                                width, so it stays centred while spanning wider —
                                and it never exceeds the viewport less the page's
                                own gutters. The answer rows below are untouched,
                                as are the cards, deck and goals layouts, which
                                is why this isn't done by widening `main`.

                                Size: a clamp rather than breakpoint steps,
                                because what has to hold is a property of the
                                text, not of the viewport. The widest question in
                                any locale ("What do you want most from
                                songwriting?") measures 18.1px of width per 1px
                                of font size, so at the 2.25rem cap it needs
                                636px of the 768 available. Fixed steps would let
                                it wrap somewhere between two breakpoints. Below
                                ~500px it wraps to two lines, which is the right
                                answer on a phone — the floor keeps the headline
                                readable rather than shrinking it to fit. */}
                            {/* Hidden once a card question has been answered.
                                The chosen card takes the whole width and asks
                                the next question on its own face, so leaving
                                this one above it put two questions on screen at
                                once — and the top one was the one already
                                answered. The card carries the headline from
                                there. */}
                            {!((currentQuestion as any).isCards && selectedOption) && (
                            <div className="relative left-1/2 w-[min(48rem,100vw-3rem)] -translate-x-1/2 text-center">
                                <h2 className="text-[clamp(1.5rem,3.4vw,2.25rem)] font-sans font-light tracking-tight text-[#363636] leading-[1.15]">
                                    {t(`onboarding.questions.${currentQuestion.id}.question`)}
                                </h2>
                            </div>
                            )}

                            {(currentQuestion as any).isCards ? (
                                <QuestionCards
                                    questionId={currentQuestion.id}
                                    options={currentQuestion.options}
                                    selectedOption={selectedOption}
                                    onSelect={(value) => handleAnswer(value)}
                                    nested={{
                                        questionId: NESTED_QUESTION.id,
                                        options: NESTED_QUESTION.options,
                                        value: nestedValue,
                                        onSelect: handleNestedAnswer,
                                    }}
                                />
                            ) : (currentQuestion as any).isDeck ? (
                                <SwipeDeck
                                    questionId={currentQuestion.id}
                                    options={currentQuestion.options}
                                    onChange={handleMultiAnswer}
                                    onComplete={handleDeckComplete}
                                    state={deckState}
                                    onStateChange={setDeckState}
                                />
                            ) : (currentQuestion as any).isGoals ? (
                                <GoalBox
                                    questionId={currentQuestion.id}
                                    options={currentQuestion.options}
                                    picked={currentValues}
                                    onChange={handleMultiAnswer}
                                />
                            ) : (currentQuestion as any).isVisual ? (
                                <MoodOptions
                                    questionId={currentQuestion.id}
                                    options={currentQuestion.options}
                                    selectedOption={selectedOption}
                                    onSelect={(value) => handleAnswer(value)}
                                    onPreview={setMoodBackdrop}
                                />
                            ) : (
                            /* Its own 2xl, so widening the column for the
                               headline above doesn't stretch the answer rows
                               past a comfortable line length. */
                            <div className="mx-auto grid w-full max-w-2xl gap-3 md:gap-5">
                                {currentQuestion.options.map((option) => (
                                    <motion.button
                                        key={option.value}
                                        onClick={() => handleAnswer(option.value)}
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`group relative w-full px-5 md:px-8 py-5 md:py-6 text-left border transition-all duration-300 rounded-2xl overflow-hidden ${selectedOption === option.value
                                            ? 'border-[#363636] bg-white text-stone-900 shadow-[0_8px_30px_rgba(0,0,0,0.03)]'
                                            : 'border-stone-200/80 bg-[#EFF0E7]/40 text-[#363636]/80 hover:border-[#363636]/40 hover:bg-[#EFF0E7]/80'
                                            }`}
                                    >
                                        <div className="relative flex items-center justify-between">
                                            <span className={`text-[18px] md:text-[21px] font-sans font-medium transition-colors duration-300 ${
                                                selectedOption === option.value ? 'text-stone-950' : 'text-stone-800 group-hover:text-stone-950'
                                            }`}>
                                                {t(`onboarding.questions.${currentQuestion.id}.options.${option.value}`)}
                                            </span>
                                            <ChevronRight className={`transition-all duration-500 shrink-0 ${selectedOption === option.value ? 'text-stone-950 translate-x-0 opacity-100' : 'text-stone-600 -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} size={18} />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                            )}
                            </div>

                            {/* One cluster in the middle rather than a row spread
                                to the page's edges. Spread out, Back and Next
                                sat at opposite ends of a 900px span and the
                                pointer had to cross the whole screen between
                                them; gathered up, every control is a short move
                                from the last one.

                                Back is the icon alone in grey: it is the one
                                control here nobody should be drawn to. Next
                                carries the only fill on the screen.

                                One fixed margin, not the per-question spacing
                                that used to sit here — the box above is a
                                constant height now, so a constant gap under it
                                is what actually pins this row in place. */}
                            {/* The row carries its own surface: a pane of the
                                page's own colour, held slightly translucent and
                                blurred behind. The mood question puts a
                                full-bleed photograph behind this whole screen,
                                and a photograph is not a colour you can style
                                against — a purple one turns grey dots and grey
                                text to mush. Tinting the page's own #DCDDD4
                                rather than white or black keeps the controls
                                looking like part of the page on the steps that
                                have no picture at all, while still guaranteeing
                                something to read against on the ones that do.

                                Always present rather than only over an image:
                                a bar that appears and disappears between steps
                                is a bigger change than the one it prevents. */}
                            <div className="sticky bottom-4 z-40 mx-auto mt-10 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-4 rounded-[36px] bg-[#DCDDD4]/35 px-6 py-3 backdrop-blur-2xl backdrop-saturate-150 sm:gap-x-7">
                                <Tooltip label={t('onboarding.go_back')}>
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        aria-label={t('onboarding.go_back')}
                                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/55 text-stone-700 transition-colors hover:bg-white hover:text-stone-900"
                                    >
                                        <ArrowLeft size={22} className="stroke-[2.25px]" />
                                    </button>
                                </Tooltip>

                                <div className="flex flex-col items-center gap-2">
                                    {/* Dots alone. The "Step 1 of 4" beside them
                                        counted the same thing twice, in words,
                                        and words next to a green button are the
                                        first place the eye lands — so the label
                                        was winning attention from the control it
                                        was standing next to.

                                        Read-only. Unlike the carousel's dots
                                        these aren't jumps: a question you
                                        haven't reached has no answer to show and
                                        nothing to go back to.

                                        Black, not green — the same dots the
                                        carousel uses, so progress reads the same
                                        way in both halves of the flow. Green is
                                        the colour of the one thing to press. */}
                                    <div className="flex items-center gap-1.5" aria-hidden="true">
                                        {Array.from({ length: QUIZ_BEATS }, (_, i) => (
                                            <span
                                                key={i}
                                                className={`rounded-full transition-all duration-300 ${
                                                    i === currentBeat
                                                        ? 'h-2.5 w-2.5 bg-stone-900'
                                                        : i < currentBeat
                                                            ? 'h-1.5 w-1.5 bg-stone-900'
                                                            : 'h-1.5 w-1.5 bg-stone-900/20'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    {/* The skip link is gone; this is what that
                                        line under the dots is for now. It only
                                        appears when Next is pressed with nothing
                                        chosen, so the row is a single line of
                                        dots the rest of the time. */}
                                    {nudgeCount > 0 && (
                                        <motion.p
                                            key={nudgeCount}
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25 }}
                                            role="status"
                                            className="text-[13px] font-semibold text-[#3f6b3a]"
                                        >
                                            {t('onboarding.quiz.pick_one')}
                                        </motion.p>
                                    )}
                                </div>

                                {/* Present on every question, including the
                                    deck. The deck advances on its own when it
                                    runs out of cards, but dropping the seat
                                    there re-centred the two controls that were
                                    left and the whole cluster shifted between
                                    one question and the next — Back and the dots
                                    landing somewhere new each step. Three seats
                                    on all five questions is worth more than
                                    saving a button nobody has to press.

                                    Never disabled. A greyed-out button explains
                                    nothing: it says "not yet" without saying
                                    what is missing, and on a question whose
                                    answers are pictures or cards it isn't even
                                    obvious that something is. Pressing it with
                                    no answer shakes it once and says what to
                                    do — the same amount of information, offered
                                    at the moment it was asked for.

                                    Styled like the carousel's button, solid
                                    offset shadow and all, so the thing you press
                                    to go forward looks the same from the first
                                    slide to the last question. */}
                                <button
                                    type="button"
                                    onClick={handleQuizNext}
                                    // Remounting on each nudge restarts the
                                    // animation; a class toggle alone would only
                                    // fire the first time, since re-adding a
                                    // class on an element that never lost it is
                                    // not a change the engine replays.
                                    key={`next-${nudgeCount}`}
                                    className={`flex shrink-0 items-center gap-2.5 rounded-full bg-[#86BE7F] px-8 py-4 text-base font-bold tracking-tight text-stone-900 shadow-[0_5px_0_0_#5F9857] transition-[transform,box-shadow] duration-100 hover:brightness-[1.03] active:translate-y-[5px] active:shadow-[0_0_0_0_#5F9857] sm:px-10 sm:text-lg ${
                                        nudgeCount > 0 ? 'animate-nudge-shake' : ''
                                    }`}
                                >
                                    {t('onboarding.intro.next')}
                                    <ArrowRight className="h-5 w-5 stroke-[2.75px]" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* The analysis stays on screen for the email step — the
                        dialog opens over it rather than replacing it. Frozen
                        while it does: the pass has already finished, and letting
                        its timers run behind a dialog would rotate quotes
                        nobody can read. The step ends when Reveal is pressed. */}
                    {(currentStep === STEPS.ANALYZING || currentStep === STEPS.EMAIL) && (
                        <AnalyzingAnswers
                            key="analyzing"
                            answers={answerLabels}
                            frozen={currentStep === STEPS.EMAIL}
                            onComplete={() => setCurrentStep(STEPS.EMAIL)}
                        />
                    )}

                    {currentStep === STEPS.VERDICT && (
                        <VerdictReveal
                            key="verdict"
                            answers={answers}
                            onContinue={() => setCurrentStep(STEPS.OFFER)}
                        />
                    )}

                    {currentStep === STEPS.OFFER && (
                        <TrialOffer
                            key="offer"
                            onBack={() => setCurrentStep(STEPS.VERDICT)}
                            onContinue={() => setCurrentStep(STEPS.PAYWALL)}
                        />
                    )}

                    {/* The code that finishes the signup, and the only step
                        that sends anyone away from the page. It is last for
                        that reason — see the flow note at the top. */}
                    {currentStep === STEPS.VERIFY && (
                        <OtpVerify
                            key="verify"
                            email={email}
                            isSubmitting={isVerifying}
                            error={verifyError}
                            onVerify={handleVerify}
                            onResend={handleResendCode}
                            onChangeEmail={() => setCurrentStep(STEPS.EMAIL)}
                        />
                    )}

                    {currentStep === STEPS.PAYWALL && (
                        <PaywallPlans
                            key="paywall"
                            // No way back when the plans were linked to
                            // directly — there is nothing behind them.
                            onBack={checkoutChoice || answerLabels.length ? () => setCurrentStep(STEPS.OFFER) : undefined}
                            onCheckout={handlePlanChosen}
                            isSubmitting={isOpeningCheckout}
                            error={checkoutError}
                        />
                    )}

                    {currentStep === STEPS.WELCOME && (
                        <WelcomeAboard key="welcome" signupsOpen={SIGNUPS_OPEN} onRestart={restartFlow} />
                    )}
            </main>

            {/* The email step, as a dialog over the analysis rather than a
                screen of its own. The pass that just read their answers back
                stays behind it, blurred — which is the point: the thing being
                asked for is somewhere to put THOSE results, and they should
                still be on screen while the asking happens.

                No way to dismiss it, and that is deliberate rather than an
                oversight: there is nothing behind it to return to, so an X or
                an Escape key would only strand someone on a frozen screen.
                It closes by being answered.

                z-50 clears the sticky controls at z-40. The blur sits on the
                overlay itself so it takes in the whole page, mark and all,
                rather than only what happens to be inside <main>. */}
            {currentStep === STEPS.EMAIL && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('onboarding.email.title')}
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#DCDDD4]/45 px-6 py-10 backdrop-blur-2xl backdrop-saturate-150"
                >
                    <div className="w-full max-w-2xl">
                        <EmailCapture
                            initialEmail={email}
                            isSubmitting={isSubmittingEmail}
                            error={emailError}
                            onSubmit={handleEmailSubmit}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );
}
