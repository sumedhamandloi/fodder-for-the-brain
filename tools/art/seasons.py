"""Seasonal repaints (Milestone 9). Each season gets its own tileset and foliage/roof variants, made by
remapping palette colours (never a hue shift) plus a snow-cap pass for winter.

Spring is the base art. Output keys: `<key>@summer`, `<key>@autumn`, `<key>@winter`.
"""
from px import Canvas, h01
from pal import rgb

SEASONS = ["summer", "autumn", "winter"]

# colour remaps per season (palette name -> palette name)
GRASS = {
    "summer": {"g7": "g6", "g8": "g7", "g9": "g8"},
    "autumn": {"g3": "ag0", "g4": "ag1", "g5": "ag1", "g6": "ag2", "g7": "ag3", "g8": "ag3", "g9": "a3"},
    "winter": {"g2": "sn0", "g3": "sn1", "g4": "sn1", "g5": "sn2", "g6": "sn2", "g7": "sn2", "g8": "sn2", "g9": "sn2"},
}
# roofs that fill with snow in winter: key -> (region x0, y0, x1, y1 on each frame, colour remap)
ROOF_SNOW = {
    "bld_cottage": ((0, 8, 96, 51), {"r1": "sn1", "r2": "sn2", "r3": "sn2", "r0": "sn0"}),
    "bld_library": ((0, 0, 96, 46), {"w1": "sn1", "w2": "sn2", "w3": "sn2", "n1": "sn1", "l0": "sn0"}),
    "bld_pavilion": ((0, 0, 88, 30), {"l0": "sn0", "l1": "sn1", "l2": "sn2"}),
    "bld_glasshouse": ((0, 0, 84, 34), {"b4": "sn2", "b3": "sn1", "c1": "sn2"}),
}
FOLIAGE = {  # broadleaf trees and bushes (evergreens keep their colour)
    "summer": {"g6": "g5", "g7": "g6"},
    "autumn": {"g1": "a0", "g2": "a0", "g3": "a1", "g4": "a1", "g6": "a2", "g7": "a3", "g8": "a3"},
    "winter": {},
}
BLOSSOM = {  # cherry trees: leafy green in summer, amber in autumn, bare-ish in winter
    "summer": {"p0": "g2", "p1": "g3", "p2": "g4", "p3": "g6", "p4": "g7"},
    "autumn": {"p0": "a0", "p1": "a1", "p2": "a2", "p3": "a3", "p4": "y2"},
    "winter": {"p0": "w1", "p1": "w2", "p2": "sn0", "p3": "sn1", "p4": "sn2"},
}
FLOWERS = {  # meadow flowers: summer brighter, autumn fewer/warmer, winter buried
    "summer": {"p2": "y1", "p3": "y2", "l1": "fb", "l2": "fb2"},
    "autumn": {"p2": "a2", "p3": "a3", "fb": "a1", "fb2": "y1", "l1": "a1", "l2": "a2", "fw": "e4"},
    "winter": {"p2": "sn1", "p3": "sn2", "fb": "sn0", "fb2": "sn1", "l1": "sn0", "l2": "sn1", "fw": "sn2",
               "y1": "sn1", "y2": "sn2", "fr": "sn0"},
}
WATER = {"winter": {"b1": "b2", "b2": "b3", "b3": "b4"}}

BROADLEAF = {"tree_oak", "tree_oak_b", "tree_round", "bush_green", "bush_pink", "bush_berry", "bush_blue", "bush_white", "rock_moss"}
CHERRY = {"tree_cherry", "tree_cherry_s"}
EVERGREEN = {"tree_pine"}
SNOWCAP = {"bld_cottage", "bld_library", "bld_glasshouse", "bld_pavilion", "fence_h", "fence_v", "fence_post", "bench",
           "lantern", "arch", "rock_s", "rock_m", "rock_moss", "barrel", "crate", "signpost", "dock", "pet_bed"}


