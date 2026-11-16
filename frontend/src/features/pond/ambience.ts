/**
 * Optional pond ambience, generated live with Web Audio (no audio files):
 * soft filtered water noise, a slow swell, and the occasional gentle drip.
 * Off by default; only starts from an explicit click.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let dripTimer: number | null = null;

export function isPlaying() {
  return !!ctx && ctx.state === 'running';
}

export async function startAmbience() {
  if (ctx) {
    await ctx.resume();
    fade(0.35);
    return;
  }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // brown noise -> lowpass: distant moving water
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  const swell = ctx.createGain();
  swell.gain.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = 0.25;
  lfo.connect(lfoAmt).connect(swell.gain);
  src.connect(lp).connect(swell).connect(master);
  src.start();
  lfo.start();

  const drip = () => {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    const f = 900 + Math.random() * 700;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.3);
    dripTimer = window.setTimeout(drip, 2500 + Math.random() * 6000);
  };
  dripTimer = window.setTimeout(drip, 1800);
  fade(0.35);
}

function fade(to: number) {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(to, ctx.currentTime, 0.8);
}

export function stopAmbience() {
  if (!ctx) return;
  fade(0);
  const c = ctx;
  window.setTimeout(() => c.suspend(), 2500);
}

export function disposeAmbience() {
  if (dripTimer) window.clearTimeout(dripTimer);
  ctx?.close();
  ctx = null;
  master = null;
}
