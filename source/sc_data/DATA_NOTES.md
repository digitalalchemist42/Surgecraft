# StarCraft TMG — Verified Card Dataset Notes

Source of truth for the roster app: `starcraft_tmg_data.json` (built from visual transcription of every card, cross-checked against the PDF text layer and the Unit Cost Table — version 10.6, 09.10.2026, as reissued with the v1.09.26 cards).

## Contents (after the v1.09.26 card update, 2026-10-22)
- 45 unit entries: 38 fieldable, 7 summoned (Point Defense Drone, Pylon, Omega Worm, Roachling, Auto-Turret, Holo Decoy, Sabotage Drone)
- 49 cards: 10 Faction, 36 Tactical, 3 Creep
- 7 Mission Cards (each with Standard + Skirmish side), 7 Deployment Cards (Standard 54x36 side + Skirmish 36x36 side)
- No provisional (PREVIEW) entries remain. The build fails if any entry is marked provisional.

## v1.09.26 card update (2026-10-22)
Sources: Terran Update 3, Protoss Update 2, Zerg Update 3 (10-2026), cards v1.09.26, sheets dated September 2026 v.1.0. Transcribed visually and cross-checked against the PDF text layer: every ability name, type, cost and text, and every weapon row, matches (differences were typography only: `''` for `"`, bullet glyphs, a space before a colon in "PSI LIGHTNING :").

The other files delivered with this update were checked and are **not** changes:
- Terran Update 1 & 2, Protoss Update 1 & 4, Zerg Update 1 & 2 are byte-for-byte identical to Terran/Protoss/Zerg Units 1 & 2.
- Change Log 10-2026 is the 09.10.2026 changelog already applied in the 10.6 update.
- There is no Protoss Update 3 (owner confirmed nothing missing).

**Unit Cost Table reissued (same date, 09.10.2026)** — four cells differ from the first 10.6 table; read visually and parsed from the text layer:
- Spec Ops Marauder 240 → 230 · High Templar 2 models 120 → 130 (4 models stays 200) · Defiler 160 → 130 · Bile Launcher now listed at 150.
- These now agree with the preview cards; the earlier preview-vs-table conflicts are resolved.

