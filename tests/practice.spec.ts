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
      // Pre-dismiss the first-run exercise demos; each has its own test below.
      window.localStorage.setItem('mep-structure-demo-off', 'true');
      window.localStorage.setItem('mep-verse-demo-seen', 'true');
      window.localStorage.setItem('mep-melody-demo-seen', 'true');
      window.localStorage.setItem('mep-chord-demo-seen', 'true');
      window.localStorage.setItem('mep-rhythm-demo-seen', 'true');
      window.localStorage.setItem('mep-lyrics-demo-seen', 'true');
      window.localStorage.setItem('mep-develop-demo-seen', 'true');
      window.localStorage.setItem('mep-develop-chords-demo-seen', 'true');
      window.localStorage.setItem('mep-develop-rhythm-demo-seen', 'true');
      window.localStorage.setItem('mep-finish-demo-seen', 'true');
      window.localStorage.setItem('mep-chords-melody-demo-seen', 'true');
      window.localStorage.setItem('mep-beat-demo-seen', 'true');
      // Answer the cookie dialog before it can sit over the page: its modal
      // backdrop is z-[100] and swallows every click in the suite.
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
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

    // A single card, carrying level, title and the written goal. No practice
    // has its own walkthrough yet, so its play button is labelled by what it
    // will say rather than by the clip it would open.
    await expect(page.getByRole('button', { name: 'How it works' })).toHaveCount(1);
    await expect(page.getByText('Play a real song and name each part', { exact: false })).toBeVisible();
    await expect(page.getByText('Beginner', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Next lands on the following practice
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Pick a theme, write five nouns and five verbs', { exact: false })).toBeVisible();

    // Three is built too, and starts
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Write a short melody one note at a time', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Four is built as well, and carries the same waiting play button even
    // though it borrows no stand-in clip at all
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Build progressions that leave room for a melody', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'How it works' })).toHaveCount(1);

    // Five is built too, with the same waiting play button
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Build one bar of rhythm', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'How it works' })).toHaveCount(1);

    // Six is built too
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Choose a theme, scribble a pile of notes', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'How it works' })).toHaveCount(1);

    // Seven is built too
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Take a short melody and make it yours', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Eight is built too
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Take a plain progression and make it richer', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Nine is built too
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Take a feel everyone knows and make it yours', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Ten is built too
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Take a beginning, two lines with a rhythm already in them', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Eleven is built too
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Four bars of chords are given. Write a melody over them', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Twelve is built too
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('A whole kit on the grid', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // And on one that isn't built yet, the card can't be started. This one is
    // undated — first in the queue, and the anchor has caught up with it — so
    // it promises nothing but "soon", and offers no intro clip
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Work with the shapes that break the usual pattern', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0);
    await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'How it works' })).toHaveCount(0);

    // The one behind it is undated too: its day came and went unbuilt. The
    // card before it wore the same pill and is still sliding off, so wait
    // for the pair to become one.
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('No steps and no marking', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0);
    await expect(page.getByText('Coming soon', { exact: true })).toHaveCount(1);

    // The next one keeps its promised day, unmoved by the two cards in front
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText(/^Coming in \d+ days?$/)).toBeVisible();
  });

  test('the menu lists the roadmap, marking what is not built yet', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: /Master song structure/ }).first().click();

    const menu = page.locator('[data-practice-menu]');
    await expect(menu.locator('button')).toHaveCount(15);

    // Each name carries its level: the first six built plus Finding hooks are
    // Beginner, the six from Developing a melody on are Intermediate,
    // Advanced structures is Advanced, Free hand session is for all
    await expect(menu.locator('[data-practice-level]')).toHaveCount(15);
    await expect(menu.getByText('Beginner', { exact: true })).toHaveCount(7);
    await expect(menu.getByText('Intermediate', { exact: true })).toHaveCount(6);
    await expect(menu.getByText('Advanced', { exact: true })).toHaveCount(1);
    await expect(menu.getByText('All levels', { exact: true })).toHaveCount(1);
    // And a chip on everything unbuilt
    // One fewer each time a practice ships: twelve of the fifteen shown are
    // built (the roadmap now has twenty-one; the menu stops at fifteen).
    await expect(menu.getByText(/^Coming /)).toHaveCount(3);
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

    // Artwork on every row that has some; a note stands in where there is none
    const art = await menu.locator('[data-song-option]').evaluateAll(els => els.map(e => {
      const img = e.querySelector('img') as HTMLImageElement | null;
      return img ? (img.naturalWidth > 0 ? 'cover' : 'broken') : 'note';
    }));
    expect(art).toEqual(['cover', 'cover', 'cover', 'note']);

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

    // Sections come straight from the hand-authored structure map. The bands are
    // nameless while the task runs, so read the structure off the data attributes.
    const bands = await timeline.locator('[data-band-start]').evaluateAll(
      els => els.map(e => `${e.getAttribute('data-band-kind')}@${e.getAttribute('data-band-start')}`)
    );
    expect(bands).toEqual([
      'intro@0', 'verse@7', 'chorus@41', 'verse@65', 'chorus@102', 'bridge@123', 'chorus@142',
    ]);

    // Nothing on the bar names a section — not the label, not the tooltip
    const titles = await timeline.locator('[data-band-start]').evaluateAll(
      els => els.map(e => e.getAttribute('title'))
    );
    expect(titles).toEqual(['0:00', '0:07', '0:41', '1:05', '1:42', '2:03', '2:22']);

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

  // Every section kind Do You Love contains, for reading kinds out of an ask.
  const ALL_KINDS = ['intro', 'verse', 'chorus', 'bridge'];
  // A named part is green; it deepens while the playhead is inside it, so both
  // shades mean "solved".
  const SOLVED_GREENS = ['rgb(134, 190, 127)', 'rgb(107, 168, 98)'];

  /**
   * A song starts on its own when you land on it, so Play is usually already
   * showing as Pause. Press it only if it is still offered, then confirm the
   * song is actually running before the test leans on playback.
   */
  const ensurePlaying = async (timeline: import('@playwright/test').Locator) => {
    const play = timeline.getByRole('button', { name: 'Play' });
    if (await play.count()) await play.click();
    await expect(timeline.getByRole('button', { name: 'Pause' })).toBeVisible();
  };

  /** Index of the band the ask is pointing at — also its card's index. */
  const targetIndex = async (page: import('@playwright/test').Page) => page
    .locator('[data-song-timeline] [data-band-start]')
    .evaluateAll(els => els.findIndex(e => e.hasAttribute('data-band-target')));

  /**
   * Answer the current ask with the exact card it points at — answers are
   * checked by occurrence, not kind — then wait out the celebration hold.
   */
  const answerAsk = async (page: import('@playwright/test').Page) => {
    const idx = await targetIndex(page);
    expect(idx).toBeGreaterThanOrEqual(0);
    await page.locator('[data-section-block]').nth(idx).click();
    await expect(page.locator('.confetti-piece')).toHaveCount(0, { timeout: 5000 });
  };

  test('answering the task: right answer turns green, wrong one shakes', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    const blocks = page.locator('[data-section-block]');
    await expect(blocks).toHaveCount(7);

    // Solved parts are the green ones; nothing is placed yet
    const solvedCount = () => blocks.evaluateAll(
      (els, greens) => els.filter(e => greens.includes(getComputedStyle(e).backgroundColor)).length,
      SOLVED_GREENS);
    await expect.poll(solvedCount).toBe(0);

    // The task names one section at random, so read it and answer accordingly
    const prompt = page.locator('[data-timeline-prompt]');
    const ask = (await prompt.textContent()) || '';
    const askedKind = ALL_KINDS.find(k => ask.toLowerCase().includes(k))!;
    expect(askedKind).toBeTruthy();

    // Any other card shakes — the answer is the exact section asked for, so a
    // same-kind sibling ("Chorus 1" for "Chorus 2") is a miss like any other.
    const idx = await targetIndex(page);
    const wrongIdx = (idx + 1) % 7;
    await blocks.nth(wrongIdx).click();
    await expect(blocks.nth(wrongIdx)).toHaveClass(/animate-shake/);
    await expect(prompt).toHaveText(ask);
    await expect.poll(solvedCount).toBe(0);

    // The asked-for card fills green, its band fills green and gets its name back.
    const right = blocks.nth(idx);
    await right.click();
    await expect.poll(() => right.evaluate(e => getComputedStyle(e).backgroundColor))
      .toMatch(/rgb\(134, 190, 127\)|rgb\(107, 168, 98\)/);
    await expect.poll(solvedCount).toBe(1);

    // The band that was black goes green with the answer and settles back to
    // its own size, rather than staying black through the celebration.
    // Green, at whatever weight its kind carries — a chorus lands solid, an
    // intro lighter — so match the colour rather than one exact alpha.
    const target = timeline.locator('[data-band-target]');
    await expect.poll(() => target.evaluate(el => getComputedStyle(el).backgroundColor))
      .toMatch(/^rgba?\(134, 190, 127/);
    await expect(target).toHaveCSS('animation-name', 'none');

    // The answer is marked with a burst over the ask, and the ask itself holds
    // while that plays rather than flipping the moment the card turns green.
    await expect(page.locator('.confetti-piece').first()).toBeVisible();
    await expect(prompt).toHaveText(ask);
    // Then it retires and a different section is asked for
    await expect(page.locator('.confetti-piece')).toHaveCount(0, { timeout: 5000 });
    await expect(prompt).not.toHaveText(ask);

    // Its band gets its name back. Read from the title, not the drawn label —
    // a narrow band (the intro is 4% wide) is named but has no room to show it.
    await expect.poll(() => timeline.locator(`[data-band-kind="${askedKind}"]`).evaluateAll(
      els => els.filter(e => (e.getAttribute('title') || '').includes('·')).length
    )).toBeGreaterThan(0);
  });

  test('a named section can be replayed, and its lyrics follow along', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // Answer whatever is asked, so one section becomes named
    const blocks = page.locator('[data-section-block]');
    await answerAsk(page);

    // A named band stays lit and clickable even while another is the focus.
    // Found by its title, which gains the name; the drawn label needs width
    // the intro band does not have.
    const named = timeline.locator('[data-band-start][title*="·"]').first();
    await expect(named).toHaveCSS('opacity', '1');
    await expect(named).toBeEnabled();

    // Clicking it jumps there and plays, and its lyrics take the playing green
    await named.click();
    await expect(timeline.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect.poll(async () => (await blocks.evaluateAll(
      els => els.filter(e => getComputedStyle(e).backgroundColor === 'rgb(107, 168, 98)').length
    ))).toBe(1);
  });

  test('start over clears the board and deals a fresh ask', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });
    const blocks = page.locator('[data-section-block]');
    const restart = page.locator('[data-start-over]');

    // Nothing to reset yet, so no way to
    await expect(restart).toHaveCount(0);

    // Answer one ask
    await answerAsk(page);

    const solvedCount = () => blocks.evaluateAll(
      (els, greens) => els.filter(e => greens.includes(getComputedStyle(e).backgroundColor)).length,
      SOLVED_GREENS);
    const namedBands = () => timeline.locator('[data-band-start]').evaluateAll(
      els => els.filter(e => (e.getAttribute('title') || '').includes('·')).length);

    await expect.poll(solvedCount).toBe(1);
    await expect.poll(namedBands).toBe(1);
    await expect(restart).toBeVisible();

    // Starting over puts every part back, and the button retires with the progress
    await restart.click();
    await expect.poll(solvedCount).toBe(0);
    await expect.poll(namedBands).toBe(0);
    await expect(restart).toHaveCount(0);
    // A task is dealt again rather than the board sitting idle
    await expect(page.locator('[data-timeline-prompt]')).toBeVisible();
    await expect(timeline.locator('[data-band-target]')).toHaveCount(1);
  });

  test('naming every part finishes the song and lights Mind Power', async ({ page }) => {
    // This one names every part of a song rather than probing one, so it runs
    // ~14s on its own against the default 30s budget. Three workers sharing one
    // `next dev` push it past that, and it failed two of three parallel runs
    // while passing every serial and isolated run. The work is genuinely long,
    // so the budget is raised to match it — trimming the test would cost the
    // coverage, and a test that fails on load teaches people to ignore red.
    test.setTimeout(90_000);

    await page.goto('/platform/practice');
    await page.evaluate(() => {
      window.localStorage.setItem('mep-completed-practices', '[]');
      // Spend today's milestone slots, so any glow has to come from the
      // completion itself rather than from "first action of the day".
      window.localStorage.setItem('mep-last-auto-pop-first-action-date', new Date().toDateString());
      window.localStorage.setItem('mep-last-auto-pop-major-task-date', new Date().toDateString());
    });
    await page.reload();

    await page.evaluate(() => {
      (window as unknown as { __ev: string[] }).__ev = [];
      for (const name of ['songwriting-progress-updated', 'veinote-celebrate']) {
        window.addEventListener(name, e => {
          const d = (e as CustomEvent).detail;
          (window as unknown as { __ev: string[] }).__ev.push(name + (d ? ` ${JSON.stringify(d)}` : ''));
        });
      }
    });

    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });

    // Work through every ask, answering each with the exact card it names
    for (let i = 0; i < 8; i++) {
      const ask = await page.locator('[data-timeline-prompt]')
        .textContent({ timeout: 2000 }).catch(() => null);
      if (!ask) break;
      await answerAsk(page);
    }

    // Every part named, and nothing left to ask for
    await expect.poll(() => page.locator('[data-section-block]').evaluateAll(
      (els, greens) => els.filter(e => greens.includes(getComputedStyle(e).backgroundColor)).length,
      SOLVED_GREENS,
    )).toBe(7);
    await expect(page.locator('[data-timeline-prompt]')).toHaveCount(0);

    // The completion is recorded, and Mind Power is told twice: once to recount
    // the metrics, once to light the ring.
    expect(await page.evaluate(() => localStorage.getItem('mep-completed-practices')))
      .toContain('do-you-love');
    const events = await page.evaluate(() => (window as unknown as { __ev: string[] }).__ev);
    expect(events).toContain('songwriting-progress-updated {"triggerType":"major-task"}');
    expect(events).toContain('veinote-celebrate');

    // And the way on to the next song appears at the end of the lyrics
    const nav = page.locator('[data-song-nav]');
    await expect(nav).toHaveCount(1);
    await nav.getByRole('button', { name: 'Next song' }).click();
    await expect(page.locator('[data-song-pill]')).toContainText('Closer');
    // The new song is unfinished, so the nav stands down again
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-song-nav]')).toHaveCount(0);
  });

  test('the lyrics line up with the timeline at every width', async ({ page }) => {
    const edges = async () => page.evaluate(() => {
      const bar = document.querySelector('[data-song-timeline] div.h-11') as HTMLElement;
      const card = document.querySelector('[data-section-block]') as HTMLElement;
      const b = bar.getBoundingClientRect(), c = card.getBoundingClientRect();
      return { left: Math.round(c.left - b.left), right: Math.round(b.right - c.right) };
    });

    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });

    // The scrollbar lives in the margin, so the cards themselves span the bar —
    // and they stay centred with it however much room the screen has.
    for (const width of [1280, 1920, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(edges).toEqual({ left: 0, right: 0 });
    }
  });

  test('a finished song reads along: the sung line lifts and the list follows', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // Nothing reads along until the song is finished — following the words
    // would say which part is playing.
    await expect(page.locator('[data-line-current]')).toHaveCount(0);

    // Finish the song, answering each ask with the exact card it names
    for (let i = 0; i < 8; i++) {
      const ask = await page.locator('[data-timeline-prompt]')
        .textContent({ timeout: 2000 }).catch(() => null);
      if (!ask) break;
      await answerAsk(page);
    }

    // Verse 1's third line starts at 13.0s, its sixth at 27.18s
    const track = timeline.locator('div.touch-none');
    const width = (await track.boundingBox())!.width;
    const seekTo = (secs: number) => track.click({ position: { x: width * (secs / 168), y: 4 } });

    await ensurePlaying(timeline);
    await seekTo(14);
    await expect(page.locator('[data-line-current]')).toHaveText("And I don't care just we do");
    await seekTo(28);
    await expect(page.locator('[data-line-current]')).toHaveText('We stay at home turn down the light');

    // Jumping to the bridge carries the list along with the playhead
    const scrollTop = () => page.locator('.parts-scroll').evaluate(el => el.scrollTop);
    const before = await scrollTop();
    await seekTo(130);
    await expect(page.locator('[data-line-current]')).toHaveText('Do you love Do you love Do you love');
    await expect.poll(scrollTop).toBeGreaterThan(before + 100);
  });

  test('landing on a song starts it, and so does switching', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // No Play to press — the song is already running
    await expect(timeline.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(timeline.getByRole('button', { name: 'Play' })).toHaveCount(0);

    // Picking another song starts that one too
    await page.locator('[data-song-pill] > button').click();
    await page.locator('[data-song-option="beautiful-day"]').click();
    await expect(page.locator('[data-song-pill]')).toContainText('Beautiful Day');
    await expect(timeline.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 20000 });
  });

  test('the first-run guide holds the song until it is dismissed', async ({ page }) => {
    // This test is the first run, so undo the beforeEach pre-dismissal
    await page.evaluate(() => window.localStorage.removeItem('mep-structure-demo-off'));
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const demo = page.locator('[data-structure-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });

    // Nothing plays behind the guide
    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline.getByRole('button', { name: 'Pause' })).toHaveCount(0);

    // Dismissing it is what sets the song going
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(timeline.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 20000 });
  });

  test('the scrub line is graduated, ten seconds a mark', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    const marks = timeline.locator('div.touch-none span.absolute.top-0.w-px');
    // Do You Love runs 2:48, so 10s apart gives 16 marks, two of them minutes
    await expect(marks).toHaveCount(16);
    const tall = await marks.evaluateAll(
      els => els.filter(e => Math.round(e.getBoundingClientRect().height) === 8).length);
    expect(tall).toBe(2);

    // They march evenly across the track rather than bunching
    const lefts = await marks.evaluateAll(els => els.map(e => parseFloat((e as HTMLElement).style.left)));
    const gaps = lefts.slice(1).map((v, i) => +(v - lefts[i]).toFixed(3));
    expect(new Set(gaps).size).toBe(1);
  });

  test('Composing verses runs on one line of copy a step', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();

    const ask = page.locator('main p.font-semibold').first();
    const next = page.getByRole('button', { name: 'Next', exact: true });
    const dots = page.locator('main div[aria-label*="Step"] span');

    // One instruction, six progress dots, and nothing else to read
    await expect(ask).toHaveText('Choose a theme');
    await expect(dots).toHaveCount(6);
    await expect(page.locator('main').getByText(/Focus on sensory|don't overthink|Status/)).toHaveCount(0);

    // Next is never disabled. Pressed early it shakes and says what is missing,
    // and the step does not advance.
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByText('Pick a theme to keep going.')).toBeVisible();
    await expect(ask).toHaveText('Choose a theme');
    await page.getByRole('button', { name: 'Solitude' }).click();
    // Answering retires the prompt rather than leaving it nagging
    await expect(page.getByText('Pick a theme to keep going.')).toHaveCount(0);
    await expect(ask).toHaveText('Type five nouns');
    // The theme carries forward as a tag rather than its own card
    await expect(page.locator('main').getByText('Solitude')).toBeVisible();

    const fill = async (words: string[]) => {
      for (let i = 0; i < words.length; i++) {
        await page.locator('main input').nth(i).fill(words[i]);
      }
    };
    await next.click();
    await expect(page.getByText('Fill all five nouns to keep going.')).toBeVisible();
    await expect(ask).toHaveText('Type five nouns');
    await fill(['rain', 'window', 'clock', 'door', 'street']);
    await next.click();

    await expect(ask).toHaveText('Type five verbs');
    await fill(['falls', 'waits', 'turns', 'opens', 'sleeps']);
    await next.click();

    // Linking: pick a noun, then a verb, five times
    await expect(ask).toHaveText('Link each noun to a verb');
    await next.click();
    await expect(page.getByText('Link every noun to a verb to keep going.')).toBeVisible();
    await expect(ask).toHaveText('Link each noun to a verb');
    const cards = page.locator('.verse-card');
    for (let i = 0; i < 5; i++) {
      await cards.nth(i).click();
      await cards.nth(5 + i).click();
    }
    await expect(page.locator('main svg line')).toHaveCount(5);
    await next.click();

    await expect(ask).toHaveText('Turn each pair into a line');
    for (let i = 0; i < 5; i++) {
      await page.locator('.verse-card').nth(i).locator('input').fill(`line ${i + 1}`);
    }
    await next.click();

    // The verse, and the way to run it again
    await expect(ask).toHaveText('Your verse');
    await expect(page.locator('.verse-card p')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Start a new practice' })).toBeVisible();
  });

  test('the task points at one band at a time, and it pulses', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    // Exactly one band is the target, and the ask names that band's kind
    const target = timeline.locator('[data-band-target]');
    await expect(target).toHaveCount(1);
    const ask = ((await page.locator('[data-timeline-prompt]').textContent()) || '').toLowerCase();
    expect(ask).toContain((await target.getAttribute('data-band-kind'))!);

    // It draws the eye by going black and pulsing, rather than by being labelled
    await expect(target).toHaveCSS('background-color', 'rgb(28, 25, 23)');
    await expect(target).toHaveCSS('animation-name', 'band-pulse');
    await expect(target).toHaveCSS('animation-iteration-count', 'infinite');

    // Clicking it settles the pulse — it has been found. Forced, because
    // Playwright waits for an element to stop moving and this one never would.
    await target.click({ force: true });
    await expect(target).toHaveCSS('animation-name', 'none');
    await expect(target).toHaveCSS('background-color', 'rgb(28, 25, 23)');

    // ...and holds the focus alone. The others stop responding but keep their
    // colour — the ring and the pulse do the work, not a wash of grey.
    await expect(target).toBeEnabled();
    const others = timeline.locator('[data-band-start]:not([data-band-target])');
    await expect(others).toHaveCount(6);
    for (const band of await others.all()) {
      await expect(band).toHaveCSS('opacity', '1');
      await expect(band).toBeDisabled();
    }
    await expect(target).toHaveCSS('opacity', '1');

    // Each band after the first carries a gap to divide it from its neighbour
    await expect(timeline.locator('[data-band-start] > span.absolute')).toHaveCount(6);
  });

  test('every lyrics card wears the same colour, words or note', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });
    // Park the pointer away so no card is caught mid-hover
    await page.mouse.move(2, 2);

    const looks = () => page.locator('[data-section-block]').evaluateAll(els => els.map(e => {
      const body = e.querySelector('[data-instrumental], p.font-serif') as HTMLElement;
      return `${getComputedStyle(e).backgroundColor}|${getComputedStyle(body).color}`;
    }));
    // One background and one ink across all seven, the music note included
    await expect.poll(async () => new Set(await looks()).size).toBe(1);
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
    await ensurePlaying(timeline);
    await page.waitForTimeout(6000);

    const left = await playhead.evaluate(el => parseFloat((el as HTMLElement).style.left));
    expect(left).toBeGreaterThan(1);
  });

  test('the playhead really moves on screen, not just in its style attribute', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });
    await ensurePlaying(timeline);
    await page.waitForTimeout(400);

    // Measure where the playhead is actually painted, not what left% it claims.
    // A CSS transition on `left` once held the painted position still while the
    // declared value advanced 60 times a second.
    const painted = () => page.evaluate(() => {
      const t = document.querySelector('[data-song-timeline]')!;
      const line = t.querySelector('div.h-11 > div[aria-hidden="true"]') as HTMLElement;
      const bar = t.querySelector('div.h-11') as HTMLElement;
      return line.getBoundingClientRect().left - bar.getBoundingClientRect().left;
    });

    // The whole measurement sits inside the first ~3s of playback on purpose:
    // Chromium pauses itself a few seconds in when its audio output is
    // unavailable, and a longer window would be measuring the sound device.
    const before = await painted();
    await page.waitForTimeout(1200);
    const after = await painted();

    // ~6px per second on a 1050px bar, so ~7px over this window
    expect(after - before).toBeGreaterThan(2);
  });

  // The marker is tracked but no longer painted: every card wears the same
  // colour, and lighting up the one under the playhead would have handed over
  // the answer to whatever the task is asking for.
  test('the part under the playhead is tracked, and follows the marker mid-scrub', async ({ page }) => {
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    const timeline = page.locator('[data-song-timeline]');
    await expect(timeline).toBeVisible({ timeout: 20000 });

    const playing = page.locator('[data-section-block].is-playing');
    // Exactly one part is ever marked, and at 0:00 it is the intro — wordless,
    // so it carries the music note rather than any lyrics.
    await expect(playing).toHaveCount(1);
    await expect(playing.locator('[data-instrumental]')).toHaveCount(1);

    // Seeking past the intro (0–7s) hands the highlight to the first verse.
    // Driven by a seek rather than by waiting out real playback: Chromium pauses
    // itself after a few seconds when its audio output is unavailable, which
    // would make a wall-clock wait here depend on the machine's sound device.
    const track = timeline.locator('div.touch-none');
    await ensurePlaying(timeline);
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
    // Undo the beforeEach pre-dismissal: this test IS the first run. The
    // retired "-seen" key is planted too: the guide once wrote it after a
    // single showing, and whoever carries it must still get the guide.
    await page.evaluate(() => {
      window.localStorage.removeItem('mep-structure-demo-off');
      window.localStorage.setItem('mep-structure-demo-seen', 'true');
    });
    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();

    // The how-to sits over the exercise: title, description, scene, one button
    const demo = page.locator('[data-structure-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('We name a part of the song', { exact: false })).toBeVisible();

    // The scene mirrors the real thing: a named band, four lyric cards that
    // scroll, and the third one as the answer.
    const scene = demo.locator('.demo-scene');
    await expect(scene).toBeVisible();
    await expect(scene.locator('.demo-list > div')).toHaveCount(4);
    await expect(scene.locator('.demo-band')).toHaveCSS('animation-name', 'demo-band');
    await expect(scene.locator('.demo-list')).toHaveCSS('animation-name', 'demo-scroll');

    // "Got it" closes this visit's showing — but the guide returns on the
    // next opening, because only "don't show again" retires it
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-structure-demo]')).toBeVisible({ timeout: 20000 });

    // ...and taking up "don't show this again" is what makes it stay away
    await page.locator('[data-structure-demo]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-structure-demo]')).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-structure-demo]')).toHaveCount(0);

    // ...while the info icon still brings it back on demand
    await page.locator('[data-demo-replay]').click();
    await expect(page.locator('[data-structure-demo]')).toBeVisible();
    await page.locator('[data-structure-demo]').getByRole('button', { name: 'Got it' }).click();
    await expect(page.locator('[data-structure-demo]')).toHaveCount(0);
  });

  test('a Composing verses first-timer gets the linking demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-verse-demo-seen'));
    await page.goto('/platform/practice');
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();

    // The how-to sits over the exercise: title, description, scene, one button
    const demo = page.locator('[data-verse-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('link each noun to a verb', { exact: false })).toBeVisible();

    // The scene is the linking step in miniature: two columns of three pills
    // and two connectors, all riding one clock
    await expect(demo.locator('.vd-noun-0')).toHaveCSS('animation-name', 'vd-first-noun');
    await expect(demo.locator('.vd-line-1')).toHaveCSS('animation-name', 'vd-line-1');
    await expect(demo.locator('svg line')).toHaveCount(2);

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-verse-demo]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-verse-demo]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-verse-demo]')).toHaveCount(0);
    await page.reload();
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a theme');
    await expect(page.locator('[data-verse-demo]')).toHaveCount(0);
  });

  test('a Melody first-timer gets the tap-and-play demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-melody-demo-seen'));
    const openMelody = async () => {
      await page.locator('button[aria-label="Next Practice"]').click();
      await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openMelody();

    const demo = page.locator('[data-melody-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Tap a square', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();

    // The scene: a five-by-eight grid, two squares the cursor fills (each in
    // a swept column, so carrying both animations), and play, all on one clock
    await expect(demo.locator('.md-cell')).toHaveCount(40);
    await expect(demo.locator('.md-add-first')).toHaveAttribute('data-beat', '2');
    await expect(demo.locator('.md-add-first')).toHaveCSS('animation-name', 'md-add-first');
    await expect(demo.locator('.md-add-second')).toHaveAttribute('data-beat', '6');
    await expect(demo.locator('.md-head')).toHaveCSS('animation-name', 'md-head');
    await expect(demo.locator('.md-play')).toHaveCSS('animation-name', 'md-play');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openMelody();
    await expect(page.locator('[data-melody-demo]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-melody-demo]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-melody-demo]')).toHaveCount(0);
    await page.reload();
    await openMelody();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
    await expect(page.locator('[data-melody-demo]')).toHaveCount(0);
  });

  test('a Chord progressions first-timer gets the fill-and-play demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-chord-demo-seen'));
    const openChords = async () => {
      for (let i = 0; i < 3; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openChords();

    const demo = page.locator('[data-chord-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Tap a bar, then a chord', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();

    // The scene: four bars, the last one filled by the click, then the run
    await expect(demo.locator('.cd-bar')).toHaveCount(4);
    await expect(demo.locator('.cd-fill')).toHaveCSS('animation-name', 'cd-fill');
    await expect(demo.locator('.cd-play')).toHaveCSS('animation-name', 'cd-play');
    await expect(demo.locator('.cd-bar-3')).toHaveCSS('animation-name', 'cd-bar-3');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openChords();
    await expect(page.locator('[data-chord-demo]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-chord-demo]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-chord-demo]')).toHaveCount(0);
    await page.reload();
    await openChords();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
    await expect(page.locator('[data-chord-demo]')).toHaveCount(0);
  });

  /*
   * No practice has a walkthrough of its own yet. The clips the cards point at
   * are Learn chapters standing in, so the play button must not open one — but
   * it stays live and answers the press, because a greyed button says nothing
   * at all on a phone, where there is no hover to reveal its tooltip.
   */
  test('a Rhythm first-timer gets the tap-and-play demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-rhythm-demo-seen'));
    const openRhythm = async () => {
      for (let i = 0; i < 4; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openRhythm();

    const demo = page.locator('[data-rhythm-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Tap a square to put a hit', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();

    // The scene: two rows of sixteen, two squares the cursor fills (each in a
    // swept column, so carrying both animations), and play, all on one clock
    await expect(demo.locator('.rd-cell')).toHaveCount(32);
    await expect(demo.locator('.rd-add-low')).toHaveAttribute('data-step', '6');
    await expect(demo.locator('.rd-add-low')).toHaveCSS('animation-name', 'rd-add-low');
    await expect(demo.locator('.rd-add-high')).toHaveAttribute('data-step', '15');
    await expect(demo.locator('.rd-head')).toHaveCSS('animation-name', 'rd-head');
    await expect(demo.locator('.rd-play')).toHaveCSS('animation-name', 'rd-play');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openRhythm();
    await expect(page.locator('[data-rhythm-demo]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-rhythm-demo]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-rhythm-demo]')).toHaveCount(0);
    await page.reload();
    await openRhythm();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a tempo');
    await expect(page.locator('[data-rhythm-demo]')).toHaveCount(0);
  });

  test('a Writing from a feeling first-timer gets the notes-into-lines demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-lyrics-demo-seen'));
    const openLyrics = async () => {
      for (let i = 0; i < 5; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openLyrics();

    const demo = page.locator('[data-lyrics-demo]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Scribble notes on a theme', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();

    // The scene: three notes, two of them taken, their words landing in the
    // line at the same moment, all on one clock
    await expect(demo.locator('.ld-note')).toHaveCount(3);
    await expect(demo.locator('.ld-taken-0')).toHaveCSS('animation-name', 'ld-taken-0');
    await expect(demo.locator('.ld-drop-1')).toHaveCSS('animation-name', 'ld-drop-1');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openLyrics();
    await expect(page.locator('[data-lyrics-demo]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-lyrics-demo]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-lyrics-demo]')).toHaveCount(0);
    await page.reload();
    await openLyrics();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a theme');
    await expect(page.locator('[data-lyrics-demo]')).toHaveCount(0);
  });

  test('a Developing a melody first-timer gets the answer-the-call demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-develop-demo-seen'));
    const openDevelop = async () => {
      for (let i = 0; i < 6; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openDevelop();

    // Melody's guide, in the variant whose scene has a given half
    const demo = page.locator('[data-melody-demo][data-melody-demo-variant="develop"]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('The first two bars are given', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();

    // The cursor answers on beats six and eight, in the second half
    await expect(demo.locator('.md-cell')).toHaveCount(40);
    await expect(demo.locator('.md-add-first')).toHaveAttribute('data-beat', '5');
    await expect(demo.locator('.md-add-second')).toHaveAttribute('data-beat', '7');
    await expect(demo.locator('.md-add-first')).toHaveCSS('animation-name', 'md-add-first');
    await expect(demo.locator('.md-head')).toHaveCSS('animation-name', 'md-head');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openDevelop();
    await expect(page.locator('[data-melody-demo-variant="develop"]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-melody-demo-variant="develop"]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-melody-demo]')).toHaveCount(0);
    await page.reload();
    await openDevelop();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
    await expect(page.locator('[data-melody-demo]')).toHaveCount(0);
  });

  test('a Developing a progression first-timer gets the swap-a-chord demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-develop-chords-demo-seen'));
    const openDevelop = async () => {
      for (let i = 0; i < 7; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openDevelop();

    // Chord progressions' guide, in the variant whose bars are all full and
    // whose chips are the richer chords
    const demo = page.locator('[data-chord-demo][data-chord-demo-variant="develop"]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Four plain chords are given', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();
    await expect(demo.locator('.cd-chip').first()).toHaveText('Am7');
    // The swap: what was there goes as what the cursor brings arrives
    await expect(demo.locator('.cd-was')).toHaveText('Am');
    await expect(demo.locator('.cd-was')).toHaveCSS('animation-name', 'cd-was');
    await expect(demo.locator('.cd-fill').first()).toHaveCSS('animation-name', 'cd-fill');
    await expect(demo.locator('.cd-bar-3')).toHaveCSS('animation-name', 'cd-bar-3');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openDevelop();
    await expect(page.locator('[data-chord-demo-variant="develop"]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-chord-demo-variant="develop"]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-chord-demo]')).toHaveCount(0);
    await page.reload();
    await openDevelop();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
    await expect(page.locator('[data-chord-demo]')).toHaveCount(0);
  });

  test('a Developing a rhythm first-timer gets the change-the-feel demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-develop-rhythm-demo-seen'));
    const openDevelop = async () => {
      for (let i = 0; i < 8; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openDevelop();

    // Rhythm's guide, in the variant whose hits already down are the given feel
    const demo = page.locator('[data-rhythm-demo][data-rhythm-demo-variant="develop"]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('A feel is given', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();
    await expect(demo.locator('.rd-cell')).toHaveCount(32);
    await expect(demo.locator('.rd-add-low')).toHaveCSS('animation-name', 'rd-add-low');
    await expect(demo.locator('.rd-head')).toHaveCSS('animation-name', 'rd-head');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openDevelop();
    await expect(page.locator('[data-rhythm-demo-variant="develop"]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-rhythm-demo-variant="develop"]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-rhythm-demo]')).toHaveCount(0);
    await page.reload();
    await openDevelop();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a feel');
    await expect(page.locator('[data-rhythm-demo]')).toHaveCount(0);
  });

  test('a Finishing a verse first-timer gets the given-beginning demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-finish-demo-seen'));
    const openFinish = async () => {
      for (let i = 0; i < 9; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openFinish();

    // Writing from a feeling's guide, in the variant that shows two given lines
    const demo = page.locator('[data-lyrics-demo][data-lyrics-demo-variant="finish"]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Two lines are given', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();
    await expect(demo.locator('.ld-given')).toHaveCount(2);
    await expect(demo.locator('.ld-given').first()).toHaveText('The kitchen light was on all night');
    await expect(demo.locator('.ld-note')).toHaveCount(3);
    await expect(demo.locator('.ld-cursor')).toHaveCSS('animation-name', 'ld-cursor-path-finish');
    await expect(demo.locator('.ld-drop-1')).toHaveCSS('animation-name', 'ld-drop-1');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openFinish();
    await expect(page.locator('[data-lyrics-demo-variant="finish"]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-lyrics-demo-variant="finish"]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-lyrics-demo]')).toHaveCount(0);
    await page.reload();
    await openFinish();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a beginning');
    await expect(page.locator('[data-lyrics-demo]')).toHaveCount(0);
  });

  test('a Melody over chords first-timer gets the chords-above-the-grid demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-chords-melody-demo-seen'));
    const openOver = async () => {
      for (let i = 0; i < 10; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openOver();

    // Melody's guide, in the variant with a chord strip over the grid
    const demo = page.locator('[data-melody-demo][data-melody-demo-variant="chords"]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('The chords sit above the grid', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();
    await expect(demo.locator('.md-chord')).toHaveCount(4);
    await expect(demo.locator('.md-chord').first()).toHaveText('C');
    await expect(demo.locator('.md-cell')).toHaveCount(40);
    await expect(demo.locator('.md-add-first')).toHaveCSS('animation-name', 'md-add-first');
    await expect(demo.locator('.md-head')).toHaveCSS('animation-name', 'md-head');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openOver();
    await expect(page.locator('[data-melody-demo-variant="chords"]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-melody-demo-variant="chords"]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-melody-demo]')).toHaveCount(0);
    await page.reload();
    await openOver();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
    await expect(page.locator('[data-melody-demo]')).toHaveCount(0);
  });

  test('a Build a beat first-timer gets the five-row demo, once', async ({ page }) => {
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-beat-demo-seen'));
    const openBeat = async () => {
      for (let i = 0; i < 11; i++) await page.locator('button[aria-label="Next Practice"]').click();
      await page.getByRole('button', { name: 'Start' }).first().click();
    };
    await page.goto('/platform/practice');
    await openBeat();

    // Rhythm's guide, in the variant with the whole kit
    const demo = page.locator('[data-rhythm-demo][data-rhythm-demo-variant="beat"]');
    await expect(demo).toBeVisible({ timeout: 20000 });
    await expect(demo.getByText('How it works')).toBeVisible();
    await expect(demo.getByText('Five drums, one row each', { exact: false })).toBeVisible();
    await expect(demo.getByText('Why?')).toBeVisible();
    await expect(demo.locator('.rd-cell')).toHaveCount(80);
    await expect(demo.locator('.rd-add-clap')).toHaveCSS('animation-name', 'rd-add-clap');
    await expect(demo.locator('.rd-add-tom')).toHaveCSS('animation-name', 'rd-add-tom');
    await expect(demo.locator('.rd-cursor-beat')).toHaveCSS('animation-name', 'rd-cursor-path-beat');
    await expect(demo.locator('.rd-head')).toHaveCSS('animation-name', 'rd-head');

    // "Got it" closes this visit's showing — the guide returns next time
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await openBeat();
    await expect(page.locator('[data-rhythm-demo-variant="beat"]')).toBeVisible({ timeout: 20000 });

    // "Don't show this again" is what retires it
    await page.locator('[data-rhythm-demo-variant="beat"]').getByRole('button', { name: "Don't show this again" }).click();
    await expect(page.locator('[data-rhythm-demo]')).toHaveCount(0);
    await page.reload();
    await openBeat();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a kit');
    await expect(page.locator('[data-rhythm-demo]')).toHaveCount(0);
  });

  test('the card play button opens the practice how-to, without starting it', async ({ page }) => {
    // The beforeEach retired every guide's auto-showing; the play button
    // is an explicit ask and shows it regardless.
    await page.goto('/platform/practice');

    const play = page.getByRole('button', { name: 'How it works' });
    await play.click();
    const guide = page.locator('[data-structure-demo]');
    await expect(guide).toBeVisible({ timeout: 20000 });
    await expect(guide.getByText('Why?')).toBeVisible();
    await expect(page.locator('video')).toHaveCount(0);

    // Got it closes it, and the press did not start the practice underneath
    await guide.getByRole('button', { name: 'Got it' }).click();
    await expect(guide).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Every card has one: the twelfth opens Rhythm's guide in its kit variant
    for (let i = 0; i < 11; i++) await page.locator('button[aria-label="Next Practice"]').click();
    // Outgoing cards stay in the DOM while they slide off; wait for the one
    await expect(page.getByRole('button', { name: 'How it works' })).toHaveCount(1);
    await page.getByRole('button', { name: 'How it works' }).click();
    await expect(page.locator('[data-rhythm-demo-variant="beat"]')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);
  });
});

