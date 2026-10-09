import pymupdf, json, re, io, hashlib
from PIL import Image
U="/root/.claude/uploads/9abf6e13-647f-5f56-85fc-b76ff3a4a35a/"
data = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
UNIT_PAGES = {"marine":("6e9a93c5-Terran_Units_1.pdf",1),"marauder":("6e9a93c5-Terran_Units_1.pdf",2),"medic":("6e9a93c5-Terran_Units_1.pdf",3),
 "jim-raynor":("6e9a93c5-Terran_Units_1.pdf",4),"point-defense-drone":("6e9a93c5-Terran_Units_1.pdf",5),"raynors-raider":("6e9a93c5-Terran_Units_1.pdf",6),
 "goliath":("6e9a93c5-Terran_Units_1.pdf",7),"siege-tank":("dbeeb9ee-Terran_Units_2.pdf",1),"adept":("39373445-Protoss_Units_1.pdf",1),
 "artanis":("39373445-Protoss_Units_1.pdf",2),"praetor-guard":("39373445-Protoss_Units_1.pdf",3),"pylon":("39373445-Protoss_Units_1.pdf",4),
 "sentry":("39373445-Protoss_Units_1.pdf",5),"stalker":("39373445-Protoss_Units_1.pdf",6),"zealot":("39373445-Protoss_Units_1.pdf",7),
 "immortal":("fbf9dae7-Protoss_Units_2.pdf",1),"zeratul":("fbf9dae7-Protoss_Units_2.pdf",2),"nerazim-watchers":("fbf9dae7-Protoss_Units_2.pdf",3),
 "hydralisk":("c9ea1507-Zerg_Units_1.pdf",1),"kerrigan":("c9ea1507-Zerg_Units_1.pdf",2),"omega-worm":("c9ea1507-Zerg_Units_1.pdf",3),
 "kerrigan-swarm-raptor":("c9ea1507-Zerg_Units_1.pdf",4),"queen":("c9ea1507-Zerg_Units_1.pdf",5),"roach":("c9ea1507-Zerg_Units_1.pdf",6),
 "corpser":("c9ea1507-Zerg_Units_1.pdf",7),"roachling":("c9ea1507-Zerg_Units_1.pdf",8),"vile":("c9ea1507-Zerg_Units_1.pdf",9),
 "zergling":("c9ea1507-Zerg_Units_1.pdf",10),"raptor":("c9ea1507-Zerg_Units_1.pdf",11),"swarmling":("c9ea1507-Zerg_Units_1.pdf",12),
 "ravager":("211ca09c-Zerg_Units_2.pdf",1)}
TAC_PAGES = [("6e9a93c5-Terran_Units_1.pdf",p) for p in (8,9,10)] + [("dbeeb9ee-Terran_Units_2.pdf",2)] + \
  [("39373445-Protoss_Units_1.pdf",p) for p in (8,9,10)] + [("fbf9dae7-Protoss_Units_2.pdf",4)] + \
  [("c9ea1507-Zerg_Units_1.pdf",p) for p in (13,14,15,16)] + [("211ca09c-Zerg_Units_2.pdf",2)]
docs = {}
def doc(f):
    if f not in docs: docs[f] = pymupdf.open(U+f)
    return docs[f]
def pix_to_pil(d, xref):
    pix = pymupdf.Pixmap(d, xref)
    info = d.extract_image(xref); sm = info.get("smask", 0)
    if pix.n - pix.alpha >= 4: pix = pymupdf.Pixmap(pymupdf.csRGB, pix)  # CMYK -> RGB
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
    im.save(path, "WEBP", quality=80, method=6)
    return im.size
report = {"units": {}, "cards": {}, "missing": []}
# ---- units: the 306-wide art panel image (front and back copies are identical)
for uid, (f, p) in UNIT_PAGES.items():
    d = doc(f); page = d[p-1]
    cands = [i for i in page.get_image_info(xrefs=True) if i["xref"] and 280 <= i["width"] <= 330 and i["height"] >= 600]
    if not cands: report["missing"].append("unit " + uid); continue
    im = pix_to_pil(d, cands[0]["xref"])
    report["units"][uid] = {"size": save(im, f"img/units/{uid}.webp", 306), "copies": len(cands)}
# ---- tactical / faction / creep cards: find the art half by its "... CARD" label and the card name in that half
norm = lambda s: re.sub(r"[^A-Z0-9]", "", s.upper())
cards_by_norm = sorted(((norm(c["name"]), c["id"]) for c in data["cards"]), key=lambda x: -len(x[0]))
COLS = [(48, 298), (297, 548)]; ROWS = [(72, 260), (259, 439), (438, 618), (617, 796)]
bg_x = set()
for f, p in TAC_PAGES:
    d = doc(f); page = d[p-1]
    infos = [i for i in page.get_image_info(xrefs=True) if i["xref"]]
    for (x0, x1) in COLS:
        for (y0, y1) in ROWS:
            rect = pymupdf.Rect(x0, y0, x1, y1)
            txt = page.get_text("text", clip=rect)
            if not re.search(r"(TACTICAL|FACTION|CREEP) CARD", txt): continue
            # card title = longest dataset name found in this half's text
            # title = the largest-font spans in this half (tags like KERRIGAN'S SWARM are small print)
            spans = [s for b in page.get_text("dict", clip=rect)["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
            top = max(s["size"] for s in spans)
            nt = norm(" ".join(s["text"] for s in spans if s["size"] >= top - 0.5))
            cid = next((cid for n, cid in cards_by_norm if n == nt), None) or next((cid for n, cid in cards_by_norm if n in nt), None)
            if not cid: report["missing"].append(f"unnamed half {f} p{p} {x0},{y0}"); continue
            inside = []
            for i in infos:
                b = i["bbox"]; cx, cy = (b[0]+b[2])/2, (b[1]+b[3])/2
                if x0 <= cx <= x1 and y0 <= cy <= y1 and i["width"] * i["height"] > 20000 and not (i["width"] > 1000):
                    inside.append(i)
            if not inside: report["missing"].append("card art " + cid); continue
            best = max(inside, key=lambda i: i["width"] * i["height"])
            im = pix_to_pil(d, best["xref"])
            report["cards"][cid] = {"size": save(im, f"img/cards/{cid}.webp", 420), "page": f"{f[9:]} p{p}", "src": f'{best["width"]}x{best["height"]}'}
all_cards = {c["id"] for c in data["cards"]}
for cid in sorted(all_cards - set(report["cards"])): report["missing"].append("card " + cid)
for uid in sorted({u["id"] for u in data["units"]} - set(report["units"])): report["missing"].append("unit " + uid)
json.dump(report, open("img/extract_report.json", "w"), indent=1)
print("units", len(report["units"]), "cards", len(report["cards"]), "missing", report["missing"])
