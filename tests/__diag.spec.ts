import { test } from '@playwright/test';

test('skeleton colours', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto('/signin');
    await page.evaluate(() => {
        window.localStorage.setItem('playwright_mock_user', JSON.stringify({
            uid: 'test-user-id', email: 'testuser@vaynote.com', displayName: 'Test Artist',
        }));
        window.localStorage.setItem('mep-welcome-video-seen', 'true');
        window.localStorage.setItem('mep-structure-demo-seen', 'true');
    });

    // Hold the audio in a loading state so the skeleton stays up
    await page.route('**/*.mp3', async () => { /* never resolves */ });

    await page.goto('/platform/practice');
    await page.getByRole('button', { name: 'Start' }).first().click();
    const skel = page.locator('[data-practice-skeleton]');
    await skel.waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);

    const colours = await page.evaluate(() => {
        const s = document.querySelector('[data-practice-skeleton]')!;
        const cards = [...s.querySelectorAll('div.rounded-\\[20px\\]')];
        return {
            caption: s.querySelector('p')?.textContent,
            cardBgs: [...new Set(cards.map(c => getComputedStyle(c).backgroundColor))],
            anyPureWhite: [...s.querySelectorAll('*')]
                .filter(e => getComputedStyle(e).backgroundColor === 'rgb(255, 255, 255)').length,
        };
    });
    console.log(JSON.stringify(colours));

    await page.mouse.move(2, 2);
    await page.screenshot({ path: 'test-results/skeleton.png' });
});