test.describe('Practice 3 — melody', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-melody-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Two clicks along the carousel: structure, verses, melody. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const cell = (page: import('@playwright/test').Page, beat: number, row: number) =>
    page.locator(`[data-mw-cell="${beat}-${row}"]`);
  /** Which squares are on, as "beat-row", in beat order. The DOM runs row by
   *  row from the top, which is pitch order, not time order. */
  const placed = (page: import('@playwright/test').Page) =>
    page.locator('[data-mw-cell][aria-pressed="true"]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-mw-cell') || '').sort((x, y) => Number(x.split('-')[0]) - Number(y.split('-')[0])));
  /** The row labels, top to bottom. */
  const rows = (page: import('@playwright/test').Page) =>
    page.locator('[data-mw-grid] span.text-xs').evaluateAll(els => els.map(e => (e.textContent || '').trim()));

  test('choose a key, place notes, hear the line, and it is rendered for the canvas', async ({ page }) => {
    await open(page);

    // Next with no key shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a key to keep going.')).toBeVisible();
    await page.locator('[data-mw-key="C"]').click();
    await next(page).click();

    // The rows are the key's own degrees, seventh at the top, tonic at the bottom
    await expect(ask(page)).toHaveText('Write eight beats');
    expect(await rows(page)).toEqual(['B', 'A', 'G', 'F', 'E', 'D', 'C']);

    // Two notes is a gesture, not a melody: Next shakes
    await cell(page, 0, 0).click();
    await cell(page, 1, 2).click();
    await next(page).click();
    await expect(page.getByText('Place at least four notes to keep going.')).toBeVisible();
    await cell(page, 2, 4).click();
    await cell(page, 3, 2).click();
    expect(await placed(page)).toEqual(['0-0', '1-2', '2-4', '3-2']);

    // Play sweeps the beats — the first now, the second a beat later
    const live = () => page.locator('[data-mw-cell]').evaluateAll(els => [...new Set(
      els.filter(e => {
        const c = getComputedStyle(e).backgroundColor;
        return c === 'rgb(251, 255, 237)' || c === 'rgb(95, 152, 87)';
      }).map(e => (e.getAttribute('data-mw-cell') || '').split('-')[0]),
    )]);
    await page.locator('[data-mw-play]').click();
    await expect.poll(live).toEqual(['0']);
    await expect.poll(live, { timeout: 4000 }).toEqual(['1']);
    await page.locator('[data-mw-play]').click();
    await expect.poll(live).toEqual([]);

    // The finish renders the line to a file, ready for the canvas: a WAV of
    // five seconds is a few hundred kilobytes, so anything shorter than five
    // digits would be a header and no sound
    await next(page).click();
    await expect(ask(page)).toHaveText('Your melody');
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect(page.locator('[data-mw-take-bytes]')).toHaveAttribute('data-mw-take-bytes', /^\d{5,}$/, { timeout: 10000 });
    await expect(page.locator('[data-mw-take-seconds]')).toHaveAttribute('data-mw-take-seconds', /^[4-6]$/);

    // Finishing is recorded under its own key, per key and line
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-melodies'),
    )).toContain('C:');
  });

  test('a square toggles off, another row in the beat replaces it, and a new key clears the line', async ({ page }) => {
    await open(page);
    await page.locator('[data-mw-key="G"]').click();
    await next(page).click();

    await cell(page, 0, 0).click();
    expect(await placed(page)).toEqual(['0-0']);
    await cell(page, 0, 0).click();
    expect(await placed(page)).toEqual([]);
    await cell(page, 0, 0).click();
    await cell(page, 0, 3).click();
    expect(await placed(page)).toEqual(['0-3']);

    // Changing key throws the line away — the rows would be different notes
    await page.getByRole('button', { name: 'Previous step' }).click();
    await page.locator('[data-mw-key="Am"]').click();
    await next(page).click();
    expect(await placed(page)).toEqual([]);
    expect((await rows(page)).at(-1)).toBe('A');
  });

  /*
   * Continuing in Canvas hands the melody over as an audio card. The write
   * itself cannot run under the mock user — the Storage upload and setDoc
   * are both rejected — so the reader's side of the contract is asserted on
   * Create's own cache: the `p-audio-` placeholder and a note pointing at it.
   */
  test('a melody handed to Canvas is drawn as an audio card', async ({ page }) => {
    const built = await page.evaluate(() => {
      const uid = 'test-user-id';
      const stamp = Date.now();
      const noteId = `n-${stamp}`;
      const audioPhraseId = `p-audio-${stamp}`;
      const phrases = [
        { id: `p-${stamp}-0`, text: '', groupId: null },
        { id: audioPhraseId, text: '', groupId: null },
      ];
      window.localStorage.setItem('veinote-last-active-uid', uid);
      window.localStorage.setItem(`veinote-create-notes-${uid}`, JSON.stringify([{
        // Titled apart from the card, so the card's title input is the only
        // one on the page carrying it
        id: noteId, title: 'Melody practice',
        content: phrases.map(p => p.text).join('\n'),
        folderId: null, updatedAt: new Date(stamp).toISOString(), ownerId: uid,
        collaborators: [], verses: [], phrases,
        audioNotes: [{
          id: `${stamp}`, url: '/Practice/Melodies/little-runner.wav', title: 'Melody in C major',
          duration: 5, groupId: null, phraseId: audioPhraseId, createdAt: stamp,
        }],
        audioUrl: '/Practice/Melodies/little-runner.wav',
      }]));
      window.localStorage.setItem(`veinote-selected-note-id-${uid}`, noteId);
      return { noteId };
    });

    await page.goto(`/platform/create?noteId=${built.noteId}`);
    await expect(page.locator('audio')).toHaveCount(1, { timeout: 20000 });
    await expect(page.locator('input[value="Melody in C major"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });
});

test.describe('Practice 4 — chord progressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-chord-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Three clicks along the carousel: structure, verses, melodies, chords. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 3; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  // Eyebrow, chord, numeral — three spans, read apart so they join with spaces
  const bars = (page: import('@playwright/test').Page) =>
    page.locator('[data-cp-bar]').evaluateAll(els => els.map(e =>
      [...e.querySelectorAll('span')].map(s => (s.textContent || '').trim()).filter(Boolean).join(' ')));

  test('choose a key, fill the bars, hear it, and see it named', async ({ page }) => {
    await open(page);

    // Next with no key shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a key to keep going.')).toBeVisible();
    await page.locator('[data-cp-key="G"]').click();
    await next(page).click();

    // The chips are the key's own seven chords, tonic first
    await expect(ask(page)).toHaveText('Fill the four bars');
    const chips = await page.locator('[data-cp-chip]').evaluateAll(els => els.map(e => e.getAttribute('data-cp-chip')));
    expect(chips).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);

    // Half-filled, Next shakes; each chip fills the next empty bar and shows
    // its numeral under the chord
    await page.locator('[data-cp-chip="G"]').click();
    await page.locator('[data-cp-chip="D"]').click();
    await next(page).click();
    await expect(page.getByText('Fill all four bars to keep going.')).toBeVisible();
    await page.locator('[data-cp-chip="Em"]').click();
    await page.locator('[data-cp-chip="C"]').click();
    expect(await bars(page)).toEqual(['Bar 1 G I', 'Bar 2 D V', 'Bar 3 Em vi', 'Bar 4 C IV']);

    // Play lights the bars in turn — the first now, the second a bar later
    const liveBars = () => page.locator('[data-cp-bar]').evaluateAll(els =>
      els.map((e, i) => getComputedStyle(e).backgroundColor === 'rgb(251, 255, 237)' ? i : -1).filter(i => i >= 0));
    await page.locator('[data-cp-play]').click();
    await expect.poll(liveBars).toEqual([0]);
    await expect.poll(liveBars, { timeout: 4000 }).toEqual([1]);
    await page.locator('[data-cp-play]').click();
    await expect.poll(liveBars).toEqual([]);

    // The finish: written in numerals, and named, because this one has a name
    await next(page).click();
    await expect(ask(page)).toHaveText('Your progression');
    await expect(page.getByText('I – V – vi – IV', { exact: false })).toBeVisible();
    await expect(page.getByText('The four-chord song')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();

    // Finishing is recorded under its own key, per key and pattern
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-chord-progressions'),
    )).toContain('G:G D Em C');
  });

  test('a tapped bar takes the next chord, and a new key empties the bars', async ({ page }) => {
    await open(page);
    await page.locator('[data-cp-key="C"]').click();
    await next(page).click();
    await page.locator('[data-cp-chip="C"]').click();
    await page.locator('[data-cp-chip="F"]').click();
    // Go back to bar one and replace it
    await page.locator('[data-cp-bar="0"]').click();
    await page.locator('[data-cp-chip="Am"]').click();
    expect(await bars(page)).toEqual(['Bar 1 Am vi', 'Bar 2 F IV', 'Bar 3 ·', 'Bar 4 ·']);

    // Changing key throws the bars away — they would be in the wrong key
    await page.getByRole('button', { name: 'Previous step' }).click();
    await page.locator('[data-cp-key="Em"]').click();
    await next(page).click();
    expect(await bars(page)).toEqual(['Bar 1 ·', 'Bar 2 ·', 'Bar 3 ·', 'Bar 4 ·']);
    const chips = await page.locator('[data-cp-chip]').evaluateAll(els => els.map(e => e.getAttribute('data-cp-chip')));
    expect(chips[0]).toBe('Em');
  });

  /*
   * Continuing in Canvas hands the four chords over as chord cards. As with
   * the take in Practice 3, the write itself cannot run under the mock user,
   * so the reader's side of the contract is asserted on Create's own cache:
   * `p-chord-<id>` placeholders, marks with wordIndex -1 and `placed`, and a
   * canvas that is only chords must not be mistaken for an empty one.
   */
  test('a progression handed to Canvas is drawn as chord cards', async ({ page }) => {
    const noteId = await page.evaluate(() => {
      const uid = 'test-user-id';
      const stamp = Date.now();
      const id = `n-${stamp}`;
      const chords = ['G', 'D', 'Em', 'C'].map((symbol, i) => ({
        id: `chord-${stamp}-${i}`, symbol, phraseId: '', wordIndex: -1, placed: true,
      }));
      const phrases = [
        { id: `p-${stamp}-0`, text: '', groupId: null },
        ...chords.map(c => ({ id: `p-chord-${c.id}`, text: '', groupId: null })),
      ];
      window.localStorage.setItem('veinote-last-active-uid', uid);
      window.localStorage.setItem(`veinote-create-notes-${uid}`, JSON.stringify([{
        id, title: 'Progression in G major',
        content: phrases.map(p => p.text).join('\n'),
        folderId: null, updatedAt: new Date(stamp).toISOString(), ownerId: uid,
        collaborators: [], verses: [], phrases, chords,
      }]));
      window.localStorage.setItem(`veinote-selected-note-id-${uid}`, id);
      return id;
    });

    await page.goto(`/platform/create?noteId=${noteId}`);
    const cards = page.locator('[data-phrase-id^="p-chord-"]');
    await expect(cards).toHaveCount(4, { timeout: 20000 });
    await expect(cards.nth(0)).toContainText('G');
    await expect(cards.nth(2)).toContainText('Em');
    // Not the empty-canvas illustration
    await expect(page.getByText('Type your lyrics', { exact: false })).toHaveCount(0);
  });
});

