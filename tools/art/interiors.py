"""Interior scenes. Front-facing room cutaway (as in the guide's interior mock-ups), 480x270 art px.

The Little Library: tall shelves, an arched rainy window with a window seat, a stone fireplace
with a mantel, a reading desk and an armchair, all in warm lamplight.
"""
import random
from px import Canvas, h01
from buildings import bookshelf
from props import foliage, LEAF

W, H = 480, 270
FLOOR_Y = 150


def plank_wall(c, x0, y0, x1, y1):
    for y in range(y0, y1):
        for x in range(x0, x1):
            col = "w1"
            if x % 12 == 0:
                col = "w0"
            elif x % 12 == 1:
                col = "w2"
            elif h01(x, y, 31) < 0.04:
                col = "w0"
            c.px(x, y, col)
    # wainscot rail
    c.rect(x0, y1 - 22, x1 - x0, 2, "w3"), c.rect(x0, y1 - 20, x1 - x0, 1, "w0")


def floor(c):
    for y in range(FLOOR_Y, H):
        row = (y - FLOOR_Y) // 9
        for x in range(W):
            off = (row * 37) % 60
            col = "w2"
            if (y - FLOOR_Y) % 9 == 0:
                col = "w1"
            elif (x + off) % 60 == 0:
                col = "w1"
            elif (y - FLOOR_Y) % 9 == 1:
                col = "w3"
            elif h01(x, y, 7) < 0.03:
                col = "w1"
            c.px(x, y, col)
    c.rect(0, FLOOR_Y, W, 2, "w0")  # skirting shadow


def rug(c, cx, cy, rx, ry):
    c.ellipse(cx, cy + 2, rx, ry, "w1")
    c.ellipse(cx, cy, rx, ry, "r0")
    c.ellipse(cx, cy, rx - 4, ry - 3, "r1")
    c.ellipse(cx, cy, rx - 7, ry - 5, "r0")
    c.ellipse(cx, cy, rx - 9, ry - 7, "r1")
    for x in range(int(cx - rx + 12), int(cx + rx - 12), 8):
        for y in (cy - ry + 6, cy + ry - 7):
            c.px(x, y, "y1"), c.px(x + 1, y, "y0")
    c.ellipse(cx, cy, rx * 0.35, ry * 0.35, "y0")
    c.ellipse(cx, cy, rx * 0.25, ry * 0.25, "r2")


