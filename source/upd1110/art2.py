# Sharper portraits for the four Stukov's Forces-era Zerg units, from the owner's 17 Nov 2026 photographs (pixel boxes).
import sys
from PIL import Image, ImageOps
U = "/mnt/user-data/uploads/"
BOX = {"infested-marine": ("45b66899-image.jpg", (0, 80, 222, 495)),
       "stukov": ("72184a83-image.jpg", (0, 130, 205, 495)),
       "infested-missile-turret": ("60c3b8dd-image.jpg", (0, 140, 283, 700)),
       "infested-trooper": ("ce0d39a3-image.jpg", (0, 105, 233, 620))}
SUMMONED = {"infested-missile-turret"}
out = sys.argv[1] if len(sys.argv) > 1 else None
tiles = []
for id, (f, b) in BOX.items():
    c = Image.open(U + f).convert("RGB").crop(b)
    p = ImageOps.fit(c, (305, 645), Image.LANCZOS); tiles.append(p)
    if out:
        p.save(f"{out}/units/{id}.webp", quality=84)
        if id not in SUMMONED: ImageOps.fit(c, (207, 247), Image.LANCZOS, centering=(0.5, 0.55)).save(f"{out}/minis/{id}.webp", quality=84)
sheet = Image.new("RGB", (4 * 310, 650), "white")
for i, t in enumerate(tiles): sheet.paste(t, (i * 310, 0))
sheet.save("art/sheet2.png")
