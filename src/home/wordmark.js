// FELISH wordmark: custom futuristic lettering on a 100-unit-tall grid —
// heavy, solid letters with sharp blade-cut bar ends, a bent spine on E and
// F, a pointed I and an S built from arches.
// Letters other than F, E, L, I, S, H aren't drawn; the name falls back to
// plain text then.
const S = 18; // stroke width
const GAP = 14; // space between letters

// Solid letters (no cuts), each one piece. Bars end in sharp diagonal
// blades, E and F keep their spine bent into a shallow ">".
const GLYPHS = {
  E: { w: 62, fill: ["M0 0H62L50 19H23L26.6 41H56L46 59H26.6L23 81H50L62 100H0L8 50Z"] },
  F: { w: 62, fill: ["M0 0H62L50 19H23L26.6 41H56L46 59H26.6L20 100H0L8 50Z"] },
  L: { w: 62, fill: ["M0 0H19V81H50L62 100H0Z"] },
  I: { w: 19, fill: ["M0 12L9.5 0L19 12V100H0Z"] }, // pointed top
  S: {
    w: 64,
    d: ["M 64 9 H 34 A 25 25 0 0 0 9 34 A 16 16 0 0 0 25 50 H 39 A 16 16 0 0 1 55 66 A 25 25 0 0 1 30 91 H 0"],
  },
  H: { w: 62, fill: ["M0 0H19V41H43V0H62V100H43V59H19V100H0Z"] },
};

export function wordmarkSVG(text) {
  const letters = [...text.toUpperCase()];
  if (!letters.every((c) => GLYPHS[c])) return null;
  let x = 0;
  const parts = letters.map((c) => {
    const g = GLYPHS[c];
    const strokes = (g.d ?? []).map((d) => `<path d="${d}"/>`).join("");
    const fills = (g.fill ?? []).map((d) => `<path d="${d}" fill="currentColor" stroke="none"/>`).join("");
    const out = `<g transform="translate(${x} 0)">${strokes}${fills}</g>`;
    x += g.w + GAP;
    return out;
  });
  const width = x - GAP;
  return `<svg class="wordmark" viewBox="0 0 ${width} 100" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="${S}" stroke-linecap="butt" stroke-linejoin="miter">${parts.join("")}</g>
  </svg>`;
}
