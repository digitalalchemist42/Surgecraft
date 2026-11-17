# Cards v1.10.26 (Wave 4), transcribed from the owner's photographs of the printed cards (15 Nov 2026).
# No card PDF and no cost table exist for these yet, so every entry is provisional=True (the app labels it PREVIEW)
# and every Mineral / Gas cost below is a 0 placeholder (owner decision, 15 Nov 2026).
# Fields that are printed on a card side that was not photographed are left unknown (None / {}) or, where the
# builder needs a value, filled with a stated assumption recorded in the entry's notes.
from common import W, A, U

V = "v1.10.26"
NO_COST = "No cost is published for this card yet; it counts as 0 until a cost table lists it."


def O(**kw):
    kw.setdefault("card_version", V)
    kw["provisional"] = True
    kw["notes"] = list(kw.get("notes") or []) + [NO_COST]
    return U(**kw)


STRUCTURE = A("Any", "Structure", "Passive", None,
              "This Unit cannot be Activated in any Phase and cannot perform actions. Additionally, its Current Supply Value is treated as 0, and it can never Control or Contest Mission Markers, ignoring the standard Zero Supply Exception. This Unit cannot be a target of an ability, unless stated otherwise.")
TIMED_LIFE = A("Any", "Timed Life", "Passive", None, "Remove this Unit at the End of the Round.")
INDOMITABLE = A("Assault", "Indomitable", "Passive", None,
                "While Engaged, this Unit may target and be targeted by Unengaged Enemy Units. In both cases, the defending Unit gains an Evade Roll against those attacks.")
COMMANDER = A("Any", "Commander", "Passive", None,
              "Treat this Unit's Supply characteristic as increased by 1 for Controlling and Contesting Mission Markers, completing objectives, and resolving Disengage checks.")
SQUADRON = A("Any", "Squadron", "Passive", None, "This Unit's Horizontal Coherency is 4\".")


def DEV_CHARGE(n, t):
    return A("Assault", "Devastating Charge", "Passive", None,
             f"Immediately after this Unit completes a successful Charge, resolve the IMPACT ({n}) {t} effect.")


# ---------------------------------------------------------------- TERRAN
TERRAN = [
    O(id="firebat", name="Firebat", race="Terran", tags=["Terran"], slot="Core", role="Damage Dealer", base_mm=40,
      stats=dict(speed="4/7", armour="5+", evade="6+", hp=3, size=2), supply=[("1-2", 0), ("3-4", 1), ("5-6", 2)],
      combat_tags=["Armoured", "Biological", "Ground"],
      abilities=[A("Movement", "Stimpack", "Active", "1 CP",
                   "This unit suffers NON-LETHAL DAMAGE (2). This unit gains BUFF Speed (3), its Perdition Flamethrower, and all Close Combat Weapons gain PRECISION (3)."),
                 A("Assault", "Fire It Up", "Passive", None,
                   "When this Unit makes a Ranged Attack with its Perdition Flamethrower, you may choose 1 model in this Unit to attack using a Flamer Template (FT) instead of rolling its regular Rate of Attack (RoA). If this Unit's Current Supply Value is 2, you may choose up to 2 models to attack using Flamer Templates instead.")],
      weapons=[W("Assault", "Perdition Flamethrower", "8", "Ground", "2", "3+", "Light", "D3", "1", ["ANTI-EVADE (1)", "INSTANT"]),
               W("Combat", "Flame Strike", "E", "Ground", "2", "3+", "Light", "D3", "1", [])],
      upgrades=[A("Movement", "Incinerator Gauntlets", "Active", "1 CP",
                  "Set a Fire Wall token Within 4\" in an unoccupied space. If a Unit's Leading Model's path of travel passes through this token, or if any model in a Unit ends either a Move, Deploy, Run, Charge, Disengage, or Close Ranks action, or is Set Within 1\" of this token, remove the Fire Wall token from the battlefield before executing that move. If you do, that Unit suffers HITS 5 (1). If that Unit performed a Charge action, it cannot resolve the IMPACT effect."),
                A("Combat", "Need a Light?", "Passive", None,
                  "When this Unit makes a Close Combat Attack with its Flame Strike, you may choose 1 model in this Unit to attack using a Flamer Template (FT) instead of rolling its regular Rate of Attack (RoA).")],
      notes=["Stimpack is worded as printed on this card ('This unit ... gains BUFF Speed (3), its Perdition Flamethrower, and all Close Combat Weapons gain PRECISION (3)')."]),
]

