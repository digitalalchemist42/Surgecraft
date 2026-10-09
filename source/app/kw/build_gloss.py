import json, re
E=json.load(open('raw_entries.json'))
out=[]
for e in E:
    blocks=[]; cur=None; prev=None
    for ln in e['lines']:
        cont = prev is not None and (prev.endswith(' ') or not re.search(r'[.:)”\]]$',prev) or ln[:1].islower())
        m=None
        if not cont:
            if ln.startswith('X-X '): m=('li',ln[1:])
            elif ln.startswith('X '): m=('li',ln[2:])
        elif ln.startswith('X ') and ln[2:3].isupper() and re.search(r'[.:]\s*$',prev): m=('li',ln[2:])
        if m:
            cur={'t':m[0],'s':m[1].strip()}; blocks.append(cur)
        elif cont and cur:
            cur['s']=(cur['s']+' '+ln.strip()).strip()
        else:
            cur={'t':'p','s':ln.strip()}; blocks.append(cur)
        prev=ln
    for b in blocks: b['s']=re.sub(r'\s+',' ',b['s'])
    out.append({'head':e['head'],'body':blocks})
json.dump(out,open('glossary_all.json','w'),indent=1,ensure_ascii=False)
for o in out:
    print('##',o['head'])
    for b in o['body']: print(('  - ' if b['t']=='li' else '  ')+b['s'])
