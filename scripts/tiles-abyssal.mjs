#!/usr/bin/env node
// Coral Block - chunky reef cubes built from coral nodules and porous holes.
// Piece color tints the coral material while teal shadows keep it underwater.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'abyssal';

const COLORS = {
  tomato:  '#f06f7f',
  mustard: '#f0c45f',
  olive:   '#49c897',
  sky:     '#46bfd5',
  plum:    '#b164d0',
  cream:   '#cfe5dc',
};

const WATER_SHADOW = { r: 8, g: 40, b: 56, a: 255 };
const DARK_HOLE = { r: 4, g: 18, b: 30, a: 255 };
const INK = { r: 3, g: 13, b: 28, a: 255 };

function coralLump(c, cx, cy, r, fill, hi, shade) {
  c.circle(cx + 1, cy + 2, r, shade);
  c.circle(cx, cy, r, fill);
  c.circle(cx - Math.floor(r / 2), cy - Math.floor(r / 2), Math.max(1, Math.floor(r / 3)), hi);
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xc0a1);
  const piece = hexToRgb(hex);
  const coral = saturate(piece, 0.18);
  const hi = lighten(coral, 0.34);
  const shade = darken(mix(coral, WATER_SHADOW, 0.22), 0.28);

  c.clear(shade);

  // Lumpy coral matrix.
  for (let y = 6; y < TILE_SIZE; y += 9) {
    for (let x = 6; x < TILE_SIZE; x += 9) {
      const jx = x + Math.floor((rand() - 0.5) * 4);
      const jy = y + Math.floor((rand() - 0.5) * 4);
      const r = 4 + Math.floor(rand() * 3);
      const fill = mix(coral, { r: 245, g: 130, b: 120, a: 255 }, rand() * 0.16);
      coralLump(c, jx, jy, r, fill, hi, shade);
    }
  }

  // Porous holes and reef flecks.
  for (let i = 0; i < 22; i++) {
    const x = 5 + Math.floor(rand() * 54);
    const y = 5 + Math.floor(rand() * 54);
    const r = rand() < 0.72 ? 1 : 2;
    c.circle(x, y, r, DARK_HOLE);
    if (r > 1) c.setPixel(x - 1, y - 1, mix(DARK_HOLE, hi, 0.25));
  }

  for (let y = 0; y < TILE_SIZE; y += 12) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const waveY = Math.round(y + Math.sin(x * 0.22 + y) * 2);
      const p = c.getPixel(x, waveY);
      c.setPixel(x, waveY, mix(p, { r: 170, g: 235, b: 230, a: 255 }, 0.22));
    }
  }

  speckle(c, rand, 7, 0.18);
  bevel(c, lighten(coral, 0.22), INK, 1);
  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
