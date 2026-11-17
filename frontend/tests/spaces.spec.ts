import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'morning', reducedMotion: true, seasonMode: 'manual', manualSeason: 'spring' }));
    if (!localStorage.getItem('fodder.save.v1'))
      localStorage.setItem('fodder.save.v1', JSON.stringify({
        profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
        avatar: null, pet: { species: 'dog', name: 'Biscuit' }, ideas: [],
      }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);
});

test('talk to a neighbour and follow their curiosity into a read', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Juniper, the explorer' }).click();
  const talk = page.getByRole('dialog', { name: 'Talking with Juniper' });
  await expect(talk).toBeVisible({ timeout: 40_000 });
  await talk.getByRole('button', { name: 'Got a curiosity for me?' }).click();
  await expect(talk.getByText(/Octopuses taste things/)).toBeVisible();
  await talk.getByRole('button', { name: 'Read it' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /Octopuses taste with their arms/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close the book' }).click();
  expect(errors).toEqual([]);
});

test('glasshouse thought experiment, a playground puzzle and the curiosity garden', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Glasshouse' }).click();
  await expect(page.getByText(/in the Glasshouse/)).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'The thought-experiment table' }).click();
  const gh = page.getByRole('dialog', { name: 'The Glasshouse' });
  await expect(gh).toBeVisible({ timeout: 30_000 });
  await gh.getByRole('button', { name: 'How others have thought about it' }).click();
  await expect(gh.getByText(/Robert Nozick/)).toBeVisible();
  await gh.getByLabel(/Your thoughts/).fill('I would not plug in, I think.');
  await gh.getByRole('button', { name: 'Keep in my journal' }).click();
  await expect(gh.getByText(/Kept\./)).toBeVisible();
  await gh.getByRole('button', { name: 'Step back' }).click();
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Back to the garden' }).click();
  await expect(page.getByText(/in Wren's garden/)).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Brain Playground' }).click();
  const pg = page.getByRole('dialog', { name: 'Brain Playground' });
  await expect(pg).toBeVisible({ timeout: 45_000 });
  await pg.getByRole('button', { name: '32', exact: true }).click();
  await expect(pg.getByText('Each number doubles.')).toBeVisible();
  await pg.getByRole('tab', { name: 'Little Detective' }).click();
  await pg.getByRole('button', { name: 'Mabel', exact: true }).click();
  await expect(pg.getByText(/Well reasoned/)).toBeVisible();
  await pg.getByRole('button', { name: 'Back to the garden' }).click();

  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Curiosity Garden' }).click();
  const cg = page.getByRole('dialog', { name: 'Curiosity Garden' });
  await expect(cg).toBeVisible({ timeout: 45_000 });
  await expect(cg.locator('ul').last().getByRole('listitem')).toHaveCount(8); // the eight topic beds
  expect(errors).toEqual([]);
});
