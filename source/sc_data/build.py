"""Assemble the StarCraft TMG dataset and run consistency checks between unit cards, Tactical cards and the cost table."""
import json, re, sys, copy
from terran_units import UNITS as TU
from protoss_units import UNITS as PU
from zerg_units import UNITS as ZU
from cards import CARDS
# Shared ability/upgrade constants (e.g. BURROW_AMBUSH) are reused across unit definitions; deep-copy so
# per-unit fields such as cost_by_composition can never leak between units.
TU, PU, ZU, CARDS = copy.deepcopy(TU), copy.deepcopy(PU), copy.deepcopy(ZU), copy.deepcopy(CARDS)
from costs import UNIT_COSTS, GAS_COSTS
import cards_1009
# Official v1.09.26 cards for the units and cards first priced in the 10.6 Unit Cost Table (replaced the preview transcriptions).
TU = TU + copy.deepcopy(cards_1009.TERRAN)
PU = PU + copy.deepcopy(cards_1009.PROTOSS)
ZU = ZU + copy.deepcopy(cards_1009.ZERG)
CARDS = CARDS + copy.deepcopy(cards_1009.CARDS)
UNIT_COSTS = dict(UNIT_COSTS, **cards_1009.COSTS)
GAS_COSTS = dict(GAS_COSTS, **cards_1009.GAS)
from scenarios import MISSIONS, DEPLOYMENTS, SCENARIO_NOTES

UNITS = TU + PU + ZU
errors, warnings = [], []
E = errors.append
Wn = warnings.append


def bracket_supply(unit, models):
    for b in unit["supply_profile"]:
        lo, hi = map(int, b["models"].split("-"))
        if lo <= models <= hi:
            return b["supply"]
    return None


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


ids = [u["id"] for u in UNITS]
if len(ids) != len(set(ids)):
    E(f"duplicate unit ids: {[i for i in ids if ids.count(i) > 1]}")
by_id = {u["id"]: u for u in UNITS}

VALID_SLOTS = {"Core", "Elite", "Support", "Air", "Hero"}
RES = {"Terran": "CP", "Protoss": "PE", "Zerg": "BM"}

for u in UNITS:
    uid = u["id"]
    # slot / summoned consistency
    if u["summoned"]:
        if uid in UNIT_COSTS:
            E(f"{uid}: summoned unit has a cost-table entry")
        if u["army_slot"] is not None:
            E(f"{uid}: summoned unit has an army slot")
    else:
        if u["army_slot"] not in VALID_SLOTS:
            E(f"{uid}: invalid slot {u['army_slot']}")
        if uid not in UNIT_COSTS:
            E(f"{uid}: missing from cost table")
    # supply profile: contiguous brackets starting at 1
    prev = 0
    for b in u["supply_profile"]:
        lo, hi = map(int, b["models"].split("-"))
        if lo != prev + 1 or hi < lo:
            E(f"{uid}: non-contiguous supply profile {u['supply_profile']}")
        prev = hi
    # resource costs match race
    for a in u["abilities"] + u["upgrades"]:
        if a["kind"] == "ability" and a["cost"] and not a["cost"].endswith(RES[u["race"]]):
            E(f"{uid}: ability {a['name']} cost {a['cost']} not in {RES[u['race']]}")
    # replacement targets exist
    wnames = {w["name"] for w in u["weapons"]}
    for up in u["upgrades"]:
        if up["kind"] == "weapon" and up["replaces"] and up["replaces"] not in wnames:
            E(f"{uid}: upgrade {up['name']} replaces unknown weapon {up['replaces']}")
    # race tag present
    if u["race"] not in u["faction_tags"]:
        E(f"{uid}: race missing from faction tags")

for uid, c in UNIT_COSTS.items():
    if uid not in by_id:
        E(f"cost table entry {uid} has no unit card")
        continue
    u = by_id[uid]
    max_models = int(u["supply_profile"][-1]["models"].split("-")[1])
    for models, minerals, supply in c["compositions"]:
        s = bracket_supply(u, models)
        if s != supply:
            E(f"{uid}: {models} models -> cost table supply {supply}, card supply profile {s}")
        if models > max_models:
            E(f"{uid}: composition {models} exceeds card max {max_models}")
    card_up = {norm(x["name"]): x for x in u["upgrades"]}
    table_up = {norm(k): (k, v) for k, v in c["upgrades"].items()}
    for k in set(card_up) - set(table_up):
        E(f"{uid}: card upgrade '{card_up[k]['name']}' not in cost table")
    for k in set(table_up) - set(card_up):
        E(f"{uid}: cost-table upgrade '{table_up[k][0]}' not on card")
    for k in set(card_up) & set(table_up):
        cu = card_up[k]; tname, (ttype, costs) = table_up[k]
        if len(costs) != len(c["compositions"]):
            E(f"{uid}: upgrade {tname} has {len(costs)} costs for {len(c['compositions'])} compositions")
        m = re.search(r"FOR (.+)$", ttype)
        t_repl = m.group(1).strip() if m else None
        c_repl = cu.get("replaces")
        if norm(t_repl or "") != norm(c_repl or ""):
            E(f"{uid}: upgrade {tname} replacement mismatch table='{t_repl}' card='{c_repl}'")
        t_spec = "SPECIALIST" in ttype
        c_spec = cu.get("specialist", False)
        if t_spec != c_spec:
            E(f"{uid}: upgrade {tname} SPECIALIST mismatch table={t_spec} card={c_spec}")

