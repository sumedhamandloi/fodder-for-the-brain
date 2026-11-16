"""Pond & Dock (Milestone 5): the Mind Garden bed and its flowers (one per saved idea)."""
import random
from px import Canvas, h01


def stem(c, x, top, bottom=23, leaf_side=1):
    c.vline(x, top, bottom, "g3")
    c.vline(x + 1, top + 2, bottom, "g4")
    ly = (top + bottom) // 2 + 2
    c.px(x + 2 * leaf_side, ly, "g6"), c.px(x + 3 * leaf_side, ly - 1, "g6"), c.px(x + leaf_side, ly + 1, "g5")


def tulip():
    c = Canvas(16, 24)
    stem(c, 7, 9)
    c.ellipse(7.5, 7, 3.5, 4, "fr")
    c.vline(6, 3, 6, "r3"), c.px(7, 3, "fr"), c.px(9, 3, "fr"), c.px(5, 4, "fr"), c.px(10, 4, "fr")
    c.vline(9, 6, 9, "r0")
    return c


def daisy():
    c = Canvas(16, 24)
    stem(c, 7, 8, leaf_side=-1)
    for dx, dy in [(-3, 0), (3, 0), (0, -3), (0, 3), (-2, -2), (2, -2), (-2, 2), (2, 2)]:
        c.px(7 + dx, 6 + dy, "fw"), c.px(8 + dx, 6 + dy, "fw")
    c.rect(7, 5, 2, 2, "y1"), c.px(8, 6, "y0")
    return c


def lavender():
    c = Canvas(16, 24)
    for x, top in [(5, 6), (8, 3), (11, 7)]:
        c.vline(x, top + 5, 23, "g4")
        for y in range(top, top + 7):
            c.px(x - (y % 2), y, "l1" if y % 3 else "l0")
            c.px(x + 1 - (y % 2), y, "l2" if y % 2 else "l1")
    return c


def sunflower():
    c = Canvas(16, 24)
    stem(c, 7, 9)
    c.disc(8, 6, 5, "y1")
    for a in range(0, 16, 2):
        c.px(8 + [5, 4, 3, 0, -3, -4, -5, -4, -3, 0, 3, 4][a % 12] * 1, 6 + [0, 2, 4, 5, 4, 2, 0, -2, -4, -5, -4, -2][a % 12], "y2")
    c.disc(8, 6, 2.5, "e0"), c.px(7, 5, "e1")
    return c


def bluebell():
    c = Canvas(16, 24)
    c.line(6, 23, 8, 4, "g3"), c.line(8, 4, 12, 6, "g4")
    for (x, y) in [(5, 9), (8, 7), (11, 9), (12, 13)]:
        c.rect(x - 1, y, 3, 3, "fb"), c.px(x - 1, y + 3, "fb2"), c.px(x + 1, y + 3, "fb2"), c.px(x, y, "fb2")
    c.px(4, 16, "g6"), c.px(3, 17, "g6")
    return c


def rose():
    c = Canvas(16, 24)
    stem(c, 7, 9, leaf_side=-1)
    c.disc(8, 6, 4, "p1")
    c.disc(8, 6, 2.6, "p2")
    c.px(8, 6, "p0"), c.px(7, 5, "p3"), c.px(9, 7, "p0"), c.px(6, 7, "p0")
    return c


def mind_bed():
    """A raised garden bed, 168x56, with room for 12 flowers in two rows."""
    c = Canvas(168, 56)
    # wooden frame
    c.rect(0, 10, 168, 46, "w2")
    c.rect(0, 10, 168, 3, "w3"), c.hline(0, 167, 10, "w4"), c.rect(0, 52, 168, 4, "w1")
    for x in (0, 164):
        c.rect(x, 6, 4, 50, "w1"), c.rect(x, 6, 4, 2, "w3")
    # soil
    for y in range(14, 51):
        for x in range(4, 164):
            col = "e1"
            if (y - 14) % 6 == 0:
                col = "e0"
            elif h01(x, y, 3) < 0.08:
                col = "e2"
            c.px(x, y, col)
    # moss creeping over the rim
    r = random.Random(4)
    for _ in range(60):
        x = r.randint(2, 165)
        c.px(x, 10 + r.randint(0, 2), r.choice(["g4", "g6", "g3"]))
    return c


def build():
    flowers = [tulip(), daisy(), lavender(), sunflower(), bluebell(), rose()]
    return {
        "mind_flowers": (flowers, {}),
        "mind_bed": ([mind_bed()], {}),
    }
