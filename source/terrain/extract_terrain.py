"""Terrain maps from the Full Rules PDF (Map Layouts, printed pages 115-124).
   usage: python3 -I extract_terrain.py <Full Rules.pdf> <out dir>
   Writes <out>/img/terrain/*.webp (terrain key, 6 Standard maps, 3 Skirmish maps) and <out>/terrain.json
   (piece names from the Terrain Key and each map's printed ASSEMBLY REQUIRES list).
   The PDF is not in the repo. Needs PyMuPDF and Pillow."""
import sys, os, io, json, re, pymupdf
from PIL import Image
pdf, out = sys.argv[1], sys.argv[2]
d = pymupdf.open(pdf)
DPI = 150
os.makedirs(out + "/img/terrain", exist_ok=True)
def printed(p):  # printed page number
    m = re.match(r"\s*(\d+)", p.get_text()); return int(m.group(1)) if m else None
pages = {printed(d[i]): d[i] for i in range(len(d)) if printed(d[i])}
def trim(im):
    """Crop to the printed map: the image placed on the page is larger than the part that shows,
    so keep the longest run of rows / columns that are darker than the page background."""
    g = im.convert("L"); w, h = g.size; px = g.load()
    def run(n, mean):
        runs = []; start = None
        for i in range(n + 1):
            dark = i < n and mean(i) < 170
            if dark and start is None: start = i
            if not dark and start is not None: runs.append([start, i]); start = None
        merged = []
        for r in runs:  # a pale terrain piece (the ramp) can split a run: join runs less than 30% apart
            if merged and r[0] - merged[-1][1] < 0.3 * n: merged[-1][1] = r[1]
            else: merged.append(r)
        return max(merged, key=lambda r: r[1] - r[0])
    y0, y1 = run(h, lambda y: sum(px[x, y] for x in range(0, w, 4)) / len(range(0, w, 4)))
    x0, x1 = run(w, lambda x: sum(px[x, y] for y in range(y0, y1, 4)) / len(range(y0, y1, 4)))
    return im.crop((x0, y0, x1, y1))
def save(page, rect, name, q=80, crop=False):
    pm = page.get_pixmap(dpi=DPI, clip=rect)
    im = Image.open(io.BytesIO(pm.tobytes("png"))).convert("RGB")
    if crop: im = trim(im)
    im.save(f"{out}/img/terrain/{name}.webp", "WEBP", quality=q, method=6)
    return im.size
res = {"source": "Full Rules, Map Layouts (pp. 115-124) and Part 9.3", "key": {}, "maps": []}
# terrain key (p.115): names in reading order; image = the white panel
kp = pages[115]
names = [l.strip() for l in kp.get_text().split("\n") if l.strip()]
i = names.index("TERRAIN KEY"); pieces = [n for n in names[i+1:] if not n.isdigit()]
order = ["Head Statue","Statue Shard","Vespene Geyser","Shrubs A","Shrubs B","Protoss Banner","Temple Obelisk","Wall Set 1","Wall Set 2","Wall Set 3","Wall Set 4","Wall Set 5","Wall Set 6","Lost Temple Ramp"]
assert sorted(pieces) == sorted(order), pieces
res["key"] = {"page": 115, "pieces": order, "size": save(kp, pymupdf.Rect(44, 104, 548, 736), "key", 82)}
for scale, first, n in (("standard", 116, 6), ("skirmish", 122, 3)):
    for k in range(n):
        pg = first + k; p = pages[pg]
        big = max(p.get_images(full=True), key=lambda im: im[2] * im[3])
        rect = p.get_image_rects(big[0])[0]
        req = [[int(a), b.strip()] for a, b in re.findall(r"(\d+)\s*×\s*([^\n]+)", p.get_text())]
        assert req and all(b in order for a, b in req), req
        req.sort(key=lambda x: order.index(x[1]))
        size = save(p, rect, f"{scale}-{k+1}", crop=True)
        w_in = 36; h_in = 54 if scale == "standard" else 36
        res["maps"].append({"id": f"{scale}-{k+1}", "scale": scale, "number": k + 1, "page": pg, "battlefield": f'{w_in}" × {h_in}"', "requires": req, "size": size})
json.dump(res, open(out + "/terrain.json", "w"), indent=1, ensure_ascii=False)
for m in res["maps"]: print(m["id"], m["page"], m["size"], sum(a for a, b in m["requires"]), "pieces")