test.describe('Practice 5 — rhythm', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-rhythm-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Four clicks along the carousel: structure, verses, melody, chords, rhythm. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 4; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a tempo');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const cell = (page: import('@playwright/test').Page, voice: 'high' | 'low', step: number) =>
    page.locator(`[data-rb-cell="${voice}-${step}"]`);
  /** Which squares are on, as "voice-step", in DOM order (high row, then low). */
  const placed = (page: import('@playwright/test').Page) =>
    page.locator('[data-rb-cell][aria-pressed="true"]').evaluateAll(els => els.map(e => e.getAttribute('data-rb-cell')));
  /** Which step is under the playhead, if any. */
  const live = (page: import('@playwright/test').Page) => () =>
    page.locator('[data-rb-cell]').evaluateAll(els => [...new Set(
      els.filter(e => {
        const c = getComputedStyle(e).backgroundColor;
        return c === 'rgb(251, 255, 237)' || c === 'rgb(95, 152, 87)';
      }).map(e => (e.getAttribute('data-rb-cell') || '').split('-')[1]),
    )]);

  test('choose a tempo, place hits, hear the bar, and it is rendered for the canvas', async ({ page }) => {
    await open(page);

    // Next with no tempo shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a tempo to keep going.')).toBeVisible();
    await page.locator('[data-rb-tempo="slow"]').click();
    await next(page).click();

    // Two rows, high over low, sixteen steps each
    await expect(ask(page)).toHaveText('Build one bar');
    const rows = await page.locator('[data-rb-grid] span.text-xs').evaluateAll(els => els.map(e => (e.textContent || '').trim()));
    expect(rows).toEqual(['High', 'Low']);
    await expect(page.locator('[data-rb-cell]')).toHaveCount(32);

    // Two hits is a tap, not a rhythm: Next shakes
    await cell(page, 'low', 0).click();
    await cell(page, 'high', 2).click();
    await next(page).click();
    await expect(page.getByText('Place at least four hits to keep going.')).toBeVisible();
    await cell(page, 'low', 8).click();
    await cell(page, 'high', 10).click();
    expect(await placed(page)).toEqual(['high-2', 'high-10', 'low-0', 'low-8']);

    // Play sweeps the steps: something lights, then something later does
    const liveStep = live(page);
    await page.locator('[data-rb-play]').click();
    await expect.poll(liveStep).not.toEqual([]);
    const first = Number((await liveStep())[0]);
    await expect.poll(async () => Number((await liveStep())[0] ?? -1) > first, { timeout: 3000 }).toBe(true);
    await page.locator('[data-rb-play]').click();
    await expect.poll(liveStep).toEqual([]);

    // The finish renders the bar, twice round, to a file for the canvas
    await next(page).click();
    await expect(ask(page)).toHaveText('Your rhythm');
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect(page.locator('[data-rb-take-bytes]')).toHaveAttribute('data-rb-take-bytes', /^\d{5,}$/, { timeout: 10000 });
    await expect(page.locator('[data-rb-take-seconds]')).toHaveAttribute('data-rb-take-seconds', /^[4-7]$/);

    // Finishing is recorded under its own key, per tempo and bar
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-rhythms'),
    )).toContain('slow:');
  });

  test('a hit toggles off, and a new tempo keeps the bar', async ({ page }) => {
    await open(page);
    await page.locator('[data-rb-tempo="medium"]').click();
    await next(page).click();

    await cell(page, 'low', 0).click();
    expect(await placed(page)).toEqual(['low-0']);
    await cell(page, 'low', 0).click();
    expect(await placed(page)).toEqual([]);
    await cell(page, 'low', 4).click();
    await cell(page, 'high', 6).click();

    // A rhythm is the same rhythm at any speed — unlike a melody in a new
    // key, the hits stay when the tempo changes
    await page.getByRole('button', { name: 'Previous step' }).click();
    await page.locator('[data-rb-tempo="fast"]').click();
    await next(page).click();
    expect(await placed(page)).toEqual(['high-6', 'low-4']);
    await expect(page.getByText('120 BPM')).toBeVisible();
  });
});