# ---------------------------------------------------------------- PROTOSS
def SCARAB(id, name, speed, weapon, tags_seen=True):
    return O(id=id, name=name, race="Protoss", tags=["Protoss"], slot=None, role=None, summoned=True, base_mm=None,
             stats=dict(shield=1, speed=speed, armour="6+", evade="3+", hp=2, size=1), supply=[("1-1", 0)],
             combat_tags=["Psionic", "Ground"],
             abilities=[TIMED_LIFE,
                        A("Any", "Nimble", "Passive", None, "This unit is always eligible to use Evade Rolls against Attacks or Special Abilities."),
                        A("Assault", "Proximity Detonation", "Passive", None,
                          "When an Enemy Ground Unit ends its Activation Within 2\" of this Unit. This Unit immediately performs a Close Combat Attack against that Enemy Unit. Immediately after this Close Combat Attack is resolved, remove this Unit from the battlefield."),
                        A("Assault", "Explosive Charge", "Passive", None,
                          "Immediately after this Unit completes a successful Charge, it performs a Close Combat Attack against one of the targets of that Charge. Immediately after this Close Combat Attack is resolved, remove this Unit from the battlefield.")],
             weapons=[weapon], upgrades=[],
             corrections=["Nimble printed 'againts Attacks'; corrected to 'against'."],
             notes=["Combat role and base size are not on the photographed side."] +
                   ([] if tags_seen else ["The Combat Tags line is cut off in the photograph; Psionic, Ground taken from the Solarite and Phasing Scarab cards."]))


