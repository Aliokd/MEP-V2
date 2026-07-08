import { test, expect } from '@playwright/test';

test.describe('Learn Page (Curriculum & Lectures)', () => {
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

  test('should render the chapters and curriculum listing', async ({ page }) => {
    await page.goto('/platform');
    
    // Check that we see the movements/chapters titles (e.g. "Foundation" and "Rhythmic architecture")
    await expect(page.locator('text=Foundation')).toBeVisible();
    await expect(page.locator('text=Rhythmic architecture')).toBeVisible();
  });
});
