"""Atmosphere FX and UI skin."""
import math
from px import Canvas

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def glow(r, inner, outer):
    s = r * 2
    c = Canvas(s, s)
    for y in range(s):
        for x in range(s):
            d = math.hypot(x + 0.5 - r, y + 0.5 - r) / r
            if d > 1:
                continue
            density = (1 - d) ** 1.4 * 16
            if BAYER4[y % 4][x % 4] < density:
                c.px(x, y, inner if d < 0.45 else outer)
    return c


def soft_glow(r, cols):
    """Concentric hard-edged rings (no dither noise): reads as a calm pool of light."""
    s = r * 2
    c = Canvas(s, s)
    for y in range(s):
        for x in range(s):
            d = math.hypot(x + 0.5 - r, (y + 0.5 - r) * 1.25) / r
            if d <= 1:
                band = min(len(cols) - 1, int((1 - d) * len(cols)))
                c.px(x, y, cols[band])
    return c


def moon_reflection():
    c = Canvas(28, 14)
    rows = [(3, 8, "c1"), (5, 12, "b4"), (7, 16, "c1"), (9, 10, "b4"), (11, 6, "b4")]
    for y, w, col in rows:
        x0 = 14 - w // 2 + (y % 3) - 1
        c.hline(x0, x0 + w - 1, y, col)
        c.hline(x0 + 2, x0 + w - 3, y - 1, "b3") if w > 8 else None
    return c


def firefly(i):
    c = Canvas(3, 3)
    if i == 0:
        c.px(1, 1, "y3")
        c.px(0, 1, "y2"), c.px(2, 1, "y2"), c.px(1, 0, "y2"), c.px(1, 2, "y2")
    else:
        c.px(1, 1, "y2")
    return c


def star(i):
    c = Canvas(3, 3)
    c.px(1, 1, "c1")
    if i == 0:
        c.px(0, 1, "l2"), c.px(2, 1, "l2"), c.px(1, 0, "l2"), c.px(1, 2, "l2")
    return c


def petal(i):
    c = Canvas(4, 4)
    shapes = [[(1, 1), (2, 1), (1, 2)], [(1, 1), (2, 2)], [(1, 1), (1, 2), (2, 2)], [(2, 1), (1, 2)]]
    for j, (x, y) in enumerate(shapes[i]):
        c.px(x, y, "p3" if j else "p2")
    return c


def smoke(i):
    c = Canvas(10, 10)
    r = [2.0, 3.0, 3.8, 4.2][i]
    c.disc(5, 5, r, "s3" if i < 3 else "s4")
    c.disc(4.3, 4.3, max(1, r - 1.6), "s4")
    if i == 3:
        for (x, y) in [(1, 5), (8, 3), (5, 8)]:
            c.px(x, y, None)
    return c


def sparkle(i):
    c = Canvas(5, 5)
    if i == 0:
        c.px(2, 2, "c1")
    elif i == 1:
        c.px(2, 2, "c1"), c.px(1, 2, "b4"), c.px(3, 2, "b4"), c.px(2, 1, "b4"), c.px(2, 3, "b4")
    elif i == 2:
        c.px(2, 2, "b4"), c.px(0, 2, "b4"), c.px(4, 2, "b4"), c.px(2, 0, "b4"), c.px(2, 4, "b4")
    return c


def koi(i):
    c = Canvas(10, 6)
    tail = [0, 1, 0, -1][i]
    c.ellipse(5, 3, 3.5, 1.6, "r3")
    c.px(6, 2, "fw"), c.px(4, 3, "fw"), c.px(7, 3, "r2")
    c.px(1, 3 + tail, "r2"), c.px(0, 3 + tail, "r3"), c.px(1, 2 + tail, "r3")
    c.px(8, 3, "o")
    return c


def butterfly(i):
    c = Canvas(5, 4)
    c.vline(2, 1, 2, "o")
    if i == 0:
        c.px(0, 0, "p3"), c.px(1, 1, "p2"), c.px(4, 0, "p3"), c.px(3, 1, "p2"), c.px(1, 2, "p2"), c.px(3, 2, "p2")
    else:
        c.px(1, 1, "p3"), c.px(3, 1, "p3")
    return c


def zzz():
    c = Canvas(5, 5)
    c.hline(0, 3, 0, "c1"), c.px(2, 1, "c1"), c.px(1, 2, "c1"), c.hline(0, 3, 3, "c1")
    return c


# ---------------------------------------------------------------- UI
def panel():
    """24x24 9-slice parchment panel: 8px corners."""
    c = Canvas(24, 24)
    c.rect(2, 0, 20, 24, "w1"), c.rect(0, 2, 24, 20, "w1"), c.rect(1, 1, 22, 22, "w1")
    c.rect(2, 1, 20, 22, "w2"), c.rect(1, 2, 22, 20, "w2")
    c.rect(3, 3, 18, 18, "w1")
    c.rect(4, 4, 16, 16, "c0")
    c.hline(4, 19, 4, "c1"), c.vline(4, 4, 19, "c1")
    c.hline(2, 21, 1, "w3"), c.vline(1, 2, 21, "w3")
    c.hline(4, 19, 19, "e4"), c.vline(19, 5, 19, "e4")
    return c


def button(state):
    c = Canvas(12, 12)
    base, hi, lo = {"n": ("g4", "g6", "g3"), "h": ("g5", "g7", "g3"), "p": ("g3", "g4", "g2")}[state]
    c.rect(1, 0, 10, 12, "o"), c.rect(0, 1, 12, 10, "o")
    c.rect(1, 1, 10, 10, base)
    c.hline(2, 9, 1, hi), c.vline(1, 2, 8, hi)
    c.hline(2, 10, 10, lo), c.vline(10, 2, 10, lo)
    return c


def chip():
    c = Canvas(12, 12)
    c.rect(1, 0, 10, 12, "o"), c.rect(0, 1, 12, 10, "o")
    c.rect(1, 1, 10, 10, "c0"), c.hline(2, 9, 1, "c1"), c.hline(2, 9, 10, "e4")
    return c


def key_cap():
    c = Canvas(12, 12)
    c.rect(1, 0, 10, 12, "o"), c.rect(0, 1, 12, 10, "o")
    c.rect(1, 1, 10, 9, "c1"), c.rect(1, 10, 10, 1, "e3")
    return c


def build():
    return {
        "fx_glow_s": ([soft_glow(10, ["e0", "y0", "y1"])], {}),
        "fx_glow_m": ([soft_glow(22, ["w1", "e0", "y0", "y1"])], {}),
        "fx_glow_l": ([soft_glow(36, ["w1", "e0", "e1", "y0"])], {}),
        "fx_moon": ([moon_reflection()], {}),
        "fx_firefly": ([firefly(i) for i in range(2)], {}),
        "fx_star": ([star(i) for i in range(2)], {}),
        "fx_petal": ([petal(i) for i in range(4)], {}),
        "fx_smoke": ([smoke(i) for i in range(4)], {}),
        "fx_sparkle": ([sparkle(i) for i in range(4)], {}),
        "fx_koi": ([koi(i) for i in range(4)], {}),
        "fx_butterfly": ([butterfly(i) for i in range(2)], {}),
        "fx_zzz": ([zzz()], {}),
    }


def build_ui():
    return {
        "ui_panel": panel(),
        "ui_button": button("n"), "ui_button_hover": button("h"), "ui_button_press": button("p"),
        "ui_chip": chip(), "ui_key": key_cap(),
    }
