"""Crop the 12 deployment maps (6 cards x Standard/Skirmish side) from the unit-card PDFs.
Each map fills one quarter-sheet cell; Skirmish sides are printed upside down and are rotated upright."""
import pymupdf, json
from PIL import Image
U = "/root/.claude/uploads/9abf6e13-647f-5f56-85fc-b76ff3a4a35a/"
data = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
by_name = {}
for d in data["deployments"]:
    by_name[d["standard"].upper()] = (d["id"], "standard"); by_name[d["skirmish"].upper()] = (d["id"], "skirmish")
COLS = [(48, 298), (297, 548)]; ROWS = [(72, 260), (259, 439), (438, 618), (617, 797)]
Z = 4  # 288 dpi
found = {}
for f, p in [("6e9a93c5-Terran_Units_1.pdf", 13), ("6e9a93c5-Terran_Units_1.pdf", 14), ("fbf9dae7-Protoss_Units_2.pdf", 4)]:
    pg = pymupdf.open(U + f)[p - 1]
    for b in pg.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip().upper()
            if t not in by_name or l["spans"][0]["size"] < 13: continue
            x0, y0, x1, y1 = l["bbox"]; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            col = next(c for c in COLS if c[0] <= cx <= c[1]); row = next(r for r in ROWS if r[0] <= cy <= r[1])
            clip = pymupdf.Rect(col[0] + 1, row[0] + 1, col[1] - 1, row[1] - 1)
            pix = pg.get_pixmap(matrix=pymupdf.Matrix(Z, Z), clip=clip, alpha=False)
            im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            upside_down = l["dir"][0] < 0
            if upside_down: im = im.rotate(180)
            did, side = by_name[t]
            # trim the page's light margin around the rounded card
            bg = Image.new("RGB", im.size, im.getpixel((2, 2)))
            from PIL import ImageChops
            box = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 18 else 0).getbbox()
            if box: im = im.crop(box)
            out = f"img/deploy/{did}-{side}.webp"
            im.save(out, "WEBP", quality=82, method=6)
            found[out] = (f[9:18], p, t, upside_down, im.size)
for k, v in sorted(found.items()): print(k, v)
print(len(found), "maps")
