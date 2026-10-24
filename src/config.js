// Everything content-related lives here, so links and copy can change
// without touching the 3D code.

export const ARTIST = {
  name: "FELISH",
  // Latest release — shown as the glowing card under the name
  release: {
    title: "All My Exes",
    label: "New single",
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
    tilt: 0.22,
  },
  {
    name: "YouTube",
    verb: "Watch",
    url: "https://www.youtube.com/watch?v=F8DkLJZMWb0",
    pal: ["#2a0303", "#8f0d0d", "#ff2b2b", "#ffb199"],
    dot: "#ff3b3b",
    radius: 0.48,
    orbit: 6.5,
    tilt: -0.17,
  },
  {
    name: "Instagram",
    verb: "Follow",
    url: "https://www.instagram.com/felishofficial/",
    pal: ["#4f2bc9", "#d62976", "#fa7e1e", "#feda75"],
    dot: "#e1306c",
    radius: 0.5,
    orbit: 7.9,
    tilt: 0.11,
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
    tilt: -0.07,
    ring: true,
  },
];

// Equirectangular moon colour map in /public/textures/.
// Set to null to fall back to the procedural moon.
export const MOON_TEXTURE_URL = "/textures/moon.jpg";

// Photo blended into the space background on the start page, upper middle.
// opacity: 0–1 (how see-through), size: share of the screen height, lift: how
// far above centre. Set to null to remove it.
export const SPACE_BACKDROP = {
  url: "/textures/space-backdrop.jpg",
  opacity: 0.35,
  size: 0.78,
  lift: 0.2,
};

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

// Press kit download: the red heart floating beside the moon in space.
export const EPK = {
  url: "/downloads/Felish-EPK-2026.pdf",
  fileName: "Felish-EPK-2026.pdf",
  label: "Press kit",
  panelLabel: "Felish EPK", // the small panel in the top corner
};

// Live shows, rolling like end credits on the start page. `place` is a short
// country code shown in brackets after the name.
export const SHOWS = [
  {
    heading: "Live 2025–26",
    list: [
      { name: "Way Out West", place: "SWE" },
      { name: "Saarang World Fest", place: "IND" },
      { name: "Mejeriet, Lund", place: "SWE" },
      { name: "Danmarks Radio & Television", place: "DK" },
      { name: "CPH Alternative Fashion Week", place: "DK" },
      { name: "Zoku Hotel", place: "DK" },
      { name: "Ystad Saltsjöbad", place: "SWE" },
    ],
  },
  {
    heading: "Previous years",
    list: [
      { name: "NAMM Exhibit", place: "US" },
      { name: "Make Music Pasadena", place: "US" },
      { name: "The Greek Theatre, Hollywood", place: "US" },
      { name: "Live at Heart, Örebro", place: "SWE" },
      { name: "Liljevalchs Museum, Stockholm", place: "SWE" },
    ],
  },
];

// The "Music" page: one place to pick a streaming service for the latest
// release. `exact: false` means no direct link to the song was found on that
// service yet, so it opens a search for it there — replace `url` with the
// song's own link when you have it.
export const MUSIC_PAGE = {
  title: "All My Exes",
  cover: "https://i.scdn.co/image/ab67616d0000b273897daca7ae8c3db960624800", // the single's artwork
  services: [
    { id: "youtube", name: "YouTube", url: "https://www.youtube.com/results?search_query=Felish+All+My+Exes", exact: false },
    { id: "spotify", name: "Spotify", url: "https://open.spotify.com/track/4bDmtsjbXRWD7zIeYQVrac", exact: true },
    { id: "apple", name: "Apple Music", url: "https://music.apple.com/album/all-my-exes-single/6780356474", exact: true },
    { id: "deezer", name: "Deezer", url: "https://www.deezer.com/track/4087042871", exact: true },
    { id: "amazon", name: "Amazon Music", url: "https://music.amazon.com/search/Felish%20All%20My%20Exes", exact: false },
    { id: "ytmusic", name: "YouTube Music", url: "https://music.youtube.com/search?q=Felish+All+My+Exes", exact: false },
    { id: "tidal", name: "TIDAL", url: "https://tidal.com/search?q=Felish%20All%20My%20Exes", exact: false },
  ],
};
