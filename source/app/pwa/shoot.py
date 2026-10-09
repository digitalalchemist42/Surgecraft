from playwright.sync_api import sync_playwright
from PIL import Image
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":512,"height":512})
    pg.goto("file:///home/claude/app/pwa/icon.html"); pg.wait_for_timeout(600)
    pg.locator("#icon").screenshot(path="icon-512.png"); b.close()
im=Image.open("icon-512.png").convert("RGB")
for s,n in [(512,"icon-512.png"),(192,"icon-192.png"),(180,"apple-touch-icon.png"),(48,"favicon-48.png")]:
    im.resize((s,s),Image.LANCZOS).save(n, optimize=True)
# preview: plain, circle mask, rounded mask, small
prev=Image.new("RGB",(512*3+40,512),"#d0d4d8")
from PIL import ImageDraw
prev.paste(im,(0,0))
for k,shape in enumerate(["circle","squircle"]):
    m=Image.new("L",(512,512),0); d=ImageDraw.Draw(m)
    if shape=="circle": d.ellipse((0,0,511,511),fill=255)
    else: d.rounded_rectangle((0,0,511,511),radius=110,fill=255)
    prev.paste(im,(532+k*532,0),m)
prev.save("icon-preview.png")
print("ok")
