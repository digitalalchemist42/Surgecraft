# Terrain setup smoke test: the header button opens it; Standard shows 6 maps and Skirmish 3, each with its image loaded and
# its printed piece list; the roll picks a map in range; the terrain key image loads; nothing overflows on a phone.
import json
from playwright.sync_api import sync_playwright
D = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
def run(p, label, ctxargs, tap=False):
    errs = []; out = {}
    b = p.chromium.launch(); pg = b.new_context(**ctxargs).new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.store!=='loading'", timeout=20000)
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    go(pg.locator('.kwbtn[data-a="terrain"]')); pg.wait_for_timeout(300)
    out["opened"] = pg.locator("#tref h2").inner_text()
    out["default_scale"] = pg.locator('[data-a="tr-scale"][aria-pressed="true"]').get_attribute("data-v")
    out["steps_open_at_start"] = pg.evaluate("document.querySelector('#tref .tr-steps').open")
    if not out["steps_open_at_start"]: go(pg.locator("#tref .tr-steps summary"))
    out["steps"] = pg.locator("#tref ol li").count()
    bad = []
    for scale, n in (("standard", 6), ("skirmish", 3)):
        go(pg.locator('[data-a="tr-scale"][data-v="%s"]' % scale)); pg.wait_for_timeout(150)
        out[scale + "_maps"] = pg.locator('[data-a="tr-map"]').count()
        for k in range(1, n + 1):
            go(pg.locator('[data-a="tr-map"][data-v="%d"]' % k))
            pg.wait_for_function("(function(){var i=document.getElementById('tr-img');return i&&i.complete&&i.naturalWidth>0;})()", timeout=10000)
            m = [x for x in D["terrain"]["maps"] if x["id"] == "%s-%d" % (scale, k)][0]
            chips = pg.locator(".tr-req .chip").all_inner_texts()
            exp = ["%d × %s" % (a, b) for a, b in m["requires"]]
            ratio = pg.evaluate("(function(){var i=document.getElementById('tr-img');return i.naturalWidth/i.naturalHeight;})()")
            cap = pg.locator(".tr-fig figcaption").inner_text()
            if [c.upper() for c in chips] != [e.upper() for e in exp] or ("p. %d" % m["page"]) not in cap or abs(ratio - (2/3 if scale == "standard" else 1)) > 0.02: bad.append((scale, k, chips, cap, ratio))
        rolls = set()
        for _ in range(25):
            go(pg.locator('[data-a="tr-roll"]')); rolls.add(int(pg.locator('[data-a="tr-map"][aria-pressed="true"]').get_attribute("data-v")))
        out[scale + "_rolls"] = sorted(rolls); out[scale + "_roll_text"] = pg.locator("#tr-roll").inner_text()
        if scale == "standard": pg.screenshot(path="terrain_%s.png" % label)
    out["mismatches"] = bad
    go(pg.locator(".tr-key summary")); pg.wait_for_function("(function(){var i=document.querySelector('.tr-key img');return i&&i.complete&&i.naturalWidth>0;})()", timeout=10000)
    out["key_loaded"] = True
    go(pg.locator('[data-a="tr-map"][data-v="1"]')); pg.wait_for_timeout(100)
    out["open_sections_kept_after_redraw"] = pg.evaluate("[document.querySelector('#tref .tr-steps').open, document.querySelector('#tref .tr-key').open]")
    out["overflow_x"] = pg.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    out["header_buttons_visible"] = pg.evaluate("Array.from(document.querySelectorAll('.appbar .kwbtn')).length")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150); out["closed"] = pg.locator("#tref").count() == 0
    pg.screenshot(path="terrain_hdr_%s.png" % label)
    out["hdr_overflow"] = pg.evaluate("(function(){var a=document.querySelector('.appbar .wrap');return a.scrollWidth>a.clientWidth+1;})()")
    out["pageerrors"] = errs; b.close()
    print("=====", label)
    for k, v in out.items(): print(k, ":", v)
with sync_playwright() as p:
    run(p, "desk", {"viewport": {"width": 1280, "height": 900}})
    run(p, "phone", dict(p.devices["Pixel 7"]), tap=True)
