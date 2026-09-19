/**
 * The onboarding quiz, as ids and answer values only.
 *
 * Two places ask these questions: the onboarding flow, once, on the way in,
 * and the profile's "Get to know you", any time after. Both read this list so
 * an answer given in either lands under the same id in users/{uid}.answers and
 * means the same thing to everything downstream (the verdict, the public
 * profile's songwriter type, the goals Mind Power follows). Every visible label
 * is looked up under `onboarding.questions.<id>` in the locale files.
 */
export interface OnboardingQuestion {
    id: string;
    options: { value: string }[];
    /** Picture cards; labels live under `options.<value>.title` / `.desc`. */
    isCards?: boolean;
    /** A swipe deck: takes every option swiped right, as an array. */
    isDeck?: boolean;
    /** Cards into a box, plus any the person writes: an array, custom entries included. */
    isGoals?: boolean;
    /** Photograph pills. */
    isVisual?: boolean;
}

/** The steps of the quiz, in order. */
export const QUESTIONS: OnboardingQuestion[] = [
    {
        id: 'songwriter_type',
        isCards: true,
        options: [
            { value: 'lyricist' },
            { value: 'melodist' },
            { value: 'producer' },
            { value: 'storyteller' },
            { value: 'explorer' },
        ],
    },
    {
        id: 'struggle',
        isDeck: true,
        options: [
            { value: 'unfinished' },
            { value: 'weak_melodies' },
            { value: 'no_structure' },
            { value: 'too_similar' },
            { value: 'overthink' },
        ],
    },
    {
        id: 'dream_outcome',
        isGoals: true,
        options: [
            { value: 'finish_songs' },
            { value: 'unique_sound' },
            { value: 'move_people' },
            { value: 'release_music' },
            { value: 'creative_fearless' },
            { value: 'write_for_loved_ones' },
            { value: 'feel_better' },
            { value: 'meet_songwriters' },
            { value: 'earn_money' },
        ],
    },
    {
        id: 'emotional_inspiration',
        isVisual: true,
        options: [
            { value: 'melancholic' },
            { value: 'energetic' },
            { value: 'cinematic' },
            { value: 'dark' },
            { value: 'intimate' },
        ],
    },
];

/**
 * Asked on the face of the chosen songwriter-type card rather than as a step
 * of its own, so it is not in QUESTIONS (that list is the steps). Its answer
 * still lands under its own id.
 */
export const NESTED_QUESTION: OnboardingQuestion = {
    id: 'creation_method',
    options: [
        { value: 'lyric_phrase' },
        { value: 'melody_head' },
        { value: 'chords' },
        { value: 'beat_production' },
        { value: 'improvisation' },
    ],
};

/**
 * The same questions in the order the profile asks them: the type, then the
 * question that was folded into it, then the rest.
 */
export const GET_TO_KNOW_YOU_QUESTIONS: OnboardingQuestion[] = [
    QUESTIONS[0],
    NESTED_QUESTION,
    ...QUESTIONS.slice(1),
];

/** One value per question, or a list for the questions that take several. */
export type Answers = Record<string, string | string[]>;

/** The two questions that take a list rather than one value. */
export const takesSeveral = (q: OnboardingQuestion) => !!(q.isDeck || q.isGoals);

/**
 * A goal the person wrote themselves is stored as its own text behind this
 * marker, so it stays distinguishable from the option ids without a second
 * field on the answer.
 */
export const CUSTOM_PREFIX = 'custom:';
export const isCustom = (value: string) => value.startsWith(CUSTOM_PREFIX);
export const customText = (value: string) => value.slice(CUSTOM_PREFIX.length);
/** A written goal fits on a card, and no more. */
export const CUSTOM_MAX_LENGTH = 38;

/** The locale key for an option's label; the picture cards keep theirs one level down. */
export function optionLabelKey(question: OnboardingQuestion, value: string): string {
    const base = `onboarding.questions.${question.id}.options.${value}`;
    return question.isCards ? `${base}.title` : base;
}

/** The answer to a question as a list, whichever shape it was stored in. */
export function answerList(answers: Answers, id: string): string[] {
    const value = answers[id];
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
    return typeof value === 'string' && value ? [value] : [];
}

export const hasAnswer = (answers: Answers, id: string) => answerList(answers, id).length > 0;

/** How much of "Get to know you" has been answered. */
export function answeredCount(answers: Answers): { answered: number; total: number } {
    const total = GET_TO_KNOW_YOU_QUESTIONS.length;
    const answered = GET_TO_KNOW_YOU_QUESTIONS.filter(q => hasAnswer(answers, q.id)).length;
    return { answered, total };
}

/** What Firestore handed back, kept to the shape the app writes. */
export function sanitizeAnswers(raw: unknown): Answers {
    if (!raw || typeof raw !== 'object') return {};
    const out: Answers = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === 'string') out[key] = value;
        else if (Array.isArray(value)) out[key] = value.filter((v): v is string => typeof v === 'string');
    }
    return out;
}
