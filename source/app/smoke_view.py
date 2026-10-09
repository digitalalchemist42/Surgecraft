from playwright.sync_api import sync_playwright
def run(p, label, ctxargs, tap=False):
    out = {}; errs = []
    b = p.chromium.launch(); pg = b.new_context(**ctxargs).new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.cur", timeout=20000); pg.wait_for_timeout(400)
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    # give the first Marine unit specialists so the fielded card has something to merge
    pg.evaluate("(()=>{const e=__muster.S.cur.units[0]; e.upgrades=['AGG-12','Rocket Launcher','Bayonet','Combat Shield']; e.specialists={'AGG-12':2,'Rocket Launcher':5}; __muster.S.cur.missions=['frontlines','hold-position']; __muster.S.cur.deployments=['gauntlet','typhoon'];})()")
    go(pg.locator('[data-a="tab"][data-v="view"]')); pg.wait_for_timeout(300)
    out["rows"] = pg.locator(".vrow").count()
    out["first_unit_meta"] = pg.locator('.vrow[data-v^="u:"]').first.inner_text().replace("\n"," | ")
    out["isExample_still"] = pg.evaluate("!!__muster.S.cur.isExample")
    pg.screenshot(path="view_%s_closed.png" % label)
    go(pg.locator('.vrow[data-v^="u:"]').first); pg.wait_for_timeout(300)
    card = pg.locator(".vitem.open .sc-card")
    out["card_open"] = card.count()
    txt = card.inner_text()
    out["no_upgrades_band"] = "UPGRADES" not in txt.replace("upgrades)","")
    out["has_bayonet_not_strike_row"] = ["BAYONET" in txt, pg.locator(".vitem.open .sc-wn").all_inner_texts()]
    out["no_untaken"] = "SLUGTHROWER" not in txt and "GRENADES" not in txt
    out["kw_links"] = pg.locator(".vitem.open button.kw").count()
    go(pg.locator(".vitem.open button.kw").first); pg.wait_for_timeout(300)
    out["kw_pop"] = pg.locator("#kw-pop h3").inner_text() if pg.locator("#kw-pop").count() else None
    out["still_open_after_kw"] = pg.locator(".vitem.open").count()
    pg.screenshot(path="view_%s_unit.png" % label)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    go(pg.locator('[data-a="v-all"]')); pg.wait_for_timeout(500)
    out["open_all"] = [pg.locator(".vitem.open").count(), pg.locator(".vitem").count(), pg.locator('[data-a="v-all"]').inner_text()]
    out["mission_and_map"] = [pg.locator(".v-body .sc-mission").count(), pg.locator(".v-body .sc-deploy").count()]
    for y in range(0, 30000, 900): pg.evaluate("window.scrollTo(0,%d)" % y); pg.wait_for_timeout(40)
    pg.wait_for_timeout(500)
    out["images"] = pg.evaluate("Array.from(document.querySelectorAll('#view img')).filter(i=>i.complete&&i.naturalWidth>0).length+'/'+document.querySelectorAll('#view img').length")
    go(pg.locator('[data-a="v-all"]')); pg.wait_for_timeout(300)
    out["close_all"] = pg.locator(".vitem.open").count()
    out["pageerrors"] = errs; b.close()
    print("=====", label)
    for k,v in out.items(): print(k, ":", v)
with sync_playwright() as p:
    run(p, "desk", {"viewport":{"width":1280,"height":900}})
    run(p, "phone", dict(p.devices["Pixel 7"]), tap=True)
