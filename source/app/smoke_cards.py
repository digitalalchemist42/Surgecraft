# Card reference smoke test: header button opens it, every faction lists all its units and cards (counts checked against the
# dataset), filters and search work, opening a row shows the full printed card, keywords inside are tappable.
import json
from playwright.sync_api import sync_playwright
D = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
def run(p, label, ctxargs, tap=False):
    errs = []; out = {}
    b = p.chromium.launch(); pg = b.new_context(**ctxargs).new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.cur", timeout=20000); pg.wait_for_timeout(400)
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    go(pg.locator('.kwbtn[data-a="cards"]')); pg.wait_for_timeout(300)
    out["opened_with_race"] = pg.locator('#cref').get_attribute("data-skin")
    for race in ["Terran", "Protoss", "Zerg"]:
        go(pg.locator('[data-a="cr-race"][data-v="%s"]' % race)); pg.wait_for_timeout(200)
        names = pg.locator("#cr-list .v-name").all_inner_texts()
        exp_u = [u["name"] for u in D["units"] if u["race"] == race]; exp_c = [c["name"] for c in D["cards"] if c["race"] == race]
        out[race] = {"rows": len(names), "expected": len(exp_u) + len(exp_c), "missing": sorted(set(n.upper() for n in exp_u + exp_c) - set(n.upper() for n in names)),
                     "types": pg.locator('[data-a="cr-type"]').all_inner_texts(), "count": pg.locator("#cr-count").inner_text()}
    go(pg.locator('[data-a="cr-race"][data-v="Zerg"]')); go(pg.locator('[data-a="cr-type"][data-v="Creep"]')); pg.wait_for_timeout(150)
    out["zerg_creep_rows"] = pg.locator("#cr-list .vitem").count()
    go(pg.locator('[data-a="cr-race"][data-v="Terran"]')); pg.wait_for_timeout(150)
    out["creep_reset_on_terran"] = pg.locator('[data-a="cr-type"][aria-pressed="true"]').inner_text()
    go(pg.locator('[data-a="cr-type"][data-v="units"]')); pg.wait_for_timeout(150)
    out["terran_units_only"] = pg.locator("#cr-list .vitem").count()
    go(pg.locator('[data-a="cr-type"][data-v="all"]')); pg.wait_for_timeout(150)
    pg.fill("#cr-q", "marauder"); pg.wait_for_timeout(200)
    out["search_marauder"] = pg.locator("#cr-list .v-name").all_inner_texts()
    go(pg.locator('#cr-list .vrow').first); pg.wait_for_timeout(500)
    card = pg.locator("#cr-list .vitem.open .sc-card")
    txt = card.inner_text()
    u = [x for x in D["units"] if x["name"] == "Marauder"][0]
    out["card_has_all_upgrades"] = all(up["name"].upper() in txt.upper() for up in u["upgrades"])
    out["card_stats"] = pg.locator("#cr-list .vitem.open .sc-st b").all_inner_texts()
    out["data_stats"] = u["stats"]
    out["no_taken_marks"] = pg.locator("#cr-list .vitem.open .sc-taken").count() == 0
    out["kw_links"] = pg.locator("#cr-list .vitem.open button.kw").count()
    go(pg.locator("#cr-list .vitem.open button.kw").first); pg.wait_for_timeout(300)
    out["kw_pop"] = pg.locator("#kw-pop h3").inner_text() if pg.locator("#kw-pop").count() else None
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    out["still_open"] = pg.locator("#cref").count()
    pg.screenshot(path="cards_%s.png" % label)
    pg.fill("#cr-q", "zzzz"); pg.wait_for_timeout(150)
    out["empty_msg"] = pg.locator("#cr-list").inner_text()
    out["overflow_x"] = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    out["pageerrors"] = errs; b.close()
    print("=====", label)
    for k, v in out.items(): print(k, ":", v)
with sync_playwright() as p:
    run(p, "desk", {"viewport": {"width": 1280, "height": 900}})
    run(p, "phone", dict(p.devices["Pixel 7"]), tap=True)