test.describe('Practice 6 — writing from a feeling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-lyrics-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Five clicks along the carousel. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 5; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a theme');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const addNote = async (page: import('@playwright/test').Page, text: string) => {
    await page.locator('[data-ln-note-input]').fill(text);
    await page.keyboard.press('Enter');
  };

  test('a theme, a pile of notes, the notes into lines, and a verse', async ({ page }) => {
    await open(page);

    // Next with no theme shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a theme to keep going.')).toBeVisible();
    await page.locator('[data-ln-topic]').first().click();
    await next(page).click();

    // Three notes is a list, not a pile: Next shakes. Six is enough.
    await expect(ask(page)).toHaveText('Write your notes');
    for (const n of ['home', 'still here', 'the morning']) await addNote(page, n);
    await expect(page.locator('[data-ln-note]')).toHaveCount(3);
    await next(page).click();
    await expect(page.getByText('Write at least six notes to keep going.')).toBeVisible();
    for (const n of ['brighter', 'let go', 'closer']) await addNote(page, n);
    await expect(page.locator('[data-ln-note]')).toHaveCount(6);

    // A duplicate is simply not added; a tap takes a note off the pile
    await addNote(page, 'Closer');
    await expect(page.locator('[data-ln-note]')).toHaveCount(6);
    await page.locator('[data-ln-note]').last().click();
    await expect(page.locator('[data-ln-note]')).toHaveCount(5);
    await addNote(page, 'another try');
    await next(page).click();

    // Lines: a tapped note lands at the end of the line you are on, greys
    // once it is in a line, and the words between are typed
    await expect(ask(page)).toHaveText('Build your lines');
    await expect(page.locator('[data-ln-chip]')).toHaveCount(6);
    await page.locator('[data-ln-chip]', { hasText: 'still here' }).click();
    await page.locator('[data-ln-line="0"]').press('End');
    await page.keyboard.type(' in');
    await page.locator('[data-ln-chip]', { hasText: 'the morning' }).click();
    await expect(page.locator('[data-ln-line="0"]')).toHaveValue('still here in the morning');
    await expect(page.locator('[data-ln-chip]', { hasText: 'still here' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-ln-chip]', { hasText: 'brighter' })).toHaveAttribute('aria-pressed', 'false');

    // One line is not a verse: Next shakes. Enter makes the second line.
    await next(page).click();
    await expect(page.getByText('Build at least two lines to keep going.')).toBeVisible();
    await page.locator('[data-ln-line="0"]').press('Enter');
    await expect(page.locator('[data-ln-line="1"]')).toBeFocused();
    await page.locator('[data-ln-chip]', { hasText: 'brighter' }).click();
    await page.keyboard.type(' than before');
    await next(page).click();

    // The verse, and the way to the canvas
    await expect(ask(page)).toHaveText('Your lyrics');
    const verse = await page.locator('[data-ln-verse] p').allInnerTexts();
    expect(verse).toEqual(['still here in the morning', 'brighter than before']);
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-lyric-notes'),
    )).toContain('still here in the morning');
  });

  test('a new theme empties the pile; the same theme keeps it', async ({ page }) => {
    await open(page);
    const topics = page.locator('[data-ln-topic]');
    await topics.nth(0).click();
    await next(page).click();
    await addNote(page, 'home');
    await expect(page.locator('[data-ln-note]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Previous step' }).click();
    await topics.nth(0).click();
    await next(page).click();
    await expect(page.locator('[data-ln-note]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Previous step' }).click();
    await topics.nth(1).click();
    await next(page).click();
    await expect(page.locator('[data-ln-note]')).toHaveCount(0);
  });
});

