import "./home.css";
import { ARTIST, PLANETS, EPK, MOON_TEXTURE_URL, SHOWS } from "../config.js";
import { asset } from "../app/lib/asset.js";

// Old links straight into the 3D world (/#sphere, /#cave) now live on space.html.
if (location.hash === "#sphere" || location.hash === "#cave") location.replace(`./space.html${location.hash}`);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const spotify = PLANETS.find((p) => p.name === "Spotify");
const youtube = PLANETS.find((p) => p.name === "YouTube");

const link = (href, text, { download } = {}) => {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  if (download) a.setAttribute("download", download);
  else {
    a.target = "_blank";
    a.rel = "noopener";
  }
  return a;
};

// ── Name: one word per line ─────────────────────────────────────────────
const nameEl = document.getElementById("name");
nameEl.replaceChildren(
  ...ARTIST.name.split(" ").map((w) => Object.assign(document.createElement("span"), { textContent: w })),
);
nameEl.setAttribute("aria-label", ARTIST.name);

// Keep the name inside its column whatever the screen (wide fonts can
// otherwise run into the photo): shrink it if the longest word is too wide.
function fitName() {
  nameEl.style.fontSize = "";
  const room = nameEl.clientWidth;
  const widest = Math.max(...[...nameEl.children].map((w) => w.scrollWidth));
  if (widest > room) {
    const size = parseFloat(getComputedStyle(nameEl).fontSize);
    nameEl.style.fontSize = `${Math.floor((size * room) / widest)}px`;
  }
}
fitName();
document.fonts?.ready.then(fitName);
window.addEventListener("resize", fitName);

// ── Top links ───────────────────────────────────────────────────────────
document
  .getElementById("nav")
  .append(
    link(spotify.url, "Music"),
    link(youtube.url, "Videos"),
    link(asset(EPK.url), "Press kit", { download: EPK.fileName }),
  );

// ── Latest release ──────────────────────────────────────────────────────
const release = document.getElementById("release");
const title = document.createElement("h2");
title.textContent = ARTIST.release.title;
const line = document.createElement("p");
line.append(`${ARTIST.release.label}, out now. `, link(ARTIST.release.url, "Listen on Spotify"));
release.append(title, line);

// ── Live shows, rolling up like the end credits of a film ───────────────
// The list is written twice so the roll loops without a jump; the copy is
// hidden from screen readers.
const credits = document.getElementById("credits");
const creditBlock = (hidden) => {
  const block = document.createElement("div");
  block.className = "credits-block";
  if (hidden) block.setAttribute("aria-hidden", "true");
  for (const group of SHOWS) {
    const h = document.createElement("h3");
    h.textContent = group.heading;
    const ul = document.createElement("ul");
    for (const show of group.list) {
      const li = document.createElement("li");
      const place = document.createElement("span");
      place.textContent = `(${show.place})`;
      li.append(show.name, " ", place);
      ul.append(li);
    }
    block.append(h, ul);
  }
  return block;
};
credits.append(creditBlock(false), creditBlock(true));
const count = SHOWS.reduce((n, g) => n + g.list.length + 2, 0);
credits.style.setProperty("--roll-time", `${count * 2.6}s`);

// ── Footer: socials and streaming ───────────────────────────────────────
const socials = document.getElementById("socials");
for (const name of ["Instagram", "Spotify", "Apple Music", "YouTube"]) {
  const p = PLANETS.find((q) => q.name === name);
  if (!p) continue;
  const li = document.createElement("li");
  li.append(link(p.url, name));
  socials.append(li);
}

// ── The moon: a small, slowly turning, pixelated moon in the corner ─────
// Drawn in two colours (ink with gold light) with ordered dithering, so it
// matches the lo-fi page. Clicking it opens the 3D world.
const canvas = document.querySelector(".moon-disc");
const ctx = canvas.getContext("2d");
const N = canvas.width;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const INK = [0x1a, 0x22, 0x38];
const GOLD = [0xd9, 0xab, 0x52];
const TW = 256;
const TH = 128;
let tex = null; // moon brightness, TW × TH, 0..1

// Per pixel of the disc: its point on the sphere and how lit it is.
const L = (() => {
  const v = [-0.55, 0.35, 0.76];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
})();
const pix = [];
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const nx = ((x + 0.5) / N) * 2 - 1;
    const ny = ((y + 0.5) / N) * 2 - 1;
    const r2 = nx * nx + ny * ny;
    if (r2 > 1) continue;
    const nz = Math.sqrt(1 - r2);
    const light = Math.max(0, nx * L[0] - ny * L[1] + nz * L[2]);
    pix.push({
      i: (y * N + x) * 4,
      lon: Math.atan2(nx, nz),
      v: Math.min(TH - 1, Math.floor((Math.asin(ny) / Math.PI + 0.5) * TH)),
      light,
      t: BAYER[(y % 4) * 4 + (x % 4)],
    });
  }
}
const img = ctx.createImageData(N, N);

function drawMoon(turn) {
  for (const p of pix) {
    let b = 0.5;
    if (tex) {
      const u = ((((p.lon + turn) / (Math.PI * 2) + 0.5) % 1) + 1) % 1;
      b = tex[p.v * TW + Math.floor(u * TW)];
    }
    const lit = Math.min(1, (0.25 + b * 1.1) * (p.light * 1.15 + 0.06));
    const c = lit > p.t ? GOLD : INK;
    img.data[p.i] = c[0];
    img.data[p.i + 1] = c[1];
    img.data[p.i + 2] = c[2];
    img.data[p.i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

const moonImg = new Image();
moonImg.onload = () => {
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(moonImg, 0, 0, TW, TH);
  const d = g.getImageData(0, 0, TW, TH).data;
  tex = new Float32Array(TW * TH);
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < TW * TH; i++) {
    const v = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
    tex[i] = v;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  for (let i = 0; i < tex.length; i++) tex[i] = (tex[i] - lo) / (hi - lo || 1); // stretch contrast
  drawMoon(0);
};
moonImg.src = asset(MOON_TEXTURE_URL);
drawMoon(0);

// Turn slowly, a few frames a second (it's pixel art, it doesn't need 60).
if (!reduceMotion) {
  let last = 0;
  const tick = (t) => {
    if (t - last > 90) {
      last = t;
      drawMoon(t / 9000);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Into the moon ───────────────────────────────────────────────────────
const moon = document.getElementById("moon");
const wipe = document.getElementById("moon-wipe");
moon.addEventListener("click", (e) => {
  if (reduceMotion || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab etc.
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const cover = (Math.hypot(window.innerWidth, window.innerHeight) * 2) / r.width + 2;
  wipe.style.left = `${r.left}px`;
  wipe.style.top = `${r.top}px`;
  wipe.style.width = wipe.style.height = `${r.width}px`;
  wipe.classList.add("go");
  requestAnimationFrame(() => (wipe.style.transform = `scale(${cover})`));
  setTimeout(() => (location.href = moon.href), 720);
});
// Coming back with the browser's back button: clear the wipe.
window.addEventListener("pageshow", () => {
  wipe.classList.remove("go");
  wipe.style.transform = "";
});
