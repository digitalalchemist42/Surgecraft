# Mission and Deployment (Scenario) Cards. Mission cards: Terran Units 1.pdf pp.11-13 (identical copies in the Protoss and Zerg PDFs)
# plus Artefact Hunt from Protoss Units 2.pdf p.5. Each physical card has a Standard Engagement side and a Skirmish Level side.
# Deployment cards: Terran Units 1.pdf pp.13-14 and Protoss Units 2.pdf p.4.

ENEMY_SUPPLY = "Score VPs equal to Enemy Supply destroyed this Round."

def side(supply, per_round, length, lead, params, scoring, additional=None):
    return {"deploy_supply": supply, "supply_per_round": per_round, "game_length": length,
            "special_win_lead": lead, "mission_parameters": params, "scoring": scoring,
            "additional": additional or []}

HOLD_SCORING = [ENEMY_SUPPLY, "FROM THE START OF THE SECOND ROUND:",
                "Gain 1 VP for each Controlled Mission Marker that is Neutral or associated with your colour.",
                "Gain 2 VPs for each Controlled Mission Marker associated with the Opponent colour."]
FRONT_SCORING = [ENEMY_SUPPLY, "FROM THE START OF THE SECOND ROUND:",
                 "Gain 1 VP for each Controlled Mission Marker.",
                 "Gain an additional 2 VPs for a Marker if you gained Control of it from the Opponent this Round."]
GATHER_SCORING = [ENEMY_SUPPLY, "FROM THE START OF THE SECOND ROUND:",
                  "Gain 2 VPs for each Controlled Mission Marker associated with the Opponent colour."]
GATHER_ADD = ["ASSAULT PHASE: If an Unengaged Unit is Within 3\" of a Controlled Neutral Mission Marker or associated with the Opponent, this unit may perform the Gather Action instead of a standard action.",
              "GATHER ACTION: Gain 1 VP."]
DIVIDE_PARAMS = ["All Mission Markers are Activated.", "Split the Battlefield in four quarters as shown on the Deployment Card."]
DIVIDE_SCORING = [ENEMY_SUPPLY, "FROM THE START OF THE FIRST ROUND:",
                  "Calculate Total Current Supply in each battlefield quarter.",
                  "Gain 1 VP for each quarter where your Total Current Supply is higher than the Opponent's.",
                  "Only Units Wholly Within a quarter contribute their Supply to this check.",
                  "If a Unit controls a Mission Marker, that Unit is worth 1 extra Supply for controlling quarters.",
                  "Gain 2 VP for Controlling Mission Marker 5."]
def artefact_scoring(n_claim, n_hold):
    return [ENEMY_SUPPLY,
            f"END OF ROUND 5: Gain {n_claim} VP for each Friendly Unit that CLAIM Mission Marker and it is Wholly Within Friendly Zone of Influence.",
            f"Gain {n_hold} VP for each Mission Marker associated with your colour that is not currently CLAIM by an Enemy Unit."]
ARTEFACT_ADD = ["SCORING PHASE: From the Start of the Second Round, if a Unit is Within 3\" of a Controlled Mission Marker that is Neutral or associated with the Opponent colour, that Unit may CLAIM it.",
                "CLAIM: Place the Mission Marker on the Unit Card. A Unit carrying a Mission Marker must DROP it if: it has its Current Supply Value reduced; before it resolves a PLACE effect; it is Engaged with Enemies having a greater combined Current Supply Value; it is Destroyed, removed from the battlefield, or returned to Reserves.",
                "When a Unit DROP a Mission Marker, the Opponent places the Mission Marker Within 2\" of the Unit or its last model removed.",
                "Unit may CLAIM only one Mission Marker at a time."]
ALL_ACTIVE = ["All Mission Markers are Activated."]