test.describe('Practice 7 — developing a melody', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-develop-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Six clicks along the carousel. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 6; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const cell = (page: import('@playwright/test').Page, beat: number, row: number) =>
    page.locator(`[data-mw-cell="${beat}-${row}"]`);
  /** The given notes, as "beat-row". */
  const given = (page: import('@playwright/test').Page) =>
    page.locator('[data-mw-given]').evaluateAll(els => els.map(e => e.getAttribute('data-mw-cell') || ''));
  /** Every note that is on, in beat order. */
  const placed = (page: import('@playwright/test').Page) =>
    page.locator('[data-mw-cell][aria-pressed="true"]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-mw-cell') || '').sort((x, y) => Number(x.split('-')[0]) - Number(y.split('-')[0])));

  test('choose a key, answer the given half, hear it, and it is rendered for the canvas', async ({ page }) => {
    await open(page);

    // Next with no key shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a key to keep going.')).toBeVisible();
    await page.locator('[data-mw-key="C"]').click();
    await next(page).click();

    // Four bars: the given phrase fills the first two, every given note in
    // beats one to eight, and the last two bars are empty
    await expect(ask(page)).toHaveText('Answer the first half');
    await expect(page.locator('[data-mw-cell]')).toHaveCount(7 * 16);
    const call = await given(page);
    expect(call.length).toBeGreaterThanOrEqual(5);
    expect(call.every(c => Number(c.split('-')[0]) < 8)).toBe(true);
    expect((await placed(page)).every(c => Number(c.split('-')[0]) < 8)).toBe(true);

    // Two notes is a gesture, not an answer: Next shakes
    await cell(page, 8, 0).click();
    await cell(page, 10, 2).click();
    await next(page).click();
    await expect(page.getByText('Add at least four notes to the second half to keep going.')).toBeVisible();
    await cell(page, 12, 4).click();
    await cell(page, 14, 2).click();
    const all = await placed(page);
    expect(all.filter(c => Number(c.split('-')[0]) >= 8)).toEqual(['8-0', '10-2', '12-4', '14-2']);

    // The finish renders all four bars to a file for the canvas
    await next(page).click();
    await expect(ask(page)).toHaveText('Your melody');
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect(page.locator('[data-mw-take-bytes]')).toHaveAttribute('data-mw-take-bytes', /^\d{6,}$/, { timeout: 10000 });
    await expect(page.locator('[data-mw-take-seconds]')).toHaveAttribute('data-mw-take-seconds', /^(9|10|11)$/);

    // Finishing is recorded under its own key, per key and line
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-melody-developments'),
    )).toContain('C:');
  });

  test('a new example changes the call, and a given note can be taken away', async ({ page }) => {
    await open(page);
    await page.locator('[data-mw-key="G"]').click();
    await next(page).click();

    const before = await given(page);
    await page.locator('[data-dm-new-example]').click();
    await expect.poll(() => given(page)).not.toEqual(before);

    // The given half is a starting point, not a rule
    const now = await given(page);
    const [beat, row] = now[0].split('-').map(Number);
    await cell(page, beat, row).click();
    expect((await given(page)).length).toBe(now.length - 1);
  });
});

