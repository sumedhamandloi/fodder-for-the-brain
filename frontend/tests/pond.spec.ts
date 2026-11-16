import { test, expect } from '@playwright/test';

test('sit on the dock: notice, journal privately, and see saved ideas bloom', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true }));
    if (!localStorage.getItem('fodder.save.v1'))
      localStorage.setItem('fodder.save.v1', JSON.stringify({
        profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
        avatar: null, pet: { species: 'frog', name: 'Pip' }, ideas: ['blue-sky', 'serendipity'],
      }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);

  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'The Pond' }).click();
  const pond = page.getByRole('dialog', { name: 'The Pond' });
  await expect(pond).toBeVisible({ timeout: 45_000 });

  // notice
  await pond.getByLabel(/What did you notice/).fill('Three dragonflies over the lilies.');
  await pond.getByRole('button', { name: 'Keep this observation' }).click();
  await expect(pond.getByText('Tucked into your journal.')).toBeVisible();

  // journal
  await pond.getByRole('tab', { name: 'Journal' }).click();
  await pond.getByLabel('Write whatever is on your mind').fill('A slow afternoon. Good.');
  await pond.getByRole('button', { name: 'Keep this entry' }).click();
  await expect(pond.getByText('A slow afternoon. Good.')).toBeVisible();
  await expect(pond.getByText('Three dragonflies over the lilies.')).toBeVisible();
  await expect(pond.getByText('never sent to any AI')).toBeVisible();

  // mind garden: one flower per saved idea, and a flower opens its read
  await pond.getByRole('tab', { name: 'My Mind Garden' }).click();
  const flowers = pond.getByRole('list', { name: 'Your Mind Garden' }).getByRole('listitem');
  await expect(flowers).toHaveCount(2);
  await flowers.first().click();
  await expect(page.locator('article[role="dialog"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close the book' }).click();
  expect(errors).toEqual([]);
});
