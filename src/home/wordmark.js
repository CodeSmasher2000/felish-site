// FELISH wordmark: custom futuristic stencil lettering, drawn as thick
// strokes on a 100-unit-tall grid. Corners are wide quarter-circle arches
// and every letter is cut into pieces by small gaps, like a stencil.
// Letters other than F, E, L, I, S, H aren't drawn; the name falls back to
// plain text then.
const S = 16; // stroke width
const GAP = 14; // space between letters

const TOP_ARCH = "M 64 8 H 34 A 26 26 0 0 0 8 34"; // top bar curving down into the stem
const BOTTOM_ARCH = "M 8 66 A 26 26 0 0 0 34 92 H 64"; // stem curving into the bottom bar

const GLYPHS = {
  F: { w: 64, d: [TOP_ARCH, "M 8 40 V 100", "M 22 52 H 50"] },
  E: { w: 64, d: [TOP_ARCH, "M 8 40 V 60", BOTTOM_ARCH, "M 22 50 H 52"] },
  L: { w: 64, d: ["M 8 0 V 60", BOTTOM_ARCH] },
  I: { w: 16, d: ["M 8 0 V 46", "M 8 54 V 100"] },
  S: {
    w: 64,
    d: [
      "M 64 8 H 34 A 26 26 0 0 0 8 34 A 16 16 0 0 0 24 50 H 30",
      "M 36 50 H 40 A 16 16 0 0 1 56 66 A 26 26 0 0 1 30 92 H 0",
    ],
  },
  H: { w: 64, d: ["M 8 0 V 100", "M 56 0 V 100", "M 20 50 H 44"] },
};

export function wordmarkSVG(text) {
  const letters = [...text.toUpperCase()];
  if (!letters.every((c) => GLYPHS[c])) return null;
  let x = 0;
  const parts = letters.map((c) => {
    const g = GLYPHS[c];
    const out = `<g transform="translate(${x} 0)">${g.d.map((d) => `<path d="${d}"/>`).join("")}</g>`;
    x += g.w + GAP;
    return out;
  });
  const width = x - GAP;
  return `<svg class="wordmark" viewBox="0 0 ${width} 100" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="${S}" stroke-linecap="butt" stroke-linejoin="miter">${parts.join("")}</g>
  </svg>`;
}
