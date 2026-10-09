# StarCraft TMG — Verified Card Dataset Notes

Source of truth for the roster app: `starcraft_tmg_data.json` (built from visual transcription of every card, cross-checked against the PDF text layer and the September 2026 Unit Cost Table).

## Contents
- 31 unit cards (27 fieldable, 4 summoned: Point Defense Drone, Pylon, Omega Worm, Roachling)
- 42 cards: 7 Faction, 33 Tactical, 2 Creep
- 6 Mission Cards (each with Standard + Skirmish side), 6 Deployment Cards (Standard 54x36 side + Skirmish 36x36 side)

## Verification performed
1. Every card half read visually at 200 dpi (upside-down halves rotated).
2. Weapon rows, stat lines, supply brackets: 126 values cross-checked against PDF text layer; all consistent (flags were text-wrap / column-order artifacts only).
3. Abilities: 165 name/type/cost checks against text layer; only flags are the deliberate corrections below.
4. Tactical/Faction slot allocations and resource values: exact multiset match with text layer.
5. Cost table vs cards (programmatic): every composition's supply matches the card's Supply Profile; every upgrade on each card appears in the cost table and vice versa; FOR-replacement targets and SPECIALIST flags agree; every Tactical Card has a gas cost. 0 errors. Checker was mutation-tested.

## Cost-table re-verification (2026-09-25)
- Every cell of the Unit Cost Table (pp.2-16) read visually at 150 dpi and re-parsed independently from the text layer.
- Result: 27 units, 34 compositions (models / minerals / supply), 64 upgrades (88 cost cells), 35 Tactical/Creep gas costs — all match.
- **Bug found and fixed:** upgrades shared between unit definitions (Burrow Ambush, Leg Enhancements) were one object in memory, so the last unit built overwrote the others' point costs. Affected output before the fix:
  - Roach, Vile, Corpser, Swarmling – Burrow Ambush carried [20, 40] instead of 20.
  - Zergling, Raptor – Burrow Ambush carried [20, 40] instead of [20 (12 models), 30 (18 models)].
  - Praetor Guard – base Leg Enhancements ability carried a stray 20-mineral cost.
- Fix: every unit is deep-copied before costs are attached; a post-assembly guard now fails the build (and blocks the JSON write) if any upgrade cost is missing, the wrong length, or differs from the table.
- Point values the cost table does **not** contain (by design, not omissions): summoned units have no cost (Rules 9.1.9); Faction Cards have no gas cost; the table lists gas only, so Cocoon's missing BM value is still unresolved.

## Corrections applied (card typos)
| Card | Printed | Corrected |
|---|---|---|
| Marine | AGG-12 "FOR C-14 RIFFLE" | FOR C-14 Rifle |
| Marauder | "Concusive Shells" | Concussive Shells |
| Adept | "Resonating Glaves" | Resonating Glaives (cost table spelling) |
| Roach, Corpser | Glial Reconstitution "1 CP" | 1 BM (Zerg resource; Vile prints 1 BM) |
| Pylon | combat tag "ARMORED" | Armoured |
| Siege Tank | "Impassible Terrain"; LONG RANGE (24) | Impassable; LONG RANGE (24") |
| Immortal | LONG RANGE (16) | LONG RANGE (16") |
| Raynor's Raiders (faction) | "Point Defence Drone" | Point Defense Drone (unit card title) |
| Engineering Bay / Forge | "Infantry Armor" / "Ground Armor" | Armour |
| Armory | "...used gain CRITICAL HIT" | gains |
| Nerazim (faction) | "...first Weapon used CRITICAL HIT (2)" | used gains CRITICAL HIT (2) |

## Open questions (not corrected — need publisher/FAQ or owner decision)
- **Cocoon** (Zerg Tactical, 30 gas): no BM value printed.
- **Sentry – Solid-Field Projectors** upgrade text is identical to the base Force Field ability (paid upgrade with no effect as printed).
- **Kerrigan's Swarm slots**: card = 3 Core, 2 Elite, 1 Hero; rulebook 9.1.2 example says 3 Core, 1 Hero, 2 Support. Card used.
- **Air slots** exist on 4 Faction Cards, but no current unit uses the Air slot.
- **Vile – Tunneling Claws** printed under Movement Phase (Any Phase on Roach/Corpser).
- **Artefact Hunt** prints no special-winning-condition VP lead.
- **Siege Tank – Mode Transformation** is a purchasable upgrade (20 minerals); without it the tank cannot enter SIEGE MODE, so the Shock Cannon is unusable. Reproduced as printed.

## Not yet transcribed
- Deployment-zone and Mission Marker coordinates on Deployment Cards (names/pairings are done).
- Combat-range indicator bars and flavour text.
