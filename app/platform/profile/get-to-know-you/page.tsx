"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useOnboardingAnswers } from '@/lib/getToKnowYou';
import { QUESTIONS, NESTED_QUESTION, answerList, hasAnswer, isCustom, type Answers } from '@/lib/onboardingQuestions';
import QuestionCards from '@/app/onboarding/components/QuestionCards';
import SwipeDeck, { type DeckState } from '@/app/onboarding/components/SwipeDeck';
import GoalBox from '@/app/onboarding/components/GoalBox';
import MoodOptions from '@/app/onboarding/components/MoodOptions';
import GetToKnowYouProgress from '../components/GetToKnowYouProgress';

/** The nested question's row lights up for this long before the step moves on; same beat as onboarding. */
const NESTED_ADVANCE_MS = 420;

const MOOD_QUESTION = QUESTIONS.find(q => q.isVisual)!;

/**
 * Get to know you: the onboarding quiz, asked again inside the profile.
 *
 * The same questions, the same cards, deck, box and mood pills, one step at
 * a time with the same controls under them. What is different is where the
 * answers live: each one is written to the account as it is given, and the
 * ones already given are filled in on arrival, so the quiz opens on the
 * first question still unanswered and the bar at the top says how far along
 * it is. Every question can be changed or cleared; nothing is locked.
 */
export default function GetToKnowYouPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { answers, loaded, save, progress } = useOnboardingAnswers(user?.uid ?? null);

    if (!user) return null;

    return (
        <div className="space-y-6 md:space-y-8 px-5 md:px-0 text-stone-900 font-sans">
            <header className="space-y-4">
                <h1 className="text-3xl font-sans font-light tracking-tight text-stone-900">{t('profile.gtky_title')}</h1>
                <GetToKnowYouProgress answered={progress.answered} total={progress.total} t={t} className="max-w-xl" />
            </header>

            {!loaded ? (
                <div className="h-[420px] rounded-[16px] bg-stone-200/40 animate-pulse" />
            ) : (
                // Mounted only once the stored answers are in, so the deck and
                // the step index can be seeded from them in one go.
                <Quiz answers={answers} save={save} t={t} />
            )}
        </div>
    );
}

/**
 * The struggle deck's record, rebuilt from the stored answer. A card that was
 * passed leaves no trace in the answer, so once the question has been
 * answered every card not kept is taken as passed; an unanswered question
 * deals the whole deck.
 */
function deckFromAnswers(answers: Answers): DeckState {
    const deck = QUESTIONS.find(q => q.isDeck)!;
    if (!hasAnswer(answers, deck.id)) return { decisions: [], written: [] };
    const kept = answerList(answers, deck.id);
    const written = kept.filter(isCustom);
    return {
        decisions: [...deck.options.map(o => o.value), ...written].map(value => ({
            value,
            direction: kept.includes(value) ? 'keep' : 'pass',
        })),
        written,
    };
}

/** The first step with a question still open; the start when every one is answered. */
function firstOpenStep(answers: Answers): number {
    const open = QUESTIONS.findIndex((q, i) =>
        i === 0 ? !hasAnswer(answers, q.id) || !hasAnswer(answers, NESTED_QUESTION.id) : !hasAnswer(answers, q.id),
    );
    return open < 0 ? 0 : open;
}

