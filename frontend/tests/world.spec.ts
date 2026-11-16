import { test, expect, Page } from '@playwright/test';

declare global {
  interface Window {
    __fodder: { scene: { player: { x: number; y: number; texture: { key: string } } } };
  }
}

const playerPos = (page: Page) => page.evaluate(() => ({ x: window.__fodder.scene.player.x, y: window.__fodder.scene.player.y }));

const RETURNING_GUEST = {
  profile: { displayName: 'Wren', interests: ['Nature'], preferredDepth: 'medium', onboardingDone: true },
  avatar: {
    skin: 'umber', hairStyle: 'curly', hairColor: 'black', eyes: 'happy', outfit: 'overalls',
    outfitColor: 'sky', shoes: 'white', hat: 'none', accessory: 'glasses', backpack: 'backpack',
  },
  pet: { species: 'frog', name: 'Pip' },
};

async function enterAsReturningGuest(page: Page) {
  await page.addInitScript((save) => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true }));
    localStorage.setItem('fodder.save.v1', JSON.stringify(save));
  }, RETURNING_GUEST);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the garden' }).click();
  await page.waitForFunction(() => window.__fodder?.scene?.player);
}

test('a new guest is welcomed, makes an avatar, adopts a frog and enters the world', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'morning', reducedMotion: true })),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fodder for the Brain' })).toBeVisible();
  await page.getByRole('button', { name: 'Wander in as a guest' }).click();

  await page.getByLabel('Name').fill('Wren');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('img', { name: 'Your avatar' })).toBeVisible();
  await page.getByRole('radio', { name: 'Umber' }).click();
  await page.getByRole('button', { name: 'Next Hairstyle' }).click();
  await page.getByRole('button', { name: 'Next Hat' }).click();
  await page.getByRole('button', { name: 'This is me' }).click();

  await expect(page.getByRole('radio', { name: /Cat/ })).toBeDisabled();
  await page.getByLabel('Their name').fill('Pip');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Nature' }).click();
  await page.getByRole('button', { name: 'Into the garden' }).click();
  await expect(page.getByText("Morning in Wren's garden")).toBeVisible();

  // the composed avatar replaced the default sprite
  await page.waitForFunction(() => window.__fodder?.scene?.player?.texture?.key?.startsWith('avatar-'));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fodder.save.v1')!));
  expect(saved.profile.displayName).toBe('Wren');
  expect(saved.avatar.skin).toBe('umber');
  expect(saved.pet).toEqual({ species: 'frog', name: 'Pip' });
  expect(errors).toEqual([]);
});

test('world loads and the avatar walks', async ({ page }) => {
  await enterAsReturningGuest(page);
  const a = await playerPos(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  const b = await playerPos(page);
  expect(b.y).toBeLessThan(a.y - 20);
});

test('collision stops the avatar at the forest edge', async ({ page }) => {
  await enterAsReturningGuest(page);
  await page.keyboard.down('a');
  await page.waitForTimeout(9000);
  await page.keyboard.up('a');
  const p = await playerPos(page);
  expect(p.x).toBeGreaterThan(40);
});

test('Places menu walks to the glasshouse and opens its card', async ({ page }) => {
  await enterAsReturningGuest(page);
  await page.getByRole('button', { name: 'Places' }).click();
  await page.getByRole('button', { name: 'Glasshouse' }).click();
  await expect(page.getByRole('dialog', { name: 'Glasshouse' })).toBeVisible({ timeout: 45_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('avatar can be edited later and the change is saved', async ({ page }) => {
  await enterAsReturningGuest(page);
  await page.getByRole('button', { name: 'Your Little World' }).click();
  await page.getByRole('button', { name: 'Change how you look' }).click();
  await page.getByRole('radio', { name: 'Rose' }).first().click(); // hair colour
  await page.getByRole('button', { name: 'Keep this look' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fodder.save.v1')!));
  expect(saved.avatar.hairColor).toBe('rose');
});

test('time of day can be set manually and leaving is gentle', async ({ page }) => {
  await enterAsReturningGuest(page);
  await page.getByRole('button', { name: 'Your Little World' }).click();
  await page.getByRole('button', { name: 'Night' }).click();
  await expect(page.getByText("Night in Wren's garden")).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Leave quietly' }).click();
  await expect(page.getByRole('dialog', { name: 'See you soon' })).toBeVisible();
});


