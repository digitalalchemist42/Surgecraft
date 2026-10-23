# Print / PDF smoke test. window.print is stubbed, then Chromium's print pipeline (page.pdf, print media, the page's @page rule)
# renders exactly what the dialog would print. Checks: Letter page size, the app itself hidden, card content present, and the
# print layer removed after afterprint.
import sys, subprocess
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/app"

def pdf_info(path):
    from pypdf import PdfReader
    r = PdfReader(path)
    sizes = sorted({(round(float(p.mediabox.width)), round(float(p.mediabox.height))) for p in r.pages})
    text = "\n".join(p.extract_text() or "" for p in r.pages)
    return len(r.pages), sizes, text

def run(p, label, ctxargs, tap=False):
    errs = []; res = {}
    b = p.chromium.launch(); pg = b.new_context(**ctxargs).new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.cur", timeout=20000); pg.wait_for_timeout(400)
    pg.evaluate("window.__printed=0; window.print=function(){ window.__printed++; }")
    go = (lambda loc: loc.tap()) if tap else (lambda loc: loc.click())
    go(pg.locator('[data-a="tab"][data-v="export"]')); pg.wait_for_timeout(300)
    res["buttons"] = pg.locator('[data-a="exp-print"]').all_inner_texts()
    for fid in ["manual", "sheet", "ref"]:
        n0 = pg.evaluate("window.__printed")
        go(pg.locator('[data-a="exp-print"][data-v="%s"]' % fid))
        pg.wait_for_function("window.__printed > %d" % n0, timeout=30000)
        layer = pg.evaluate("(()=>{const l=document.getElementById('print-layer'); return l ? [l.shadowRoot.querySelectorAll('.sc-card,.rf-u,.rs-t').length, document.getElementById('print-layer-css').textContent.match(/@page\\{[^}]*\\}/)[0]] : null })()")
        path = "%s/print_%s_%s.pdf" % (OUT, label, fid)
        pg.pdf(path=path, prefer_css_page_size=True, print_background=True)
        n, sizes, text = pdf_info(path)
        res[fid] = {"layer": layer, "pages": n, "sizes_pt": sizes,
                    "app_ui_absent": "Save to disk" not in text and "Print / PDF" not in text,
                    "first_line": text.strip().split("\n")[0][:70]}
        pg.evaluate("window.dispatchEvent(new Event('afterprint'))"); pg.wait_for_timeout(100)
        res[fid]["cleared"] = pg.evaluate("!document.getElementById('print-layer') && !document.getElementById('print-layer-css')")
        res[fid]["btn_after"] = pg.locator('[data-a="exp-print"][data-v="%s"]' % fid).inner_text()
    res["pageerrors"] = errs; b.close()
    print("=====", label)
    for k, v in res.items(): print(k, ":", v)

def hosted_check(p):
    # inside claude.ai the frame ignores window.print(), so the button must not appear there
    b = p.chromium.launch(); pg = b.new_page()
    pg.add_init_script("window.claude={use:function(){return Promise.reject(new Error('no'))}}")
    pg.goto("http://localhost:8765/test.html"); pg.wait_for_function("window.__muster && __muster.S.cur", timeout=20000); pg.wait_for_timeout(300)
    pg.click('[data-a="tab"][data-v="export"]'); pg.wait_for_timeout(300)
    print("===== hosted (claude.ai)"); print("print buttons :", pg.locator('[data-a="exp-print"]').count(), "| note:", pg.locator("#export p.faint").last.inner_text()[:90])
    b.close()

with sync_playwright() as p:
    hosted_check(p)
    run(p, "desk", {"viewport": {"width": 1280, "height": 900}})
    run(p, "phone", dict(p.devices["Pixel 7"]), tap=True)
