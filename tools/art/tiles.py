"""16x16 world tileset.

Layout (16 columns):
  row 0      grass<->path   corner-Wang (index = mask, bits TL1 TR2 BL4 BR8 set = path)
  row 1      grass<->water  corner-Wang
  rows 2-5   grass<->canopy corner-Wang, 4 texture quadrants (32px period)
  row 6      grass variants 0-3, tilled soil 4-5, forest-floor 6, stepping stones 7-9, collision 15
  row 7      deco (transparent): flowers 0-7, tufts 8-9, pebbles 10, clover 11, lily 12, lily-flower 13, reeds 14, leaf litter 15
"""
import random
from px import Canvas, h01, tnoise

T = 16
COLS = 16
ROW_PATH, ROW_WATER, ROW_CANOPY, ROW_MISC, ROW_DECO, ROW_FLOWERS2 = 0, 1, 2, 6, 7, 8
ROWS = 9
COLLISION_TILE = ROW_MISC * COLS + 15


def corner_value(mask, px, py):
    u, v = (px + 0.5) / T, (py + 0.5) / T
    tl, tr = (mask & 1) > 0, (mask & 2) > 0
    bl, br = (mask & 4) > 0, (mask & 8) > 0
    top = tl * (1 - u) + tr * u
    bot = bl * (1 - u) + br * u
    return top * (1 - v) + bot * v


# ---------------------------------------------------------------- grass
def grass_px(c, x, y, variant, ox=0, oy=0):
    """Uniform base + sparse blade marks, so tiles join seamlessly."""
    c.px(x, y, "g5")
    hv = h01(variant * 7 + 3, x, y)
    if hv < 0.055:
        c.px(x, y, "g3")
        c.px(x, y - 1, "g4")
    elif hv < 0.09:
        c.px(x, y, "g6")
    elif hv < 0.10:
        c.px(x, y, "g7")


def grass_tile(variant):
    c = Canvas(T, T)
    for y in range(T):
        for x in range(T):
            grass_px(c, x, y, variant)
    r = random.Random(variant * 11 + 1)
    # a few tuft clusters
    for _ in range(2 + variant):
        tx, ty = r.randint(2, 13), r.randint(3, 13)
        for dx, dy, col in [(0, 0, "g3"), (1, -1, "g6"), (2, 0, "g3"), (1, 0, "g4"), (-1, 0, "g4"), (1, -2, "g7")]:
            c.px(tx + dx, ty + dy, col)
    return c


# ---------------------------------------------------------------- path
def path_set():
    out = []
    for mask in range(16):
        c = Canvas(T, T)
        for y in range(T):
            for x in range(T):
                v = corner_value(mask, x, y) + tnoise(x, y, 101) * 0.12
                d = v - 0.5
                if d > 0:
                    hv = h01(mask * 0 + 5, x, y)
                    col = "e3"
                    if d < 0.07:
                        col = "e2"
                    elif hv < 0.06:
                        col = "e2"
                    elif hv < 0.10:
                        col = "e4"
                    c.px(x, y, col)
                else:
                    grass_px(c, x, y, 0)
                    if d > -0.05:
                        c.px(x, y, "g6")  # bright grass lip overhanging the path
        # 2px pebbles (deterministic on path interior)
        for (x, y) in [(4, 5), (11, 10), (7, 13)]:
            if corner_value(mask, x, y) + tnoise(x, y, 101) * 0.12 > 0.68:
                c.px(x, y, "e1")
                c.px(x + 1, y, "e2")
                c.px(x, y - 1, "e4")
        out.append(c)
    return out


