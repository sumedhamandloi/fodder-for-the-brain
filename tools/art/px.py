"""Pixel-art primitives. Every colour must come from the master palette (pal.P)."""
import math
import random
from PIL import Image

from pal import P, rgb

LIGHT = (-0.62, -0.78)  # light from the top-left


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.pix = self.im.load()

    # --- basic -------------------------------------------------------------
    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def px(self, x, y, c):
        x, y = int(x), int(y)
        if self.inb(x, y):
            self.pix[x, y] = rgb(c) if c is not None else (0, 0, 0, 0)

    def get(self, x, y):
        if not self.inb(x, y):
            return (0, 0, 0, 0)
        return self.pix[int(x), int(y)]

    def opaque(self, x, y):
        return self.get(x, y)[3] > 0

    def rect(self, x, y, w, h, c):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.px(xx, yy, c)

    def hline(self, x0, x1, y, c):
        for x in range(int(x0), int(x1) + 1):
            self.px(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(int(y0), int(y1) + 1):
            self.px(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (x + 0.5 - cx) / max(rx, 0.5)
                dy = (y + 0.5 - cy) / max(ry, 0.5)
                if dx * dx + dy * dy <= 1.0:
                    self.px(x, y, c)

    def disc(self, cx, cy, r, c):
        self.ellipse(cx, cy, r, r, c)

    def poly(self, pts, c):
        """Filled polygon (even-odd scanline)."""
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            yc = y + 0.5
            xs = []
            n = len(pts)
            for i in range(n):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % n]
                if (y0 <= yc < y1) or (y1 <= yc < y0):
                    xs.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                for x in range(int(math.ceil(xs[i] - 0.5)), int(math.floor(xs[i + 1] - 0.5)) + 1):
                    self.px(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    # --- shading -----------------------------------------------------------
    def shaded_blob(self, cx, cy, rx, ry, ramp, rng=None, jitter=0.12, bias=0.0, rim=True):
        """Ellipse shaded by the top-left light. ramp = dark..light colour names."""
        rng = rng or random.Random(0)
        n = len(ramp)
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                d2 = dx * dx + dy * dy
                if d2 > 1.0:
                    continue
                lum = -(dx * LIGHT[0] + dy * LIGHT[1])  # -1..1
                lum = lum * 0.55 + 0.5 + bias + (1 - d2) * 0.18
                lum += (rng.random() - 0.5) * jitter
                if rim and d2 > 0.78 and lum < 0.55:
                    lum -= 0.25
                i = max(0, min(n - 1, int(lum * n)))
                self.px(x, y, ramp[i])

    def outline(self, c, diag=False, only_outside=True):
        pts = []
        for y in range(self.h):
            for x in range(self.w):
                if self.opaque(x, y):
                    continue
                nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
                if diag:
                    nb += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
                if any(self.opaque(x + a, y + b) for a, b in nb):
                    pts.append((x, y))
        for x, y in pts:
            self.px(x, y, c)

    def paste(self, other, ox, oy, flip=False):
        for y in range(other.h):
            for x in range(other.w):
                p = other.pix[x, y]
                if p[3]:
                    tx = ox + (other.w - 1 - x if flip else x)
                    if self.inb(tx, oy + y):
                        self.pix[tx, oy + y] = p

    def recolor(self, src, dst):
        s, d = rgb(src), rgb(dst)
        for y in range(self.h):
            for x in range(self.w):
                if self.pix[x, y] == s:
                    self.pix[x, y] = d

    def copy(self):
        c = Canvas(self.w, self.h)
        c.im = self.im.copy()
        c.pix = c.im.load()
        return c

    def flipped(self):
        c = Canvas(self.w, self.h)
        c.paste(self, 0, 0, flip=True)
        return c


def sheet(frames, cols=None):
    """Pack a list of equal-size Canvases into a sheet."""
    fw, fh = frames[0].w, frames[0].h
    cols = cols or len(frames)
    rows = (len(frames) + cols - 1) // cols
    s = Canvas(fw * cols, fh * rows)
    for i, f in enumerate(frames):
        s.paste(f, (i % cols) * fw, (i // cols) * fh)
    return s


def h01(*args):
    """Deterministic hash in 0..1."""
    v = 2166136261
    for a in args:
        v ^= (int(a) & 0xFFFFFFFF)
        v = (v * 16777619) & 0xFFFFFFFF
        v ^= v >> 13
        v = (v * 1274126177) & 0xFFFFFFFF
    return (v & 0xFFFFFF) / 0xFFFFFF


def tnoise(x, y, seed, period=16):
    """Smooth noise that tiles every `period` px."""
    r = random.Random(seed)
    s = 0.0
    for k in range(5):
        kx, ky = r.randint(-2, 2), r.randint(-2, 2)
        if kx == 0 and ky == 0:
            kx = 1
        ph = r.random() * 6.283
        amp = 1.0 / (1 + abs(kx) + abs(ky))
        s += amp * math.sin(6.283 * (kx * x + ky * y) / period + ph)
    return s * 0.7
