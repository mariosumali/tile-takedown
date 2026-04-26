#!/usr/bin/env node
// Abyssal Reef — deep-sea tile with coral silhouettes and a bioluminescent
// core. The base is always deep ocean blue; the piece color becomes the
// glowing heart of the tile so colors still read cleanly from a distance.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  speckle, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'abyssal';

const COLORS = {
  tomato:  '#ff7a8a',
  mustard: '#ffcf6b',
  olive:   '#4ed0a5',
  sky:     '#4acde6',
  plum:    '#b865d6',
  cream:   '#cfe5e2',
};

const DEEP_TOP = { r: 18, g: 46, b: 82, a: 255 };
const DEEP_MID = { r: 10, g: 28, b: 54, a: 255 };
const DEEP_BOT = { r: 4, g: 14, b: 32, a: 255 };
const CORAL_DARK = { r: 28, g: 60, b: 82, a: 255 };

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x0c3a);
  const piece = hexToRgb(hex);
  const glow     = saturate(piece, 0.25);
  const glowHot  = lighten(saturate(piece, 0.4), 0.35);
  const glowRim  = darken(saturate(piece, 0.3), 0.3);

  // Deep gradient (top lighter, bottom inky).
  for (let y = 0; y < TILE_SIZE; y++) {
    const t = y / (TILE_SIZE - 1);
    const col = t < 0.5 ? mix(DEEP_TOP, DEEP_MID, t * 2) : mix(DEEP_MID, DEEP_BOT, (t - 0.5) * 2);
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, col);
  }

  speckle(c, rand, 10, 0.25);

  // Coral silhouettes — branching structures at bottom + sides.
  function drawBranch(x0, y0, dir, len) {
    let x = x0, y = y0;
    let angle = dir;
    for (let i = 0; i < len; i++) {
      c.setPixel(Math.round(x), Math.round(y), CORAL_DARK);
      c.setPixel(Math.round(x + 1), Math.round(y), CORAL_DARK);
      x += Math.cos(angle);
      y += Math.sin(angle);
      angle += (rand() - 0.5) * 0.6;
      if (rand() < 0.15 && i > 3) {
        drawBranch(x, y, angle + (rand() - 0.5) * 1.8, Math.floor(len * 0.55));
      }
    }
  }
  drawBranch(10, TILE_SIZE + 2, -Math.PI / 2 - 0.2, 18);
  drawBranch(32, TILE_SIZE + 2, -Math.PI / 2 + 0.1, 22);
  drawBranch(52, TILE_SIZE + 2, -Math.PI / 2 - 0.3, 16);

  // Central bioluminescent orb.
  const gx = 32, gy = 30;
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const d = Math.hypot(x - gx, y - gy);
      if (d < 20) {
        const falloff = 1 - d / 20;
        const intensity = Math.pow(falloff, 1.6);
        const p = c.getPixel(x, y);
        c.setPixel(x, y, mix(p, glow, intensity * 0.55));
      }
    }
  }
  // Bright center cluster.
  for (let y = -5; y <= 5; y++) {
    for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x, y);
      if (d < 5 && rand() < 1 - d / 5) {
        c.setPixel(gx + x, gy + y, mix(glow, glowHot, Math.pow(1 - d / 5, 1.4)));
      }
    }
  }
  // Bright pinprick core.
  c.setPixel(gx, gy, glowHot);
  c.setPixel(gx + 1, gy, glowHot);
  c.setPixel(gx, gy + 1, glowHot);
  c.setPixel(gx - 1, gy, glowHot);
  c.setPixel(gx, gy - 1, glowHot);

  // Bubble specks rising at the top third.
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * 16);
    const r = rand() < 0.6 ? 1 : 2;
    c.ringCircle(x, y, r, { r: 200, g: 230, b: 240, a: 170 });
  }

  // Rim halo of glow color around the orb.
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 10;
    const x = Math.round(gx + Math.cos(a) * r);
    const y = Math.round(gy + Math.sin(a) * r);
    const p = c.getPixel(x, y);
    c.setPixel(x, y, mix(p, glowRim, 0.7));
  }

  // Seaweed wisp on left edge.
  for (let i = 0; i < 22; i++) {
    const y = TILE_SIZE - 4 - i * 2;
    const x = 2 + Math.round(Math.sin(i * 0.6) * 1.5);
    if (y > 20) c.setPixel(x, y, CORAL_DARK);
    if (y > 20 && rand() < 0.3) c.setPixel(x + 1, y, CORAL_DARK);
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
