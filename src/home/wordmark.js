// FELISH wordmark: custom futuristic stencil lettering on a 100-unit-tall
// grid: heavy strokes cut apart by small gaps, with bars that sweep out of
// the stems and taper to flared tips, a pointed I and an S built of arches.
// Letters other than F, E, L, I, S, H aren't drawn; the name falls back to
// plain text then.
const S = 18; // stroke width
const GAP = 14; // space between letters

// Shared pieces, in the style of the reference: heavy strokes, separated by
// stencil gaps, with bars that sweep out from the stem in a concave curve
// and taper to a sharp, flared tip (like the eaves of a roof).
const ROOF = "M0 0H62V5Q36 6 26 22H0Z"; // top bar, flaring out to the right
const FLOOR = "M0 100H62V95Q36 94 26 78H0Z"; // bottom bar, the same upside down
const BLADE = "M28 41H54V44Q40 46 36 59H28Z"; // floating middle bar

const GLYPHS = {
  F: { w: 62, fill: [ROOF, "M0 26H18L24 50L18 100H0L6 50Z", BLADE] },
  E: { w: 62, fill: [ROOF, "M0 26H18L24 50L18 74H0L6 50Z", BLADE, FLOOR] },
  L: { w: 62, fill: ["M0 0H18V74H0Z", FLOOR] },
  // I: a stem with a pointed cap, cut apart like the roof's peak
  I: { w: 18, fill: ["M0 18Q3 8 9 0Q15 8 18 18Z", "M0 23H18V100H0Z"] },
  S: {
    w: 64,
    d: [
      "M 64 9 H 34 A 25 25 0 0 0 9 34 A 16 16 0 0 0 25 50 H 30",
      "M 36 50 H 39 A 16 16 0 0 1 55 66 A 25 25 0 0 1 30 91 H 0",
    ],
  },
  // H: two stems and a crossbar with a V cut into it
  H: { w: 62, fill: ["M0 0H18V100H0Z", "M44 0H62V100H44Z", "M22 40L31 49L40 40V58H22Z"] },
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
