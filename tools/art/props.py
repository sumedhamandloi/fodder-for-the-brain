"""Environment props. Each builder returns (frames: list[Canvas], meta dict).
meta: body = [x, y, w, h] collision box relative to the sprite's bottom-centre anchor."""
import math
import random
from px import Canvas, h01

LEAF = ["g1", "g2", "g3", "g4", "g6", "g7"]
LEAF_DEEP = ["g0", "g1", "g2", "g3", "g4", "g6"]
BLOSSOM = ["p0", "p1", "p2", "p3", "p4"]


def foliage(c, cx, cy, rx, ry, ramp, seed, npuff=14, prad=(5.5, 8.0), clumps=60, accent=None):
    r = random.Random(seed)
    puffs = []
    for _ in range(npuff):
        a = r.random() * 6.283
        d = math.sqrt(r.random()) * 0.78
        puffs.append((cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d, r.uniform(*prad)))
    # silhouette edge puffs
    for i in range(10):
        a = i / 10 * 6.283
        puffs.append((cx + math.cos(a) * rx * 0.82, cy + math.sin(a) * ry * 0.8, r.uniform(prad[0], prad[0] + 1.5)))
    puffs.sort(key=lambda p: p[1] + (p[0] - cx) * 0.2)
    for (x, y, rad) in puffs:
        # back puffs darker
        bias = -0.18 * (1 - (y - (cy - ry)) / (2 * ry))
        c.shaded_blob(x, y, rad, rad * 0.92, ramp, r, jitter=0.10, bias=bias)
    # leaf clumps: small lighter crescents on lit parts
    for _ in range(clumps):
        x = int(cx + (r.random() - 0.5) * rx * 1.8)
        y = int(cy + (r.random() - 0.5) * ry * 1.8)
        p = c.get(x, y)
        if not p[3]:
            continue
        idx = None
        for i, k in enumerate(ramp):
            from pal import rgb
            if rgb(k) == p:
                idx = i
        if idx is None or idx < 2 or idx >= len(ramp) - 1:
            continue
        c.px(x, y, ramp[idx + 1])
        c.px(x + 1, y, ramp[idx + 1])
        c.px(x - 1, y + 1, ramp[idx + 1])
        if c.opaque(x, y + 1):
            c.px(x, y + 1, ramp[idx - 1])
            c.px(x + 1, y + 1, ramp[idx - 1])
    if accent:
        for _ in range(accent[1]):
            x = int(cx + (r.random() - 0.5) * rx * 1.6)
            y = int(cy + (r.random() - 0.5) * ry * 1.6)
            if c.opaque(x, y) and c.opaque(x + 1, y + 1):
                col = r.choice(accent[0])
                c.px(x, y, col)
                c.px(x + 1, y, accent[2])