**Changes from the preview transcriptions:**
- Faction tags now printed: Spec Ops Marauder and Sabotage Drone = Terran + Nova Covert Ops; Twilight Templar = Protoss + Templar Caste; Vileling and Reactive Creep = Zerg + Zagara's Swarm. Consequence: these are only eligible in that faction (Reactive Creep is no longer offered to Zerg Swarm or Kerrigan's Swarm). All other new units and Tactical Cards carry the race tag only.
- Faction Cards Nova Covert Ops, Templar Caste, Zagara's Swarm: tags race + faction name, UNIQUE.
- UNIQUE printed on Templar Archives, Defiler Mound and Reactive Creep.
- Holo Decoy combat tags: Psionic, Ground (Biological removed).
- High Templar 3–4 models → Supply 2 is printed (was inferred).
- Defiler Burrow Ambush printed wording differs from other Zerg cards: "deploy from Reserves" and "No model may be placed Within 10"". Reproduced as printed.
- Bile Launcher Source of Creep: no comma before "counts".
- Abilities reordered to printed order (Nova Assault Mode, Holo Decoy, Tassadar, Twilight Templar, Vileling, Bile Launcher, Zagara's Swarm).
- Combat role and base size added for all 14 units; Raven uses a flight stand (`base_mm: "Flight stand"`).
- Real card art extracted from the PDFs for the 14 unit portraits and 7 cards; generated placeholder art removed.

**Owner decision — Zagara's Broodmother:** the card prints Broodmother on its UPGRADE side, but the cost table lists no upgrades for Zagara. Kept as a built-in ability (always available, no cost) until a table prices it.

**New scenario cards:**
- Mission **Fire in the Sky** (Standard 5 Supply, +3/Round, 5 Rounds, win at a 10 VP lead; Skirmish 3, +2, 5, 8). Markers carry a Sabotage Level 1–3 (starts at 1); an Unengaged Unit Within 3" of a Controlled Marker may perform a Sabotage Action (±1); from Round 2 a Controlled Marker that is Neutral or the Opponent's colour scores VP equal to its level. The Battle tab tracks levels, offers the Sabotage action and suggests the VP.
- Deployment **One Bridge Too Close** (Standard) / **Power Lines** (Skirmish). Map images cropped from Terran Update 3 p.8; geometry not transcribed (same as other deployments).

## 10.6 update (Changelog + Unit Cost Table 10.6, 09.10.2026)
Cost table and changelog agree line for line. No rule-text changes in the changelog.

**Unit costs changed:** Marine 170/220 · Marauder 160/290 · Medic 120 · Goliath 180 · Jim Raynor 280 · Zergling 150/210 · Raptor 210/260 · Kerrigan (Swarm) Raptor 230 · Swarmling 210 · Vile 190 · Corpser 220 · Queen 140 · Zealot 170 · Praetor Guard 260 · Adept 160 · Stalker 160/270 · Artanis 270.

**Upgrades changed:** Veteran of Tarsonis 20/40 · Stabilizer Medpacks 20 · Glial Reconstitution 10 (all three Zerg units) · Hydralisk upgrades 20/30, 20/30, 10/10 · Sentry upgrades 20 and 10.

**Gas changed:** Barracks 30 · Barracks Tech Lab 40 · Academy 40 · Dropship 35 · Spawning Pool (Six Pool) 35 · Hydralisk Den 30 · Evolution Chamber 25 · Nexus 40 · Twilight Council 40.

**Changelog typo:** under Artanis the changelog prints "Adept 250→270"; the cost table confirms this is Artanis 270 (Adept is 160).

Rulebook 9.1 example roster now totals 1760 minerals / 195 gas at 10.6 costs.

## Verification performed (original dataset)
1. Every card half read visually at 200 dpi (upside-down halves rotated).
2. Weapon rows, stat lines, supply brackets: 126 values cross-checked against PDF text layer; all consistent (flags were text-wrap / column-order artifacts only).
3. Abilities: 165 name/type/cost checks against text layer; only flags are the deliberate corrections below.
4. Tactical/Faction slot allocations and resource values: exact multiset match with text layer.
5. Cost table vs cards (programmatic): every composition's supply matches the card's Supply Profile; every upgrade on each card appears in the cost table and vice versa; FOR-replacement targets and SPECIALIST flags agree; every Tactical Card has a gas cost. 0 errors. Checker was mutation-tested. Re-run after each update: 0 errors.

## Cost-table re-verification (2026-09-25)
- Every cell of the Unit Cost Table (pp.2-16) read visually at 150 dpi and re-parsed independently from the text layer.
- Result: 27 units, 34 compositions (models / minerals / supply), 64 upgrades (88 cost cells), 35 Tactical/Creep gas costs — all match.
- **Bug found and fixed:** upgrades shared between unit definitions (Burrow Ambush, Leg Enhancements) were one object in memory, so the last unit built overwrote the others' point costs. Fix: every unit is deep-copied before costs are attached; a post-assembly guard now fails the build if any upgrade cost is missing, the wrong length, or differs from the table.
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
| Tassadar | "PSI LIGHTNING :" | Psi Lightning |

## List sizes (app interpretation of Part 9.1.1, 2026-10-12)
- The rulebook defines three scales: Skirmish (up to 1,000 Minerals, 36x36), Standard (up to 2,000, 36x54), Grand Offensive (2,001+, 36x72). It does not define 500 or 1,500 as scales.
- The app offers five list sizes: 500 and 1,000 under Skirmish, 1,500 and 2,000 under Standard, and Grand Offensive. Owner decision: follow the "up to" wording, so a 500 list uses the Skirmish battlefield and Skirmish Level card sides, and a 1,500 list uses Standard.
- Vespene Gas stays 10% of the Mineral limit (50 at 500, 150 at 1,500), per 9.1.4.

## Open questions (not corrected — need publisher/FAQ or owner decision)
- **Zagara – Broodmother** printed as an UPGRADE with no cost-table price (kept as a built-in ability, see above).
- **Cocoon** (Zerg Tactical, 30 gas): no BM value printed.
- **Sentry – Solid-Field Projectors** upgrade text is identical to the base Force Field ability (paid upgrade with no effect as printed).
- **Kerrigan's Swarm slots**: card = 3 Core, 2 Elite, 1 Hero; rulebook 9.1.2 example says 3 Core, 1 Hero, 2 Support. Card used.
- **Air slots** exist on 4 Faction Cards; the Raven is Flying but printed as a Support unit, so the Air slot is still unused.
- **Vile – Tunneling Claws** printed under Movement Phase (Any Phase on Roach/Corpser).
- **Artefact Hunt** prints no special-winning-condition VP lead.
- **Siege Tank – Mode Transformation** is a purchasable upgrade (20 minerals); without it the tank cannot enter SIEGE MODE, so the Shock Cannon is unusable. Reproduced as printed.

## Not yet transcribed
- Deployment-zone and Mission Marker coordinates on Deployment Cards (names/pairings are done).
- Combat-range indicator bars and flavour text.
