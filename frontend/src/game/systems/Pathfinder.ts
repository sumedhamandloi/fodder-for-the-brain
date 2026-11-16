/** 8-way A* over the tile grid (no corner cutting). */
export class Pathfinder {
  constructor(
    private w: number,
    private h: number,
    private blocked: Uint8Array,
  ) {}

  isBlocked(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h || this.blocked[y * this.w + x] === 1;
  }

  /** Nearest walkable tile to (x, y), searching outward. */
  nearestOpen(x: number, y: number): [number, number] | null {
    for (let r = 0; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (!this.isBlocked(x + dx, y + dy)) return [x + dx, y + dy];
        }
      }
    }
    return null;
  }

  find(sx: number, sy: number, tx: number, ty: number): [number, number][] | null {
    const goal = this.nearestOpen(tx, ty);
    const start = this.nearestOpen(sx, sy);
    if (!goal || !start) return null;
    [tx, ty] = goal;
    const idx = (x: number, y: number) => y * this.w + x;
    const g = new Float32Array(this.w * this.h).fill(Infinity);
    const came = new Int32Array(this.w * this.h).fill(-1);
    const open: { i: number; f: number }[] = [];
    const hfn = (x: number, y: number) => {
      const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    const s = idx(start[0], start[1]);
    g[s] = 0;
    open.push({ i: s, f: hfn(start[0], start[1]) });
    const closed = new Uint8Array(this.w * this.h);
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (open[k].f < open[bi].f) bi = k;
      const { i } = open.splice(bi, 1)[0];
      if (closed[i]) continue;
      closed[i] = 1;
      const x = i % this.w, y = (i / this.w) | 0;
      if (x === tx && y === ty) {
        const path: [number, number][] = [];
        let c = i;
        while (c !== -1) {
          path.unshift([c % this.w, (c / this.w) | 0]);
          c = came[c];
        }
        return path;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (this.isBlocked(nx, ny)) continue;
          if (dx && dy && (this.isBlocked(x + dx, y) || this.isBlocked(x, y + dy))) continue;
          const ni = idx(nx, ny);
          const ng = g[i] + (dx && dy ? 1.414 : 1);
          if (ng < g[ni]) {
            g[ni] = ng;
            came[ni] = i;
            open.push({ i: ni, f: ng + hfn(nx, ny) });
          }
        }
      }
    }
    return null;
  }
}
