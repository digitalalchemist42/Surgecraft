# Roster QR code and link (share panel, printed roster sheet, opening a link) and the chess clock on the Battle tab.
import re, json
from playwright.sync_api import sync_playwright
def run(p, label, ctxargs, tap=False):
    errs = []; out = {}
    b = p.chromium.launch(); cx = b.new_context(accept_downloads=True, **ctxargs); pg = cx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'", timeout=20000)
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    S = "__muster.S"
    go(pg.locator('[data-a="example"][data-v="Terran"]')); pg.wait_for_timeout(300)
    pg.fill("#f-name", "QR test"); pg.wait_for_timeout(800)
    # ---- QR in the share panel
    go(pg.locator('[data-a="tab"][data-v="export"]')); pg.wait_for_timeout(300)
    go(pg.locator('[data-a="qr"]')); pg.wait_for_timeout(300)
    out["qr_svg"] = pg.locator(".qr-box svg").count()
    box = pg.locator(".qr-box").bounding_box(); out["qr_px"] = round(box["width"])
    cx.grant_permissions(["clipboard-read", "clipboard-write"])
    go(pg.locator('[data-a="copy-link"]')); pg.wait_for_timeout(250)
    link = pg.evaluate("navigator.clipboard.readText()")
    out["link"] = [link[:62], len(link)]
    pg.screenshot(path="qr_%s.png" % label)
    # decode the picture with a second reader to prove it holds the link
    pg.locator(".qr-box").screenshot(path="/tmp/qr_%s.png" % label)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    # ---- opening the link imports the roster once
    n0 = pg.evaluate(S + ".rosters.length")
    code = link.split("#r=")[1]
    pg.goto("http://localhost:8765/test.html#r=" + code); pg.reload(); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'"); pg.wait_for_timeout(900)
    out["opened_link"] = [pg.evaluate(S + ".rosters.length") - n0, pg.evaluate(S + ".cur && " + S + ".cur.name"), pg.evaluate(S + ".cur.units.length"), pg.evaluate("location.hash")]
    out["same_roster"] = pg.evaluate("(function(){ var m=__muster, a=m.S.rosters.filter(function(r){return r.name==='QR test';}); var x=function(r){ var e=m.C.exportable(r); e.notes=''; return JSON.stringify(e); }; return a.length===2 && x(a[0])===x(a[1]); })()")
    # ---- pasted into Import as a whole link
    go(pg.locator('[data-a="home"]').first); pg.wait_for_timeout(300)
    go(pg.locator('[data-a="toggle-import"]')); pg.fill("#imp-code", link); go(pg.locator('[data-a="import-code"]')); pg.wait_for_timeout(600)
    out["pasted_link_imports"] = pg.evaluate(S + ".rosters.length") - n0
    # ---- printed roster sheet carries the QR
    go(pg.locator('[data-a="tab"][data-v="export"]')); pg.wait_for_timeout(300)
    with pg.expect_download() as dl: go(pg.locator('[data-a="exp-save"][data-v="sheet"]'))
    doc = open(dl.value.path(), encoding="utf-8").read()
    out["sheet_has_qr"] = ['class="rs-qr"' in doc, "Scan to open in SurgeCraft" in doc, "<svg" in doc.split('class="rs-qr"')[1][:200] if 'class="rs-qr"' in doc else None]
    # ---- chess clock
    go(pg.locator('[data-a="tab"][data-v="battle"]')); pg.wait_for_timeout(300)
    go(pg.locator('[data-a="b-set"][data-v="clock:on"]')); pg.wait_for_timeout(150)
    pg.fill('[data-a="b-clockmin"]', "1"); pg.locator('[data-a="b-clockmin"]').blur()
    go(pg.locator('[data-a="b-start"]')); pg.wait_for_timeout(400)
    out["clock_start"] = [pg.locator('.clk b').all_inner_texts(), pg.locator("#clk-st").inner_text()]
    go(pg.locator('[data-a="b-clk"][data-v="me"]')); pg.wait_for_timeout(2300)
    out["me_running"] = [pg.locator('.clk b').all_inner_texts(), pg.locator("#clk-st").inner_text(), pg.locator('.clk[data-v="me"]').get_attribute("aria-pressed")]
    go(pg.locator('[data-a="b-clk"][data-v="opp"]')); pg.wait_for_timeout(1300)
    out["opp_running"] = [pg.locator('.clk b').all_inner_texts(), pg.locator('.clk[data-v="opp"]').get_attribute("aria-pressed")]
    # an action and its undo leave the clock alone
    pg.evaluate("(function(){ var b=__muster.S.cur.battle; b.clock.me = 50000; })()")
    go(pg.locator('[data-a="b-open"]').first); pg.wait_for_timeout(200)
    go(pg.locator('[data-a="b-act"]').first); pg.wait_for_timeout(200)
    go(pg.locator('.bdock [data-a="b-undo"]')); pg.wait_for_timeout(250)
    out["undo_keeps_clock"] = pg.evaluate("(function(){ var b=__muster.S.cur.battle; return [b.clock.me, b.clock.run]; })()")
    go(pg.locator('[data-a="b-clk"][data-v="opp"]')); pg.wait_for_timeout(200)
    out["paused"] = [pg.locator("#clk-st").inner_text(), pg.evaluate(S + ".cur.battle.clock.run")]
    # over the limit: negative and marked
    pg.evaluate("(function(){ var b=__muster.S.cur.battle; b.clock.me = 65000; })()")
    go(pg.locator('[data-a="b-clk"][data-v="me"]')); pg.wait_for_timeout(1200)
    out["over_limit"] = [pg.locator('.clk[data-v="me"] b').inner_text(), "over" in (pg.locator('.clk[data-v="me"]').get_attribute("class") or "")]
    out["dock_h"] = round(pg.locator(".bdock").bounding_box()["height"])
    pg.screenshot(path="clock_%s.png" % label)
    rep = pg.evaluate("(function(){ var m=__muster; return Render.exports.battleReportDoc ? Render.exports.battleReportDoc(m.C, Battle, m.S.cur, m.S.cur.battle, {}) : Render.exports.battleReport(m.C, Battle, m.S.cur, m.S.cur.battle, {}); })()")
    mm = re.search(r"<span>Clock</span><b>([^<]+)</b>", rep); out["report_clock"] = mm.group(1) if mm else None
    # reload: the clock is saved and keeps running
    pg.reload(); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'"); pg.wait_for_timeout(500)
    out["saved_clock"] = pg.evaluate("(function(){ var r=__muster.S.rosters.filter(function(r){ return r.battle; })[0]; return r ? [r.battle.clock.run, r.battle.clock.limit] : null; })()")
    out["overflow_x"] = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    out["pageerrors"] = errs; b.close()
    print("=====", label)
    for k, v in out.items(): print(k, ":", v)
with sync_playwright() as p:
    run(p, "desk", {"viewport": {"width": 1280, "height": 900}})
    run(p, "phone", dict(p.devices["Pixel 7"]), tap=True)
