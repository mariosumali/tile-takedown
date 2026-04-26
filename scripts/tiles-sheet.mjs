#!/usr/bin/env node
// Dev-only: composite every generated tile into a single preview sheet so we
// can eyeball the full set without scrolling a folder. Not shipped with the
// app.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import { PixelCanvas, TILE_SIZE, projectRoot } from './lib/tilegen.mjs';

const THEMES = [
  'jungle', 'volcano', 'abyssal', 'sakura',
  'arctic', 'desert', 'haunted',
  'neon', 'arcade',
];
const COLORS = ['tomato', 'mustard', 'olive', 'sky', 'plum', 'cream'];

function decodePng(buf) {
  // Minimal RGBA 8-bit PNG decoder for our own output.
  let i = 8;
  const chunks = [];
  let width = 0, height = 0;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i); i += 4;
    const type = buf.toString('ascii', i, i + 4); i += 4;
    const data = buf.slice(i, i + len); i += len + 4; // skip CRC
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      chunks.push(data);
    } else if (type === 'IEND') break;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const rowLen = width * 4;
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (rowLen + 1)];
    if (filter !== 0) throw new Error(`unsupported filter ${filter}`);
    raw.copy(out, y * rowLen, y * (rowLen + 1) + 1, y * (rowLen + 1) + 1 + rowLen);
  }
  return { width, height, rgba: out };
}

function main() {
  const gap = 4;
  const labelBand = 12; // noop; label rendering skipped for now.
  const colW = TILE_SIZE + gap;
  const rowH = TILE_SIZE + gap;
  const width  = 32 + COLORS.length * colW;
  const height = 32 + THEMES.length * rowH;
  const sheet = new PixelCanvas(width, height);
  sheet.clear({ r: 18, g: 18, b: 20, a: 255 });

  for (let ti = 0; ti < THEMES.length; ti++) {
    for (let ci = 0; ci < COLORS.length; ci++) {
      const file = resolve(projectRoot(), 'public', 'tiles', THEMES[ti], `${COLORS[ci]}.png`);
      if (!existsSync(file)) continue;
      const { width: w, height: h, rgba } = decodePng(readFileSync(file));
      const ox = 16 + ci * colW;
      const oy = 16 + ti * rowH;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          sheet.setPixel(ox + x, oy + y, {
            r: rgba[idx], g: rgba[idx + 1], b: rgba[idx + 2], a: rgba[idx + 3],
          });
        }
      }
    }
  }

  const out = resolve(projectRoot(), 'public', 'tiles', '_preview-sheet.png');
  writeFileSync(out, sheet.toPng());
  console.log(`sheet written: ${out} (${width}x${height})`);
}

main();
// keep deflateSync import used — referenced indirectly via encodePng.
void deflateSync;
