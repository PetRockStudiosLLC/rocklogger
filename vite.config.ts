import { defineConfig } from "vite";

// base './' so the app works from any static host (and PWA installs work
// from localhost, itch-style zips, or GitHub Pages).
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
