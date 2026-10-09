"""Independent re-parse of the Unit Cost Table text layer, compared field-by-field with costs.py and the built JSON."""
import re, subprocess, json
from costs import UNIT_COSTS, GAS_COSTS
U = "/root/.claude/uploads/9abf6e13-647f-5f56-85fc-b76ff3a4a35a/4dc96169-Unit_Cost_Table.pdf"
txt = subprocess.run(["pdftotext", "-layout", U, "-"], capture_output=True, text=True).stdout
lines = [l for l in txt.splitlines() if l.strip()]
NAME2ID = {"MARINE": "marine", "RAYNOR'S RAIDERS (MARINE)": "raynors-raider", "MARAUDER": "marauder", "MEDIC": "medic",
    "GOLIATH": "goliath", "JIM RAYNOR": "jim-raynor", "SIEGE TANK": "siege-tank", "ZERGLING": "zergling",
    "RAPTOR (ZERGLING)": "raptor", "KERRIGAN SWARM RAPTOR (ZERGLING)": "kerrigan-swarm-raptor", "SWARMLING (ZERGLING)": "swarmling",
    "ROACH": "roach", "VILE (ROACH)": "vile", "CORPSER (ROACH)": "corpser", "HYDRALISK": "hydralisk", "QUEEN": "queen",
    "KERRIGAN": "kerrigan", "RAVAGER": "ravager", "ZEALOT": "zealot", "PRAETOR GUARD (ZEALOT)": "praetor-guard", "ADEPT": "adept",
    "SENTRY": "sentry", "STALKER": "stalker", "ARTANIS": "artanis", "ZERATUL": "zeratul", "NERAZIM WATCHERS (ADEPT)": "nerazim-watchers",
    "IMMORTAL": "immortal"}
parsed, cur, sect = {}, None, []
def flush():
    if cur: parsed[cur]["_lines"] = sect[:]
for l in lines:
    s = re.sub(r"\s+", " ", l.strip()).replace("\u2019", "'").replace(" )", ")")
    if s in NAME2ID or "TACTICAL CARD POINTS" in s:
        flush(); sect = []
        cur = NAME2ID.get(s)
        if cur: parsed[cur] = {"compositions": [], "upgrades": {}}
        continue
    if cur: sect.append(s)
flush()
for uid, p in parsed.items():
    L = p["_lines"]; mode = None
    for i, s in enumerate(L):
        if s.startswith("MODELS"): mode = "comp"; continue
        if s.endswith("UPGRADES"): mode = "upg"; continue
        if mode == "comp":
            m = re.fullmatch(r"(\d+) (\d+) (\d+)", s)
            if m: p["compositions"].append(tuple(map(int, m.groups())))
    p["_upg_lines"] = L[[i for i, s in enumerate(L) if s.endswith("UPGRADES")][0]:] if any(s.endswith("UPGRADES") for s in L) else []
norm = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
issues = []
for uid, c in UNIT_COSTS.items():
    p = parsed.get(uid)
    if not p: issues.append(f"{uid}: not parsed from PDF"); continue
    if p["compositions"] != c["compositions"]:
        issues.append(f"{uid}: compositions data={c['compositions']} pdf={p['compositions']}")
    UL = p["_upg_lines"]
    for k, (t, costs) in c["upgrades"].items():
        first = norm(k.split()[0])
        found = None
        for i, s in enumerate(UL):
            nums = re.findall(r"(?:(?<=\s)|^)(\d+|-)(?=\s|$)", s)
            cost_cells = [x for x in re.findall(r"\s(\d+|-)(?=\s|$)", " " + s)]
            if not re.search(r"\d", s): continue
            window = norm(" ".join(UL[max(0, i - 1):i + 2]))
            here = norm(s)
            if here.startswith(first) or (not re.match(r"[a-z]", here) and norm(UL[i - 1]).startswith(first)):
                if all(norm(w) in window for w in k.split()):
                    tail = re.findall(r"(\d+|-)", s.split(" FOR ")[-1] if " FOR " in s else s)
                    vals = tail[-2:] if len(costs) == 2 else tail[-2:]
                    found = [None if x == "-" else int(x) for x in vals]; break
        if found is None: issues.append(f"{uid}: upgrade {k} not located in PDF"); continue
        pdf_vals = [x for x in found if x is not None]
        if pdf_vals != costs:
            issues.append(f"{uid}: upgrade {k} data={costs} pdf={found}")
    # every upgrade row in the PDF section must map to a data upgrade
    rows = [s for s in UL if re.search(r"(^|\s)(\d+|-)$", s) and not re.fullmatch(r"\d+", s) and not s.startswith("(") and not s.startswith("UPGRADE")]
    if len(rows) != len(c["upgrades"]):
        issues.append(f"{uid}: PDF has {len(rows)} upgrade rows, data has {len(c['upgrades'])}")
for uid in parsed:
    if uid not in UNIT_COSTS: issues.append(f"PDF unit {uid} missing from data")
# gas
gas_pdf = {}
for m in re.finditer(r"([A-Z][A-Za-z()' ]+?)\s{2,}(\d+)\b", txt):
    gas_pdf[norm(m.group(1))] = int(m.group(2))
cards = {c["id"]: c for c in json.load(open("starcraft_tmg_data.json"))["cards"]}
for gid, g in GAS_COSTS.items():
    n = norm(cards[gid]["name"])
    if gas_pdf.get(n) != g: issues.append(f"gas {gid}: data={g} pdf={gas_pdf.get(n)}")
# built JSON agrees with costs.py
data = json.load(open("starcraft_tmg_data.json"))
for u in data["units"]:
    if u["summoned"]:
        if u["compositions"]: issues.append(f"{u['id']}: summoned unit has compositions")
        continue
    if [(x["models"], x["minerals"], x["supply"]) for x in u["compositions"]] != [tuple(x) for x in UNIT_COSTS[u["id"]]["compositions"]]:
        issues.append(f"{u['id']}: JSON compositions differ from costs.py")
    for up in u["upgrades"]:
        if up.get("cost_by_composition") is None or len(up["cost_by_composition"]) != len(u["compositions"]):
            issues.append(f"{u['id']}: upgrade {up['name']} missing/short cost in JSON")
        elif any(c is None for c in up["cost_by_composition"]):
            issues.append(f"{u['id']}: upgrade {up['name']} has a '-' cost for an available composition")
for c in data["cards"]:
    if c["gas_cost"] is None: issues.append(f"card {c['id']}: gas cost missing in JSON")
n_units = len(UNIT_COSTS); n_comp = sum(len(c["compositions"]) for c in UNIT_COSTS.values())
n_upg = sum(len(c["upgrades"]) for c in UNIT_COSTS.values()); n_uc = sum(len(v[1]) for c in UNIT_COSTS.values() for v in c["upgrades"].values())
print(f"units={n_units} compositions={n_comp} upgrades={n_upg} upgrade-cost cells={n_uc} gas entries={len(GAS_COSTS)}")
print("ISSUES:", len(issues)); [print(" -", i) for i in issues]
