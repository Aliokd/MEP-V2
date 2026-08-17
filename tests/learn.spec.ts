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

  test('should render the Learn landing sections', async ({ page }) => {
    await page.goto('/platform');

    // /platform renders LearnLanding (app/platform/page.tsx), which is three
    // entry cards rather than the flat chapter list this used to assert. It
    // looked for "Foundation" and "Rhythmic architecture" — curriculum chapter
    // names that no longer appear anywhere, so it had been failing for a while
    // regardless of the change under test.
    await expect(page.getByText('Master fundamentals').first()).toBeVisible();
    await expect(page.getByText('Deep dive').first()).toBeVisible();
    await expect(page.getByText('Bank of tips').first()).toBeVisible();
  });
});
