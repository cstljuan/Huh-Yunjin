"""Rebuild BLEACHED-AURA layers and eight previews from the owner's photographs."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy.ndimage import binary_fill_holes, gaussian_filter, label

root=Path(__file__).resolve().parents[1]/'BLEACHED-AURA'
out=root/'assets';out.mkdir(exist_ok=True)
source=Image.open(root/'BLEACHED AURA YUNJIN (4).jpeg').convert('RGB')
a=np.asarray(source,dtype=np.float32)
# The photographer's near-black studio is distinct from the white hair, skin,
# and clothing. Select the central connected subject and fill dark eye/detail holes.
luma=a.mean(2)
mask=luma>41
regions,n=label(mask)
counts=np.bincount(regions.ravel());counts[0]=0
subject_region=regions==counts.argmax()
subject_region=binary_fill_holes(subject_region)
alpha=np.uint8(np.clip(gaussian_filter(subject_region.astype(np.float32),1.7)*255,0,255))
subject=Image.fromarray(np.dstack((a.astype(np.uint8),alpha)),'RGBA')
subject.save(out/'subject.png',optimize=True)
# Reconstruct the photographed empty near-black plate with a soft cyan halo;
# its grain comes from the source corners, with no person baked into this layer.
w,h=1600,1100
y,x=np.mgrid[:h,:w]
rng=np.random.default_rng(42)
noise=rng.normal(0,1.8,(h,w))
glow=np.exp(-(((x-w*.49)/(w*.57))**2+((y-h*.39)/(h*.62))**2))
base=np.stack((13+7*glow+noise,20+38*glow+noise,36+56*glow+noise),axis=2)
Image.fromarray(np.uint8(np.clip(base,0,255)),'RGB').save(out/'bg.jpg',quality=88,optimize=True)
# A separate near-plane collectible card uses another user-supplied photo.
close=Image.open(root/'BLEACHED AURA YUNJIN (3).jpeg').convert('RGB')
card=Image.new('RGBA',(630,820),(0,0,0,0));d=ImageDraw.Draw(card)
d.rounded_rectangle((12,12,618,805),radius=20,fill='#dfeef2',outline='#4ed8ee',width=8)
ratio=max(560/close.width,690/close.height)
close=close.resize((round(close.width*ratio),round(close.height*ratio)),Image.Resampling.LANCZOS)
cx=(close.width-560)//2;cy=(close.height-690)//2
card.paste(close.crop((cx,cy,cx+560,cy+690)),(35,42))
d.rectangle((35,730,595,786),fill='#122947')
card.quantize(colors=256,method=Image.Quantize.FASTOCTREE).save(out/'midground.png',optimize=True)
# Source 08 is byte-for-byte identical to 07, so show it only once.
for i in range(1,8):
    im=Image.open(root/f'BLEACHED AURA YUNJIN ({i}).jpeg').convert('RGB')
    im.thumbnail((1080,1260),Image.Resampling.LANCZOS)
    im.save(out/f'photo-{i:02}.webp','WEBP',quality=82,method=4)
    assert (out/f'photo-{i:02}.webp').stat().st_size > 0
print('Built',[(p.name,p.stat().st_size) for p in out.iterdir()])
