// Everything content-related lives here, so links and copy can change
// without touching the 3D code.

export const ARTIST = {
  name: "ISEYA GOLD",
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

// Photos shown on the shiny cubes scattered around the sphere, one per cube.
// Square images work best (they're in /public/photos/).
export const SPHERE_PHOTOS = [
  "/photos/guitar.jpg",
  "/photos/headscarf.jpg",
  "/photos/palm.jpg",
  "/photos/purple-night.jpg",
  "/photos/can-i-be-sad-too.jpg",
  "/photos/puzzle-piece.jpg",
  "/photos/veil.jpg",
];

// Instagram cubes in the sphere: one cube per post. The cube shows `image`
// (save the post's picture into /public/photos/instagram/), and tapping it
// opens the real post, embedded, in a panel. Fill in `url` with the post's
// link (https://www.instagram.com/p/… or /reel/…). Until then a cube shows a
// placeholder with the handle and links to the profile.
export const INSTAGRAM = {
  handle: "felishofficial",
  profile: "https://www.instagram.com/felishofficial/",
};
export const INSTAGRAM_POSTS = [
  { url: "https://www.instagram.com/reel/DelwhaMAdHm/", image: null },
  { url: "https://www.instagram.com/reel/DaCjBiTADM7/", image: null },
  { url: "https://www.instagram.com/p/DSRwQdzDGQx/", image: null },
  { url: "https://www.instagram.com/reel/DQtq5NIjA7I/", image: null },
  { url: "https://www.instagram.com/p/DaNIBuCgBiv/", image: null },
  { url: null, image: null }, // sixth post still to come — links to the profile for now
];

// Spotify player that opens above the glowing crystal on top of the hill.
export const SPOTIFY_EMBED = "https://open.spotify.com/embed/artist/7jNi5RJPShMZj5Z7GDxtUh?utm_source=generator";
