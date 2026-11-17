# Backup and restore, the draft guide, the terrain map on a battle, the Battle-to-Dice button, whole-activation rolls and
# recording a roll on the Battle tab.
import json, re
from playwright.sync_api import sync_playwright
def run(p, label, ctxargs, tap=False):
    errs = []; out = {}
    b = p.chromium.launch(); pg = b.new_context(accept_downloads=True, **ctxargs).new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'", timeout=20000)
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    S = "__muster.S"
    go(pg.locator('[data-a="example"][data-v="Terran"]')); pg.wait_for_timeout(300)
    pg.fill("#f-name", "Backup test"); pg.wait_for_timeout(900)          # an edit saves the example as a roster
    # ---- draft guide on the Start a battle screen
    go(pg.locator('[data-a="tab"][data-v="battle"]')); pg.wait_for_timeout(300)
    go(pg.locator('[data-a="b-draft"]')); pg.wait_for_timeout(200)
    out["draft_selects"] = pg.locator('#draft [data-a="b-dr-sel"]').count()
    pg.select_option('#draft [data-a="b-dr-sel"][data-v="op:m:0"]', "frontlines"); pg.select_option('#draft [data-a="b-dr-sel"][data-v="op:m:1"]', "hold-position")
    go(pg.locator('[data-a="b-dr-win"][data-v="op"]')); go(pg.locator('[data-a="b-dr-col"][data-v="red"]')); go(pg.locator('[data-a="b-dr-ctl"][data-v="d"]')); pg.wait_for_timeout(150)
    out["apply_disabled_until_done"] = pg.locator('[data-a="b-dr-apply"]').is_disabled()
    # opponent controls Deployment, so you control the Mission draft: opponent removes 2, you pick
    out["mission_step_text"] = pg.locator(".dr-step").nth(3).locator(".faint").first.inner_text()
    for i in (0, 1): go(pg.locator('[data-a="b-dr-card"][data-v="m:%d"]' % i))
    go(pg.locator('[data-a="b-dr-card"][data-v="m:2"]'))
    for i in (2, 3): go(pg.locator('[data-a="b-dr-card"][data-v="d:%d"]' % i))
    go(pg.locator('[data-a="b-dr-card"][data-v="d:1"]')); pg.wait_for_timeout(150)
    my_dep = pg.locator('[data-a="b-dr-card"][data-v="d:1"] span').inner_text()
    go(pg.locator('[data-a="b-dr-apply"]')); pg.wait_for_timeout(300)
    out["draft_applied"] = [pg.locator('.tile[data-v="missionId:frontlines"]').get_attribute("aria-pressed"), pg.locator('[data-a="b-set"][data-v="color:blue"]').get_attribute("aria-pressed"),
                            pg.locator('.tile[data-v^="deploymentId:"][aria-pressed="true"] .t-name').inner_text().split("\n")[0].strip() == my_dep]
    # ---- terrain map chosen at setup, kept on the battle
    go(pg.locator('[data-a="b-troll"]')); pg.wait_for_timeout(200)
    picked = pg.locator('[data-a="b-set"][data-v^="terrain:"][aria-pressed="true"]').get_attribute("data-v")
    go(pg.locator('[data-a="b-start"]')); pg.wait_for_timeout(500)
    out["battle_terrain"] = [picked, pg.evaluate(S + ".cur.battle.terrain")]
    pg.evaluate("(function(){ var m=__muster, b=m.S.cur.battle; b.opp = Battle.oppFrom(m.C, {player:'Sam', units:[{unitId:'zealot', models:3, upgrades:[]}]}); var k=Object.keys(b.units); b.units[k[0]].st='fld'; b.units[k[5]].st='fld'; })()")
    go(pg.locator('[data-a="tab"][data-v="view"]')); go(pg.locator('[data-a="tab"][data-v="battle"]')); pg.wait_for_timeout(300)
    out["dice_buttons_on_battle"] = pg.locator('[data-a="b-dice"]').count()
    # ---- Battle -> Dice with that unit, record against the opponent's Zealots
    go(pg.locator('[data-a="b-dice"]').first); pg.wait_for_timeout(400)
    out["dice_opened_with"] = [pg.evaluate(S + ".tab"), pg.locator('[data-a="d-au"] option:checked').inner_text(), pg.locator('[data-a="d-tl"]').input_value()]
    for _ in range(8): go(pg.locator('[data-a="d-step"][data-v="crit:1"]'))
    kills = 0
    for _ in range(12):
        go(pg.locator('.d-act [data-a="d-roll"]')); pg.wait_for_timeout(120)
        kills = pg.evaluate("__muster && document.querySelector('.d-final b').textContent")
        if pg.locator('[data-a="d-rec"]').count() and not kills.startswith("0 "): break
    before = pg.evaluate("(function(){ var o=__muster.S.cur.battle.opp; return o.units[o.order[0]].m; })()")
    go(pg.locator('[data-a="d-rec"]')); pg.wait_for_timeout(300)
    after = pg.evaluate("(function(){ var b=__muster.S.cur.battle, o=b.opp, u=o.units[o.order[0]]; return [u.st==='dead'?0:u.m, b.kills.length, b.log[b.log.length-1].t]; })()")
    out["recorded_on_opponent"] = [kills, before, after[0], after[1] > 0]; out["log_line"] = after[2][:90]
    out["record_once"] = pg.locator('[data-a="d-rec"]').count() == 0 and "Recorded" in pg.locator("#d-roll").inner_text()
    # ---- whole activation: Jim Raynor carries a rifle and a SIDEARM revolver
    pg.select_option('[data-a="d-au"]', index=5); pg.wait_for_timeout(250)
    out["unit_with_sidearm"] = pg.locator('[data-a="d-au"] option:checked').inner_text()
    out["all_switch"] = pg.locator('[data-a="d-all"]').count()
    go(pg.locator('[data-a="d-all"]')); pg.wait_for_timeout(300)
    out["all_plan"] = pg.locator("#d-odds .d-steps li b").all_inner_texts()
    go(pg.locator('.d-act [data-a="d-roll"]')); pg.wait_for_timeout(300)
    out["all_roll_parts"] = pg.locator("#d-roll .d-steps li").count()
    pg.screenshot(path="extras_%s.png" % label, full_page=True)
    # ---- swap so the opponent attacks one of my units, record: models and Damage Marker follow the roll
    go(pg.locator('[data-a="d-all"]')); go(pg.locator('[data-a="d-swap"]')); pg.wait_for_timeout(300)
    pg.select_option('[data-a="d-tu"]', index=0); pg.wait_for_timeout(200)
    for _ in range(3):
        if pg.locator('[data-a="d-step"][data-v="crit:1"]').is_enabled(): go(pg.locator('[data-a="d-step"][data-v="crit:1"]'))
    go(pg.locator('.d-act [data-a="d-roll"]')); pg.wait_for_timeout(200)
    roll = pg.evaluate("(function(){ var r=document.querySelector('.d-final'); return r.textContent; })()")
    can = pg.locator('[data-a="d-rec"]').count()
    if can: go(pg.locator('[data-a="d-rec"]')); pg.wait_for_timeout(250)
    out["recorded_on_mine"] = [roll[:60], can, pg.evaluate("(function(){ var b=__muster.S.cur.battle, k=Object.keys(b.units)[0], u=b.units[k]; return [u.st, u.m, u.d]; })()")]
    # ---- backup everything (battle included), delete the roster, restore from the backup text
    go(pg.locator('[data-a="home"]').first); pg.wait_for_timeout(400)
    with pg.expect_download() as dl: go(pg.locator('[data-a="backup"]'))
    out["backup_file"] = bool(re.match(r"surgecraft-backup-\d{4}-\d\d-\d\d\.json$", dl.value.suggested_filename))
    text = open(dl.value.path()).read(); bk = json.loads(text); pg.wait_for_timeout(300)
    pg.evaluate("__muster.S.downloads=null"); go(pg.locator('[data-a="backup"]')); pg.wait_for_timeout(200)
    out["fallback_text_same_rosters"] = len(json.loads(pg.locator("#bk-text").input_value())["rosters"]) == len(bk["rosters"])
    out["backup"] = [bk["format"], len(bk["rosters"]), "battle" in bk["rosters"][0], len(bk["rosters"][0]["units"])]
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    go(pg.locator('[data-a="del"]').first); go(pg.locator('[data-a="del-yes"]')); pg.wait_for_timeout(400)
    out["rosters_after_delete"] = pg.evaluate(S + ".rosters.length")
    go(pg.locator('[data-a="toggle-import"]')); pg.fill("#imp-code", text); go(pg.locator('[data-a="import-code"]')); pg.wait_for_timeout(900)
    out["restored"] = pg.evaluate("(function(){ var r=__muster.S.rosters[0]; return r ? [r.name, r.units.length, !!r.battle, r.battle && r.battle.terrain, r.battle && r.battle.opp.order.length, Object.keys(r.battle.units).every(function(k){ return r.units.some(function(e){ return e.uid===k; }); })] : null; })()")
    out["restore_notice"] = pg.locator(".notice").first.inner_text().replace("\n", " ")[:110]
    go(pg.locator('[data-a="toggle-import"]')); pg.fill("#imp-code", text); go(pg.locator('[data-a="import-code"]')); pg.wait_for_timeout(500)
    out["second_restore_keeps"] = [pg.evaluate(S + ".rosters.length"), "1 left as they are" in pg.locator(".notice").first.inner_text()]
    out["overflow_x"] = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    out["pageerrors"] = errs; b.close()
    print("=====", label)
    for k, v in out.items(): print(k, ":", v)
with sync_playwright() as p:
    run(p, "desk", {"viewport": {"width": 1280, "height": 900}})
    run(p, "phone", dict(p.devices["Pixel 7"]), tap=True)
