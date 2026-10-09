from playwright.sync_api import sync_playwright
import re
URL = "http://localhost:8767/"
NO_NET = re.compile(r"^https?://(?!localhost).*")
out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1200, "height": 850}, accept_downloads=True)
    ctx.route(NO_NET, lambda r: r.abort())   # no internet except our host
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.evaluate("navigator.serviceWorker.ready.then(()=>1)"); pg.wait_for_timeout(2500)
    cdp = ctx.new_cdp_session(pg)
    out["installability_errors"] = cdp.send("Page.getInstallabilityErrors")["installabilityErrors"]
    out["manifest_errors"] = cdp.send("Page.getAppManifest").get("errors")
    if not pg.evaluate("!!navigator.serviceWorker.controller"):
        pg.reload(); pg.wait_for_timeout(1500)
    out["sw_controlling"] = pg.evaluate("!!navigator.serviceWorker.controller")
    out["cached_entries"] = pg.evaluate("caches.keys().then(ks=>Promise.all(ks.map(k=>caches.open(k).then(c=>c.keys()).then(r=>k+':'+r.length))))")
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(1500)
    out["offline_title"] = pg.title()
    if pg.locator('[data-a="home"]').count():
        pg.click('[data-a="home"]')
    pg.click('[data-a="example"][data-v="Protoss"]'); pg.wait_for_timeout(300)
    pg.click('[data-a="layout"][data-v="tiles"]'); pg.wait_for_timeout(300)
    for y in range(0, 5000, 500):
        pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(80)
    pg.wait_for_timeout(500)
    out["offline_images"] = pg.evaluate("Array.from(document.images).filter(i=>i.complete&&i.naturalWidth>0).length+'/'+document.images.length")
    pg.fill('#f-player', 'Offline'); pg.wait_for_timeout(900)
    pg.click('[data-a="tab"][data-v="export"]')
    with pg.expect_download() as d:
        pg.click('[data-a="exp-save"][data-v="manual"]')
    data = open(d.value.path(), "rb").read()
    out["offline_manual"] = f"{d.value.suggested_filename} {len(data)//1024}KB imgs={data.count(b'data:image/webp')}"
    pg.evaluate("window.scrollTo(0,0)"); pg.screenshot(path="pwa_offline.png")
    # update flow: a new version is uploaded while the app is open
    ctx.set_offline(False)
    sw = open("/tmp/pwa-site/sw.js").read()
    open("/tmp/pwa-site/sw.js", "w").write(sw.replace('var VERSION = "', 'var VERSION = "next-'))
    pg.click('[data-a="home"]'); pg.wait_for_timeout(200)
    pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())"); pg.wait_for_timeout(3500)
    out["update_notice"] = pg.locator(".notice").all_inner_texts()
    out["rosters_after_update"] = pg.locator(".rcard").count()
    out["errors"] = errs
    ip = b.new_context(**p.devices["iPhone 13"]); ip.route(NO_NET, lambda r: r.abort())
    m = ip.new_page(); m.goto(URL); m.wait_for_timeout(1500)
    if m.locator('[data-a="home"]').count():
        m.click('[data-a="home"]'); m.wait_for_timeout(300)
    out["iphone_hint"] = [t for t in m.locator(".notice").all_inner_texts() if "Home Screen" in t]
    m.screenshot(path="pwa_iphone.png")
    b.close()
for k, v in out.items():
    print(k, ":", v)
