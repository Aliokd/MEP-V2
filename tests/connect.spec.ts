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

  test('Rooms opens for anyone, Business sends a non-member to the upgrade', async ({ page }) => {
    await page.goto('/platform/connect');
    // The feed is fetched before the tabs render, so wait for the row itself
    // rather than for a tab inside a row that is not there yet.
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 20_000 });

    // Without a plan both tabs wear the tier pill. It reads "Pro", never
    // "Max": the upper tier was renamed in the UI and only the locale key
    // still carries the old name.
    for (const name of ['Rooms', 'Business']) {
      const tab = page.getByRole('tab', { name, exact: false });
      await expect(tab).toBeVisible();
      await expect(tab).toBeEnabled();
      await expect(tab).toContainText('Pro');
      await expect(tab).not.toContainText('Max');
    }

    // Rooms is a view anyone may open: a non-member lands on it and is shown
    // the locked section, which is the pitch.
    await page.getByRole('tab', { name: 'Rooms', exact: false }).click();
    await expect(page.getByRole('tab', { name: 'Rooms', exact: false })).toHaveAttribute('aria-selected', 'true');

    // Business is the members' own. A press from anyone else opens the upgrade
    // rather than moving them to an empty tab.
    await page.getByRole('tab', { name: 'Business', exact: false }).click();
    await expect(page.getByRole('tab', { name: 'Business', exact: false })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: 'Rooms', exact: false })).toHaveAttribute('aria-selected', 'true');
  });
});
