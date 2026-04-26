#!/usr/bin/env node
// Sakura Garden — lacquered wood coaster with a 5-petal cherry blossom.
// Base is warm wood grain; the blossom takes the piece color, with a gold
// stamen so it still sings on the pink-themed board.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'sakura';

const COLORS = {
  tomato:  '#c73a4a',
  mustard: '#e6c34a',
  olive:   '#5b9a5e',
  sky:     '#7ab0d2',
  plum:    '#c25a8d',
  cream:   '#f2dccc',
};

const WOOD_LIGHT = { r: 232, g: 192, b: 162, a: 255 };
const WOOD_MID   = { r: 196, g: 144, b: 110, a: 255 };
const WOOD_DARK  = { r: 142, g: 94, b: 66, a: 255 };
const WOOD_INK   = { r: 86, g: 52, b: 38, a: 255 };
const STAMEN     = { r: 230, g: 184, b: 70, a: 255 };

// 64×64 petal mask for one blossom petal pointing up. Generated at module load
// so we can rotate around the blossom center.
function petalMask(radius) {
  const pts = [];
  for (let y = -radius * 1.6; y <= 0; y++) {
    for (let x = -radius; x <= radius; x++) {
      const nx = x / radius;
      const ny = y / (radius * 1.6);
      const r = nx * nx + ny * ny;
      // Teardrop: wider near bottom, tapering to top, notched tip.
      const notch = Math.abs(nx) < 0.18 && ny < -0.82 ? 1 : 0;
      if (r < 1 && !notch) pts.push({ x, y });
    }
  }
  return pts;
}

function drawBlossom(c, cx, cy, radius, petal, darkPetal) {
  const mask = petalMask(radius);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (const p of mask) {
      const ox = Math.round(cx + p.x * ca - (p.y - radius * 0.9) * sa);
      const oy = Math.round(cy + p.x * sa + (p.y - radius * 0.9) * ca);
      c.setPixel(ox, oy, petal);
    }
  }
  // Darker petal veins / outlines at the seams.
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2 + Math.PI / 5;
    for (let r = 1; r < radius * 1.25; r++) {
      const x = Math.round(cx + Math.cos(angle) * r);
      const y = Math.round(cy + Math.sin(angle) * r);
      const pix = c.getPixel(x, y);
      if (pix.a > 0) c.setPixel(x, y, mix(pix, darkPetal, 0.5));
    }
  }
  // Stamen cluster.
  c.circle(cx, cy, 2, STAMEN);
  c.setPixel(cx + 1, cy - 1, lighten(STAMEN, 0.3));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * 3);
    const y = Math.round(cy + Math.sin(a) * 3);
    c.setPixel(x, y, darken(STAMEN, 0.2));
  }
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x5a17);
  const piece = hexToRgb(hex);
  const petal = lighten(saturate(piece, 0.1), 0.15);
  const petalDark = darken(saturate(piece, 0.2), 0.35);

  // Wood grain base.
  for (let y = 0; y < TILE_SIZE; y++) {
    const bandIx = Math.floor(y / 4);
    const even = bandIx % 2 === 0;
    const base = even ? WOOD_LIGHT : WOOD_MID;
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, base);
  }

  // Wavy grain lines.
  for (let k = 0; k < 6; k++) {
    const y0 = Math.floor(rand() * TILE_SIZE);
    for (let x = 0; x < TILE_SIZE; x++) {
      const y = y0 + Math.round(Math.sin(x * 0.25 + k) * 1.2);
      const p = c.getPixel(x, y);
      c.setPixel(x, y, mix(p, WOOD_DARK, 0.6));
    }
  }

  // Knot spot.
  const kx = 8 + Math.floor(rand() * 48);
  const ky = 8 + Math.floor(rand() * 48);
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      const d = Math.hypot(x, y);
      if (d < 3) c.setPixel(kx + x, ky + y, mix(WOOD_DARK, WOOD_INK, 1 - d / 3));
    }
  }

  speckle(c, rand, 14, 0.25);

  // Single centered blossom.
  drawBlossom(c, 32, 33, 10, petal, petalDark);

  // Soft paper highlight along the top.
  for (let x = 0; x < TILE_SIZE; x++) {
    c.setPixel(x, 0, { r: 252, g: 238, b: 224, a: 255 });
    if (rand() < 0.6) c.setPixel(x, 1, { r: 246, g: 220, b: 198, a: 210 });
  }

  bevel(c, lighten(WOOD_LIGHT, 0.15), WOOD_INK, 1);

  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
