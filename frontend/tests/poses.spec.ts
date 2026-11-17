import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true, seasonMode: 'manual', manualSeason: 'spring', weatherMode: 'manual', manualWeather: 'clear' }));
    if (!localStorage.getItem('fodder.save.v1'))
      localStorage.setItem('fodder.save.v1', JSON.stringify({
        profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
        avatar: null, pet: { species: 'frog', name: 'Pip' }, ideas: [],
      }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => (window as any).__fodder?.scene?.player);
});

const pose = (page: any) => page.evaluate(() => (window as any).__fodder.scene.player.pose?.kind ?? null);

test('sit on a bench, then stand up by walking; talk from a polite distance', async ({ page }) => {
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Juniper, the explorer' }).click();
  await expect(page.getByRole('dialog', { name: 'Talking with Juniper' })).toBeVisible({ timeout: 40_000 });
  const gap = await page.evaluate(() => {
    const s = (window as any).__fodder.scene;
    const j = s.npcs.find((n: any) => n.npcId === 'juniper');
    return Math.abs(s.player.x - j.x);
  });
  expect(gap).toBeGreaterThanOrEqual(14); // standing beside them, not on top of them
  await page.getByRole('button', { name: 'Goodbye' }).click();

  // the dock: sitting happens as the pond opens
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'The Pond', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'The Pond' })).toBeVisible({ timeout: 45_000 });
  expect(await pose(page)).toBe('sit');
  await page.getByRole('button', { name: 'Stand up and stretch' }).click();
  await page.keyboard.down('a');
  await page.waitForTimeout(400);
  await page.keyboard.up('a');
  expect(await pose(page)).toBe(null);
});
