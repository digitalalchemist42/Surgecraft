# Provisional cards for units and cards priced in the Unit Cost Table 10.6 (09.10.2026) whose printed cards are not
# available yet. Transcribed from preview screenshots supplied by the user on 9 October 2026, exactly as shown.
# Every entry carries provisional=True so the app can label it, and should be replaced when the official cards arrive.
# Costs come from the 10.6 cost table, which wins where the preview shows a different number.
from common import W, A, U

PV = "Preview (Oct 2026)"
NOTE = "Provisional: transcribed from a preview, not the printed card. Faction tags, combat role and base size are not shown in the preview."

STRUCTURE = A("Any", "Structure", "Passive", None,
              "This Unit cannot be Activated in any Phase and cannot perform actions. Additionally, its Current Supply Value is treated as 0, and it can never Control or Contest Mission Markers, ignoring the standard Zero Supply Exception. This Unit cannot be a target of an ability, unless stated otherwise.")
TIMED_LIFE = A("Any", "Timed Life", "Passive", None, "Remove this Unit at the End of the Round.")
BATTLE_PREP = A("Any", "Battle Preparation", "Passive", None,
                "During Army Building, your army cannot include both the Nova Assault Mode Unit and the Nova Stealth Mode Unit.")
GHOST_VISOR = A("Any", "Ghost Visor", "Passive", None, "While Enemy Units are Within 6\" of this Unit, they lose the HIDDEN Status.")
HOLO_DECOY = A("Movement", "Holo Decoy", "Active", "1 CP", "Resolve the SUMMON (Holo Decoy) effect. Then, Holo Decoy may immediately perform a Move action.")
SUPER_STIM = A("Movement", "Super Stimpack", "Active", "1 CP", "This Unit gains BUFF Speed (2). Additionally, all its Weapons gain PRECISION (2).")
FEEDBACK = A("Movement", "Feedback", "Active", "1 PE",
             "Target one Enemy Mechanical or Psionic Unit Within 8\". Until the End of the Round, after that Unit resolves an Active or Reaction Special Ability (excluding abilities granted by a Tactical Card or Faction Card), it suffers NON-LETHAL DAMAGE (3).")
TEMPLAR_STATS = dict(shield=3, speed="4/7", armour="5+", evade="6+", hp=3, size=2)


def P(**kw):
    kw.setdefault("card_version", PV)
    kw.setdefault("notes", [NOTE])
    kw.setdefault("role", None)
    return U(provisional=True, **kw)


