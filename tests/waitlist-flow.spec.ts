import { test, expect } from '@playwright/test';

/**
 * The ad campaign's landing flow: /onboarding?flow=waitlist walks the quiz,
 * takes an email into the waitlist, reveals the verdict and ends on the
 * secured screen with the launch countdown. See the ?flow=waitlist note in
 * app/onboarding/page.tsx.
 *
 * /api/waitlist is mocked throughout - the real route writes to Firestore and
 * emails support, and a test suite should do neither.
 */
test.describe('Waitlist campaign flow', () => {
  test('walks from the ad click to a secured spot', async ({ page }) => {
    let waitlistPayload: any = null;
    await page.route('**/api/waitlist', async (route) => {
      waitlistPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, position: 42 }),
      });
    });

    await page.goto('/onboarding?flow=waitlist&from=yt-vsl');

    // Opens on the intro carousel - the five slides showing the platform -
    // with the offer clock already in the corner.
    await expect(page.getByText('Special offer closes in')).toBeVisible();
    await page.getByRole('button', { name: 'Get started' }).click();
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }

    // The carousel done, the quiz begins - and the URL names the step, which
    // is what lets analytics tell the screens of this one-page flow apart.
    await expect(page.getByRole('heading', { name: 'How do you see yourself?' })).toBeVisible();
    await expect(page).toHaveURL(/at=quiz-songwriter_type/);

    // Question 1: the picture cards, then the question asked on the chosen
    // card's face. The cards stay disabled until their deal-in animation
    // settles; Playwright's actionability wait covers that.
    await page.getByRole('button', { name: /Lyricist/ }).click();
    await page.getByRole('button', { name: 'A lyric or phrase' }).click();

    // Question 2: the struggle deck - one decision is an answer.
    await page.getByRole('button', { name: "That's me" }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Question 3: the goal box.
    await page.getByRole('button', { name: "Finish songs I'm proud of." }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Question 4: the mood pills.
    await page.getByRole('button', { name: 'Emotional & melancholic' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // The analysis reads the answers back; in the campaign flow its button
    // says what the dialog it opens does.
    await page.getByRole('button', { name: 'Join the waitlist' }).click({ timeout: 20_000 });

    // The email step is a page of its own now, not a dialog - it wears the
    // campaign framing: a spot being saved, not an account being created.
    await expect(page.getByRole('heading', { name: 'Save your spot' })).toBeVisible();
    await expect(page).toHaveURL(/at=email/);
    // The card carries the offer and the founders spot counter; the offer
    // clock is the page's own top bar, same as every other step.
    await expect(page.getByText('3 days free trial', { exact: false })).toBeVisible();
    await expect(page.getByText('/100')).toBeVisible();
    await expect(page.getByText('Special offer closes in')).toBeVisible();
    // No consent tick anywhere any more — agreement happens by continuing,
    // and the line under the button says so.
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(page.getByText('By continuing, you agree', { exact: false })).toBeVisible();

    // Backing out lands on the FINISHED analysis - the pass must not replay -
    // and pressing on returns here.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Join the waitlist' }).click({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Save your spot' })).toBeVisible();

    await page.getByRole('textbox').fill('writer@example.com');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Joining lands straight on the confirmation, launch day named — no
    // verdict, offer or paywall in this flow.
    await expect(page.getByRole('heading', { name: 'Spot secured' })).toBeVisible();
    await expect(page).toHaveURL(/at=secured/);
    await expect(page.getByText('September 19', { exact: false })).toBeVisible();
    await expect(page.getByText('email you your plan', { exact: false })).toBeVisible();

    // ...and the signup carried the attribution and the quiz answers with it.
    expect(waitlistPayload).toMatchObject({
      email: 'writer@example.com',
      source: 'yt-vsl',
      answers: {
        songwriter_type: 'lyricist',
        creation_method: 'lyric_phrase',
        dream_outcome: ['finish_songs'],
        emotional_inspiration: 'melancholic',
      },
    });
  });

  test('the marketing CTAs open the campaign flow', async ({ page }) => {
    await page.goto('/');

    // Every "Join the waitlist" on the page points at the campaign flow, each
    // carrying the surface it was pressed from. The homepage is client
    // rendered, so wait for the first one rather than reading an empty DOM.
    await page.locator('a[href*="flow=waitlist"]').first().waitFor();
    const hrefs = await page.locator('a[href*="flow=waitlist"]').evaluateAll(
      (links) => links.map((l) => l.getAttribute('href')),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/onboarding\?flow=waitlist&from=[a-z-]+$/);
    }
    // The bare waiting-list form is no longer linked from the homepage.
    await expect(page.locator('a[href^="/waiting-list"]')).toHaveCount(0);

    // And following one actually lands in the flow, clock and all.
    await page.locator('a[href*="flow=waitlist"]').first().click();
    await expect(page).toHaveURL(/\/onboarding\?flow=waitlist/);
    await expect(page.getByText('Special offer closes in')).toBeVisible();
  });

  test('the plain flow is untouched by the campaign branch', async ({ page }) => {
    await page.goto('/onboarding');

    // No countdown, and the intro carousel still opens the flow.
    await expect(page.getByText('Special offer closes in')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
  });
});
