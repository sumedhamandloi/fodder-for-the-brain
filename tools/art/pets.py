"""Companion family (Milestone 7): cat, dog, rabbit, duck, hedgehog, drawn to match the frog.

Same sheet layout as the frog: rows down / up / side(right); columns idle0 idle1 walk0..3 sit sleep0 sleep1. 16x16 frames.
Shared language (from the pet reference): head about 60% of the sprite, stubby limbs, 1px warm outline, pink blush, dot eyes with a glint.
"""
from px import Canvas

SPECIES = {
    #            base   shade   light   belly   accent
    "cat":      ("r3",  "r2",   "y2",   "r3",   "r2"),   # ginger tabby
    "dog":      ("w4",  "w3",   "e4",   "c0",   "w2"),   # honey shiba
    "rabbit":   ("s4",  "s3",   "c1",   "c1",   "p2"),   # cream bunny
    "duck":     ("y1",  "y0",   "y2",   "y2",   "r2"),   # duckling
    "hedgehog": ("e3",  "e2",   "e4",   "e4",   "e1"),   # face colour; spines use accent
}


def frame_params(kind, i):
    lift, squash, closed = 0, 0, False
    if kind == "idle":
        squash = i
    elif kind == "walk":
        lift = [0, 1, 2, 1][i]
    elif kind == "sit":
        squash = 1
    elif kind == "sleep":
        squash = 1 + i % 2
        closed = True
    return lift, squash, closed


def eyes(c, xs, y, closed, glint=True):
    for x in xs:
        if closed:
            c.hline(x - 1, x, y + 1, "o")
        else:
            c.rect(x - 1, y, 2, 2, "o")
            if glint:
                c.px(x - 1, y, "c1")


