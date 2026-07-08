import { test, expect } from '@playwright/test';

test.describe('Create Page (Songwriting Workspace)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signin page to establish local origin context
    await page.goto('/signin');
    // Inject mock user, bypass onboarding video, and pre-populate notes/folders cache
    await page.evaluate(() => {
      window.localStorage.setItem('playwright_mock_user', JSON.stringify({
        uid: 'test-user-id',
        email: 'testuser@vaynote.com',
        displayName: 'Test Artist',
      }));
      window.localStorage.setItem('mep-welcome-video-seen', 'true');
      
      // Seed default notes and folders cache to bypass firestore loader blockers
      window.localStorage.setItem('veinote-create-folders', JSON.stringify([
        { id: 'f-1', name: 'Summer Album' },
        { id: 'f-2', name: 'Melodic Ideas' }
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

  test('should load the songwriting workspace layout and elements', async ({ page }) => {
    await page.goto('/platform/create');
    
    // Check main layout elements (sidebar navigation links) using specific selectors
    await expect(page.locator('a[href="/platform/create"]').first()).toBeVisible();
    await expect(page.locator('a[href="/platform"]').first()).toBeVisible();
    await expect(page.locator('a[href="/platform/practice"]').first()).toBeVisible();
    await expect(page.locator('a[href="/platform/connect"]').first()).toBeVisible();

    // Check workspace title input or notes listing
    await expect(page.locator('text=Ocean Breeze Lyrics')).toBeVisible();
  });
});
