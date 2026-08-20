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
      // Pre-dismiss the first-run exercise demo; it has its own test below.
      window.localStorage.setItem('mep-structure-demo-seen', 'true');
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
    // The unbuilt card counts down in days, and offers no intro clip
    await expect(page.getByText(/^Coming in \d+ days?$/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Why / })).toHaveCount(0);
  });

  test('the menu lists the roadmap, marking what is not built yet', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: /Master song structure/ }).first().click();

    const menu = page.locator('[data-practice-menu]');
    await expect(menu.locator('button')).toHaveCount(15);

    // Names only — no level column — and a chip on everything unbuilt
    await expect(menu.getByText('beginner')).toHaveCount(0);
    await expect(menu.getByText(/^Coming /)).toHaveCount(13);
  });

  test('starting a practice lands straight in the exercise, with the library on the pill', async ({ page }) => {
    await page.goto('/platform/practice');

    await page.getByRole('button', { name: 'Start' }).click();

    // No pick-a-song pre-step: the first playable song is already on
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-song-pill]')).toContainText('Do You Love');

    // The pill's dropdown is the library now: every song listed, with credits,
    // and Another Ride locked behind "Coming soon" until it has a structure map.
    await page.locator('[data-song-pill] > button').click();
    const menu = page.locator('[data-song-menu]');
    await expect(menu.locator('[data-song-option]')).toHaveCount(4);
    await expect(menu.getByText('Lounge Club', { exact: true })).toHaveCount(2);
    await expect(menu.getByText('Lounge Club feat. Lucas Kay')).toBeVisible();
    await expect(menu.locator('[data-song-option="closer"]')).toBeEnabled();
    await expect(menu.locator('[data-song-option="another-ride"]')).toBeDisabled();
    await expect(menu.getByText('Coming soon')).toHaveCount(1);

    // Switching happens in place — no step in between
    await menu.locator('[data-song-option="closer"]').click();
    await expect(page.locator('[data-song-pill]')).toContainText('Closer');
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });

    await page.locator('main').getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);
  });

  test('draws the authored timeline for a chosen song', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // Sections come straight from the hand-authored structure map. Narrow spans
    // drop their inline label, so read the always-present title attribute.
    const labels = await timeline.locator('button[title]').evaluateAll(
      els => els.map(e => (e.getAttribute('title') || '').split(' · ')[0])
    );
    // Repeated kinds are numbered in playing order; a kind that happens once is not
    expect(labels.filter(Boolean)).toEqual([
      'Intro', 'Verse 1', 'Chorus 1', 'Verse 2', 'Chorus 2', 'Bridge', 'Chorus 3',
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

  // Another Ride is the only song without a hand-authored map, and it is locked
  // because the analyser misreads it badly. With the upload tile hidden too, the
  // analyser has no way in from the UI. Unlock it in practiceSongs.ts to restore.
  test.skip('a song without a hand-made map gets analysed into a timeline', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.locator('[data-song-pill] > button').click();
    await page.locator('[data-song-option="another-ride"]').click();

    // The analyser announces itself, then delivers a real section map.
    await expect(page.getByText('Listening through the song…')).toBeVisible({ timeout: 20000 });
    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 90000 });

    // Drop any occurrence number ("Chorus 2" → "Chorus") to compare kinds
    const kinds = await timeline.locator('button[title]').evaluateAll(
      els => els.map(e => (e.getAttribute('title') || '').split(' · ')[0].replace(/ \d+$/, ''))
    );
    expect(kinds.length).toBeGreaterThanOrEqual(3);
    expect(kinds).toContain('Chorus');
  });

  test('naming a part: right answer turns green, wrong one shakes', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

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

    // A wrong answer keeps the type armed, so the right part still lands, and
    // both the part and its band on the timeline fill green.
    await verseBlock.click();
    await expect(verseBlock).toHaveCSS('background-color', 'rgb(134, 190, 127)');
    await expect(timeline.locator('button[title^="Verse"]').first())
        .toHaveCSS('background-color', 'rgb(134, 190, 127)');
    await expect(page.getByText('?', { exact: true })).toHaveCount(6);

    // Matching works the other way too: arm a lyrics block, answer on the timeline
    await notVerseBlock.click();
    await expect(notVerseBlock).toHaveCSS('background-color', 'rgb(220, 221, 212)');
    await timeline.locator('button[title^="Chorus"]').first().click();
    await expect(notVerseBlock).toHaveCSS('background-color', 'rgb(134, 190, 127)');
    await expect(page.getByText('?', { exact: true })).toHaveCount(5);
  });

  test('the playhead still tracks when the file reports no length', async ({ page }) => {
    // A still-streaming file reports Infinity for its duration. That used to
    // become the denominator of the playhead, pinning the marker at the start
    // while the clock counted on.
    await page.addInitScript(() => {
      Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
        get() { return Infinity; },
        configurable: true,
      });
    });

    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // The structure's own end stands in for the unknown length
    await expect(timeline.getByText('2:48')).toBeVisible();

    const playhead = timeline.locator('div.h-11 > div[aria-hidden="true"]');
    await timeline.getByRole('button', { name: 'Play' }).click();
    await page.waitForTimeout(6000);

    const left = await playhead.evaluate(el => parseFloat((el as HTMLElement).style.left));
    expect(left).toBeGreaterThan(1);
  });

  test('the playhead really moves on screen, not just in its style attribute', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });
    await timeline.getByRole('button', { name: 'Play' }).click();
    await page.waitForTimeout(1500);

    // Measure where the playhead is actually painted, not what left% it claims.
    // A CSS transition on `left` once held the painted position still while the
    // declared value advanced 60 times a second.
    const painted = () => page.evaluate(() => {
      const t = document.querySelector('[data-song-timeline]')!;
      const line = t.querySelector('div.h-11 > div[aria-hidden="true"]') as HTMLElement;
      const bar = t.querySelector('div.h-11') as HTMLElement;
      return line.getBoundingClientRect().left - bar.getBoundingClientRect().left;
    });

    const before = await painted();
    await page.waitForTimeout(2000);
    const after = await painted();

    // ~6px per second on a 992px bar; allow plenty of slack for a loaded machine
    expect(after - before).toBeGreaterThan(4);
  });

  test('arming a band lights that one band, not every band of its kind', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });
    const bands = timeline.locator('div.h-11 > button');

    // The ring is a box-shadow; count the bands wearing one
    const armedNames = () => bands.evaluateAll(els => els
      .filter(e => getComputedStyle(e).boxShadow !== 'none')
      .map(e => (e.getAttribute('title') || '').split(' · ')[0]));

    await timeline.locator('button[title^="Verse 2"]').click();
    await expect.poll(armedNames).toEqual(['Verse 2']);

    // Arming another replaces it rather than adding to it
    await timeline.locator('button[title^="Chorus 3"]').click();
    await expect.poll(armedNames).toEqual(['Chorus 3']);

    // Clicking the armed band again disarms
    await timeline.locator('button[title^="Chorus 3"]').click();
    await expect.poll(armedNames).toEqual([]);
  });

  test('the playing part is highlighted, and follows the marker mid-scrub', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    const playing = page.locator('[data-section-block].is-playing');
    // Exactly one part is ever marked, and at 0:00 it is the intro
    await expect(playing).toHaveCount(1);
    await expect(playing).toContainText('No lyrics in this part');

    // Seeking past the intro (0–7s) hands the highlight to the first verse.
    // Driven by a seek rather than by waiting out real playback: Chromium pauses
    // itself after a few seconds when its audio output is unavailable, which
    // would make a wall-clock wait here depend on the machine's sound device.
    const track = timeline.locator('div.touch-none');
    await timeline.getByRole('button', { name: 'Play' }).click();
    // 15% of a 2:48 song is ~0:25, inside verse 1 (7–41s). Clicked through the
    // locator, not page.mouse at pre-measured coordinates — the layout can still
    // settle (font swap) after measuring, and stale coordinates land on the bar.
    const width = (await track.boundingBox())!.width;
    await track.click({ position: { x: width * 0.15, y: 4 } });
    await expect(playing).toContainText('I want to spend a day with you');
    await expect(playing).toHaveCount(1);

    // Dragging the marker moves the highlight during the drag, not on release.
    // Raw mouse events are unavoidable here, so measure right before using it.
    const box = (await track.boundingBox())!;
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    // 75% of a 2:48 song lands at ~2:06, inside the bridge (123–142s)
    await page.mouse.move(box.x + box.width * 0.75, box.y + 4, { steps: 5 });
    await expect(playing).toContainText('Do you love Do you love Do you love');
    await expect(playing).toHaveCount(1);
    await page.mouse.up();
  });

  test('a first-timer gets the one-step demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-structure-demo-seen'));
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    // The how-to sits over the exercise: title, description, scene, one button
    const demo = page.locator('[data-structure-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Pick a part on the timeline', { exact: false })).toBeVisible();
    await expect(demo.locator('.demo-scene')).toBeVisible();

    // "Got it" dismisses it and it stays dismissed
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-structure-demo]')).toHaveCount(0);
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