TERRAN = [
    P(id="nova-assault-mode", name="Nova Assault Mode", race="Terran", tags=["Terran"], slot="Hero", unique=True,
      stats=dict(speed="7", armour="5+", evade="5+", hp=8, size=2), supply=[("1-1", 1)],
      combat_tags=["Biological", "Psionic", "Ground"], excludes=["nova-stealth-mode"],
      abilities=[BATTLE_PREP, GHOST_VISOR, HOLO_DECOY, SUPER_STIM,
                 A("Assault", "Phase Reactor Suit", "Active", "1 CP", "If Unengaged, resolve the PLACE (6) effect."),
                 A("Assault", "Devastating Charge", "Passive", None, "Immediately after this Unit completes a successful Charge, resolve the IMPACT (4) 4+ effect.")],
      weapons=[W("Assault", "Hellfire Shotgun", "8", "Ground", "3", "4+", "Light", "D3", "2", ["ANTI-EVADE (1)", "BURST FIRE 4\" (3)"]),
               W("Combat", "Monomolecular Blade", "E", "Ground", "8", "3+", "Light, Armoured", "D6", "1", [])],
      upgrades=[]),
    P(id="nova-stealth-mode", name="Nova Stealth Mode", race="Terran", tags=["Terran"], slot="Hero", unique=True,
      stats=dict(speed="7", armour="5+", evade="5+", hp=8, size=2), supply=[("1-1", 1)],
      combat_tags=["Biological", "Psionic", "Ground"], excludes=["nova-assault-mode"],
      abilities=[BATTLE_PREP,
                 A("Any", "Tactical Stealth Suit", "Passive", None, "After this Unit fully resolves an Action, it gains the HIDDEN Status."),
                 GHOST_VISOR, SUPER_STIM, HOLO_DECOY,
                 A("Assault", "Operational Efficiency", "Passive", None,
                   "After this Unit fully resolves a Ranged Attack with its C-20A Canister Rifle, if the target Enemy Unit was Destroyed or its Current Supply Value was reduced, the active player may return one of their Exhausted non-Unique Tactical Cards to its Ready state."),
                 A("Assault", "Head Shot", "Reaction", "1 CP",
                   "Once Per Game. While this Unit is Unengaged and has the Stationary Status, when it makes a Ranged Attack with its C-20A Canister Rifle, treat that weapon's Damage characteristic as 3, and it gains CONCENTRATED FIRE (1).")],
      weapons=[W("Assault", "C-20A Canister Rifle", "12", "All", "4", "3+", "-", "-", "2", ["CRITICAL HIT (2)", "LONG RANGE (18\")"]),
               W("Combat", "Combat Knife", "E", "Ground", "3", "5+", "-", "-", "1", [])],
      upgrades=[]),
    P(id="spec-ops-marauder", name="Spec Ops Marauder (Marauder)", race="Terran", tags=["Terran"], slot="Core",
      stats=dict(speed="4/7", armour="4+", evade="6+", hp=5, size=2), supply=[("1-1", 0), ("2-2", 1)],
      combat_tags=["Armoured", "Biological", "Ground"],
      abilities=[A("Any", "Spec Ops Armour", "Active", "1 CP", "This Unit gains the HIDDEN Status until it performs another action."),
                 A("Movement", "Commando Stimpack", "Active", "1 CP", "This Unit gains BUFF Speed (3). Additionally, its Quad K12 and all Close Combat Weapons gain PRECISION (2)."),
                 A("Assault", "Magrail Munitions", "Passive", None, "This Unit's first Attack in the game with its Quad K12 gains PIERCE Armoured (3)."),
                 A("Assault", "Suppression Shells", "Reaction", "1 CP", "When an Enemy declares a Charge against a Friendly Unit Within 8\", that Enemy gains DEBUFF Speed (3).")],
      weapons=[W("Assault", "Quad K12", "12", "Ground", "3", "3+", "Armoured", "D3", "1", ["LONG RANGE (16\")", "PIERCE Armoured (2)"]),
               W("Combat", "Strike", "E", "Ground", "3", "4+", "-", "-", "1", [])],
      upgrades=[],
      notes=[NOTE, "The preview shows 230 Minerals; the 10.6 Unit Cost Table (09.10.2026) lists 240, which is used."]),
    P(id="raven", name="Raven", race="Terran", tags=["Terran"], slot="Support",
      stats=dict(speed="7", armour="5+", evade="6+", hp=8, size="-"), supply=[("1-1", 1)],
      combat_tags=["Light", "Mechanical", "Flying"],
      abilities=[A("Any", "Detection", "Passive", None, "While Enemy Units are Within 6\" of this Unit, they lose the HIDDEN Status."),
                 A("Movement", "Deploy Auto-Turret", "Active", "1 CP", "Set a Friendly Auto-Turret Unit Within 6\", and not Within the Engagement Range of any Enemy Unit."),
                 A("Movement", "Anti-Armour Missile", "Active", "1 CP", "Select one Enemy Unit Within 12\". Apply DEBUFF Armour (1).")],
      weapons=[W("Assault", "Railguns", "12", "Ground", "4", "3+", "-", "-", "1", [])],
      upgrades=[A("Any", "Corvid Reactor", "Passive", None, "This Unit may resolve its first Special Ability with the CP cost reduced by 1 if it targets the closest Enemy Unit."),
                A("Movement", "Internal Tech Module", "Passive", None,
                  "When this Unit is nominated to deploy from Reserves, it may Deploy from any table edge that is not a player's Entry Edge. This Unit cannot be set Within 8\" of any Enemy model."),
                A("Movement", "Seeker Missile", "Active", "1 CP",
                  "Select one Enemy Unit Within 12\". At the End of the Assault Phase, if that Enemy Unit has the Stationary Status or it is Within 8\" of this Unit, it suffers HITS 4 (2). If that Unit is Engaged, it is eligible to make an Evade Roll against these hits."),
                A("Assault", "Explosive Shrapnel Shells", "Passive", None, "The Gauss Cannon of the Auto-Turret set by this Unit gains Surge Type: Light and S-Dice: D3+1.")]),
    # Summoned Units (Part 9.1.9): no Mineral cost, no Army Slot
    P(id="auto-turret", name="Auto-Turret", race="Terran", tags=["Terran"], slot=None, summoned=True,
      stats=dict(speed="-", armour="5+", evade="-", hp=3, size=2), supply=[("1-1", 0)],
      combat_tags=["Armoured", "Mechanical", "Ground"],
      abilities=[TIMED_LIFE, STRUCTURE,
                 A("Assault", "Overwatch", "Reaction", "0 CP", "Use when an Enemy Unit ends its Activation Within 8\" of this Unit. This Unit immediately performs a Ranged Attack against that Enemy Unit.")],
      weapons=[W("Assault", "Gauss Cannon", "8", "All", "6", "3+", "-", "-", "1", ["PINPOINT"])],
      upgrades=[]),
    P(id="holo-decoy", name="Holo Decoy", race="Terran", tags=["Terran"], slot=None, summoned=True,
      stats=dict(speed="7", armour="6+", evade="6+", hp=1, size=2), supply=[("1-1", 0)],
      combat_tags=["Biological", "Psionic", "Ground"],
      abilities=[A("Any", "Lethal Hologram", "Passive", None, "All Weapons of Friendly Units targeting an Enemy Unit Within 4\" of this Unit gain PRECISION (1)."),
                 TIMED_LIFE,
                 A("Any", "Decoy", "Passive", None,
                   "This Unit is never Engaged. It cannot Engage Enemy Units, cannot be Engaged by Enemy Units and cannot perform a Charge Action. This Unit cannot be the target of an ability, unless stated otherwise. It can never Control or Contest Mission Markers."),
                 A("Any", "Surprise!", "Passive", None, "At the End of the Round, you can set a Friendly Nova Stealth Mode or Nova Assault Mode in Coherency with this Unit.")],
      weapons=[], upgrades=[]),
    P(id="sabotage-drone", name="Sabotage Drone", race="Terran", tags=["Terran"], slot=None, summoned=True,
      stats=dict(speed="-", armour="6+", evade="6+", hp=3, size=1), supply=[("1-1", 0)],
      combat_tags=["Armoured", "Mechanical", "Ground"],
      abilities=[STRUCTURE,
                 A("Assault", "Have a Nice Day", "Passive", None,
                   "At the End of the Assault Phase, target each Unit Within 3\" of this Unit (including Units with the Structure ability) suffers HITS 5 (1). If an affected Unit has the Structure ability, that Unit suffers an additional HITS 5 (1).")],
      weapons=[], upgrades=[]),
]

