from playwright.sync_api import sync_playwright
import json
out = {}; errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.cur", timeout=20000); pg.wait_for_timeout(600)
    out["race"] = pg.evaluate("__muster.S.cur.race")
    # tapping a keyword inside an upgrade description must not toggle the upgrade checkbox
    out["kw_buttons_build"] = pg.evaluate("document.querySelectorAll('#app button.kw').length")
    out["kw_in_udesc"] = pg.evaluate("document.querySelectorAll('.u-desc button.kw').length")
    first = pg.locator(".u-desc button.kw").first
    lab = first.evaluate("b=>{const l=b.closest('label.u');return l?l.querySelector('input').checked:null}")
    first.click(); pg.wait_for_timeout(300)
    out["pop_open"] = pg.evaluate("!!document.getElementById('kw-pop')")
    out["pop_title"] = pg.evaluate("document.querySelector('#kw-pop h3').textContent")
    out["checkbox_unchanged"] = lab == first.evaluate("b=>{const l=b.closest('label.u');return l?l.querySelector('input').checked:null}")
    pg.screenshot(path="kw_pop_desktop.png")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    out["pop_closed_esc"] = pg.evaluate("!document.getElementById('kw-pop')")
    # card modal: weapon keyword cells and ability text
    pg.locator('[data-a="card"]').first.click(); pg.wait_for_timeout(500)
    out["modal_kw"] = pg.evaluate("Array.from(document.querySelectorAll('.modal button.kw')).map(b=>b.textContent)")
    out["modal_skip_names"] = pg.evaluate("document.querySelectorAll('.modal .sc-abn button.kw, .modal .sc-wn button.kw, .modal h3 button.kw').length")
    pg.locator(".modal button.kw").first.click(); pg.wait_for_timeout(300)
    out["pop_over_modal"] = pg.evaluate("document.querySelector('#kw-pop h3').textContent")
    pg.screenshot(path="kw_pop_modal.png")
    pg.click('#kw-pop [data-a="kw-all"]'); pg.wait_for_timeout(500)
    out["ref_items"] = pg.evaluate("document.querySelectorAll('.kr-item').length")
    out["ref_open"] = pg.evaluate("Array.from(document.querySelectorAll('.kr-item[open] summary')).map(s=>s.textContent)")
    pg.fill("#kw-q", "armour pool"); pg.wait_for_timeout(200)
    out["search_armour_pool"] = pg.evaluate("document.getElementById('kw-count').textContent+' | '+Array.from(document.querySelectorAll('.kr-item:not([hidden]) summary')).map(s=>s.textContent).join(', ')")
    pg.fill("#kw-q", "burrow"); pg.wait_for_timeout(200)
    out["search_burrow_open"] = pg.evaluate("Array.from(document.querySelectorAll('.kr-item[open] summary')).map(s=>s.textContent)")
    out["crosslinks_in_burrowed"] = pg.evaluate("Array.from(document.querySelectorAll('#kr-burrowed .kw-body button.kw')).map(b=>b.textContent)")
    pg.screenshot(path="kw_ref_desktop.png")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    # top bar button from roster list
    pg.click('[data-a="home"] >> nth=0'); pg.wait_for_timeout(300)
    pg.click('.kwbtn'); pg.wait_for_timeout(300)
    out["ref_from_topbar"] = pg.evaluate("document.querySelectorAll('.kr-item').length")
    pg.keyboard.press("Escape")
    # dark mode + zerg
    pg.click('[data-a="mode"][data-v="dark"]'); pg.click('[data-a="example"][data-v="Zerg"]'); pg.wait_for_timeout(600)
    pg.click('[data-a="tab"][data-v="cards"]') if pg.locator('[data-a="tab"][data-v="cards"]').count() else None
    pg.wait_for_timeout(400)
    out["zerg_tab_kw"] = pg.evaluate("document.querySelectorAll('#app button.kw').length")
    # exports stay plain
    man = pg.evaluate("__muster.build(__muster.FORMATS[0]).then(h=>(h.match(/class=\"kw\"/g)||[]).length)")
    out["kw_in_export"] = man
    # every keyword term appears linked somewhere across all unit cards
    ids = pg.evaluate("""(()=>{const C=__muster.C, seen=new Set(); const d=document.createElement('div'); document.body.appendChild(d);
      Object.values(C.units).forEach(u=>{ d.innerHTML=Render.unitCardHTML(C,u,null); });
      return 1;})()""")
    pg.wait_for_timeout(300)
    b.close()
for k, v in out.items(): print(k, ":", v)
print("errors:", errs)
