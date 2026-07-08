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
    await expect(page.locator('text=Master song structure')).toBeVisible();

    // Verify presence of prev and next buttons
    const prevBtn = page.locator('button[aria-label="Previous Practice"]');
    const nextBtn = page.locator('button[aria-label="Next Practice"]');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });
});
