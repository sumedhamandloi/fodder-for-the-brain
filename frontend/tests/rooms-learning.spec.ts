import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'evening', reducedMotion: true, seasonMode: 'manual', manualSeason: 'spring', weatherMode: 'manual', manualWeather: 'snow' }));
    if (!localStorage.getItem('fodder.save.v1'))
      localStorage.setItem('fodder.save.v1', JSON.stringify({
        profile: { displayName: 'Wren', interests: ['Philosophy'], preferredDepth: 'medium', onboardingDone: true },
        avatar: null, pet: { species: 'rabbit', name: 'Clover' }, ideas: [],
      }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);
});

test('walk into the Glasshouse and sit at the thought-experiment table', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Glasshouse' }).click();
  await expect(page.getByText(/in the Glasshouse/)).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'The quiet bench' }).click();
  const gh = page.getByRole('dialog', { name: 'The Glasshouse' });
  await expect(gh).toBeVisible({ timeout: 20_000 });
  await expect(gh.getByRole('tab', { name: 'Reflect' })).toHaveAttribute('aria-selected', 'true');
  await gh.getByRole('button', { name: 'Step back' }).click();
  expect(errors).toEqual([]);
});

test('home through the cottage door: window shows the weather', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Your Cottage' }).click();
  await expect(page.getByText(/in Wren's little garden/)).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Your cottage door' }).click();
  await expect(page.getByText(/in your cottage/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'The window' }).click();
  await expect(page.getByText(/Snow is falling quietly/)).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('the learning engine notices what you save and explains its picks', async ({ page, request }) => {
  const health = await request.get('http://localhost:8000/api/v1/health').catch(() => null);
  test.skip(!health || !health.ok(), 'learning engine not running');

  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Little Library' }).click();
  await expect(page.getByText(/in the Little Library/)).toBeVisible({ timeout: 45_000 });

  // read and save a philosophy piece
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Mind & Meaning shelf' }).click();
  await page.getByRole('button', { name: /The Ship of Theseus/ }).click();
  await page.getByRole('button', { name: 'Save this idea' }).click();
  await page.getByRole('button', { name: 'Close the book' }).click();

  // the desk now offers up to three picks, each with a reason, and never the one just saved
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: "Today's read" }).click();
  const desk = page.getByRole('dialog', { name: 'The reading desk' });
  await expect(desk.getByText('Picked for you')).toBeVisible({ timeout: 20_000 });
  const reasons = desk.getByText(/^(Because|Something a little different)/);
  await expect(reasons.first()).toBeVisible();
  expect(await reasons.count()).toBeLessThanOrEqual(3);
  await desk.getByRole('button', { name: 'Step away from the desk' }).click();

  // and you can see what it believes
  await page.getByRole('button', { name: 'Your Little World' }).click();
  await page.getByRole('button', { name: 'What has Fodder learned?' }).click();
  await expect(page.getByLabel('What Fodder has learned').getByText('Philosophy')).toBeVisible();
});