test.describe('Practice 8 — developing a progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-develop-chords-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Seven clicks along the carousel. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 7; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  /** The four bars' chord symbols. */
  const bars = (page: import('@playwright/test').Page) =>
    page.locator('[data-cp-bar]').evaluateAll(els => els.map(e => (e.querySelectorAll('span')[1]?.textContent || '').trim()));
  const changed = (page: import('@playwright/test').Page) =>
    page.locator('[data-cp-bar][data-cp-changed]').count();

  test('choose a key, make the given progression richer, and see it written out', async ({ page }) => {
    await open(page);

    // Next with no key shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a key to keep going.')).toBeVisible();
    await page.locator('[data-cp-key="C"]').click();
    await next(page).click();

    // Four bars are already filled with the key's own triads, none changed yet
    await expect(ask(page)).toHaveText('Make it richer');
    const given = await bars(page);
    expect(given).toHaveLength(4);
    expect(given.every(c => ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'].includes(c))).toBe(true);
    expect(await changed(page)).toBe(0);

    // The palette: the key's triads, their sevenths, and the colour chords
    const chips = await page.locator('[data-cp-chip]').evaluateAll(els => els.map(e => e.getAttribute('data-cp-chip')));
    expect(chips.slice(0, 7)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(chips.slice(7, 14)).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
    expect(chips.slice(14)).toEqual(['Csus4', 'Gsus4', 'Fm', 'Bb', 'D']);

    // One change is a listen, not a development: Next shakes
    await page.locator('[data-cp-bar="1"]').click();
    await page.locator('[data-cp-chip="G7"]').click();
    expect(await changed(page)).toBe(given[1] === 'G7' ? 0 : 1);
    await next(page).click();
    await expect(page.getByText('Change at least two bars to keep going.')).toBeVisible();

    // Filling a bar moves on to the next; a second change, and Next goes
    await page.locator('[data-cp-bar="3"]').click();
    await page.locator('[data-cp-chip="Fm"]').click();
    expect(await changed(page)).toBe(2);
    await next(page).click();

    // The finish writes it in numerals, the developed bars included
    await expect(ask(page)).toHaveText('Your progression');
    const written = await page.locator('main .max-w-6xl p').nth(1).innerText();
    expect(written).toContain('V7');
    expect(written).toContain('iv');
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-progression-developments'),
    )).toContain('C:');
  });

  test('a new example re-deals the plain bars, and start again returns to them', async ({ page }) => {
    await open(page);
    await page.locator('[data-cp-key="G"]').click();
    await next(page).click();

    const before = await bars(page);
    await page.locator('[data-dp-new-example]').click();
    await expect.poll(() => bars(page)).not.toEqual(before);
    expect(await changed(page)).toBe(0);

    // Develop two bars, finish, and start again: back to the plain version
    const plain = await bars(page);
    await page.locator('[data-cp-bar="0"]').click();
    await page.locator('[data-cp-chip="Gmaj7"]').click();
    await page.locator('[data-cp-chip="D7"]').click();
    expect(await changed(page)).toBe(2);
    await next(page).click();
    await expect(ask(page)).toHaveText('Your progression');
    await page.getByRole('button', { name: 'Build another' }).click();
    await expect(ask(page)).toHaveText('Make it richer');
    expect(await bars(page)).toEqual(plain);
    expect(await changed(page)).toBe(0);
  });
});

