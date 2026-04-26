// Shared helpers for procedural pixel-art tile generation.
// - PixelCanvas: tiny imperative drawing API over an RGBA Uint8Array
// - RNG: seeded mulberry32 for deterministic output
// - color helpers: hex <-> rgb, lighten/darken/mix/alpha

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.mjs';

export const TILE_SIZE = 64;

/* ------------------------------------------------------------------ */
/* Seeded RNG                                                          */
/* ------------------------------------------------------------------ */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Color helpers                                                       */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgb(r, g, b, a = 255) {
  return { r, g, b, a };
}

export function rgba(c, a) {
  return { r: c.r, g: c.g, b: c.b, a };
}

export function mix(a, b, t) {
  const k = 1 - t;
  return {
    r: Math.round(a.r * k + b.r * t),
    g: Math.round(a.g * k + b.g * t),
    b: Math.round(a.b * k + b.b * t),
    a: Math.round((a.a ?? 255) * k + (b.a ?? 255) * t),
  };
}

export function lighten(c, t) {
  return mix(c, { r: 255, g: 255, b: 255, a: c.a ?? 255 }, t);
}

export function darken(c, t) {
  return mix(c, { r: 0, g: 0, b: 0, a: c.a ?? 255 }, t);
}

export function saturate(c, t) {
  const lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  return {
    r: Math.max(0, Math.min(255, Math.round(c.r + (c.r - lum) * t))),
    g: Math.max(0, Math.min(255, Math.round(c.g + (c.g - lum) * t))),
    b: Math.max(0, Math.min(255, Math.round(c.b + (c.b - lum) * t))),
    a: c.a ?? 255,
  };
}

export function hueShift(c, degrees) {
  // Simple HSL-based hue shift. Good enough for subtle per-tile variation.
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  h = (h + degrees / 360 + 1) % 1;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let nr, ng, nb;
  if (s === 0) { nr = ng = nb = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(nr * 255),
    g: Math.round(ng * 255),
    b: Math.round(nb * 255),
    a: c.a ?? 255,
  };
}

/* ------------------------------------------------------------------ */
/* Pixel canvas                                                        */
/* ------------------------------------------------------------------ */

export class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }

  clear(c = { r: 0, g: 0, b: 0, a: 0 }) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) this.setPixel(x, y, c, 1);
    }
  }

  /**
   * Alpha-composite color `c` (with alpha 0..255) at (x,y).
   * `strength` 0..1 scales the effective alpha (useful for dithering).
   */
  setPixel(x, y, c, strength = 1) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const ca = Math.max(0, Math.min(255, Math.round((c.a ?? 255) * strength)));
    if (ca === 0) return;
    const dst = this.data;
    const da = dst[i + 3];
    if (da === 0 && ca === 255) {
      dst[i] = c.r;
      dst[i + 1] = c.g;
      dst[i + 2] = c.b;
      dst[i + 3] = 255;
      return;
    }
    // Standard source-over composite in 8-bit.
    const sa = ca / 255;
    const outA = sa + (da / 255) * (1 - sa);
    const blend = (s, d) => Math.round((s * sa + d * (da / 255) * (1 - sa)) / outA);
    dst[i] = blend(c.r, dst[i]);
    dst[i + 1] = blend(c.g, dst[i + 1]);
    dst[i + 2] = blend(c.b, dst[i + 2]);
    dst[i + 3] = Math.round(outA * 255);
  }

  getPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return { r: 0, g: 0, b: 0, a: 0 };
    const i = (y * this.w + x) * 4;
    return { r: this.data[i], g: this.data[i + 1], b: this.data[i + 2], a: this.data[i + 3] };
  }

  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.setPixel(i, j, c);
    }
  }

  /** Hollow rect (1px outline). */
  stroke(x, y, w, h, c) {
    for (let i = x; i < x + w; i++) {
      this.setPixel(i, y, c);
      this.setPixel(i, y + h - 1, c);
    }
    for (let j = y; j < y + h; j++) {
      this.setPixel(x, j, c);
      this.setPixel(x + w - 1, j, c);
    }
  }

  /** Bresenham line. */
  line(x0, y0, x1, y1, c) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
    while (true) {
      this.setPixel(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  /** Filled circle. */
  circle(cx, cy, r, c) {
    const r2 = r * r;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r2) this.setPixel(cx + x, cy + y, c);
      }
    }
  }

  /** Hollow circle (Bresenham). */
  ringCircle(cx, cy, r, c) {
    let x = r, y = 0, err = 0;
    while (x >= y) {
      const pts = [
        [cx + x, cy + y], [cx + y, cy + x],
        [cx - y, cy + x], [cx - x, cy + y],
        [cx - x, cy - y], [cx - y, cy - x],
        [cx + y, cy - x], [cx + x, cy - y],
      ];
      for (const [px, py] of pts) this.setPixel(px, py, c);
      y++;
      err += 1 + 2 * y;
      if (2 * (err - x) + 1 > 0) { x--; err += 1 - 2 * x; }
    }
  }

  /**
   * Mirror the top-left quadrant across both axes to create 4-way symmetry.
   * Useful for clean tileable materials.
   */
  mirrorQuad() {
    const w = this.w, h = this.h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x < w / 2 && y < h / 2) {
          const p = this.getPixel(x, y);
          if (p.a > 0) {
            this.setPixel(w - 1 - x, y, p);
            this.setPixel(x, h - 1 - y, p);
            this.setPixel(w - 1 - x, h - 1 - y, p);
          }
        }
      }
    }
  }

  toPng() {
    return encodePng(this.w, this.h, this.data);
  }
}

