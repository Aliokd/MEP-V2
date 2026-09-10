import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: './tests', fullyParallel: false, workers: 1, reporter: 'list',
    use: { baseURL: 'http://localhost:3000', trace: 'off', screenshot: 'off' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } } }],
});
