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

# 2) Background beyond the photo's edges: the photo's outermost columns
#    stretched outwards, getting softer the further they go (the grass and
#    sky simply carry on, out of focus, like the photo's own background).
canvas = ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, 0.55)).filter(ImageFilter.GaussianBlur(45))
F = 110  # feather width where the photo blends into its extension
side = x0 + F
edge = int(pw * 0.035)
def extend(strip_img, width, flip):
    smear = strip_img.resize((width, ph), Image.BICUBIC)
    near = np.asarray(smear.filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
    far = np.asarray(smear.filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
    t = np.linspace(0, 1, width)[None, :, None]  # 0 at the photo, 1 far out
    if flip:
        t = t[:, ::-1]
    mix = near * (1 - t) + far * t
    return Image.fromarray(mix.clip(0, 255).astype(np.uint8))
left_src = ImageOps.mirror(por.crop((0, 0, edge, ph)))
right_src = ImageOps.mirror(por.crop((pw - edge, 0, pw, ph)))
canvas.paste(extend(left_src, side, True), (0, y0))
canvas.paste(extend(right_src, side, False), (x0 + pw - F, y0))
# 3) The photo itself, edges feathered into the extended background.
a = np.ones((ph, pw), np.float32)
f = F
ramp = np.linspace(0, 1, f) ** 1.5
a[:, :f] *= ramp
a[:, -f:] *= ramp[::-1]
canvas.paste(por, (x0, y0), Image.fromarray((a * 255).astype(np.uint8)))
# Soften the seam: the picture goes gradually out of focus from the outer
# fifth of the photo outwards, like a shallow depth of field.
soft = np.asarray(canvas.filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
sharp = np.asarray(canvas).astype(np.float32)
xs = np.arange(W)
cx = W / 2
inner = pw * 0.30
outer = pw * 0.5 + 90
m = np.clip((np.abs(xs - cx) - inner) / (outer - inner), 0, 1) ** 1.3
m = m[None, :, None]
canvas = Image.fromarray((sharp * (1 - m) + soft * m).clip(0, 255).astype(np.uint8))

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
