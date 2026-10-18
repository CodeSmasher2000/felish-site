import { defineConfig } from "vite";

// Relative base: the built site works at a domain root and in a sub-folder
// (e.g. https://codesmasher2000.github.io/felish-site/) without changes.
export default defineConfig({
  base: "./",
});