PROTOSS = [
    O(id="reaver", name="Reaver", race="Protoss", tags=["Protoss"], slot="Elite", role="Damage Dealer", base_mm=150,
      stats=dict(shield=6, speed="6", armour="5+", evade="-", hp=8, size=4), supply=[("1-1", 2)],
      combat_tags=["Armoured", "Mechanical", "Ground"],
      abilities=[A("Any", "Large", "Passive", None,
                   "When this Unit's Leading Model moves, it cannot pass through physical gaps smaller than 3\" wide, regardless of its size. If the Leading Model's path of travel passes through, or any model in this Unit ends its movement on a Size 0 or Size 1 Impassable Terrain piece (excluding Tokens) during any movement action, that terrain piece is immediately removed from the game."),
                 A("Any", "Limited Artificial Intelligence", "Passive", None, "If this Unit is a parent to any SUMMONED Unit, it cannot SUMMON another one."),
                 A("Movement", "Microfactory", "Active", "2 PE", "This Unit's Scarab Special Ability can be used this Round even if it was already used."),
                 A("Movement", "Scarab", "Active", "0 PE", "Once per Game. Resolve the SUMMON (Scarab) effect. Then, the Scarab may immediately perform a Move action."),
                 A("Assault", "Siege Triangulation", "Active", "1 PE", "Move a Scarab, Solarite Scarab or Phasing Scarab created by this Unit up to 5\"."),
                 INDOMITABLE],
      weapons=[W("Combat", "Crawl Over", "E", "Ground", "2", "2+", "-", "-", "1", [])],
      upgrades=[A("Movement", "Solarite Scarab", "Active", "0 PE", "Once per Game. Resolve the SUMMON (Solarite Scarab) effect. Then, the Solarite Scarab may immediately perform a Move action."),
                A("Movement", "Phasing Scarab", "Active", "0 PE", "Once per Game. Resolve the SUMMON (Phasing Scarab) effect. Then, the Phasing Scarab may immediately perform a Move action."),
                A("Movement", "Shuttle", "Active", "0 PE",
                  "Once per Game. This ability can be used while this Unit is in Reserves. Set a Faction Indicator anywhere on the battlefield more than 10\" away from any Enemy model. At the End of the Round, the controlling player may Deploy this Unit base-to-base contact with this Faction Indicator. This Unit's Activation ends.")],
      corrections=["Large printed 'Impassible Terrain'; corrected to Impassable Terrain."]),
    SCARAB("scarab", "Scarab", "3", W("Combat", "Scarab Detonation", "E", "Ground", "12", "2+", "-", "-", "1", ["CRITICAL HIT (2)"]), tags_seen=False),
    SCARAB("solarite-scarab", "Solarite Scarab", "5", W("Combat", "Solarite Blast", "E", "Ground", "5", "2+", "-", "-", "2", ["CRITICAL HIT (2)", "INSTANT"])),
    SCARAB("phasing-scarab", "Phasing Scarab", "3", W("Combat", "Phase Blast", "E", "Ground", "6", "2+", "Armoured", "D3", "1", ["CRITICAL HIT (2)", "PIERCE Armoured (2)"])),
    O(id="alarak", name="Alarak", race="Protoss", tags=["Protoss"], slot="Hero", role=None, unique=True, base_mm=None,
      stats=dict(shield=3, speed="7", armour="4+", evade="5+", hp=6, size=2), supply=[("1-1", 1)],
      combat_tags=["Biological", "Psionic", "Ground"],
      abilities=[A("Any", "Sacrifice", "Reaction", "1 PE",
                   "When this Unit receives Damage, target another Friendly Biological Unit Within 8\". The targeted Unit suffers 2 Damage, and the Damage received by this Unit is reduced by 2 (when Empowered, reduced by 3)."),
                 COMMANDER,
                 A("Any", "Highlord of the Tal'darim", "Passive", None,
                   "Calculate the total lost Supply of all Friendly Units (a Unit's lost Supply is its initial Supply Value minus its Current Supply Value). While this total is: 2 or more: When this Unit resolves IMPACT, it generates 3 additional IMPACT dice. 4 or more: This Unit's weapons gain INSTANT. 6 or more: This Unit's abilities are Empowered."),
                 A("Assault", "Wrath of the Highlord", "Active", "0 PE",
                   "Target another Friendly Biological Unit Within 8\". The targeted Unit suffers 2 Damage, and this Unit performs a 4\" Run Action (when Empowered, perform a 6\" Run Action)."),
                 A("Assault", "Empower Me", "Active", "0 PE",
                   "Target another Friendly Biological Unit Within 8\". The targeted Unit suffers 2 Damage, and this Unit's Bane Blades get BUFF RoA (4) (when Empowered, BUFF RoA (6))."),
                 A("Assault", "Destruction Wave", "Active", "0 PE",
                   "Target another Friendly Biological Unit Within 8\". The targeted Friendly Unit suffers 2 Damage. Then target an Enemy Unit Within 8\" of this Unit. The targeted Enemy Unit suffers HITS 4 (1) (when Empowered, HITS 6 (1))."),
                 DEV_CHARGE(6, "4+")],
      weapons=[W("Combat", "Bane Blades", "E", "Ground", "6", "2+", "Light, Armoured", "D3+1", "1", [])],
      upgrades=[],
      notes=["The upgrade side of this card was not photographed: Army Slot is assumed to be Hero (it has Commander and Supply 1 like every other Hero); combat role, base size and any upgrades are unknown."]),
    O(id="slayer", name="Slayer (Stalker)", race="Protoss", tags=["Protoss", "Tal'darim"], slot="Elite", role=None, base_mm=None,
      stats=dict(shield=3, speed="4/8", armour="4+", evade="6+", hp=6, size=3), supply=[("1-1", 1), ("2-2", 2)],
      combat_tags=["Armoured", "Mechanical", "Ground"],
      abilities=[SQUADRON,
                 A("Any", "Seek Bloodshed", "Reaction", "1 PE",
                   "When the Current Supply Value of another Friendly Unit Within 12\" of this Unit is reduced, this Unit, if Unengaged, may perform a Move action Directly Towards that Friendly Unit."),
                 A("Any", "Bloodshard Blink", "Passive", None,
                   "Immediately before this Unit resolves any PLACE effect, you may target one Enemy Unit. This Unit's weapons gain BUFF RoA (1) against the targeted Unit, but this Unit must perform PLACE Directly Towards the chosen Unit."),
                 A("Movement", "Blink", "Active", "1 PE", "Resolve the PLACE (6) effect. Models set by this effect cannot be set up Within the Engagement Range of any Enemy Unit.")],
      weapons=[W("Assault", "Particle Disruptors", "12", "All", "4", "3+", "Armoured", "D3", "2", []),
               W("Combat", "Stomp", "E", "Ground", "2", "5+", "-", "-", "1", [])],
      upgrades=[],
      corrections=["Bloodshard Blink printed 'BUFF ROA (1)'; shown as BUFF RoA (1)."],
      notes=["The upgrade side of this card was not photographed: Army Slot is assumed to be Elite (as the Stalker); combat role, base size and any upgrades are unknown."]),
    O(id="taldarim-pylon", name="Tal'darim Pylon", race="Protoss", tags=["Protoss", "Tal'darim"], slot=None, role=None, unique=True, summoned=True, base_mm=None,
      stats=dict(shield=2, speed="-", armour="5+", evade="-", hp=6, size=3), supply=[("1-1", 0)],
      combat_tags=["Armoured", "Ground"],
      abilities=[A("Any", "Bloodshard Monument", "Passive", None,
                   "When the Current Supply Value of a Unit Within 8\" is reduced. Return one non-Unique Exhausted Tactical Card to the Ready state."),
                 A("Any", "Warp Conduit", "Passive", None,
                   "Once per Round, the controlling player may deploy a Ground Unit from Reserves using this Pylon base as the Entry Edge. This Unit's Activation ends."),
                 STRUCTURE,
                 A("Assault", "Overwatch", "Reaction", "1 PE", "When an Enemy Unit ends its Activation Within 8\". This Unit immediately performs a Ranged Attack against that Enemy Unit.")],
      weapons=[W("Assault", "Overcharged Pylon", "8", "All", "3", "3+", "-", "-", "1", ["PIERCE Armoured (2)", "PINPOINT"])],
      upgrades=[], notes=["Combat role and base size are not on the photographed side."]),
]