def remap(c: Canvas, table: dict, chance=1.0, seed=0, region=None):
    if not table:
        return c
    lut = {rgb(k): rgb(v) for k, v in table.items()}
    out = c.copy()
    x0, y0, x1, y1 = region or (0, 0, c.w, c.h)
    for y in range(max(0, y0), min(c.h, y1)):
        for x in range(max(0, x0), min(c.w, x1)):
            p = out.pix[x, y]
            if p[3] and p in lut and (chance >= 1 or h01(seed, x, y) < chance):
                out.pix[x, y] = lut[p]
    return out


def snowcap(c: Canvas, depth=2, frame_h=None):
    """Lay snow on every upward-facing edge (per frame, so sheets don't bleed between rows)."""
    out = c.copy()
    fh = frame_h or c.h
    for x in range(c.w):
        for y in range(c.h):
            if not c.opaque(x, y):
                continue
            top = (y % fh == 0) or not c.opaque(x, y - 1)
            if top:
                for d in range(depth):
                    if y + d < c.h and c.opaque(x, y + d) and (y + d) // fh == y // fh:
                        out.px(x, y + d, "sn2" if d == 0 else "sn1")
    return out


def tileset(base: Canvas, season: str) -> Canvas:
    t = remap(base, GRASS[season])
    t = remap(t, FLOWERS[season])
    t = remap(t, WATER.get(season, {}))
    if season == "winter":
        # dust the canopy and paths with snow, leaving texture
        t = remap(t, {"g4": "sn1", "g6": "sn2", "g1": "g1"}, chance=0.55, seed=3)
        t = remap(t, {"e3": "sn2", "e4": "sn2"}, chance=0.22, seed=5)
    if season == "autumn":
        t = remap(t, {"g4": "a1", "g6": "a2", "g3": "a0"}, chance=0.35, seed=7)  # turning canopy
    return t


def sprite(key: str, frames: list, season: str) -> list:
    out = []
    for f in frames:
        g = f
        if key in BROADLEAF:
            g = remap(g, FOLIAGE[season])
            if season == "winter":
                g = remap(g, {"g1": "w1", "g2": "w1", "g3": "w2", "g4": "sn0", "g6": "sn1", "g7": "sn2", "g8": "sn2"}, chance=0.85, seed=2)
        if key in CHERRY:
            g = remap(g, BLOSSOM[season])
        if key in EVERGREEN and season == "winter":
            g = snowcap(g, depth=1)
        if season == "winter" and key in ROOF_SNOW:
            region, table = ROOF_SNOW[key]
            g = remap(g, table, chance=0.82, seed=11, region=region)
        if season == "winter" and key in SNOWCAP | BROADLEAF | CHERRY:
            g = snowcap(g, depth=2 if key.startswith("bld_") else 1)
        out.append(g)
    return out


def weather_fx():
    flake = []
    for i in range(2):
        c = Canvas(3, 3)
        c.px(1, 1, "sn2")
        if i == 0:
            c.px(0, 1, "sn1"), c.px(2, 1, "sn1"), c.px(1, 0, "sn1"), c.px(1, 2, "sn1")
        flake.append(c)
    streak = Canvas(2, 7)
    streak.line(1, 0, 0, 6, "b3"), streak.px(0, 6, "b4")
    fog = Canvas(96, 32)
    import math
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    for y in range(32):
        for x in range(96):
            d = math.hypot((x - 48) / 48, (y - 16) / 16)
            if d < 1 and bayer[y % 4][x % 4] < (1 - d) * 10:
                fog.px(x, y, "sn2")
    leaves = []
    for i in range(4):
        c = Canvas(4, 4)
        pts = [[(1, 1), (2, 1), (1, 2)], [(1, 1), (2, 2)], [(1, 1), (1, 2), (2, 2)], [(2, 1), (1, 2)]][i]
        for j, (x, y) in enumerate(pts):
            c.px(x, y, "a2" if j else "a1")
        leaves.append(c)
    return {
        "fx_snow": (flake, {}),
        "fx_streak": ([streak], {}),
        "fx_fog": ([fog], {}),
        "fx_leaf": (leaves, {}),
    }


def varies(key: str) -> bool:
    return key in BROADLEAF | CHERRY | EVERGREEN | SNOWCAP
