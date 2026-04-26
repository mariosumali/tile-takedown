#!/usr/bin/env node
// Arctic Aurora — frosted ice block with a six-point snowflake and a faint
// aurora band. Base is icy pastel taking a hue hint from the piece color so
// the six variants still read as distinct without losing the shared "ice" feel.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'arctic';

const COLORS = {
  tomato:  '#6ec5a0',
  mustard: '#c8a4e0',
  olive:   '#4aa095',
  sky:     '#5ba4da',
  plum:    '#8462b8',
  cream:   '#d6e5ee',
};

const ICE_WHITE = { r: 240, g: 248, b: 255, a: 255 };
const ICE_EDGE  = { r: 40, g: 60, b: 90, a: 255 };

function drawSnowflake(c, cx, cy, size, col) {
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    // Main arm.
    for (let r = 0; r <= size; r++) {
      c.setPixel(Math.round(cx + cs * r), Math.round(cy + sn * r), col);
    }
    // Barbs along each arm.
    for (const off of [size * 0.35, size * 0.6, size * 0.82]) {
      const bx = cx + cs * off;
      const by = cy + sn * off;
      const len = Math.round(size * 0.25);
      for (let r = 1; r <= len; r++) {
        const a1 = ang + Math.PI / 3;
        const a2 = ang - Math.PI / 3;
        c.setPixel(Math.round(bx + Math.cos(a1) * r), Math.round(by + Math.sin(a1) * r), col);
        c.setPixel(Math.round(bx + Math.cos(a2) * r), Math.round(by + Math.sin(a2) * r), col);
      }
    }
  }
  c.setPixel(cx, cy, lighten(col, 0.3));
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xc01d);
  const piece = hexToRgb(hex);
  // Base ice takes the piece hue at low saturation — keeps every tile icy
  // but lets the piece color peek through.
  const iceTop = mix(ICE_WHITE, piece, 0.18);
  const iceBot = mix(ICE_WHITE, darken(piece, 0.2), 0.45);

  // Vertical gradient, banded for pixel feel.
  for (let y = 0; y < TILE_SIZE; y++) {
    const t = Math.floor((y / TILE_SIZE) * 8) / 7;
    const col = mix(iceTop, iceBot, t);
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, col);
  }

  // Aurora wash across the top third.
  for (let y = 0; y < 22; y++) {
    const falloff = 1 - y / 22;
    for (let x = 0; x < TILE_SIZE; x++) {
      const shimmer = Math.sin((x + y * 0.5) * 0.18) * 0.5 + 0.5;
      const t = falloff * 0.35 * shimmer;
      const p = c.getPixel(x, y);
      c.setPixel(x, y, mix(p, piece, t));
    }
  }

  // Fractal frost cracks radiating from corners.
  function frost(x0, y0, ang, depth) {
    if (depth <= 0) return;
    let x = x0, y = y0;
    const len = 6 + Math.floor(rand() * depth * 4);
    for (let i = 0; i < len; i++) {
      x += Math.cos(ang);
      y += Math.sin(ang);
      c.setPixel(Math.round(x), Math.round(y), { r: 250, g: 252, b: 255, a: 210 });
    }
    frost(x, y, ang + 0.55, depth - 1);
    frost(x, y, ang - 0.55, depth - 1);
  }
  frost(2, 2, Math.PI / 4, 3);
  frost(TILE_SIZE - 3, 2, (3 * Math.PI) / 4, 3);
  frost(2, TILE_SIZE - 3, -Math.PI / 4, 2);
  frost(TILE_SIZE - 3, TILE_SIZE - 3, -(3 * Math.PI) / 4, 2);

  // Tiny air bubbles trapped in the ice.
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    c.setPixel(x, y, lighten(iceTop, 0.35));
  }
  speckle(c, rand, 8, 0.15);

  // Central snowflake (piece-colored, bright).
  drawSnowflake(c, 32, 34, 12, mix(piece, ICE_WHITE, 0.35));

  // Glossy top highlight strip.
  for (let x = 4; x < TILE_SIZE - 4; x++) {
    c.setPixel(x, 2, { r: 255, g: 255, b: 255, a: 200 });
    if (rand() < 0.4) c.setPixel(x, 3, { r: 255, g: 255, b: 255, a: 120 });
  }

  bevel(c, lighten(iceTop, 0.25), ICE_EDGE, 1);

  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
