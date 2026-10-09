# Faction, Tactical and Creep cards — transcribed visually from the TACTICAL CARDS pages of each faction PDF.
# Fields: kind (Faction/Tactical/Creep), unique, faction_tags, slots {type: count}, resource {type, value} (value generated when Exhausted),
# abilities (phase, name, type, text), card_version. Gas cost is joined later from the Unit Cost Table.

def C(id, name, kind, race, tags, slots, res_val, abilities, unique=False, version=None, corrections=None, notes=None):
    res_type = {"Terran": "CP", "Protoss": "PE", "Zerg": "BM"}[race]
    return {"id": id, "name": name, "kind": kind, "race": race, "faction_tags": tags, "unique": unique,
            "slots": slots, "resource": {"type": res_type, "value": res_val},
            "abilities": [{"phase": p, "name": n, "type": t, "text": x} for p, n, t, x in abilities],
            "card_version": version, "corrections": corrections or [], "notes": notes or []}

T, P, Z = "Terran", "Protoss", "Zerg"
QUICK_STRIKES = ("Combat", "Quick Strikes", "Active", "The active Unit's first Close Combat Weapon used gains PRECISION (2).")
STRATEGIC_RECALL = ("Movement", "Strategic Recall", "Active", "The active, Unengaged Ground Unit is returned to Reserves instead of performing an action.")
GO_GO_GO = ("Movement", "Go! Go! Go!", "Active", "The active Biological Unit performs a 2\" Move action. This does not count towards its action limit.")
FIELD_REPAIR = ("Movement", "Field Repair", "Active", "The active Mechanical Unit resolves the HEAL (2) effect.")
CREEP_SPREAD = ("Movement", "Creep Spread", "Active", "Set a Creep Tumor token on the battlefield Within 6\" (Line of Sight is not required) of either a Friendly Entry Edge or an existing Friendly Creep Tumor token.")
FERAL_RAGE = ("Combat", "Feral Rage", "Active", "The active Unit's first Close Combat Weapon used gains PRECISION (2).")
CREEP_REMOVAL = ("Any", "Creep Removal", "Passive", "If an Enemy Unit ends a Move, Deploy, Run, Charge or Disengage action Within 1\" of a Friendly Creep Tumor token, remove that token from the battlefield.")
LIVING_GLOB = ("Any", "Living Glob of Tissue", "Passive", "Creep Tumor tokens have STAY IN PLAY and DISPLACEMENT.")

