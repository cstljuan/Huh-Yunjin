"""Build optimized, source-faithful layers for poster 05."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "WEIRD-GARLIC"
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
sources = [Image.open(ROOT / f"WEIRD GARLIC YUNJIN ({i}).jpeg").convert("RGB") for i in range(1, 5)]

# Produce the late-night market plate from the generated, empty stall scene.
plate = Image.open(ROOT / "market-background-source.jpg").convert("RGB")
plate = ImageOps.fit(plate, (1800, 1320), method=Image.Resampling.LANCZOS, centering=(0.5, 0.48))
plate = ImageOps.autocontrast(plate, cutoff=1)
plate.save(OUT / "bg.jpg", quality=87, optimize=True)

# Keep Yunjin's supplied photo pixels unchanged. The generated alpha matte is
# aligned to the original photo, with a short bottom fade to soften its crop.
hero = sources[2]
matte = Image.open(ROOT / "subject-matte.png").convert("L").resize(hero.size, Image.Resampling.LANCZOS)
fade = Image.new("L", hero.size, 255)
fd = ImageDraw.Draw(fade)
start = hero.height - 64
for y in range(start, hero.height):
    v = int(255 * (hero.height - 1 - y) / (hero.height - start))
    fd.line((0, y, hero.width, y), fill=v)
matte = Image.fromarray(np.minimum(np.asarray(matte), np.asarray(fade)).astype("uint8"))
subject = hero.convert("RGBA")
subject.putalpha(matte)
subject.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                 dither=Image.Dither.FLOYDSTEINBERG).save(OUT / "subject.png", optimize=True)
matte.save(OUT / "subject-mask.png", optimize=True)

# Near-plane snapshot stack built from the other supplied market photographs.
canvas = Image.new("RGBA", (1120, 760), (0, 0, 0, 0))
for i, src in enumerate((sources[0], sources[1], sources[3])):
    card = Image.new("RGBA", (300, 430), "#f8f0d7")
    draw = ImageDraw.Draw(card)
    photo = ImageOps.fit(src, (272, 350), method=Image.Resampling.LANCZOS, centering=(0.5, 0.42))
    card.alpha_composite(photo.convert("RGBA"), (14, 14))
    draw.rectangle((13, 13, 286, 365), outline="#ffffff", width=2)
    draw.text((18, 382), f"MARKET ROLL / 0{i+1}", font=ImageFont.truetype(FONT, 13), fill="#283b28")
    card = card.rotate((i - 1) * 5, Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(card, (20 + i * 350, 62 + (i % 2) * 34))
canvas.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                dither=Image.Dither.FLOYDSTEINBERG).save(OUT / "midground.png", optimize=True)

def sticker(name, label, fill, outline, angle, size):
    layer = Image.new("RGBA", (950, 150), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT, size)
    draw.text((18, 12), label, font=font, fill=fill, stroke_width=5, stroke_fill=outline)
    box = layer.getbbox()
    layer = layer.crop((max(0, box[0]-10), max(0, box[1]-10), min(950, box[2]+10), min(150, box[3]+10)))
    layer.rotate(angle, Image.Resampling.BICUBIC, expand=True).save(OUT / name, optimize=True)

sticker("graffiti-1.png", "NIGHT MARKET / 11:48 PM", "#ed513d", "#fff1d6", -3, 40)
sticker("graffiti-2.png", "NO RESTOCK AFTER MIDNIGHT", "#bfd76d", "#14231e", 2, 32)

# Independent, light photo files populate the draggable archive.
for i, src in enumerate(sources, 1):
    im = src.copy()
    im.thumbnail((1200, 1000), Image.Resampling.LANCZOS)
    im.save(OUT / f"photo-{i:02}.webp", "WEBP", quality=82, method=4)
    with Image.open(OUT / f"photo-{i:02}.webp") as check:
        check.verify()

print("Built", [(p.name, p.stat().st_size) for p in sorted(OUT.iterdir())])
