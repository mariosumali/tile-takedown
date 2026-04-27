#!/usr/bin/env node
// 8-Bit Blocks - deliberately low-detail retro blocks with chunky two-tone
// pixels, hard outlines, and simple low-res interior marks.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, lighten, darken,
  saveTile,
} from './lib/tilegen.mjs';

const THEME = 'arcade';

const COLORS = {
  tomato:  '#ff3f73',
  mustard: '#ffd831',
  olive:   '#60ffa6',
  sky:     '#3eb9ff',
  plum:    '#ca43e8',
  cream:   '#fafafa',
};

const BLACK = { r: 0, g: 0, b: 0, a: 255 };
function hardFrame(c, face, hi, shade) {
  c.clear(face);
  for (let i = 0; i < 3; i++) {
    for (let x = i; x < TILE_SIZE - i; x++) {
      c.setPixel(x, i, BLACK);
      c.setPixel(x, TILE_SIZE - 1 - i, BLACK);
    }
    for (let y = i; y < TILE_SIZE - i; y++) {
      c.setPixel(i, y, BLACK);
      c.setPixel(TILE_SIZE - 1 - i, y, BLACK);
    }
  }
  for (let i = 3; i < 8; i++) {
    for (let x = i; x < TILE_SIZE - i; x++) c.setPixel(x, i, hi);
    for (let y = i; y < TILE_SIZE - i; y++) c.setPixel(i, y, hi);
  }
  for (let i = 3; i < 8; i++) {
    for (let x = i; x < TILE_SIZE - i; x++) c.setPixel(x, TILE_SIZE - 1 - i, shade);
    for (let y = i; y < TILE_SIZE - i; y++) c.setPixel(TILE_SIZE - 1 - i, y, shade);
  }
}

function lowResRect(c, x, y, w, h, col) {
  c.rect(x, y, w, h, col);
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x8b17);
  const face = hexToRgb(hex);
  const hi = lighten(face, 0.36);
  const shade = darken(face, 0.45);

  hardFrame(c, face, hi, shade);

  // Intentionally coarse 8x8 pixel clusters.
  for (let y = 10; y < TILE_SIZE - 10; y += 8) {
    for (let x = 10; x < TILE_SIZE - 10; x += 8) {
      if (rand() < 0.45) lowResRect(c, x, y, 8, 8, rand() < 0.5 ? hi : shade);
    }
  }

  // Tiny low-res badge in the center: one of a few simple blocky silhouettes.
  const patterns = [
    [[0,1,1,0], [1,1,1,1], [1,0,0,1], [0,1,1,0]],
    [[1,1,1,1], [1,0,0,0], [1,1,1,0], [1,0,0,0]],
    [[1,0,0,1], [0,1,1,0], [0,1,1,0], [1,0,0,1]],
  ];
  const pattern = patterns[Math.floor(rand() * patterns.length)];
  for (let py = 0; py < pattern.length; py++) {
    for (let px = 0; px < pattern[py].length; px++) {
      if (pattern[py][px]) c.rect(24 + px * 4, 24 + py * 4, 4, 4, BLACK);
      else c.rect(24 + px * 4, 24 + py * 4, 4, 4, lighten(face, 0.14));
    }
  }

  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