# ---------------------------------------------------------------- ZERG
Z_BURROW_AMBUSH = A("Movement", "Burrow Ambush", "Passive", None,
                    "When this Unit is nominated to deploy from the Reserves, it may resolve the PLACE (18) effect from the controlling player's Entry Edge. No model may be set Within 10\" of any Enemy model. This Unit's Activation ends.")
LIVE_FOR_THE_SWARM = A("Any", "Live for the Swarm!", "Passive", None,
                       "When this Unit attacks an Enemy Unit with the INFESTATION Status or a Unit Within 6\" of any Source of Creep or Creep Tumor, its Infested C-14 Rifle and all Close Combat Attacks gain PRECISION (2).")
SPREAD_INFESTATION = A("Movement", "Spread Infestation", "Active", "1 BM",
                       "Target an Enemy Unit Within 8\". The targeted Unit gains the INFESTATION Status. For the purposes of resolving Special Abilities, this effect is treated as a DEBUFF.")
PLAGUED_MUNITIONS = A("Assault", "Plagued Munitions", "Passive", None,
                      "Immediately after an attack with the Infested C-14 Rifle, if the attacked Unit suffered Damage, it also suffers NON-LETHAL DAMAGE (1).")


def DETONATION(n):
    return A("Any", "Detonation", "Reaction", "1 BM",
             f"Immediately before any models in this Unit are Destroyed, Enemy Units Within 2\" suffer HITS 1 ({n}) for each model in this Unit that will be Destroyed.")


