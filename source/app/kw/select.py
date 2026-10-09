import json,re
G=json.load(open('glossary_all.json'))
d=json.load(open('/home/claude/sc_data/starcraft_tmg_data.json'))
texts=[]
def walk(x):
    if isinstance(x,dict):
        for k,v in x.items():
            if k=='text' and isinstance(v,str): texts.append(v)
            elif k=='keywords' and isinstance(v,list): texts.extend(v)
            elif k=='name' and isinstance(v,str): pass
            else: walk(v)
    elif isinstance(x,list):
        for i in x: walk(i)
walk({'units':d['units'],'cards':d['cards']})
allt='\n'.join(texts)
def base(h):
    b=re.sub(r'\s*(\(X\)|\[.*?\].*|Y” \(X\)|X \(Y\)|\(X\) Y|\(Unit Name\).*|\(LoS\))$','',h).strip()
    return b
used=[]
for e in G:
    b=base(e['head']); e['term']=b
    pat=r'(?<![A-Za-z])'+re.escape(b)+r'(S|ED|D)?(?![A-Za-z])'
    n=len(re.findall(pat,allt))
    title=b.title()
    n2=len(re.findall(r'\b'+re.escape(title)+r' Status',allt))
    if n or n2: used.append((b,n,n2))
for u in used: print(u)
print(len(used))
# caps words on cards not covered
caps=set(re.findall(r"(?<![A-Za-z])[A-Z][A-Z\-]{2,}(?: [A-Z][A-Z\-]{2,})*(?![a-z])",allt))
cov=set(u[0] for u in used)
print(sorted(c for c in caps if not any(c.startswith(x) or x.startswith(c) for x in cov)))
