import { test, expect } from '@playwright/test';

test('a cat companion, a ripe carrot bed, and a snowy winter storm', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: false, seasonMode: 'manual', manualSeason: 'spring' }));
    if (!localStorage.getItem('fodder.save.v1'))
      localStorage.setItem('fodder.save.v1', JSON.stringify({
        profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
        avatar: null, pet: { species: 'cat', name: 'Miso' }, ideas: [],
      }));
    if (!localStorage.getItem('fodder.farm.v1')) {
      const twoHoursAgo = Date.now() - 2 * 3600_000;
      localStorage.setItem('fodder.farm.v1', JSON.stringify({
        plots: [{ crop: 'carrot', plantedAt: twoHoursAgo, wateredAt: null }, null, null, null, null, null], basket: {},
      }));
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);

  // pets: the cat is our companion; P opens its menu, and moments of affection need nothing in return
  await page.waitForFunction(() => (window as any).__fodder.scene.pet.species === 'pet_cat');
  await page.keyboard.press('p');
  const menu = page.getByRole('dialog', { name: 'Miso' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Play fetch' }).click();
  await expect(menu).toHaveCount(0);

  // farming: a carrot planted two hours ago is ready, never wilted
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Your Cottage' }).click();
  await expect(page.getByText(/in Wren's little garden/)).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Garden beds' }).click();
  const beds = page.getByRole('dialog', { name: 'Garden beds' });
  await expect(beds).toBeVisible({ timeout: 30_000 });
  await expect(beds.getByText('Ready to harvest')).toBeVisible();
  await beds.getByRole('button', { name: 'Harvest' }).click();
  await expect(beds.getByText('4 carrots')).toBeVisible();
  // plant tulips in bed 2 and water them
  await beds.getByRole('button', { name: 'Plant something' }).first().click();
  await beds.getByRole('button', { name: 'Tulips' }).click();
  await expect(beds.getByText('Freshly planted').first()).toBeVisible();
  await beds.getByRole('button', { name: 'Water', exact: true }).first().click();
  await expect(beds.getByRole('button', { name: 'Watered' }).first()).toBeDisabled();
  await beds.getByRole('button', { name: 'Back to the garden' }).click();

  // seasons + weather: winter repaints the garden in place; a gentle storm rolls in
  await page.getByRole('button', { name: 'Your Little World' }).click();
  await page.getByRole('button', { name: 'Winter' }).click();
  await page.getByRole('button', { name: 'Gentle storm' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(/Winter afternoon in Wren's little garden/)).toBeVisible();
  await page.waitForFunction(() => (window as any).__fodderHome?.scene?.season === 'winter', null, { timeout: 15_000 });
  expect(errors).toEqual([]);
});
