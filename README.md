# Felish — space landing page

three.js + Vite. A glowing moon rotates at the centre of a deep-space scene;
four planets orbit it and link to Spotify, YouTube, Instagram and Apple Music.

## Run

```bash
npm install
npm run dev      # http://localhost:5173  (add ?debug for the tweak panel)
npm run build    # outputs dist/
```

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
Esc returns. Link straight to it with `/#sphere`. Colours live in
`src/app/sphere/palette.js`.

Beside the landing spot is a hill with a stream on top that pours over a cliff
into a pool. Its size and position are in `HILL` at the top of
`src/app/sphere/createTerrain.js`; the water colours are at the top of
`src/app/sphere/createWaterfall.js`.

The ground and boulders use generated textures (`public/textures/regolith_*`
and `rock_*`). To change their look, edit and rerun
`python3 tools/make-textures.py` (needs numpy and Pillow).

## Moon texture

The moon uses `public/textures/moon.jpg` (an equirectangular colour map).
To change it, replace that file or point `MOON_TEXTURE_URL` in
`src/config.js` somewhere else. Set it to `null` for the procedural moon.

## Adding a link / planet

Add an entry to `PLANETS` in `src/config.js`. Everything else — the 3D
planet, its orbit, the hover label and the dock button — is generated from it.
