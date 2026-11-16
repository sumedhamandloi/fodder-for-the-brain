"""Chibi characters (24x32) and pets (16x16).

Sheet layout for characters: rows = down, up, side(right); cols = idle0 idle1 walk0..3
Sheet layout for pets:       rows = down, up, side(right); cols = idle0 idle1 walk0..3 sit sleep0 sleep1
"""
from px import Canvas

DEFAULT_PLAYER = {
    "skin": ("k2", "k2s"),
    "hair": ("h1", "h2", "h3"),
    "hairstyle": "bob",
    "top": ("e3", "c0", "c1"),
    "bottom": ("g3", "g4", "g6"),
    "shoes": ("w0", "w1"),
    "hat": "straw",
}

STRIDE = [1, 0, -1, 0]
BOB = [0, 1, 0, 1]


def _legs_front(c, by, stride, cfg):
    sd, sb = cfg["shoes"]
    bd, bb, bl = cfg["bottom"]
    for i, lx in enumerate((9, 13)):
        lift = 1 if (stride > 0 and i == 0) or (stride < 0 and i == 1) else 0
        c.rect(lx, 26 + by - lift, 3, 3, bd if i else bb)
        c.rect(lx - (1 if i == 0 else 0), 29 - lift, 4, 2, sb)
        c.hline(lx - (1 if i == 0 else 0), lx + (2 if i == 0 else 3), 30 - lift, sd)


def _torso_front(c, by, stride, cfg, back=False):
    td, tb, tl = cfg["top"]
    bd, bb, bl = cfg["bottom"]
    sk, sks = cfg["skin"]
    # skirt / shorts
    c.rect(8, 23 + by, 8, 4, bb)
    c.hline(8, 15, 26 + by, bd)
    c.vline(15, 23 + by, 26 + by, bd)
    c.vline(8, 23 + by, 25 + by, bl)
    # torso
    c.rect(8, 18 + by, 8, 6, tb)
    c.vline(15, 18 + by, 23 + by, td)
    c.vline(8, 19 + by, 22 + by, tl)
    if not back:
        c.px(11, 18 + by, td), c.px(12, 18 + by, td)  # collar
    # arms
    for side, ax in ((0, 6), (1, 16)):
        sw = stride if side == 0 else -stride
        ay = 19 + by + (1 if sw > 0 else 0)
        c.rect(ax, ay, 2, 4, tb if side == 0 else td)
        c.rect(ax, ay + 4, 2, 1, sk if side == 0 else sks)


def _head_front(c, by, cfg, blink=False):
    sk, sks = cfg["skin"]
    hd, hb, hl = cfg["hair"]
    hy = by
    # back hair (bob)
    c.ellipse(12, 11.5 + hy, 8, 7.5, hd)
    c.rect(4, 11 + hy, 16, 6, hd)
    # face
    c.ellipse(12, 12.5 + hy, 6.5, 6, sk)
    c.vline(18, 11 + hy, 15 + hy, sks)
    c.hline(9, 15, 18 + hy, sks)
    # fringe cap
    c.ellipse(12, 8.5 + hy, 7.5, 5, hb)
    for x in range(5, 19):
        drop = [1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0][x - 5]
        for d in range(drop):
            c.px(x, 10 + hy + d, hb)
    c.hline(7, 10, 5 + hy, hl), c.px(8, 6 + hy, hl)
    # side locks
    for x in (4, 5, 18, 19):
        c.vline(x, 10 + hy, 17 + hy, hb if x in (5, 18) else hd)
    # eyes
    if blink:
        c.hline(8, 9, 14 + hy, "o"), c.hline(14, 15, 14 + hy, "o")
    else:
        for ex in (8, 14):
            c.rect(ex, 13 + hy, 2, 2, "o")
            c.px(ex + 1, 13 + hy, "c1")
    c.px(7, 15 + hy, "p2"), c.px(16, 15 + hy, "p2")
    c.px(12, 16 + hy, "r1")


