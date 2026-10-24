from PIL import Image, ImageFilter, ImageDraw, ImageOps
import numpy as np, sys
src, out_path, small_path = sys.argv[1:4]
im = Image.open(src).convert("RGB")
W, H = 1600, 909  # the cloud's shape (440:250)

# 1) The full portrait, as tall as the cloud.
ph = int(H * 0.96)
pw = round(im.width * ph / im.height)
por = im.resize((pw, ph), Image.LANCZOS)
x0 = (W - pw) // 2
y0 = H - ph

# 2) Background beyond the photo's edges: a blurred, stretched copy of the
#    photo, with the photo's own left and right halves mirrored outwards on
#    top of it (a dreamy, double-exposed look at the sides).
bg = ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, 0.55)).filter(ImageFilter.GaussianBlur(40))
canvas = bg.copy()
strip = int(pw * 0.5)
left = ImageOps.mirror(por.crop((0, 0, strip, ph)))
right = ImageOps.mirror(por.crop((pw - strip, 0, pw, ph)))
def soft(img, fade_from_right):
    a = np.linspace(0, 1, img.width) if fade_from_right else np.linspace(1, 0, img.width)
    a = np.clip(a * 1.6, 0, 1) ** 1.2
    mask = Image.fromarray((np.tile(a, (img.height, 1)) * 255).astype(np.uint8))
    return img.filter(ImageFilter.GaussianBlur(6)), mask
li, lm = soft(left, True)   # fades out towards the far left
ri, rm = soft(right, False) # fades out towards the far right
canvas.paste(li, (x0 - strip, y0), lm)
canvas.paste(ri, (x0 + pw, y0), rm)
# 3) The photo itself, edges feathered into the extended background.
a = np.ones((ph, pw), np.float32)
f = int(pw * 0.06)
ramp = np.linspace(0, 1, f)
a[:, :f] *= ramp
a[:, -f:] *= ramp[::-1]
canvas.paste(por, (x0, y0), Image.fromarray((a * 255).astype(np.uint8)))

# 4) Old-film treatment over the whole thing.
img = canvas.resize((int(W * 0.5), int(H * 0.5)), Image.LANCZOS).resize((W, H), Image.BICUBIC)
a = np.asarray(img).astype(np.float32) / 255
lumw = np.array([0.299, 0.587, 0.114])
lum = a @ lumw
hi = np.clip((lum - 0.6) / 0.4, 0, 1)[..., None] * a
hal = np.asarray(Image.fromarray((hi * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(22))).astype(np.float32) / 255
a = a + hal * np.array([0.7, 0.32, 0.12])
lum = (a @ lumw)[..., None]; a = lum + (a - lum) * 0.62
l = (a @ lumw)[..., None]
sh = np.clip(1 - l * 1.6, 0, 1); hl = np.clip((l - 0.45) * 1.8, 0, 1)
a = a + sh * np.array([-0.03, 0.035, 0.04]) + hl * np.array([0.06, 0.03, -0.07])
a = 0.12 + np.clip(a, 0, 1) * 0.8
yy, xx = np.mgrid[0:H, 0:W]
leak = np.exp(-(((xx - W * 0.98) / (W * 0.22)) ** 2 + ((yy - H * 0.15) / (H * 0.35)) ** 2))
a = a + leak[..., None] * np.array([0.3, 0.1, 0.0])
rng = np.random.default_rng(11)
n = rng.normal(0, 1, (H // 2 + 1, W // 2 + 1)).astype(np.float32)
n = np.asarray(Image.fromarray(((n * 0.18 + 0.5).clip(0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255 - 0.5
a = a + n[..., None] * 0.32
out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
dr = ImageDraw.Draw(out, "RGBA")
for _ in range(80):
    x, y = rng.integers(0, W), rng.integers(0, H); r = rng.uniform(0.6, 2.2)
    c = (250, 245, 230, int(rng.uniform(60, 160))) if rng.random() < 0.6 else (30, 25, 20, int(rng.uniform(50, 120)))
    dr.ellipse([x - r, y - r, x + r, y + r], fill=c)
for _ in range(14):
    x0_, y0_ = rng.integers(0, W), rng.integers(0, H); L = rng.integers(20, 90); ang = rng.uniform(-1, 1)
    dr.line([x0_, y0_, x0_ + ang * L * 0.3, y0_ + L], fill=(245, 240, 225, int(rng.uniform(40, 110))), width=1)
out.save(out_path, quality=84, optimize=True, progressive=True)
out.resize((800, round(800 * H / W)), Image.LANCZOS).save(small_path, quality=82, optimize=True, progressive=True)
print(out.size)
