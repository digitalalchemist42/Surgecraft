"""Rebuild dist/index.html from src/ + data/. Run from anywhere: python3 src/build_page.py (needs node on PATH)."""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
rd = lambda p: open(os.path.join(HERE, p), encoding="utf-8").read()
tpl, core, render, app = rd("page.template.html"), rd("roster-core.js"), rd("render.js"), rd("app.js")
app = app.replace("window.__muster = {S:S, C:C, build:build, FORMATS:FORMATS};\n", "")
data = json.load(open(os.path.join(ROOT, "data", "starcraft_tmg_data.json"), encoding="utf-8"))
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
css = subprocess.run(["node", "-e", "process.stdout.write(require(process.argv[1]).CARD_CSS)", os.path.join(HERE, "render.js")], capture_output=True, text=True, check=True).stdout
out = tpl.replace("/*__CORE__*/", core).replace("/*__RENDER__*/", render).replace("/*__APP__*/", app).replace("__DATA_JSON__", blob).replace("/*__CARD_CSS__*/", css)
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
open(os.path.join(ROOT, "dist", "index.html"), "w", encoding="utf-8").write(out)
print("wrote dist/index.html", len(out.encode()), "bytes")
