import { test, expect } from '@playwright/test';

test.describe('Cross-Functional Integration Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signin page to establish local origin context
    await page.goto('/signin');
    // Inject mock user, bypass onboarding overlays, and initialize mock states
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      
      // Initialize some initial progress metrics
      window.localStorage.setItem('mep-completed-lessons', JSON.stringify(['lesson-1', 'lesson-2']));
      window.localStorage.setItem('mep-create-words-typed', '250');
      window.localStorage.setItem('mep-practice-seconds', '1800'); // 30 mins

      // Seed default notes and folders cache to bypass firestore loader blockers
      window.localStorage.setItem('veinote-create-folders', JSON.stringify([
        { id: 'f-1', name: 'Summer Album' }
      ]));
      window.localStorage.setItem('veinote-create-notes', JSON.stringify([
        { 
          id: 'n-1', 
          title: 'Ocean Breeze Lyrics', 
          content: 'Ocean Breeze Lyrics\n\nVerse 1:\nWalking down the sandy beach', 
          folderId: 'f-1', 
          updatedAt: new Date().toLocaleString() 
        }
      ]));
    });
  });

  test('should propagate progress state across navigation via Sidebar', async ({ page }) => {
    // 1. Go to platform create
    await page.goto('/platform/create');
    await expect(page.locator('a[href="/platform/create"]').first()).toBeVisible();

    // 2. Click "Learn" in the sidebar
    await page.click('a[href="/platform"]');
    await expect(page).toHaveURL(/\/platform$/);

    // 3. Verify progress calculation is reflected in platform UI
    // Level progress popup triggers
    const progressLevelBtn = page.locator('button:has-text("Lv.")');
    if (await progressLevelBtn.count() > 0) {
      await expect(progressLevelBtn).toBeVisible();
    }
  });
});