function Quiz({
    answers,
    save,
    t,
}: {
    answers: Answers;
    save: (id: string, value: string | string[] | null) => Promise<void>;
    t: (key: string) => string;
}) {
    const router = useRouter();
    const [index, setIndex] = useState(() => firstOpenStep(answers));
    const [deckState, setDeckState] = useState<DeckState>(() => deckFromAnswers(answers));
    const [moodBackdrop, setMoodBackdrop] = useState<string | null>(null);
    const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

    const question = QUESTIONS[index];
    const single = answers[question.id];
    const selectedOption = typeof single === 'string' ? single : null;
    const nestedRaw = answers[NESTED_QUESTION.id];
    const nestedValue = typeof nestedRaw === 'string' ? nestedRaw : null;
    const currentValues = answerList(answers, question.id);

    // Five dots for four steps: choosing a type opens its card and asks the
    // second question on it, and that opening is a beat of its own.
    const beats = QUESTIONS.length + 1;
    const currentBeat = index === 0 ? (selectedOption ? 1 : 0) : index + 1;

    /** Pressing the chosen answer again clears it; a question may be left open. */
    const handleAnswer = (value: string) => {
        void save(question.id, value === selectedOption ? null : value);
    };

    const handleCardChoice = (value: string) => {
        if (value === selectedOption) {
            // Taking the type back drops the question that was asked on its
            // face: that answer was given as a Lyricist and would not carry.
            void save(NESTED_QUESTION.id, null);
            void save(question.id, null);
            return;
        }
        void save(question.id, value);
    };

    const handleNestedAnswer = (value: string) => {
        void save(NESTED_QUESTION.id, value);
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => setIndex(i => Math.min(i + 1, QUESTIONS.length - 1)), NESTED_ADVANCE_MS);
    };

    const handleMultiAnswer = (values: string[]) => {
        void save(question.id, values);
    };

    const handleBack = () => {
        if (index > 0) setIndex(i => i - 1);
        else router.push('/platform/profile');
    };

    const handleNext = () => {
        if (index < QUESTIONS.length - 1) setIndex(i => i + 1);
        else router.push('/platform/profile');
    };

    const wide = question.isCards || question.isDeck;

    return (
        // `overflow-clip`, not `overflow-hidden`: both keep the backdrop inside
        // the rounded frame, but `hidden` makes this a scroll container, and a
        // scroll container can be scrolled by anything that focuses inside it
        // (a card, the goal row) with no scrollbar to show it happened. The
        // headline was quietly pushed up under the frame's edge that way.
        <div className="relative -mx-5 md:mx-0 overflow-clip rounded-[24px] px-5 md:px-6 py-6 md:py-8">
            {/* The mood question's photographs behind the whole step, as in
                onboarding: all five mounted and crossfaded, blurred, under a
                scrim that keeps the headline and the controls readable. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute -inset-16 blur-[14px]">
                    {MOOD_QUESTION.options.map(option => (
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
                    className={`absolute inset-0 transition-opacity duration-700 ${moodBackdrop ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                        background:
                            'linear-gradient(180deg, rgba(250,249,245,0.92) 0%, rgba(250,249,245,0.62) 16%, rgba(250,249,245,0.12) 34%, rgba(250,249,245,0.12) 66%, rgba(250,249,245,0.62) 86%, rgba(250,249,245,0.92) 100%)',
                    }}
                />
            </div>

            <main className={`relative z-10 mx-auto w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
                <motion.div
                    key={`q-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col"
                >
                    {/* One box of a fixed height on wide screens, so the controls
                        under it stay put from one question to the next. */}
                    <div className={`flex flex-col sm:min-h-[760px] md:min-h-[620px] ${
                        question.isCards || question.isGoals ? 'space-y-4 md:space-y-5' : 'space-y-12'
                    }`}>
                        {/* The chosen card carries the headline once it is open. */}
                        {!(question.isCards && selectedOption) && (
                            <div className="relative left-1/2 w-[min(48rem,100vw-3rem)] -translate-x-1/2 text-center">
                                <h2 className="text-[clamp(1.5rem,3.4vw,2.25rem)] font-sans font-light tracking-tight text-[#363636] leading-[1.15]">
                                    {t(`onboarding.questions.${question.id}.question`)}
                                </h2>
                            </div>
                        )}

                        {question.isCards ? (
                            <QuestionCards
                                questionId={question.id}
                                options={question.options}
                                selectedOption={selectedOption}
                                onSelect={handleCardChoice}
                                nested={{
                                    questionId: NESTED_QUESTION.id,
                                    options: NESTED_QUESTION.options,
                                    value: nestedValue,
                                    onSelect: handleNestedAnswer,
                                }}
                            />
                        ) : question.isDeck ? (
                            <SwipeDeck
                                questionId={question.id}
                                options={question.options}
                                onChange={handleMultiAnswer}
                                onComplete={handleMultiAnswer}
                                state={deckState}
                                onStateChange={setDeckState}
                            />
                        ) : question.isGoals ? (
                            <GoalBox
                                questionId={question.id}
                                options={question.options}
                                picked={currentValues}
                                onChange={handleMultiAnswer}
                            />
                        ) : (
                            <MoodOptions
                                questionId={question.id}
                                options={question.options}
                                selectedOption={selectedOption}
                                onSelect={handleAnswer}
                                onPreview={setMoodBackdrop}
                            />
                        )}
                    </div>

                    {/* Back, the dots, Next: the same cluster as onboarding. The
                        last Next goes home to the profile. */}
                    <div className="sticky bottom-4 z-40 mx-auto mt-10 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-4 rounded-[36px] bg-[#DCDDD4]/35 px-6 py-3 backdrop-blur-2xl backdrop-saturate-150 sm:gap-x-7">
                        <Tooltip label={t('onboarding.go_back')}>
                            <button
                                type="button"
                                onClick={handleBack}
                                aria-label={t('onboarding.go_back')}
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/55 text-stone-700 transition-colors hover:bg-white hover:text-stone-900 cursor-pointer"
                            >
                                <ArrowLeft size={22} className="stroke-[2.25px]" />
                            </button>
                        </Tooltip>

                        <div className="flex items-center gap-1.5" aria-hidden="true">
                            {Array.from({ length: beats }, (_, i) => (
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

                        <button
                            type="button"
                            onClick={handleNext}
                            data-quiz-next
                            className="flex shrink-0 items-center gap-2.5 rounded-full bg-[#86BE7F] px-8 py-4 text-base font-bold tracking-tight text-stone-900 shadow-[0_5px_0_0_#5F9857] transition-[transform,box-shadow] duration-100 hover:brightness-[1.03] active:translate-y-[5px] active:shadow-[0_0_0_0_#5F9857] sm:px-10 sm:text-lg cursor-pointer"
                        >
                            {index < QUESTIONS.length - 1 ? t('onboarding.intro.next') : t('common.done')}
                            <ArrowRight className="h-5 w-5 stroke-[2.75px]" />
                        </button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
