# SurgeCraft — build source

Everything needed to rebuild SurgeCraft and the card dataset. The repo root is the published site (GitHub Pages); this folder is the source it is built from.

## Restore

```sh
git clone https://github.com/digitalalchemist42/Surgecraft.git
cd Surgecraft && sh source/restore.sh
```

This puts the files back at the fixed paths the scripts use: `/home/claude/sc_data`, `/home/claude/app`, `/home/claude/upd106`, `/home/claude/upd1026`. The art in `app/img` is copied from the site's `img/` folder.

Requirements: Python 3 with Pillow, Node.js, and Playwright with Chromium (for the browser smoke tests).

## Layout

| Folder | What it is |
|---|---|
| `sc_data/` | Card dataset in Python. `common.py` (W/A/U constructors), `terran_units.py`, `protoss_units.py`, `zerg_units.py`, `cards.py` (Faction/Tactical/Creep), `costs.py` (Unit Cost Table 10.6), `scenarios.py` (missions, deployments), `cards_1009.py` (official v1.09.26 cards for the units and cards added in 10.6, with their costs from the reissued table). `build.py` validates cards against the cost table and writes `starcraft_tmg_data.json` only when there are 0 errors. `verify_*.py` were the original PDF cross-checks (they need the card PDFs). `DATA_NOTES.md` records every correction, assumption and open question. |
| `app/` | The web app. `roster-core.js` (army rules and validation), `render.js` (card rendering, exports), `keywords.js` (keyword reference), `battle-core.js` (battle tracker engine), `examples.js`, `app.js` (UI), `page.template.html`. |
| `app/pwa/` | Icons, font and service-worker template for the installable site. |
| `app/kw/` | Scripts that built the keyword reference (`keyword_reference.json`). The rulebook text they read is not included. |
| `upd1026/` | v1.09.26 card update tools: `extract_1009.py` (unit portraits, card art and the One Bridge Too Close maps from the update PDFs), `cmp_text.py` (checks every ability and weapon in `cards_1009.py` against the PDF text layer), `costs1026.json` (parse of the reissued cost table). The PDFs themselves are not included; they go in `/home/claude/upd1026/pdf/`. |
| `upd106/` | 10.6 update tools: `work/parse_costs.py` (cost-table parser), `costs106.json`, `diff.py`, `make_art.py` (preview card art; `python3 make_art.py 2` regenerates the Zerg batch), and `img/` (miniature cut-outs from the cost table). |

## Build and test

```sh
cd /home/claude/sc_data && python3 build.py          # dataset -> starcraft_tmg_data.json (must report ERRORS: 0)
cd /home/claude/app
python3 build_page.py                                # -> starcraft-muster.html (the artifact page)
python3 mk_test.py                                   # -> test.html (adds the test hook)
python3 build_standalone.py                          # -> out/surgecraft.html and out/surgecraft-site/ (this repo's root)
node test-core.js && node test-render.js && node test-battle.js
python3 -m http.server 8765 &                        # smoke tests load http://localhost:8765/test.html
python3 smoke_view.py; python3 smoke_dep.py; python3 smoke_kw.py; python3 smoke_battle.py; python3 smoke_battle2.py
rm -rf /tmp/pwa-site && cp -r out/surgecraft-site /tmp/pwa-site && (cd /tmp/pwa-site && python3 -m http.server 8767 &) ; python3 smoke_pwa.py   # the test edits sw.js, so it serves a copy
```

## Publish

- Site: copy `app/out/surgecraft-site/*` to the repo root, commit, push. GitHub Pages serves it.
- Claude artifacts: SurgeCraft (shared by link) is `starcraft-muster.html`; SurgeCraft v3.1 (private) is the same page with the title `SurgeCraft v3.1`. Image files are published alongside as `img/...`.

## Adding cards

1. Add the unit or card to the right `sc_data` file, and its cost to `costs.py` (or the `COSTS` and `GAS` dicts in `cards_1009.py`). A preview transcription can be marked `provisional=True` so the app labels it PREVIEW, but `build.py` refuses to write the dataset while any entry is provisional; relax that check deliberately if previews are needed again.
2. Add art: `app/img/units/<id>.webp` (306x646 portrait), `app/img/minis/<id>.webp`, `app/img/cards/<id>.webp`.
3. Run `build.py` (0 errors), then the app build and tests above.
4. Update `DATA_NOTES.md` with any conflict between the card and the cost table, and which value was used.