ZERG = [
    O(id="infested-marine", name="Infested Marine", race="Zerg", tags=["Zerg"], slot="Core", role="Damage Dealer", base_mm=40,
      stats=dict(speed="3/6", armour="4+", evade="6+", hp=2, size=2), supply=[("1-3", 1), ("4-6", 2)],
      combat_tags=["Biological", "Infested", "Light", "Ground"],
      abilities=[LIVE_FOR_THE_SWARM, DETONATION(1), DEV_CHARGE(2, "4+")],
      weapons=[W("Assault", "Infested C-14 Rifle", "12", "All", "2", "4+", "Light", "D3", "1", ["BURST FIRE 6\" (2)"]),
               W("Combat", "Strike", "E", "Ground", "1", "4+", "-", "-", "1", [])],
      upgrades=[Z_BURROW_AMBUSH,
                W("Assault", "Infested Missile Launcher - Acid Blast", "6", "All", "3", "3+", "-", "-", "1",
                  ["CRITICAL HIT (1)", "LONG RANGE (12\")", "PIERCE Armoured (2)", "SPECIALIST"], replaces="Infested C-14 Rifle"),
                W("Assault", "Infested Missile Launcher - Scourgeshot", "12", "All", "3", "3+", "-", "-", "1",
                  ["BURST FIRE 6\" (2)", "SPECIALIST"], replaces="Infested C-14 Rifle"),
                PLAGUED_MUNITIONS,
                W("Combat", "Wild Mutation", "E", "Ground", "2", "3+", "Armoured", "D3+1", "1", [], replaces="Infested C-14 Rifle")],
      corrections=["Plagued Munitions printed 'NON-LETHAL Damage (1)'; shown as NON-LETHAL DAMAGE (1)."],
      notes=["Wild Mutation is a Close Combat weapon printed 'FOR Infested C-14 Rifle' (a ranged weapon). Reproduced as printed."]),
    O(id="infested-trooper", name="Infested Trooper (Infested Marine)", race="Zerg", tags=["Zerg", "Stukov's Forces"], slot="Core", role=None, base_mm=None,
      stats=dict(speed="3/6", armour="4+", evade="6+", hp=4, size=2), supply=[("1-1", 0), ("2-3", 1)],
      combat_tags=["Biological", "Infested", "Light", "Ground"],
      abilities=[LIVE_FOR_THE_SWARM, DETONATION(2), Z_BURROW_AMBUSH, SPREAD_INFESTATION, PLAGUED_MUNITIONS, DEV_CHARGE(2, "4+")],
      weapons=[W("Assault", "Infested C-14 Rifle", "12", "All", "3", "3+", "Light", "D3", "1", ["BURST FIRE 6\" (2)"]),
               W("Combat", "Bayonet", "E", "Ground", "2", "5+", "-", "-", "1", [])],
      upgrades=[],
      notes=["The upgrade side of this card was not photographed: Army Slot is assumed to be Core (as the Infested Marine); combat role, base size and any upgrades are unknown."]),
    O(id="stukov", name="Stukov", race="Zerg", tags=["Zerg"], slot="Hero", role="Tactician", unique=True, base_mm=40,
      stats=dict(speed="7", armour="4+", evade="6+", hp=10, size=2), supply=[("1-1", 1)],
      combat_tags=["Biological", "Infested", "Ground"],
      abilities=[COMMANDER, SPREAD_INFESTATION,
                 A("Movement", "Admiral of the Infested", "Active", "1 BM",
                   "Target an Enemy Unit Within 8\" that has the INFESTATION Status. That Unit counts as Activated in this Phase (set an Activation Marker next to it) and remove the INFESTATION Status from that Unit. You may target any Non-Unique Friendly Unit with the Infested Combat Tag that is Within 8\" of the previously targeted Enemy Unit. Remove the Activation Marker from that targeted Friendly Unit."),
                 A("Assault", "Corrode Armor", "Reaction", "1 BM",
                   "Immediately after this Unit resolves a Ranged Attack against an Enemy Unit, the target Unit gains the DEBUFF Armour (1)."),
                 DEV_CHARGE(6, "4+")],
      weapons=[W("Assault", "Corrosive Blast", "8", "Ground", "3", "3+", "Light, Armoured", "D3", "1", []),
               W("Combat", "Infested Arm", "E", "Ground", "3", "3+", "Armoured", "D3", "2", [])],
      upgrades=[A("Any", "Plague Warden", "Passive", None,
                  "Treat the Supply characteristic of any Enemy Unit that has the INFESTATION Status and is Within 6\" as reduced by 1 (to a minimum of 0) for Controlling and Contesting Mission Markers, and completing objectives."),
                A("Assault", "Bio-Kill Switch", "Active", "0 BM",
                  "Each Enemy Unit with the INFESTATION Status on the Battlefield suffers Damage (2). Immediately after this Special Ability is resolved, Remove the INFESTATION Status from Units that suffered Damage.")],
      notes=[]),
    O(id="infested-missile-turret", name="Infested Missile Turret", race="Zerg", tags=["Zerg", "Stukov's Forces"], slot=None, role=None, unique=True,
      summoned=True, base_mm=None,
      stats=dict(speed="-", armour="5+", evade="-", hp=8, size=3), supply=[("1-1", 0)],
      combat_tags=["Armoured", "Biological", "Infested", "Ground"],
      abilities=[A("Any", "Detection", "Passive", None, "While Enemy Units are Within 8\" of this Unit, they lose the HIDDEN Status."),
                 A("Any", "Infestation", "Reaction", "0 BM",
                   "When the Supply of an Enemy Unit with the INFESTATION Status is reduced to 0, or when that Unit is Destroyed, you can apply the INFESTATION Status to another Enemy Unit Within 8\" of that Unit. For the purposes of resolving Special Abilities, this effect is treated as a DEBUFF."),
                 A("Any", "Source of Creep", "Passive", None, "A Friendly or Enemy Ground Zerg Unit Within 6\" of this Unit, counts as being ON CREEP."),
                 STRUCTURE,
                 A("Assault", "Ocular Overwatch", "Reaction", "0 BM",
                   "When an Enemy Flying Unit ends its Activation Within 14\". This Unit immediately performs a Ranged Attack against that Enemy Unit.")],
      weapons=[W("Assault", "Firefly Missiles", "14", "Flying", "8", "4+", "Light, Armoured", "D3", "1", ["ANTI-EVADE (1)"])],
      upgrades=[],
      notes=["Combat role and base size are not on the photographed side. Set on the battlefield by the Stukov's Forces Faction Card (Hostile Incubation).",
             "Detection is printed Within 8\" on this card (6\" on other cards). Reproduced as printed."]),
]

