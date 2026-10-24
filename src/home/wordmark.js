// FELISH wordmark: custom futuristic lettering, drawn as thick strokes on a
// 100-unit-tall grid. F, E and L are square-cornered; I, S and H are cut
// into pieces by small gaps, like a stencil, and the S is built from arches.
// Letters other than F, E, L, I, S, H aren't drawn; the name falls back to
// plain text then.
const S = 16; // stroke width
const GAP = 14; // space between letters

const GLYPHS = {
  // F, E and L have hard, square corners. E is a plain, solid E (like the
  // old rounded font); F keeps a floating middle bar.
  F: { w: 60, d: ["M 60 8 H 8 V 100", "M 22 52 H 50"] },
  E: { w: 60, d: ["M 60 8 H 8 V 92 H 60", "M 8 50 H 52"] },
  L: { w: 60, d: ["M 8 0 V 92 H 60"] },
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