test.describe('Practice 9 — developing a rhythm', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-develop-rhythm-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Eight clicks along the carousel. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 8; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a feel');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const cell = (page: import('@playwright/test').Page, voice: 'high' | 'mid' | 'low', step: number) =>
    page.locator(`[data-rb-cell="${voice}-${step}"]`);
  const given = (page: import('@playwright/test').Page) =>
    page.locator('[data-rb-cell][data-rb-given]').evaluateAll(els => els.map(e => e.getAttribute('data-rb-cell') || ''));
  const on = (page: import('@playwright/test').Page) =>
    page.locator('[data-rb-cell][aria-pressed="true"]').count();

  test('choose a feel, change it, hear it, and it is rendered for the canvas', async ({ page }) => {
    await open(page);

    // Next with no feel shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a feel to keep going.')).toBeVisible();
    await page.locator('[data-dr-feel="rock"]').click();
    await next(page).click();

    // Three rows, hats over snare over kick, the feel already down and every
    // hit given; the tag carries the feel's own tempo
    await expect(ask(page)).toHaveText('Make it yours');
    const rows = await page.locator('[data-rb-grid] span.text-xs').evaluateAll(els => els.map(e => (e.textContent || '').trim()));
    expect(rows).toEqual(['High', 'Mid', 'Low']);
    await expect(page.locator('[data-rb-cell]')).toHaveCount(48);
    expect((await given(page)).sort()).toEqual([
      'high-0', 'high-10', 'high-12', 'high-14', 'high-2', 'high-4', 'high-6', 'high-8',
      'low-0', 'low-10', 'low-6', 'low-8', 'mid-12', 'mid-4',
    ].sort());
    await expect(page.getByText('110 BPM')).toBeVisible();

    // Two changes is a listen, not a development: Next shakes. Taking a given
    // hit away counts as a change, and it stops being given.
    await cell(page, 'mid', 11).click();
    await cell(page, 'low', 6).click();
    expect(await given(page)).not.toContain('low-6');
    await next(page).click();
    await expect(page.getByText('Change at least three steps to keep going.')).toBeVisible();
    await cell(page, 'high', 15).click();
    await next(page).click();

    // The finish renders the bar, twice round, to a file for the canvas
    await expect(ask(page)).toHaveText('Your rhythm');
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect(page.locator('[data-rb-take-bytes]')).toHaveAttribute('data-rb-take-bytes', /^\d{5,}$/, { timeout: 10000 });
    await expect(page.locator('[data-rb-take-seconds]')).toHaveAttribute('data-rb-take-seconds', /^[4-6]$/);
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-rhythm-developments'),
    )).toContain('rock:');
  });

  test('a new feel deals a fresh bar; the same feel keeps your changes', async ({ page }) => {
    await open(page);
    await page.locator('[data-dr-feel="ballad"]').click();
    await next(page).click();
    const before = await on(page);
    await cell(page, 'mid', 8).click();
    expect(await on(page)).toBe(before + 1);

    // Back and the same feel again: the change survives
    await page.getByRole('button', { name: 'Previous step' }).click();
    await page.locator('[data-dr-feel="ballad"]').click();
    await next(page).click();
    expect(await on(page)).toBe(before + 1);

    // A different feel: dealt fresh, nothing changed, at its own tempo
    await page.getByRole('button', { name: 'Previous step' }).click();
    await page.locator('[data-dr-feel="funk"]').click();
    await next(page).click();
    expect(await page.locator('[data-rb-cell][aria-pressed="true"]:not([data-rb-given])').count()).toBe(0);
    await expect(page.getByText('100 BPM')).toBeVisible();
  });
});

