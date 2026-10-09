# Generate art for provisional (preview) units and cards: miniature cut-outs from the 10.6 cost table,
# portrait card art on a race-coloured background, and emblem art for new Faction/Tactical cards.
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SRC = "/home/claude/upd106/img/"; APP = "/home/claude/app/img/"
COL = {"Terran": ((10, 63, 107), (0, 91, 164), (54, 169, 224)), "Protoss": ((110, 82, 0), (189, 138, 0), (63, 182, 232)), "Zerg": ((68, 28, 73), (130, 50, 135), (200, 91, 176))}
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf"
def font(n): return ImageFont.truetype(FONT, n)
def emblem(race, h=None):
    e = Image.open(APP + "race/%s.webp" % race.lower()).convert("RGBA")
    if h: e = e.resize((int(e.width * h / e.height), h), Image.LANCZOS)
    return e

def gradient(w, h, race):
    dark, mid, glow = COL[race]
    im = Image.new("RGBA", (w, h), dark + (255,))
    g = Image.new("L", (w, h), 0); d = ImageDraw.Draw(g)
    for r in range(int(h * 0.75), 0, -4):  # radial glow low in the frame
        d.ellipse((w / 2 - r, h * 0.62 - r, w / 2 + r, h * 0.62 + r), fill=int(170 * (1 - r / (h * 0.75)) ** 1.6))
    im = Image.composite(Image.new("RGBA", (w, h), mid + (255,)), im, g)
    return im

def portrait(uid, race, name, mini=None):
    w, h = 306, 646
    im = gradient(w, h, race)
    e = emblem(race, 200); e2 = e.copy(); e2.putalpha(e.getchannel("A").point(lambda a: a * 0.18))
    im.alpha_composite(e2, ((w - e2.width) // 2, 40))
    d = ImageDraw.Draw(im)
    if mini is not None:
        m = mini.crop(mini.getbbox()); k = min(286 / m.width, 470 / m.height); m = m.resize((int(m.width * k), int(m.height * k)), Image.LANCZOS)
        sh = Image.new("RGBA", m.size, (0, 0, 0, 0)); sh.putalpha(m.getchannel("A").point(lambda a: a * 0.55)); sh = sh.filter(ImageFilter.GaussianBlur(8))
        x = (w - m.width) // 2; y = h - 70 - m.height
        im.alpha_composite(sh, (x + 6, y + 10)); im.alpha_composite(m, (x, y))
    else:
        e3 = emblem(race, 230); im.alpha_composite(e3, ((w - e3.width) // 2, 230))
        f = font(26); lines = name.upper().split(" ")
        y = 470
        for ln in lines:
            tw = d.textlength(ln, font=f); d.text(((w - tw) / 2, y), ln, font=f, fill=(255, 255, 255, 235)); y += 32
    im.convert("RGB").save(APP + "units/%s.webp" % uid, quality=86)

def mini_out(uid):
    m = Image.open(SRC + uid + ".png").convert("RGBA"); m = m.crop(m.getbbox())
    m.thumbnail((240, 254), Image.LANCZOS)
    m.save(APP + "minis/%s.webp" % uid, quality=88)
    return Image.open(SRC + uid + ".png").convert("RGBA")

def card_art(cid, race):
    w, h = 300, 300
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); dark, mid, glow = COL[race]
    g = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    d.ellipse((30, 30, 270, 270), fill=glow + (150,)); g = g.filter(ImageFilter.GaussianBlur(28))
    im.alpha_composite(g)
    e = emblem(race, 220); im.alpha_composite(e, ((w - e.width) // 2, (h - e.height) // 2))
    im.save(APP + "cards/%s.webp" % cid, quality=90)

BATCH1_UNITS = [("nova-stealth-mode", "Terran", "Nova Stealth Mode", True), ("nova-assault-mode", "Terran", "Nova Assault Mode", True),
         ("spec-ops-marauder", "Terran", "Spec Ops Marauder", True), ("raven", "Terran", "Raven", True),
         ("auto-turret", "Terran", "Auto-Turret", False), ("holo-decoy", "Terran", "Holo Decoy", False), ("sabotage-drone", "Terran", "Sabotage Drone", False),
         ("high-templar", "Protoss", "High Templar", True), ("twilight-templar", "Protoss", "Twilight Templar", True), ("tassadar", "Protoss", "Tassadar", True)]
BATCH1_CARDS = [("nova-covert-ops", "Terran"), ("vanadium-plating", "Terran"), ("templar-caste", "Protoss"), ("templar-archives", "Protoss"), ("zagaras-swarm", "Zerg")]
# Batch 2 (Zerg previews). Bile Launcher has no cost-table picture: emblem portrait plus an emblem mini.
BATCH2_UNITS = [("zagara", "Zerg", "Zagara", True), ("vileling", "Zerg", "Vileling", True), ("defiler", "Zerg", "Defiler", True),
                ("bile-launcher", "Zerg", "Bile Launcher", False)]
BATCH2_CARDS = [("defiler-mound", "Zerg"), ("reactive-creep", "Zerg")]
batch = sys.argv[1] if len(sys.argv) > 1 else "2"
UNITS, CARDS = (BATCH1_UNITS, BATCH1_CARDS) if batch == "1" else (BATCH2_UNITS, BATCH2_CARDS)
for uid, race, name, has_mini in UNITS:
    portrait(uid, race, name, mini_out(uid) if has_mini else None)
    if not has_mini and batch == "2":
        e = emblem(race, 200); e.thumbnail((240, 254), Image.LANCZOS); e.save(APP + "minis/%s.webp" % uid, quality=88)
for cid, race in CARDS:
    card_art(cid, race)
print("done")
