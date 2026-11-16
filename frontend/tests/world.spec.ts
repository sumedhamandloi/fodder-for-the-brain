import { test, expect, Page } from '@playwright/test';

declare global {
  interface Window {
    __fodder: { scene: { player: { x: number; y: number } } };
  }
}

const playerPos = (page: Page) => page.evaluate(() => ({ x: window.__fodder.scene.player.x, y: window.__fodder.scene.player.y }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true })),
  );
});

test('world loads without errors and the avatar walks', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__fodder?.scene?.player);
  const a = await playerPos(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  const b = await playerPos(page);
  expect(b.y).toBeLessThan(a.y - 20);
  expect(errors).toEqual([]);
});

test('collision stops the avatar at the forest edge', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__fodder?.scene?.player);
  await page.keyboard.down('a');
  await page.waitForTimeout(9000);
  await page.keyboard.up('a');
  const p = await playerPos(page);
  expect(p.x).toBeGreaterThan(40); // never walks into the canopy / off the map
});

test('Places menu walks to the library and opens its card', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__fodder?.scene?.player);
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Little Library' }).click();
  await expect(page.getByRole('dialog', { name: 'Little Library' })).toBeVisible({ timeout: 45_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('time of day can be set manually and leaving is gentle', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__fodder?.scene?.player);
  await page.getByRole('button', { name: 'Your Little World' }).click();
  await page.getByRole('button', { name: 'Night' }).click();
  await expect(page.getByText('Night in the garden')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Leave quietly' }).click();
  await expect(page.getByRole('dialog', { name: 'See you soon' })).toBeVisible();
});