MISSIONS = [
    {"id": "supply-drop", "name": "Supply Drop",
     "standard": side(6, 2, 5, 12,
                      ["All Mission Markers are Deactivated.",
                       "START OF THE ROUND (1-4): Randomly determine one Deactivated Mission Marker (1-4) and flip it to its Activated side.",
                       "START OF THE ROUND 5: Mission Marker 5 is automatically Activated."],
                      [ENEMY_SUPPLY, "FROM THE START OF THE FIRST ROUND: For each activated Controlled Mission Marker, gain VPs equal to the Game Round number in which that Mission Marker was Activated and remove it."]),
     "skirmish": side(4, 1, 4, 8,
                      ["All Mission Markers are Deactivated.",
                       "START OF THE ROUND (2-4): Randomly determine one Deactivated Mission Marker (1,2,5) and flip it to its Activated side."],
                      [ENEMY_SUPPLY, "FROM THE START OF THE SECOND ROUND: For each activated Controlled Mission Marker, gain VPs equal to the Game Round number in which that Mission Marker was Activated and remove it."])},
    {"id": "hold-position", "name": "Hold Position",
     "standard": side(6, 2, 5, 10, ALL_ACTIVE, HOLD_SCORING),
     "skirmish": side(3, 1, 5, 8, ALL_ACTIVE, HOLD_SCORING)},
    {"id": "frontlines", "name": "Frontlines",
     "standard": side(6, 2, 5, 10, ALL_ACTIVE, FRONT_SCORING),
     "skirmish": side(3, 1, 5, 8, ALL_ACTIVE, FRONT_SCORING)},
    {"id": "gather-the-resources", "name": "Gather the Resources",
     "standard": side(6, 2, 5, 10, ALL_ACTIVE, GATHER_SCORING, GATHER_ADD),
     "skirmish": side(3, 1, 5, 8, ALL_ACTIVE, GATHER_SCORING, GATHER_ADD)},
    {"id": "divide-and-conquer", "name": "Divide and Conquer",
     "standard": side(8, 2, 4, 10, DIVIDE_PARAMS, DIVIDE_SCORING),
     "skirmish": side(4, 1, 4, 8, DIVIDE_PARAMS, DIVIDE_SCORING)},
    {"id": "artefact-hunt", "name": "Artefact Hunt", "source": "Protoss Units 2.pdf p.5 (dated September 2026)",
     "standard": side(6, 2, 5, None, ALL_ACTIVE, artefact_scoring(4, 2), ARTEFACT_ADD),
     "skirmish": side(3, 1, 5, None, ALL_ACTIVE, artefact_scoring(3, 1), ARTEFACT_ADD)},
]

# Each physical Deployment Card: Standard side (54"x36") and Skirmish side (36"x36").
DEPLOYMENTS = [
    {"id": "gauntlet", "standard": "Gauntlet", "skirmish": "Abandoned Camp"},
    {"id": "typhoon", "standard": "Typhoon", "skirmish": "Agria Valley"},
    {"id": "acropolis", "standard": "Acropolis", "skirmish": "Dirt Side"},
    {"id": "proving-grounds", "standard": "Proving Grounds", "skirmish": "Frontier"},
    {"id": "breach", "standard": "Breach", "skirmish": "Char Plains"},
    {"id": "meeting-engagement", "standard": "Meeting Engagement", "skirmish": "Green Valleys",
     "source": "Protoss Units 2.pdf p.4"},
]
for d in DEPLOYMENTS:
    d["battlefield"] = {"standard": "54x36", "skirmish": "36x36"}
    d.setdefault("notes", []).append("Deployment-zone and Mission Marker geometry is not yet transcribed; tracker should show the card image until it is.")

SCENARIO_NOTES = [
    "Organized Play rules: each roster submits 2 Mission Cards and 2 Deployment Cards, no duplicates within a player's own set.",
    "'Special winning condition' lead threshold: none printed on Artefact Hunt.",
    "Artefact Hunt keeps its printed grammar ('Unit that CLAIM', 'a Unit DROP') because CLAIM/DROP are keyword terms.",
]