card_ids = {c["id"]: c for c in CARDS}
for c in CARDS:
    if c["kind"] == "Faction":
        if c["id"] in GAS_COSTS:
            Wn(f"faction card {c['id']} has a gas cost")
    elif c["id"] not in GAS_COSTS:
        E(f"card {c['id']} has no gas cost")
    for s in c["slots"]:
        if s not in VALID_SLOTS:
            E(f"card {c['id']}: invalid slot {s}")
    if c["race"] not in c["faction_tags"]:
        E(f"card {c['id']}: race missing from tags")
for gid in GAS_COSTS:
    if gid not in card_ids:
        E(f"gas cost {gid} has no card")

# Tag eligibility sanity: every non-summoned unit must be fieldable by at least one faction card with a slot of its type
for u in UNITS:
    if u["summoned"]:
        continue
    ok = [f["id"] for f in CARDS if f["kind"] == "Faction" and set(u["faction_tags"]) <= set(f["faction_tags"])]
    if not ok:
        E(f"{u['id']}: no Faction Card can field it")
    slot_sources = [c["id"] for c in CARDS if c["kind"] != "Creep" and u["army_slot"] in c["slots"]
                    and set(c["faction_tags"]) <= set(max((card_ids[f]["faction_tags"] for f in ok), key=len))]
    if not slot_sources:
        Wn(f"{u['id']}: no card provides a {u['army_slot']} slot for it")

for x in UNITS + CARDS:
    if x.get("provisional"):
        E(f"{x['id']}: still marked provisional")

# Air slots are provided but no Air unit exists yet
if not any(u["army_slot"] == "Air" for u in UNITS):
    Wn("Faction cards provide Air slots, but no unit in the current card set uses the Air slot.")

data = {
    "meta": {
        "game": "StarCraft: Tabletop Miniatures Game",
        "sources": {
            "unit_cards": "Terran/Protoss/Zerg Units 1 & 2 PDFs (unit cards v1.03.26-v1.06.26); Terran Update 3, Protoss Update 2, Zerg Update 3 (cards v1.09.26)",
            "costs": "Unit Cost Table 10.6, 09.10.2026 as reissued with the v1.09.26 cards (with 10.6 Changelog)",
            "rules": "Full Rules Part 9.1; Organized Play Rules",
        },
        "engagement_scales": [
            {"id": "skirmish", "name": "Skirmish", "minerals_max": 1000, "gas": "10% of Minerals", "battlefield": "36x36"},
            {"id": "standard", "name": "Standard", "minerals_max": 2000, "gas": "10% of Minerals", "battlefield": "54x36"},
            {"id": "grand-offensive", "name": "Grand Offensive", "minerals_min": 2001, "gas": "10% of Minerals", "battlefield": "72x36"},
        ],
        "resources": RES,
    },
    "units": [], "cards": [], "missions": MISSIONS, "deployments": DEPLOYMENTS, "scenario_notes": SCENARIO_NOTES,
}
for u in UNITS:
    d = copy.deepcopy(u)
    c = UNIT_COSTS.get(u["id"])
    if c:
        d["compositions"] = [{"models": m, "minerals": mi, "supply": s} for m, mi, s in c["compositions"]]
        for up in d["upgrades"]:
            k = next((k for k in c["upgrades"] if norm(k) == norm(up["name"])), None)
            up["cost_by_composition"] = c["upgrades"][k][1] if k else None
    else:
        d["compositions"] = []
    data["units"].append(d)

# Post-assembly guard: runs after every unit is built, so a later unit overwriting a shared object is caught.
for d in data["units"]:
    for up in d["upgrades"]:
        cbc = up.get("cost_by_composition")
        if cbc is None or len(cbc) != len(d["compositions"]) or any(x is None for x in cbc):
            E(f"{d['id']}: upgrade {up['name']} cost_by_composition {cbc} does not fit compositions {[x['models'] for x in d['compositions']]}")
        elif cbc != UNIT_COSTS[d["id"]]["upgrades"][next(k for k in UNIT_COSTS[d["id"]]["upgrades"] if norm(k) == norm(up["name"]))][1]:
            E(f"{d['id']}: upgrade {up['name']} cost {cbc} differs from cost table")
    for a in d["abilities"]:
        if "cost_by_composition" in a:
            E(f"{d['id']}: base ability {a['name']} carries a mineral cost")
for c in CARDS:
    d = dict(c)
    d["gas_cost"] = GAS_COSTS.get(c["id"], 0 if c["kind"] == "Faction" else None)
    data["cards"].append(d)

if not errors:
    json.dump(data, open("/home/claude/sc_data/starcraft_tmg_data.json", "w"), indent=1, ensure_ascii=False)
else:
    print("JSON NOT WRITTEN: errors present")

print(f"units={len(UNITS)} (fieldable={sum(not u['summoned'] for u in UNITS)}, summoned={sum(u['summoned'] for u in UNITS)}) "
      f"cards={len(CARDS)} (faction={sum(c['kind']=='Faction' for c in CARDS)}, tactical={sum(c['kind']=='Tactical' for c in CARDS)}, creep={sum(c['kind']=='Creep' for c in CARDS)}) "
      f"missions={len(MISSIONS)} deployments={len(DEPLOYMENTS)}")
print("ERRORS:", len(errors)); [print("  -", e) for e in errors]
print("WARNINGS:", len(warnings)); [print("  -", w) for w in warnings]
sys.exit(1 if errors else 0)