# ---------------------------------------------------------------- CARDS
T, P_, Z = "Terran", "Protoss", "Zerg"
SLOT_NOTE = "Only the rules side of this card was photographed: its army slots, Unique marking and faction tags are on the other side and are unknown, so it adds no slots yet."
STUKOVS_CREEP = ("Any", "Stukov's Creep", "Passive",
                 "If an Enemy Unit ends a Move, Deploy, Run, Charge or Disengage action Within 1\" of a Friendly Creep Tumor token, remove that token from the battlefield. Creep Tumor tokens have STAY IN PLAY and DISPLACEMENT.")
CREEP_NOTE = ("Only the rules side of this card was photographed, so its card type, faction tags and Unique marking are not printed there. "
              "Recorded as a Virus Card (the card type the Stukov's Forces Faction Card requires; these three cards carry Stukov's Creep and INFESTATION effects). "
              "Tags recorded as Zerg only; as a Virus Card it is offered only to Faction Cards that require one (Stukov's Forces).")


def CARD(id, name, kind, race, tags, slots, res_val, abilities, unique=False, notes=None):
    res_type = {"Terran": "CP", "Protoss": "PE", "Zerg": "BM"}[race]
    return {"id": id, "name": name, "kind": kind, "race": race, "faction_tags": tags, "unique": unique,
            "slots": slots, "resource": {"type": res_type, "value": res_val},
            "abilities": [{"phase": p, "name": n, "type": t, "text": x} for p, n, t, x in abilities],
            "card_version": V, "corrections": [], "notes": (notes or []) + ([] if kind == "Faction" else [NO_COST]), "provisional": True}


