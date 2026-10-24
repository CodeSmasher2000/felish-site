# Felish — space landing page

three.js + Vite. A glowing moon rotates at the centre of a deep-space scene;
four planets orbit it and link to Spotify, YouTube, Instagram and Apple Music.

## Pages

- `index.html` — the start page: clean and flat (no 3D). The name, the photo
  (`src/home/felish-cloud.jpg`: the full photo with its background widened to fill the cloud frame and an old-film look baked in; rebuild it with `python3 tools/make-cloud-photo.py original.jpg src/home/felish-cloud.jpg src/home/felish-cloud-small.jpg`), the latest
  release, links, and a small pixel moon in the top-right corner. Code and
  styles: `src/home/`. Three colours only, set at the top of
  `src/home/home.css`.
- `music.html` — opened by "Music" on the start page: the latest single's
  cover and a Play button per streaming service. Links are in `MUSIC_PAGE`
  in `src/config.js`.
- `space.html` — the 3D world (moon, planets, sphere, cave). Reached by
  clicking the moon on the start page; the name in its top-left corner links
  back. Direct links: `space.html#sphere`, `space.html#cave`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173  (add ?debug for the tweak panel)
npm run build    # outputs dist/
```

## Live site

Every push to `main` builds and publishes the site with GitHub Pages
(`.github/workflows/deploy.yml`):
https://codesmasher2000.github.io/felish-site/

Asset paths in `src/config.js` are written from the site root (`/photos/…`);
`src/app/lib/asset.js` makes them work in the Pages sub-folder too.

## Where things live

| File | What it does |
| --- | --- |
| `src/config.js` | Artist name, release line, planet links/colours/orbits, optional moon texture |
| `src/main.js` | Wires renderer, world, link overlay and the animation loop |
| `src/app/createRenderer.js` | WebGL renderer + bloom post-processing |
| `src/app/createSpaceWorld.js` | Scene, camera, controls, lights, intro fly-in, moon tap |
| `src/app/createNebula.js` | Procedural nebula backdrop (shader) |
| `src/app/createStarfield.js` | Twinkling stars |
| `src/app/createMoon.js` | Procedural moon, rim glow, spin "easter egg" |
| `src/app/createPlanets.js` | Planet meshes, rings, orbits, hover behaviour |
| `src/app/createShootingStars.js` | Meteors (random + bursts) |
| `src/app/createLinkOverlay.js` | Clickable links over planets + bottom dock |
| `src/app/createMoonPrompt.js` | "Visit my sphere?" prompt shown when the moon is tapped |
| `src/app/createSphereWorld.js` | The sphere: pastel moonscape scene (loaded on first visit) |
| `src/app/sphere/` | Its parts: terrain + hill, waterfall, pastel sky, rocks, dust, orb, palette |
| `src/app/sphere/triplanar.js` | Rock/ground surface textures projected onto terrain and boulders |
| `tools/make-textures.py` | Regenerates the surface textures in `public/textures/` |
| `src/app/setupGui.js` | lil-gui debug panel (`?debug`) |
| `src/app/lib/` | Shared helpers: glow/atmosphere, noise GLSL, seeded random |

## The sphere

Tap the moon → "Visit my sphere?" → the camera dives into the moon and you
land on a pastel moonscape with a floating iridescent orb. "Back to space" or
Esc returns. Link straight to it with `space.html#sphere`. Colours live in
`src/app/sphere/palette.js`.

Beside the landing spot is a hill with a stream on top that pours over a cliff
into a pool. Its size and position are in `HILL` at the top of
`src/app/sphere/createTerrain.js`; the water colours are at the top of
`src/app/sphere/createWaterfall.js`. A stream leaves the pool and winds
around the hill; its route is `HILL.outflow` (points in the hill's frame) and
it always runs downhill because its bed is carved into the ground. The
stream starts dry, dammed by a glowing boulder at the pool's edge: tap it to
roll it aside and let the water run; tap again to dam it and drain the stream.

Getting around the sphere (`src/app/sphere/createExplorer.js`): drag to look,
tap the ground to glide there, WASD/arrows to walk (Shift to hurry),
right-drag or two fingers to slide, scroll/pinch to zoom. The camera hugs the
terrain and never goes below it. The orb's light beam marks the landing zone
from anywhere; tap the orb or its beam to glide home.

Seven shiny photo cubes float around the landing zone, one photo each
(`src/app/sphere/createPhotoCubes.js`). Tap one to spin it and glide up close. Two of them sit right in front of
the landing view (`featured` spots in `src/app/createSphereWorld.js`).
The photos are listed in `SPHERE_PHOTOS` in `src/config.js` and live in
`public/photos/`; square images work best, and adding or removing entries
adds or removes cubes.

Six more cubes are for Instagram posts (`INSTAGRAM_POSTS` in `src/config.js`).
Each entry is `{ url, image }`: `image` is the picture on the cube (save it in
`public/photos/instagram/`), `url` is the post link. Tapping the cube opens the
post using Instagram's official embed, in a panel with an "Open on Instagram"
link. Entries without an image show a placeholder face with the handle, and
without a url the panel links to the profile.

The glowing crystal on the hilltop (the stream's spring) is a Spotify button:
tap it to glide over and open the Spotify player floating above it in the
scene (`SPOTIFY_EMBED` in `src/config.js`; on phones the player docks to the
bottom of the screen). Close with ×, or Esc.

## The cave

Tap the waterfall in the sphere → you glide up to it → "Do you want to enter?" → you step through
the water into a cosy cave: lanterns (one hanging), candles, ferns, broad-leaf
plants, vines swaying from the ceiling, glowing mushrooms and fireflies, with
the waterfall pouring into a pool at the back and glitter drifting in from it. Drag to look around, scroll or
pinch to zoom. Tap a mushroom and everything glows up for a moment. "Back
outside", Esc or tapping the waterfall returns you to the sphere where you
were. Link straight to it with `space.html#cave`. The world is
`src/app/createCaveWorld.js`; its parts (rock shell, plants, lights, water)
are in `src/app/cave/`.

The ground and boulders use generated textures (`public/textures/regolith_*`
and `rock_*`). To change their look, edit and rerun
`python3 tools/make-textures.py` (needs numpy and Pillow).

## Press kit

The little red heart beside the moon is a download link for the EPK
(`public/downloads/Felish-EPK-2026.pdf`, set in `EPK` in `src/config.js`).
To update the press kit, replace that PDF (or point `EPK.url` at a new file).

## Moon texture

The moon uses `public/textures/moon.jpg` (an equirectangular colour map).
To change it, replace that file or point `MOON_TEXTURE_URL` in
`src/config.js` somewhere else. Set it to `null` for the procedural moon.

## Adding a link / planet

Add an entry to `PLANETS` in `src/config.js`. Everything else — the 3D
planet, its orbit, the hover label and the dock button — is generated from it.
