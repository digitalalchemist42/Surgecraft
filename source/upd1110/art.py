from PIL import Image, ImageOps
U="/mnt/user-data/uploads/"
F={"tac":"1980031c-image.jpg","prot":"cc6d04d8-image.jpg","scarab":"f0b185ac-image.jpg","fb":"2c672aeb-image.jpg","im":"60f2819e-image.jpg","front":"d6630467-image.jpg"}
UNITS={"firebat":("fb",.076,.193,.268,.862),"reaver":("scarab",.536,.11,.625,.42),"phasing-scarab":("scarab",.103,.076,.212,.407),
"scarab":("scarab",.095,.586,.202,.966),"solarite-scarab":("scarab",.551,.607,.648,.93),"alarak":("prot",0,.734,.10,.866),
"slayer":("prot",.51,.745,.618,.87),"taldarim-pylon":("prot",.507,.548,.625,.66),"infested-marine":("im",0,.245,.21,.508),
"stukov":("im",.02,.635,.262,.87),"infested-trooper":("front",.557,.10,.65,.37),"infested-missile-turret":("front",.547,.60,.632,.895)}
CARDS={"infested-command-center":("tac",.229,.303,.365,.42),"weighted-pustule":("tac",.452,.303,.528,.414),"hungering-infestation":("tac",.652,.338,.722,.441),
"healing-pathogen":("tac",.237,.80,.316,.897),"infested-barracks":("tac",.408,.752,.547,.91),"hive":("tac",.629,.814,.749,.952),"robotics-support-bay":("prot",.276,.404,.42,.45)}
SUMMONED={"scarab","solarite-scarab","phasing-scarab","taldarim-pylon","infested-missile-turret"}
def crop(k,b):
    im=Image.open(U+F[k[0]]).convert("RGB"); W,H=im.size
    return im.crop((int(k[1]*W),int(k[2]*H),int(k[3]*W),int(k[4]*H)))
import sys
out=sys.argv[1] if len(sys.argv)>1 else None
tiles=[]
for id,k in UNITS.items():
    c=crop(k,None); p=ImageOps.fit(c,(305,645),Image.LANCZOS,centering=(0.5,0.5)); tiles.append(p)
    if out:
        p.save(f"{out}/units/{id}.webp",quality=82)
        if id not in SUMMONED: ImageOps.fit(c,(207,247),Image.LANCZOS,centering=(0.5,0.6)).save(f"{out}/minis/{id}.webp",quality=82)
for id,k in CARDS.items():
    c=crop(k,None); p=ImageOps.fit(c,(396,359),Image.LANCZOS); tiles.append(p)
    if out: p.save(f"{out}/cards/{id}.webp",quality=82)
sheet=Image.new("RGB",(10*310,2*650),"white")
for i,t in enumerate(tiles): sheet.paste(t,((i%10)*310,(i//10)*650))
sheet.save("art/sheet.png")
