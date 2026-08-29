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
      // Answer the cookie dialog before it can sit over the page: its modal
      // backdrop is z-[100] and swallows every click in the suite.
      window.localStorage.setItem('veinote-cookie-consent', JSON.stringify({
        v: 3, analytics: false, replay: false, at: new Date().toISOString(),
      }));
      
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
          // The account binder adopts a legacy unscoped note only when it can PROVE
          // the note belongs to the signing-in uid — that ownership filter is the
          // fix for one account inheriting another's projects on a shared browser.
          // An ownerless seed is exactly what it exists to drop.
          ownerId: 'test-user-id',
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

    // The workspace is one shelf of folders and projects, and a FILED project
    // shows only inside its folder — at the root it would otherwise appear
    // twice. So the folder card is what the root asserts, and opening it is
    // what surfaces the note. This also exercises folder navigation itself.
    const folderCard = page.locator('text=Summer Album').first();
    await expect(folderCard).toBeVisible();
    await folderCard.click();
    await expect(page.locator('text=Ocean Breeze Lyrics')).toBeVisible();
  });
});
