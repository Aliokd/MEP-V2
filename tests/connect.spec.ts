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
    });
  });

  test('should load the community feed and allow interaction', async ({ page }) => {
    await page.goto('/platform/connect');
    
    // Check that connect link in the sidebar is visible
    await expect(page.locator('a[href="/platform/connect"]').first()).toBeVisible();

    // Verify presence of "Connect with Songwriters" section
    await expect(page.locator('text=Connect with Songwriters')).toBeVisible();

    // The Max-gated Writers' Room banner sits above it, full width at every
    // breakpoint — it is the pitch, so nothing is ordered ahead of it.
    const room = page.getByText('Songwriter Room');
    await expect(room).toBeVisible();
    const roomBox = (await room.locator('xpath=ancestor::button[1]').boundingBox())!;
    const listBox = (await page.locator('text=Connect with Songwriters').boundingBox())!;
    expect(roomBox.y).toBeLessThan(listBox.y);

    // Verify presence of the "Recent songs" section and its create button, which
    // replaced the old "Create your song" banner at the top of the page.
    await expect(page.locator('text=Recent songs')).toBeVisible();
    await expect(page.locator('a[href="/platform/create"]', { hasText: 'Create a song' })).toBeVisible();
  });
});
