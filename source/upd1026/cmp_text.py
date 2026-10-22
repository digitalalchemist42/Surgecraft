# Compare provisional dataset entries against the text layer of the official card pages.
import sys, json, re, pymupdf
sys.path.insert(0, "/home/claude/sc_data")
import cards_1009 as pv
def norm(s):
    s = s.replace("’", "'").replace("“", '"').replace("”", '"').replace("″", '"').replace(" ", " ")
    s = s.replace("–", "-").replace("—", "-")
    s = s.replace("\u2023", " ").replace("''", '"').replace("\u2019", "'")
    s = re.sub(r"\s+:", ":", s)
    return re.sub(r"\s+", " ", s).strip().lower()
PAGES = {
 "nova-stealth-mode": ("T", 1), "nova-assault-mode": ("T", 2), "holo-decoy": ("T", 3), "sabotage-drone": ("T", 4),
 "spec-ops-marauder": ("T", 5), "raven": ("T", 6), "auto-turret": ("T", 7),
 "tassadar": ("P", 1), "high-templar": ("P", 3), "twilight-templar": ("P", 2),
 "zagara": ("Z", 1), "defiler": ("Z", 2), "vileling": ("Z", 3), "bile-launcher": ("Z", 4),
 "nova-covert-ops": ("T", 8), "vanadium-plating": ("T", 8), "templar-caste": ("P", 4), "templar-archives": ("P", 4),
 "zagaras-swarm": ("Z", 5), "defiler-mound": ("Z", 5), "reactive-creep": ("Z", 5)}
F = {"T": "Terran_Update_3_10-2026.pdf", "P": "Protoss_Update_2_10-2026.pdf", "Z": "Zerg_Update_3_10-2026.pdf"}
docs = {k: pymupdf.open("/home/claude/upd1026/pdf/" + v) for k, v in F.items()}
def page_text(k, n):
    return norm(" ".join(docs[k][n - 1].get_text().split("\n")))
ents = {u["id"]: u for u in pv.TERRAN + pv.PROTOSS + pv.ZERG}
ents.update({c["id"]: c for c in pv.CARDS})
which = sys.argv[1:] or list(PAGES)
for eid in which:
    k, n = PAGES[eid]; t = page_text(k, n); e = ents[eid]; miss = []
    items = e.get("abilities", []) + e.get("upgrades", []) + e.get("weapons", [])
    for a in items:
        if a.get("kind") == "weapon":
            row = " ".join([a["name"], a["rng"], a["target"], a["roa"], a["hit"], a["surge_type"], a["s_dice"], a["dmg"], ", ".join(a["keywords"]) or "-"])
            if norm(row) not in t: miss.append(("WEAPON", row))
        else:
            if norm(a["text"]) not in t: miss.append(("TEXT", a["name"], a["text"]))
            hdr = a["name"] + ":"
            if norm(hdr) not in t: miss.append(("NAME", a["name"]))
    print("=====", eid, f"({k}{n})", "missing:", len(miss))
    for m in miss: print("   ", m)
print("== header check (NAME: TYPE COST) ==")
for eid in which:
    k, n = PAGES[eid]; t = page_text(k, n); e = ents[eid]
    for a in e.get("abilities", []) + [x for x in e.get("upgrades", []) if x.get("kind") != "weapon"]:
        h = f"{a['name']}: {(a.get('type') or '')} {(a.get('cost') or '')}".strip()
        if norm(h) not in t: print("  HDR", eid, h)
