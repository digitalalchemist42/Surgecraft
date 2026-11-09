"""Paying an ability's cost from the battle tracker (10.5.1): Use opens a card picker, the Exhausted card is
linked to the use on the unit, in the battle log and in the battle report. Protoss example, desktop and Pixel 7."""
from playwright.sync_api import sync_playwright

def run(p, label, ctxargs, tap=False):
    out = {}; errs = []
    b = p.chromium.launch(); ctx = b.new_context(**ctxargs); pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'", timeout=20000)
    pg.click('[data-a="example"][data-v="Protoss"]'); pg.wait_for_function("__muster.S.cur", timeout=20000); pg.wait_for_timeout(500)
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    L = pg.locator
    go(L('[data-a="tab"][data-v="battle"]')); pg.wait_for_timeout(300)
    go(L('[data-a="b-start"]')); pg.wait_for_timeout(400)
    sentry = L('.bunit.res', has_text="Sentry").first
    go(sentry.locator('[data-a="b-act"][data-v="deploy"]')); pg.wait_for_timeout(200)
    go(L('[data-a="b-end"]')); pg.wait_for_timeout(200); go(L('[data-a="b-pass"][data-v="opp"]')); pg.wait_for_timeout(300)
    u = L('.bunit.fld', has_text="Sentry").first
    go(u.locator('[data-a="b-open"]')); pg.wait_for_timeout(200)
    u = L('.bunit.fld.open', has_text="Sentry").first
    go(u.locator('[data-a="b-ab"]')); pg.wait_for_timeout(200)
    go(u.locator('[data-a="b-use"][data-v="Restoration"]')); pg.wait_for_timeout(300)
    sheet = L("#modal-root .ksheet")
    out["picker_open"] = sheet.count() == 1
    out["picker_title"] = sheet.locator("h2").inner_text()
    out["picker_rows"] = [x.replace("\n", " ") for x in sheet.locator(".pay-row").all_inner_texts()]
    out["preselected"] = sheet.locator('.pay-row[aria-pressed="true"]').all_inner_texts()
    out["sum"] = sheet.locator(".pay-sum").inner_text()
    sheet.screenshot(path="pay_%s_picker.png" % label)
    # pick Gateway instead of the preselected card
    go(sheet.locator('.pay-row[aria-pressed="true"]').first); pg.wait_for_timeout(150)
    go(L('#modal-root [data-a="b-paypick"][data-v="t:gateway:0"]')); pg.wait_for_timeout(150)
    out["sum_after_pick"] = L("#modal-root .pay-sum").inner_text()
    go(L('#modal-root .ks-f [data-a="b-payok"]:not([data-v])')); pg.wait_for_timeout(300)
    out["modal_closed"] = L("#modal-root .ksheet").count() == 0
    u = L('.bunit.fld.open', has_text="Sentry").first
    out["unit_label"] = u.locator(".ab", has_text="Restoration").locator(".pill").inner_text()
    out["gateway_exhausted"] = pg.evaluate("!!__muster.S.cur.battle.cards['t:gateway:0']")
    out["log_last"] = pg.evaluate("__muster.S.cur.battle.log.slice(-1)[0].t")
    out["warnings"] = L(".bdock .check").all_inner_texts()
    u.screenshot(path="pay_%s_unit.png" % label)
    # Undo on the unit Refreshes the card
    go(u.locator('[data-a="b-unuse"][data-v="Restoration"]')); pg.wait_for_timeout(200)
    out["after_unuse_gateway_exhausted"] = pg.evaluate("!!__muster.S.cur.battle.cards['t:gateway:0']")
    # Cancel leaves everything as it was
    u = L('.bunit.fld.open', has_text="Sentry").first
    go(u.locator('[data-a="b-use"][data-v="Restoration"]')); pg.wait_for_timeout(200)
    go(L('#modal-root .ks-f [data-a="close-modal"]')); pg.wait_for_timeout(200)
    out["cancel_no_use"] = pg.evaluate("(__muster.S.cur.battle.uses||[]).length")
    # report text
    go(u.locator('[data-a="b-use"][data-v="Restoration"]')); pg.wait_for_timeout(200)
    go(L('#modal-root .ks-f [data-a="b-payok"]:not([data-v])')); pg.wait_for_timeout(300)
    rep = pg.evaluate("(()=>{const r=__muster.S.cur;return Render.exports.battleReport(__muster.C, window.Battle, r, r.battle, {})})()")
    import re
    out["report_cards_used"] = re.findall(r"Cards used</h2>.*?</table>", rep, re.S)[0][:400] if "Cards used" in rep else None
    out["report_has_paid_use"] = "Restoration (" in rep
    out["pageerrors"] = errs
    b.close(); return out

with sync_playwright() as p:
    for label, args, tap in [("desktop", dict(viewport={"width": 1280, "height": 900}), False),
                             ("pixel7", dict(**p.devices["Pixel 7"]), True)]:
        print("==", label)
        for k, v in run(p, label, args, tap).items(): print(k, ":", v)
