"""My Little Garden (Milestone 6): the personal garden behind your cottage, as a Tiled-format map.

Layout (32x22 tiles): cottage at the top, a fenced bed of six plots on the left, the pet's corner on the right,
an open lawn in the middle for decorations, and a gate at the bottom back to the main world.
"""
import math
import random
from px import Canvas
from tiles import COLS, ROWS, ROW_PATH, ROW_CANOPY, ROW_MISC, ROW_DECO, COLLISION_TILE
from mapgen import wob, seg_dist

W, H = 32, 22
CW, CH = W + 1, H + 1
G, P, C = 0, 1, 3
TS = 16
rng = random.Random(606)

COTTAGE = (16.0, 7.6)
PLOTS = [(4 + (i % 3) * 3, 10 + (i // 3) * 3) for i in range(6)]  # top-left tile of each 2x2 plot
PET_CORNER = (26.5, 12.0)
DECOR_ZONE = (11, 10, 22, 18)  # tiles x0, y0, x1, y1 (inclusive-exclusive)
GATE = (16.0, 20.4)
SPAWN = (16.0, 18.8)
PATHS = [[(16, 23), (16, 19), (16.5, 15), (15.8, 11.5), (16, 8.4)], [(16.3, 14.5), (21, 13.6), (24.5, 12.8)], [(15.8, 13), (11.5, 12.6)]]


def playable(cx, cy):
    if 14.5 <= cx <= 17.5 and cy >= 19:
        return True
    m = 2.2 + 0.9 * wob(cx, cy, 7.0)
    return m <= cx <= W - m and 1.6 <= cy <= H - m + 0.4


def build():
    t = [[G] * CW for _ in range(CH)]
    for cy in range(CH):
        for cx in range(CW):
            if not playable(cx, cy):
                t[cy][cx] = C
            elif min(seg_dist(cx, cy, a, b) for pth in PATHS for a, b in zip(pth, pth[1:])) < 0.75:
                t[cy][cx] = P
    ground, collide, deco = [], [], [-1] * (W * H)
    for ty in range(H):
        for tx in range(W):
            cs = [t[ty][tx], t[ty][tx + 1], t[ty + 1][tx], t[ty + 1][tx + 1]]
            mask = lambda k: sum(b for b, v in zip((1, 2, 4, 8), cs) if v == k)
            blocked = False
            if C in cs:
                m = mask(C)
                idx = (ROW_CANOPY + (tx % 2) + 2 * (ty % 2)) * COLS + m
                blocked = bin(m).count("1") >= 2
            elif P in cs:
                idx = ROW_PATH * COLS + mask(P)
            else:
                idx = ROW_MISC * COLS + rng.choice([0, 0, 0, 1, 2, 3])
            ground.append(idx)
            collide.append(blocked)

    objects, nid = [], [1]

    def add(key, x, y, flip=False, **props):
        o = {"id": nid[0], "name": key, "type": "sprite", "class": "sprite", "x": round(x * TS), "y": round(y * TS),
             "point": True, "properties": [{"name": "frame", "type": "int", "value": 0},
                                            {"name": "flip", "type": "bool", "value": flip}]}
        for k, v in props.items():
            o["properties"].append({"name": k, "type": "string", "value": str(v)})
        nid[0] += 1
        objects.append(o)

    add("bld_cottage", *COTTAGE)
    # garden beds: tilled soil inside a low fence
    for (px_, py_) in PLOTS:
        for yy in range(py_, py_ + 2):
            for xx in range(px_, px_ + 2):
                ground[yy * W + xx] = ROW_MISC * COLS + 4 + (yy % 2)
    for xx in range(3, 13):
        add("fence_h", xx + 0.5, 10)
        add("fence_h", xx + 0.5, 16.3)
    for yy in range(10, 16):
        add("fence_v", 3.5, yy + 1.3)
    add("signpost", 12.6, 9.8)
    add("barrel", 2.8, 9.4), add("crate", 4.2, 9.4)
    # pet's corner
    add("pet_bed", PET_CORNER[0], PET_CORNER[1])
    add("pet_bowl", PET_CORNER[0] + 1.6, PET_CORNER[1] + 0.2)
    add("bush_pink", 28.6, 11.4), add("pot_pink", 24.6, 11.0)
    # framing trees and cottage dressing
    for key, x, y in [("tree_cherry", 4.0, 7.8), ("tree_cherry_s", 28.0, 7.0), ("tree_round", 8.5, 6.0),
                      ("tree_oak", 24.5, 5.4), ("tree_pine", 3.0, 19.0), ("tree_pine", 29.0, 19.0),
                      ("bush_white", 11.6, 8.0), ("bush_pink", 20.4, 8.0), ("lantern", 14.3, 19.6),
                      ("lantern", 17.7, 19.6), ("rock_moss", 7.0, 19.2), ("bush_green", 25.0, 19.5)]:
        add(key, x, y, flip=rng.random() < 0.5)
    # a few wild flowers outside the lawn
    for ty in range(H):
        for tx in range(W):
            idx = ground[ty * W + tx]
            if idx not in range(ROW_MISC * COLS, ROW_MISC * COLS + 4):
                continue
            x0, y0, x1, y1 = DECOR_ZONE
            if x0 - 1 <= tx < x1 + 1 and y0 - 1 <= ty < y1 + 1:
                continue
            if 2 <= tx < 13 and 9 <= ty < 17:
                continue
            if rng.random() < 0.22:
                deco[ty * W + tx] = ROW_DECO * COLS + rng.choice([0, 1, 2, 4, 6, 7, 8, 9, 11])

    hotspots = [
        {"id": "home_door", "label": "Your cottage door", "x": COTTAGE[0], "y": COTTAGE[1] + 0.4},
        {"id": "home_beds", "label": "Garden beds", "x": 12.6, "y": 10.4},
        {"id": "home_pet", "label": "Pet's corner", "x": PET_CORNER[0], "y": PET_CORNER[1] + 0.8},
        {"id": "home_gate", "label": "Back to the main garden", "x": GATE[0], "y": GATE[1]},
    ]

    def tl(name, data, visible=True):
        return {"id": 0, "name": name, "type": "tilelayer", "width": W, "height": H, "x": 0, "y": 0,
                "opacity": 1, "visible": visible, "data": data}

    zx0, zy0, zx1, zy1 = DECOR_ZONE
    layers = [
        tl("ground", [g + 1 for g in ground]),
        tl("deco", [d + 1 if d >= 0 else 0 for d in deco]),
        tl("collision", [COLLISION_TILE + 1 if b else 0 for b in collide], visible=False),
        {"id": 0, "name": "objects", "type": "objectgroup", "opacity": 1, "visible": True, "x": 0, "y": 0,
         "draworder": "topdown", "objects": objects},
        {"id": 0, "name": "hotspots", "type": "objectgroup", "opacity": 1, "visible": True, "x": 0, "y": 0,
         "draworder": "topdown", "objects": [
             {"id": 1000 + i, "name": h["id"], "type": "hotspot", "class": "hotspot", "x": round(h["x"] * TS),
              "y": round(h["y"] * TS), "point": True,
              "properties": [{"name": "label", "type": "string", "value": h["label"]}]}
             for i, h in enumerate(hotspots)] + [
             {"id": 999, "name": "spawn", "type": "spawn", "class": "spawn", "x": SPAWN[0] * TS, "y": SPAWN[1] * TS, "point": True},
             {"id": 998, "name": "decor_zone", "type": "zone", "class": "zone", "x": zx0 * TS, "y": zy0 * TS,
              "width": (zx1 - zx0) * TS, "height": (zy1 - zy0) * TS},
         ] + [
             {"id": 900 + i, "name": f"plot_{i}", "type": "plot", "class": "plot", "x": px_ * TS, "y": py_ * TS,
              "width": 2 * TS, "height": 2 * TS} for i, (px_, py_) in enumerate(PLOTS)]},
    ]
    for i, l in enumerate(layers):
        l["id"] = i + 1
    return {
        "compressionlevel": -1, "width": W, "height": H, "infinite": False, "orientation": "orthogonal",
        "renderorder": "right-down", "tiledversion": "1.10.2", "tileheight": TS, "tilewidth": TS, "type": "map",
        "version": "1.10", "nextlayerid": len(layers) + 1, "nextobjectid": nid[0] + 1, "layers": layers,
        "tilesets": [{"columns": COLS, "firstgid": 1, "image": "tiles.png", "imagewidth": COLS * TS,
                      "imageheight": ROWS * TS, "margin": 0, "name": "world", "spacing": 0, "tilecount": COLS * ROWS,
                      "tileheight": TS, "tilewidth": TS}],
    }


# ---------------------------------------------------------------- new props for the home
def pet_bed():
    c = Canvas(32, 20)
    c.ellipse(16, 12, 15, 7, "w2")
    c.ellipse(16, 11, 15, 6.5, "w3")
    c.ellipse(16, 11, 11, 4.5, "p1")
    c.ellipse(16, 10.5, 10, 3.6, "p2")
    for x in range(4, 29, 3):
        c.px(x, 15, "w1")
    c.hline(10, 14, 9, "p3")
    c.outline("o")
    return c


def pet_bowl():
    c = Canvas(14, 10)
    c.ellipse(7, 6, 6, 3.5, "b1")
    c.ellipse(7, 5, 6, 2.6, "b2")
    c.ellipse(7, 5, 4.5, 1.6, "b4")
    c.px(5, 4, "c1")
    c.outline("o")
    return c


def props():
    return {
        "pet_bed": ([pet_bed()], {"body": [-14, -6, 28, 5], "flat": True}),
        "pet_bowl": ([pet_bowl()], {"flat": True}),
    }