PROTOSS = [
    P(id="high-templar", name="High Templar", race="Protoss", tags=["Protoss"], slot="Support",
      stats=dict(TEMPLAR_STATS), supply=[("1-1", 0), ("2-2", 1), ("3-4", 2)],
      combat_tags=["Biological", "Light", "Psionic", "Ground"],
      abilities=[A("Any", "Our Minds as One", "Passive", None,
                   "While this Unit's Current Supply Value is 2, it gains the following effects: The first Special Ability resolved by this Unit each Round has its PE cost reduced by 1 (to a minimum of 0). Apply a +1 Modifier to the dice rolled for its Psionic Storm Special Ability."),
                 FEEDBACK],
      weapons=[W("Assault", "Psi Blast", "8", "All", "1", "3+", "Light", "D3", "2", ["INSTANT"]),
               W("Combat", "Strike", "E", "Ground", "1", "4+", "-", "-", "1", [])],
      upgrades=[A("Movement", "Psionic Storm", "Active", "2 PE",
                  "Set a Psionic Storm token Within 10\" and Line of Sight of this Unit. This token is not removed if this Unit is Destroyed. At the End of each Phase, set a Psionic Storm Blast Template on the centre of this token. For each Unit that has at least one model whose base is partially covered by the template, roll 3 dice, plus 1 additional die for each model in that Unit whose base is partially covered. For each result of 5+, that Unit suffers an effect depending on the current Phase: Movement Phase: NON-LETHAL DAMAGE (1). Assault Phase: 1 Damage. If multiple effects trigger at the End of the Assault Phase, resolve them in the order specified in Part 8.9.4."),
                A("Movement", "Farsight", "Active", "1 PE", "Target one Friendly Unit Within 12\". Until the End of the Round, that Unit is eligible to make an Evade Roll against any attacks targeting it.")],
      notes=[NOTE, "The preview shows Models/Supply 1→0 and 2→1 and prices of 130/230; the 10.6 Unit Cost Table (09.10.2026) lists 2 models 120 (Supply 1) and 4 models 200 (Supply 2). The table is used, and the 3-4 → Supply 2 bracket is inferred from it."]),
    P(id="twilight-templar", name="Twilight Templar (High Templar)", race="Protoss", tags=["Protoss"], slot="Support", unique=True,
      stats=dict(TEMPLAR_STATS), supply=[("1-1", 0), ("2-2", 1)],
      combat_tags=["Biological", "Light", "Psionic", "Ground"],
      abilities=[A("Any", "Bound by the Khala", "Reaction", "0 PE",
                   "Use when the Current Supply Value of another Friendly Unit Within 8\" of this Unit is reduced. Return one Non-Unique Exhausted Tactical Card to the Ready state."),
                 A("Movement", "Warp-In", "Active", "1 PE", "Resolve the PLACE (6) effect."),
                 A("Movement", "Psionic Gale", "Active", "2 PE",
                   "Set a Psionic Storm token Within 10\" and Line of Sight of this Unit. This token is not removed if this Unit is Destroyed. At the End of each Phase, set a Psionic Storm Blast Template on the centre of this token. For each Unit that has at least one model whose base is partially covered by the template, roll 3 dice, plus 1 additional die for each model in that Unit whose base is partially covered. For each result of 4+, that Unit suffers an effect depending on the current Phase: Movement Phase: NON-LETHAL DAMAGE (1). Assault Phase: 1 Damage. If multiple effects trigger at the End of the Assault Phase, resolve them in the order specified in Part 8.9.4."),
                 FEEDBACK],
      weapons=[W("Assault", "Psi Blast", "8", "All", "2", "3+", "Light", "D3", "2", ["INSTANT"]),
               W("Combat", "Strike", "E", "Ground", "1", "4+", "-", "-", "1", [])],
      upgrades=[]),
    P(id="tassadar", name="Tassadar", race="Protoss", tags=["Protoss"], slot="Hero", unique=True,
      stats=dict(shield=3, speed="7", armour="5+", evade="5+", hp=6, size=2), supply=[("1-1", 1)],
      combat_tags=["Biological", "Psionic", "Ground"],
      abilities=[A("Any", "Commander", "Passive", None,
                   "Treat this Unit's Supply characteristic as increased by 1 for Controlling and Contesting Mission Markers, completing objectives, and resolving Disengage checks."),
                 A("Movement", "Force Wall", "Active", "1 PE",
                   "Set two Force Wall tokens Wholly Within 8\" in an unoccupied space. Units of Size 2 or lower cannot move across the Force Wall. Models of Size 3 or more can move over it, and it's then removed."),
                 A("Movement", "Executor's Will", "Active", "1 PE",
                   "Target two Enemy Units on the battlefield (Line of Sight is not required) and place a Faction Indicator next to each of them. During the next Assault Phase, if either of these Units ends its Activation while its Faction Indicator remains on the battlefield, you may Activate two Friendly Units consecutively. Remove both Faction Indicators after any Enemy Unit completes its Activation in the following Assault Phase."),
                 A("Movement", "Khala's Gift", "Active", "0 PE",
                   "Target another Friendly Biological Unit Within 12\". Until the End of the Round, that Unit resolves its first Special Ability with the cost reduced by 1 (to a minimum of 0)."),
                 A("Assault", "Telekinetic Push", "Active", "1 PE", "Set each Friendly Force Wall token Wholly Within 6\" of its current position."),
                 A("Assault", "Psi Lightning", "Active", "0 PE", "Each Unit Within 2\" of one or more Friendly Force Wall tokens suffers 1 Damage.")],
      weapons=[W("Assault", "Resonance Beam", "12", "All", "6", "3+", "Armoured", "D3", "1", ["INSTANT"]),
               W("Combat", "Strike", "E", "Ground", "6", "4+", "-", "-", "1", [])],
      upgrades=[]),
]

