"use client";

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import OnboardingTour, { TourStep } from './OnboardingTour';

const PLATFORM_TOUR_KEY = 'mep-tour-platform-seen';
const CREATE_TOUR_KEY = 'mep-tour-create-seen';

interface PlatformOnboardingProps {
    // Suppress the tour while something else (e.g. the welcome video modal) owns the screen.
    suppressed: boolean;
}

export default function PlatformOnboarding({ suppressed }: PlatformOnboardingProps) {
    const pathname = usePathname();
    const { t } = useLanguage();

    if (suppressed) return null;

    const controls = {
        skipLabel: t('onboarding_tour.skip'),
        backLabel: t('onboarding_tour.back'),
        nextLabel: t('onboarding_tour.next'),
        doneLabel: t('onboarding_tour.done'),
    };

    if (pathname?.startsWith('/platform/create')) {
        const createSteps: TourStep[] = [
            { target: '[data-tour="create-canvas"]', title: t('onboarding_tour.create.canvas_title'), description: t('onboarding_tour.create.canvas_desc') },
            { target: '[data-tour="create-record"]', title: t('onboarding_tour.create.record_title'), description: t('onboarding_tour.create.record_desc') },
            { target: '[data-tour="create-tools"]', title: t('onboarding_tour.create.tools_title'), description: t('onboarding_tour.create.tools_desc') },
            { target: '[data-tour="create-studio"]', title: t('onboarding_tour.create.studio_title'), description: t('onboarding_tour.create.studio_desc') },
            { target: '[data-tour="create-inspirations"]', title: t('onboarding_tour.create.inspirations_title'), description: t('onboarding_tour.create.inspirations_desc') },
        ];
        return <OnboardingTour steps={createSteps} storageKey={CREATE_TOUR_KEY} {...controls} />;
    }

    if (pathname === '/platform') {
        const platformSteps: TourStep[] = [
            { target: '[data-tour="mind-power"]', title: t('onboarding_tour.platform.mind_power_title'), description: t('onboarding_tour.platform.mind_power_desc') },
            { target: '[data-tour="learn-fundamentals"]', title: t('onboarding_tour.platform.fundamentals_title'), description: t('onboarding_tour.platform.fundamentals_desc') },
            { target: '[data-tour="learn-ideas"]', title: t('onboarding_tour.platform.ideas_title'), description: t('onboarding_tour.platform.ideas_desc') },
            { target: '[data-tour="nav-create"]', title: t('onboarding_tour.platform.create_nav_title'), description: t('onboarding_tour.platform.create_nav_desc') },
        ];
        return <OnboardingTour steps={platformSteps} storageKey={PLATFORM_TOUR_KEY} {...controls} />;
    }

    return null;
}