CARDS = [
    # ---------------- TERRAN ----------------
    C("terran-armed-forces", "Terran Armed Forces", "Faction", T, ["Terran"], {"Core": 3, "Elite": 1, "Support": 1, "Air": 1}, 1, [
        ("Movement", "Tactical Retreat", "Active", "The active Unit ignores the Disengage penalty for the remainder of the Round."),
        ("Movement", "Terran Tenacity", "Active", "Once per Game. Immediately claim the First Player Marker. No other player may claim the First Player Marker for the remainder of this Phase.")],
      unique=True, version="v1.04.26"),
    C("raynors-raiders", "Raynor's Raiders", "Faction", T, ["Terran", "Raynor's Raiders"], {"Core": 3, "Hero": 1, "Support": 1, "Air": 1}, 1, [
        ("Movement", "Rapid Ingress", "Active", "Set a Friendly Point Defense Drone Unit anywhere on the battlefield, more than 1\" away from any Enemy model. Remove this Unit at the End of the Round."),
        ("Movement", "Ready for Pickup?", "Active", "Once Per Game. The active Unit resolves the PLACE (12) effect. Models set by this effect cannot be set up Within the Engagement Range of any Enemy Unit. This resolves instead of performing a standard action.")],
      unique=True, version="v1.04.26",
      corrections=["Rapid Ingress printed 'Point Defence Drone'; the unit card is titled 'Point Defense Drone' — normalized to the unit card spelling."]),
    C("barracks", "Barracks", "Tactical", T, ["Terran"], {"Core": 1}, 1, [GO_GO_GO], version="v1.04.26"),
    C("barracks-proxy", "Barracks (Proxy)", "Tactical", T, ["Terran"], {"Core": 2}, 2, [
        GO_GO_GO,
        ("Movement", "Armed and Ready", "Active", "The active Biological Unit Deploys from any table edge that is not a player's Entry Edge. No model may be placed Within 10\" of any Enemy model. This ability cannot be used if another Friendly Biological Unit has already been Deployed this Round.")],
      unique=True, version="v1.04.26"),
    C("barracks-tech-lab", "Barracks (Tech Lab)", "Tactical", T, ["Terran"], {"Core": 1, "Elite": 1}, 2, [
        GO_GO_GO,
        ("Assault", "Let's Have a Blast!", "Active", "The active Biological Unit's first Ranged Weapon used gains ANTI-EVADE (1).")],
      unique=True, version="v1.04.26"),
    C("engineering-bay", "Engineering Bay", "Tactical", T, ["Terran"], {"Core": 1}, 1, [
        ("Any", "Infantry Armour", "Reaction", "Use before a Friendly Biological Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll."),
        ("Assault", "Infantry Weapons", "Active", "The active Biological Unit's first Ranged Weapon used gains CRITICAL HIT (1).")],
      version="v1.04.26", corrections=["Ability printed 'Infantry Armor'; normalized to the rulebook's 'Armour' spelling."]),
    C("academy", "Academy", "Tactical", T, ["Terran"], {"Support": 2}, 1, [
        ("Any", "Advanced Training", "Reaction", "Once per Round, when a Friendly Support Unit activates a Special Ability that costs CP, resolve that ability with its CP cost reduced by 1 (to a minimum of 0). Do not Exhaust this card.")],
      unique=True, version="v1.04.26"),
    C("supply-depot", "Supply Depot", "Tactical", T, ["Terran"], {"Core": 1, "Elite": 1, "Hero": 1}, 1, [
        ("Movement", "Additional Supply Depots", "Active", "The active Unit's Supply Value is improved by 1 for Controlling and Contesting Mission Markers and completing objectives.")],
      unique=True, version="v1.04.26"),
    C("orbital-command", "Orbital Command", "Tactical", T, ["Terran"], {"Core": 1}, 1, [
        ("Movement", "Comsat Station", "Active", "Select one table edge that is not a player's Entry Edge. Until the End of the Round, Enemy Units cannot Deploy from that edge."),
        ("Movement", "Scanner Sweep", "Active", "Set a Faction Indicator anywhere on the battlefield. While Enemy Units are Within 6\" of this Faction Indicator, they lose HIDDEN Status.")],
      unique=True, version="v1.04.26"),
    C("dropship", "Dropship", "Tactical", T, ["Terran"], {"Core": 1, "Support": 1}, 1, [
        ("Movement", "Strap In!", "Active", "The active, Unengaged Ground Unit is returned to Reserves instead of performing an action."),
        ("Movement", "Ready for Dust-Off", "Active", "Set a Faction Indicator anywhere on the battlefield more than 10\" away from any Enemy model. At the End of the Round, the controlling player may Deploy one Ground Unit from Reserves in base-to-base contact with this Faction Indicator.")],
      unique=True, version="v1.04.26"),
    C("factory", "Factory", "Tactical", T, ["Terran"], {"Elite": 2}, 1, [FIELD_REPAIR], version="v1.03.26"),
    C("factory-tech-lab", "Factory (Tech Lab)", "Tactical", T, ["Terran"], {"Elite": 2}, 1, [
        FIELD_REPAIR,
        ("Assault", "Pound 'Em Flat!", "Active", "If the active Mechanical Unit has the Stationary Status, its first Ranged Weapon used gains PRECISION (2).")],
      unique=True, version="v1.06.26"),
    C("armory", "Armory", "Tactical", T, ["Terran"], {"Elite": 1}, 1, [
        ("Any", "Vehicle Plating", "Reaction", "Use before a Friendly Mechanical Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll."),
        ("Assault", "Vehicle Weapons", "Active", "The active Mechanical Unit's first Ranged Weapon used gains CRITICAL HIT (1).")],
      version="v1.03.26", corrections=["Vehicle Weapons printed '...Ranged Weapon used gain CRITICAL HIT'; corrected to 'gains'."]),

    # ---------------- PROTOSS ----------------
    C("daelaam", "Daelaam", "Faction", P, ["Protoss"], {"Core": 3, "Elite": 1, "Support": 1, "Air": 1}, 1, [
        ("Any", "Dae'uhl", "Reaction", "When a Friendly Unit receives Damage, reduce the Total Damage by 2 (to a minimum of 1)."),
        ("Movement", "Mass Recall", "Active", "Once per Game. Set a Faction Indicator anywhere on the battlefield. All Friendly Protoss Units Within 6\" of this Faction Indicator are removed from the battlefield and returned to Reserves.")],
      unique=True, version="v1.04.26"),
    C("khalai", "Khalai", "Faction", P, ["Protoss", "Khalai"], {"Core": 3, "Elite": 2, "Hero": 1}, 1, [
        ("Movement", "Pylon Warp-In", "Active", "If there is no Friendly Pylon on the battlefield, set a Friendly Pylon Unit anywhere on the GROUND LEVEL of the battlefield more than 10\" away from any Enemy model. This Round, the Pylon is not eligible to use its Special Abilities (excluding Structure)."),
        ("Movement", "Bound by the Khala", "Active", "At the end of the active Unit's Activation, select one other Friendly Unit eligible to Activate in the current Phase. Immediately Activate that Unit.")],
      unique=True, version="v1.04.26"),
    C("nerazim", "Nerazim", "Faction", P, ["Protoss", "Nerazim"], {"Core": 2, "Elite": 3, "Hero": 1}, 1, [
        ("Any", "Might of the Nerazim", "Reaction", "If a Friendly Unit loses the HIDDEN Status, it gains BUFF Speed (2) and its first Weapon used gains CRITICAL HIT (2)."),
        ("Movement", "Darkness Descends", "Active", "The active Biological Unit gains the HIDDEN Status until the End of the Round.")],
      unique=True, version="v1.06.26",
      corrections=["Might of the Nerazim printed '...its first Weapon used CRITICAL HIT (2)'; inserted the missing verb 'gains'."]),
    C("gateway", "Gateway", "Tactical", P, ["Protoss"], {"Core": 1}, 1, [QUICK_STRIKES], version="v1.04.26"),
    C("gate-chronoboosted", "Gate Chronoboosted", "Tactical", P, ["Protoss"], {"Core": 1, "Elite": 1}, 1, [
        ("Movement", "Zealous Charge", "Active", "The active Unit gains BUFF Speed (2)."), QUICK_STRIKES],
      unique=True, version="v1.03.26"),
    C("warp-gate", "Warp Gate", "Tactical", P, ["Protoss"], {"Core": 2}, 1, [
        ("Movement", "Warp In", "Active", "The active Ground Unit Deploys from any table edge that is not a player's Entry Edge. This deployment must end more than 10\" away from any Enemy model. The controlling player cannot use this ability if another Friendly Ground Unit has already Deployed this Round."),
        QUICK_STRIKES],
      unique=True, version="v1.03.26"),
    C("warp-prism", "Warp Prism", "Tactical", P, ["Protoss"], {"Core": 2}, 1, [
        ("Movement", "Phase", "Active", "The active Unit resolves the PLACE (3) effect."),
        ("Movement", "Warp Conduit", "Active", "Set a Faction Indicator anywhere on the battlefield more than 10\" away from any Enemy model. At the End of the Round, you may Deploy one Ground unit from Reserves in base-to-base Contact with this Faction Indicator.")],
      unique=True, version="v1.04.26"),
    C("nexus", "Nexus", "Tactical", P, ["Protoss"], {"Core": 2}, 1, [
        ("Any", "Ancient Pride", "Active", "The active Unit's first Weapon used gains INSTANT."), STRATEGIC_RECALL],
      unique=True, version="v1.04.26"),
    C("overcharged-nexus", "Overcharged Nexus", "Tactical", P, ["Protoss"], {"Core": 1, "Elite": 1}, 1, [
        ("Any", "Photon Overcharge", "Reaction", "Use when an Enemy Unit enters the battlefield from Reserves via a location other than its own Entry Edge. That Unit immediately suffers HITS 3 (1)."),
        STRATEGIC_RECALL],
      unique=True, version="v1.04.26"),
    C("twilight-council", "Twilight Council", "Tactical", P, ["Protoss"], {"Support": 1, "Elite": 1}, 1, [
        ("Any", "Veil of Shadows", "Reaction", "Use after a Friendly Unit resolves a PLACE effect. That Unit immediately resolves the HEAL (2) effect."),
        ("Assault", "Weapons of the Firstborn", "Active", "The active Ground Unit's first Ranged Weapon used gains BUFF Range (4).")],
      unique=True, version="v1.03.26"),
    C("observer", "Observer", "Tactical", P, ["Protoss"], {"Support": 1}, 1, [
        ("Movement", "Surveillance", "Active", "Set a Faction Indicator anywhere on the battlefield. While Enemy Units are Within 6\" of this Faction Indicator, they lose HIDDEN Status."),
        ("Assault", "Gravitic Boosters", "Reaction", "Use after a Friendly Unit rolls a D6 for Charge Distance. Add 1 to the Charge Distance for this Unit.")],
      unique=True, version="v1.04.26"),
    C("forge", "Forge", "Tactical", P, ["Protoss"], {"Elite": 1}, 1, [
        ("Any", "Ground Armour", "Reaction", "Use before a Friendly Ground Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll."),
        ("Assault", "Ground Weapons", "Active", "The active Ground Unit's first Ranged Weapon used gains CRITICAL HIT (1).")],
      version="v1.04.26", corrections=["Ability printed 'Ground Armor'; normalized to 'Armour'."]),
    C("power-field", "Power Field", "Tactical", P, ["Protoss"], {"Core": 1, "Elite": 1, "Hero": 1}, 1, [
        ("Any", "Guardian Shell", "Reaction", "Use before a Friendly Ground Unit makes an Armour Roll. That Unit gains DODGE (2) for this roll.")],
      unique=True, version="v1.04.26"),
    C("robotics-facility", "Robotics Facility", "Tactical", P, ["Protoss"], {"Elite": 2}, 1, [
        ("Any", "Plasma Shields", "Reaction", "Use before a Friendly Mechanical Ground Unit makes an Armour Roll. If this Unit has the Shielded Status, it gains TOUGH (1) and DODGE (1) for this roll.")],
      version="v1.06.26"),
    C("void-seeker", "Void Seeker", "Tactical", P, ["Protoss", "Nerazim"], {"Core": 1}, 1, [
        ("Movement", "Personal Transport", "Active", "Instead of performing an action, the active, Unengaged Ground Unit is returned to Reserves. Then, it performs a Deploy action."),
        ("Movement", "Anakh Su'n", "Active", "This Unit gains the HIDDEN Status until it performs another action.")],
      unique=True, version="v1.06.26"),

    # ---------------- ZERG ----------------
    C("zerg-swarm", "Zerg Swarm", "Faction", Z, ["Zerg"], {"Core": 3, "Elite": 1, "Support": 1, "Air": 1}, 1, [
        ("Any", "Brood Instinct", "Reaction", "Use before a Friendly Unit makes an Evade Roll. Apply a +1 Modifier to that roll."),
        ("Any", "Zerg Creep", "Passive", "During Army Building, select exactly one Creep Card and add it to their Army List, paying its listed cost (if any)."),
        ("Movement", "Rapid Burrowing", "Active", "Select one Friendly, Unengaged Ground Zerg Unit on the battlefield. That Unit gains the Burrowed Status, even if it has already been Activated this Round.")],
      unique=True, version="v1.04.26"),
    C("kerrigans-swarm", "Kerrigan's Swarm", "Faction", Z, ["Zerg", "Kerrigan's Swarm"], {"Core": 3, "Elite": 2, "Hero": 1}, 1, [
        ("Any", "Wild Mutation", "Active", "If the active unit is ON CREEP, the unit gains BUFF Speed (1) and its first used Weapon gains PRECISION (1)."),
        ("Any", "Zerg Creep", "Passive", "During Army Building, you must select exactly one Creep Card and add it to your Army List, paying its listed cost (if any)."),
        ("Movement", "Omega Network", "Active", "If there is no Friendly Omega Worm on the battlefield, set a Friendly Omega Worm Unit anywhere on GROUND LEVEL of the battlefield, more than 10\" away from any Enemy model. This Round, the Omega Worm is not eligible to use its Special Abilities (excluding Structure).")],
      unique=True, version="v1.04.26",
      notes=["Rulebook 9.1.2 example lists Kerrigan's Swarm as '3x Core, 1x Hero, 2x Support'; the card prints 3x Core, 2x Elite, 1x Hero (and rulebook 9.1.6 also says 2 Elite). Card values used."]),
    C("accelerating-creep", "Accelerating Creep", "Creep", Z, ["Zerg"], {}, None, [
        ("Any", "Speed on Creep", "Passive", "If the active Friendly Zerg Unit is ON CREEP, increase its Speed characteristic by 1."),
        LIVING_GLOB, CREEP_REMOVAL],
      unique=True, version="v1.04.26"),
    C("malignant-creep", "Malignant Creep", "Creep", Z, ["Zerg", "Kerrigan's Swarm"], {}, None, [
        CREEP_REMOVAL, LIVING_GLOB,
        ("Assault", "Malevolent Matriarch", "Passive", "If the active Friendly Zerg Unit declares a Charge action while ON CREEP, it gains +1 Modifier to IMPACT Hit Rolls.")],
      unique=True, version="v1.04.26"),
    C("hatchery", "Hatchery", "Tactical", Z, ["Zerg"], {"Support": 1}, 1, [
        ("Movement", "Lie in Wait", "Active", "The active, Unengaged Ground Unit gains the Burrowed Status."), CREEP_SPREAD],
      version="v1.04.26"),
    C("lair", "Lair", "Tactical", Z, ["Zerg"], {"Core": 1, "Elite": 1}, 1, [
        ("Any", "Predation", "Active", "The active Unit's Close Combat Weapons gain INSTANT."), CREEP_SPREAD],
      unique=True, version="v1.04.26"),
    C("overseer", "Overseer", "Tactical", Z, ["Zerg"], {"Support": 1}, 1, [
        ("Movement", "Oversight Mode", "Active", "Set a Faction Indicator anywhere on the battlefield. While Enemy Units are Within 6\" of this Faction Indicator, they lose HIDDEN Status."),
        ("Assault", "Pneumatized Carapace", "Reaction", "Use after a Friendly Unit rolls a D6 for Charge Distance. Roll an additional D6 and use the higher result to calculate the total Charge Distance.")],
      unique=True, version="v1.04.26"),
    C("overlord", "Overlord", "Tactical", Z, ["Zerg"], {"Core": 1, "Elite": 1, "Hero": 1}, 1, [
        ("Movement", "Ventral Sacs", "Active", "Set a Faction Indicator anywhere on the battlefield more than 10\" away from any Enemy model. At the End of the Round, the controlling player may Deploy one Ground Unit from Reserves in base-to-base contact with this Faction Indicator."),
        ("Assault", "Excrete Creep", "Active", "Set a Creep Tumor token on the battlefield Within 6\" (Line of Sight is not required) of either a Friendly Entry Edge or an existing Friendly Creep Tumor token.")],
      unique=True, version="v1.04.26"),
    C("evolution-chamber", "Evolution Chamber", "Tactical", Z, ["Zerg"], {"Core": 1}, 1, [
        ("Any", "Carapace", "Reaction", "Use before a Friendly Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll."),
        ("Assault", "Extended Claws", "Active", "The active Unit gains a +1 Modifier to all IMPACT Hit Rolls.")],
      version="v1.04.26"),
    C("hydralisk-den", "Hydralisk Den", "Tactical", Z, ["Zerg"], {"Elite": 2}, 1, [
        ("Assault", "Missile Attacks", "Active", "The active Unit's first Ranged Weapon used gains PRECISION (1).")],
      version="v1.03.26"),
    C("roach-warren", "Roach Warren", "Tactical", Z, ["Zerg"], {"Core": 1}, 1, [
        ("Assault", "Nasty Surprise", "Active", "The active Ground Unit loses the Burrowed Status.")],
      version="v1.04.26"),
    C("spawning-pool", "Spawning Pool", "Tactical", Z, ["Zerg"], {"Core": 1}, 1, [FERAL_RAGE], version="v1.04.26"),
    C("spawning-pool-six-pool", "Spawning Pool (Six Pool)", "Tactical", Z, ["Zerg"], {"Core": 2}, 2, [
        ("Movement", "Timing Push", "Active", "The active Zergling Unit Deploys from any table edge that is not a Player's Entry Edge. This action must end more than 10\" away from any Enemy model."),
        FERAL_RAGE],
      unique=True, version="v1.03.26"),
    C("cocoon", "Cocoon", "Tactical", Z, ["Zerg"], {"Elite": 1}, None, [
        ("Movement", "Spawn Larva", "Active", "The active Friendly non-Unique Biological Unit with a Size Characteristic of 1 resolves the RESPAWN (2) effect."),
        ("Movement", "Ravager Morph", "Active", "Once per Game. The active Friendly Roach Unit performs MORPH (Ravager) 1.")],
      unique=True, version="v1.06.26",
      notes=["No BM resource value is printed on this card (the BM box is absent). Treat as unknown until confirmed; the app should not allow it to be Exhausted for BM."]),
]
