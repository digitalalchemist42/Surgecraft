# Unit Cost Table 10.6 — "Units and Upgrade Points", dated 09.10.2026 (supersedes the September 2026 table).
# Values cross-checked against the 10.6 Changelog (09.10.2026); every changed value matches both documents.
# compositions: [(models, minerals, supply)]; upgrades: {name: (type_str, [cost per composition, None where '-'])}

UNIT_COSTS = {
    # TERRAN
    "marine": {"compositions": [(6, 170, 1), (9, 220, 2)], "upgrades": {
        "AGG-12": ("SPECIALIST, FOR C-14 Rifle", [10, 10]), "Bayonet": ("FOR Strike", [20, 30]),
        "Combat Shield": ("-", [20, 30]), "Grenades - Frag": ("-", [10, 10]),
        "Rocket Launcher": ("SPECIALIST", [40, 40]), "Slugthrower": ("-", [10, 20])}},
    "raynors-raider": {"compositions": [(6, 230, 1)], "upgrades": {}},
    "marauder": {"compositions": [(2, 160, 1), (4, 290, 2)], "upgrades": {
        "Kinetic Foam": ("-", [20, 40]), "Laser Targeting Systems": ("-", [20, 40]),
        "Veteran of Tarsonis": ("-", [20, 40])}},
    "medic": {"compositions": [(3, 120, 1)], "upgrades": {
        "A-13 Flash Grenade Launcher": ("-", [20]), "Advanced Medic Facilities": ("-", [60]),
        "Stabilizer Medpacks": ("-", [20])}},
    "goliath": {"compositions": [(1, 180, 2)], "upgrades": {
        "Ares-Class Targeting System": ("-", [20]), "Haywire Missiles": ("FOR Hellfire Missiles", [40]),
        "Scatter Missiles": ("FOR Hellfire Missiles", [30])}},
    "jim-raynor": {"compositions": [(1, 280, 1)], "upgrades": {"C-14 Rifle": ("FOR Commando Rifle", [0])}},
    "siege-tank": {"compositions": [(1, 220, 2)], "upgrades": {
        "Mode Transformation": ("-", [20]), "Coordinated Strike": ("-", [20]),
        "Shaped Blast": ("-", [10]), "Smart Shells": ("-", [10])}},
    # ZERG
    "zergling": {"compositions": [(12, 150, 1), (18, 210, 2)], "upgrades": {
        "Adrenal Glands": ("-", [20, 20]), "Burrow Ambush": ("-", [20, 30]), "Shredding Claws": ("FOR Claws", [10, 10])}},
    "raptor": {"compositions": [(12, 210, 1), (18, 260, 2)], "upgrades": {
        "Adrenal Glands": ("-", [20, 20]), "Burrow Ambush": ("-", [20, 30]), "Shredding Claws": ("FOR Claws", [10, 10])}},
    "kerrigan-swarm-raptor": {"compositions": [(6, 230, 1)], "upgrades": {}},
    "swarmling": {"compositions": [(18, 210, 1)], "upgrades": {"Burrow Ambush": ("-", [20])}},
    "roach": {"compositions": [(3, 170, 1)], "upgrades": {
        "Burrow Ambush": ("-", [20]), "Glial Reconstitution": ("-", [10]), "Hydriodic Bile": ("-", [10]), "Tunneling Claws": ("-", [10])}},
    "vile": {"compositions": [(3, 190, 1)], "upgrades": {
        "Burrow Ambush": ("-", [20]), "Glial Reconstitution": ("-", [10]), "Hydriodic Bile": ("-", [10]), "Tunneling Claws": ("-", [10])}},
    "corpser": {"compositions": [(3, 220, 1)], "upgrades": {
        "Burrow Ambush": ("-", [20]), "Glial Reconstitution": ("-", [10]), "Hydriodic Bile": ("-", [10]), "Tunneling Claws": ("-", [10])}},
    "hydralisk": {"compositions": [(2, 140, 2), (4, 260, 3)], "upgrades": {
        "Ancillary Carapace": ("-", [20, 30]), "Burrow Ambush": ("-", [20, 40]),
        "Grooved Spines": ("-", [20, 30]), "Lurking": ("-", [10, 10])}},
    "queen": {"compositions": [(1, 140, 1)], "upgrades": {"Creep Speed": ("-", [10]), "Domineering Presence": ("-", [10])}},
    "kerrigan": {"compositions": [(1, 250, 1)], "upgrades": {}},
    "ravager": {"compositions": [(1, 160, 1), (2, 270, 2)], "upgrades": {
        "Bloated Bile Ducts": ("-", [20, 40]), "Burrow Ambush": ("-", [20, 40]), "Potent Bile": ("-", [20, 40])}},
    # PROTOSS
    "zealot": {"compositions": [(3, 170, 2)], "upgrades": {
        "Leg Enhancements": ("-", [20]), "My Life for Aiur": ("-", [10]), "We Stand as One": ("-", [20]), "Zealous Round": ("-", [10])}},
    "praetor-guard": {"compositions": [(3, 260, 2)], "upgrades": {}},
    "adept": {"compositions": [(4, 160, 1)], "upgrades": {
        "Glaive Strike": ("FOR Strike", [20]), "Guidance": ("-", [10]), "Resonating Glaives": ("-", [20])}},
    "sentry": {"compositions": [(2, 130, 1)], "upgrades": {"Hallucination": ("-", [20]), "Solid-Field Projectors": ("-", [10])}},
    "stalker": {"compositions": [(1, 160, 1), (2, 270, 2)], "upgrades": {
        "Fury of the Nerazim": ("-", [20, 30]), "Path of Shadows": ("-", [20, 40])}},
    "artanis": {"compositions": [(1, 270, 1)], "upgrades": {}},
    "zeratul": {"compositions": [(1, 230, 1)], "upgrades": {}},
    "nerazim-watchers": {"compositions": [(4, 210, 1)], "upgrades": {}},
    "immortal": {"compositions": [(1, 280, 2)], "upgrades": {
        "Shield Overcharge": ("-", [20]), "Left Phase Disruptor": ("FOR Left Photon Disruptor", [20]),
        "Right Phase Disruptor": ("FOR Right Photon Disruptor", [20]), "Fury Unyielding": ("-", [20]),
        "For the Ancients": ("-", [20])}},
}

GAS_COSTS = {
    # Terran
    "barracks": 30, "barracks-proxy": 40, "barracks-tech-lab": 40, "supply-depot": 40, "factory": 35,
    "engineering-bay": 25, "armory": 30, "academy": 40, "orbital-command": 25, "dropship": 35, "factory-tech-lab": 40,
    # Zerg
    "spawning-pool": 25, "spawning-pool-six-pool": 35, "roach-warren": 25, "hydralisk-den": 30, "evolution-chamber": 25,
    "hatchery": 30, "lair": 35, "overseer": 25, "overlord": 35, "cocoon": 30,
    "accelerating-creep": 0, "malignant-creep": 10,
    # Protoss
    "gateway": 25, "warp-gate": 40, "gate-chronoboosted": 35, "observer": 25, "nexus": 40, "overcharged-nexus": 35,
    "power-field": 40, "forge": 30, "warp-prism": 35, "twilight-council": 40, "robotics-facility": 35, "void-seeker": 40,
}
