# StarCraft Muster — v2 archive (26 Sep 2026)

The roster builder as published as **Version 2**, before it was renamed SurgeCraft. Kept for reference only; nothing here is used by the current build.

Archived here on 16 Nov 2026 from the "StarCraft Muster v2 Backup" artifact (https://claude.ai/artifact/GoTEirh53naq8y6Axga1xG), when the copies in the Claude project were retired. The source files were recovered by splitting that published page back into its parts; rebuilding them reproduces the page.

## Contents
- `src/` — `roster-core.js` (army-building rules), `render.js` (card rendering and all export formats), `app.js` (UI), `page.template.html` (styles and markup), `build_page.py`.
- `data/starcraft_tmg_data.json` — the card dataset v2 was built with (31 units, 42 cards; unit cards v1.03.26 to v1.06.26, September 2026 costs). Superseded by `source/sc_data/`.
- `dist/index.html` — the built page.

Not included: the 103 art files (the current site's `img/` folder holds the same art and more), the Python sources of the v2 dataset, and the v2 tests.

## Rebuild
```
python3 src/build_page.py        # writes dist/index.html (needs node)
```
Opened outside claude.ai, account storage and Save-to-disk are not available: rosters save in the browser and export offers Copy/Preview.
