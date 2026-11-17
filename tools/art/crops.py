"""Farming (Milestone 8): 8 crops x 4 stages (seed, sprout, growing, mature). Frames are 16x24, bottom-anchored on a soil tile.
Crops never wilt: there is deliberately no dead/dry stage.
"""
from px import Canvas

CROPS = ["carrot", "strawberry", "sunflower", "tomato", "pumpkin", "blueberry", "lavender", "tulip"]


def mound(c):
    c.ellipse(8, 22, 5, 1.6, "e0")
    c.hline(5, 11, 21, "e2")


def seed(c):
    mound(c)
    for x in (6, 9):
        c.px(x, 20, "e4"), c.px(x + 1, 21, "w3")


def sprout(c, tint="g6"):
    mound(c)
    c.vline(8, 17, 21, "g4")
    c.ellipse(6.5, 17, 2, 1.2, tint), c.ellipse(9.8, 16.5, 2, 1.2, "g5")
    c.px(6, 16, "g8")


def leafy(c, h=8, w=4, dark="g3", mid="g4", light="g6"):
    mound(c)
    base = 21
    for i in range(-w, w + 1, 2):
        top = base - h + abs(i)
        c.line(8, base, 8 + i, top, mid)
        c.px(8 + i, top, light)
        c.px(8 + i // 2, (base + top) // 2, dark)


def grow(crop):
    c = Canvas(16, 24)
    if crop == "sunflower":
        mound(c), c.vline(8, 9, 21, "g4"), c.vline(9, 11, 21, "g3")
        for y in (13, 17):
            c.ellipse(5.5, y, 2.5, 1.2, "g6"), c.ellipse(11.5, y + 1, 2.5, 1.2, "g5")
        c.disc(8.5, 8, 2, "g5")
    elif crop == "pumpkin":
        leafy(c, h=5, w=6)
        c.disc(10, 19, 2.4, "g6"), c.px(9, 18, "g8")
    elif crop == "tomato":
        leafy(c, h=10, w=4)
        c.px(6, 15, "g8"), c.px(10, 13, "g8")
    elif crop == "lavender":
        mound(c)
        for x in (5, 8, 11):
            c.vline(x, 13, 21, "g4"), c.px(x, 13, "l2")
    elif crop == "tulip":
        mound(c), c.vline(8, 13, 21, "g4")
        c.ellipse(6, 18, 1.5, 3, "g6"), c.ellipse(10, 18, 1.5, 3, "g5")
        c.ellipse(8, 12, 1.5, 2, "g6")
    elif crop == "blueberry":
        leafy(c, h=7, w=5, light="g7")
    elif crop == "strawberry":
        leafy(c, h=5, w=5)
        c.px(6, 18, "fw"), c.px(10, 17, "fw")
    else:  # carrot
        leafy(c, h=8, w=3, light="g7")
    return c


def mature(crop):
    c = Canvas(16, 24)
    if crop == "carrot":
        leafy(c, h=10, w=4, light="g7")
        c.poly([(6, 19), (10, 19), (8, 23)], "r2"), c.hline(6, 9, 19, "r3"), c.px(7, 21, "r1")
    elif crop == "strawberry":
        leafy(c, h=6, w=5)
        for (x, y) in [(5, 18), (10, 17), (8, 20), (12, 20)]:
            c.rect(x, y, 2, 2, "fr"), c.px(x, y, "r3"), c.px(x + 1, y - 1, "g6")
    elif crop == "sunflower":
        mound(c), c.vline(8, 7, 21, "g4"), c.vline(9, 9, 21, "g3")
        for y in (13, 17):
            c.ellipse(5.5, y, 2.5, 1.2, "g6"), c.ellipse(11.5, y + 1, 2.5, 1.2, "g5")
        c.disc(8.5, 5, 4.5, "y1")
        for (x, y) in [(4, 5), (13, 5), (8, 0), (8, 9), (5, 2), (12, 2), (5, 8), (12, 8)]:
            c.px(x, y, "y2")
        c.disc(8.5, 5, 2.2, "e0"), c.px(8, 4, "e1")
    elif crop == "tomato":
        leafy(c, h=12, w=4)
        for (x, y) in [(5, 14), (11, 12), (9, 17), (6, 18)]:
            c.disc(x, y, 1.6, "fr"), c.px(x - 1, y - 1, "r3")
    elif crop == "pumpkin":
        leafy(c, h=5, w=6)
        c.ellipse(9, 19, 5, 3.5, "r2")
        for x in (7, 9, 11):
            c.vline(x, 16, 22, "y0")
        c.ellipse(8, 18, 2, 1.2, "r3"), c.vline(9, 14, 16, "g3")
    elif crop == "blueberry":
        leafy(c, h=8, w=5, light="g7")
        for (x, y) in [(5, 16), (7, 14), (10, 15), (11, 18), (6, 19), (9, 18)]:
            c.px(x, y, "fb"), c.px(x + 1, y, "b0"), c.px(x, y - 1, "fb2")
    elif crop == "lavender":
        mound(c)
        for x, top in [(5, 9), (8, 7), (11, 10)]:
            c.vline(x, top + 5, 21, "g4")
            for y in range(top, top + 6):
                c.px(x - (y % 2), y, "l1"), c.px(x + 1 - (y % 2), y, "l2" if y % 2 else "l0")
    elif crop == "tulip":
        mound(c), c.vline(8, 11, 21, "g4")
        c.ellipse(6, 18, 1.5, 3, "g6"), c.ellipse(10, 18, 1.5, 3, "g5")
        c.ellipse(8, 9, 3, 3, "p1"), c.vline(7, 6, 8, "p2"), c.vline(9, 6, 8, "p2"), c.px(8, 7, "p1"), c.px(7, 7, "p3")
    return c


def frames(crop):
    s = Canvas(16, 24); seed(s)
    p = Canvas(16, 24); sprout(p)
    out = [s, p, grow(crop), mature(crop)]
    for f in out:
        f.outline("o") if False else None  # crops sit in the soil without an outline, like the environment art
    return out


def wet_soil():
    c = Canvas(32, 32)
    for y in range(32):
        for x in range(32):
            c.px(x, y, "e0" if (y % 4 in (0, 1)) else "w1")
    return c


def produce(crop):
    """Basket icons, 12x12."""
    m = mature(crop)
    c = Canvas(12, 12)
    # reuse the fruit colours in a tiny icon
    col = {"carrot": "r2", "strawberry": "fr", "sunflower": "y1", "tomato": "fr", "pumpkin": "r2",
           "blueberry": "fb", "lavender": "l1", "tulip": "p1"}[crop]
    c.disc(6, 7, 4, col), c.px(4, 5, "c1"), c.vline(6, 1, 3, "g4"), c.px(7, 2, "g6")
    c.outline("o")
    del m
    return c


def build():
    out = {f"crop_{k}": (frames(k), {}) for k in CROPS}
    out["soil_wet"] = ([wet_soil()], {"flat": True})
    out["produce"] = ([produce(k) for k in CROPS], {})
    return out
