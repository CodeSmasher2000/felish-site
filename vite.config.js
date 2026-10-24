import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

// Relative base: the built site works at a domain root and in a sub-folder
// (e.g. https://codesmasher2000.github.io/felish-site/) without changes.
// Pages: the clean start page (index.html), the 3D world behind the moon
// (space.html) and the streaming links for the latest song (music.html).
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: page("./index.html"),
        space: page("./space.html"),
        music: page("./music.html"),
      },
    },
  },
});
