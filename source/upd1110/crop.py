import sys
from PIL import Image
U="/mnt/user-data/uploads/"
F={"tac":"1980031c-image.jpg","prot":"cc6d04d8-image.jpg","htz":"8af881ff-image.jpg","scarab":"f0b185ac-image.jpg","fbup":"2bff3dbe-image.png","reaverup":"8e1b1d3f-image.jpg","fb":"2c672aeb-image.jpg","im":"6877b657-image.jpg"}
# usage: crop.py key outname x0 y0 x1 y1 (fractions 0-1) [maxw]
k,out=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(float,sys.argv[3:7]); maxw=int(sys.argv[7]) if len(sys.argv)>7 else 1900
im=Image.open(U+F[k]); W,H=im.size
c=im.crop((int(x0*W),int(y0*H),int(x1*W),int(y1*H)))
s=maxw/c.width
c=c.resize((maxw,int(c.height*s)),Image.LANCZOS); c.save(f"crops/{out}.png"); print(out,c.size)