CARDS = [
    CARD("taldarim", "Tal'darim", "Faction", P_, ["Protoss", "Tal'darim"], {}, None, [
        ("Any", "Chain of Ascension", "Passive", "Calculate the total lost Supply of all Friendly Units. While this total is: 4 or more: All your Units' first used weapons gain PRECISION (1). 6 or more: All your Units' first used weapons gain CRITICAL HIT (1)."),
        ("Movement", "Proxy Pylon", "Active", "If there is no Friendly Tal'darim Pylon on the battlefield, set a Friendly Tal'darim Pylon Unit anywhere on the GROUND LEVEL of the battlefield more than 10\" away from any Enemy model. This Round, the Tal'darim Pylon is not eligible to use its Special Abilities (excluding Structure)."),
    ], unique=True, notes=["Only the rules side of this card was photographed: its army slots and PE value are on the other side and are unknown, so it provides no slots yet (slots come only from Tactical Cards)."]),
    CARD("stukovs-forces", "Stukov's Forces", "Faction", Z, ["Zerg", "Stukov's Forces"], {}, 1, [
        ("Any", "Ashes of the UED", "Passive", "During Army Building, you may include Units with the Terran Faction Tag and both Ground and Mechanical Combat Tags in your army. Those Units gain the Infested Combat Tag. Treat any CP cost for those Units' Special Abilities as BM. These Units cannot gain the BURROWED Status."),
        ("Any", "Infestation", "Passive", "During Army Building, select exactly one Virus Card and add it to their Army List, paying its listed cost (if any)."),
        ("Movement", "Hostile Incubation", "Active", "If there is no Friendly Infested Missile Turret on the battlefield, set a Friendly Infested Missile Turret Unit anywhere on the GROUND LEVEL of the battlefield more than 10\" away from any Enemy model. This Round, the Infested Missile Turret is not eligible to use its Special Abilities (excluding Structure)."),
    ], unique=True, notes=["Only the rules side of this card was photographed: its army slots are on the other side and are unknown, so it provides no slots yet. Faction tags (Zerg, Stukov's Forces) and UNIQUE are assumed, as printed on every other Faction Card.",
                           "Ashes of the UED is applied by the builder: Units with the Terran Faction Tag and both Ground and Mechanical Combat Tags (currently Goliath and Siege Tank) may be added. The tracker pays their CP costs with BM cards."]),
    CARD("robotics-support-bay", "Robotics Support Bay", "Tactical", P_, ["Protoss"], {}, 1, [
        ("Movement", "Master of Robotics", "Active", "The active Mechanical Unit resolves the HEAL (2) effect."),
    ], notes=[SLOT_NOTE]),
    CARD("infested-command-center", "Infested Command Center", "Tactical", Z, ["Zerg"], {}, 1, [
        ("Movement", "Parasitic Bio-Toxins", "Reaction", "Immediately after a Friendly Infested Unit ends their action Within 8\" of an Enemy Unit. That Enemy Unit gains the INFESTATION Status, this effect is treated as a DEBUFF."),
        ("Movement", "Scanner Sweep", "Active", "Set a Faction Indicator anywhere on the battlefield. While Enemy Units are Within 6\" of this Faction Indicator, they lose the HIDDEN Status."),
    ], notes=[SLOT_NOTE]),
    CARD("infested-barracks", "Infested Barracks", "Tactical", Z, ["Zerg"], {}, 1, [
        ("Movement", "For the Swarm!", "Active", "The active Biological Ground Unit performs a 2\" Move action. This does not count towards its action limit."),
    ], notes=[SLOT_NOTE]),
    CARD("hive", "Hive", "Tactical", Z, ["Zerg"], {}, 1, [
        ("Movement", "Brutal Instinct", "Reaction", "Immediately after an Enemy Unit ends its Activation Within 12\" of a Friendly Ground Unit. That Friendly Unit gains or loses the BURROWED Status."),
        ("Movement", "Creep Spread", "Active", "Set a Creep Tumor token on the battlefield Within 6\" (Line of Sight is not required) of either a Friendly Entry Edge or an existing Friendly Creep Tumor token."),
    ], notes=[SLOT_NOTE]),
    CARD("weighted-pustule", "Weighted Pustule", "Virus", Z, ["Zerg"], {}, None, [
        ("Any", "Fetid Touch", "Passive", "While an Enemy Unit has the INFESTATION Status, it cannot resolve the PLACE and set effects and cannot be returned to Reserves."),
        STUKOVS_CREEP,
    ], notes=[CREEP_NOTE]),
    CARD("hungering-infestation", "Hungering Infestation", "Virus", Z, ["Zerg"], {}, None, [
        ("Any", "Growing Infestation", "Passive", "While an Enemy Unit has the INFESTATION Status, it is not eligible to use or to be targeted by any Enemy Reaction Special Ability, except Restoration."),
        STUKOVS_CREEP,
    ], notes=[CREEP_NOTE]),
    CARD("healing-pathogen", "Healing Pathogen", "Virus", Z, ["Zerg"], {}, None, [
        ("Any", "Universal Carrier", "Passive", "While an Enemy Unit has the INFESTATION Status, immediately after its supply is reduced or it is destroyed, target any Friendly Biological Unit Within 12\". This Friendly Unit resolves the HEAL (2) effect."),
        STUKOVS_CREEP,
    ], notes=[CREEP_NOTE]),
]

