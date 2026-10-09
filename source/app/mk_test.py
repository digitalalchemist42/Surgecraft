A="/home/claude/app/"
s=open(A+"starcraft-muster.html").read(); app=open(A+"app.js").read()
st=app.replace("window.__muster = {S:S, C:C, build:build, FORMATS:FORMATS};\n",""); assert st in s
open(A+"test.html","w").write('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+s.replace(st,app))
