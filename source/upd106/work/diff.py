import json, re, sys
old = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
new = json.load(open("/home/claude/upd106/work/costs106.json"))
def norm(s): return re.sub(r"[^a-z0-9]", "", s.lower().replace("’", "'"))
byname = {norm(u["name"]): u for u in old["units"]}
seen = set()
print("== UNITS")
for nm, n in new["units"].items():
    u = byname.get(norm(nm))
    if not u: print("NEW  ", nm, "models", n["models"], "supply", n["supply"], "minerals", n["minerals"], "upgrades", {k: v["costs"] for k, v in n["upgrades"].items()}); continue
    seen.add(u["id"])
    om = [c["models"] for c in u["compositions"]]; os_ = [c["supply"] for c in u["compositions"]]; oc = [c["minerals"] for c in u["compositions"]]
    if om != n["models"] or os_ != n["supply"]: print("COMP ", u["name"], om, os_, "->", n["models"], n["supply"])
    if oc != n["minerals"]: print("COST ", u["name"], oc, "->", n["minerals"])
    oup = {x["name"]: x for x in u["upgrades"]}
    for k, v in n["upgrades"].items():
        x = oup.get(k)
        if not x:
            cand = [o for o in oup if norm(o) == norm(k)]
            x = oup.get(cand[0]) if cand else None
        if not x: print("UPNEW", u["name"], k, v); continue
        if (x.get("cost_by_composition") or []) != v["costs"]: print("UPCST", u["name"], k, x.get("cost_by_composition"), "->", v["costs"])
        t = v["type"]; spec = "SPECIALIST" in t; rep = re.sub(r"^.*FOR ", "", t) if "FOR " in t else None
        if spec != bool(x.get("specialist")) or (rep or None) != (x.get("replaces") or None): print("UPTYP", u["name"], k, "card:", x.get("specialist"), x.get("replaces"), "table:", t)
    for o in oup:
        if norm(o) not in {norm(k) for k in n["upgrades"]} and n["upgrades"]: print("UPGONE", u["name"], o)
        elif not n["upgrades"] and oup: pass
    if not n["upgrades"] and oup: print("NOUPS", u["name"], "table lists no upgrades; card has", list(oup))
for u in old["units"]:
    if u["id"] not in seen and not u["summoned"]: print("MISSING_FROM_TABLE", u["name"])
print("== CARDS")
cbn = {norm(c["name"]): c for c in old["cards"]}
for nm, g in new["gas"].items():
    c = cbn.get(norm(nm))
    if not c: print("NEW  ", nm, g); continue
    if c.get("gas_cost") != g: print("GAS  ", c["name"], c.get("gas_cost"), "->", g)
for c in old["cards"]:
    if c["kind"] != "Faction" and norm(c["name"]) not in {norm(k) for k in new["gas"]}: print("MISSING_FROM_TABLE", c["name"])
