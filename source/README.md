# SurgeCraft — build source

Everything needed to rebuild SurgeCraft and the card dataset. The repo root is the published site (GitHub Pages); this folder is the source it is built from.

## Restore

```sh
git clone https://github.com/digitalalchemist42/Surgecraft.git
cd Surgecraft && sh source/restore.sh
```

This puts the files back at the fixed paths the scripts use: `/home/claude/sc_data`, `/home/claude/app`, `/home/claude/upd106`, `/home/claude/upd1026`, `/home/claude/upd1110`. The art in `app/img` is copied from the site's `img/` folder.

Requirements: Python 3 with Pillow, Node.js, and Playwright with Chromium (for the browser smoke tests).

## Layout

| Folder | What it is |
|---|---|
| `sc_data/` | Card dataset in Python. `common.py` (W/A/U constructors), `terran_units.py`, `protoss_units.py`, `zerg_units.py`, `cards.py` (Faction/Tactical/Creep), `costs.py` (Unit Cost Table 10.6), `scenarios.py` (missions, deployments), `cards_1009.py` (official v1.09.26 cards for the units and cards added in 10.6, with their costs from the reissued table), `cards_1010.py` (v1.10.26 cards transcribed from photographs, all marked PREVIEW, no costs). `build.py` validates cards against the cost table and writes `starcraft_tmg_data.json` only when there are 0 errors. `verify_*.py` were the original PDF cross-checks (they need the card PDFs). `DATA_NOTES.md` records every correction, assumption and open question. |
| `app/` | The web app. `roster-core.js` (army rules and validation), `render.js` (card rendering, exports), `keywords.js` (keyword reference), `battle-core.js` (battle tracker engine), `dice-core.js` (dice engine: one attack through the three pools of Part 8.7.4; used by both the odds and the roller), `examples.js` (example armies, used by the tests only; the app no longer offers them), `ui/` (the interface, in parts; see below), `page.template.html`. `app_src.py` joins the `ui/` parts for `build_page.py` and `mk_test.py`. |
| `app/pwa/` | Icons, font and service-worker template for the installable site. |
| `app/kw/` | Scripts that built the keyword reference (`keyword_reference.json`). The rulebook text they read is not included. |
| `terrain/` | `extract_terrain.py`: crops the terrain key and the nine pre-made maps from the Full Rules PDF (Map Layouts, pp. 115-124) into `img/terrain/` and writes `sc_data/terrain.json` (piece names and each map's printed Assembly requires list). The PDF is not included. `python3 -I source/terrain/extract_terrain.py <Full Rules.pdf> <out dir>`, then copy `<out>/img/terrain` to `app/img/terrain` and `<out>/terrain.json` to `sc_data/`. |
| `archive/muster-v2/` | The app as it was at Version 2 (26 Sep 2026, then called StarCraft Muster). Reference only; the build does not read it. |
| `upd1110/` | v1.10.26 photograph tools: `crop.py` and `art.py` (crop boxes for portraits and card art from the owner's photographs of the printed cards). The photographs are not included. |
| `upd1026/` | v1.09.26 card update tools: `extract_1009.py` (unit portraits, card art and the One Bridge Too Close maps from the update PDFs), `cmp_text.py` (checks every ability and weapon in `cards_1009.py` against the PDF text layer), `costs1026.json` (parse of the reissued cost table). The PDFs themselves are not included; they go in `/home/claude/upd1026/pdf/`. |
| `upd106/` | 10.6 update tools: `work/parse_costs.py` (cost-table parser), `costs106.json`, `diff.py`, `make_art.py` (preview card art; `python3 make_art.py 2` regenerates the Zerg batch), and `img/` (miniature cut-outs from the cost table). |

## The interface source (`app/ui/`)

The files in `app/ui/` are parts of one script. `ui/ORDER` lists them; the build joins them in that order inside a single function, so they share variables and none of them is valid JavaScript on its own. To add a part, create the file and add its name to `ui/ORDER`.

| Part | What it holds |
|---|---|
| `01-base.js` | Data, state, viewer preferences (colour mode, layout, header) |
| `02-store.js` | Saving: Claude account storage, browser storage fallback |
| `03-roster-edit.js` | Example armies (tests), roster mutations, small shared renderers (`pvChip`) |
| `04-shell.js` | Top-level `render()`, roster list |
| `05-build.js` | Build tab |
| `06-export.js` | Export tab, Print / PDF |
| `07-reference.js` | Card pop-up, keyword reference, card reference |
| `07b-terrain.js` | Terrain setup (header button): pre-made maps, map roll, setup order |
| `08-share.js` | Share codes, import, summoned units |
| `08b-backup.js` | Back up all rosters to one file, restore through Import |
| `09-view.js` | View tab |
| `10-battle.js` | Battle tab |
| `10b-draft.js` | Mission and Deployment draft guide (Full Rules 9.2) |
| `11-battle-opponent.js` | Opponent's list, kills, battle report, past battles |
| `11b-dice.js` | Dice tab: attacker and target from the active lists, statuses, simulated odds, roll |
| `12-events.js` | Click and input handling, start-up |

## Build and test

```sh
cd /home/claude/sc_data && python3 build.py          # dataset -> starcraft_tmg_data.json (must report ERRORS: 0)
cd /home/claude/app
python3 build_page.py                                # -> starcraft-muster.html (the artifact page)
python3 mk_test.py                                   # -> test.html (adds the test hook)
python3 build_standalone.py                          # -> out/surgecraft.html and out/surgecraft-site/ (this repo's root)
node test-core.js && node test-render.js && node test-battle.js && node test-dice.js
python3 -m http.server 8765 &                        # smoke tests load http://localhost:8765/test.html
python3 smoke_view.py; python3 smoke_dep.py; python3 smoke_kw.py; python3 smoke_battle.py; python3 smoke_battle2.py; python3 smoke_shield.py; python3 smoke_pay.py; python3 smoke_cards.py; python3 smoke_terrain.py; python3 smoke_dice.py; python3 smoke_extras.py; python3 smoke_print.py   # Print / PDF: renders each export through Chromium's print pipeline and checks Letter pages (needs pypdf)
rm -rf /tmp/pwa-site && cp -r out/surgecraft-site /tmp/pwa-site && (cd /tmp/pwa-site && python3 -m http.server 8767 &) ; python3 smoke_pwa.py   # the test edits sw.js, so it serves a copy
```

## Publish

- Site: copy `app/out/surgecraft-site/*` to the repo root, commit, push. GitHub Pages serves it.
- Claude artifacts: SurgeCraft (shared by link) is `starcraft-muster.html`; SurgeCraft v3.1 (private) is the same page with the title `SurgeCraft v3.1`. Image files are published alongside as `img/...`.

## Adding cards

1. Add the unit or card to the right `sc_data` file, and its cost to `costs.py` (or the `COSTS` and `GAS` dicts in `cards_1009.py`). A preview transcription can be marked `provisional=True` so the app labels it PREVIEW and counts it as 0 Minerals / 0 Gas with a roster warning. `build.py` accepts a provisional entry only if its id is in `PREVIEW_OK` (currently the v1.10.26 set in `cards_1010.py`); any other provisional entry is an error. When a cost table lists a preview card, add its cost and remove the flag.
2. Add art: `app/img/units/<id>.webp` (306x646 portrait), `app/img/minis/<id>.webp`, `app/img/cards/<id>.webp`. (Terrain map images are `app/img/terrain/`.)
3. Run `build.py` (0 errors), then the app build and tests above.
4. Update `DATA_NOTES.md` with any conflict between the card and the cost table, and which value was used.

## Automatic tests

`.github/workflows/tests.yml` runs on every push: it restores the workspace with `restore.sh`, rebuilds the data file (must print `ERRORS: 0` and match the committed copy), rebuilds the page, then runs the four `test-*.js` files and the browser tests. `smoke_pwa.py` is not part of it.
