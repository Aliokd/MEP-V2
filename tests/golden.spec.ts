import { test, expect } from '@playwright/test';

/**
 * The Golden pages are public: no account, no sign-in, no mock user needed.
 *
 * What is worth holding here is that the four intro animations actually arrive.
 * They are mounted lazily, so "the heading is on the page" proves nothing about
 * whether the demo under it ever appears, and an empty box under a headline is
 * exactly the failure a reader would report.
 */
test.describe('Golden ticket page', () => {
  test('shows the four intro demos, each with art under its heading', async ({ page }) => {
    await page.goto('/golden/ticket/29');

    const headings = [
      'Live collab with songwriters',
      'Tools designed to unlock your creativity',
      'Own your songs, share your success',
    ];

    for (const name of headings) {
      const heading = page.getByRole('heading', { name, exact: false });
      await expect(heading).toBeVisible();

      // The art mounts when the card nears the viewport, so scroll to it and
      // then require something to be drawn inside its box. Every one of these
      // demos draws SVG, so "no svg" means an empty card.
      //
      // The card, not the innermost div that happens to hold the heading: the
      // heading sits in its own padded wrapper, which of course contains no art.
      const card = page.locator('[data-showcase-card]').filter({ has: heading });
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('svg').first()).toBeVisible({ timeout: 20_000 });
    }

    // The fourth card is the golden mind rather than a slide, and it is a film
    // rather than a still: it fills, turns gold, then names each of the six
    // regions in turn and comes round again. What matters is that it is running
    // — a stopped loop is a card that says one word forever.
    const loop = page.locator('[data-golden-loop]');
    await loop.scrollIntoViewIfNeeded();
    await expect(loop).toBeVisible();

    const seen = new Set<string>();
    for (let i = 0; i < 14; i++) {
      seen.add((await loop.getAttribute('data-golden-loop')) ?? '');
      if (seen.size >= 3) break;
      await page.waitForTimeout(1200);
    }
    // Gold plus at least two named regions is enough to prove it advances
    // rather than parking on whichever step it mounted at.
    expect(seen.size).toBeGreaterThanOrEqual(3);

    // Each region is named in its own colour, which is the whole reason the
    // tour is worth showing. Sampled until a region is up, then read: the
    // caption must not still be the gold step's colour.
    let captionColour = '';
    let phaseWhenRead = '';
    for (let i = 0; i < 16; i++) {
      phaseWhenRead = (await loop.getAttribute('data-golden-loop')) ?? '';
      if (phaseWhenRead !== 'gold') {
        await page.waitForTimeout(700); // let the colour transition settle
        captionColour = await loop.locator('p').first().evaluate((el) => getComputedStyle(el).color);
        break;
      }
      await page.waitForTimeout(600);
    }
    expect(phaseWhenRead).not.toBe('gold');
    expect(captionColour).not.toBe('rgb(233, 185, 79)');

    // They sit above the benefits list: the list of what a ticket holds means
    // more once the thing it buys has been shown.
    const showcaseTop = (await page.getByRole('heading', { name: 'Live collab', exact: false }).boundingBox())!.y;
    const benefitsTop = (await page.getByText('What you get, exclusively').boundingBox())!.y;
    expect(showcaseTop).toBeLessThan(benefitsTop);
  });
});
