from app_src import A, app_js, page_js
s=open(A+"starcraft-muster.html").read(); app=app_js()
st=page_js(); assert st in s
open(A+"test.html","w").write('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+s.replace(st,app.replace("var TEST_EXAMPLES = false;","var TEST_EXAMPLES = true;")))
