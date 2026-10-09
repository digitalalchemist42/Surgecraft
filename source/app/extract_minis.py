import pymupdf, json, re
from PIL import Image
from extract_art import pix_to_pil, save, norm
d = pymupdf.open("/root/.claude/uploads/9abf6e13-647f-5f56-85fc-b76ff3a4a35a/4dc96169-Unit_Cost_Table.pdf")
data = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
names = {norm(u["name"]): u["id"] for u in data["units"]}
names[norm("RAYNOR'S RAIDERS (MARINE)")] = "raynors-raider"
out, used = {}, set()
for pno in range(1, 16):
    page = d[pno]
    heads = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            n = norm(t)
            if n in names: heads.append((names[n], l["bbox"]))
    for i in page.get_image_info(xrefs=True):
        x = i["xref"]
        if not x or x in used or i["width"] < 150: continue
        if not d.extract_image(x).get("smask"): continue
        b = i["bbox"]
        # heading sits left of the photo, around its lower half; pick the heading with nearest vertical centre
        cands = [(abs(((h[1]+h[3])/2) - ((b[1]+b[3])/2)), uid) for uid, h in heads]
        if not cands: continue
        dist, uid = min(cands)
        if uid in out or dist > 140: continue
        used.add(x)
        out[uid] = {"page": pno+1, "size": save(pix_to_pil(d, x), f"img/minis/{uid}.webp", 260), "dist": round(dist)}
for rid, (pno, xref) in {"Terran": (1, 248), "Zerg": (5, 1216), "Protoss": (11, 2531)}.items():
    save(pix_to_pil(d, xref), f"img/race/{rid.lower()}.webp", 160)
fieldable = [u["id"] for u in data["units"] if not u["summoned"]]
print(len(out), "minis; missing:", [u for u in fieldable if u not in out])
for k, v in sorted(out.items()): print(f"  {k:24} p{v['page']:<3} dist {v['dist']}")