# ---------------------------------------------------------------- water
def water_px(c, x, y, d):
    hv = h01(77, x, y)
    if d < 0.06:
        c.px(x, y, "s1" if hv < 0.5 else "e1")  # muddy/stony bank
        if hv < 0.15:
            c.px(x, y, "s2")
    elif d < 0.10:
        c.px(x, y, "b3")
    elif d < 0.13:
        c.px(x, y, "b4" if hv < 0.35 else "b3")
    else:
        c.px(x, y, "b2")
        # gentle horizontal ripple marks
        if (y % 5 == 2) and h01(9, x // 3, y) < 0.22:
            c.px(x, y, "b3")
        elif (y % 7 == 5) and h01(4, x // 2, y) < 0.12:
            c.px(x, y, "b1")


def water_set():
    out = []
    for mask in range(16):
        c = Canvas(T, T)
        for y in range(T):
            for x in range(T):
                v = corner_value(mask, x, y) + tnoise(x, y, 202) * 0.2
                d = v - 0.5
                if d > 0:
                    water_px(c, x, y, d if mask != 15 else 1)
                else:
                    grass_px(c, x, y, 0)
                    if d > -0.05:
                        c.px(x, y, "g3")  # grass shading at the bank
        out.append(c)
    return out


# ---------------------------------------------------------------- canopy
LEAF = ["g0", "g1", "g2", "g3", "g4", "g6"]


def canopy_texture():
    """32x32 wrapping canopy of leaf puffs."""
    S = 32
    c = Canvas(S, S)
    c.rect(0, 0, S, S, "g1")
    r = random.Random(42)
    puffs = []
    for gy in range(4):
        for gx in range(4):
            puffs.append((gx * 8 + r.randint(-2, 2) + (4 if gy % 2 else 0), gy * 8 + r.randint(-2, 2), r.uniform(5.0, 6.5)))
    puffs.sort(key=lambda p: p[1])
    for (px_, py_, rad) in puffs:
        for oy in (-S, 0, S):
            for ox in (-S, 0, S):
                cx, cy = px_ + ox, py_ + oy
                for y in range(int(cy - rad - 1), int(cy + rad + 2)):
                    for x in range(int(cx - rad - 1), int(cx + rad + 2)):
                        if not (0 <= x < S and 0 <= y < S):
                            continue
                        dx, dy = (x + 0.5 - cx) / rad, (y + 0.5 - cy) / rad
                        d2 = dx * dx + dy * dy
                        if d2 > 1:
                            continue
                        lum = -(dx * -0.6 + dy * -0.8) * 0.5 + 0.45 + (1 - d2) * 0.15
                        lum += (h01(x, y, 3) - 0.5) * 0.12
                        if d2 > 0.75 and lum < 0.5:
                            lum -= 0.2
                        i = max(0, min(len(LEAF) - 1, int(lum * len(LEAF))))
                        c.px(x, y, LEAF[i])
    # little leaf highlights
    for _ in range(40):
        x, y = r.randint(0, S - 1), r.randint(0, S - 1)
        if c.get(x, y)[:3] == (0x54, 0x79, 0x4B):
            c.px(x, y, "g7")
    return c


def canopy_set(tex):
    out = []
    for q in range(4):
        qx, qy = (q % 2) * T, (q // 2) * T
        for mask in range(16):
            c = Canvas(T, T)
            for y in range(T):
                for x in range(T):
                    v = corner_value(mask, x, y) + tnoise(x, y, 303) * 0.3
                    d = v - 0.5
                    if d > 0:
                        col = tex.get(qx + x, qy + y)
                        c.pix[x, y] = col
                        if d < 0.05:
                            c.px(x, y, "g1")
                    else:
                        grass_px(c, x, y, 0)
                        if d > -0.10:
                            c.px(x, y, "g3")  # shade on the grass under the canopy edge
                        if d > -0.04:
                            c.px(x, y, "g2")
            out.append(c)
    return out


# ---------------------------------------------------------------- misc
def soil_tile(seed):
    c = Canvas(T, T)
    for y in range(T):
        for x in range(T):
            col = "e1"
            if y % 4 == 0:
                col = "e0"
            elif y % 4 == 1:
                col = "e2" if h01(seed, x, y) < 0.4 else "e1"
            c.px(x, y, col)
    return c


def forest_floor():
    c = Canvas(T, T)
    for y in range(T):
        for x in range(T):
            hv = h01(55, x, y)
            c.px(x, y, "g3" if hv > 0.12 else "g2")
            if hv < 0.04:
                c.px(x, y, "g4")
    return c


def stepping_stone(seed):
    c = grass_tile(0)
    r = random.Random(seed)
    cx, cy = 8 + r.randint(-1, 1), 8 + r.randint(-1, 1)
    c.ellipse(cx, cy + 1, 6, 4.5, "g3")
    c.shaded_blob(cx, cy, 6, 4.5, ["s1", "s2", "s3", "s4"], r, jitter=0.1, rim=True)
    c.px(cx - 2, cy - 2, "s4")
    return c


def collision_tile():
    c = Canvas(T, T)
    c.rect(0, 0, T, T, "fr")
    return c


# ---------------------------------------------------------------- deco
def flower(c, x, y, petal, center="y1", stem=True):
    if stem:
        c.px(x, y + 2, "g3")
        c.px(x - 1, y + 2, "g4")
    c.px(x, y - 1, petal)
    c.px(x - 1, y, petal)
    c.px(x + 1, y, petal)
    c.px(x, y + 1, petal)
    c.px(x, y, center)


def flower_tile(colors, seed, n=5):
    c = Canvas(T, T)
    r = random.Random(seed)
    pts = []
    tries = 0
    while len(pts) < n and tries < 200:
        tries += 1
        x, y = r.randint(2, 13), r.randint(2, 12)
        if all(abs(x - a) + abs(y - b) > 4 for a, b in pts):
            pts.append((x, y))
    pts.sort(key=lambda p: p[1])
    for i, (x, y) in enumerate(pts):
        col = colors[i % len(colors)]
        c.px(x + 1, y + 3, "g4")
        c.px(x - 1, y + 3, "g3")
        flower(c, x, y, col, center="y1" if col not in ("y1", "y2") else "e1")
    return c


def tuft_tile(seed):
    c = Canvas(T, T)
    r = random.Random(seed)
    for _ in range(3):
        x, y = r.randint(3, 12), r.randint(5, 13)
        for dx, dy, col in [(0, 0, "g3"), (-1, -1, "g6"), (1, -2, "g7"), (2, -1, "g6"), (1, 0, "g4"), (0, -1, "g4"), (-2, 0, "g4")]:
            c.px(x + dx, y + dy, col)
    return c


def pebbles_tile():
    c = Canvas(T, T)
    for (x, y) in [(4, 6), (10, 4), (8, 11), (12, 12)]:
        c.px(x, y, "s2")
        c.px(x + 1, y, "s1")
        c.px(x, y - 1, "s4")
    return c


def clover_tile():
    c = Canvas(T, T)
    for (x, y) in [(4, 5), (10, 9), (6, 12), (12, 3)]:
        for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1), (-1, 0)]:
            c.px(x + dx, y + dy, "g6")
        c.px(x, y, "g8")
        c.px(x + 1, y + 2, "g3")
    flower(c, 10, 9, "fw", "p2", stem=False)
    return c


def lily_tile(with_flower):
    c = Canvas(T, T)
    c.ellipse(8, 9, 6, 4, "f0")
    c.ellipse(8, 8, 6, 4, "g4")
    c.ellipse(7, 7.5, 4.5, 2.6, "g6")
    c.px(5, 6, "g8")
    c.px(6, 6, "g8")
    # notch
    for i in range(4):
        c.px(8 + i, 8, "b2")
    c.px(12, 9, "b2")
    if with_flower:
        c.ellipse(9, 6, 2.5, 2, "p1")
        c.px(8, 4, "p3"), c.px(10, 4, "p3"), c.px(9, 3, "p4")
        c.px(7, 5, "p2"), c.px(11, 5, "p2"), c.px(9, 5, "p4")
        c.px(9, 6, "y1")
    return c


def reeds_tile():
    c = Canvas(T, T)
    for x, h in [(3, 9), (5, 12), (7, 8), (10, 11), (12, 7)]:
        c.vline(x, 15 - h, 15, "g3")
        c.px(x, 15 - h, "g6")
        if h > 10:
            c.vline(x, 15 - h + 1, 15 - h + 3, "e1")  # cattail
    return c


def litter_tile():
    c = Canvas(T, T)
    for (x, y, col) in [(3, 4, "y1"), (10, 6, "r2"), (6, 11, "y0"), (12, 12, "r3")]:
        c.px(x, y, col), c.px(x + 1, y, col), c.px(x, y + 1, "e1")
    return c


def build():
    tiles = [None] * (COLS * ROWS)
    for i, t in enumerate(path_set()):
        tiles[ROW_PATH * COLS + i] = t
    for i, t in enumerate(water_set()):
        tiles[ROW_WATER * COLS + i] = t
    for i, t in enumerate(canopy_set(canopy_texture())):
        tiles[ROW_CANOPY * COLS + i] = t
    m = ROW_MISC * COLS
    for v in range(4):
        tiles[m + v] = grass_tile(v)
    tiles[m + 4], tiles[m + 5] = soil_tile(1), soil_tile(2)
    tiles[m + 6] = forest_floor()
    for i in range(3):
        tiles[m + 7 + i] = stepping_stone(i + 5)
    tiles[COLLISION_TILE] = collision_tile()
    d = ROW_DECO * COLS
    tiles[d + 0] = flower_tile(["p2", "p3"], 1)
    tiles[d + 1] = flower_tile(["fw"], 2)
    tiles[d + 2] = flower_tile(["fb", "fb2"], 3)
    tiles[d + 3] = flower_tile(["y1", "y2"], 4)
    tiles[d + 4] = flower_tile(["l1", "l2"], 5)
    tiles[d + 5] = flower_tile(["fr", "p2"], 6)
    tiles[d + 6] = flower_tile(["p2", "fw", "fb2", "y2"], 7, n=6)
    tiles[d + 7] = flower_tile(["l1", "p3", "fw"], 8, n=6)
    tiles[d + 8], tiles[d + 9] = tuft_tile(1), tuft_tile(2)
    tiles[d + 10] = pebbles_tile()
    tiles[d + 11] = clover_tile()
    tiles[d + 12], tiles[d + 13] = lily_tile(False), lily_tile(True)
    tiles[d + 14] = reeds_tile()
    tiles[d + 15] = litter_tile()
    f2 = ROW_FLOWERS2 * COLS
    for i, cols in enumerate([["p2", "fw"], ["fb2", "fw"], ["y2", "p3"], ["l2", "l1"],
                              ["p3", "p2", "fw"], ["fr", "y1"], ["fb", "l1"], ["fw", "y2"]]):
        tiles[f2 + i] = flower_tile(cols, 40 + i * 3, n=3 + i % 3)
    s = Canvas(COLS * T, ROWS * T)
    for i, t in enumerate(tiles):
        if t is not None:
            s.paste(t, (i % COLS) * T, (i // COLS) * T)
    return s