for _c in CARDS:
    if _c["id"] == "stukovs-forces":
        _c["army_building"] = {"ability": "Ashes of the UED", "include": {"faction_tag": "Terran", "combat_tags": ["Ground", "Mechanical"]},
                               "grants_combat_tag": "Infested", "resource_as": "BM", "cannot_gain": "BURROWED"}
        _c["required_card"] = {"ability": "Infestation", "kind": "Virus"}

# PLACEHOLDER costs: 0 Minerals / 0 Gas until a cost table lists these cards. Compositions are an assumption too
# (the largest model count of each Supply bracket of 1 or more, as most cost-table entries do).
COSTS = {
    "firebat": {"compositions": [(4, 0, 1), (6, 0, 2)], "upgrades": {"Incinerator Gauntlets": ("-", [0, 0]), "Need a Light?": ("-", [0, 0])}},
    "reaver": {"compositions": [(1, 0, 2)], "upgrades": {"Solarite Scarab": ("-", [0]), "Phasing Scarab": ("-", [0]), "Shuttle": ("-", [0])}},
    "alarak": {"compositions": [(1, 0, 1)], "upgrades": {}},
    "slayer": {"compositions": [(1, 0, 1), (2, 0, 2)], "upgrades": {}},
    "infested-marine": {"compositions": [(3, 0, 1), (6, 0, 2)], "upgrades": {
        "Burrow Ambush": ("-", [0, 0]),
        "Infested Missile Launcher - Acid Blast": ("SPECIALIST, FOR Infested C-14 Rifle", [0, 0]),
        "Infested Missile Launcher - Scourgeshot": ("SPECIALIST, FOR Infested C-14 Rifle", [0, 0]),
        "Plagued Munitions": ("-", [0, 0]),
        "Wild Mutation": ("FOR Infested C-14 Rifle", [0, 0])}},
    "infested-trooper": {"compositions": [(3, 0, 1)], "upgrades": {}},
    "stukov": {"compositions": [(1, 0, 1)], "upgrades": {"Plague Warden": ("-", [0]), "Bio-Kill Switch": ("-", [0])}},
}
GAS = {"robotics-support-bay": 0, "infested-command-center": 0, "infested-barracks": 0, "hive": 0,
       "weighted-pustule": 0, "hungering-infestation": 0, "healing-pathogen": 0}
