// Visual review of the title, avatar creator and a custom avatar in the world.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const out = new URL('../../tools/art/out/shots/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.addInitScript(() =>
  localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: 'afternoon', reducedMotion: true })),
);
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: 'Wander in as a guest' }).waitFor();
await page.waitForTimeout(1200);
await page.screenshot({ path: out + 'm2_title.png' });
await page.getByRole('button', { name: 'Wander in as a guest' }).click();
await page.getByLabel('Name').fill('Wren');
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('img', { name: 'Your avatar' }).waitFor();
await page.waitForTimeout(600);
await page.screenshot({ path: out + 'm3_creator.png' });

// a grid of looks, rendered by the real compositor
const looks = await page.evaluate(async () => {
  const { composeAvatar } = await import('/src/features/avatar/compose.ts');
  const base = { skin: 'peach', hairStyle: 'bob', hairColor: 'chestnut', eyes: 'round', outfit: 'blouse', outfitColor: 'sage', shoes: 'brown', hat: 'straw', accessory: 'none', backpack: 'none' };
  const variants = [
    {},
    { skin: 'umber', hairStyle: 'curly', hairColor: 'black', outfit: 'overalls', outfitColor: 'sky', hat: 'none', accessory: 'glasses', backpack: 'backpack' },
    { skin: 'porcelain', hairStyle: 'long', hairColor: 'honey', outfit: 'dress', outfitColor: 'rose', hat: 'flowers', eyes: 'lashes' },
    { skin: 'tan', hairStyle: 'short', hairColor: 'espresso', outfit: 'tee', outfitColor: 'marigold', hat: 'bucket', shoes: 'white', backpack: 'satchel' },
    { skin: 'ebony', hairStyle: 'buns', hairColor: 'rose', outfit: 'sweater', outfitColor: 'lavender', hat: 'none', accessory: 'bow', eyes: 'happy' },
    { skin: 'honey', hairStyle: 'ponytail', hairColor: 'auburn', outfit: 'blouse', outfitColor: 'terracotta', hat: 'beanie', accessory: 'scarf', eyes: 'dot' },
  ];
  const big = document.createElement('canvas');
  big.width = 144 * 2; big.height = 96 * 3;
  const ctx = big.getContext('2d');
  ctx.fillStyle = '#8DAA76'; ctx.fillRect(0, 0, big.width, big.height);
  for (let i = 0; i < variants.length; i++) {
    const c = await composeAvatar({ ...base, ...variants[i] });
    ctx.drawImage(c, (i % 2) * 144, Math.floor(i / 2) * 96);
  }
  return big.toDataURL();
});
const { writeFileSync } = await import('fs');
writeFileSync(out + 'm3_looks.png', Buffer.from(looks.split(',')[1], 'base64'));
await browser.close();
console.log('done');
