"""Rebuild the COMPACT-BITES image layers from the original supplied photographs."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter, label

ROOT = Path(__file__).resolve().parents[1] / "COMPACT-BITES"
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)

# The light seamless studio background can be removed using connected color
# regions. This retains the original full resolution and an antialiased edge.
photo = Image.open(ROOT / "COMPACT BITES YUNJIN (1).jpeg").convert("RGB")
rgb = np.asarray(photo, dtype=np.float32)
brightness = rgb.min(axis=2)
neutral = rgb.max(axis=2) - rgb.min(axis=2)
candidate = (brightness > 231) & (neutral < 30)
groups, count = label(candidate)
edge = np.concatenate((groups[0], groups[-1], groups[:, 0], groups[:, -1]))
counts = np.bincount(edge[edge > 0], minlength=count + 1)
background = np.isin(groups, np.where(counts > 120)[0])
# A large studio-white opening between the bent arm and torso is also empty.
# Only the opening under her bent left arm is an interior white region.
# It is sampled from the source, not inferred from shirt highlights.
arm_gap_id = groups[1100, 350]
background |= (groups == arm_gap_id) & candidate
foreground = (~background).astype(np.float32)
alpha = gaussian_filter(foreground, 1.15)
subject = Image.fromarray(np.dstack((rgb.astype(np.uint8), (alpha * 255).astype(np.uint8))), "RGBA")
# Keep the full pixel dimensions while using a compact palette for the web.
subject.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                 dither=Image.Dither.FLOYDSTEINBERG).save(OUT / "subject.png", optimize=True)

# A clean plate with the subject entirely removed. The tones and fine grain
# are sampled from the studio backdrop and tinted for the poster composition.
w, h = 1920, 1200
yy, xx = np.mgrid[:h, :w]
grain = np.random.default_rng(21).normal(0, 2.2, (h, w))
glow = 18 * np.exp(-((xx - 950)**2 / (850**2) + (yy - 480)**2 / (790**2)))
base = np.stack((238 + glow + grain, 239 + glow + grain, 244 + glow + grain), axis=-1)
base = np.uint8(np.clip(base, 0, 255))
Image.fromarray(base, "RGB").save(OUT / "bg.jpg", quality=90, optimize=True)

font_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font_regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def text_sticker(name, text, size, color, outline, angle):
    layer = Image.new("RGBA", (1300, 370))
    draw = ImageDraw.Draw(layer)
    font = ImageFont.truetype(font_bold, size)
    draw.text((70, 70), text, font=font, fill=color, stroke_width=13, stroke_fill=outline)
    bbox = layer.getbbox()
    layer = layer.crop((max(0,bbox[0]-15),max(0,bbox[1]-15),min(1300,bbox[2]+15),min(370,bbox[3]+15)))
    layer.rotate(angle, Image.Resampling.BICUBIC, expand=True).save(OUT / name, optimize=True)

text_sticker("graffiti-1.png", "HOT & CRUNCHY!", 117, "#ef3154", "#fff7e4", 8)
text_sticker("graffiti-2.png", "YUNJIN.exe", 102, "#2475e9", "#ffffff", -7)

# A graphic foreground uses a second supplied photo. Keeping the face inside
# the card preserves its original crop while giving the scene a nearer plane.
card = Image.new("RGBA", (700, 940))
d = ImageDraw.Draw(card)
d.rounded_rectangle((12, 12, 688, 920), radius=24, fill="#2c54bf", outline="#162c66", width=7)
d.rounded_rectangle((29, 50, 672, 800), radius=13, fill="#f8f7f8")
closeup = Image.open(ROOT / "COMPACT BITES YUNJIN (2).jpeg").convert("RGB")
ratio = max(610 / closeup.width, 720 / closeup.height)
closeup = closeup.resize((round(closeup.width*ratio), round(closeup.height*ratio)), Image.Resampling.LANCZOS)
cx = (closeup.width-610)//2
cy = (closeup.height-720)//2
card.paste(closeup.crop((cx,cy,cx+610,cy+720)), (46,66))
d.rectangle((29, 806, 672, 903), fill="#2c54bf")
d.text((49, 829), "02  /  CLOSE UP", font=ImageFont.truetype(font_bold, 34), fill="white")
card = card.rotate(8, Image.Resampling.BICUBIC, expand=True)
card.save(OUT / "midground.png", optimize=True)

print("Built:", ", ".join(p.name for p in OUT.iterdir()))
