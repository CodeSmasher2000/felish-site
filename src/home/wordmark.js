// FELISH wordmark: custom futuristic lettering, drawn as thick strokes on a
// 100-unit-tall grid. F, E and L are solid, square-cornered blocks; I, S and H are cut
// into pieces by small gaps, like a stencil, and the S is built from arches.
// Letters other than F, E, L, I, S, H aren't drawn; the name falls back to
// plain text then.
const S = 18; // stroke width
const GAP = 14; // space between letters

const GLYPHS = {
  // E and F: heavy, square-cornered, with the spine bent into a shallow ">"
  // that points out at the middle bar. L is a plain solid block.
  E: { w: 60, fill: ["M0 0H60V19H23L26.6 41H56V59H26.6L23 81H60V100H0L8 50Z"] },
  F: { w: 60, fill: ["M0 0H60V19H23L26.6 41H55V59H26.6L20 100H0L8 50Z"] },
  L: { w: 60, fill: ["M0 0H19V81H60V100H0Z"] },
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
  // 3D fold: letters lean alternately up and down, like the faces of a
  // folded strip (an accordion), and every other one is a shade darker, as
  // if turned away from the light.
  const TILT = 11; // degrees
  let x = 0;
  const parts = letters.map((c, i) => {
    const g = GLYPHS[c];
    const tilt = i % 2 ? TILT : -TILT;
    const shade = i % 2 ? "var(--wordmark-shade, currentColor)" : "currentColor";
    const strokes = (g.d ?? []).map((d) => `<path d="${d}"/>`).join("");
    const fills = (g.fill ?? []).map((d) => `<path d="${d}" fill="${shade}" stroke="none"/>`).join("");
    const fold = `translate(${x + g.w / 2} 50) skewY(${tilt}) translate(${-g.w / 2} -50)`;
    const out = `<g transform="${fold}" stroke="${shade}">${strokes}${fills}</g>`;
    x += g.w + GAP;
    return out;
  });
  const width = x - GAP;
  return `<svg class="wordmark" viewBox="0 -8 ${width} 116" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="${S}" stroke-linecap="butt" stroke-linejoin="miter">${parts.join("")}</g>
  </svg>`;
}
