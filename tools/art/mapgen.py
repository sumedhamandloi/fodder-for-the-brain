"""Generates the Main World as a Tiled-format JSON map (editable in Tiled afterwards).

Terrain is authored on the corner grid (61x41) and resolved to corner-Wang tiles.
"""
import math
import random
from tiles import COLS, ROWS, ROW_PATH, ROW_WATER, ROW_CANOPY, ROW_MISC, ROW_DECO, ROW_FLOWERS2, COLLISION_TILE

W, H = 60, 40
CW, CH = W + 1, H + 1
G, P, WA, C = 0, 1, 2, 3
TS = 16

rng = random.Random(1116)


def wob(x, y, s=0.0):
    return (math.sin(x * 0.55 + s) + math.sin(y * 0.47 + s * 1.7) + math.sin((x + y) * 0.31 + s * 0.6)) / 3


# ---------------------------------------------------------------- layout (tile units)
BUILDINGS = [
    # key, anchor (tile x, tile y) bottom-centre, hotspot id, label
    ("bld_cottage", 30.0, 10.5, "cottage", "Your Cottage"),
    ("bld_library", 14.0, 11.5, "library", "Little Library"),
    ("bld_glasshouse", 46.0, 11.5, "glasshouse", "Glasshouse"),
    ("bld_pavilion", 13.0, 24.0, "playground", "Brain Playground"),
]
POND = (45.0, 29.0, 8.5, 5.6)  # cx, cy, rx, ry (corner units)
GARDEN = (6, 28, 19, 35)  # x0, y0, x1, y1 tiles (fenced Curiosity Garden)
DOCK = (35.5, 28.6)  # top-left tile of the dock sprite area
SPAWN = (30.0, 34.6)

PATHS = [
    [(30, 41), (30, 37), (28.5, 34), (28.6, 31), (30.4, 28.5), (30.5, 26)],
    [(30, 22.5), (31.6, 20), (31.8, 17.5), (30.4, 15), (30, 11.4)],
    [(28, 23.4), (25, 22.6), (23, 20.5), (21.5, 17.4), (18.6, 15.2), (15.3, 12.6)],
    [(32.4, 23), (35.5, 21.5), (38, 18.6), (41.5, 16.8), (44.5, 15.6), (46, 12.6)],
    [(27.6, 25), (24, 25.8), (20, 26.2), (16.5, 25.6), (13.2, 24.8)],
    [(20, 26.2), (16.5, 27.6), (13, 28.7)],
    [(32.5, 25.6), (33.6, 28), (35.8, 29.6)],
]
PLAZA = (30, 24, 2.6)


def playable(cx, cy):
    if 27.5 <= cx <= 32.5 and cy >= 35:  # south gate opening
        return True
    m = 3.2 + 1.3 * wob(cx, cy, 2.0)
    return m <= cx <= W - m and m - 0.3 <= cy <= H - m + 0.6


def seg_dist(px_, py_, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px_ - ax) * dx + (py_ - ay) * dy) / L))
    return math.hypot(px_ - ax - t * dx, py_ - ay - t * dy)


def in_pond(cx, cy):
    x0, y0, rx, ry = POND
    d = ((cx - x0) / rx) ** 2 + ((cy - y0) / ry) ** 2
    return d < 1 + 0.18 * wob(cx, cy, 5)


def terrain():
    t = [[G] * CW for _ in range(CH)]
    for cy in range(CH):
        for cx in range(CW):
            if not playable(cx, cy):
                t[cy][cx] = C
            elif in_pond(cx, cy):
                t[cy][cx] = WA
            else:
                d = min(seg_dist(cx, cy, a, b) for pth in PATHS for a, b in zip(pth, pth[1:]))
                if d < 0.8 or math.hypot(cx - PLAZA[0], cy - PLAZA[1]) < PLAZA[2]:
                    t[cy][cx] = P
    return t


