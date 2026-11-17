import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true, seasonMode: 'manual', manualSeason: 'spring', weatherMode: 'manual', manualWeather: 'clear' }));
    if (!localStorage.getItem('fodder.save.v1'))
      localStorage.setItem('fodder.save.v1', JSON.stringify({
        profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
        avatar: null, pet: { species: 'duck', name: 'Puddle' }, ideas: ['blue-sky'],
      }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);
});

test('private mode hides the neighbours; social brings them back', async ({ page }) => {
  await page.getByRole('button', { name: 'Social' }).click();
  await expect(page.getByRole('button', { name: 'Private' })).toBeVisible();
  await page.waitForFunction(() => (window as any).__fodder.scene.npcs.every((n: any) => !n.visible));
  await page.getByRole('button', { name: 'Places' }).click();
  await expect(page.getByText('Neighbours')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Private' }).click();
  await page.waitForFunction(() => (window as any).__fodder.scene.npcs.every((n: any) => n.visible));
});

test('the map travels anywhere; My Spaces shows garden and cottage; peek through the window', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const map = page.getByRole('dialog', { name: 'Map' });
  await expect(map.getByRole('button', { name: 'Little Library' })).toBeVisible({ timeout: 10_000 });
  await map.getByRole('button', { name: 'Little Library' }).click();
  await expect(page.getByText(/in the Little Library/)).toBeVisible({ timeout: 20_000 });

  // from inside the library, straight to my garden
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('dialog', { name: 'Map' }).getByRole('button', { name: 'My Garden' }).click();
  await expect(page.getByText(/in Wren's little garden/)).toBeVisible({ timeout: 20_000 });

  // peek into the cottage from outside
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Peek through the window' }).click();
  const peek = page.getByRole('dialog', { name: 'Through the window' });
  await expect(peek.getByRole('img', { name: 'Inside your cottage' })).toBeVisible({ timeout: 20_000 });
  await peek.getByRole('button', { name: 'Stay in the garden' }).click();

  // the cottage pin on the map also leads home
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('dialog', { name: 'Map' }).getByRole('button', { name: 'Little Library' }).click();
  await expect(page.getByText(/in the Little Library/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('dialog', { name: 'Map' }).getByRole('button', { name: 'Your Cottage' }).click();
  await expect(page.getByText(/in Wren's little garden/)).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