def tall_shelf(c, x0, y0, w, h, seed):
    c.rect(x0 - 4, y0 - 6, w + 8, h + 6, "w2")
    c.rect(x0 - 4, y0 - 6, w + 8, 3, "w3")
    c.vline(x0 - 4, y0 - 6, y0 + h - 1, "w3"), c.vline(x0 + w + 3, y0 - 6, y0 + h - 1, "w1")
    bookshelf(c, x0, y0, w, h - 4, seed)
    c.rect(x0 - 4, y0 + h - 4, w + 8, 4, "w1")
    # a few trinkets on shelves
    r = random.Random(seed)
    for _ in range(4):
        sx = x0 + r.randint(4, w - 8)
        sy = y0 + 1 + 7 * r.randint(1, (h - 8) // 7 - 1)
        kind = r.choice(["plant", "jar", "skull"])
        if kind == "plant":
            c.rect(sx, sy + 3, 4, 3, "r1"), c.px(sx + 1, sy + 2, "g6"), c.px(sx + 2, sy + 1, "g4"), c.px(sx, sy + 2, "g4")
        elif kind == "jar":
            c.rect(sx, sy + 2, 3, 4, "b3"), c.px(sx + 1, sy + 1, "s2"), c.px(sx, sy + 3, "b4")
        else:
            c.rect(sx, sy + 3, 4, 3, "c0"), c.px(sx + 1, sy + 4, "o"), c.px(sx + 3, sy + 4, "o")


def arched_window(c, x0, y0, w, h):
    cx = x0 + w / 2
    r = w / 2
    # glass: dusk sky with baked rain streaks (animated drops are added in-engine)
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            dy = y - (y0 + r)
            if dy < 0 and (x + 0.5 - cx) ** 2 + dy ** 2 > r * r:
                continue
            pass  # glass left transparent: the engine paints the live sky (time, season, weather) behind it
    # distant treeline silhouette
    for x in range(x0, x0 + w):
        top = y0 + h - 18 + int(4 * h01(x // 6, 0, 3)) + (x % 6 in (0, 5)) * 2
        for y in range(top, y0 + h):
            c.px(x, y, "g0")
    # frame
    for y in range(y0 - 4, y0 + h + 4):
        for x in range(x0 - 4, x0 + w + 4):
            dy = y - (y0 + r)
            d_out = (x + 0.5 - cx) ** 2 + dy ** 2
            inside = (dy >= 0 or d_out <= r * r) and x0 <= x < x0 + w and y < y0 + h
            near = (dy >= 0 or d_out <= (r + 4) ** 2) and x0 - 4 <= x < x0 + w + 4
            if near and not inside:
                c.px(x, y, "w0" if (dy < 0 and d_out > (r + 2.5) ** 2) or x in (x0 - 4, x0 + w + 3) else "w2")
    c.vline(int(cx), y0, y0 + h - 1, "w0"), c.vline(int(cx) + 1, y0, y0 + h - 1, "w2")
    for yy in (y0 + int(r), y0 + int(r) + (h - int(r)) // 2):
        c.hline(x0, x0 + w - 1, yy, "w0"), c.hline(x0, x0 + w - 1, yy + 1, "w2")


def window_seat(c, x0, y0, w):
    c.rect(x0, y0, w, 6, "w3"), c.hline(x0, x0 + w - 1, y0, "w4")
    c.rect(x0 + 2, y0 - 6, w - 4, 7, "p1"), c.hline(x0 + 2, x0 + w - 3, y0 - 6, "p2")
    for i, px_ in enumerate((x0 + 8, x0 + w - 24)):
        col = ["l1", "y1"][i]
        c.rect(px_, y0 - 14, 16, 9, col), c.hline(px_, px_ + 15, y0 - 14, "c1" if i else "l2")
        c.vline(px_ + 15, y0 - 13, y0 - 6, "l0" if not i else "y0")
    c.rect(x0, y0 + 6, w, 20, "w2")
    for x in range(x0 + 6, x0 + w - 6, 22):
        c.rect(x, y0 + 9, 18, 14, "w1"), c.rect(x + 1, y0 + 10, 16, 12, "w2")


def fireplace(c, x0, y0, w, h):
    c.rect(x0 - 10, y0 - 10, w + 20, 6, "w3"), c.hline(x0 - 10, x0 + w + 9, y0 - 10, "w4"), c.hline(x0 - 10, x0 + w + 9, y0 - 5, "w0")
    for y in range(y0 - 4, y0 + h):
        for x in range(x0 - 6, x0 + w + 6):
            col = "s2"
            if (y - y0) % 6 == 0 or (x + ((y - y0) // 6) * 7) % 13 == 0:
                col = "s1"
            if h01(x, y, 2) < 0.05:
                col = "s3"
            c.px(x, y, col)
    # firebox arch
    ix0, iw = x0 + 10, w - 20
    for y in range(y0 + 10, y0 + h):
        for x in range(ix0, ix0 + iw):
            dy = y - (y0 + 10 + iw / 2)
            if dy < 0 and (x + 0.5 - (ix0 + iw / 2)) ** 2 + dy ** 2 > (iw / 2) ** 2:
                continue
            c.px(x, y, "o" if y < y0 + h - 8 else "w0")
    # logs
    c.rect(ix0 + 6, y0 + h - 9, iw - 12, 3, "w2"), c.rect(ix0 + 10, y0 + h - 12, iw - 20, 3, "w1")
    c.rect(x0 - 8, y0 + h, w + 16, 3, "s3")
    # mantel décor
    for (dx, col) in [(0, "y2"), (6, "y2")]:
        c.rect(x0 + 4 + dx, y0 - 17, 2, 7, "c1"), c.px(x0 + 4 + dx, y0 - 18, col)
    c.rect(x0 + w - 18, y0 - 18, 10, 8, "y0"), c.rect(x0 + w - 17, y0 - 17, 8, 6, "b1")  # small painting
    c.px(x0 + w - 14, y0 - 14, "y2")
    for i, col in enumerate(["fr", "b1", "g3"]):
        c.rect(x0 + w // 2 - 6 + i * 3, y0 - 19, 2, 9, col)


def lib_desk():
    c = Canvas(96, 48)
    c.rect(4, 14, 88, 6, "w3"), c.hline(4, 91, 14, "w4"), c.hline(4, 91, 19, "w1")
    c.rect(6, 20, 84, 16, "w2")
    for x in (8, 50):
        c.rect(x, 22, 38, 12, "w1"), c.rect(x + 1, 23, 36, 10, "w2"), c.rect(x + 17, 27, 4, 2, "y0")
    c.rect(6, 36, 4, 12, "w1"), c.rect(86, 36, 4, 12, "w1")
    # open book
    c.poly([(30, 13), (46, 10), (46, 14), (30, 15)], "c1"), c.poly([(46, 10), (62, 13), (62, 15), (46, 14)], "c0")
    c.vline(46, 10, 14, "e3")
    for y in (12, 13):
        c.hline(33, 43, y, "s3"), c.hline(49, 59, y, "s3")
    # candle + stacked books + quill pot
    c.rect(72, 5, 3, 9, "c1"), c.px(73, 4, "y2"), c.px(73, 3, "y3"), c.rect(70, 13, 7, 2, "y0")
    for i, col in enumerate(["b1", "r1", "g3"]):
        c.rect(10 + i, 11 - i * 3, 14, 3, col), c.hline(10 + i, 23 + i, 11 - i * 3, "c0")
    c.rect(82, 9, 4, 5, "s0"), c.line(84, 9, 88, 2, "c1")
    c.outline("w0")
    return c


def lib_chair():
    c = Canvas(56, 52)
    c.rect(8, 6, 40, 30, "p0"), c.ellipse(28, 8, 20, 6, "p1")
    c.rect(10, 8, 36, 24, "p1"), c.hline(12, 43, 9, "p2")
    for x in (2, 46):
        c.rect(x, 20, 8, 22, "p0"), c.ellipse(x + 4, 20, 4, 3, "p1")
    c.rect(10, 30, 36, 10, "p1"), c.hline(10, 45, 30, "p2")
    c.rect(4, 42, 48, 4, "p0")
    for x in (6, 46):
        c.rect(x, 46, 3, 6, "w1")
    c.rect(20, 18, 14, 10, "y1"), c.hline(20, 33, 18, "y2")  # cushion
    c.outline("o")
    return c


def floor_lamp():
    c = Canvas(20, 64)
    c.rect(9, 18, 2, 44, "w1"), c.rect(5, 61, 10, 3, "w0")
    c.poly([(3, 18), (17, 18), (14, 4), (6, 4)], "y1")
    c.hline(6, 13, 4, "y2"), c.vline(16, 9, 17, "y0"), c.hline(3, 16, 18, "y0")
    c.outline("o")
    return c


def library_room():
    c = Canvas(W, H)
    plank_wall(c, 0, 0, W, FLOOR_Y)
    c.rect(0, 0, W, 6, "w3"), c.hline(0, W - 1, 6, "w0")  # crown moulding
    floor(c)
    tall_shelf(c, 14, 16, 140, 132, 11)
    tall_shelf(c, 330, 16, 136, 62, 12)
    arched_window(c, 180, 18, 120, 98)
    window_seat(c, 172, 126, 136)
    fireplace(c, 352, 100, 92, 50)
    # ladder against the left shelf
    for x in (130, 142):
        c.line(x, 18, x + 10, 150, "w3"), c.line(x + 1, 18, x + 11, 150, "w1")
    for y in range(28, 148, 12):
        t = (y - 18) / 132
        c.hline(131 + int(10 * t), 142 + int(10 * t), y, "w4")
    # plants
    foliage(c, 166, 136, 9, 10, LEAF, 3, npuff=6, prad=(3, 4.5), clumps=14)
    c.rect(160, 140, 12, 10, "r1"), c.hline(160, 171, 140, "r2")
    foliage(c, 318, 136, 9, 10, LEAF, 4, npuff=6, prad=(3, 4.5), clumps=14)
    c.rect(312, 140, 12, 10, "r1"), c.hline(312, 323, 140, "r2")
    # hanging ivy from the crown moulding
    r = random.Random(9)
    for x0 in (176, 300):
        for i in range(30):
            c.px(x0 + r.randint(-4, 4), 7 + i, r.choice(["g3", "g4", "g6"]))
    rug(c, 240, 210, 118, 36)
    # door mat (exit)
    c.rect(214, 254, 52, 12, "e1"), c.rect(216, 256, 48, 8, "e2")
    for x in range(218, 262, 4):
        c.vline(x, 257, 262, "e1")
    return c


def fire(i):
    c = Canvas(28, 22)
    r = random.Random(i * 13 + 1)
    for k in range(9):
        x = 4 + k * 2.4 + r.uniform(-1, 1)
        hgt = r.randint(9, 19)
        for y in range(22 - hgt, 22):
            t = (y - (22 - hgt)) / hgt
            col = "y3" if t > 0.7 and abs(x - 14) < 6 else ("y2" if t > 0.45 else ("y1" if t > 0.2 else "r2"))
            c.px(x, y, col), c.px(x + 1, y, col)
    for _ in range(3):
        c.px(r.randint(6, 22), r.randint(0, 8), "y2")
    return c


def raindrop(i):
    c = Canvas(3, 8)
    c.vline(1, 0 + i, 3 + i, "b3")
    c.px(1, 4 + i, "b4")
    return c


def plaster_wall(c, x0, y0, x1, y1):
    for y in range(y0, y1):
        for x in range(x0, x1):
            c.px(x, y, "e4" if h01(x, y, 41) < 0.06 else "c0")
    for x in range(x0, x1, 64):
        c.rect(x, y0, 4, y1 - y0, "w2"), c.vline(x + 3, y0, y1 - 1, "w1")
    c.rect(x0, y0 + 40, x1 - x0, 3, "w2"), c.hline(x0, x1 - 1, y0 + 42, "w1")
    # wainscot
    for y in range(y1 - 34, y1):
        for x in range(x0, x1):
            c.px(x, y, "w1" if x % 10 == 0 else ("w3" if x % 10 == 1 else "w2"))
    c.rect(x0, y1 - 36, x1 - x0, 2, "w4")


def square_window(c, x0, y0, w, h, curtains="l1"):
    c.rect(x0 - 4, y0 - 4, w + 8, h + 8, "w1")
    c.rect(x0 - 3, y0 - 3, w + 6, h + 6, "w3")
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c.pix[x, y] = (0, 0, 0, 0)  # live sky shows through
    c.vline(x0 + w // 2, y0, y0 + h - 1, "w2"), c.hline(x0, x0 + w - 1, y0 + h // 2, "w2")
    c.rect(x0 - 6, y0 + h + 3, w + 12, 4, "w3"), c.hline(x0 - 6, x0 + w + 5, y0 + h + 3, "w4")
    # curtains
    dark = {"l1": "l0", "p2": "p1", "y1": "y0"}[curtains]
    for side in (x0 - 14, x0 + w + 4):
        c.rect(side, y0 - 6, 10, h + 14, curtains)
        for x in range(side, side + 10, 3):
            c.vline(x, y0 - 6, y0 + h + 7, dark)
    c.rect(x0 - 16, y0 - 9, w + 32, 3, "w2")


def quilt_bed(c, x0, y0):
    c.rect(x0, y0, 112, 14, "w2"), c.rect(x0, y0, 112, 3, "w3")  # headboard
    c.rect(x0 + 2, y0 + 14, 108, 36, "c1")
    for k in range(6):
        for j in range(3):
            col = ["p1", "y1", "l1", "p2", "g6", "b3"][(k + j * 2) % 6]
            c.rect(x0 + 4 + k * 18, y0 + 24 + j * 9, 16, 8, col)
    c.rect(x0 + 8, y0 + 16, 30, 8, "c1"), c.rect(x0 + 74, y0 + 16, 30, 8, "c1")
    c.hline(x0 + 8, x0 + 37, y0 + 23, "e4"), c.hline(x0 + 74, x0 + 103, y0 + 23, "e4")
    c.rect(x0, y0 + 50, 112, 6, "w1")
    for x in (x0, x0 + 108):
        c.rect(x, y0 + 50, 4, 10, "w0")


def stove(c, x0, y0):
    c.rect(x0 + 18, 0, 8, y0, "s0"), c.vline(x0 + 19, 0, y0 - 1, "s1")  # pipe
    c.rect(x0, y0, 44, 40, "s0")
    c.rect(x0 + 2, y0 + 2, 40, 3, "s1")
    c.rect(x0 + 8, y0 + 12, 28, 18, "o")
    c.rect(x0 + 10, y0 + 14, 24, 14, "r0")
    for x in range(x0 + 11, x0 + 33, 3):
        c.vline(x, y0 + 20, y0 + 27, "y1"), c.px(x + 1, y0 + 18, "r2")
    c.rect(x0 + 4, y0 + 40, 4, 6, "s0"), c.rect(x0 + 36, y0 + 40, 4, 6, "s0")
    # kettle
    c.ellipse(x0 + 30, y0 - 4, 6, 4, "b1"), c.ellipse(x0 + 29, y0 - 5, 4, 2, "b2"), c.line(x0 + 36, y0 - 6, x0 + 39, y0 - 9, "b1")


def wall_shelves(c, x0, y0, w):
    r = random.Random(5)
    for k in range(3):
        y = y0 + k * 24
        c.rect(x0, y + 18, w, 3, "w3"), c.hline(x0, x0 + w - 1, y + 20, "w1")
        x = x0 + 2
        while x < x0 + w - 8:
            kind = r.choice(["jar", "jar", "plant", "book"])
            if kind == "jar":
                col = r.choice(["y1", "fr", "l1", "g6", "r2"])
                c.rect(x, y + 10, 6, 8, "b4"), c.rect(x + 1, y + 12, 4, 6, col), c.rect(x, y + 8, 6, 2, "w2")
                x += 9
            elif kind == "plant":
                c.rect(x, y + 12, 7, 6, "r1"), c.ellipse(x + 3, y + 9, 5, 4, "g4"), c.px(x + 2, y + 7, "g7")
                x += 10
            else:
                for i in range(3):
                    c.rect(x + i * 2, y + 6, 2, 12, r.choice(["b1", "fr", "g3", "y0"]))
                x += 8


def cottage_room():
    c = Canvas(W, H)
    plaster_wall(c, 0, 0, W, FLOOR_Y)
    c.rect(0, 0, W, 5, "w2")
    floor(c)
    quilt_bed(c, 24, 94)
    square_window(c, 204, 28, 72, 64, curtains="l1")
    stove(c, 330, 104)
    wall_shelves(c, 392, 40, 76)
    # hanging dried herbs and a little framed picture
    for x in range(140, 180, 8):
        c.vline(x, 6, 18, "w2"), c.ellipse(x, 22, 2.5, 5, "g4"), c.px(x, 20, "l1")
    c.rect(300, 30, 18, 14, "w1"), c.rect(302, 32, 14, 10, "b2"), c.rect(302, 38, 14, 4, "g4"), c.px(309, 34, "y2")
    rug(c, 240, 214, 104, 32)
    c.rect(214, 254, 52, 12, "e1"), c.rect(216, 256, 48, 8, "e2")
    for x in range(218, 262, 4):
        c.vline(x, 257, 262, "e1")
    return c


def cottage_table():
    c = Canvas(72, 44)
    c.rect(2, 10, 68, 6, "w3"), c.hline(2, 69, 10, "w4"), c.hline(2, 69, 15, "w1")
    for x in (6, 62):
        c.rect(x, 16, 4, 26, "w1")
    # basket of produce
    c.ellipse(36, 8, 12, 4, "w2"), c.rect(24, 4, 24, 6, "w2")
    for i in range(24, 48, 3):
        c.vline(i, 4, 9, "w3")
    for (x, col) in [(28, "fr"), (33, "r2"), (38, "y1"), (43, "fb")]:
        c.disc(x, 2, 2.5, col)
    c.rect(54, 2, 4, 8, "c1"), c.px(55, 1, "y2")  # candle
    c.outline("w0")
    return c


def glasshouse_room():
    c = Canvas(W, H)
    # glass back wall: transparent panes in a dark green-grey frame
    for y in range(0, FLOOR_Y):
        for x in range(W):
            c.pix[x, y] = (0, 0, 0, 0)
    for x in range(0, W, 40):
        c.rect(x, 0, 4, FLOOR_Y, "s0"), c.vline(x + 1, 0, FLOOR_Y - 1, "s1")
    for y in (0, 48, 100):
        c.rect(0, y, W, 3, "s0"), c.hline(0, W - 1, y + 1, "s1")
    # low brick plinth
    for y in range(FLOOR_Y - 26, FLOOR_Y):
        for x in range(W):
            c.px(x, y, "r1" if ((x + ((y // 4) % 2) * 6) % 12 and y % 4) else "r0")
    c.hline(0, W - 1, FLOOR_Y - 26, "s3")
    # stone tile floor
    for y in range(FLOOR_Y, H):
        for x in range(W):
            tx, ty = (x + ((y - FLOOR_Y) // 16) * 8) // 16, (y - FLOOR_Y) // 16
            col = "s3" if (tx + ty) % 2 else "s2"
            if (x + ((y - FLOOR_Y) // 16) * 8) % 16 == 0 or (y - FLOOR_Y) % 16 == 0:
                col = "s1"
            if h01(x, y, 61) < 0.03:
                col = "g4"  # moss between the stones
            c.px(x, y, col)
    # planting benches along the glass with pots and greenery
    r = random.Random(8)
    for bx in (12, 250):
        c.rect(bx, 96, 218, 6, "w3"), c.hline(bx, bx + 217, 96, "w4"), c.rect(bx, 102, 218, 22, "w2")
        for x in range(bx + 8, bx + 210, 22):
            c.rect(x, 86, 12, 10, "r1"), c.hline(x, x + 11, 86, "r2")
            foliage(c, x + 6, 74, r.randint(7, 10), r.randint(9, 13), ["g2", "g3", "g4", "g6", "g7"], x, npuff=6, prad=(3, 5), clumps=12,
                    accent=(["p2", "fr", "y1", "l1", "fw"], r.randint(0, 4), "c1"))
    # hanging plants
    for x in (60, 180, 300, 420):
        c.vline(x, 3, 18, "w1")
        c.rect(x - 6, 18, 12, 7, "r1")
        for i in range(10):
            c.px(x - 6 + r.randint(0, 12), 25 + r.randint(0, 14), r.choice(["g3", "g4", "g6"]))
    c.rect(214, 254, 52, 12, "e1"), c.rect(216, 256, 48, 8, "e2")
    return c


def potting_table():
    c = Canvas(88, 44)
    c.rect(2, 12, 84, 6, "w3"), c.hline(2, 85, 12, "w4"), c.hline(2, 85, 17, "w1")
    for x in (6, 78):
        c.rect(x, 18, 4, 24, "w1")
    c.rect(10, 4, 12, 8, "r1"), c.ellipse(16, 2, 5, 3, "g6"), c.px(15, 0, "g8")  # seedling
    c.rect(60, 4, 12, 8, "r1"), c.ellipse(66, 2, 5, 3, "g4"), c.px(66, 0, "p2")
    c.poly([(34, 4), (52, 4), (54, 12), (32, 12)], "s2"), c.line(52, 6, 58, 2, "s1")  # watering can
    c.rect(36, 2, 6, 3, "c1")  # a notebook of thought experiments
    c.outline("w0")
    return c


def garden_bench():
    c = Canvas(48, 28)
    c.rect(2, 4, 44, 4, "w3"), c.hline(2, 45, 4, "w4")
    c.rect(2, 14, 44, 5, "w2"), c.hline(2, 45, 14, "w4")
    for x in (5, 41):
        c.rect(x, 4, 3, 22, "s0")
    c.outline("o")
    return c


def build():
    return {
        "room_cottage": ([cottage_room()], {}),
        "cottage_table": ([cottage_table()], {}),
        "room_glasshouse": ([glasshouse_room()], {}),
        "gh_table": ([potting_table()], {}),
        "gh_bench": ([garden_bench()], {}),
        "room_library": ([library_room()], {}),
        "lib_desk": ([lib_desk()], {}),
        "lib_chair": ([lib_chair()], {}),
        "lib_lamp": ([floor_lamp()], {}),
        "fx_fire": ([fire(i) for i in range(4)], {"anim": 7}),
        "fx_rain": ([raindrop(i) for i in range(4)], {}),
    }
