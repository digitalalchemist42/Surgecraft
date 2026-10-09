"""Standalone SurgeCraft builds (no Claude needed):
   out/surgecraft.html              one file, images + JSZip embedded (open locally, share by email/drive)
   out/surgecraft-site/             index.html + img/  (upload to any static host)"""
import base64, json, os, re, shutil
A = "/home/claude/app/"; OUT = A + "out/"
frag = open(A + "starcraft-muster.html", encoding="utf-8").read()
jszip = open(A + "vendor-jszip.min.js", encoding="utf-8").read()
cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>'
assert cdn in frag
frag = frag.replace(cdn, "<script>\n" + jszip.replace("</script", "<\\/script") + "\n</script>")
split = frag.index('<div class="appbar">')
head, body = frag[:split], frag[split:]
def page(head, body, favicon, extra=""):
    return ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="description" content="SurgeCraft: roster builder for the StarCraft Tabletop Miniatures Game.">'
            '<link rel="icon" href="' + favicon + '">' + extra +
            '<style>html,body{margin:0}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>\n'
            + head + '</head>\n<body>' + body + '</body></html>\n')
PWA_HEAD = ('<link rel="manifest" href="manifest.webmanifest">'
            '<meta name="theme-color" content="#09202E">'
            '<link rel="apple-touch-icon" href="apple-touch-icon.png">'
            '<meta name="apple-mobile-web-app-capable" content="yes">'
            '<meta name="mobile-web-app-capable" content="yes">'
            '<meta name="apple-mobile-web-app-title" content="SurgeCraft">'
            '<meta name="apple-mobile-web-app-status-bar-style" content="default">')
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
# ---- hosted site (installable web app)
import hashlib
site = OUT + "surgecraft-site/"
os.makedirs(site)
P = A + "pwa/"
index = page(head, body, "favicon-48.png", PWA_HEAD)
open(site + "index.html", "w", encoding="utf-8").write(index)
shutil.copytree(A + "img", site + "img", ignore=shutil.ignore_patterns("*.json"))
for f in ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon-48.png"]:
    shutil.copy(P + f, site + f)
manifest = {
    "name": "SurgeCraft", "short_name": "SurgeCraft",
    "description": "Roster builder for the StarCraft Tabletop Miniatures Game.",
    "id": "./", "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",
    "background_color": "#0A0F14", "theme_color": "#09202E",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ]
}
json.dump(manifest, open(site + "manifest.webmanifest", "w"), indent=1)
pre = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon-48.png"]
pre += sorted(os.path.relpath(os.path.join(d, f), site).replace(os.sep, "/") for d, _, fs in os.walk(site + "img") for f in fs)
h = hashlib.sha256()
for f in pre[1:]:
    h.update(open(site + f, "rb").read())
version = h.hexdigest()[:12]
sw = open(P + "sw.template.js").read().replace("__VERSION__", version).replace("__PRECACHE__", json.dumps(pre))
open(site + "sw.js", "w").write(sw)
print("service worker version", version, "precache", len(pre))
# ---- single file
imgs = {}
for d, _, fs in os.walk(A + "img"):
    for f in fs:
        if f.endswith(".webp"):
            p = os.path.relpath(os.path.join(d, f), A)
            imgs[p] = "data:image/webp;base64," + base64.b64encode(open(os.path.join(d, f), "rb").read()).decode()
patch = ("<script>\n(function(){var M=" + json.dumps(imgs) + ";['unit','mini','card','race','deploy'].forEach(function(k){var f=Render.ART[k];"
         "Render.ART[k]=function(){var p=f.apply(null,arguments);return M[p]||p;};});})();\n</script>\n")
marker = "<script>\n/* Example armies"
assert marker in body, "examples marker"
body1 = body.replace(marker, patch + marker, 1).replace('src="img/race/terran.webp"', 'src="' + imgs["img/race/terran.webp"] + '"')
fav = "data:image/png;base64," + base64.b64encode(open(A + "pwa/favicon-48.png", "rb").read()).decode()
open(OUT + "surgecraft.html", "w", encoding="utf-8").write(page(head, body1, fav))
for p in [OUT + "surgecraft.html", site + "index.html"]:
    print(p, round(os.path.getsize(p) / 1e6, 2), "MB")
print("site images:", sum(len(fs) for _, _, fs in os.walk(site + "img")))
