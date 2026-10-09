import sys, json, re, pymupdf
d = pymupdf.open(sys.argv[1])
lines = [l.replace("\uf0c7", "").strip() for p in d for l in p.get_text().split("\n") if l.replace("\uf0c7", "").strip()]
def num(x): return None if x == "-" else int(x)
STOP = {"Green: point drop, Red: point increase", "TERRAN", "ZERG", "PROTOSS", "NAME", "VESPENE", "GAS COST", "CREEP CARDS"}
def is_type(x): return x == "-" or x.startswith("SPECIALIST") or x.startswith("FOR ")
units = {}
idx = [k for k, l in enumerate(lines) if l == "MODELS"]
for n, i in enumerate(idx):
    j = i - 1; name = []
    while j >= 0 and len(name) < 2 and lines[j] not in STOP and lines[j].upper() == lines[j] and not re.match(r"^[\d-]+$", lines[j]) and "TACTICAL CARD POINTS" not in lines[j] and lines[j] not in ("UPGRADES","MINERAL COST"):
        name.insert(0, lines[j]); j -= 1
    nm = re.sub(r"\s+\)", ")", re.sub(r"\s+", " ", " ".join(name))).strip()
    assert lines[i+3] == "SUPPLY VALUE" and lines[i+6] == "MINERAL COST", nm
    u = {"models": [num(x) for x in lines[i+1:i+3] if x != "-"], "supply": [num(x) for x in lines[i+4:i+6] if x != "-"], "minerals": [num(x) for x in lines[i+7:i+9] if x != "-"], "upgrades": {}}
    k = i + 9
    end = idx[n+1] if n + 1 < len(idx) else len(lines)
    if k < len(lines) and lines[k] == "UPGRADES":
        k += 1
        while k < end:
            if lines[k] in STOP or "MODELS" in lines[k+1:k+3] and not any(is_type(x) for x in lines[k:k+2]): break
            nl = []
            while k < end and not is_type(lines[k]): nl.append(lines[k]); k += 1
            typ = []
            while k < end and is_type(lines[k]) and not (typ and lines[k] == "-"):
                typ.append(lines[k]); k += 1
                if typ[-1] == "-": break
            c = lines[k:k+2]; k += 2
            if not all(re.match(r"^(\d+|-)$", x) for x in c): sys.stderr.write("BAD %s %s %s %s\n" % (nm, nl, typ, lines[k-4:k+3])); break
            u["upgrades"][re.sub(r"\s+", " ", " ".join(nl)).strip()] = {"type": " ".join(typ).replace(" ,", ","), "costs": [num(x) for x in c if x != "-"]}
    units[nm] = u
gas = {}
text = "\n".join(lines)
for m in re.finditer(r"GAS COST\n(.*?)(?=\n[A-Z ]+TACTICAL CARD POINTS|\nCREEP CARDS\n|\n[A-Z ]{4,}\nMODELS|\Z)", text, re.S):
    seg = m.group(1).split("\n"); k = 0
    while k + 1 < len(seg):
        if re.match(r"^\d+$", seg[k+1]) and not re.match(r"^\d+$", seg[k]): gas[seg[k]] = int(seg[k+1]); k += 2
        else: k += 1
json.dump({"units": units, "gas": gas}, sys.stdout, indent=1, ensure_ascii=False)
