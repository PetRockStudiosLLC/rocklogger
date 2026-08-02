#!/usr/bin/env node
// gen-android-icons.mjs — generate Android launcher icons from assets/icon.png
// Pure JS (pngjs) — works on Termux where sharp fails to install.
// Produces: ic_launcher.png, ic_launcher_round.png (full-bleed) + adaptive
// foreground layers (safe-zone zoomed). Background = solid deep green.
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(import.meta.dirname, "..", "assets", "icon.png");
const RES = path.join(import.meta.dirname, "..", "android", "app", "src", "main", "res");

const SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

// Adaptive foreground safe zone: icon content should occupy ~66% of canvas.
const SAFE = 0.66;
const BG = { r: 19, g: 63, b: 49 }; // deep green (#133F31)

function load(src) {
  const data = fs.readFileSync(src);
  return PNG.sync.read(data);
}

// Bilinear-ish resize: simple box average for downscale (fast + decent).
function resize(src, size) {
  const out = new PNG({ width: size, height: size });
  const scale = src.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // sample center of source pixel block
      const sx = Math.min(src.width - 1, Math.floor((x + 0.5) * scale));
      const sy = Math.min(src.height - 1, Math.floor((y + 0.5) * scale));
      const si = (sy * src.width + sx) * 4;
      const di = (y * size + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

// Full-bleed icon: resize source to fill, no background needed (source is opaque).
function fullBleed(src, size) {
  return resize(src, size);
}

// Adaptive foreground: place the icon in the safe zone over a transparent bg.
function foreground(src, size) {
  const out = new PNG({ width: size, height: size });
  // transparent
  out.data.fill(0);
  const inner = Math.round(size * SAFE);
  const off = Math.round((size - inner) / 2);
  const scale = src.width / inner;
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x + 0.5) * scale));
      const sy = Math.min(src.height - 1, Math.floor((y + 0.5) * scale));
      const si = (sy * src.width + sx) * 4;
      const di = ((y + off) * size + (x + off)) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

function background(size) {
  const out = new PNG({ width: size, height: size });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = BG.r;
    out.data[i + 1] = BG.g;
    out.data[i + 2] = BG.b;
    out.data[i + 3] = 255;
  }
  return out;
}

const src = load(SRC);
console.log(`source: ${src.width}x${src.height}`);

for (const [dir, size] of Object.entries(SIZES)) {
  const outDir = path.join(RES, dir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "ic_launcher.png"), PNG.sync.write(fullBleed(src, size)));
  fs.writeFileSync(path.join(outDir, "ic_launcher_round.png"), PNG.sync.write(fullBleed(src, size)));
  fs.writeFileSync(path.join(outDir, "ic_launcher_foreground.png"), PNG.sync.write(foreground(src, size)));
  // Adaptive background (deep green) — only need it at xxxhdpi; Android scales.
  fs.writeFileSync(path.join(outDir, "ic_launcher_background.png"), PNG.sync.write(background(size)));
  console.log(`  ${dir}: ${size}x${size} ✓ (launcher, round, foreground, background)`);
}
console.log("android icons generated ✓");
