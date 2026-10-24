// FELISH wordmark, in the style of the "Gear" typeface: each letter sits in
// its own square, drawn over a fine construction grid (quarter lines and
// circles), with the letter itself traced in one heavy, rounded stroke.
// The E and F are two stacked arcs that meet in a point at the middle bar.
// Letters other than F, E, L, I, S, H aren't drawn; the name falls back to
// plain text then.
const CELL = 100; // each letter's square
const WEIGHT = 15; // letter stroke

const UPPER_ARC = "M 90 14 H 46 A 32 32 0 0 0 14 46 L 9 50"; // top bar curving down to the middle point
const GLYPHS = {
  F: [UPPER_ARC, "M 9 50 L 14 54 V 100", "M 9 50 H 90"],
  E: [UPPER_ARC, "M 9 50 L 14 54 A 32 32 0 0 0 46 86 H 90", "M 9 50 H 90"],
  L: ["M 26 0 V 58 A 30 30 0 0 0 56 88 H 94"],
  I: ["M 50 0 V 100"],
  S: ["M 90 14 H 44 A 18 18 0 0 0 44 50 H 56 A 18 18 0 0 1 56 86 H 10"],
  H: ["M 14 0 V 100", "M 86 0 V 100", "M 14 50 H 86"],
};

// The construction grid behind one letter.
const GRID = [
  `<rect x="0.6" y="0.6" width="${CELL - 1.2}" height="${CELL - 1.2}"/>`,
  ...[25, 50, 75].map((v) => `<path d="M ${v} 0 V ${CELL} M 0 ${v} H ${CELL}"/>`),
  `<circle cx="50" cy="50" r="50"/>`,
  `<circle cx="50" cy="31" r="13"/>`,
  `<circle cx="50" cy="69" r="13"/>`,
].join("");

export function wordmarkSVG(text) {
  const letters = [...text.toUpperCase()];
  if (!letters.every((c) => GLYPHS[c])) return null;
  const cells = letters
    .map((c, i) => {
      const paths = GLYPHS[c].map((d) => `<path d="${d}"/>`).join("");
      return `<g transform="translate(${i * CELL} 0)">
        <g class="wordmark-grid" stroke-width="1.1" opacity="0.55">${GRID}</g>
        <g stroke-width="${WEIGHT}" stroke-linejoin="round" stroke-linecap="butt">${paths}</g>
      </g>`;
    })
    .join("");
  return `<svg class="wordmark" viewBox="-1 -1 ${letters.length * CELL + 2} ${CELL + 2}" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor">${cells}</g>
  </svg>`;
}
