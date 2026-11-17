# Dice tab smoke test: opens on a roster, lists its units and weapons from the printed cards, shows odds, rolls,
# status switches change the numbers, an opponent list from a battle is offered as the target, nothing overflows on a phone.
import json, re
from playwright.sync_api import sync_playwright
D = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
def run(p, label, ctxargs, tap=False):
    errs = []; out = {}
    b = p.chromium.launch(); pg = b.new_context(**ctxargs).new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'", timeout=20000)
    pg.click('[data-a="example"][data-v="Terran"]'); pg.wait_for_function("__muster.S.cur", timeout=20000); pg.wait_for_timeout(300)
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    go(pg.locator('[data-a="tab"][data-v="dice"]')); pg.wait_for_timeout(400)
    out["attacker_lists"] = pg.locator('[data-a="d-al"] option').all_inner_texts()
    out["units"] = pg.locator('[data-a="d-au"] option').count()
    out["roster_units"] = pg.evaluate("__muster.S.cur.units.length")
    out["default_target_list"] = pg.locator('[data-a="d-tl"]').input_value()
    # Marine with its printed weapons
    pg.select_option('[data-a="d-au"]', index=0); pg.wait_for_timeout(200)
    out["first_unit"] = pg.locator('[data-a="d-au"] option:checked').inner_text()
    out["weapons"] = pg.locator('[data-a="d-aw"] option').all_inner_texts()
    out["profile"] = pg.locator(".d-prof").first.inner_text()
    pg.select_option('[data-a="d-tl"]', "any:Zerg"); pg.wait_for_timeout(200)
    pg.select_option('[data-a="d-tu"]', "zergling"); pg.wait_for_timeout(300)
    out["target_profile"] = pg.locator(".d-prof").nth(1).inner_text()
    z = [u for u in D["units"] if u["id"] == "zergling"][0]["stats"]
    out["target_matches_card"] = all(str(z[k]) in out["target_profile"] for k in ("armour", "evade", "hp"))
    out["odds_line"] = pg.locator(".d-line").inner_text()
    hits0 = float(pg.locator(".d-stats b").first.inner_text())
    go(pg.locator('[data-a="d-step"][data-v="precision:1"]')); go(pg.locator('[data-a="d-step"][data-v="precision:1"]')); pg.wait_for_timeout(200)
    out["hits_before_after_precision2"] = [hits0, float(pg.locator(".d-stats b").first.inner_text())]
    out["evade_before"] = "no Evade Roll" in pg.locator(".d-line").inner_text()
    go(pg.locator('[data-a="d-chk"][data-v="evEng"]')); pg.wait_for_timeout(200)
    out["evade_after_engaged"] = re.search(r"Evade \d\+", pg.locator(".d-line").inner_text()) is not None
    go(pg.locator('#d-roll [data-a="d-roll"]')); pg.wait_for_timeout(300)
    out["roll_steps"] = pg.locator(".d-steps li").count()
    out["attack_dice_shown"] = pg.locator(".d-steps li").first.locator(".die").count()
    out["final"] = pg.locator(".d-final").inner_text().replace("\n", " | ")
    pg.screenshot(path="dice_%s.png" % label, full_page=True)
    # swap: the Zergling attacks back with a Close Combat weapon; ranged-only switches go away
    go(pg.locator('[data-a="d-swap"]')); pg.wait_for_timeout(300)
    out["after_swap_attacker"] = pg.locator('[data-a="d-au"] option:checked').inner_text()
    out["swap_weapons"] = pg.locator('[data-a="d-aw"] option').all_inner_texts()
    out["engaged_switch_hidden_for_melee"] = pg.locator('[data-a="d-chk"][data-v="evEng"]').count() == 0
    # opponent's list from a battle becomes the default target list
    pg.evaluate("""(function(){ var r=__muster.S.cur; r.battle = {units:{}, opp:{player:"Sam", order:["o1","o2"], units:{o1:{uid:"o1",unitId:"zealot",m:2,st:"fld",upgrades:["Leg Enhancements"]}, o2:{uid:"o2",unitId:"stalker",m:1,st:"dead",upgrades:[]}}}}; })()""")
    go(pg.locator('[data-a="tab"][data-v="view"]')); pg.wait_for_timeout(200); go(pg.locator('[data-a="tab"][data-v="dice"]')); pg.wait_for_timeout(300)
    out["lists_with_opponent"] = pg.locator('[data-a="d-tl"] option').all_inner_texts()[:2]
    pg.select_option('[data-a="d-tl"]', "opp"); pg.wait_for_timeout(200)
    out["opponent_units"] = pg.locator('[data-a="d-tu"] option').all_inner_texts()
    out["opponent_live_models"] = pg.locator("#d-v-tModels").inner_text()
    go(pg.locator('[data-a="d-clear"]')); pg.wait_for_timeout(200)
    # every block folds; a folded status group shows how many settings it holds; the choice survives a redraw and a reload
    out["blocks"] = pg.locator("#dice details[data-k]").evaluate_all("els => els.map(e => e.getAttribute('data-k') + (e.open ? '' : ' (closed)'))")
    go(pg.locator('[data-a="d-step"][data-v="tough:1"]')); pg.wait_for_timeout(150)
    go(pg.locator('#dice details[data-k="def"] > summary')); go(pg.locator('#dice details[data-k="odds"] > summary')); pg.wait_for_timeout(150)
    go(pg.locator('[data-a="d-swap"]')); pg.wait_for_timeout(250)
    out["closed_after_redraw"] = pg.locator("#dice details[data-k]").evaluate_all("els => els.filter(e => !e.open).map(e => e.getAttribute('data-k'))")
    out["folded_group_label"] = pg.locator('#dice details[data-k="def"] > summary').inner_text().replace("\n", " ")
    go(pg.locator('#dice details[data-k="roll"] > summary')); go(pg.locator('.d-act [data-a="d-roll"]')); pg.wait_for_timeout(250)
    out["roll_reopens_on_roll"] = pg.evaluate("document.querySelector('#dice details[data-k=roll]').open")
    out["saved_pref"] = pg.evaluate("JSON.parse(localStorage.getItem('surgecraft.prefs.v1')).dc")
    out["overflow_x"] = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    out["pageerrors"] = errs; b.close()
    print("=====", label)
    for k, v in out.items(): print(k, ":", v)
with sync_playwright() as p:
    run(p, "desk", {"viewport": {"width": 1280, "height": 900}})
    run(p, "phone", dict(p.devices["Pixel 7"]), tap=True)
