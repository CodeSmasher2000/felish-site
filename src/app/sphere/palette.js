// The sphere's pastel palette, shared by sky, ground, rocks, dust and orb.
// Warm golden-hour pastels: deeper and less white than plain pastels.
export const PASTEL = {
  lavender: "#b6a3dc",
  lilac: "#d2b1dc",
  pink: "#eeb1c4",
  peach: "#f4c09f",
  mint: "#bcdcc6",
  cream: "#f3d9c0",
  periwinkle: "#7a69bf",
  horizon: "#ffc2a0",
};

// Ground colours. Dark: black volcanic sand with a faint violet tint, so the
// pastel sky, the waterfall and the cubes glow against it. Set DARK_GROUND
// to false for the original pastel ground.
export const DARK_GROUND = true;
export const GROUND = DARK_GROUND
  ? {
      ramp: ["#141118", "#1c1820", "#262029", "#332a34"], // low → high
      patch: "#182224", // faint teal patches
      floor: "#1b1526", // crater floors
      rim: "#3a3040", // crater rims
      shade: "#0e0c11", // steep slopes
      wetBank: "#1c2a27", // damp banks by the water
    }
  : {
      ramp: [PASTEL.lavender, PASTEL.pink, PASTEL.peach, PASTEL.cream],
      patch: PASTEL.mint,
      floor: PASTEL.lilac,
      rim: PASTEL.cream,
      shade: "#9585b4", // lavender × 0.82
      wetBank: "#c5c7d0", // mint toward lilac
    };
