"""Build reproducible, lightweight layers from the supplied GUAIAC portraits."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "GUAIAC"
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

sources = [Image.open(ROOT / f"GUAIAC YUNJIN ({i}).jpeg").convert("RGB") for i in range(1, 5)]

# Use the high-resolution matte created from the supplied hero photo, then
# apply that mask to the untouched source pixels for an identity-faithful cutout.
hero = sources[0]
w, h = hero.size
mask_path = OUT / "subject-mask.png"
if not mask_path.exists():
    raise FileNotFoundError("Keep the generated subject-mask.png beside this build script.")
matte = Image.open(mask_path).convert("L").resize((w, h), Image.Resampling.LANCZOS)
cutout = hero.convert("RGBA")
cutout.putalpha(matte)
cutout.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                dither=Image.Dither.FLOYDSTEINBERG).save(OUT / "subject.png", optimize=True)

# A clean plate made from empty parts of the shoot: clouded sky from photo 2
# and the empty ground at the left edge of photo 3, with drawn distant field shapes.
sky = sources[1].crop((0, 0, sources[1].width, 710))
plate = ImageOps.fit(sky, (1800, 820), method=Image.Resampling.LANCZOS, centering=(0.5, 0.32))
ground = sources[2].crop((0, 1500, 350, 2121))
bg = Image.new("RGB", (1800, 1260), "#d9ddd0")
bg.paste(plate, (0, 0))
tile = ground.resize((450, 440), Image.Resampling.BICUBIC)
for i in range(4):
    bg.paste(tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if i % 2 else tile, (i * 450, 820))
d = ImageDraw.Draw(bg, "RGBA")
d.ellipse((-150, 760, 850, 1110), fill=(108, 132, 95, 220))
d.ellipse((480, 780, 1560, 1130), fill=(126, 145, 103, 200))
d.ellipse((1280, 760, 2020, 1080), fill=(102, 126, 91, 210))
d.rectangle((0, 960, 1800, 1260), fill=(115, 136, 91, 90))
d.rectangle((0, 816, 1800, 830), fill=(246, 230, 194, 180))
rng = np.random.default_rng(44)
arr = np.asarray(bg, dtype=np.int16)
noise = rng.normal(0, 2.4, (1260, 1800, 1))
bg = Image.fromarray(np.uint8(np.clip(arr + noise, 0, 255)), "RGB")
bg.save(OUT / "bg.jpg", quality=88, optimize=True)

# A near-plane stack of three snapshots from three different frames.
cards = Image.new("RGBA", (1160, 720), (0, 0, 0, 0))
for i, source in enumerate(sources[1:]):
    card = Image.new("RGBA", (330, 500), "#fffdf3")
    card_draw = ImageDraw.Draw(card)
    photo = ImageOps.fit(source, (294, 412), method=Image.Resampling.LANCZOS, centering=(0.5, 0.36))
    card.alpha_composite(photo.convert("RGBA"), (18, 18))
    card_draw.text((21, 445), f"FIELD NOTE 0{i+1}   /   GUAIAC", font=ImageFont.truetype(FONT, 12), fill="#52624e")
    card = card.rotate((i - 1) * 5, Image.Resampling.BICUBIC, expand=True)
    cards.alpha_composite(card, (18 + i * 365, 75 + (i % 2) * 36))
cards.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
               dither=Image.Dither.FLOYDSTEINBERG).save(OUT / "midground.png", optimize=True)

def sticker(filename, text, fill, outline, angle, size=56):
    layer = Image.new("RGBA", (980, 180), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT, size)
    draw.text((30, 20), text, font=font, fill=fill, stroke_width=7, stroke_fill=outline)
    box = layer.getbbox()
    layer = layer.crop((max(0, box[0]-12), max(0, box[1]-12), min(980, box[2]+12), min(180, box[3]+12)))
    layer.rotate(angle, Image.Resampling.BICUBIC, expand=True).save(OUT / filename, optimize=True)

sticker("graffiti-1.png", "100% YUNJIN ENERGY", "#ec4884", "#fff8ea", -4, 49)
sticker("graffiti-2.png", "YUNJIN FIELD NOTES", "#335c42", "#f7edc7", 3, 40)

# Four optimized choices remain independent, so the photo archive opens quickly.
for i, source in enumerate(sources, 1):
    source.thumbnail((1100, 1400), Image.Resampling.LANCZOS)
    source.save(OUT / f"photo-{i:02}.webp", "WEBP", quality=82, method=4)
    with Image.open(OUT / f"photo-{i:02}.webp") as check:
        check.verify()
    assert (OUT / f"photo-{i:02}.webp").stat().st_size > 0

print("Built", [(p.name, p.stat().st_size) for p in sorted(OUT.iterdir())])