Z_BURROW_AMBUSH = A("Movement", "Burrow Ambush", "Passive", None,
                    "When this Unit is nominated to deploy from the Reserves, it may resolve the PLACE (18) effect from the controlling player's Entry Edge. No model may be set Within 10\" of any Enemy model. This Unit's Activation ends.")
INDOMITABLE = A("Assault", "Indomitable", "Passive", None,
                "While Engaged, this Unit may target and be targeted by Unengaged Enemy Units. In both cases, the defending Unit gains an Evade Roll against those attacks.")


def Z_DEV_CHARGE(n, t):
    return A("Assault", "Devastating Charge", "Passive", None,
             f"Immediately after this Unit completes a successful Charge, resolve the IMPACT ({n}) {t} effect.")


ZERG = [
    P(id="zagara", name="Zagara", race="Zerg", tags=["Zerg"], slot="Hero", unique=True,
      stats=dict(speed="7", armour="4+", evade="6+", hp=10, size=3), supply=[("1-1", 1)],
      combat_tags=["Biological", "Psionic", "Ground"],
      abilities=[A("Any", "Commander", "Passive", None,
                   "Treat this Unit's Supply characteristic as increased by 1 for Controlling and Contesting Mission Markers, completing objectives, and resolving Disengage checks."),
                 A("Any", "Transfusion", "Reaction", "1 BM",
                   "Use when another Friendly Biological Unit (including a Structure) suffers Damage Within 4\". Reduce the Total Damage before allocation by 2."),
                 A("Any", "Psionic Link", "Passive", None,
                   "Once per Round, if there are at least 7 Friendly models Within 6\" of this Unit, it may resolve its Special Ability with the BM cost reduced by 1."),
                 A("Movement", "Broodmother", "Active", "1 BM",
                   "Apply one of the following effects to all Friendly units (Line of Sight is not required). You cannot apply the effect chosen in the previous Game Round: Units of Size 1 gain a +1 Modifier to all IMPACT Rolls. All weapons of Size 2 Units gain CRITICAL HIT (1). Units of Size 3 or more gain TOUGH (1)."),
                 A("Movement", "Infested Drop", "Passive", None,
                   "The base of the Zagara counts as an Entry Edge. Each Round, Friendly Units with a combined Supply cost of 1 may be Deployed via this Entry Edge."),
                 INDOMITABLE, Z_DEV_CHARGE(6, "3+")],
      weapons=[W("Assault", "Zagara's Talons", "8", "Ground", "4", "3+", "Light, Armoured", "D3", "2", []),
               W("Assault", "Zagara's Acid Spines", "14", "Flying", "8", "3+", "Light, Armoured", "D3", "1", []),
               W("Combat", "Talons", "E", "Ground", "4", "3+", "-", "-", "1", [])],
      upgrades=[]),
    P(id="vileling", name="Vileling (Zergling)", race="Zerg", tags=["Zerg"], slot="Core",
      stats=dict(speed="4/8", armour="6+", evade="5+", hp=1, size=1), supply=[("1-6", 1), ("7-18", 2)],
      combat_tags=["Biological", "Light", "Ground"],
      abilities=[A("Any", "Squadron", "Passive", None, "This Unit's Horizontal Coherency is 4\"."),
                 Z_BURROW_AMBUSH,
                 A("Movement", "Zergling Reconstitution", "Active", "1 BM", "Resolve the RESPAWN (2) effect, or RESPAWN (3) if the Unit is ON CREEP."),
                 A("Assault", "Metabolic Boost", "Active", "1 BM",
                   "When determining Charge Distance for this Unit, roll 2D6 instead of D6 and use the higher result to add to the Unit's Speed characteristic."),
                 Z_DEV_CHARGE(1, "5+"),
                 A("Combat", "Debilitating Claws", "Passive", None,
                   "After an Enemy Unit suffers Damage from this Unit, apply DEBUFF Hit (1) to each of that Unit's Weapons.")],
      weapons=[W("Combat", "Claws", "E", "Ground", "2", "5+", "-", "-", "1", [])],
      upgrades=[]),
    P(id="defiler", name="Defiler", race="Zerg", tags=["Zerg"], slot="Support",
      stats=dict(speed="7", armour="5+", evade="5+", hp=8, size=2), supply=[("1-1", 1)],
      combat_tags=["Biological", "Light", "Psionic", "Ground"],
      abilities=[A("Any", "Consume", "Passive", None,
                   "When this Unit resolves a Special Ability that costs BM, it can remove one model from a Friendly Unit Within 4\" to generate 1 BM to spend towards that ability's cost."),
                 A("Movement", "Gestate Dark Swarm", "Active", "0 BM",
                   "Set a Dark Swarm token in an unoccupied space Within 4\" and Line of Sight of this Unit. The Dark Swarm token has DISPLACEMENT."),
                 A("Assault", "Dark Swarm", "Reaction", "1 BM",
                   "REPEATABLE. Use when a Friendly Unit Within 4\" of a Friendly Dark Swarm token is selected as the target of an attack. If this Unit is Within 4\" of the same token, the Targeted Friendly Unit is eligible to make an Evade Roll against that attack. If the targeted Unit is a Size 1, it gains a +1 Modifier to this Evade Roll."),
                 Z_DEV_CHARGE(4, "4+")],
      weapons=[W("Combat", "Claws", "E", "Ground", "4", "3+", "-", "-", "1", [])],
      upgrades=[Z_BURROW_AMBUSH,
                A("Assault", "Plague", "Active", "X BM",
                  "You may spend 1 to 3 BM to activate this ability. Set a Plague Blast Template Wholly Within 10\" and Line of Sight of this Unit. For each Unit that has at least one model whose base is partially covered by the template, roll 2 dice, plus 1 additional die for each model in that Unit whose base is partially covered. That Unit loses its HIDDEN Status, and, depending on the BM spent, it suffers NON-LETHAL DAMAGE (1) for: 1 BM: each result of 5+. 2 BM: each result of 4+. 3 BM: each result of 3+."),
                W("Combat", "Cancerous Bite", "E", "Ground", "2", "3+", "-", "-", "2", ["CRITICAL HIT (1)", "SIDEARM"])],
      notes=[NOTE, "The preview shows 130 Minerals; the 10.6 Unit Cost Table (09.10.2026) lists 160, which is used."]),
    P(id="bile-launcher", name="Bile Launcher", race="Zerg", tags=["Zerg"], slot="Support", unique=True,
      stats=dict(speed="-", armour="4+", evade="-", hp=10, size=3), supply=[("1-1", 1)],
      combat_tags=["Armoured", "Biological", "Ground"],
      abilities=[A("Any", "Biological Structure", "Passive", None,
                   "This Unit cannot gain the BURROWED Status, cannot be returned to Reserves, and is immune to the IMPACT keyword."),
                 A("Any", "Source of Creep", "Passive", None,
                   "A Friendly or Enemy Ground Zerg Unit Within 6\" of this Unit, counts as being ON CREEP."),
                 A("Any", "Detection", "Passive", None, "While Enemy Units are Within 6\" of this Unit, they lose the HIDDEN Status."),
                 Z_BURROW_AMBUSH,
                 A("Movement", "Bombard", "Active", "1 BM",
                   "Set a Bile Bomb token on the battlefield Within 24\" of this Unit. When this Unit resolves a Ranged Attack using the Bile Bomb weapon profile this Round, it may choose to ignore the weapon's standard Range characteristic. If it does, it may target an Enemy Unit that is Within 3\" of that token (Line of Sight is not required), ignoring the HIDDEN Status. After the attack is fully resolved, remove the Bile Bomb token from the battlefield. When the Bile Bomb token is about to be removed, set a Creep Tumor token in base-to-base contact with it. The Bile Bomb token has DISPLACEMENT."),
                 INDOMITABLE],
      weapons=[W("Assault", "Bile Bomb", "12", "Ground", "6", "3+", "Light, Armoured", "D3", "1", ["PIERCE Armoured (2)", "PINPOINT"])],
      upgrades=[],
      notes=[NOTE, "The Bile Launcher is not listed in the 10.6 Unit Cost Table (09.10.2026); the preview's 150 Minerals is used until a cost table lists it."]),
]

