import json, re
A = "/home/claude/app/"
tpl = open(A+"page.template.html").read()
core = open(A+"roster-core.js").read()
render = open(A+"render.js").read()
ex = open(A+"examples.js").read()
kw = open(A+"keywords.js").read()
bat = open(A+"battle-core.js").read()
app = open(A+"app.js").read().replace("window.__muster = {S:S, C:C, build:build, FORMATS:FORMATS};\n", "")
data = json.load(open("/home/claude/sc_data/starcraft_tmg_data.json"))
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
for k in ["/*__BATTLE__*/", "/*__KEYWORDS__*/", "/*__EXAMPLES__*/", "/*__CORE__*/", "/*__RENDER__*/", "/*__APP__*/", "__DATA_JSON__", "/*__CARD_CSS__*/"]: assert k in tpl, k
# CARD_CSS is defined in render.js; the page also reads it at runtime-free build time for first paint
import subprocess
css = subprocess.run(["node","-e","process.stdout.write(require('"+A+"render.js').CARD_CSS)"],capture_output=True,text=True).stdout
out = tpl.replace("/*__CORE__*/", core).replace("/*__RENDER__*/", render).replace("/*__EXAMPLES__*/", ex).replace("/*__KEYWORDS__*/", kw).replace("/*__BATTLE__*/", bat).replace("/*__APP__*/", app).replace("__DATA_JSON__", blob).replace("/*__CARD_CSS__*/", css)
open(A+"starcraft-muster.html", "w").write(out)
print("bytes", len(out.encode()))