def resolve(t):
    ground, collide = [], []
    for ty in range(H):
        for tx in range(W):
            cs = [t[ty][tx], t[ty][tx + 1], t[ty + 1][tx], t[ty + 1][tx + 1]]
            mask = lambda k: sum(b for b, v in zip((1, 2, 4, 8), cs) if v == k)
            blocked = False
            if C in cs:
                m = mask(C)
                q = (tx % 2) + 2 * (ty % 2)
                idx = (ROW_CANOPY + q) * COLS + m
                blocked = bin(m).count("1") >= 2
            elif WA in cs:
                m = mask(WA)
                idx = ROW_WATER * COLS + m
                blocked = bin(m).count("1") >= 2
            elif P in cs:
                idx = ROW_PATH * COLS + mask(P)
            else:
                idx = ROW_MISC * COLS + rng.choice([0, 0, 0, 1, 2, 3])
            ground.append(idx)
            collide.append(blocked)
    return ground, collide


def build():
    t = terrain()
    ground, collide = resolve(t)
    deco = [-1] * (W * H)
    occupied = set()
    objects = []
    nid = [1]

    def tile_kind(tx, ty):
        return ground[ty * W + tx] // COLS

    def is_grass(tx, ty):
        return 0 <= tx < W and 0 <= ty < H and ground[ty * W + tx] in range(ROW_MISC * COLS, ROW_MISC * COLS + 4)

    def add(key, x, y, frame=0, flip=False, **props):
        o = {"id": nid[0], "name": key, "type": "sprite", "class": "sprite", "x": round(x * TS), "y": round(y * TS),
             "point": True, "properties": [{"name": "frame", "type": "int", "value": frame},
                                            {"name": "flip", "type": "bool", "value": flip}]}
        for k, v in props.items():
            o["properties"].append({"name": k, "type": "string", "value": str(v)})
        nid[0] += 1
        objects.append(o)

    def occupy(x0, y0, x1, y1):
        for yy in range(int(y0), int(math.ceil(y1))):
            for xx in range(int(x0), int(math.ceil(x1))):
                occupied.add((xx, yy))

    def free(x0, y0, x1, y1, grass=True):
        for yy in range(int(y0), int(math.ceil(y1))):
            for xx in range(int(x0), int(math.ceil(x1))):
                if (xx, yy) in occupied or (grass and not is_grass(xx, yy)):
                    return False
        return True

    hotspots = []
    # buildings
    for key, bx, by, hid, label in BUILDINGS:
        add(key, bx, by)
        w = {"bld_cottage": 6, "bld_library": 6, "bld_glasshouse": 5.3, "bld_pavilion": 5.6}[key]
        hgt = {"bld_cottage": 6.2, "bld_library": 6.2, "bld_glasshouse": 5.5, "bld_pavilion": 4.8}[key]
        occupy(bx - w / 2, by - hgt, bx + w / 2, by + 0.6)
        door_dx = {"bld_library": 0.65}.get(key, 0)
        hotspots.append({"id": hid, "label": label, "x": bx + door_dx, "y": by + 0.4})

    # Curiosity Garden: soil beds, fence, signs
    x0, y0, x1, y1 = GARDEN
    for bx_ in (8, 13):
        for byy in (30, 33):
            for yy in range(byy, byy + 2):
                for xx in range(bx_, bx_ + 4):
                    ground[yy * W + xx] = ROW_MISC * COLS + 4 + (yy % 2)
                    deco[yy * W + xx] = ROW_DECO * COLS + [3, 0, 2, 4, 6, 7][(xx + yy * 3 + bx_) % 6]
            add("signpost", bx_ - 0.5, byy + 1.9)
    occupy(x0, y0, x1 + 1, y1 + 1)
    for xx in range(x0, x1 + 1):
        if xx in (12, 13):
            continue
        add("fence_h", xx + 0.5, y0 + 1)
        add("fence_h", xx + 0.5, y1 + 1)
    for yy in range(y0 + 1, y1 + 1):
        add("fence_v", x0 + 0.5, yy + 1)
        add("fence_v", x1 + 0.5, yy + 1)
    add("fence_post", 11.5, y0 + 1), add("fence_post", 14.5, y0 + 1)
    add("lantern", 11.0, y0 + 0.8), add("lantern", 15.0, y0 + 0.8)
    add("pot_yellow", 18.2, 29.8), add("barrel", 7.2, 29.9), add("crate", 8.3, 29.9)
    hotspots.append({"id": "curiosity", "label": "Curiosity Garden", "x": 12.9, "y": 28.6})

    # pond: dock, waterfall, rocks, lilies, reeds
    add("dock", DOCK[0] + 1.5, DOCK[1] + 2.1, flat=1)
    dx0, dy0 = int(DOCK[0]), int(DOCK[1])
    for yy in range(dy0, dy0 + 2):
        for xx in range(dx0, dx0 + 4):
            collide[yy * W + xx] = False
            occupied.add((xx, yy))
    hotspots.append({"id": "pond", "label": "The Pond", "x": 36.6, "y": 29.6})
    add("waterfall", 52.4, 25.6)
    occupy(50.5, 21, 54.5, 26)
    px0, py0, rx, ry = POND
    for i in range(22):
        a = i / 22 * 6.283 + 0.2
        x = px0 + math.cos(a) * (rx + 0.9)
        y = py0 + math.sin(a) * (ry + 0.8)
        if x < 39 and 27.5 < y < 31.5:
            continue  # keep the dock approach clear
        if 49.5 < x < 55 and y < 26:
            continue
        if free(x - 0.5, y - 0.6, x + 0.5, y + 0.2, grass=False):
            add(["rock_moss", "rock_s", "rock_m", "rock_s"][i % 4], x, y + 0.4, flip=i % 3 == 0)
            occupy(x - 0.7, y - 0.6, x + 0.7, y + 0.3)
    for ty in range(H):
        for tx in range(W):
            if ground[ty * W + tx] == ROW_WATER * COLS + 15 and (tx, ty) not in occupied:
                if all(ground[(ty + dy) * W + tx + dx] == ROW_WATER * COLS + 15 for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    if rng.random() < 0.13:
                        deco[ty * W + tx] = ROW_DECO * COLS + (13 if rng.random() < 0.4 else 12)

    # trees: frame the edges
    tree_spots = []
    edge = []
    for ty in range(1, H - 1):
        for tx in range(1, W - 1):
            cs = [t[ty][tx], t[ty][tx + 1], t[ty + 1][tx], t[ty + 1][tx + 1]]
            if C not in cs and any(t[min(CH - 1, max(0, ty + dy))][min(CW - 1, max(0, tx + dx))] == C
                                   for dx in (-2, -1, 2, 3) for dy in (-2, -1, 2, 3)):
                edge.append((tx, ty))
    rng.shuffle(edge)
    for (tx, ty) in edge:
        if 27 <= tx <= 33 and ty >= 34:
            continue
        if all(math.hypot(tx - a, ty - b) > 2.6 for a, b in tree_spots) and free(tx - 1, ty - 1, tx + 2, ty + 1, grass=False):
            tree_spots.append((tx, ty))
            key = rng.choice(["tree_oak", "tree_oak_b", "tree_pine", "tree_round", "tree_pine", "tree_oak"])
            add(key, tx + 0.5, ty + 1, flip=rng.random() < 0.5)
            occupy(tx - 0.5, ty - 0.5, tx + 1.5, ty + 1)
    feature_trees = [
        ("tree_cherry", 6.0, 18.0), ("tree_cherry", 53.0, 36.0), ("tree_cherry", 39.0, 22.0),
        ("tree_cherry_s", 22.5, 9.5), ("tree_round", 38.0, 9.0), ("tree_cherry", 54.0, 16.0),
        ("tree_cherry_s", 22.0, 33.5), ("tree_cherry_s", 37.0, 35.5), ("tree_oak", 5.5, 25.0),
        ("tree_cherry_s", 25.0, 15.5), ("tree_round", 49.5, 19.0), ("tree_cherry", 8.0, 10.0),
    ]
    for key, x, y in feature_trees:
        add(key, x, y, flip=rng.random() < 0.5)
        occupy(x - 1.2, y - 1, x + 1.2, y + 0.3)

    # building dressing
    dressing = [
        ("bush_pink", 25.6, 10.7), ("bush_pink", 34.4, 10.7), ("pot_pink", 27.2, 11.2), ("pot_white", 32.8, 11.2),
        ("bush_blue", 9.6, 12.0), ("bush_white", 19.6, 12.0), ("lantern", 18.0, 12.4), ("crate", 11.0, 12.2),
        ("bush_green", 41.5, 12.2), ("bush_pink", 50.6, 12.2), ("pot_yellow", 43.4, 12.3), ("pot_pink", 48.8, 12.3),
        ("bench", 27.0, 22.4), ("bench", 34.6, 27.0), ("lantern", 28.3, 33.0), ("lantern", 32.0, 28.4),
        ("lantern", 27.6, 19.0), ("lantern", 33.2, 15.8), ("lantern", 34.6, 31.0),
        ("bush_berry", 17.6, 24.3), ("bush_green", 8.6, 24.3), ("signpost", 16.5, 25.0),
        ("bush_pink", 24.0, 36.6), ("bush_white", 36.0, 36.6), ("arch", 30.0, 38.6),
        ("bush_green", 26.4, 37.3), ("bush_green", 33.6, 37.3), ("rock_moss", 20.0, 21.0),
        ("mushroom_red", 4.6, 22.0), ("mushroom_brown", 55.0, 22.5), ("mushroom_red", 42.0, 37.0),
        ("bush_blue", 41.0, 19.4), ("bush_white", 20.4, 18.8), ("rock_s", 36.5, 17.0),
    ]
    for key, x, y in dressing:
        add(key, x, y)
        occupy(x - 0.8, y - 0.8, x + 0.8, y + 0.2)

    # scattered garden life: bushes, small rocks, mushrooms, pots
    scatter = ["bush_green", "bush_pink", "bush_white", "bush_blue", "bush_green", "rock_s", "mushroom_red",
               "mushroom_brown", "bush_berry", "tree_cherry_s", "rock_moss"]
    for _ in range(900):
        tx, ty = rng.randint(4, W - 5), rng.randint(4, H - 4)
        if len([o for o in objects if o["name"].startswith(("bush", "rock", "mush", "tree_cherry_s"))]) > 70:
            break
        if free(tx - 1, ty - 1, tx + 2, ty + 2):
            key = rng.choice(scatter)
            add(key, tx + 0.5, ty + 1, flip=rng.random() < 0.5)
            occupy(tx - 0.5, ty - 0.5, tx + 1.5, ty + 1.3)

    # flower meadows: noise-clustered deco on free grass
    for ty in range(H):
        for tx in range(W):
            if not is_grass(tx, ty) or (tx, ty) in occupied or deco[ty * W + tx] >= 0:
                continue
            near_canopy = any(t[ty + dy][tx + dx] == C for dx in (0, 1) for dy in (0, 1))
            if near_canopy:
                continue
            field = wob(tx * 1.3, ty * 1.3, 9) + 0.35 * wob(tx * 3.1, ty * 2.7, 4)
            r_ = rng.random()
            if field > 0.22 and r_ < 0.6:
                # each meadow patch leans to a colour family, with per-tile variety
                fam = int((wob(tx * 0.4, ty * 0.4, 1) + 1) * 3.99) % 4
                options = [[(ROW_DECO, 0), (ROW_FLOWERS2, 0), (ROW_FLOWERS2, 4), (ROW_DECO, 6)],
                           [(ROW_DECO, 1), (ROW_FLOWERS2, 7), (ROW_DECO, 7), (ROW_FLOWERS2, 1)],
                           [(ROW_DECO, 2), (ROW_FLOWERS2, 6), (ROW_DECO, 4), (ROW_FLOWERS2, 3)],
                           [(ROW_DECO, 3), (ROW_FLOWERS2, 2), (ROW_DECO, 5), (ROW_FLOWERS2, 5)]][fam]
                row, col = rng.choice(options)
                deco[ty * W + tx] = row * COLS + col
            elif r_ < 0.2:
                deco[ty * W + tx] = ROW_DECO * COLS + rng.choice([8, 9, 10, 11, 8, 9])
    # reeds on grass at the pond bank
    for ty in range(1, H - 1):
        for tx in range(1, W - 1):
            if is_grass(tx, ty) and (tx, ty) not in occupied and deco[ty * W + tx] < 0:
                if any(tile_kind(tx + dx, ty + dy) == ROW_WATER for dx in (-1, 0, 1) for dy in (-1, 0, 1)) and rng.random() < 0.3:
                    deco[ty * W + tx] = ROW_DECO * COLS + 14

    # tiled export
    def tl(name, data, visible=True):
        return {"id": 0, "name": name, "type": "tilelayer", "width": W, "height": H, "x": 0, "y": 0,
                "opacity": 1, "visible": visible, "data": data}

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
             {"id": 999, "name": "spawn", "type": "spawn", "class": "spawn", "x": SPAWN[0] * TS, "y": SPAWN[1] * TS, "point": True}]},
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
