// ---------- RockLogger icon generator (pure Node, no deps) ----------
// Draws a rounded-square stone tile with a gray rock + golden sparkle,
// encodes PNG manually (zlib + CRC32). Run: node scripts/gen-icons.mjs

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------
function roundedRect(px, cx, cy, hw, hh, r) {
  const dx = Math.abs(px.x - cx);
  const dy = Math.abs(px.y - cy);
  if (dx > hw - r || dy > hh - r) {
    // corner check
    const cx2 = Math.max(dx - (hw - r), 0);
    const cy2 = Math.max(dy - (hh - r), 0);
    return cx2 * cx2 + cy2 * cy2 <= r * r;
  }
  return true;
}

function ellipse(px, cx, cy, rx, ry) {
  const dx = (px.x - cx) / rx;
  const dy = (px.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function drawIcon(size) {
  const px = size / 512; // scale factor relative to 512 canvas
  const img = Buffer.alloc(size * size * 4);

  const bg = [43, 40, 35, 255]; // #2b2823
  const rock1 = [122, 114, 102, 255]; // main body
  const rock2 = [148, 139, 125, 255]; // lighter top
  const rock3 = [92, 85, 76, 255]; // shadow bottom
  const sparkle = [240, 202, 140, 255]; // #f0ca8c
  const highlight = [255, 255, 255, 200];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const p = { x, y };

      // background rounded square (slightly inset for maskable safe zone)
      const margin = size * 0.06;
      const rad = size * 0.2;
      if (!roundedRect(p, size / 2, size / 2, size / 2 - margin, size / 2 - margin, rad)) {
        img[i + 3] = 0; // transparent outside
        continue;
      }
      img[i] = bg[0];
      img[i + 1] = bg[1];
      img[i + 2] = bg[2];
      img[i + 3] = 255;

      // rock body (two overlapping ellipses, slight rotation ignored for simplicity)
      const rx = 150 * px;
      const ry = 118 * px;
      if (ellipse(p, 220 * px, 288 * px, rx, ry)) {
        // bottom shadow zone
        if (p.y > 300 * px && ellipse(p, 220 * px, 330 * px, rx * 0.9, ry * 0.55)) {
          img[i] = rock3[0];
          img[i + 1] = rock3[1];
          img[i + 2] = rock3[2];
        } else {
          img[i] = rock1[0];
          img[i + 1] = rock1[1];
          img[i + 2] = rock1[2];
        }
      }
      // lighter top surface
      if (ellipse(p, 205 * px, 268 * px, rx * 0.62, ry * 0.45)) {
        img[i] = rock2[0];
        img[i + 1] = rock2[1];
        img[i + 2] = rock2[2];
      }
      // small bright highlight
      if (ellipse(p, 178 * px, 250 * px, 26 * px, 16 * px)) {
        img[i] = highlight[0];
        img[i + 1] = highlight[1];
        img[i + 2] = highlight[2];
      }
      // golden sparkle (4-point star made of two diamonds)
      const sx = 352 * px;
      const sy = 190 * px;
      const d1 = Math.abs(p.x - sx) + Math.abs(p.y - sy); // diamond distance
      const arm = 54 * px;
      const core = 16 * px;
      if (d1 <= arm || (ellipse(p, sx, sy, core, core))) {
        img[i] = sparkle[0];
        img[i + 1] = sparkle[1];
        img[i + 2] = sparkle[2];
        // dim the outer arms slightly
        if (d1 > arm * 0.55) {
          img[i] = Math.round(sparkle[0] * 0.85);
          img[i + 1] = Math.round(sparkle[1] * 0.85);
          img[i + 2] = Math.round(sparkle[2] * 0.85);
        }
      }
      // tiny second sparkle
      if (ellipse(p, 396 * px, 330 * px, 12 * px, 12 * px)) {
        img[i] = sparkle[0];
        img[i + 1] = sparkle[1];
        img[i + 2] = sparkle[2];
      }
    }
  }
  return encodePng(size, size, img);
}

for (const size of [192, 512]) {
  const png = drawIcon(size);
  writeFileSync(join(OUT, `icon-${size}.png`), png);
  console.log(`icon-${size}.png written (${png.length} bytes)`);
}
