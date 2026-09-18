import { test, expect } from '@playwright/test';

/**
 * The onboarding flow with signups open: /onboarding walks the intro, the
 * quiz, the analysis, the email step, the verdict, the offer, the plans and
 * the code, and ends on the welcome screen. See the flow note at the top of
 * app/onboarding/page.tsx.
 *
 * The two server routes are mocked throughout. /api/onboarding/start creates
 * a real Firebase account and sends a real email, and /api/onboarding/verify
 * flips a real account; a test suite should do neither. Paddle is not
 * configured in the test environment, so the paywall takes its
 * "payments unavailable" path, which is also the path production takes if
 * the Paddle secrets are ever missing.
 *
 * The browser cannot sign in with a mocked custom token, so the walk through
 * the plans and the code is done as the mock user (AuthContext honours
 * `playwright_mock_user`), which is exactly a visitor who already has an
 * account: the email step is skipped for them and the welcome follows the
 * plans. The email step itself is exercised on its own, signed out.
 */

const CONSENT = {
    v: 3, analytics: false, replay: false, at: new Date().toISOString(),
};

async function walkQuiz(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: 'Get started' }).click();
    for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await expect(page.getByRole('heading', { name: 'How do you see yourself?' })).toBeVisible();
    await expect(page).toHaveURL(/at=quiz-songwriter_type/);

    await page.getByRole('button', { name: /Lyricist/ }).click();
    await page.getByRole('button', { name: 'A lyric or phrase' }).click();
    await page.getByRole('button', { name: "That's me" }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: "Finish songs I'm proud of." }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Emotional & melancholic' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
}

test.describe('Onboarding flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript((consent) => {
            // Answer the cookie dialog before it can sit over the page: its
            // modal backdrop swallows every click in this flow.
            window.localStorage.setItem('veinote-cookie-consent', JSON.stringify(consent));
        }, CONSENT);
    });

    test('the email step creates the account and carries the quiz answers', async ({ page }) => {
        let startPayload: Record<string, unknown> | null = null;
        await page.route('**/api/onboarding/start', async (route) => {
            startPayload = route.request().postDataJSON();
            // A refusal rather than a token: the browser cannot sign in with a
            // token this test could mint, and the refusal is the one reply the
            // screen has to render in words rather than as a shake.
            await route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'account-exists' }),
            });
        });

        await page.goto('/onboarding?from=hero');
        // No campaign clock in the real flow.
        await expect(page.getByText('Special offer closes in')).toHaveCount(0);
        await walkQuiz(page);

        // The analysis reads the answers back and opens the account step.
        await page.getByRole('button', { name: 'Reveal my plan' }).click({ timeout: 20_000 });
        await expect(page.getByRole('heading', { name: 'First, create your account' })).toBeVisible();
        await expect(page).toHaveURL(/at=email/);
        await expect(page.getByText('By continuing, you agree', { exact: false })).toBeVisible();

        await page.getByRole('textbox').fill('writer@example.com');
        await page.getByRole('button', { name: 'Reveal my plan' }).click();

        // The payload carried the address, the attribution and the answers.
        await expect.poll(() => startPayload).not.toBeNull();
        expect(startPayload).toMatchObject({
            email: 'writer@example.com',
            source: 'hero',
            answers: {
                songwriter_type: 'lyricist',
                creation_method: 'lyric_phrase',
                dream_outcome: ['finish_songs'],
                emotional_inspiration: 'melancholic',
            },
        });

        // An address that already has an account is told so, with the way in.
        // Filtered: Next's route announcer is a second, empty role=alert.
        await expect(page.getByRole('alert').filter({ hasText: 'Veinote account' })).toContainText('already has a Veinote account');
        const signIn = page.getByRole('link', { name: 'Sign in instead' });
        await expect(signIn).toHaveAttribute('href', /\/signin\?email=writer%40example\.com/);
    });

    test('a signed-in visitor skips the email step and reaches the welcome through the plans', async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('playwright_mock_user', JSON.stringify({
                uid: 'onboarding-test-user',
                email: 'writer@example.com',
                displayName: 'Writer',
                emailVerified: true,
            }));
        });

        await page.goto('/onboarding');
        await walkQuiz(page);

        // Signed in already: the address is on file, so the verdict follows
        // the analysis directly.
        await page.getByRole('button', { name: 'Reveal my plan' }).click({ timeout: 20_000 });
        await expect(page).toHaveURL(/at=verdict/);
        await page.getByRole('button', { name: 'See more' }).click();

        // The offer, then the plans.
        await expect(page).toHaveURL(/at=offer/);
        await page.getByRole('button', { name: /Start my 3 days free/ }).click();
        await expect(page).toHaveURL(/at=paywall/);
        // The standard plan carries no name, only its price; "Pro" is the
        // upper tier, reached through the link under the plan.
        await expect(page.getByText('$19')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Check the Pro plan' })).toBeVisible();

        // Paddle is not configured here, so opening the payment section says
        // so and offers the way on. No card form is ever drawn.
        await page.getByRole('button', { name: 'Try for $0.00' }).click();
        await expect(page.getByRole('status')).toContainText('Payments are not available');
        await expect(page.locator('input[autocomplete="cc-number"], #cp-number')).toHaveCount(0);
        await page.getByRole('button', { name: 'Continue without a plan' }).click();

        // This account was not made by the flow, so no code is owed: welcome.
        await expect(page.getByRole('heading', { name: 'Welcome onboard' })).toBeVisible();
        await expect(page).toHaveURL(/at=welcome/);
        await expect(page.getByRole('link', { name: 'Open Veinote' })).toHaveAttribute('href', '/platform/create');
    });

    test('the marketing CTAs open the onboarding flow', async ({ page }) => {
        await page.goto('/');

        // Every primary CTA points at the flow, each carrying the surface it
        // was pressed from. The homepage is client rendered, so wait for the
        // first one rather than reading an empty DOM.
        await page.locator('a[href^="/onboarding?from="]').first().waitFor();
        const hrefs = await page.locator('a[href^="/onboarding"]').evaluateAll(
            (links) => links.map((l) => l.getAttribute('href')),
        );
        expect(hrefs.length).toBeGreaterThan(0);
        for (const href of hrefs) {
            expect(href).toMatch(/^\/onboarding\?from=[a-z-]+$/);
        }
        // Nothing on the homepage sends anyone to the waiting list any more.
        await expect(page.locator('a[href*="waiting-list"], a[href*="flow=waitlist"]')).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Join the waitlist' })).toHaveCount(0);

        await page.locator('a[href^="/onboarding?from="]').first().click();
        await expect(page).toHaveURL(/\/onboarding\?from=/);
        await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
    });

    test('an old campaign link lands in the real flow', async ({ page }) => {
        await page.goto('/onboarding?flow=waitlist&from=yt-vsl');
        await expect(page.getByText('Special offer closes in')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
        await walkQuiz(page);
        // The analysis offers the account step, not the waiting list.
        await expect(page.getByRole('button', { name: 'Reveal my plan' })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole('button', { name: 'Join the waitlist' })).toHaveCount(0);
    });
});
