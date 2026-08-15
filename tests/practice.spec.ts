import { test, expect } from '@playwright/test';

test.describe('Practice Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signin page to establish local origin context
    await page.goto('/signin');
    // Inject mock user and bypass video/onboarding overlays
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
    });
  });

  test('should load the practice dashboard and switch modules', async ({ page }) => {
    await page.goto('/platform/practice');

    // Check that default practice page renders with selected practice header
    await expect(page.locator('text=Master song structure').first()).toBeVisible();

    // Verify presence of prev and next buttons
    const prevBtn = page.locator('button[aria-label="Previous Practice"]');
    const nextBtn = page.locator('button[aria-label="Next Practice"]');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });

  test('shows one practice at a time, and the arrows cycle through them', async ({ page }) => {
    await page.goto('/platform/practice');

    // A single card, carrying level, title and the written goal
    await expect(page.getByRole('button', { name: 'Why Master song structure?' })).toHaveCount(1);
    await expect(page.getByText('Rebuild real songs section by section', { exact: false })).toBeVisible();
    await expect(page.getByText('Beginner', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Next lands on the following practice
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Turn one theme into five singable lines', { exact: false })).toBeVisible();

    // And on one that isn't built yet, the card can't be started
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Find melodies that sit naturally', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0);
    await expect(page.getByText('Coming soon')).toBeVisible();
  });

  test('the menu lists the roadmap, marking what is not built yet', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: /Master song structure/ }).first().click();

    const menu = page.locator('[data-practice-menu]');
    await expect(menu.locator('button')).toHaveCount(15);

    // Names only — no level column — and a chip on everything unbuilt
    await expect(menu.getByText('beginner')).toHaveCount(0);
    await expect(menu.getByText('Coming soon')).toHaveCount(13);
  });

  test('starting a practice opens it, and the back link returns to its card', async ({ page }) => {
    await page.goto('/platform/practice');

    await page.getByRole('button', { name: 'Start' }).click();

    // The song picker of "Master song structure" replaces the card
    await expect(page.getByText('Castle on the Hill')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0);

    await page.locator('main').getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);
  });

  test('breaks the song down into a labelled timeline', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByRole('button', { name: /^Song 2/ }).click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible();

    // Sections come out of the lyric timings, in order, with the gaps marked
    const labels = await timeline.locator('button[title]').allInnerTexts();
    expect(labels.filter(Boolean)).toEqual([
      'Intro', 'Verse', 'Pre-chorus', 'Instrumental', 'Bridge', 'Instrumental', 'Chorus',
    ]);

    // The timeline is the player: it carries the play control and a scrub track
    const playBtn = timeline.getByRole('button', { name: 'Play' }).or(timeline.getByRole('button', { name: 'Pause' }));
    await expect(playBtn).toBeVisible();

    // Clicking into the scrub track seeks, and the elapsed-time label follows
    const track = timeline.locator('div.touch-none');
    const box = (await track.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    await expect(timeline.getByText(/^0:3\d$/)).toBeVisible();
  });

  test('naming a section: right answer turns green, wrong one shakes', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByRole('button', { name: /^Song 2/ }).click();

    const timeline = page.locator('[data-song-timeline]');

    // Blocks are shuffled, so find them by a word only that section contains
    const blocks = page.locator('[data-section-block]');
    await expect(blocks).toHaveCount(4);
    const texts = await blocks.allInnerTexts();
    const verseBlock = blocks.nth(texts.findIndex(x => x.includes('club')));
    const notVerseBlock = blocks.nth(texts.findIndex(x => !x.includes('club')));

    // Nothing named yet — every block wears the placeholder chip
    await expect(page.getByText('?', { exact: true })).toHaveCount(4);

    // Arm "Verse" from the timeline, then answer with the wrong block
    await timeline.locator('button[title^="Verse"]').click();
    await notVerseBlock.click();
    await expect(notVerseBlock).toHaveClass(/animate-shake/);
    await expect(page.getByText('?', { exact: true })).toHaveCount(4);

    // A wrong answer keeps the type armed, so the right block still lands
    await verseBlock.click();
    await expect(verseBlock).toHaveClass(/border-\[#86BE7F\]/);
    await expect(page.getByText('?', { exact: true })).toHaveCount(3);
  });

  test('the card play button opens the intro video', async ({ page }) => {
    await page.goto('/platform/practice');

    await page.getByRole('button', { name: 'Why Master song structure?' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Master song structure' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('video')).toHaveAttribute('src', /song-structure/);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