def pet_frame(sp, view, kind, i):
    base, shade, light, belly, acc = SPECIES[sp]
    lift, squash, closed = frame_params(kind, i)
    c = Canvas(16, 16)
    by = 15 - lift  # ground line for this frame
    hy = by - 8 + squash + {"rabbit": 2, "cat": 1}.get(sp, 0)  # head centre y (bunny sits lower to make room for ears)
    side = view == "side"
    hx = 9 if side else 8

    # tail / back details (behind)
    if sp == "cat":
        if side:
            c.line(3, by - 3, 1, by - 7, base), c.px(1, by - 8, shade)
        elif view == "up":
            c.vline(8, by - 4, by - 1, base), c.px(9, by - 5, shade)
    if sp == "dog" and (side or view == "up"):
        c.disc(3 if side else 8, by - 5, 1.6, light)
    if sp == "rabbit" and (side or view == "up"):
        c.disc(3 if side else 8, by - 3, 1.6, "c1")
    if sp == "duck" and side:
        c.px(2, by - 4, shade), c.px(3, by - 5, shade)

    # body
    if sp == "hedgehog":
        c.ellipse(8 - (1 if side else 0), by - 3.5 + squash * 0.5, 6.5, 4, acc)
    else:
        c.ellipse(8 - (1 if side else 0), by - 3 + squash * 0.5, 4.5 if not side else 5.5, 3, base)
        if view == "down":
            c.ellipse(8, by - 2.5, 2.5, 2, belly)
    # feet
    if sp == "duck":
        for fx_ in ((6, 9) if not side else (6 + (i % 2), 8)):
            c.hline(fx_, fx_ + 1, by, "r2")
    else:
        step = [0, 1, 0, -1][i] if kind == "walk" else 0
        for k, fx_ in enumerate((5, 10) if not side else (5, 9)):
            c.hline(fx_ + (step if k == 0 else -step), fx_ + 1 + (step if k == 0 else -step), by, shade)

    # head
    if sp == "hedgehog":
        # spiky dome over the back, face peeking out front
        c.ellipse(hx - (2 if side else 0), hy + 1, 6.5, 5, acc)
        ox = 2 if side else 0
        for row, y in enumerate(range(hy - 3, hy + 5, 2)):
            for x in range(2 + row % 2, 15, 2):
                if c.opaque(x - ox, y):
                    c.px(x - ox, y, "e0")
                    c.px(x - ox, y - 1, "e2")
        for x in range(3, 14, 2):
            c.px(x - ox, hy - 4, "e2")
        if view != "up":
            c.ellipse(hx + (3 if side else 0), hy + 2.5, 3.5 if not side else 2.8, 2.6, base)
            c.px(hx + (6 if side else 0), hy + 3, "o")  # nose
    else:
        c.disc(hx, hy, 5.2, base)
        c.ellipse(hx - 1.5, hy - 2, 2.5, 1.5, light)  # top-left light
        c.px(hx + 4, hy + 2, shade), c.px(hx + 3, hy + 4, shade)
    # ears / crest / beak
    if sp == "cat":
        for ex in ((hx - 4, hx + 4) if not side else (hx - 1, hx + 3)):
            c.poly([(ex - 2, hy - 3), (ex + 2, hy - 3), (ex, hy - 8)], base)
            c.px(ex, hy - 5, "p2"), c.px(ex, hy - 4, "p2"), c.px(ex, hy - 7, shade)
        if view == "down":
            c.hline(hx - 1, hx + 1, hy - 4, shade), c.px(hx, hy - 3, shade)  # tabby stripes
    elif sp == "dog":
        for ex in ((hx - 5, hx + 5) if not side else (hx - 2,)):
            c.ellipse(ex, hy, 1.6, 3, acc)
        if view == "down":
            c.ellipse(hx, hy + 2.5, 2.5, 1.6, belly)
    elif sp == "rabbit":
        for ex in ((hx - 2, hx + 2) if not side else (hx - 1, hx + 1)):
            top = max(1, hy - 10)
            c.rect(ex - 1, top, 2, hy - 3 - top, base), c.vline(ex, top + 1, hy - 5, "p2")
    elif sp == "duck":
        c.px(hx, hy - 6, light), c.px(hx + 1, hy - 7, light)  # little tuft
    # face
    if view == "down" and sp != "hedgehog":
        eyes(c, (hx - 2, hx + 3), hy, closed)
        c.px(hx - 4, hy + 2, "p2"), c.px(hx + 4, hy + 2, "p2")
        if sp == "duck":
            c.rect(hx - 1, hy + 2, 3, 2, "r2"), c.hline(hx - 1, hx + 1, hy + 3, "r0")
        elif sp == "dog":
            c.px(hx, hy + 2, "o")
        else:
            c.px(hx, hy + 2, "p1" if sp != "cat" else "o")
    elif view == "down" and sp == "hedgehog":
        eyes(c, (hx - 1, hx + 2), hy + 1, closed, glint=False)
        c.px(hx - 3, hy + 3, "p2"), c.px(hx + 3, hy + 3, "p2")
    elif side:
        if sp == "hedgehog":
            eyes(c, (hx + 3,), hy + 1, closed, glint=False)
        else:
            eyes(c, (hx + 3,), hy, closed)
            c.px(hx + 3, hy + 3, "p2")
            if sp == "duck":
                c.rect(hx + 5, hy + 1, 2, 2, "r2")
            else:
                c.px(hx + 5, hy + 1, "o" if sp in ("dog", "cat") else "p1")
    c.outline("o")
    return c


def sheet(sp):
    frames = []
    for view in ("down", "up", "side"):
        frames += [pet_frame(sp, view, "idle", i) for i in range(2)]
        frames += [pet_frame(sp, view, "walk", i) for i in range(4)]
        frames += [pet_frame(sp, view, "sit", 0)]
        frames += [pet_frame(sp, view, "sleep", i) for i in range(2)]
    return frames


def heart(i):
    c = Canvas(7, 7)
    for (x, y) in [(1, 1), (2, 1), (4, 1), (5, 1), (0, 2), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2),
                   (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (2, 4), (3, 4), (4, 4), (3, 5)]:
        c.px(x, y, "p2" if i == 0 else "p1")
    c.px(1, 2, "p4"), c.px(2, 1, "p3")
    return c


def treat():
    c = Canvas(8, 8)
    c.disc(4, 4, 3, "y0"), c.disc(3.5, 3.5, 2, "y1"), c.px(3, 3, "y2")
    c.outline("o")
    return c


def ball():
    c = Canvas(8, 8)
    c.disc(4, 4, 3, "fr"), c.hline(1, 6, 4, "fw"), c.px(3, 2, "p3")
    c.outline("o")
    return c


def build():
    out = {f"pet_{sp}": (sheet(sp), {"frame": [16, 16], "cols": 9, "anchor": [8, 15]}) for sp in SPECIES}
    out["fx_heart"] = ([heart(0), heart(1)], {})
    out["fx_treat"] = ([treat()], {})
    out["fx_ball"] = ([ball()], {})
    return out
