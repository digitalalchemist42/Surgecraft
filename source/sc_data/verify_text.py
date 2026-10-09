"""Second-source check: compare visually transcribed weapon rows and stat lines against each card page's PDF text layer."""
import json, re, subprocess
U = "/root/.claude/uploads/9abf6e13-647f-5f56-85fc-b76ff3a4a35a/"
PAGES = {
    "marine": ("6e9a93c5-Terran_Units_1.pdf", 1), "marauder": ("6e9a93c5-Terran_Units_1.pdf", 2),
    "medic": ("6e9a93c5-Terran_Units_1.pdf", 3), "jim-raynor": ("6e9a93c5-Terran_Units_1.pdf", 4),
    "point-defense-drone": ("6e9a93c5-Terran_Units_1.pdf", 5), "raynors-raider": ("6e9a93c5-Terran_Units_1.pdf", 6),
    "goliath": ("6e9a93c5-Terran_Units_1.pdf", 7), "siege-tank": ("dbeeb9ee-Terran_Units_2.pdf", 1),
    "adept": ("39373445-Protoss_Units_1.pdf", 1), "artanis": ("39373445-Protoss_Units_1.pdf", 2),
    "praetor-guard": ("39373445-Protoss_Units_1.pdf", 3), "pylon": ("39373445-Protoss_Units_1.pdf", 4),
    "sentry": ("39373445-Protoss_Units_1.pdf", 5), "stalker": ("39373445-Protoss_Units_1.pdf", 6),
    "zealot": ("39373445-Protoss_Units_1.pdf", 7), "immortal": ("fbf9dae7-Protoss_Units_2.pdf", 1),
    "zeratul": ("fbf9dae7-Protoss_Units_2.pdf", 2), "nerazim-watchers": ("fbf9dae7-Protoss_Units_2.pdf", 3),
    "hydralisk": ("c9ea1507-Zerg_Units_1.pdf", 1), "kerrigan": ("c9ea1507-Zerg_Units_1.pdf", 2),
    "omega-worm": ("c9ea1507-Zerg_Units_1.pdf", 3), "kerrigan-swarm-raptor": ("c9ea1507-Zerg_Units_1.pdf", 4),
    "queen": ("c9ea1507-Zerg_Units_1.pdf", 5), "roach": ("c9ea1507-Zerg_Units_1.pdf", 6),
    "corpser": ("c9ea1507-Zerg_Units_1.pdf", 7), "roachling": ("c9ea1507-Zerg_Units_1.pdf", 8),
    "vile": ("c9ea1507-Zerg_Units_1.pdf", 9), "zergling": ("c9ea1507-Zerg_Units_1.pdf", 10),
    "raptor": ("c9ea1507-Zerg_Units_1.pdf", 11), "swarmling": ("c9ea1507-Zerg_Units_1.pdf", 12),
    "ravager": ("211ca09c-Zerg_Units_2.pdf", 1),
}
data = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
ok = bad = 0
problems = []

def page_text(f, p):
    return subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), "-layout", U + f, "-"],
                          capture_output=True, text=True).stdout

def toks(s):
    return re.sub(r",", " ", s).split()

for u in data["units"]:
    f, p = PAGES[u["id"]]
    lines = page_text(f, p).splitlines()
    joined = " ".join(" ".join(l.split()) for l in lines)
    # weapons (base + upgrade)
    for w in [x for x in u["weapons"] + u["upgrades"] if x["kind"] == "weapon"]:
        exp = toks(" ".join([w["rng"], w["target"], w["roa"], w["hit"], w["surge_type"], w["s_dice"], w["dmg"]]))
        name = w["name"].upper().replace('"', '')
        cands = [l for l in lines if name.split()[0].replace('"', '') in l.upper().replace('"', '').replace('“', '').replace('”', '')]
        found = False
        for l in cands:
            t = toks(l)
            for seq in (exp, exp[::-1]):
                n = len(seq)
                if any(t[i:i + n] == seq for i in range(len(t) - n + 1)):
                    found = True
        # multi-line surge ("Light, Armoured" wraps) -> fall back to searching the joined text
        if not found:
            core = " ".join([w["rng"], w["target"], w["roa"], w["hit"]])
            if core in joined or " ".join(core.split()[::-1]) in joined:
                found = "partial"
        if found is True:
            ok += 1
        else:
            bad += 1
            problems.append(f"{u['id']}: weapon {w['name']} expected {exp} -> {'core only' if found else 'NOT FOUND'}")
    # stat line: speed armour evade hp
    s = u["stats"]
    stat_seq = [str(s["speed"]), s["armour"], s["evade"], str(s["hp"])]
    if " ".join(stat_seq) in joined or " ".join(stat_seq[::-1]) in joined:
        ok += 1
    else:
        bad += 1
        problems.append(f"{u['id']}: stat line {stat_seq} not found")
    # supply brackets
    br = [b["models"] for b in u["supply_profile"]]
    if " ".join(br) in joined or " ".join(br[::-1]) in joined:
        ok += 1
    else:
        bad += 1
        problems.append(f"{u['id']}: supply brackets {br} not found")

print(f"checks passed={ok} flagged={bad}")
for pr in problems:
    print(" -", pr)
