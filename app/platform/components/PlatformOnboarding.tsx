"use client";

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { readCachedGuideSeen, fetchGuideSeen, markGuideSeen, consumeGuideReplayIntent } from '@/lib/onboardingGuide';
import OnboardingTour, { TourStep } from './OnboardingTour';

/**
 * Intro video shown as the guide's first step, replacing the old standalone welcome
 * modal. Hosted on Firebase Storage rather than in `public/` — same as lesson videos,
 * which gets us CDN delivery, byte-range streaming and immutable caching instead of
 * serving 30MB through the Next.js server.
 *
 * To replace it: put the master in `public/Onboarding assets/` (gitignored) and run
 *   node scripts/upload-lesson-video.mjs <file> <new-slug>
 * then paste the printed URLs here. Use a NEW slug — the filename is the cache key.
 */
const INTRO_VIDEO_SRC =
    'https://firebasestorage.googleapis.com/v0/b/mep-v2.firebasestorage.app/o/content%2Flessons%2Fonboarding-demo-tour-v4.mp4?alt=media';
const INTRO_VIDEO_POSTER =
    'https://firebasestorage.googleapis.com/v0/b/mep-v2.firebasestorage.app/o/content%2Flessons%2Fonboarding-demo-tour-v4-poster.jpg?alt=media';

/**
 * Peter's welcome — the guide opens on a person, not a product tour. Uploaded
 * with the same pipeline from `public/videos/Welcome - onboarding/Welcome_V3.mp4`,
 * which is gitignored and therefore absent in production; only the Storage copy
 * is safe to reference.
 */
const WELCOME_VIDEO_SRC =
    'https://firebasestorage.googleapis.com/v0/b/mep-v2.firebasestorage.app/o/content%2Flessons%2Fwelcome-peter-v1.mp4?alt=media';
const WELCOME_VIDEO_POSTER =
    'https://firebasestorage.googleapis.com/v0/b/mep-v2.firebasestorage.app/o/content%2Flessons%2Fwelcome-peter-v1-poster.jpg?alt=media';

/** The guide runs on the Create canvas, where every highlighted feature lives. */
const GUIDE_ROUTE = '/platform/create';

export default function PlatformOnboarding() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();
    const { user, loading } = useAuth();

    // null = not resolved yet. Never render the tour on an unresolved state, or a
    // returning user gets a flash of onboarding before Firestore answers.
    const [seen, setSeen] = useState<boolean | null>(null);

    // Whether this run was launched by "Play demo" — it opens the intro video
    // centered and playing instead of docked in the corner.
    //
    // Checked when the guide becomes eligible rather than on mount: this component
    // lives in the platform layout, so it is already mounted (on the profile page)
    // when the button sets the flag, and a mount-only effect would never see it.
    const [isReplay, setIsReplay] = useState(false);
    useEffect(() => {
        if (seen === false && pathname === GUIDE_ROUTE && consumeGuideReplayIntent()) {
            setIsReplay(true);
        }
    }, [seen, pathname]);

    useEffect(() => {
        if (loading || !user) return;
        const cached = readCachedGuideSeen(user.uid);
        if (cached !== null) {
            setSeen(cached);
            return;
        }
        let cancelled = false;
        fetchGuideSeen(user.uid).then(value => {
            if (!cancelled) setSeen(value);
        });
        return () => { cancelled = true; };
        // pathname is a dep so a reset from settings is picked up on navigation —
        // resetGuide writes the local cache, so this re-read costs nothing.
    }, [user, loading, pathname]);

    // A brand-new account landing on Learn gets moved to the canvas, where the guide runs.
    useEffect(() => {
        if (seen === false && pathname === '/platform') {
            router.replace(GUIDE_ROUTE);
        }
    }, [seen, pathname, router]);

    const handleFinish = useCallback(() => {
        setSeen(true);
        if (user) markGuideSeen(user.uid);
    }, [user]);

    if (!user || seen !== false || pathname !== GUIDE_ROUTE) return null;

    const steps: TourStep[] = [
        {
            video: WELCOME_VIDEO_SRC,
            poster: WELCOME_VIDEO_POSTER,
        },
        {
            video: INTRO_VIDEO_SRC,
            poster: INTRO_VIDEO_POSTER,
        },
        {
            target: '[data-tour="create-canvas"]',
            title: t('onboarding_tour.canvas_title'),
            description: t('onboarding_tour.canvas_desc'),
        },
        {
            target: '[data-tour="create-record"]',
            title: t('onboarding_tour.record_title'),
            description: t('onboarding_tour.record_desc'),
        },
        {
            target: '[data-tour="create-tools"]',
            title: t('onboarding_tour.tools_title'),
            description: t('onboarding_tour.tools_desc'),
        },
        {
            target: '[data-tour="create-studio"]',
            title: t('onboarding_tour.studio_title'),
            description: t('onboarding_tour.studio_desc'),
        },
        {
            target: '[data-tour="create-inspirations"]',
            title: t('onboarding_tour.inspirations_title'),
            description: t('onboarding_tour.inspirations_desc'),
        },
        {
            target: '[data-tour="nav-learn"]',
            title: t('onboarding_tour.learn_title'),
            description: t('onboarding_tour.learn_desc'),
        },
        {
            target: '[data-tour="nav-practice"]',
            title: t('onboarding_tour.practice_title'),
            description: t('onboarding_tour.practice_desc'),
        },
        {
            target: '[data-tour="nav-connect"]',
            title: t('onboarding_tour.connect_title'),
            description: t('onboarding_tour.connect_desc'),
        },
    ];

    return (
        <OnboardingTour
            steps={steps}
            onFinish={handleFinish}
            skipLabel={t('onboarding_tour.skip')}
            backLabel={t('onboarding_tour.back')}
            nextLabel={t('onboarding_tour.next')}
            doneLabel={t('onboarding_tour.done')}
            closeLabel={t('common.close')}
            closeDemoLabel={t('onboarding_tour.close_demo')}
            autoPlayVideo={isReplay}
        />
    );
}
