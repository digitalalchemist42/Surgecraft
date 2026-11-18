# Card art for Robotics Support Bay and Tal'darim from the art faces in the owner's 17 Nov 2026 photograph (pixel boxes).
import sys
from PIL import Image, ImageOps
SRC = "/mnt/user-data/uploads/edc32dd7-image.jpg"
BOX = {"robotics-support-bay": ((14, 72, 238, 270), (396, 359), "fit"), "taldarim": ((294, 74, 458, 254), (244, 258), "pad")}
out = sys.argv[1] if len(sys.argv) > 1 else "."
im = Image.open(SRC).convert("RGB")
for id, (b, size, how) in BOX.items():
    c = im.crop(b)
    # "pad": keep the whole emblem, filling the margin with the card's own background colour
    img = ImageOps.fit(c, size, Image.LANCZOS) if how == "fit" else ImageOps.pad(c, size, Image.LANCZOS, color=c.getpixel((2, 2)))
    img.save(f"{out}/{id}.webp", quality=88)