def trunk(c, cx, top, bottom, w=6, dark="w1", mid="w2", light="w3"):
    for y in range(top, bottom + 1):
        flare = 2 if y >= bottom - 2 else 0
        x0, x1 = cx - w // 2 - flare, cx + w // 2 - 1 + flare
        for x in range(x0, x1 + 1):
            col = mid
            if x <= x0 + 1:
                col = light
            if x >= x1 - 1:
                col = dark
            if h01(x, y, 9) < 0.12:
                col = dark
            c.px(x, y, col)
    c.px(cx - w // 2 - 2, bottom, "w0"), c.px(cx + w // 2 + 1, bottom, "w0")


def oak(seed=1, autumn=False):
    c = Canvas(48, 64)
    trunk(c, 24, 38, 62, w=8)
    foliage(c, 24, 25, 21, 20, LEAF, seed, npuff=16, clumps=90)
    return c


def round_bush_tree(seed=2):
    c = Canvas(40, 52)
    trunk(c, 20, 34, 50, w=6)
    foliage(c, 20, 21, 17, 17, LEAF_DEEP, seed, npuff=12, prad=(5, 7), clumps=60)
    return c


def pine(seed=3):
    c = Canvas(32, 64)
    trunk(c, 16, 52, 62, w=4)
    r = random.Random(seed)
    tiers = [(50, 15), (40, 13), (31, 11), (22, 9), (14, 6.5), (7, 4)]
    for (base, hw) in tiers:
        top = base - 13
        for y in range(top, base + 1):
            t = (y - top) / (base - top)
            half = hw * (0.25 + 0.75 * t)
            for x in range(int(16 - half), int(16 + half) + 1):
                lx = (x - 16) / max(half, 1)
                lum = 0.5 - lx * 0.35 - (1 - t) * 0.1 + (r.random() - 0.5) * 0.15
                if y >= base - 1:
                    lum -= 0.35
                ramp = ["g0", "g1", "g2", "g3", "g4"]
                c.px(x, y, ramp[max(0, min(4, int(lum * 5)))])
        # jagged hem
        for x in range(int(16 - hw), int(16 + hw) + 1, 2):
            c.px(x, base + 1, "g1")
    return c


def cherry(seed=4):
    c = Canvas(64, 80)
    trunk(c, 32, 50, 78, w=8, dark="w0", mid="w1", light="w2")
    # branches
    for (x0, y0, x1, y1) in [(32, 56, 18, 40), (32, 54, 47, 38), (31, 52, 30, 34)]:
        c.line(x0, y0, x1, y1, "w1")
        c.line(x0 + 1, y0, x1 + 1, y1, "w0")
    foliage(c, 32, 30, 29, 26, BLOSSOM, seed, npuff=22, prad=(6, 9), clumps=120,
            accent=(["p4", "fw"], 30, "p3"))
    # a few branches peeking through
    for (x, y) in [(20, 41), (44, 39), (30, 42)]:
        if c.opaque(x, y):
            c.px(x, y, "w1"), c.px(x + 1, y, "p0")
    return c


def cherry_small(seed=5):
    c = Canvas(44, 56)
    trunk(c, 22, 36, 54, w=6, dark="w0", mid="w1", light="w2")
    foliage(c, 22, 22, 19, 17, BLOSSOM, seed, npuff=14, prad=(5, 7), clumps=70, accent=(["p4"], 16, "p3"))
    return c


def bush(kind, seed):
    c = Canvas(32, 24)
    acc = None
    if kind == "pink":
        acc = (["p2", "p3"], 14, "p4")
    elif kind == "berry":
        acc = (["fr"], 9, "r0")
    elif kind == "blue":
        acc = (["fb", "fb2"], 14, "l2")
    elif kind == "white":
        acc = (["fw"], 14, "c0")
    foliage(c, 16, 14, 14, 8.5, LEAF, seed, npuff=9, prad=(4, 6), clumps=30, accent=acc)
    return c


def rock(size, seed, mossy=False):
    w, h = (16, 14) if size == "s" else (28, 22)
    c = Canvas(w, h)
    r = random.Random(seed)
    rx, ry = (6, 4.5) if size == "s" else (12, 8.5)
    c.shaded_blob(w / 2, h - ry - 1, rx, ry, ["s0", "s1", "s2", "s3", "s4"], r, jitter=0.12)
    if size != "s":
        c.shaded_blob(w / 2 - 5, h - ry - 4, rx * 0.5, ry * 0.6, ["s1", "s2", "s3", "s4"], r)
        c.line(w / 2 + 1, h - ry - 4, w / 2 + 4, h - 4, "s1")
    if mossy:
        for x in range(w):
            for y in range(h):
                if c.opaque(x, y) and not c.opaque(x, y - 2) and h01(seed, x, y) < 0.7:
                    c.px(x, y, "g6" if h01(x, y) < 0.5 else "g4")
    return c


def mushrooms(red=True):
    c = Canvas(16, 16)
    cap, cap_l, cap_d = ("fr", "r3", "r0") if red else ("e1", "e2", "e0")
    for (x, y, s) in [(5, 9, 3), (11, 11, 2)]:
        c.rect(x - 1, y, 2, s + 2, "c0")
        c.px(x, y + s + 1, "e4")
        c.ellipse(x, y, s + 1, s * 0.8, cap)
        c.hline(x - s, x + s, y + 1, cap_d)
        c.px(x - 1, y - 1, cap_l)
        if red:
            c.px(x + 1, y - 1, "fw"), c.px(x - 2, y, "fw")
    return c


def fence(kind):
    c = Canvas(16, 16)
    if kind == "h":
        for y, row in [(6, "w3"), (10, "w3")]:
            c.hline(0, 15, y, row)
            c.hline(0, 15, y + 1, "w1")
        c.rect(1, 3, 3, 12, "w2"), c.vline(1, 3, 14, "w3"), c.vline(3, 3, 14, "w1"), c.px(2, 3, "w4")
    elif kind == "post":
        c.rect(6, 3, 4, 12, "w2"), c.vline(6, 3, 14, "w3"), c.vline(9, 3, 14, "w1"), c.hline(6, 9, 3, "w4")
    elif kind == "v":
        c.rect(6, 0, 4, 16, "w2"), c.vline(6, 0, 15, "w3"), c.vline(9, 0, 15, "w1")
        for y in (0, 8):
            c.hline(6, 9, y, "w4"), c.hline(6, 9, y + 1, "w1")
    c.outline("w0")
    return c


def lantern(lit):
    c = Canvas(16, 32)
    c.rect(7, 12, 2, 19, "w1"), c.vline(7, 12, 30, "w2")
    c.rect(5, 29, 6, 2, "s1")
    c.rect(4, 4, 8, 8, "s0")
    glass = "y2" if lit else "s2"
    c.rect(5, 5, 6, 6, glass)
    if lit:
        c.rect(6, 6, 4, 4, "y3")
    else:
        c.px(5, 5, "s3")
    c.vline(7, 5, 10, "s0"), c.vline(8, 5, 10, "s0")
    c.poly([(3, 4), (13, 4), (10, 1), (6, 1)], "s1")
    c.hline(4, 11, 4, "s0"), c.px(8, 0, "s0")
    return c


def bench():
    c = Canvas(32, 20)
    c.rect(2, 4, 28, 3, "w3"), c.hline(2, 29, 4, "w4"), c.hline(2, 29, 6, "w1")  # backrest
    c.rect(2, 10, 28, 4, "w2"), c.hline(2, 29, 10, "w4"), c.hline(2, 29, 13, "w1")  # seat
    for x in (4, 26):
        c.rect(x, 4, 2, 15, "w1")
        c.px(x, 4, "w3")
    c.outline("w0")
    return c


def pot(flowers):
    c = Canvas(16, 16)
    c.poly([(4, 9), (12, 9), (11, 15), (5, 15)], "r1")
    c.hline(3, 12, 8, "r2"), c.hline(3, 12, 9, "r3"), c.vline(10, 10, 14, "r0"), c.vline(11, 10, 14, "r0")
    c.ellipse(8, 6.5, 5, 3.5, "g3")
    c.ellipse(7.5, 5.8, 4, 2.6, "g5")
    for (x, y) in [(5, 5), (8, 3), (11, 6), (7, 7)]:
        c.px(x, y, flowers), c.px(x + 1, y, flowers), c.px(x, y - 1, "c1" if flowers != "fw" else "p3")
    c.outline("o")
    return c


def barrel():
    c = Canvas(16, 18)
    c.ellipse(8, 9, 6, 8, "w2")
    for x in range(2, 15):
        for y in range(1, 18):
            if c.opaque(x, y):
                if x <= 4:
                    c.px(x, y, "w3")
                elif x >= 12:
                    c.px(x, y, "w1")
    for y in (4, 13):
        c.hline(2, 14, y, "s1")
    c.ellipse(8, 3, 5, 1.6, "w1")
    c.outline("w0")
    return c


def crate():
    c = Canvas(16, 16)
    c.rect(2, 4, 12, 11, "w3")
    c.rect(2, 4, 12, 2, "w4")
    c.line(3, 6, 12, 14, "w2"), c.line(3, 7, 11, 14, "w2")
    c.vline(13, 4, 14, "w1"), c.hline(2, 13, 14, "w1")
    c.outline("w0")
    return c


def signpost(icon_col="g4"):
    c = Canvas(16, 24)
    c.rect(7, 10, 2, 13, "w1"), c.vline(7, 10, 22, "w2")
    c.rect(1, 3, 14, 8, "w3"), c.hline(1, 14, 3, "w4"), c.hline(1, 14, 10, "w1")
    c.hline(4, 11, 6, "w1"), c.hline(4, 9, 8, "w1")
    c.outline("w0")
    return c


def dock():
    c = Canvas(48, 34)
    for x in (2, 14, 30, 44):
        c.rect(x, 18, 3, 16, "w1"), c.vline(x, 18, 33, "w2")
        c.hline(x, x + 2, 33, "b4")
    c.rect(0, 4, 48, 18, "w3")
    for y in range(4, 22, 4):
        c.hline(0, 47, y, "w4")
        c.hline(0, 47, y + 3, "w1")
    for (x, y) in [(6, 6), (22, 10), (38, 14), (12, 18), (30, 6)]:
        c.px(x, y, "w0")
    c.rect(0, 22, 48, 2, "w1")
    c.outline("w0")
    return c


def arch():
    c = Canvas(56, 56)
    blocks = ["s1", "s2", "s3"]
    # pillars
    for x0 in (2, 42):
        for y in range(18, 54, 6):
            for x in range(x0, x0 + 12):
                for yy in range(y, y + 6):
                    col = "s2"
                    if yy == y:
                        col = "s3"
                    if yy == y + 5 or x == x0 + 11:
                        col = "s1"
                    if (x - x0 + (y // 6) * 3) % 6 == 0:
                        col = "s1"
                    c.px(x, yy, col)
    # arch ring
    for a in range(0, 181, 2):
        ang = math.radians(a)
        for rr in range(14, 26):
            x = 28 + math.cos(ang) * rr
            y = 22 - math.sin(ang) * rr
            col = "s3" if rr > 23 else ("s1" if rr < 16 else "s2")
            if a % 20 < 2:
                col = "s1"
            c.px(x, y, col)
    c.rect(24, -1, 8, 6, "s3"), c.hline(24, 31, 4, "s1")  # keystone
    # ivy
    r = random.Random(7)
    for _ in range(70):
        a = math.radians(r.uniform(-10, 120))
        rr = r.uniform(14, 27)
        x, y = 28 + math.cos(a) * rr, 22 - math.sin(a) * rr
        c.px(x, y, r.choice(["g3", "g4", "g6"]))
    for y in range(20, 50):
        if r.random() < 0.6:
            c.px(3 + r.randint(0, 3), y, r.choice(["g3", "g4", "g6"]))
    for (x, y) in [(10, 8), (14, 4), (6, 24), (5, 34)]:
        c.px(x, y, "p2"), c.px(x + 1, y, "p3")
    c.outline("o")
    return c


def waterfall(frame):
    c = Canvas(40, 56)
    r = random.Random(11)
    # rocky cliff
    for (x, y, rx, ry) in [(8, 20, 9, 18), (32, 22, 9, 20), (20, 8, 16, 8), (6, 44, 7, 8), (34, 44, 7, 9)]:
        c.shaded_blob(x, y, rx, ry, ["s0", "s1", "s2", "s3"], r, jitter=0.15)
    for _ in range(40):
        x, y = r.randint(0, 39), r.randint(0, 30)
        if c.opaque(x, y) and not c.opaque(x, y - 1):
            c.px(x, y, "g4"), c.px(x + 1, y, "g6")
    # water column
    for y in range(6, 50):
        for x in range(14, 27):
            k = (y + frame * 3 + (x * 7) % 5) % 6
            col = "b3" if k < 3 else ("b4" if k < 5 else "b2")
            if x in (14, 26):
                col = "b2"
            c.px(x, y, col)
    # splash foam
    for x in range(10, 31):
        for y in range(48, 54):
            if h01(x, y, frame) < 0.55 - abs(x - 20) * 0.03:
                c.px(x, y, "fw" if h01(x, y, frame + 9) < 0.5 else "b4")
    return c


def marker(icon):
    c = Canvas(24, 28)
    c.disc(12, 11, 10.5, "o")
    c.disc(12, 11, 9.5, "w2")
    c.disc(12, 11, 8, "c0")
    c.poly([(8, 19), (16, 19), (12, 26)], "o")
    c.poly([(9.5, 19), (14.5, 19), (12, 23.5)], "w2")
    c.px(8, 6, "c1"), c.px(9, 5, "c1")
    ICON[icon](c)
    return c


def _book(c):
    c.rect(6, 8, 6, 8, "fr"), c.rect(12, 8, 6, 8, "fr")
    c.rect(7, 9, 4, 6, "c1"), c.rect(13, 9, 4, 6, "c1")
    c.vline(12, 8, 16, "r0")
    c.hline(8, 10, 11, "s2"), c.hline(13, 15, 11, "s2"), c.hline(8, 10, 13, "s2")


def _house(c):
    c.poly([(5, 12), (12, 5), (19, 12)], "r1")
    c.rect(7, 12, 10, 6, "w3")
    c.rect(11, 14, 3, 4, "w1")
    c.px(8, 13, "y2"), c.px(9, 13, "y2")


def _sprout(c):
    c.vline(12, 10, 17, "g3")
    c.ellipse(9, 9, 3.5, 2.2, "g6"), c.ellipse(15, 8, 3.5, 2.2, "g5")
    c.px(8, 8, "g8"), c.px(14, 7, "g8")
    c.hline(8, 16, 17, "e1")


def _puzzle(c):
    c.rect(6, 6, 6, 6, "l1"), c.rect(12, 6, 6, 6, "y1"), c.rect(6, 12, 6, 6, "g6"), c.rect(12, 12, 6, 6, "p2")
    c.px(12, 8, "l1"), c.px(12, 9, "l1"), c.px(8, 12, "l1")
    c.rect(6, 6, 12, 1, "o") if False else None


def _lotus(c):
    c.ellipse(12, 14, 7, 2.5, "b2")
    c.poly([(12, 5), (14, 11), (10, 11)], "p2")
    c.poly([(7, 8), (12, 13), (9, 13)], "p1")
    c.poly([(17, 8), (15, 13), (12, 13)], "p1")
    c.px(12, 7, "p4")


def _leaf(c):
    c.ellipse(12, 11, 4, 6, "g6")
    c.vline(12, 6, 17, "g3")
    c.px(10, 9, "g8")


ICON = {"book": _book, "house": _house, "sprout": _sprout, "puzzle": _puzzle, "pond": _lotus, "leaf": _leaf}


def shadow(w, h):
    c = Canvas(w, h)
    c.ellipse(w / 2, h / 2, w / 2, h / 2, "g0")
    return c


def build():
    """returns dict key -> (frames, meta)"""
    out = {
        "tree_oak": ([oak(1)], {"body": [-5, -6, 10, 6], "shadow": [40, 10]}),
        "tree_oak_b": ([oak(9)], {"body": [-5, -6, 10, 6], "shadow": [40, 10]}),
        "tree_round": ([round_bush_tree(2)], {"body": [-4, -5, 8, 5], "shadow": [32, 8]}),
        "tree_pine": ([pine(3)], {"body": [-3, -5, 6, 5], "shadow": [24, 7]}),
        "tree_cherry": ([cherry(4)], {"body": [-5, -6, 10, 6], "shadow": [52, 12]}),
        "tree_cherry_s": ([cherry_small(5)], {"body": [-4, -5, 8, 5], "shadow": [36, 9]}),
        "bush_green": ([bush("green", 1)], {"body": [-12, -8, 24, 7], "shadow": [30, 6]}),
        "bush_pink": ([bush("pink", 2)], {"body": [-12, -8, 24, 7], "shadow": [30, 6]}),
        "bush_berry": ([bush("berry", 3)], {"body": [-12, -8, 24, 7], "shadow": [30, 6]}),
        "bush_blue": ([bush("blue", 4)], {"body": [-12, -8, 24, 7], "shadow": [30, 6]}),
        "bush_white": ([bush("white", 6)], {"body": [-12, -8, 24, 7], "shadow": [30, 6]}),
        "rock_s": ([rock("s", 1)], {"body": [-5, -6, 10, 5]}),
        "rock_m": ([rock("m", 2)], {"body": [-11, -10, 22, 9]}),
        "rock_moss": ([rock("m", 3, mossy=True)], {"body": [-11, -10, 22, 9]}),
        "mushroom_red": ([mushrooms(True)], {}),
        "mushroom_brown": ([mushrooms(False)], {}),
        "fence_h": ([fence("h")], {"body": [-8, -6, 16, 4]}),
        "fence_v": ([fence("v")], {"body": [-2, -16, 4, 16]}),
        "fence_post": ([fence("post")], {"body": [-2, -4, 4, 4]}),
        "lantern": ([lantern(False), lantern(True)], {"body": [-2, -3, 4, 3], "glow": [0, -24]}),
        "bench": ([bench()], {"body": [-14, -8, 28, 6], "shadow": [30, 6]}),
        "pot_pink": ([pot("p2")], {"body": [-4, -4, 8, 4]}),
        "pot_yellow": ([pot("y1")], {"body": [-4, -4, 8, 4]}),
        "pot_white": ([pot("fw")], {"body": [-4, -4, 8, 4]}),
        "barrel": ([barrel()], {"body": [-6, -5, 12, 5]}),
        "crate": ([crate()], {"body": [-6, -5, 12, 5]}),
        "signpost": ([signpost()], {"body": [-2, -3, 4, 3]}),
        "dock": ([dock()], {"flat": True}),
        "arch": ([arch()], {"bodies": [[-26, -6, 12, 6], [14, -6, 12, 6]]}),
        "waterfall": ([waterfall(i) for i in range(4)], {"anim": 6, "body": [-18, -30, 36, 24]}),
        "shadow_s": ([shadow(12, 4)], {}),
        "shadow_m": ([shadow(24, 6)], {}),
        "shadow_l": ([shadow(48, 12)], {}),
    }
    for k in ICON:
        out["marker_" + k] = ([marker(k)], {})
    return out
