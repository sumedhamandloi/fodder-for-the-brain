"""Compile all Fodder art to frontend/public/assets, validating palette + alpha rules.

usage: python tools/art/build.py [--preview]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image  # noqa: E402

from pal import P, PALETTE_SET  # noqa: E402
from px import sheet  # noqa: E402
import tiles, props, buildings, characters, fx, mapgen, avatar, interiors, pond, homegen, pets, crops, seasons  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "frontend", "public", "assets")
ART_SRC = os.path.join(ROOT, "art-src")

STATUS = "final"  # all M1 assets: drawn to the visual bible, awaiting creative-director approval


def validate(name, im):
    bad = 0
    data = im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()
    for p in data:
        if p[3] not in (0, 255):
            bad += 1
        elif p[3] == 255 and p[:3] not in PALETTE_SET:
            bad += 1
    if bad:
        raise SystemExit(f"[art] {name}: {bad} pixels violate palette/alpha rules")


def save(name, canvas):
    validate(name, canvas.im)
    canvas.im.save(os.path.join(OUT, name + ".png"))


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(ART_SRC, exist_ok=True)
    with open(os.path.join(ART_SRC, "palette.json"), "w") as f:
        json.dump(P, f, indent=1)

    manifest = {"sprites": {}, "ui": {}, "status": STATUS}
    ts = tiles.build()
    save("tiles", ts)
    for s in seasons.SEASONS:
        save(f"tiles__{s}", seasons.tileset(ts, s))

    groups = {}
    groups.update(props.build())
    groups.update(buildings.build())
    groups.update(fx.build())
    groups.update(characters.build())
    groups.update(interiors.build())
    groups.update(pond.build())
    groups.update(homegen.props())
    groups.update(pets.build())
    groups.update(crops.build())
    groups.update(seasons.weather_fx())
    for key, (frames, meta) in groups.items():
        cols = meta.get("cols", len(frames))
        sh = sheet(frames, cols)
        save(key, sh)
        seasonal = seasons.varies(key)
        if seasonal:
            for s in seasons.SEASONS:
                save(f"{key}__{s}", sheet(seasons.sprite(key, frames, s), cols))
        manifest["sprites"][key] = {
            "file": key + ".png", "frameWidth": frames[0].w, "frameHeight": frames[0].h,
            "frames": len(frames), "seasonal": seasonal, **meta,
        }
    for key, c in fx.build_ui().items():
        save(key, c)
        manifest["ui"][key] = key + ".png"

    build_avatar()

    m = mapgen.build()
    with open(os.path.join(OUT, "main_world.json"), "w") as f:
        json.dump(m, f)
    with open(os.path.join(OUT, "home_garden.json"), "w") as f:
        json.dump(homegen.build(), f)
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"[art] {len(groups)} sprite sheets, tileset, map -> {OUT}")

    if "--preview" in sys.argv:
        preview(m, groups, ts, night="--night" in sys.argv)


def compose_avatar(cats, cfg):
    """Python mirror of the client compositor (used for the fallback player sheet and checks)."""
    from px import Canvas
    key = {
        "skin": cfg["skin"], "eyes": f'{cfg["eyes"]}.{"d" if cfg["skin"] in avatar.DEEP_SKINS else "l"}', "hair_back": f'{cfg["hairStyle"]}.{cfg["hairColor"]}',
        "hair_front": f'{cfg["hairStyle"]}.{cfg["hairColor"]}', "outfit": f'{cfg["outfit"]}.{cfg["outfitColor"]}',
        "shoes": cfg["shoes"], "hat": cfg["hat"], "acc": cfg["accessory"],
        "pack_back": cfg["backpack"], "pack_front": cfg["backpack"],
    }
    out = Canvas(avatar.FW * avatar.COLS, avatar.FH * 3)
    for cat in avatar.ORDER:
        ids, sheets = cats[cat]
        out.paste(sheets[ids.index(key[cat])], 0, 0)
    # per-frame outline
    frames = []
    for n in range(18):
        f = Canvas(avatar.FW, avatar.FH)
        fx_, fy_ = (n % 6) * avatar.FW, (n // 6) * avatar.FH
        for y in range(avatar.FH):
            for x in range(avatar.FW):
                f.pix[x, y] = out.pix[fx_ + x, fy_ + y]
        f.outline("o")
        frames.append(f)
    return frames


def build_avatar():
    d = os.path.join(OUT, "avatar")
    os.makedirs(d, exist_ok=True)
    cats = avatar.build()
    meta = {"frame": [avatar.FW, avatar.FH], "cols": avatar.COLS, "rows": 3, "order": avatar.ORDER, "categories": {}}
    for cat, (ids, sheets) in cats.items():
        from px import Canvas
        w, h = sheets[0].w, sheets[0].h
        atlas = Canvas(w, h * len(sheets))
        for i, s in enumerate(sheets):
            atlas.paste(s, 0, i * h)
        validate("avatar/" + cat, atlas.im)
        atlas.im.save(os.path.join(d, cat + ".png"))
        meta["categories"][cat] = ids
    opts = avatar.options()
    opts["swatch"] = {k: {n: P[c] for n, c in v.items()} for k, v in opts["swatch"].items()}
    meta["options"] = opts
    meta["outline"] = P["o"]
    with open(os.path.join(d, "avatar.json"), "w") as f:
        json.dump(meta, f, indent=1)
    # fallback player sheet = the default avatar
    player = sheet(compose_avatar(cats, avatar.DEFAULT), 6)
    save("player", player)
    # NPCs share the avatar construction so they match the player's style exactly
    for npc, cfg in avatar.NPCS.items():
        save(f"npc_{npc}", sheet(compose_avatar(cats, cfg), 6))
    print(f"[art] avatar: {sum(len(v[0]) for v in cats.values())} layer variants")


def preview(m, groups, ts, night=False):
    """Composite the map like the engine does (ground, deco, y-sorted sprites) for quick review."""
    W, H = m["width"], m["height"]
    img = Image.new("RGBA", (W * 16, H * 16))
    tim = ts.im
    for layer in m["layers"][:2]:
        for i, gid in enumerate(layer["data"]):
            if gid:
                t = gid - 1
                tile = tim.crop(((t % 16) * 16, (t // 16) * 16, (t % 16) * 16 + 16, (t // 16) * 16 + 16))
                img.alpha_composite(tile, ((i % W) * 16, (i // W) * 16))
    objs = sorted(m["layers"][3]["objects"], key=lambda o: (0 if any(p["name"] == "flat" for p in o["properties"]) else 1, o["y"]))
    for o in objs:
        frames, meta = groups[o["name"]]
        frame = next(p["value"] for p in o["properties"] if p["name"] == "frame")
        flip = next(p["value"] for p in o["properties"] if p["name"] == "flip")
        f = frames[1 if night and len(frames) > 1 and o["name"].startswith(("bld_", "lantern")) else frame].im
        if flip:
            f = f.transpose(Image.FLIP_LEFT_RIGHT)
        if "shadow" in meta:
            sw, sh_ = meta["shadow"]
            sh_im = Image.new("RGBA", (sw, sh_), (0, 0, 0, 0))
            from PIL import ImageDraw
            ImageDraw.Draw(sh_im).ellipse((0, 0, sw - 1, sh_ - 1), fill=(16, 41, 30, 90))
            img.alpha_composite(sh_im, (o["x"] - sw // 2, o["y"] - sh_ // 2 - 1))
        img.alpha_composite(f, (o["x"] - f.width // 2, o["y"] - f.height))
    out = os.path.join(ROOT, "tools", "art", "out")
    os.makedirs(out, exist_ok=True)
    img.save(os.path.join(out, "map_preview%s.png" % ("_night" if night else "")))
    # sprite contact sheet at 3x
    items = [(k, v[0]) for k, v in groups.items()]
    cw = 1100
    x = y = rowh = 0
    placed = []
    for k, frames in items:
        sh = sheet(frames, min(len(frames), 9)).im
        if x + sh.width * 2 > cw:
            x, y, rowh = 0, y + rowh + 4, 0
        placed.append((sh, x, y))
        x += sh.width * 2 + 4
        rowh = max(rowh, sh.height * 2)
    cs = Image.new("RGBA", (cw, y + rowh + 4), (120, 150, 110, 255))
    for sh, x, y in placed:
        cs.alpha_composite(sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST), (x, y))
    cs.save(os.path.join(out, "sprites_preview.png"))
    ts.im.resize((ts.w * 3, ts.h * 3), Image.NEAREST).save(os.path.join(out, "tiles_preview.png"))


if __name__ == "__main__":
    main()


