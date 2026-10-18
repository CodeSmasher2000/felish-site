"""Generate the tileable surface textures used in the sphere.

Writes to public/textures/:
  regolith_detail.jpg / regolith_normal.jpg   ground: fine dust, pebbles, tiny craters
  rock_detail.jpg     / rock_normal.jpg       boulders and cliffs: cracks and chips

The *_detail maps are greyscale brightness detail (mid-grey = no change); the
pastel colour comes from the scene. Everything tiles seamlessly because noise
is built in the frequency domain and every feature wraps around the edges.

Run:  python3 tools/make-textures.py   (needs numpy and Pillow)
"""
from pathlib import Path

import numpy as np
from PIL import Image

SIZE = 1024
OUT = Path(__file__).resolve().parent.parent / "public" / "textures"


def spectral_noise(rng, beta, size=SIZE):
    """Tileable fractal noise: random phases, amplitude ~ 1/f^beta."""
    fx = np.fft.fftfreq(size)[:, None]
    fy = np.fft.fftfreq(size)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    amp = f ** (-beta)
    amp[0, 0] = 0.0
    phase = rng.uniform(0, 2 * np.pi, (size, size))
    field = np.real(np.fft.ifft2(amp * np.exp(1j * phase)))
    field -= field.mean()
    return field / (np.abs(field).max() + 1e-9)


def stamp(h, cx, cy, reach, fn):
    """Apply fn(t_dist) inside a wrapped window around (cx, cy) — fast and tileable."""
    reach = int(np.ceil(reach)) + 1
    xs = (np.arange(int(cx) - reach, int(cx) + reach + 1)) % SIZE
    ys = (np.arange(int(cy) - reach, int(cy) + reach + 1)) % SIZE
    gx = np.arange(int(cx) - reach, int(cx) + reach + 1) - cx
    gy = np.arange(int(cy) - reach, int(cy) + reach + 1) - cy
    d = np.sqrt(gx[None, :] ** 2 + gy[:, None] ** 2)
    np.add.at(h, np.ix_(ys, xs), fn(d))


def add_craters(h, rng, count, rmin, rmax, depth):
    for _ in range(count):
        r = rmin + (rmax - rmin) * rng.random() ** 2.5
        cx, cy = rng.uniform(0, SIZE, 2)
        k = depth * (r / rmax) ** 0.6

        def crater(d, r=r, k=k):
            t = d / r
            bowl = np.where(t < 1, t**4 - 1, 0.0)  # flat floor, steep walls
            rim = 0.22 * np.exp(-(((t - 1) / 0.22) ** 2))
            return (bowl + rim) * k

        stamp(h, cx, cy, r * 2.0, crater)
    return h


def add_pebbles(h, rng, count, rmin, rmax, height):
    for _ in range(count):
        r = rng.uniform(rmin, rmax)
        cx, cy = rng.uniform(0, SIZE, 2)
        k = height * rng.uniform(0.5, 1.0)
        stamp(h, cx, cy, r, lambda d, r=r, k=k: np.clip(1 - (d / r) ** 2, 0, None) ** 0.7 * k)
    return h


def voronoi_cracks(rng, cells, width, warp=28.0):
    """Jagged crack lines along tileable Voronoi cell borders (1 on a crack).

    The lookup coordinates are pushed around by tileable noise, so the borders
    wander like real fractures instead of running dead straight."""
    pts = rng.uniform(0, SIZE, (cells, 2))
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float64)
    x = x + spectral_noise(rng, 1.5) * warp + spectral_noise(rng, 1.0) * warp * 0.15
    y = y + spectral_noise(rng, 1.5) * warp + spectral_noise(rng, 1.0) * warp * 0.15
    d1 = np.full((SIZE, SIZE), np.inf)
    d2 = np.full((SIZE, SIZE), np.inf)
    for px, py in pts:
        dx = np.abs(x - px) % SIZE
        dy = np.abs(y - py) % SIZE
        dx = np.minimum(dx, SIZE - dx)
        dy = np.minimum(dy, SIZE - dy)
        d = np.sqrt(dx * dx + dy * dy)
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        d1 = np.where(closer, d, d1)
    edge = d2 - d1
    return np.exp(-((edge / width) ** 2))


def normal_map(h, strength):
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    n = np.dstack([-dx * strength, dy * strength, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def cavity(h, blur_beta=1.0):
    """How much lower than its surroundings each pixel is (for darkening dips)."""
    F = np.fft.fft2(h)
    fx = np.fft.fftfreq(SIZE)[:, None]
    fy = np.fft.fftfreq(SIZE)[None, :]
    lowpass = np.exp(-(fx * fx + fy * fy) / (2 * 0.004**2 * blur_beta))
    smooth = np.real(np.fft.ifft2(F * lowpass))
    return h - smooth


def to_grey(a, lo, hi):
    a = (a - a.min()) / (a.max() - a.min() + 1e-9)
    return ((lo + (hi - lo) * a) * 255).astype(np.uint8)


def save(name, arr, mode):
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, mode).save(OUT / name, quality=88, optimize=True, progressive=True)
    print("wrote", OUT / name)


def regolith():
    rng = np.random.default_rng(11)
    h = spectral_noise(rng, 1.9) * 2.0 + spectral_noise(rng, 1.2) * 0.3 + spectral_noise(rng, 0.8) * 0.12
    h = add_craters(h, rng, 34, 4, 70, 1.0)
    h = add_pebbles(h, rng, 2600, 1.0, 3.5, 0.32)
    grain = rng.normal(0, 1, (SIZE, SIZE))
    albedo = (
        0.55 * spectral_noise(rng, 1.4)
        + 0.18 * np.clip(cavity(h), -1, 1)
        + 0.09 * grain
    )
    save("regolith_detail.jpg", to_grey(albedo, 0.22, 0.86), "L")
    save("regolith_normal.jpg", normal_map(h, 7.0), "RGB")


def rock():
    rng = np.random.default_rng(23)
    cracks = voronoi_cracks(rng, 40, 2.4, warp=34.0)
    fine = voronoi_cracks(rng, 160, 1.0, warp=14.0) * (spectral_noise(rng, 1.6) > -0.1)
    h = spectral_noise(rng, 1.7) * 3.0 + spectral_noise(rng, 1.1) * 0.35 + spectral_noise(rng, 0.7) * 0.12
    h -= cracks * 1.6 + fine * 0.45
    h = add_craters(h, rng, 25, 4, 22, 0.8)  # chips
    grain = rng.normal(0, 1, (SIZE, SIZE))
    albedo = (
        0.5 * spectral_noise(rng, 1.3)
        - 0.55 * cracks
        - 0.18 * fine
        + 0.2 * np.clip(cavity(h), -1, 1)
        + 0.05 * grain
    )
    save("rock_detail.jpg", to_grey(albedo, 0.18, 0.88), "L")
    save("rock_normal.jpg", normal_map(h, 11.0), "RGB")


if __name__ == "__main__":
    regolith()
    rock()