T, P_, Z = "Terran", "Protoss", "Zerg"


def CARD(id, name, kind, race, tags, slots, res_val, abilities, unique=False):
    res_type = {"Terran": "CP", "Protoss": "PE", "Zerg": "BM"}[race]
    return {"id": id, "name": name, "kind": kind, "race": race, "faction_tags": tags, "unique": unique,
            "slots": slots, "resource": {"type": res_type, "value": res_val},
            "abilities": [{"phase": p, "name": n, "type": t, "text": x} for p, n, t, x in abilities],
            "card_version": PV, "corrections": [], "provisional": True,
            "notes": ["Provisional: transcribed from a preview, not the printed card. Faction tags as given by the user (race only)." if kind == "Faction"
                      else "Provisional: transcribed from a preview, not the printed card. Faction tags are not shown in the preview; race tag only is assumed."]}


CARDS = [
    CARD("nova-covert-ops", "Nova Covert Ops", "Faction", T, ["Terran"], {"Core": 3, "Elite": 1, "Support": 1, "Hero": 1}, 1, [
        ("Movement", "Griffin Support", "Active", "Set a Friendly Sabotage Drone Unit Within 12\" of a Friendly Unit, more than 1\" away from any Enemy model. Remove this Unit at the End of the Round."),
        ("Movement", "Mark for Death", "Active", "Target an Enemy Unit on the battlefield. When a Friendly Unit makes an Attack targeting that Unit, its first Melee or Ranged Weapon used gains CRITICAL HIT (1) and PRECISION (1)."),
    ]),
    CARD("templar-caste", "Templar Caste", "Faction", P_, ["Protoss"], {"Core": 3, "Support": 2, "Hero": 1}, 1, [
        ("Any", "Our Duty is Unending", "Active", "Once per Game. Select up to two of your Exhausted Tactical Cards. Return them to the Ready state."),
        ("Any", "Khassar de Templari", "Active", "Instead of performing an action, select one other Friendly Biological Unit that has already been Activated this Phase. That Unit immediately performs one action available in the current Phase, then suffers NON-LETHAL DAMAGE (3)."),
    ]),
    CARD("zagaras-swarm", "Zagara's Swarm", "Faction", Z, ["Zerg"], {"Core": 4, "Support": 1, "Hero": 1}, 1, [
        ("Combat", "Scourge Queen", "Active", "If the active Unit contains more models than the combined number of models in all Engaged Enemy Units, its Close Combat Weapons gain INSTANT and PRECISION (4)."),
        ("Any", "Instinctive Reaction", "Reaction", "Use when an Enemy Unit declares a Close Combat Attack against a Friendly Unit. That Friendly Unit becomes eligible to make an Evade Roll against that attack."),
        ("Any", "Zerg Creep", "Passive", "During Army Building, select exactly one Creep Card and add it to their Army List, paying its listed cost (if any)."),
    ]),
    CARD("defiler-mound", "Defiler Mound", "Tactical", Z, ["Zerg"], {"Elite": 1, "Support": 1}, 1, [
        ("Movement", "Poisonous Essence", "Active", "Set a Faction Indicator on the active Friendly Unit. At the end of the Assault Phase, all Biological Enemy Units Engaged with the marked Unit suffer NON-LETHAL DAMAGE (2)."),
        ("Movement", "Tunnel Network", "Active", "The active, Unengaged Ground Unit is returned to Reserves instead of performing an action."),
    ]),
    CARD("reactive-creep", "Reactive Creep", "Creep", Z, ["Zerg"], {}, None, [
        ("Any", "Reactive Tissue", "Passive", "While a Friendly Zerg Unit is ON CREEP, it gains DODGE (1) against any attacks targeting it."),
        ("Any", "Living Glob of Tissue", "Passive", "Creep Tumor tokens have STAY IN PLAY and DISPLACEMENT."),
        ("Any", "Creep Removal", "Passive", "If an Enemy Unit ends a Move, Deploy, Run, Charge or Disengage action Within 1\" of a Friendly Creep Tumor token, remove that token from the battlefield."),
    ]),
    CARD("vanadium-plating", "Vanadium Plating", "Tactical", T, ["Terran"], {"Support": 1}, 1, [
        ("Any", "Crystalline Alloy", "Reaction", "Use before a Friendly Mechanical Unit makes an Armour Roll. That Unit gains DODGE (2) for this roll."),
    ]),
    CARD("templar-archives", "Templar Archives", "Tactical", P_, ["Protoss"], {"Support": 2}, 1, [
        ("Any", "Ancestral Wisdom", "Reaction", "Once per Round, when a Friendly Support Unit activates a Special Ability that costs PE, resolve that ability with its PE cost reduced by 1 (to a minimum of 0). Do not Exhaust this card."),
    ]),
]

