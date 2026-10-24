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

// ── Name: set in the Gear typeface (see home.css) ──────────────────────
// Each letter in its own span so single pairs can be spaced (L–I closer).
const nameEl = document.getElementById("name");
nameEl.setAttribute("aria-label", ARTIST.name);
nameEl.replaceChildren(
  ...[...ARTIST.name].map((c, i, all) => {
    const span = document.createElement("span");
    span.textContent = c;
    span.dataset.c = c; // the solid fill letter, drawn underneath
    span.setAttribute("aria-hidden", "true");
    if (c.toUpperCase() === "I" && all[i - 1]?.toUpperCase() === "L") span.className = "tuck";
    return span;
  }),
);

// ── Top links ───────────────────────────────────────────────────────────
document
  .getElementById("nav")
  .append(
    Object.assign(document.createElement("a"), { href: "./music.html", textContent: "Music" }),
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
// Simple icons, drawn in the text colour (currentColor).
const ICONS = {
  Instagram: `<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/>`,
  Spotify: `<circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M7 9.4c3.4-1 7.3-.7 10.2.9M7.6 12.5c2.8-.8 5.9-.5 8.3.8M8.2 15.4c2.2-.6 4.5-.4 6.4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  "Apple Music": `<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M10 15.5V8.2l6-1.4v7.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <ellipse cx="8.6" cy="15.6" rx="1.7" ry="1.4" fill="currentColor"/>
    <ellipse cx="14.6" cy="14.1" rx="1.7" ry="1.4" fill="currentColor"/>`,
  YouTube: `<rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M10.2 9.2v5.6l4.8-2.8z" fill="currentColor"/>`,
};
const socials = document.getElementById("socials");
for (const name of ["Instagram", "Spotify", "Apple Music", "YouTube"]) {
  const p = PLANETS.find((q) => q.name === name);
  if (!p) continue;
  const li = document.createElement("li");
  const a = link(p.url, "");
  a.setAttribute("aria-label", name);
  a.title = name;
  a.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${ICONS[name]}</svg>`;
  li.append(a);
  socials.append(li);
}

// ── The cloud: bounces slowly around the page, raining gold ─────────────
// Like an old screensaver: it drifts in a straight line and bounces off the
// edges of the screen. Gold rain falls from its flat underside, and every
// few seconds a gold thunderbolt cracks down from it and the cloud lights up.
const GOLD_RAIN = "200, 150, 72"; // the gold of the guitar's pickguard
const GOLD_BOLT = "#f2c46b";
const cloud = document.querySelector(".photo");
const sky = document.getElementById("sky");
const sg = sky.getContext("2d");
let dpr = 1;
function sizeSky() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  sky.width = Math.round(window.innerWidth * dpr);
  sky.height = Math.round(window.innerHeight * dpr);
}
sizeSky();
window.addEventListener("resize", sizeSky);

const pos = { x: window.innerWidth * 0.55, y: window.innerHeight * 0.22 };
const speed = window.innerWidth < 900 ? 34 : 46; // px per second
const vel = { x: speed * 0.8, y: speed * 0.6 };
const drops = [];
let bolt = null; // { path: [[x,y]...], branches, life }
let nextBolt = 3 + Math.random() * 4;
let carry = 0;

function placeCloud() {
  cloud.style.translate = `${pos.x}px ${pos.y}px`;
}

function makeBolt(x, y) {
  const bottom = Math.min(window.innerHeight - 10, y + 160 + Math.random() * window.innerHeight * 0.4);
  const path = [[x, y]];
  const branches = [];
  let cx = x;
  let cy = y;
  while (cy < bottom) {
    cy += 14 + Math.random() * 22;
    cx += (Math.random() - 0.5) * 38;
    path.push([cx, cy]);
    if (Math.random() < 0.18) {
      const b = [[cx, cy]];
      let bx = cx;
      let by = cy;
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let k = 0; k < 3 + Math.random() * 3; k++) {
        bx += dir * (8 + Math.random() * 16);
        by += 10 + Math.random() * 16;
        b.push([bx, by]);
      }
      branches.push(b);
    }
  }
  return { path, branches, life: 0 };
}

function strokePath(pts, width) {
  sg.beginPath();
  sg.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) sg.lineTo(x, y);
  sg.lineWidth = width;
  sg.stroke();
}

let lastT = performance.now();
function skyTick(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  const w = cloud.offsetWidth;
  const h = cloud.offsetHeight;
  const W = window.innerWidth;
  const H = window.innerHeight;

  // Bounce off the edges of the screen.
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  const minY = 8;
  const maxY = Math.max(minY, H - h - 90); // leave room under it for the rain
  if (pos.x < 0) { pos.x = 0; vel.x = Math.abs(vel.x); }
  if (pos.x > W - w) { pos.x = W - w; vel.x = -Math.abs(vel.x); }
  if (pos.y < minY) { pos.y = minY; vel.y = Math.abs(vel.y); }
  if (pos.y > maxY) { pos.y = maxY; vel.y = -Math.abs(vel.y); }
  placeCloud();

  // Rain from the flat underside of the cloud.
  carry += dt * (w / 6);
  while (carry >= 1) {
    carry -= 1;
    drops.push({
      x: pos.x + w * (0.08 + Math.random() * 0.84),
      y: pos.y + h * 0.9,
      v: 380 + Math.random() * 220,
      len: 9 + Math.random() * 9,
    });
  }
  sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  sg.clearRect(0, 0, W, H);
  sg.lineCap = "round";
  sg.lineWidth = 1.3;
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.y += d.v * dt;
    d.x += vel.x * dt * 0.3; // drift a little with the cloud
    if (d.y > H) {
      drops.splice(i, 1);
      continue;
    }
    const fade = Math.min(1, (H - d.y) / 160);
    sg.strokeStyle = `rgba(${GOLD_RAIN}, ${0.55 * fade})`;
    sg.beginPath();
    sg.moveTo(d.x, d.y);
    sg.lineTo(d.x - 1.5, d.y + d.len);
    sg.stroke();
  }

  // Thunder.
  nextBolt -= dt;
  if (nextBolt <= 0 && !bolt) {
    bolt = makeBolt(pos.x + w * (0.3 + Math.random() * 0.4), pos.y + h * 0.88);
    nextBolt = 5 + Math.random() * 7;
  }
  if (bolt) {
    bolt.life += dt;
    // on – off – on, then gone
    const on = bolt.life < 0.09 || (bolt.life > 0.16 && bolt.life < 0.42);
    cloud.classList.toggle("flash", on);
    if (on) {
      const fade = bolt.life > 0.16 ? 1 - (bolt.life - 0.16) / 0.26 : 1;
      sg.save();
      sg.globalAlpha = Math.max(0, fade);
      sg.fillStyle = "rgba(242, 196, 107, 0.07)";
      sg.fillRect(0, 0, W, H); // a faint gold flash over the page
      sg.strokeStyle = GOLD_BOLT;
      sg.shadowColor = GOLD_BOLT;
      sg.shadowBlur = 18;
      strokePath(bolt.path, 3);
      for (const b of bolt.branches) strokePath(b, 1.6);
      sg.shadowBlur = 0;
      sg.strokeStyle = "#fff6dc";
      strokePath(bolt.path, 1.1);
      sg.restore();
    }
    if (bolt.life > 0.5) {
      bolt = null;
      cloud.classList.remove("flash");
    }
  }
  requestAnimationFrame(skyTick);
}

if (reduceMotion) {
  // Still: the cloud rests in the upper right, no rain or thunder.
  pos.x = window.innerWidth - cloud.offsetWidth - 40;
  pos.y = window.innerHeight * 0.18;
  placeCloud();
} else {
  placeCloud();
  requestAnimationFrame(skyTick);
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
