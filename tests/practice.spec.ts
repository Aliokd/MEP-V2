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
      window.localStorage.setItem('mep-structure-demo-seen', 'true');
      window.localStorage.setItem('mep-verse-demo-seen', 'true');
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

    // A single card, carrying level, title and the written goal
    await expect(page.getByRole('button', { name: 'Why Master song structure?' })).toHaveCount(1);
    await expect(page.getByText('Rebuild real songs section by section', { exact: false })).toBeVisible();
    await expect(page.getByText('Beginner', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // Next lands on the following practice
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Turn one theme into five singable lines', { exact: false })).toBeVisible();

    // Three is built too, and starts
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Take a short melody apart', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(1);

    // And on one that isn't built yet, the card can't be started
    await page.locator('button[aria-label="Next Practice"]').click();
    await expect(page.getByText('Break the standard form on purpose', { exact: false })).toBeVisible();
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
    // One fewer each time a practice ships: three of the fifteen are built.
    await expect(menu.getByText(/^Coming /)).toHaveCount(12);
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
    await page.evaluate(() => window.localStorage.removeItem('mep-structure-demo-seen'));
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
    // Undo the beforeEach pre-dismissal: this test IS the first run
    await page.evaluate(() => window.localStorage.removeItem('mep-structure-demo-seen'));
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

    // "Got it" dismisses it and it stays dismissed
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('[data-song-timeline]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-structure-demo]')).toHaveCount(0);

    // ...and the info icon brings it back on demand
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

    // "Got it" dismisses it and it stays dismissed
    await demo.getByRole('button', { name: 'Got it' }).click();
    await expect(demo).toHaveCount(0);
    await page.reload();
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a theme');
    await expect(page.locator('[data-verse-demo]')).toHaveCount(0);
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

test.describe('Practice 3 — melody variations', () => {
  test.use({ permissions: ['microphone'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  /** Two clicks along the carousel: structure, verses, melodies. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/platform/practice');
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.locator('button[aria-label="Next Practice"]').click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.locator('main .max-w-6xl p').first()).toHaveText('Choose a melody');
  }

  const ask = (page: import('@playwright/test').Page) =>
    page.locator('main .max-w-6xl p').first();
  const next = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Next', exact: true }).last();

  test('choose, listen, record, compare', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /Little runner/ }).click();
    await next(page).click();

    // Listening: the clip really advances, rather than merely claiming to
    await expect(ask(page)).toHaveText('Listen, then read your task');
    const bar = () => page.evaluate(() => {
      const el = document.querySelector('main .verse-card div[style*="width"]') as HTMLElement;
      return parseFloat(el.style.width) || 0;
    });
    expect(await bar()).toBe(0);
    await page.getByRole('button', { name: 'Little runner', exact: true }).click();
    await page.waitForTimeout(1200);
    expect(await bar()).toBeGreaterThan(2);

    // Next with no take shakes and says so, as everywhere else in Practice
    await next(page).click();
    await expect(ask(page)).toHaveText('Record your variation');
    await next(page).click();
    await expect(page.getByText('Record your variation to keep going.')).toBeVisible();
    await expect(ask(page)).toHaveText('Record your variation');

    // A take, then the comparison
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    // Label plus play button — the clip is there once both are.
    await expect(page.getByRole('button', { name: 'Your take', exact: true })).toBeVisible();
    await next(page).click();
    await expect(ask(page)).toHaveText('Yours against the original');
    await expect(page.getByRole('button', { name: 'The original', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue in Canvas' })).toBeVisible();

    // Finishing is recorded against the melody, under its own key
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem('mep-completed-melody-variations'),
    )).toContain('little-runner');
  });

  test('the task can be re-dealt, and never repeats itself', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /Morning line/ }).click();
    await next(page).click();
    const task = () => page.locator('main .verse-card').last().innerText();
    for (let i = 0; i < 6; i++) {
      const before = await task();
      await page.getByRole('button', { name: 'Give me another task' }).click();
      await expect.poll(task).not.toBe(before);
    }
  });

  test('only one clip sounds at a time', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /Open question/ }).click();
    await next(page).click();
    await next(page).click();
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await next(page).click();
    await expect(ask(page)).toHaveText('Yours against the original');

    const playingCount = () => page.getByRole('button', { name: /^(The original|Your take)$/ })
      .evaluateAll(els => els.filter(e => e.querySelector('.lucide-pause')).length);

    await page.getByRole('button', { name: 'The original', exact: true }).click();
    await expect.poll(playingCount).toBe(1);
    await page.getByRole('button', { name: 'Your take', exact: true }).click();
    await expect.poll(playingCount).toBe(1);
  });
});
