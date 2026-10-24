import "./music.css";
import { ARTIST, MUSIC_PAGE } from "../config.js";
import { wordmarkSVG } from "../home/wordmark.js";
const fallbackCover = new URL("../home/felish-cloud-small.jpg", import.meta.url).href;

// Small service logos (simple shapes in each service's own colour).
const LOGOS = {
  youtube: `<rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="#ff0033"/><path d="M10 9v6l5.2-3z" fill="#fff"/>`,
  spotify: `<circle cx="12" cy="12" r="10.5" fill="#1ed760"/>
    <path d="M6.6 9.3c3.6-1.1 7.8-.8 10.9 1M7.2 12.6c3-.9 6.4-.6 9 .9M7.8 15.7c2.4-.7 4.9-.5 7 .7" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round"/>`,
  apple: `<defs><linearGradient id="am" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fa5c71"/><stop offset="1" stop-color="#e3243c"/></linearGradient></defs>
    <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="url(#am)"/>
    <path d="M10 16V7.6l6.4-1.5v8.3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
    <ellipse cx="8.4" cy="16.1" rx="1.8" ry="1.5" fill="#fff"/><ellipse cx="14.8" cy="14.5" rx="1.8" ry="1.5" fill="#fff"/>`,
  deezer: `<g fill="#a238ff">${[0, 1, 2, 3, 4, 5, 6]
    .map((k) => {
      const h = [6, 10, 14, 18, 14, 10, 6][k];
      return `<rect x="${1.5 + k * 3}" y="${12 - h / 2}" width="2.2" height="${h}" rx="1.1"/>`;
    })
    .join("")}</g>`,
  amazon: `<rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#25d1da"/>
    <path d="M6 13.2c3.6 2.4 8.4 2.4 12 0" fill="none" stroke="#0f1111" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M16.2 12.4l2 .8-.6 2" fill="none" stroke="#0f1111" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="12" y="10.6" text-anchor="middle" font-family="Arial, sans-serif" font-size="5.6" font-weight="700" fill="#0f1111">music</text>`,
  ytmusic: `<circle cx="12" cy="12" r="10.5" fill="#ff0033"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M10.4 9.6v4.8l4-2.4z" fill="#fff"/>`,
  tidal: `<g fill="#000"><path d="M6 6l3 3-3 3-3-3z"/><path d="M12 6l3 3-3 3-3-3z"/><path d="M18 6l3 3-3 3-3-3z"/><path d="M12 12l3 3-3 3-3-3z"/></g>`,
};

const homeLink = document.querySelector(".music-home");
const mark = wordmarkSVG(ARTIST.name);
if (mark) homeLink.innerHTML = mark;

document.getElementById("title").textContent = `${ARTIST.name} – ${MUSIC_PAGE.title}`;

const cover = document.getElementById("cover");
cover.alt = `${MUSIC_PAGE.title} cover art`;
cover.addEventListener("error", () => (cover.src = fallbackCover), { once: true });
cover.src = MUSIC_PAGE.cover || fallbackCover;

const list = document.getElementById("services");
for (const s of MUSIC_PAGE.services) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = s.url;
  a.target = "_blank";
  a.rel = "noopener";
  a.className = "service";
  a.setAttribute("aria-label", `Play ${MUSIC_PAGE.title} on ${s.name}`);
  a.innerHTML = `
    <span class="service-logo"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">${LOGOS[s.id] ?? ""}</svg></span>
    <span class="service-name">${s.name}</span>
    <span class="service-play">Play</span>`;
  li.append(a);
  list.append(li);
}
