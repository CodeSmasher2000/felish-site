import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { MOON_LOOK } from "./createMoon.js";

// Loaded only when the URL has ?debug — handy for tuning the look.
export function setupGui({ renderer, bloomPass, world }) {
  const gui = new GUI({ title: "Felish debug" });

  const look = gui.addFolder("Look");
  look.add(renderer, "toneMappingExposure", 0.3, 2, 0.01).name("exposure");
  look.add(world.lights.sun, "intensity", 0, 20, 0.1).name("sun");
  look.add(world.lights.rim, "intensity", 0, 10, 0.1).name("rim light");

  const moon = gui.addFolder("Moon");
  moon.add(MOON_LOOK, "surfaceBrightness", 0, 1, 0.01).name("surface brightness");
  moon.add(MOON_LOOK, "surfaceGlow", 0, 0.5, 0.01).name("surface glow");
  moon.add(MOON_LOOK, "rimGlow", 0, 5, 0.05).name("rim glow");
  moon.add(MOON_LOOK, "haloGlow", 0, 1.5, 0.01).name("halo");
  moon.add(MOON_LOOK, "outerGlow", 0, 1, 0.01).name("outer haze");

  const bloom = gui.addFolder("Bloom");
  bloom.add(bloomPass, "strength", 0, 3, 0.01);
  bloom.add(bloomPass, "radius", 0, 1, 0.01);
  bloom.add(bloomPass, "threshold", 0, 1, 0.01);

  const motion = gui.addFolder("Motion");
  motion.add(world.controls, "autoRotate");
  motion.add(world.controls, "autoRotateSpeed", 0, 2, 0.01);
  motion.add({ meteor: () => world.meteors.spawn(false) }, "meteor").name("shoot a star");

  return gui;
}