def _head_back(c, by, cfg):
    hd, hb, hl = cfg["hair"]
    c.ellipse(12, 11.5 + by, 8, 7.5, hb)
    c.rect(4, 11 + by, 16, 6, hb)
    c.hline(4, 19, 17 + by, hd)
    c.vline(19, 8 + by, 17 + by, hd)
    c.hline(8, 12, 5 + by, hl), c.px(7, 6 + by, hl)
    for x in (8, 15):
        c.vline(x, 13 + by, 16 + by, hd)


def _head_side(c, by, cfg, blink=False):
    sk, sks = cfg["skin"]
    hd, hb, hl = cfg["hair"]
    c.ellipse(11, 11.5 + by, 7.5, 7.5, hd)
    c.rect(4, 11 + by, 10, 6, hd)
    c.ellipse(13, 12.5 + by, 6, 6, sk)
    c.px(19, 13 + by, sk)  # nose
    c.hline(10, 15, 18 + by, sks)
    c.ellipse(11, 8.5 + by, 7.5, 5, hb)
    for x in range(5, 19):
        drop = [6, 6, 6, 5, 4, 3, 2, 1, 1, 2, 1, 1, 0, 0][x - 5]
        for d in range(drop):
            c.px(x, 10 + by + d, hb)
    c.rect(4, 11 + by, 6, 6, hb)
    c.vline(4, 11 + by, 17 + by, hd)
    c.hline(7, 11, 5 + by, hl)
    if blink:
        c.hline(15, 16, 14 + by, "o")
    else:
        c.rect(15, 13 + by, 2, 2, "o"), c.px(16, 13 + by, "c1")
    c.px(16, 16 + by, "p2")


def _hat(c, by, cfg, view):
    if cfg.get("hat") != "straw":
        return
    c.ellipse(12, 8.5 + by, 10.5, 2.4, "y0")
    c.ellipse(12, 8 + by, 10, 2, "y1")
    c.hline(5, 9, 7 + by, "y2")
    c.ellipse(12, 5 + by, 5.5, 3.5, "y1")
    c.hline(8, 11, 3 + by, "y2"), c.px(9, 2 + by, "y2")
    c.vline(16, 4 + by, 6 + by, "y0")
    c.hline(7, 16, 7 + by, "p1")
    c.hline(7, 16, 6 + by, "p2")
    if view == "side":
        c.px(6, 8 + by, "p2"), c.px(5, 9 + by, "p1")  # ribbon tail
    if view == "up":
        c.px(11, 8 + by, "p2"), c.px(12, 9 + by, "p1"), c.px(13, 9 + by, "p2")


def _side_body(c, by, stride, cfg):
    td, tb, tl = cfg["top"]
    bd, bb, bl = cfg["bottom"]
    sk, sks = cfg["skin"]
    sd, sb = cfg["shoes"]
    # legs (back leg darker)
    for i, off in enumerate((-stride * 2, stride * 2)):
        col = bd if i == 0 else bb
        lx = 11 + off
        c.rect(lx, 26 + by, 3, 3 - (1 if off and by else 0), col)
        c.rect(lx, 29, 4, 2, sd if i == 0 else sb)
    c.rect(9, 23 + by, 7, 4, bb), c.hline(9, 15, 26 + by, bd)
    c.rect(9, 18 + by, 7, 6, tb), c.vline(9, 18 + by, 23 + by, td), c.vline(15, 19 + by, 22 + by, tl)
    # arm swinging
    ax = 12 + stride
    c.rect(ax, 19 + by, 2, 4, td)
    c.rect(ax, 23 + by, 2, 1, sk)


def character_frame(view, kind, i, cfg):
    c = Canvas(24, 32)
    if kind == "idle":
        by, stride, blink = (0, 0, False) if i == 0 else (0, 0, True)
        breathe = i
    else:
        by, stride, blink, breathe = BOB[i], STRIDE[i], False, 0
    if view == "down":
        _legs_front(c, by, stride, cfg)
        _torso_front(c, by, stride, cfg)
        _head_front(c, by + 0, cfg, blink)
        _hat(c, by, cfg, "down")
    elif view == "up":
        _legs_front(c, by, stride, cfg)
        _torso_front(c, by, stride, cfg, back=True)
        _head_back(c, by, cfg)
        _hat(c, by, cfg, "up")
    else:
        _side_body(c, by, stride, cfg)
        _head_side(c, by, cfg, blink)
        _hat(c, by, cfg, "side")
    c.outline("o")
    return c


