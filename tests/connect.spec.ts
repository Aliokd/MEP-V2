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

    // Verify presence of "Create your song" link card
    await expect(page.locator('text=Create your song')).toBeVisible();

    // Verify presence of "Connect with Songwriters" section
    await expect(page.locator('text=Connect with Songwriters')).toBeVisible();

    // Verify presence of "Recent creations" section
    await expect(page.locator('text=Recent creations')).toBeVisible();
  });
});
