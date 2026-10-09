import json, re, subprocess
from verify_text import PAGES, U, page_text
data = json.load(open("starcraft_tmg_data.json"))
bad = []; n = 0
for u in data["units"]:
    f, p = PAGES[u["id"]]
    t = re.sub(r"\s+", " ", subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), U + f, "-"], capture_output=True, text=True).stdout).upper()
    t = t.replace("’", "'")
    for a in [x for x in u["abilities"] + u["upgrades"] if x["kind"] == "ability"]:
        n += 1
        name = a["name"].upper().replace("’", "'")
        pat = re.escape(name) + r"\s*:\s*" + (re.escape(a["type"].upper()) if a["type"] else "")
        m = re.search(pat, t)
        if not m:
            # typo-corrected names: loose match on first word
            m2 = re.search(re.escape(name.split()[0]) + r"[A-Z' -]*:\s*" + (a["type"] or "").upper(), t)
            bad.append(f"{u['id']}: '{a['name']}' [{a['type']}] {'loose match only' if m2 else 'NOT FOUND'}"); continue
        after = t[m.end():m.end()+12]
        if a["cost"]:
            if not after.strip().startswith(a["cost"].upper()):
                bad.append(f"{u['id']}: '{a['name']}' cost {a['cost']} vs text '{after.strip()}'")
        elif re.match(r"\s*\d+ (CP|PE|BM)", after):
            bad.append(f"{u['id']}: '{a['name']}' has no cost but text shows '{after.strip()}'")
print(f"abilities checked={n} flagged={len(bad)}"); [print(" -", b) for b in bad]
