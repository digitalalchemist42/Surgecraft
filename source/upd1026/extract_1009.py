"""Extract real card art for the v1.09.26 cards: unit portraits (img/units), Faction/Tactical/Creep art (img/cards)
and the new deployment maps (img/deploy). Same method as app/extract_art.py and app/extract_deploy.py."""
import pymupdf, json, re
from PIL import Image, ImageChops
P = "/home/claude/upd1026/pdf/"; APP = "/home/claude/app/"
T3, P2, Z3 = "Terran_Update_3_10-2026.pdf", "Protoss_Update_2_10-2026.pdf", "Zerg_Update_3_10-2026.pdf"
UNIT_PAGES = {"nova-stealth-mode": (T3, 1), "nova-assault-mode": (T3, 2), "holo-decoy": (T3, 3), "sabotage-drone": (T3, 4),
              "spec-ops-marauder": (T3, 5), "raven": (T3, 6), "auto-turret": (T3, 7),
              "tassadar": (P2, 1), "twilight-templar": (P2, 2), "high-templar": (P2, 3),
              "zagara": (Z3, 1), "defiler": (Z3, 2), "vileling": (Z3, 3), "bile-launcher": (Z3, 4)}
TAC_PAGES = [(T3, 8), (P2, 4), (Z3, 5)]
NEW_CARDS = {"nova-covert-ops", "vanadium-plating", "templar-caste", "templar-archives", "zagaras-swarm", "defiler-mound", "reactive-creep"}
data = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
docs = {}
def doc(f):
    if f not in docs: docs[f] = pymupdf.open(P + f)
    return docs[f]
def pix_to_pil(d, xref):
    pix = pymupdf.Pixmap(d, xref); info = d.extract_image(xref); sm = info.get("smask", 0)
    if pix.n - pix.alpha >= 4: pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    if sm:
        mask = pymupdf.Pixmap(d, sm)
        if pix.alpha: pix = pymupdf.Pixmap(pix, 0)
        pix = pymupdf.Pixmap(pix, mask)
    mode = "RGBA" if pix.alpha else ("RGB" if pix.n >= 3 else "L")
    im = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
    return im.convert("RGBA") if mode != "RGB" else im
def save(im, path, maxw):
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    if im.mode == "RGBA":
        bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox: im = im.crop(bbox)
    im.save(path, "WEBP", quality=80, method=6); return im.size
rep = {"units": {}, "cards": {}, "deploy": {}, "missing": []}
for uid, (f, p) in UNIT_PAGES.items():
    d = doc(f); page = d[p - 1]
    c = [i for i in page.get_image_info(xrefs=True) if i["xref"] and 280 <= i["width"] <= 420 and i["height"] >= 600]
    if not c: rep["missing"].append("unit " + uid); continue
    im = pix_to_pil(d, c[0]["xref"])
    # the rules-side copy is printed upside down on some pages; the extracted bitmap is stored upright either way
    rep["units"][uid] = {"size": save(im, APP + f"img/units/{uid}.webp", 306), "copies": len(c), "src": f"{f} p{p}"}
norm = lambda s: re.sub(r"[^A-Z0-9]", "", s.upper())
cards_by_norm = sorted(((norm(c["name"]), c["id"]) for c in data["cards"] if c["id"] in NEW_CARDS), key=lambda x: -len(x[0]))
for f, p in TAC_PAGES:
    d = doc(f); page = d[p - 1]
    infos = [i for i in page.get_image_info(xrefs=True) if i["xref"]]
    # these pages print the cards sideways in a 2x2 block on the top half; scan quarter cells
    cells = [pymupdf.Rect(x0, y0, x1, y1) for (x0, x1) in [(48, 298), (297, 548)] for (y0, y1) in [(72, 260), (259, 439), (438, 618), (617, 797)]]
    for rect in cells:
        txt = page.get_text("text", clip=rect)
        if not re.search(r"(TACTICAL|FACTION|CREEP) CARD", txt): continue
        spans = [s for b in page.get_text("dict", clip=rect)["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
        top = max(s["size"] for s in spans)
        nt = norm(" ".join(s["text"] for s in spans if s["size"] >= top - 0.5))
        cid = next((cid for n, cid in cards_by_norm if n == nt), None) or next((cid for n, cid in cards_by_norm if n in nt), None)
        if not cid: rep["missing"].append(f"unnamed cell {f} p{p} {rect}"); continue
        inside = [i for i in infos if rect.contains(pymupdf.Point((i["bbox"][0] + i["bbox"][2]) / 2, (i["bbox"][1] + i["bbox"][3]) / 2))
                  and i["width"] * i["height"] > 20000 and i["width"] <= 1000]
        if not inside: rep["missing"].append("card art " + cid); continue
        best = max(inside, key=lambda i: i["width"] * i["height"])
        im = pix_to_pil(d, best["xref"])
        # match the stored bitmap to how it appears on the page, then turn the sideways-printed card upright (90 deg clockwise)
        bb = pymupdf.Rect(best["bbox"]) & page.rect
        pg = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=bb, alpha=False)
        ref = Image.frombytes("RGB", (pg.width, pg.height), pg.samples).convert("L").resize((64, 64))
        def score(k):
            r = im.rotate(k, expand=True).convert("RGBA")
            flat = Image.new("RGB", r.size, (230, 230, 230)); flat.paste(r, mask=r.getchannel("A"))
            return sum(ImageChops.difference(flat.convert("L").resize((64, 64)), ref).getdata())
        k = min((0, 90, 180, 270), key=score)
        im = im.rotate(k, expand=True).rotate(-90, expand=True)
        rep["cards"][cid] = {"size": save(im, APP + f"img/cards/{cid}.webp", 420), "src": f"{f} p{p}", "page_rot": k}
for cid in sorted(NEW_CARDS - set(rep["cards"])): rep["missing"].append("card " + cid)
# deployment card: Standard side upright, Skirmish side upside down, both in the lower-left cell of T3 p8
page = doc(T3)[7]; Z = 4
for name, side in (("ONE BRIDGE TOO CLOSE", "standard"), ("POWER LINES", "skirmish")):
    hit = None
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            if "".join(s["text"] for s in l["spans"]).strip().upper() == name: hit = l
    x0, y0, x1, y1 = hit["bbox"]; up = hit["dir"][0] > 0
    clip = pymupdf.Rect(48, y0 - 8, 298, y0 + 175) if up else pymupdf.Rect(48, y1 - 175, 298, y1 + 8)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(Z, Z), clip=clip, alpha=False)
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    if not up: im = im.rotate(180)
    bg = Image.new("RGB", im.size, im.getpixel((2, 2)))
    box = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 18 else 0).getbbox()
    if box: im = im.crop(box)
    out = APP + f"img/deploy/one-bridge-too-close-{side}.webp"; im.save(out, "WEBP", quality=82, method=6)
    rep["deploy"][side] = {"size": im.size, "clip": [round(v) for v in clip], "upright_text": up}
print(json.dumps(rep, indent=1))
