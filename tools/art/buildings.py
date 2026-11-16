"""Buildings, each in a day frame (0) and a lit-night frame (1)."""
import random
from px import Canvas, h01
from props import foliage, LEAF


def shingles(c, x0, x1, y0, y1, ramp, row=4, slope=0):
    """Staggered shingle rows. ramp = (shadow, base, light, highlight). slope narrows the top."""
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, (y1 - y0))
        inset = int(slope * (1 - t))
        rr = (y - y0) % row
        for x in range(x0 + inset, x1 - inset + 1):
            off = (row // 2) * (((y - y0) // row) % 2)
            col = ramp[1]
            if rr == row - 1:
                col = ramp[0]
            elif rr == 0:
                col = ramp[2]
            if (x + off) % 6 == 0 and rr != row - 1:
                col = ramp[0]
            if x - (x0 + inset) < 3 and rr != row - 1:
                col = ramp[2]
            if rr == 0 and h01(x, y, 4) < 0.15:
                col = ramp[3]
            c.px(x, y, col)


def window(c, x, y, w, h, lit, flowerbox=True, arched=False):
    c.rect(x - 1, y - 1, w + 2, h + 2, "w1")
    pane_a, pane_b = ("y2", "y3") if lit else ("n1", "b1")
    c.rect(x, y, w, h, pane_a)
    if lit:
        c.rect(x + 1, y + 1, w - 2, h - 2, "y3")
        c.px(x + w - 2, y + h - 2, "y1")
    else:
        for i in range(min(w, h)):
            c.px(x + i, y + h - 1 - i - 2, "b2")  # reflection streak
        c.px(x + 1, y + 1, "b3")
    c.vline(x + w // 2, y, y + h - 1, "w1")
    c.hline(x, x + w - 1, y + h // 2, "w1")
    if arched:
        c.hline(x, x + w - 1, y - 1, "w1")
    c.hline(x - 2, x + w + 1, y + h + 1, "w3")  # sill
    if flowerbox:
        c.rect(x - 1, y + h + 2, w + 2, 3, "e1")
        c.hline(x - 1, x + w, y + h + 4, "e0")
        for i in range(0, w + 2, 2):
            col = ["p2", "fr", "fw", "p3"][(i // 2) % 4]
            c.px(x - 1 + i, y + h + 1, "g4")
            c.px(x - 1 + i, y + h, col)
            c.px(x + i, y + h + 1, "g6")


def vines(c, pts, seed, flowers=True):
    r = random.Random(seed)
    for (x0, y0, x1, y1) in pts:
        for _ in range(int(abs(y1 - y0) * 1.6 + abs(x1 - x0))):
            t = r.random()
            x = x0 + (x1 - x0) * t + r.randint(-2, 2)
            y = y0 + (y1 - y0) * t + r.randint(-1, 1)
            c.px(x, y, r.choice(["g3", "g4", "g4", "g6"]))
            if flowers and r.random() < 0.08:
                c.px(x, y, "p2")
                c.px(x + 1, y, "p3")


def cottage(lit):
    c = Canvas(96, 100)
    # chimney (behind roof)
    c.rect(66, 4, 11, 22, "r0")
    for y in range(4, 26, 3):
        for x in range(66, 77):
            if (x + (y // 3) * 2) % 5 == 0 or y % 3 == 0:
                c.px(x, y, "r0")
            else:
                c.px(x, y, "r1")
    c.vline(66, 4, 25, "r2")
    c.rect(64, 1, 15, 4, "s1"), c.hline(64, 78, 1, "s3"), c.hline(64, 78, 4, "s0")
    # walls
    c.rect(6, 50, 84, 38, "c0")
    for y in range(50, 88):
        for x in range(6, 90):
            if h01(x, y, 2) < 0.05:
                c.px(x, y, "e4")
    c.rect(6, 50, 84, 4, "e3")  # shadow under eaves
    for x in (6, 28, 67, 89):
        c.rect(x, 50, 3, 38, "w2"), c.vline(x + 2, 50, 87, "w1")
    c.rect(6, 68, 84, 2, "w2"), c.hline(6, 89, 69, "w1")
    c.line(9, 70, 27, 87, "w2"), c.line(70, 87, 88, 70, "w2")
    # foundation
    for y in range(86, 94):
        for x in range(4, 92):
            col = "s2"
            if y == 86:
                col = "s3"
            if (x + (y // 4) * 5) % 9 == 0 or y % 4 == 1:
                col = "s1"
            c.px(x, y, col)
    # main roof
    shingles(c, 0, 95, 10, 50, ("r0", "r1", "r2", "r3"), row=4, slope=12)
    c.hline(0, 95, 50, "w1"), c.hline(0, 95, 51, "w0")
    # front gable
    gx0, gx1, gtop = 30, 66, 14
    c.poly([(gx0, 51), (48, gtop), (gx1, 51)], "c0")
    c.poly([(gx0 + 4, 51), (48, gtop + 8), (gx1 - 4, 51)], "c0")
    for y in range(gtop, 51):
        for x in range(gx0, gx1 + 1):
            if c.get(x, y)[:3] == (0xF0, 0xE5, 0xCB) and h01(x, y, 3) < 0.05:
                c.px(x, y, "e4")
    # gable bargeboards
    c.line(gx0 - 3, 52, 48, gtop - 3, "w1"), c.line(gx0 - 2, 52, 48, gtop - 2, "w2"), c.line(gx0 - 1, 52, 48, gtop - 1, "w3")
    c.line(gx1 + 3, 52, 48, gtop - 3, "w0"), c.line(gx1 + 2, 52, 48, gtop - 2, "w1"), c.line(gx1 + 1, 52, 48, gtop - 1, "w2")
    # round gable window
    c.disc(48, 34, 5, "w1")
    c.disc(48, 34, 4, "y2" if lit else "n1")
    if lit:
        c.disc(48, 34, 2.5, "y3")
    else:
        c.px(46, 32, "b3"), c.px(47, 32, "b2")
    c.vline(48, 30, 38, "w1"), c.hline(44, 52, 34, "w1")
    # door
    c.rect(41, 64, 14, 24, "w1")
    c.disc(48, 64, 7, "w1")
    c.rect(42, 64, 12, 24, "w2")
    c.disc(48, 64, 6, "w2")
    for x in (44, 47, 50):
        c.vline(x, 59, 87, "w1")
    c.px(52, 76, "y1"), c.px(52, 77, "y0")
    c.rect(44, 62, 8, 4, "y2" if lit else "n1")
    c.vline(48, 62, 65, "w1")
    # steps
    c.rect(39, 88, 18, 3, "s3"), c.hline(39, 56, 90, "s1")
    c.rect(37, 91, 22, 3, "s2"), c.hline(37, 58, 93, "s1")
    # windows
    window(c, 13, 58, 12, 10, lit)
    window(c, 71, 58, 12, 10, lit)
    # lamp beside door
    c.rect(57, 66, 3, 4, "s0"), c.px(58, 67, "y3" if lit else "y1")
    # vines & climbing roses
    vines(c, [(8, 88, 6, 54), (90, 88, 89, 56), (40, 60, 56, 60)], 3)
    # potted plants on steps
    for (x, col) in [(36, "p2"), (60, "y1")]:
        c.rect(x - 2, 89, 5, 4, "r1"), c.hline(x - 2, x + 2, 89, "r2")
        c.ellipse(x, 87, 3, 2, "g4"), c.px(x - 1, 86, col), c.px(x + 1, 87, col)
    return c


def bookshelf(c, x0, y0, w, h, seed):
    r = random.Random(seed)
    c.rect(x0, y0, w, h, "w0")
    cols = ["r1", "b1", "g3", "y0", "l0", "p1", "w3", "r2", "b2"]
    for sy in range(y0 + 1, y0 + h - 1, 7):
        x = x0 + 1
        while x < x0 + w - 1:
            bw = r.choice([1, 1, 2])
            bh = r.randint(4, 6)
            col = r.choice(cols)
            for xx in range(x, min(x + bw, x0 + w - 1)):
                c.vline(xx, sy + 6 - bh, sy + 5, col)
            c.px(x, sy + 6 - bh, "c0") if r.random() < 0.2 else None
            x += bw
        c.hline(x0, x0 + w - 1, sy + 6, "w2")


def library(lit):
    c = Canvas(96, 100)
    # side tower w/ conical roof
    c.rect(70, 30, 22, 58, "w2")
    for x in range(70, 92):
        for y in range(30, 88):
            if x % 4 == 0:
                c.px(x, y, "w1")
            elif x % 4 == 1:
                c.px(x, y, "w3")
    c.poly([(66, 32), (81, 2), (96, 32)], "n1")
    for y in range(2, 33):
        for x in range(66, 96):
            if c.get(x, y)[:3] == (0x25, 0x39, 0x4E):
                rr = (y - 2) % 4
                col = "n1" if rr else "n0"
                if x < 81 - (y - 2) // 2 + 3 and rr:
                    col = "l0"
                c.px(x, y, col)
    c.px(81, 1, "y1"), c.px(81, 0, "y1")
    window(c, 77, 46, 8, 12, lit, flowerbox=False)
    # main body: dark wood planks
    c.rect(4, 46, 68, 42, "w2")
    for x in range(4, 72):
        for y in range(46, 88):
            if x % 5 == 0:
                c.px(x, y, "w1")
            elif x % 5 == 1:
                c.px(x, y, "w3")
            elif h01(x, y, 6) < 0.06:
                c.px(x, y, "w1")
    c.rect(4, 46, 68, 3, "w0")
    # roof (deep brown-violet shingles)
    shingles(c, 0, 74, 14, 46, ("w0", "w1", "w2", "w3"), row=4, slope=10)
    c.hline(0, 74, 46, "w0")
    # dormer
    c.rect(28, 20, 20, 16, "w3")
    c.poly([(25, 22), (38, 10), (51, 22)], "w1")
    c.line(25, 22, 38, 9, "w0"), c.line(51, 22, 38, 9, "w0")
    window(c, 33, 24, 10, 9, lit, flowerbox=False)
    # big display window with bookshelf
    wx, wy, ww, wh = 9, 55, 34, 24
    c.rect(wx - 2, wy - 2, ww + 4, wh + 4, "w0")
    bookshelf(c, wx, wy, ww, wh, 3)
    if lit:
        for y in range(wy, wy + wh):
            for x in range(wx, wx + ww):
                if c.get(x, y)[:3] == (0x2E, 0x1D, 0x17):
                    c.px(x, y, "y1")
        c.rect(wx + 14, wy + 2, 5, 4, "y3")
    else:
        for i in range(0, 14):
            c.px(wx + 3 + i, wy + wh - 4 - i, "b3")
            c.px(wx + 4 + i, wy + wh - 4 - i, "b4")
    c.vline(wx + ww // 2, wy, wy + wh - 1, "w0")
    c.hline(wx - 3, wx + ww + 2, wy + wh + 1, "w3")
    # door
    c.rect(51, 60, 15, 28, "w0")
    c.rect(52, 61, 13, 27, "w1")
    for y in range(61, 88, 5):
        c.hline(52, 64, y, "w0")
    c.rect(54, 63, 9, 6, "y2" if lit else "n1")
    c.px(63, 75, "y1")
    # hanging sign with a book
    c.hline(46, 55, 50, "s0")
    c.rect(46, 51, 10, 8, "c0")
    c.rect(46, 51, 10, 1, "w1"), c.rect(46, 58, 10, 1, "w1")
    c.rect(48, 53, 3, 4, "fr"), c.rect(51, 53, 3, 4, "fr"), c.vline(51, 53, 56, "r0")
    # foundation
    for y in range(88, 94):
        for x in range(2, 94):
            col = "s1" if (x + (y // 3) * 4) % 8 == 0 or y % 3 == 0 else "s2"
            c.px(x, y, col)
    c.hline(2, 93, 88, "s3")
    # book stack & plants
    for i, col in enumerate(["b1", "fr", "y0", "g3"]):
        c.rect(70 - i, 85 - i * 2, 8, 2, col)
        c.hline(70 - i, 77 - i, 85 - i * 2, "c0")
    foliage(c, 4, 84, 6, 6, LEAF, 31, npuff=5, prad=(3, 4), clumps=8)
    vines(c, [(5, 86, 4, 50)], 8)
    return c


def glasshouse(lit):
    c = Canvas(84, 88)
    x0, x1 = 4, 79
    top = 34
    # interior background
    bg = "b4" if not lit else "n1"
    c.rect(x0, top, x1 - x0 + 1, 40, bg)
    c.poly([(x0, top), (42, 6), (x1, top)], bg)
    # plants inside (behind glass)
    r = random.Random(5)
    for i in range(9):
        px_ = 10 + i * 8 + r.randint(-2, 2)
        py_ = r.randint(42, 58)
        foliage(c, px_, py_, 6, 8, ["g2", "g3", "g4", "g6", "g7"], 40 + i, npuff=5, prad=(3, 4.5), clumps=10,
                accent=(["p2", "fr", "y1", "l1"], 3, "fw"))
    for (px_, py_) in [(24, 28), (42, 22), (60, 28)]:
        foliage(c, px_, py_, 7, 6, ["g2", "g3", "g4", "g6"], px_, npuff=5, prad=(3, 4), clumps=6)
    # potting bench
    c.rect(8, 64, 68, 3, "w3"), c.hline(8, 75, 66, "w1")
    for x in range(12, 76, 10):
        c.rect(x, 61, 5, 4, "r1"), c.hline(x, x + 4, 61, "r2")
    if lit:
        for (lx, ly) in [(20, 40), (42, 30), (64, 40)]:
            c.rect(lx, ly, 2, 2, "y3"), c.px(lx - 1, ly, "y2"), c.px(lx + 2, ly + 1, "y2")
    # glass tint: reflection streaks on panes
    for y in range(6, top + 40):
        for x in range(x0, x1 + 1):
            if not c.opaque(x, y):
                continue
            k = (x + y) % 23
            if k in (0, 1) and not lit:
                c.px(x, y, "c1")
            elif k == 2 and not lit:
                c.px(x, y, "b3")
    # frame
    F, FL = "s0", "s1"
    for x in range(x0, x1 + 1, 12):
        c.vline(x, top, top + 39, F)
        c.vline(x + 1, top, top + 39, FL)
    c.vline(x1, top, top + 39, F)
    c.hline(x0, x1, top, F), c.hline(x0, x1, top + 1, FL)
    c.hline(x0, x1, top + 20, F)
    for i in range(5):
        c.line(x0 + i * 9, top, 42, 6, F) if i else None
        c.line(x1 - i * 9, top, 42, 6, F) if i else None
    c.line(x0, top, 42, 6, F), c.line(x1, top, 42, 6, F)
    c.line(x0 - 1, top, 42, 5, FL), c.line(x1 + 1, top, 42, 5, F)
    c.rect(40, 3, 5, 4, "s1"), c.px(42, 2, "y1")  # finial
    # door
    c.rect(36, 50, 13, 24, F)
    c.rect(37, 51, 5, 23, "b3" if not lit else "y2"), c.rect(43, 51, 5, 23, "b3" if not lit else "y2")
    c.px(41, 62, "y1"), c.px(43, 62, "y1")
    # brick plinth
    for y in range(74, 84):
        for x in range(x0 - 2, x1 + 3):
            col = "r1" if ((x + (y // 3) * 3) % 7 and y % 3) else "r0"
            if y == 74:
                col = "s3"
            c.px(x, y, col)
    c.rect(36, 74, 13, 10, "s2"), c.hline(36, 48, 74, "s3")
    vines(c, [(x0, 82, x0 + 2, 50), (x1, 82, x1 - 1, 56)], 9)
    return c


def pavilion(lit):
    c = Canvas(88, 76)
    # floor platform
    c.rect(4, 48, 80, 24, "s1")
    for y in range(49, 70):
        for x in range(6, 82):
            tx, ty = (x - 6) // 8, (y - 49) // 7
            col = ["s3", "s4"][(tx + ty) % 2]
            if (tx, ty) in [(2, 1), (5, 2), (7, 0), (3, 2), (6, 1)]:
                col = ["l1", "y1", "g6", "p2", "b3"][(tx + ty) % 5]
            if (x - 6) % 8 == 0 or (y - 49) % 7 == 0:
                col = "s2"
            c.px(x, y, col)
    c.hline(4, 83, 70, "s0"), c.hline(4, 83, 71, "s0")
    # little puzzle table
    c.rect(36, 52, 16, 6, "w3"), c.hline(36, 51, 52, "w4"), c.vline(38, 58, 62, "w1"), c.vline(49, 58, 62, "w1")
    for i, col in enumerate(["fr", "fb", "y1", "g6"]):
        c.rect(38 + i * 3, 50, 2, 2, col)
    # posts
    for x in (8, 76):
        c.rect(x, 22, 5, 46, "w2"), c.vline(x, 22, 67, "w3"), c.vline(x + 4, 22, 67, "w1")
    # roof: lavender canvas with scalloped hem
    c.poly([(0, 26), (44, 2), (87, 26)], "l1")
    for y in range(2, 32):
        for x in range(0, 88):
            if c.get(x, y)[:3] == (0xA9, 0x9A, 0xCB):
                stripe = ((x - 44) // 8) % 2
                col = "l1" if stripe else "l2"
                if x > 44 + (y - 2) * 0.6:
                    col = "l0" if stripe else "l1"
                c.px(x, y, col)
    for x in range(0, 88):
        k = x % 8
        depth = [2, 3, 4, 4, 4, 3, 2, 1][k]
        for d in range(depth):
            c.px(x, 26 + d, "l0" if d == depth - 1 else ("l2" if (x // 8) % 2 == 0 else "l1"))
    c.line(0, 26, 44, 2, "l0"), c.line(87, 26, 44, 2, "l0")
    c.rect(42, 0, 5, 4, "y1"), c.px(44, 0, "y2")
    # bunting
    for i, x in enumerate(range(14, 76, 6)):
        c.px(x, 33 + (i % 2), ["p2", "y1", "b3", "g6"][i % 4])
        c.px(x + 1, 33, ["p2", "y1", "b3", "g6"][i % 4])
    if lit:
        for x in (20, 68):
            c.rect(x, 30, 3, 3, "y3"), c.px(x + 1, 29, "s0")
    return c


def build():
    return {
        "bld_cottage": ([cottage(False), cottage(True)], {"body": [-46, -18, 92, 18], "bodies": [[-40, -52, 80, 34]], "door": [0, 2]}),
        "bld_library": ([library(False), library(True)], {"body": [-46, -18, 92, 18], "bodies": [[-44, -50, 88, 32]], "door": [10, 2]}),
        "bld_glasshouse": ([glasshouse(False), glasshouse(True)], {"body": [-40, -14, 80, 14], "bodies": [[-36, -48, 72, 34]], "door": [0, 2]}),
        "bld_pavilion": ([pavilion(False), pavilion(True)], {"bodies": [[-36, -10, 6, 6], [30, -10, 6, 6], [-10, -22, 20, 6]], "door": [0, 2]}),
    }