# Unit Cost Table 10.6 (09.10.2026)
COSTS = {
    "nova-stealth-mode": {"compositions": [(1, 240, 1)], "upgrades": {}},
    "nova-assault-mode": {"compositions": [(1, 260, 1)], "upgrades": {}},
    "spec-ops-marauder": {"compositions": [(2, 240, 1)], "upgrades": {}},
    "raven": {"compositions": [(1, 170, 1)], "upgrades": {
        "Corvid Reactor": ("-", [30]), "Internal Tech Module": ("-", [20]), "Seeker Missile": ("-", [20]), "Explosive Shrapnel Shells": ("-", [10])}},
    "tassadar": {"compositions": [(1, 230, 1)], "upgrades": {}},
    "twilight-templar": {"compositions": [(2, 230, 1)], "upgrades": {}},
    "high-templar": {"compositions": [(2, 120, 1), (4, 200, 2)], "upgrades": {"Psionic Storm": ("-", [20, 30]), "Farsight": ("-", [20, 20])}},
    "zagara": {"compositions": [(1, 250, 1)], "upgrades": {}},
    "vileling": {"compositions": [(18, 180, 2)], "upgrades": {}},
    "defiler": {"compositions": [(1, 160, 1)], "upgrades": {
        "Burrow Ambush": ("-", [20]), "Plague": ("-", [20]), "Cancerous Bite": ("-", [20])}},
    # Not in the 10.6 table; value taken from the preview card (150 Minerals).
    "bile-launcher": {"compositions": [(1, 150, 1)], "upgrades": {}},
}
GAS = {"vanadium-plating": 25, "templar-archives": 40, "defiler-mound": 35, "reactive-creep": 10}
