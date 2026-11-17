"""Layered avatar parts (Milestone 3).

Every part is a sheet of 18 frames (24x32), laid out like the player sheet:
rows down, up, side(right); columns idle0 idle1 walk0..3.
Parts are drawn WITHOUT outline; the client composes the layers and adds the 1px outline.
Each category atlas stacks its variants vertically (one 144x96 block per variant).

Compose order (client): pack_back, hair_back, skin, shoes, outfit, eyes, hair_front, hat, acc, pack_front
"""
from px import Canvas

FW, FH, COLS = 24, 32, 6
STRIDE = [1, 0, -1, 0]
BOB = [0, 1, 0, 1]
VIEWS = ("down", "up", "side")

# ---------------------------------------------------------------- option tables
SKINS = {
    "porcelain": ("k1", "k1s"), "peach": ("k2", "k2s"), "honey": ("k3", "k3s"),
    "tan": ("k4", "k4s"), "umber": ("k5", "k5s"), "ebony": ("k6", "k6s"),
}
HAIR_COLORS = {
    "black": ("w0", "h0", "h1"), "espresso": ("h0", "h1", "h2"), "chestnut": ("h1", "h2", "h3"),
    "auburn": ("r0", "r1", "r2"), "honey": ("y0", "y1", "y2"), "rose": ("p0", "p1", "p2"),
    "silver": ("s2", "s3", "s4"),
}
HAIRSTYLES = ["bob", "short", "long", "buns", "ponytail", "curly", "crop", "sidepart", "spiky"]
CROPPED = ("crop", "sidepart", "spiky")
EYES = ["round", "dot", "happy", "lashes"]
OUTFITS = ["blouse", "tee", "dress", "overalls", "sweater", "shirt", "hoodie"]
OUTFIT_COLORS = {
    "sage": ("g3", "g4", "g6"), "cream": ("e3", "c0", "c1"), "rose": ("p0", "p1", "p2"),
    "sky": ("b1", "b2", "b3"), "lavender": ("l0", "l1", "l2"), "marigold": ("y0", "y1", "y2"),
    "forest": ("g1", "g2", "g3"), "terracotta": ("r0", "r1", "r2"),
}
SHOES = {"brown": ("w0", "w1"), "white": ("s2", "c1"), "red": ("r0", "fr"), "black": ("w0", "s0")}
HATS = ["none", "straw", "beanie", "flowers", "bucket"]
ACCS = ["none", "glasses", "scarf", "bow"]
PACKS = ["none", "satchel", "backpack"]

DEFAULT = {"skin": "peach", "hairStyle": "bob", "hairColor": "chestnut", "eyes": "round", "outfit": "blouse",
           "outfitColor": "sage", "shoes": "brown", "hat": "straw", "accessory": "none", "backpack": "none"}

CREAM = ("e3", "c0", "c1")
BROWN_PANTS = ("w1", "w2", "w3")
DARK_PANTS = ("w0", "w1", "w2")


def frames():
    for view in VIEWS:
        for kind, n in (("idle", 2), ("walk", 4)):
            for i in range(n):
                if kind == "idle":
                    yield view, 0, 0, i == 1
                else:
                    yield view, BOB[i], STRIDE[i], False


