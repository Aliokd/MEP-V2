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

  test('starting a practice lands on the song chooser, and back returns to the card', async ({ page }) => {
    await page.goto('/platform/practice');

    await page.getByRole('button', { name: 'Start' }).click();

    // Our songs plus the bring-your-own tile, with Next locked until a pick is made
    await expect(page.getByText('Pick a song to practise with', { exact: false })).toBeVisible();
    await expect(page.locator('[data-song-choice]')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();

    await page.locator('[data-song-choice="do-you-love"]').click();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

    await page.locator('main').getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);
  });

  test('draws the authored timeline for a chosen song', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.locator('[data-song-choice="do-you-love"]').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // Sections come straight from the hand-authored structure map. Narrow spans
    // drop their inline label, so read the always-present title attribute.
    const labels = await timeline.locator('button[title]').evaluateAll(
      els => els.map(e => (e.getAttribute('title') || '').split(' · ')[0])
    );
    expect(labels.filter(Boolean)).toEqual([
      'Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus',
    ]);

    // The timeline is the player: it carries the play control and a scrub track
    const playBtn = timeline.getByRole('button', { name: 'Play' }).or(timeline.getByRole('button', { name: 'Pause' }));
    await expect(playBtn).toBeVisible();

    // Clicking into the scrub track seeks, and the elapsed-time label follows
    const track = timeline.locator('div.touch-none');
    const box = (await track.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    await expect(timeline.getByText(/^1:[12]\d$/)).toBeVisible();
  });

  test('an uploaded song plays, with decomposition marked as pending', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    // A tiny valid WAV: 44-byte header + a second of silence at 8kHz
    const rate = 8000;
    const dataSize = rate * 2;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0); header.writeUInt32LE(36 + dataSize, 4); header.write('WAVE', 8);
    header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
    header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
    header.write('data', 36); header.writeUInt32LE(dataSize, 40);
    const wav = Buffer.concat([header, Buffer.alloc(dataSize)]);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'my-demo.wav', mimeType: 'audio/wav', buffer: wav,
    });
    await expect(page.getByText('my-demo')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // The analyser gives a 1-second silent file an honest no.
    await expect(page.getByText("We couldn't map this song yet.")).toBeVisible({ timeout: 30000 });
  });

  test('a song without a hand-made map gets analysed into a timeline', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.locator('[data-song-choice="another-ride"]').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // The analyser announces itself, then delivers a real section map.
    await expect(page.getByText('Listening through the song…')).toBeVisible({ timeout: 20000 });
    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 90000 });

    const labels = await timeline.locator('button[title]').evaluateAll(
      els => els.map(e => (e.getAttribute('title') || '').split(' · ')[0])
    );
    expect(labels.length).toBeGreaterThanOrEqual(3);
    expect(labels).toContain('Chorus');
  });

  test('naming a part: right answer turns green, wrong one shakes', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.locator('[data-song-choice="do-you-love"]').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // Parts are shuffled, so find them by a line only that part contains
    const blocks = page.locator('[data-section-block]');
    await expect(blocks).toHaveCount(7);
    const texts = await blocks.allInnerTexts();
    const verseBlock = blocks.nth(texts.findIndex(x => x.includes('spend a day')));
    const notVerseBlock = blocks.nth(texts.findIndex(x => x.includes('from above')));

    // Nothing named yet — every part wears the placeholder chip
    await expect(page.getByText('?', { exact: true })).toHaveCount(7);

    // Arm "Verse" from the timeline, then answer with a chorus
    await timeline.locator('button[title^="Verse"]').first().click();
    await notVerseBlock.click();
    await expect(notVerseBlock).toHaveClass(/animate-shake/);
    await expect(page.getByText('?', { exact: true })).toHaveCount(7);

    // A wrong answer keeps the type armed, so the right part still lands
    await verseBlock.click();
    await expect(verseBlock).toHaveClass(/border-\[#86BE7F\]/);
    await expect(page.getByText('?', { exact: true })).toHaveCount(6);
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
