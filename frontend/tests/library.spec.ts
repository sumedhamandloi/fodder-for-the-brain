import { test, expect, Page } from '@playwright/test';

const SAVE = {
  profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
  avatar: null,
  pet: { species: 'frog', name: 'Pip' },
  ideas: [],
};

async function enter(page: Page) {
  await page.addInitScript((save) => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true }));
    if (!localStorage.getItem('fodder.save.v1')) localStorage.setItem('fodder.save.v1', JSON.stringify(save));
  }, SAVE);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);
}

async function goToLibrary(page: Page) {
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Little Library' }).click();
  await expect(page.getByText('in the Little Library')).toBeVisible({ timeout: 45_000 });
}

test('walk into the library, read today’s piece, save it and follow the thought', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page);
  await goToLibrary(page);

  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: "Today's read" }).click();
  const desk = page.getByRole('dialog', { name: 'The reading desk' });
  await expect(desk).toBeVisible({ timeout: 20_000 });
  await desk.locator('ul').first().getByRole('button').click();
  const reader = page.locator('article[role="dialog"]');
  await expect(reader).toBeVisible({ timeout: 20_000 });
  await expect(reader.getByText('Sources')).toBeVisible();
  await expect(reader.getByText('Something to sit with')).toBeVisible();

  await reader.getByRole('button', { name: 'Save this idea' }).click();
  await expect(reader.getByRole('button', { name: 'Saved to your ideas' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fodder.save.v1')!).ideas);
  expect(saved.length).toBe(1);

  // follow the thought: exactly three curated directions, never more
  const follow = reader.locator('section[aria-label="Follow the thought"] button');
  await expect(follow).toHaveCount(3);
  const nextTitle = (await follow.first().innerText()).split('\n').pop()!;
  await follow.first().click();
  await expect(page.getByRole('heading', { level: 2, name: nextTitle })).toBeVisible();
  await page.getByRole('button', { name: 'Close the book' }).click();

  // the saved idea waits in the armchair
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Your saved ideas' }).click();
  await expect(page.getByRole('dialog', { name: 'Your saved ideas' }).locator('li')).toHaveCount(1, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Get up from the armchair' }).click();

  // a shelf lists finite reads, filterable by depth
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Mind & Meaning shelf' }).click();
  const shelf = page.getByRole('dialog', { name: 'Mind & Meaning' });
  await expect(shelf).toBeVisible({ timeout: 20_000 });
  await shelf.getByRole('button', { name: 'Deep dives' }).click();
  await expect(shelf.locator('li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Put the books back' }).click();

  // and back out to the garden
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Back to the garden' }).click();
  await expect(page.getByText("in Wren's garden")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
