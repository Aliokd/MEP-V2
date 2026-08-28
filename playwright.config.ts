import { defineConfig, devices } from '@playwright/test';

/**
 * Which port the suite runs against. Overridable because this machine routinely
 * has several `next dev` instances up at once (parallel working sessions), and a
 * foreign server squatting on 3000 doesn't serve /platform — reuseExistingServer
 * then waits on a health check that can never pass and the whole suite times out
 * without running a single test. `PW_PORT=3005 npx playwright test` sidesteps
 * whatever is running.
 */
const PORT = process.env.PW_PORT || '3000';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI.
   *
   * Locally this is capped rather than left to default to one worker per core.
   * Everything here runs against a single `next dev`, which compiles routes on
   * demand and serves the practice audio — several megabytes per song. Eight
   * workers pulling that at once starve each other: the page never finishes
   * settling, and tests fail on 30-90s timeouts that look like real breakage but
   * move around between runs. Measured on this machine, 8 workers failed 7 of 9
   * practice tests while 3 passed all 9, repeatedly. A suite that fails at its
   * default invocation is one people stop trusting, so the ceiling lives here
   * rather than in whatever flag someone remembers to type. */
  workers: process.env.CI ? 1 : 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${PORT}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Practice 3 records. Without a fake device getUserMedia has nothing to
         * open and the permission prompt has nobody to answer it, so the
         * recorder's own error path is all the suite could ever reach. */
        launchOptions: {
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/platform`,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