test.describe('Practice 10 — finishing a verse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-finish-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Nine clicks along the carousel. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 9; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a beginning');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const words = (page: import('@playwright/test').Page) =>
    page.locator('[data-fv-word]').evaluateAll(els => els.map(e => e.getAttribute('data-fv-word') || ''));

  test('choose a beginning, write the lines that follow, and see the verse whole', async ({ page }) => {
    await open(page);

    // Eight beginnings, two lines on each; Next with none chosen shakes
    await expect(page.locator('[data-fv-opening]')).toHaveCount(8);
    await next(page).click();
    await expect(page.getByText('Choose a beginning to keep going.')).toBeVisible();
    await page.locator('[data-fv-opening="1"]').click();
    await next(page).click();

    // The beginning stands above two empty lines numbered on from it
    await expect(ask(page)).toHaveText('Finish the verse');
    await expect(page.locator('[data-fv-given]')).toHaveCount(2);
    await expect(page.locator('[data-fv-given]').first()).toHaveText('The kitchen light was on all night');
    await expect(page.locator('[data-fv-line]')).toHaveCount(2);
    await expect(page.locator('[data-fv-line="0"]')).toBeFocused();

    // Eight words, and a tapped one lands at the end of the line you are on
    expect(await words(page)).toHaveLength(8);
    await page.keyboard.type('and when the');
    await page.locator('[data-fv-word="morning"]').click();
    await expect(page.locator('[data-fv-line="0"]')).toHaveValue('and when the morning');
    await expect(page.locator('[data-fv-word="morning"]')).toHaveAttribute('aria-pressed', 'true');

    // One line is not a finish: Next shakes. Enter moves to the second.
    await next(page).click();
    await expect(page.getByText('Write at least two lines to keep going.')).toBeVisible();
    await page.locator('[data-fv-line="0"]').press('Enter');
    await expect(page.locator('[data-fv-line="1"]')).toBeFocused();
    await page.keyboard.type('came in through the door');
    await next(page).click();

    // The verse whole: the given lines set, yours after them
    await expect(ask(page)).toHaveText('Your verse');
    const verse = await page.locator('[data-fv-verse] p').allInnerTexts();
    expect(verse).toEqual([
      'The kitchen light was on all night',
      'I kept it on in case you might',
      'and when the morning',
      'came in through the door',
    ]);
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-verse-finishes'),
    )).toContain('1:and when the morning');
  });

  test('new words deal the next row; a new beginning empties the lines', async ({ page }) => {
    await open(page);
    await page.locator('[data-fv-opening="2"]').click();
    await next(page).click();

    const first = await words(page);
    await page.locator('[data-fv-new-words]').click();
    const second = await words(page);
    expect(second).not.toEqual(first);
    expect(second.some(w => first.includes(w))).toBe(false);

    // Something written, then the same beginning again: it stays
    await page.keyboard.type('a line');
    await page.getByRole('button', { name: 'Previous step' }).click();
    await page.locator('[data-fv-opening="2"]').click();
    await next(page).click();
    await expect(page.locator('[data-fv-line="0"]')).toHaveValue('a line');

    // A different beginning: the lines answered the old one, so they go
    await page.getByRole('button', { name: 'Previous step' }).click();
    await page.locator('[data-fv-opening="3"]').click();
    await next(page).click();
    await expect(page.locator('[data-fv-line="0"]')).toHaveValue('');
    await expect(page.locator('[data-fv-given]').first()).toHaveText('The train was late, the platform bare');
  });
});

test.describe('Practice 11 — melody over chords', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-chords-melody-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Ten clicks along the carousel. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 10; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a key');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const cell = (page: import('@playwright/test').Page, beat: number, row: number) =>
    page.locator(`[data-mw-cell="${beat}-${row}"]`);
  /** The four bars' chord symbols. */
  const bars = (page: import('@playwright/test').Page) =>
    page.locator('[data-cp-bar]').evaluateAll(els => els.map(e => (e.querySelectorAll('span')[0]?.textContent || '').trim()));
  const placed = (page: import('@playwright/test').Page) =>
    page.locator('[data-mw-cell][aria-pressed="true"]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-mw-cell') || '').sort((x, y) => Number(x.split('-')[0]) - Number(y.split('-')[0])));

  test('choose a key, write over the given chords, hear both, and it is rendered for the canvas', async ({ page }) => {
    await open(page);

    // Next with no key shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a key to keep going.')).toBeVisible();
    await page.locator('[data-mw-key="C"]').click();
    await next(page).click();

    // Four bars of the key's own triads over a four-bar grid, all empty
    await expect(ask(page)).toHaveText('Write over the chords');
    const chords = await bars(page);
    expect(chords).toHaveLength(4);
    expect(chords.every(c => ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'].includes(c))).toBe(true);
    await expect(page.locator('[data-mw-cell]')).toHaveCount(7 * 16);
    expect(await placed(page)).toEqual([]);

    // Two notes is a gesture, not a melody: Next shakes
    await cell(page, 0, 0).click();
    await cell(page, 4, 2).click();
    await next(page).click();
    await expect(page.getByText('Place at least four notes to keep going.')).toBeVisible();
    await cell(page, 8, 4).click();
    await cell(page, 12, 2).click();
    expect(await placed(page)).toEqual(['0-0', '4-2', '8-4', '12-2']);

    // Play lights the first bar's card and the first beat's column together
    const liveBar = () => page.locator('[data-cp-bar]').evaluateAll(els =>
      els.map((e, i) => getComputedStyle(e).backgroundColor === 'rgb(251, 255, 237)' ? i : -1).filter(i => i >= 0));
    await page.locator('[data-mw-play]').click();
    await expect.poll(liveBar).toEqual([0]);
    await expect.poll(liveBar, { timeout: 6000 }).toEqual([1]);
    await page.locator('[data-mw-play]').click();
    await expect.poll(liveBar).toEqual([]);

    // The finish renders chords and melody together to a file for the canvas:
    // four bars at a hundred is nearly ten seconds
    await next(page).click();
    await expect(ask(page)).toHaveText('Your melody');
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect(page.locator('[data-mw-take-bytes]')).toHaveAttribute('data-mw-take-bytes', /^\d{6,}$/, { timeout: 15000 });
    await expect(page.locator('[data-mw-take-seconds]')).toHaveAttribute('data-mw-take-seconds', /^(10|11)$/);
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-melodies-over-chords'),
    )).toContain('C:');
  });

  test('a new progression changes the chords and keeps the line', async ({ page }) => {
    await open(page);
    await page.locator('[data-mw-key="G"]').click();
    await next(page).click();
    await cell(page, 0, 0).click();
    await cell(page, 2, 4).click();

    const before = await bars(page);
    await page.locator('[data-mc-new-progression]').click();
    await expect.poll(() => bars(page)).not.toEqual(before);
    // The melody stays: hearing it over other chords is the point
    expect(await placed(page)).toEqual(['0-0', '2-4']);
  });
});

test.describe('Practice 12 — build a beat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      // The how-to guide opens over the exercise on every visit; these tests
      // are about the exercise, so start past it.
      window.localStorage.setItem('mep-beat-demo-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Eleven clicks along the carousel. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    for (let i = 0; i < 11; i++) await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a kit');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();
  const cell = (page: import('@playwright/test').Page, voice: string, step: number) =>
    page.locator(`[data-rb-cell="${voice}-${step}"]`);
  /** Every square with a hit on it, in row-then-step order. */
  const placed = (page: import('@playwright/test').Page) =>
    page.locator('[data-rb-cell][aria-pressed="true"]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-rb-cell') || '').sort());
  /** The steps under the playhead: the live cream, or the live green of a hit. */
  const liveSteps = (page: import('@playwright/test').Page) =>
    page.locator('[data-rb-cell]').evaluateAll(els => [...new Set(els.filter(e => {
      const c = getComputedStyle(e).backgroundColor;
      return ['rgb(251, 255, 237)', 'rgb(95, 152, 87)'].includes(c);
    }).map(e => (e.getAttribute('data-rb-cell') || '').split('-')[1]))]);

  test('choose a kit and a tempo, build the beat, hear it, and it is rendered for the canvas', async ({ page }) => {
    await open(page);

    // Next with no kit shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(page.getByText('Choose a kit to keep going.')).toBeVisible();
    // Medium is the tempo unless changed; here it is changed
    await expect(page.locator('[data-bb-tempo="medium"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-bb-kit="electronic"]').click();
    await page.locator('[data-bb-tempo="fast"]').click();
    await expect(page.locator('[data-bb-tempo="fast"]')).toHaveAttribute('aria-pressed', 'true');
    await next(page).click();

    // Five drums by name over sixteen steps, all empty
    await expect(ask(page)).toHaveText('Build the beat');
    await expect(page.getByText('Electronic · 120 BPM')).toBeVisible();
    await expect(page.locator('[data-rb-cell]')).toHaveCount(5 * 16);
    for (const name of ['Hat', 'Snare', 'Kick', 'Clap', 'Tom']) {
      await expect(page.locator('[data-rb-grid]').getByText(name, { exact: true })).toBeVisible();
    }
    expect(await placed(page)).toEqual([]);

    // Two hits is a tap, not a beat: Next shakes
    await cell(page, 'low', 0).click();
    await cell(page, 'mid', 4).click();
    await next(page).click();
    await expect(page.getByText('Place at least four hits to keep going.')).toBeVisible();
    await cell(page, 'clap', 12).click();
    await cell(page, 'tom', 15).click();
    expect(await placed(page)).toEqual(['clap-12', 'low-0', 'mid-4', 'tom-15']);

    // Play sweeps the steps; stop clears the sweep
    await page.locator('[data-rb-play]').click();
    await expect.poll(() => liveSteps(page)).not.toEqual([]);
    await page.locator('[data-rb-play]').click();
    await expect.poll(() => liveSteps(page)).toEqual([]);

    // The finish renders the bar twice over to a file for the canvas:
    // two bars at a hundred and twenty is four seconds and a bit
    await next(page).click();
    await expect(ask(page)).toHaveText('Your beat');
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();
    await expect(page.locator('[data-bb-take-bytes]')).toHaveAttribute('data-bb-take-bytes', /^\d{6,}$/, { timeout: 15000 });
    await expect(page.locator('[data-bb-take-seconds]')).toHaveAttribute('data-bb-take-seconds', /^(4|5)$/);
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-beats'),
    )).toContain('electronic:fast:');
  });

  test('random deals a beat with the backbone in place, another deal differs, and clear empties it', async ({ page }) => {
    await open(page);
    await page.locator('[data-bb-kit="acoustic"]').click();
    await next(page).click();

    // A deal is a beat, not noise: kick on one and three, snare on two and four
    await page.locator('[data-bb-random]').click();
    const first = await placed(page);
    expect(first.length).toBeGreaterThanOrEqual(6);
    expect(first).toEqual(expect.arrayContaining(['low-0', 'low-8', 'mid-4', 'mid-12']));

    // The next deal is a different bar with the same backbone
    await page.locator('[data-bb-random]').click();
    const second = await placed(page);
    expect(second).not.toEqual(first);
    expect(second).toEqual(expect.arrayContaining(['low-0', 'low-8', 'mid-4', 'mid-12']));

    // Clear is a blank bar, and Next shakes again
    await page.locator('[data-bb-clear]').click();
    expect(await placed(page)).toEqual([]);
    await next(page).click();
    await expect(page.getByText('Place at least four hits to keep going.')).toBeVisible();
  });
});
