import { chromium } from '@playwright/test';
const out = new URL('../../tools/art/out/shots/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.addInitScript(() => {
  localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'evening', reducedMotion: false }));
  localStorage.setItem('fodder.save.v1', JSON.stringify({
    profile: { displayName: 'Wren', interests: [], preferredDepth: 'medium', onboardingDone: true },
    avatar: { skin: 'tan', hairStyle: 'sidepart', hairColor: 'espresso', eyes: 'round', outfit: 'hoodie', outfitColor: 'forest', shoes: 'white', hat: 'none', accessory: 'glasses', backpack: 'satchel' },
    pet: { species: 'frog', name: 'Pip' }, ideas: ['blue-sky'],
  }));
});
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: 'Enter the garden' }).click();
await page.waitForFunction(() => window.__fodder?.scene?.player);
await page.evaluate(() => window.__fodder.scene.enterInterior('library'));
await page.waitForTimeout(1500);
await page.evaluate(() => window.__fodderLibrary.scene.player.setPosition(150, 200));
await page.waitForTimeout(1500);
await page.screenshot({ path: out + 'm4_library.png' });
await page.evaluate(() => (window.__fodderStore ?? null));
await page.getByRole('button', { name: 'Places' }).click();
await page.getByRole('button', { name: 'Mind & Meaning shelf' }).click();
await page.waitForTimeout(6000);
await page.screenshot({ path: out + 'm4_shelf.png' });
await page.locator('ul li button').nth(1).click();
await page.waitForTimeout(800);
await page.screenshot({ path: out + 'm4_reader.png' });
await browser.close();
console.log('done');
