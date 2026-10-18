// Everything content-related lives here, so links and copy can change
// without touching the 3D code.

export const ARTIST = {
  name: "FELISH",
  // Latest release — shown as the glowing card under the name
  release: {
    title: "All My Exes",
    label: "New single",
    cta: "Listen now",
    url: "https://open.spotify.com/track/4bDmtsjbXRWD7zIeYQVrac",
  },
};

// Each planet = one link. `pal` is a dark→light palette for the planet's
// procedural surface; `dot` is its accent (glow, orbit line, dock dot).
export const PLANETS = [
  {
    name: "Spotify",
    verb: "Listen",
    url: "https://open.spotify.com/artist/7jNi5RJPShMZj5Z7GDxtUh",
    pal: ["#062a15", "#128a3e", "#1ed760", "#b8f7cf"],
    dot: "#1ed760",
    radius: 0.55,
    orbit: 5.0,
    speed: 0.2,
    tilt: 0.22,
    phase: 0.4,
  },
  {
    name: "YouTube",
    verb: "Watch",
    url: "https://www.youtube.com/watch?v=F8DkLJZMWb0",
    pal: ["#2a0303", "#8f0d0d", "#ff2b2b", "#ffb199"],
    dot: "#ff3b3b",
    radius: 0.48,
    orbit: 6.5,
    speed: 0.15,
    tilt: -0.17,
    phase: 2.3,
  },
  {
    name: "Instagram",
    verb: "Follow",
    url: "https://www.instagram.com/felishofficial/",
    pal: ["#4f2bc9", "#d62976", "#fa7e1e", "#feda75"],
    dot: "#e1306c",
    radius: 0.5,
    orbit: 7.9,
    speed: 0.11,
    tilt: 0.11,
    phase: 4.1,
    swirl: true,
  },
  {
    name: "Apple Music",
    verb: "Stream",
    url: "https://music.apple.com/se/album/lylid-ep/1543833011",
    pal: ["#24050f", "#8c0f2c", "#fa2d48", "#ffc2cc"],
    dot: "#fa2d48",
    radius: 0.62,
    orbit: 9.4,
    speed: 0.08,
    tilt: -0.07,
    phase: 5.6,
    ring: true,
  },
];

// Equirectangular moon colour map in /public/textures/.
// Set to null to fall back to the procedural moon.
export const MOON_TEXTURE_URL = "/textures/moon.jpg";
