"""Build the FROM-THE-START photo cards from the supplied Yunjin set."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageOps
root=Path(__file__).resolve().parents[1]/'FROM-THE-START';out=root/'assets';out.mkdir(exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
# Warm paper desktop with a scanned wood panel sampled from the owner's source photo.
source=Image.open(root/'FROM THE START YUNJIN (1).jpeg').convert('RGB')
w,h=1600,1100
wood=source.crop((1030,25,1410,180)).resize((w,360),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(.45))
bg=Image.new('RGB',(w,h),'#eee7d8');bg.paste(wood,(0,0))
d=ImageDraw.Draw(bg,'RGBA');d.rectangle((0,360,w,h),fill=(235,229,213,255))
# Paper fibers and soft photocopy flecks
rng=np.random.default_rng(28);arr=np.asarray(bg,dtype=np.int16);noise=rng.normal(0,2.3,(h,w,1));arr=np.uint8(np.clip(arr+noise,0,255));bg=Image.fromarray(arr,'RGB')
d=ImageDraw.Draw(bg,'RGBA')
for y in range(400,h,54):d.line((0,y,w,y),fill=(83,92,104,20),width=1)
d.rectangle((0,0,w,h),outline='#fff8e9',width=34)
bg.save(out/'bg.jpg',quality=88,optimize=True)
# Main portrait print: a separate close crop with a genuine transparent matte.
photo=Image.open(root/'FROM THE START YUNJIN (4).jpeg').convert('RGB')
# Crop out source watermarks while retaining the close-up and both raised arms.
photo=photo.crop((0,0,photo.width,photo.height-50));photo.thumbnail((950,700),Image.Resampling.LANCZOS)
card=Image.new('RGBA',(photo.width+78,photo.height+156),(0,0,0,0));d=ImageDraw.Draw(card)
d.rectangle((0,0,card.width-1,card.height-1),fill='#fffdf5',outline='#d6cfbf',width=2)
card.paste(photo,(39,35));d.text((42,photo.height+52),'FROM THE START  /  03',font=ImageFont.truetype(font,21),fill='#34527b')
card=card.rotate(-4,Image.Resampling.BICUBIC,expand=True)
card.save(out/'subject.png',optimize=True)
# A 3-frame instant-film strip, assembled from three different supplied portraits.
strip=Image.new('RGBA',(1120,500),(0,0,0,0));d=ImageDraw.Draw(strip)
for i in range(3):
 p=Image.open(root/f'FROM THE START YUNJIN ({i+2}).jpeg').convert('RGB');p.thumbnail((310,360),Image.Resampling.LANCZOS)
 cardx=10+i*370;d.rectangle((cardx,10,cardx+340,470),fill='#fffdf6',outline='#fff',width=4)
 p=ImageOps.fit(p,(310,360),method=Image.Resampling.LANCZOS,centering=(.5,.42));strip.paste(p,(cardx+15,22))
 d.text((cardx+18,401),f'FRAME 0{i+1}   /   2003',font=ImageFont.truetype(font,15),fill='#536a82')
strip=strip.rotate(3,Image.Resampling.BICUBIC,expand=True);strip.save(out/'midground.png',optimize=True)
for i in range(1,5):
 im=Image.open(root/f'FROM THE START YUNJIN ({i}).jpeg').convert('RGB');im.thumbnail((1080,1000),Image.Resampling.LANCZOS)
 target=out/f'photo-{i:02}.webp';temp=out/f'photo-{i:02}.check.webp';saved=False
 for method in (2,1,0,3,4):
  im.save(temp,'WEBP',quality=80,method=method)
  try:
   with Image.open(temp) as check: check.verify()
   if temp.stat().st_size>0:temp.replace(target);saved=True;break
  except Exception: continue
 assert saved, f'Could not encode {target.name}'
print('Built',[(p.name,p.stat().st_size) for p in out.iterdir()])
