import re, json
t=open('part11.txt',newline='').read()
# strip page furniture
t=re.sub(r'( ?)\n\n\d+\r\n(?:\d+\r\n)?[^\r\n]*BACK TO TABLE OF CONTENTS[^\r\n]*\r\n',lambda m:m.group(1)+'\r\n',t)
t=t.replace('\u0002','-')
lines=t.split('\r\n')
# drop the intro (up to first heading ACCESS POINT)
start=lines.index('ACCESS POINT')
intro=lines[:start]; lines=lines[start:]
HEAD=re.compile(r"^[A-Z][A-Z0-9 \-’']*[A-Z]( \((?:X|LoS|Unit Name)\)| \[(?:Characteristic|TAG)\] ?\(?X?\)?| Y” \(X\)| X \(Y\)| \(X\) Y| \[TAG\] X| \(Unit Name\) X)?$")
def is_head(s): 
    s2=s.rstrip()
    if s!=s2 and not s.endswith(' '): pass
    return bool(HEAD.match(s.strip())) and len(s.strip())>2 and not s.startswith('X ')
entries=[]; cur=None
prev_end=True
for ln in lines:
    raw=ln
    if is_head(raw) and prev_end:
        cur={'head':raw.strip(),'lines':[]}; entries.append(cur); prev_end=True; continue
    cur['lines'].append(raw)
    prev_end = bool(re.search(r'[.:)”\]]\s*$',raw))
for e in entries: print(repr(e['head']))
print(len(entries))
json.dump(entries,open('raw_entries.json','w'),indent=1,ensure_ascii=False)
