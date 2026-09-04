import { test, expect } from '@playwright/test';

test.describe('Connect Page (Community Feed)', () => {
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
      // Answer the cookie dialog before it can sit over the page: its modal
      // backdrop is z-[100] and swallows every click, so a covered control
      // reports as "visible, enabled and stable" and then intercepted.
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
    });
  });

  test('should load the community feed and allow interaction', async ({ page }) => {
    await page.goto('/platform/connect');
    
    // Check that connect link in the sidebar is visible
    await expect(page.locator('a[href="/platform/connect"]').first()).toBeVisible();

    // Connect is five views behind one tab row. The old "Connect with
    // Songwriters" heading is gone with it — the tabs carry the naming now.
    const tabs = page.getByRole('tablist');
    await expect(tabs).toBeVisible();
    for (const name of ['All', 'People', 'Songs', 'Rooms', 'Business']) {
      await expect(tabs.getByRole('tab', { name, exact: false })).toBeVisible();
    }

    // All opens the page: people and songs together, no room pitch in the way.
    await expect(page.getByRole('tab', { name: 'All', exact: false })).toHaveAttribute('aria-selected', 'true');

    // Verify presence of the "Recent songs" section and its create button, which
    // replaced the old "Create your song" banner at the top of the page.
    await expect(page.locator('text=Recent songs')).toBeVisible();
    await expect(page.locator('a[href="/platform/create"]', { hasText: 'Create a song' })).toBeVisible();
  });

  test('the room pitch lives on the Rooms tab, not the front page', async ({ page }) => {
    await page.goto('/platform/connect');

    // The Pro-gated banner used to sit above the feed for everyone. It is the
    // Rooms tab's own content now, so a visitor who never opens Rooms is never
    // pitched — which is the point of moving it.
    await expect(page.getByText('Rooms with professional songwriters')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Rooms', exact: false }).click();
    await expect(page.getByRole('tab', { name: 'Rooms', exact: false })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Rooms with professional songwriters').first()).toBeVisible();
  });
});
