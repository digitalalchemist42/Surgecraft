import json, re, subprocess
from collections import Counter
U = "/root/.claude/uploads/9abf6e13-647f-5f56-85fc-b76ff3a4a35a/"
pages = [("6e9a93c5-Terran_Units_1.pdf", p) for p in (8, 9, 10)] + [("dbeeb9ee-Terran_Units_2.pdf", 2)] + \
        [("39373445-Protoss_Units_1.pdf", p) for p in (8, 9, 10)] + [("fbf9dae7-Protoss_Units_2.pdf", 4)] + \
        [("c9ea1507-Zerg_Units_1.pdf", p) for p in (13, 14, 15, 16)] + [("211ca09c-Zerg_Units_2.pdf", 2)]
txt = ""
for f, p in pages:
    txt += subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), "-layout", U + f, "-"], capture_output=True, text=True).stdout
got = Counter()
for m in re.finditer(r"SUPPLY::\s*([^\n]+?)(?:\s{3,}|$)", txt, re.M):
    s = m.group(1).strip().rstrip(",")
    got[tuple(sorted((k.strip().title(), int(n)) for n, k in re.findall(r"(\d+)\s*×\s*([A-Z]+)", s)))] += 1
data = json.load(open("starcraft_tmg_data.json"))
exp = Counter(tuple(sorted(c["slots"].items())) for c in data["cards"] if c["kind"] != "Creep")
print("slot lines in text:", sum(got.values()), " cards in data:", sum(exp.values()))
print("in text not data:", dict(got - exp)); print("in data not text:", dict(exp - got))
res = Counter(re.findall(r"\b(CP|PE|BM): (\d)", txt))
print("resource boxes in text:", dict(res))
print("resource values in data:", dict(Counter((c["resource"]["type"], str(c["resource"]["value"])) for c in data["cards"])))