def character_sheet(cfg):
    frames = []
    for view in ("down", "up", "side"):
        frames += [character_frame(view, "idle", i, cfg) for i in range(2)]
        frames += [character_frame(view, "walk", i, cfg) for i in range(4)]
    return frames


# ---------------------------------------------------------------- frog pet
FROG = {"d": "f0", "s": "f1", "b": "f2", "l": "f3", "belly": "f4"}


def frog_frame(view, kind, i):
    c = Canvas(16, 16)
    lift, squash, eyes_closed = 0, 0, False
    if kind == "idle":
        squash = i
    elif kind == "walk":
        lift = [0, 2, 3, 1][i]
        squash = [1, -1, -1, 0][i]
    elif kind == "sit":
        squash = 1
    elif kind == "sleep":
        squash = 1 + i % 2
        eyes_closed = True
    by = 15 - lift
    if view in ("down", "up"):
        rx, ry = 6 + max(0, squash) * 0.5, 4.5 - squash * 0.5
        cy = by - ry
        # feet
        c.rect(3, by - 1, 3, 1, "f1"), c.rect(10, by - 1, 3, 1, "f1")
        c.shaded_blob(8, cy, rx, ry, ["f1", "f2", "f2", "f3"], jitter=0.0)
        if view == "down":
            c.ellipse(8, cy + 1.5, rx - 2.5, ry - 1.8, "f4")
        else:
            for (x, y) in [(6, cy - 1), (10, cy), (8, cy + 1)]:
                c.px(x, y, "f1")
        ey = cy - ry + 0.5
        for ex in (4.5, 11.5):
            c.disc(ex, ey, 2.4, "f2")
            c.px(ex - 1, ey - 2, "f3")
            if view == "down":
                if eyes_closed:
                    c.hline(ex - 1, ex, ey, "o")
                else:
                    c.rect(ex - 1, ey - 1, 2, 2, "o")
                    c.px(ex - 1, ey - 1, "c1")
        if view == "down":
            c.px(3, cy + 0.5, "p2"), c.px(12, cy + 0.5, "p2")
            c.hline(7, 8, cy + 0.5, "o")
    else:  # side, facing right
        rx, ry = 6.5, 4.5 - squash * 0.5
        cy = by - ry
        c.rect(3, by - 1, 4, 1, "f1"), c.rect(9, by - 1, 3, 1, "f1")
        c.shaded_blob(7.5, cy, rx, ry, ["f1", "f2", "f2", "f3"], jitter=0.0)
        c.ellipse(9, cy + 1.5, 4, ry - 2, "f4")
        ex, ey = 10.5, cy - ry + 0.8
        c.disc(ex, ey, 2.5, "f2")
        c.px(ex - 1, ey - 2, "f3")
        if eyes_closed:
            c.hline(ex, ex + 1, ey, "o")
        else:
            c.rect(ex, ey - 1, 2, 2, "o"), c.px(ex, ey - 1, "c1")
        c.px(12, cy + 0.5, "p2")
        c.px(13, cy + 1.5, "o")
    c.outline("o")
    return c


def frog_sheet():
    frames = []
    for view in ("down", "up", "side"):
        frames += [frog_frame(view, "idle", i) for i in range(2)]
        frames += [frog_frame(view, "walk", i) for i in range(4)]
        frames += [frog_frame(view, "sit", 0)]
        frames += [frog_frame(view, "sleep", i) for i in range(2)]
    return frames


def build():
    return {
        "player": (character_sheet(DEFAULT_PLAYER), {"frame": [24, 32], "cols": 6, "anchor": [12, 31]}),
        "pet_frog": (frog_sheet(), {"frame": [16, 16], "cols": 9, "anchor": [8, 15]}),
    }
