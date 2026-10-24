import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

// Relative base: the built site works at a domain root and in a sub-folder
// (e.g. https://codesmasher2000.github.io/felish-site/) without changes.
// Two pages: the clean start page (index.html) and the 3D world behind the
// moon (space.html).
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: page("./index.html"),
        space: page("./space.html"),
      },
    },
  },
});
