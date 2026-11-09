"""Shield counter on the battle tracker's Damage stepper (Part 5.1.6): Protoss example army,
Damage drains the Shield first, then the HP, shown as what is left. Runs on desktop and Pixel 7."""
from playwright.sync_api import sync_playwright

def run(p, label, ctxargs, tap=False):
    out = {}; errs = []
    b = p.chromium.launch(); ctx = b.new_context(**ctxargs); pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'", timeout=20000)
    pg.click('[data-a="example"][data-v="Protoss"]'); pg.wait_for_function("__muster.S.cur", timeout=20000); pg.wait_for_timeout(500)
    go = (lambda sel, n=0: pg.locator(sel).nth(n).tap()) if tap else (lambda sel, n=0: pg.locator(sel).nth(n).click())
    go('[data-a="tab"][data-v="battle"]'); pg.wait_for_timeout(300)
    go('[data-a="b-start"]'); pg.wait_for_timeout(400)
    for k in range(2):
        go('.bunit.res [data-a="b-act"][data-v="deploy"]'); pg.wait_for_timeout(200)
    go('[data-a="b-end"]'); pg.wait_for_timeout(200); go('[data-a="b-pass"][data-v="opp"]'); pg.wait_for_timeout(300)  # to the Assault Phase: deployed Units are no longer in Done
    U = '.bunit.fld'
    num = lambda: pg.locator(U + ' .bstep .num').first.inner_text().replace("\n", " ")
    first = pg.evaluate("(()=>{const r=__muster.S.cur,b=r.battle;const uid=Object.keys(b.units).filter(k=>b.units[k].st==='fld')[0];const e=r.units.filter(x=>x.uid===uid)[0];const u=__muster.C.units[e.unitId];return [u.name,u.stats.shield,u.stats.hp]})()")
    out["first_unit"] = first
    out["readout_0"] = num()
    sh, hp = first[1], first[2]
    out["readout_expected_0"] = "Shield %d/%d · HP %d/%d" % (sh, sh, hp, hp)
    for k in range(sh - 1): go(U + ' [data-a="b-d"][data-v="1"]'); pg.wait_for_timeout(100)
    out["readout_shield_1_left"] = num()
    pg.locator(U).first.screenshot(path="sh_%s_shielded.png" % label)
    go(U + ' [data-a="b-d"][data-v="1"]'); go(U + ' [data-a="b-d"][data-v="1"]'); pg.wait_for_timeout(150)
    out["readout_into_hp"] = num()
    out["shield_struck"] = pg.locator(U + ' .bd-sh.out').count() > 0
    out["summary"] = pg.locator(U + ' .bu-sum').first.inner_text()
    # stepper row must not overflow its card
    out["overflow_px"] = pg.evaluate("(()=>{const a=document.querySelector('.bunit.fld');const s=a.querySelector('.bstep');return Math.round(s.getBoundingClientRect().right-a.getBoundingClientRect().right)})()")
    pg.screenshot(path="sh_%s_compact.png" % label, full_page=False, clip=None)
    go(U + ' [data-a="b-open"]'); pg.wait_for_timeout(200)
    out["open_readout"] = pg.locator('.bunit.fld.open .bstep .num').nth(1).inner_text().replace("\n", " ")
    pg.locator('.bunit.fld.open').first.screenshot(path="sh_%s_open.png" % label)
    out["pageerrors"] = errs
    b.close(); return out

with sync_playwright() as p:
    for label, args, tap in [("desktop", dict(viewport={"width": 1280, "height": 900}), False),
                             ("pixel7", dict(**p.devices["Pixel 7"]), True)]:
        print("==", label)
        for k, v in run(p, label, args, tap).items(): print(k, ":", v)