def sheet_of(draw):
    """draw(c, view, by, stride, blink) -> 144x96 sheet."""
    s = Canvas(FW * COLS, FH * 3)
    for n, (view, by, stride, blink) in enumerate(frames()):
        c = Canvas(FW, FH)
        draw(c, view, by, stride, blink)
        s.paste(c, (n % COLS) * FW, (n // COLS) * FH)
    return s


# ---------------------------------------------------------------- skin (head, hands, legs)
def draw_skin(ramp):
    sk, sks = ramp

    def d(c, view, by, stride, blink):
        # legs (covered by trousers when an outfit has them)
        if view == "side":
            for i, off in enumerate((-stride * 2, stride * 2)):
                c.rect(11 + off, 26 + by, 3, 3, sks if i == 0 else sk)
        else:
            for i, lx in enumerate((9, 13)):
                lift = 1 if (stride > 0 and i == 0) or (stride < 0 and i == 1) else 0
                c.rect(lx, 26 + by - lift, 3, 3, sks if i else sk)
        # hands
        if view == "side":
            c.rect(12 + stride, 23 + by, 2, 1, sk)
        else:
            for side, ax in ((0, 6), (1, 16)):
                sw = stride if side == 0 else -stride
                ay = 19 + by + (1 if sw > 0 else 0)
                c.rect(ax, ay + 4, 2, 1, sk if side == 0 else sks)
        # head
        if view == "down":
            c.ellipse(12, 12.5 + by, 6.5, 6, sk)
            c.vline(18, 11 + by, 15 + by, sks)
            c.hline(9, 15, 18 + by, sks)
        elif view == "side":
            c.ellipse(13, 12.5 + by, 6, 6, sk)
            c.px(19, 13 + by, sk)
            c.hline(10, 15, 18 + by, sks)
        else:
            c.ellipse(12, 12.5 + by, 6.5, 6, sks)
    return d


# ---------------------------------------------------------------- eyes (+ blush, mouth)
DEEP_SKINS = ("umber", "ebony")


def draw_eyes(style, tone="l"):
    """tone 'd' = for deep skin tones: darkest ink plus a highlight on every style, so eyes stay readable."""
    ink, glint = ("n0", "c1") if tone == "d" else ("o", "c1")

    def d(c, view, by, stride, blink):
        _draw_eyes(c, view, by, blink, style, ink, glint, tone)
    return d


def _draw_eyes(c, view, by, blink, style, ink, glint, tone):
    if view == "up":
        return
    if view == "down":
        eyes = (8, 14)
        c.px(7, 15 + by, "p2"), c.px(16, 15 + by, "p2")
        c.px(12, 16 + by, "r1" if tone == "l" else "p1")
    else:
        eyes = (15,)
        c.px(16, 16 + by, "p2")
    for ex in eyes:
        if blink:
            c.hline(ex, ex + 1, 14 + by, ink)
        elif style == "round":
            c.rect(ex, 13 + by, 2, 2, ink), c.px(ex + 1, 13 + by, glint)
        elif style == "dot":
            x = ex + (1 if ex == 8 else 0)
            c.vline(x, 13 + by, 14 + by, ink)
            if tone == "d":
                c.px(x, 13 + by, glint)
        elif style == "happy":
            c.px(ex, 14 + by, ink), c.px(ex + 1, 13 + by, ink)
            if view == "down" and ex == 14:
                c.px(ex + 1, 14 + by, ink), c.px(ex, 13 + by, ink), c.px(ex, 14 + by, None)
            if tone == "d":
                c.px(ex + (0 if ex == 14 else 1), 12 + by, "k3")  # lifted cheek light under a deep tone
        elif style == "lashes":
            c.rect(ex, 13 + by, 2, 2, ink), c.px(ex + 1, 13 + by, glint)
            c.px(ex - 1 if ex == 8 else ex + 2, 12 + by, ink)


# ---------------------------------------------------------------- hair
def _bangs(c, by, pattern, x0, col):
    for k, drop in enumerate(pattern):
        for dd in range(drop):
            c.px(x0 + k, 10 + by + dd, col)


def draw_hair(style, ramp, layer):
    hd, hb, hl = ramp

    def back(c, view, by, stride, blink):
        if view == "up":
            return  # the up view is drawn entirely by the front layer (it sits over the head)
        cx = 12 if view == "down" else 11
        if style in ("bob", "buns"):
            c.ellipse(cx, 11.5 + by, 8, 7.5, hd)
            c.rect(4, 11 + by, 16 if view == "down" else 10, 6, hd)
        elif style == "short":
            c.ellipse(cx, 10.5 + by, 7.6, 6.8, hd)
        elif style in CROPPED:
            c.ellipse(cx, 9.5 + by, 7.2, 5.8, hd)
        elif style == "long":
            c.ellipse(cx, 11.5 + by, 8, 7.5, hd)
            c.rect(4, 11 + by, 16 if view == "down" else 10, 13, hd)
        elif style == "ponytail":
            c.ellipse(cx, 10.5 + by, 7.6, 6.8, hd)
            if view == "side":
                c.ellipse(4, 15 + by, 2.5, 5, hd), c.px(3, 12 + by, hb)
        elif style == "curly":
            c.ellipse(cx, 11 + by, 9, 8.5, hd)
            for a in range(0, 360, 30):
                import math
                c.disc(cx + math.cos(math.radians(a)) * 8.5, 11 + by + math.sin(math.radians(a)) * 8, 2, hd)
        if style == "buns" and view != "side":
            for bx in (4, 20):
                c.disc(bx, 5 + by, 3, hd), c.disc(bx - 0.5, 4.5 + by, 2, hb)
        if style == "buns" and view == "side":
            c.disc(7, 4 + by, 3, hd), c.disc(6.5, 3.5 + by, 2, hb)

    def front(c, view, by, stride, blink):
        if view == "down":
            if style == "curly":
                c.ellipse(12, 8.5 + by, 8.5, 5.5, hb)
                for x in range(5, 20, 3):
                    c.disc(x, 10.5 + by, 1.6, hb), c.px(x, 9 + by, hl)
                for x in (4, 19):
                    c.vline(x, 10 + by, 18 + by, hb)
                return
            c.ellipse(12, 8.5 + by, 7.5, 5, hb)
            pat = {"bob": [1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0], "buns": [1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0],
                   "short": [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1], "long": [2, 2, 1, 1, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2],
                   "ponytail": [0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0],
                   "crop": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], "sidepart": [2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
                   "spiky": [1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1]}[style]
            if style in CROPPED:
                c.ellipse(12, 8 + by, 7.2, 4.4, hb)
            _bangs(c, by, pat, 5, hb)
            c.hline(7, 10, 5 + by, hl), c.px(8, 6 + by, hl)
            if style == "sidepart":
                c.line(9, 4 + by, 8, 7 + by, hd)
            if style == "spiky":
                for sx in (6, 9, 12, 15, 18):
                    c.poly([(sx - 2, 6 + by), (sx + 1.5, 6 + by), (sx - 0.5, 1.5 + by)], hb)
                    c.px(sx - 1, 4 + by, hl)
            lock = {"bob": 17, "buns": 17, "short": 13, "long": 24, "ponytail": 14, "crop": 12, "sidepart": 12, "spiky": 12}[style]
            for x in (4, 5, 18, 19):
                c.vline(x, 10 + by, lock + by, hb if x in (5, 18) else hd)
        elif view == "side":
            if style == "curly":
                c.ellipse(11, 8.5 + by, 8, 5.5, hb)
                for y in range(9, 19, 3):
                    c.disc(5, y + by, 2, hb)
                c.px(8, 6 + by, hl), c.px(9, 6 + by, hl)
                return
            c.ellipse(11, 8.5 + by, 7.5, 5, hb)
            pat = [6, 6, 6, 5, 4, 3, 2, 1, 1, 2, 1, 1, 0, 0]
            if style in ("short", "ponytail"):
                pat = [4, 4, 4, 3, 3, 2, 1, 1, 1, 1, 1, 0, 0, 0]
            if style in CROPPED:
                pat = [3, 3, 3, 2, 2, 1, 1, 0, 0, 1, 1 if style == "sidepart" else 0, 0, 0, 0]
                if style == "spiky":
                    for sx in (6, 9, 12, 15):
                        c.poly([(sx - 2, 6 + by), (sx + 1.5, 6 + by), (sx - 1.5, 1.5 + by)], hb)
            _bangs(c, by, pat, 5, hb)
            back_len = {"bob": 6, "buns": 6, "short": 3, "long": 13, "ponytail": 3, "crop": 2, "sidepart": 2, "spiky": 2}[style]
            c.rect(4, 11 + by, 6, back_len, hb)
            c.vline(4, 11 + by, 10 + back_len + by, hd)
            c.hline(7, 11, 5 + by, hl)
        else:  # up: hair covers the head
            if style in CROPPED:
                c.ellipse(12, 9.5 + by, 7.5, 6, hb)
                c.hline(6, 18, 15 + by, hd)
                c.hline(8, 12, 5 + by, hl), c.px(7, 6 + by, hl)
                if style == "spiky":
                    for sx in (6, 9, 12, 15, 18):
                        c.poly([(sx - 2, 6 + by), (sx + 1.5, 6 + by), (sx - 0.5, 1.5 + by)], hb)
                return
            big = 9 if style == "curly" else 8
            c.ellipse(12, 11.5 + by, big, 7.5 if style != "curly" else 8.5, hb)
            length = {"bob": 6, "buns": 6, "short": 3, "long": 13, "ponytail": 3, "curly": 7}[style]
            c.rect(4, 11 + by, 16, length, hb)
            c.hline(4, 19, 10 + length + by, hd)
            c.vline(19, 8 + by, 10 + length + by, hd)
            c.hline(8, 12, 5 + by, hl), c.px(7, 6 + by, hl)
            for x in (8, 15):
                c.vline(x, 13 + by, 10 + length + by, hd)
            if style == "ponytail":
                c.rect(11, 13 + by, 3, 9, hb), c.vline(13, 13 + by, 21 + by, hd), c.hline(11, 13, 12 + by, "p1")
            if style == "buns":
                for bx in (5, 19):
                    c.disc(bx, 5 + by, 3, hb), c.px(bx - 1, 4 + by, hl)
            if style == "curly":
                for x in range(4, 21, 3):
                    c.disc(x, 11 + length + by, 1.6, hb)
    return back if layer == "back" else front


# ---------------------------------------------------------------- outfit
def draw_outfit(style, ramp):
    od, ob, ol = ramp
    if style == "blouse":
        top, bottom, legs = CREAM, ramp, ramp
    elif style == "tee":
        top, bottom, legs = ramp, BROWN_PANTS, None
    elif style == "dress":
        top, bottom, legs = ramp, ramp, None
    elif style == "overalls":
        top, bottom, legs = CREAM, ramp, ramp
    elif style == "shirt":
        top, bottom, legs = ramp, BROWN_PANTS, BROWN_PANTS
    else:  # sweater, hoodie
        top, bottom, legs = ramp, DARK_PANTS, DARK_PANTS

    def d(c, view, by, stride, blink):
        td, tb, tl = top
        bd, bb, bl = bottom
        if view == "side":
            if legs:
                for i, off in enumerate((-stride * 2, stride * 2)):
                    c.rect(11 + off, 26 + by, 3, 3 - (1 if off and by else 0), legs[0] if i == 0 else legs[1])
            c.rect(9 if style != "dress" else 8, 23 + by, 7 if style != "dress" else 9, 4 if style != "tee" else 3, bb)
            c.hline(9, 15, 26 + by, bd) if style != "tee" else c.hline(9, 15, 25 + by, bd)
            c.rect(9, 18 + by, 7, 6, tb), c.vline(9, 18 + by, 23 + by, td), c.vline(15, 19 + by, 22 + by, tl)
            if style == "overalls":
                c.rect(10, 19 + by, 5, 5, bb), c.px(14, 19 + by, bl)
            if style == "sweater":
                for y in (20, 22):
                    c.hline(9, 15, y + by, tl)
            ax = 12 + stride
            c.rect(ax, 19 + by, 2, 4, td)
            return
        # front / back legs
        if legs:
            for i, lx in enumerate((9, 13)):
                lift = 1 if (stride > 0 and i == 0) or (stride < 0 and i == 1) else 0
                c.rect(lx, 26 + by - lift, 3, 3, legs[0] if i else legs[1])
        # skirt / shorts
        if style == "dress":
            c.rect(7, 23 + by, 10, 5, bb), c.hline(7, 16, 27 + by, bd), c.vline(16, 23 + by, 27 + by, bd), c.vline(7, 23 + by, 26 + by, bl)
        elif style == "tee":
            c.rect(8, 23 + by, 8, 3, bb), c.hline(8, 15, 25 + by, bd), c.vline(15, 23 + by, 25 + by, bd)
        else:
            c.rect(8, 23 + by, 8, 4, bb)
            c.hline(8, 15, 26 + by, bd)
            c.vline(15, 23 + by, 26 + by, bd)
            c.vline(8, 23 + by, 25 + by, bl)
        # torso
        c.rect(8, 18 + by, 8, 6, tb)
        c.vline(15, 18 + by, 23 + by, td)
        c.vline(8, 19 + by, 22 + by, tl)
        if view == "down":
            c.px(11, 18 + by, td), c.px(12, 18 + by, td)
        if style == "overalls":
            c.rect(10, 20 + by, 4, 4, bb), c.vline(10, 18 + by, 20 + by, bd), c.vline(13, 18 + by, 20 + by, bd)
            if view == "down":
                c.px(10, 20 + by, "y1"), c.px(13, 20 + by, "y1")
        if style == "sweater":
            for y in (20, 22):
                c.hline(9, 14, y + by, tl)
        if style == "shirt" and view == "down":
            c.px(12, 20 + by, tl), c.px(12, 22 + by, tl), c.px(11, 18 + by, tl), c.px(12, 18 + by, tl)
        if style == "hoodie":
            if view == "down":
                c.hline(9, 14, 18 + by, td), c.px(10, 19 + by, "c1"), c.px(13, 19 + by, "c1"), c.hline(10, 13, 22 + by, td)
            else:
                c.rect(9, 17 + by, 6, 3, td), c.hline(10, 13, 17 + by, tl)
        if style == "dress" and view == "down":
            c.hline(10, 13, 18 + by, ol)
        # sleeves
        for side, ax in ((0, 6), (1, 16)):
            sw = stride if side == 0 else -stride
            ay = 19 + by + (1 if sw > 0 else 0)
            c.rect(ax, ay, 2, 4 if style != "tee" else 2, tb if side == 0 else td)
    return d


def draw_shoes(ramp):
    sd, sb = ramp

    def d(c, view, by, stride, blink):
        if view == "side":
            for i, off in enumerate((-stride * 2, stride * 2)):
                c.rect(11 + off, 29, 4, 2, sd if i == 0 else sb)
            return
        for i, lx in enumerate((9, 13)):
            lift = 1 if (stride > 0 and i == 0) or (stride < 0 and i == 1) else 0
            x0 = lx - (1 if i == 0 else 0)
            c.rect(x0, 29 - lift, 4, 2, sb)
            c.hline(x0, x0 + 3, 30 - lift, sd)
    return d


# ---------------------------------------------------------------- hats
def draw_hat(kind):
    def d(c, view, by, stride, blink):
        if kind == "straw":
            c.ellipse(12, 8.5 + by, 10.5, 2.4, "y0")
            c.ellipse(12, 8 + by, 10, 2, "y1")
            c.hline(5, 9, 7 + by, "y2")
            c.ellipse(12, 5 + by, 5.5, 3.5, "y1")
            c.hline(8, 11, 3 + by, "y2"), c.px(9, 2 + by, "y2")
            c.vline(16, 4 + by, 6 + by, "y0")
            c.hline(7, 16, 7 + by, "p1")
            c.hline(7, 16, 6 + by, "p2")
            if view == "side":
                c.px(6, 8 + by, "p2"), c.px(5, 9 + by, "p1")
            if view == "up":
                c.px(11, 8 + by, "p2"), c.px(12, 9 + by, "p1"), c.px(13, 9 + by, "p2")
        elif kind == "beanie":
            c.ellipse(12, 7 + by, 7.5, 5, "p1")
            c.rect(4, 7 + by, 16, 3, "p1")
            c.hline(4, 19, 9 + by, "p0"), c.hline(4, 19, 8 + by, "p2")
            for x in range(5, 19, 2):
                c.px(x, 8 + by, "p0")
            c.disc(12, 1.5 + by, 2, "c1"), c.px(11, 1 + by, "fw")
            c.px(8, 4 + by, "p2"), c.px(9, 4 + by, "p2")
        elif kind == "flowers":
            for k, x in enumerate(range(5, 20, 2)):
                y = 7 + by - (1 if 8 <= x <= 16 else 0)
                c.px(x, y + 1, "g4"), c.px(x + 1, y + 1, "g6")
                col = ["p2", "fw", "y2", "p3"][k % 4]
                if view == "up" or k % 2 == 0:
                    c.px(x, y, col), c.px(x + 1, y, col), c.px(x, y - 1, col), c.px(x + 1, y - 1, "y1" if col != "y2" else "e1")
        elif kind == "bucket":
            c.ellipse(12, 8.5 + by, 9, 2.2, "g3")
            c.ellipse(12, 8 + by, 8.5, 1.8, "g4")
            c.rect(6, 3 + by, 12, 5, "g4")
            c.ellipse(12, 3.5 + by, 6, 2, "g6")
            c.hline(7, 10, 3 + by, "g8")
            c.hline(6, 17, 7 + by, "g3")
    return d


# ---------------------------------------------------------------- accessories
def draw_acc(kind):
    def d(c, view, by, stride, blink):
        if kind == "glasses":
            if view == "down":
                for ex in (7, 13):
                    c.rect(ex, 12 + by, 4, 4, "y0"), c.rect(ex + 1, 13 + by, 2, 2, None)
                c.hline(11, 12, 13 + by, "y0")
                for ex in (8, 14):  # restore eyes inside the frames
                    c.rect(ex, 13 + by, 2, 2, "o"), c.px(ex + 1, 13 + by, "c1")
            elif view == "side":
                c.rect(14, 12 + by, 4, 4, "y0"), c.rect(15, 13 + by, 2, 2, None)
                c.rect(15, 13 + by, 2, 2, "o"), c.px(16, 13 + by, "c1")
                c.hline(10, 13, 13 + by, "y0")
        elif kind == "scarf":
            if view == "side":
                c.rect(9, 17 + by, 8, 2, "fr"), c.hline(9, 16, 18 + by, "r0"), c.rect(8, 19 + by, 2, 4, "fr")
            else:
                c.rect(7, 17 + by, 10, 2, "fr"), c.hline(7, 16, 18 + by, "r0")
                tx = 14 if view == "down" else 9
                c.rect(tx, 19 + by, 2, 4, "fr"), c.px(tx, 22 + by, "r0")
        elif kind == "bow":
            bx, byy = (6, 6) if view != "side" else (8, 5)
            if view == "up":
                bx = 16
            c.rect(bx - 2, byy + by, 2, 3, "p2"), c.rect(bx + 1, byy + by, 2, 3, "p2")
            c.px(bx, byy + 1 + by, "p0"), c.px(bx - 2, byy + by, "p3"), c.px(bx + 1, byy + by, "p3")
    return d


# ---------------------------------------------------------------- bags
def draw_pack(kind, layer):
    def d(c, view, by, stride, blink):
        if kind == "satchel":
            if layer == "front" and view == "down":
                c.line(8, 18 + by, 15, 23 + by, "w1")
                c.rect(15, 22 + by, 4, 4, "w2"), c.hline(15, 18, 22 + by, "w3")
            if layer == "front" and view == "up":
                c.line(15, 18 + by, 8, 23 + by, "w1")
                c.rect(5, 22 + by, 4, 4, "w2"), c.hline(5, 8, 22 + by, "w3")
            if layer == "front" and view == "side":
                c.rect(10, 22 + by, 5, 4, "w2"), c.hline(10, 14, 22 + by, "w3"), c.line(11, 18 + by, 13, 22 + by, "w1")
        elif kind == "backpack":
            if view == "down" and layer == "front":
                c.vline(9, 18 + by, 22 + by, "r0"), c.vline(14, 18 + by, 22 + by, "r0")
            if view == "up" and layer == "front":
                c.rect(7, 17 + by, 10, 8, "r1"), c.hline(7, 16, 17 + by, "r2"), c.vline(16, 18 + by, 24 + by, "r0")
                c.rect(9, 21 + by, 6, 3, "r2"), c.hline(9, 14, 21 + by, "r3"), c.px(12, 22 + by, "y1")
            if view == "side" and layer == "back":
                c.rect(5, 17 + by, 5, 8, "r1"), c.vline(5, 17 + by, 24 + by, "r0"), c.hline(5, 9, 17 + by, "r2")
            if view == "side" and layer == "front":
                c.vline(11, 18 + by, 22 + by, "r0")
    return d


# ---------------------------------------------------------------- build
def build():
    """returns {category: (variant_ids, [sheets])}"""
    cats = {}
    cats["skin"] = (list(SKINS), [sheet_of(draw_skin(r)) for r in SKINS.values()])
    cats["eyes"] = ([f"{e}.{t}" for e in EYES for t in ("l", "d")],
                    [sheet_of(draw_eyes(e, t)) for e in EYES for t in ("l", "d")])
    hb_ids, hb, hf = [], [], []
    for st in HAIRSTYLES:
        for cn, r in HAIR_COLORS.items():
            hb_ids.append(f"{st}.{cn}")
            hb.append(sheet_of(draw_hair(st, r, "back")))
            hf.append(sheet_of(draw_hair(st, r, "front")))
    cats["hair_back"] = (hb_ids, hb)
    cats["hair_front"] = (hb_ids, hf)
    o_ids, o = [], []
    for st in OUTFITS:
        for cn, r in OUTFIT_COLORS.items():
            o_ids.append(f"{st}.{cn}")
            o.append(sheet_of(draw_outfit(st, r)))
    cats["outfit"] = (o_ids, o)
    cats["shoes"] = (list(SHOES), [sheet_of(draw_shoes(r)) for r in SHOES.values()])
    cats["hat"] = (HATS, [sheet_of(draw_hat(h)) for h in HATS])
    cats["acc"] = (ACCS, [sheet_of(draw_acc(a)) for a in ACCS])
    cats["pack_back"] = (PACKS, [sheet_of(draw_pack(p, "back")) for p in PACKS])
    cats["pack_front"] = (PACKS, [sheet_of(draw_pack(p, "front")) for p in PACKS])
    return cats


def options():
    return {
        "skin": list(SKINS), "hairStyle": HAIRSTYLES, "hairColor": list(HAIR_COLORS), "eyes": EYES,
        "outfit": OUTFITS, "outfitColor": list(OUTFIT_COLORS), "shoes": list(SHOES), "hat": HATS,
        "accessory": ACCS, "backpack": PACKS, "default": DEFAULT,
        # UI swatches: representative colour for each colour option
        "swatch": {
            "skin": {k: v[0] for k, v in SKINS.items()},
            "hairColor": {k: v[1] for k, v in HAIR_COLORS.items()},
            "outfitColor": {k: v[1] for k, v in OUTFIT_COLORS.items()},
            "shoes": {k: v[1] for k, v in SHOES.items()},
        },
    }


NPCS = {
    "mabel": dict(DEFAULT, skin="honey", hairStyle="buns", hairColor="silver", outfit="overalls", outfitColor="sage", hat="straw", accessory="glasses"),
    "theo": dict(DEFAULT, skin="umber", hairStyle="sidepart", hairColor="black", outfit="shirt", outfitColor="lavender", hat="none", accessory="glasses", backpack="satchel"),
    "juniper": dict(DEFAULT, skin="porcelain", hairStyle="ponytail", hairColor="auburn", outfit="tee", outfitColor="marigold", hat="bucket", backpack="backpack", shoes="white"),
    "rosa": dict(DEFAULT, skin="tan", hairStyle="curly", hairColor="espresso", outfit="dress", outfitColor="forest", hat="flowers", eyes="lashes"),
    "finn": dict(DEFAULT, skin="peach", hairStyle="crop", hairColor="silver", outfit="hoodie", outfitColor="sky", hat="beanie", accessory="scarf", shoes="black"),
}

ORDER = ["pack_back", "hair_back", "skin", "shoes", "outfit", "eyes", "hair_front", "hat", "acc", "pack_front"]



