// Visual review helper: node tests/capture.mjs [phase ...]
// Captures the world at 1440x810 (3x integer scale) for each requested phase.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const phases = process.argv.slice(2).length ? process.argv.slice(2) : ['afternoon', 'night'];
const out = new URL('../../tools/art/out/shots/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
for (const phase of phases) {
  await page.addInitScript((p) => {
    localStorage.setItem('fodder.prefs', JSON.stringify({ timeMode: 'manual', manualPhase: p, reducedMotion: false }));
  }, phase);
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__fodder?.scene, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}${phase}.png` });
  // walk north a little to see the cottage area
  await page.keyboard.down('w');
  await page.waitForTimeout(2600);
  await page.keyboard.up('w');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}${phase}_north.png` });
  const spots = { cottage: [480, 215], library: [232, 228], glasshouse: [736, 228], pond: [650, 470], garden: [208, 420] };
  for (const [name, [x, y]] of Object.entries(spots)) {
    await page.evaluate(([x, y]) => window.__fodder.scene.player.setPosition(x, y), [x, y]);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}${phase}_${name}.png` });
  }
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
