import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  timeout: 180_000, // headless Chrome renders WebGL in software here, so give long walkthroughs room to breathe
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1440, height: 810 } },
  webServer: { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
});