/* ------------------------------------------------------------------ */
/* Output helpers                                                      */
/* ------------------------------------------------------------------ */

export function projectRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
}

export function saveTile(theme, color, canvas) {
  const outDir = resolve(projectRoot(), 'public', 'tiles', theme);
  mkdirSync(outDir, { recursive: true });
  const file = resolve(outDir, `${color}.png`);
  writeFileSync(file, canvas.toPng());
  return file;
}

/* ------------------------------------------------------------------ */
/* Texture primitives                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fill canvas with a vertical gradient between `top` and `bottom` colors,
 * quantized to `steps` bands for a pixel-art look.
 */
export function gradientFill(c, top, bottom, steps = 6) {
  const h = c.h, w = c.w;
  for (let y = 0; y < h; y++) {
    const band = Math.floor((y / h) * steps);
    const t = band / (steps - 1);
    const col = mix(top, bottom, t);
    for (let x = 0; x < w; x++) c.setPixel(x, y, col);
  }
}

/**
 * Add value-noise speckles to every pixel, nudging brightness up/down.
 * @param {PixelCanvas} c
 * @param {() => number} rand 0..1
 * @param {number} amount pixel channel delta, 0..40 typical
 * @param {number} density 0..1 chance per pixel
 */
export function speckle(c, rand, amount = 18, density = 0.35) {
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (rand() > density) continue;
      const p = c.getPixel(x, y);
      if (p.a === 0) continue;
      const delta = Math.round((rand() * 2 - 1) * amount);
      c.setPixel(x, y, {
        r: Math.max(0, Math.min(255, p.r + delta)),
        g: Math.max(0, Math.min(255, p.g + delta)),
        b: Math.max(0, Math.min(255, p.b + delta)),
        a: 255,
      }, 1);
    }
  }
}

/** Bevel: top-left highlight, bottom-right shadow. Classic 8-bit chrome. */
export function bevel(c, highlight, shadow, thickness = 2) {
  const { w, h } = c;
  for (let t = 0; t < thickness; t++) {
    for (let x = t; x < w - t; x++) {
      c.setPixel(x, t, highlight);
      c.setPixel(x, h - 1 - t, shadow);
    }
    for (let y = t; y < h - t; y++) {
      c.setPixel(t, y, highlight);
      c.setPixel(w - 1 - t, y, shadow);
    }
  }
}

/**
 * Draw a fractal crack from (x,y), growing outward, with random branching.
 * Each pixel is painted with `core`, edges with `glow` (if provided).
 */
export function crack(c, rand, x, y, length, core, glow, angle = rand() * Math.PI * 2) {
  let cx = x, cy = y;
  let a = angle;
  for (let step = 0; step < length; step++) {
    const nx = Math.round(cx + Math.cos(a));
    const ny = Math.round(cy + Math.sin(a));
    if (glow) {
      c.setPixel(nx + 1, ny, glow);
      c.setPixel(nx - 1, ny, glow);
      c.setPixel(nx, ny + 1, glow);
      c.setPixel(nx, ny - 1, glow);
    }
    c.setPixel(nx, ny, core);
    cx = nx; cy = ny;
    a += (rand() - 0.5) * 0.9;
    if (rand() < 0.08 && step > 4) {
      crack(c, rand, cx, cy, Math.round(length * 0.45), core, glow, a + (rand() - 0.5) * 1.6);
    }
    if (cx < 0 || cy < 0 || cx >= c.w || cy >= c.h) break;
  }
}

/** The 6 piece colors (theme tokens come from CSS; values only used when we want the tile tinted). */
export const PIECE_COLORS = ['tomato', 'mustard', 'olive', 'sky', 'plum', 'cream'];
