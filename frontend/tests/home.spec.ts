import { test, expect } from '@playwright/test';

test('through the cottage into my little garden: decorate, pick up, and visit the pet corner', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true }));
    if (!localStorage.getItem('fodder.save.v1'))
      localStorage.setItem('fodder.save.v1', JSON.stringify({
        profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
        avatar: null, pet: { species: 'frog', name: 'Pip' }, ideas: [],
      }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);

  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Your Cottage' }).click();
  await expect(page.getByText("in Wren's little garden")).toBeVisible({ timeout: 45_000 });

  // decorate: place a bench with the keyboard, then pick it back up
  await page.getByRole('button', { name: 'Decorate' }).click();
  const dock = page.getByRole('region', { name: 'Decorate your garden' });
  await dock.getByRole('button', { name: /Bench/ }).click();
  await expect(dock.getByText('Placing: Bench')).toBeVisible();
  await page.locator('canvas').click({ position: { x: 5, y: 5 } }).catch(() => undefined); // focus the game (click outside the lawn: no-op)
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fodder.garden.v1') ?? '[]').length)).toBe(1);
  await expect(dock.getByRole('button', { name: /Bench/ })).toContainText('×1');
  await page.keyboard.press('Enter'); // same tile: picks it up again
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fodder.garden.v1') ?? '[]').length)).toBe(0);
  await dock.getByRole('button', { name: 'Done' }).click();
  await expect(dock).toHaveCount(0);

  // the pet corner
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: "Pet's corner" }).click();
  await expect(page.getByText('Pip hops into their bed')).toBeVisible({ timeout: 30_000 });

  // back to the main garden
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Back to the main garden' }).click();
  await expect(page.getByText("in Wren's garden")).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});
