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
| `src/app/setupGui.js` | lil-gui debug panel (`?debug`) |
| `src/app/lib/` | Shared helpers: glow/atmosphere, noise GLSL, seeded random |

## Using a real moon texture

Put an equirectangular moon map in `public/textures/` (NASA's CGI Moon Kit
colour map works well) and set `MOON_TEXTURE_URL = "/textures/moon.jpg"` in
`src/config.js`.

## Adding a link / planet

Add an entry to `PLANETS` in `src/config.js`. Everything else — the 3D
planet, its orbit, the hover label and the dock button — is generated from it.
