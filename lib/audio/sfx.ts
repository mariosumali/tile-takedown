'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';

type Event =
  | 'pickup'
  | 'drop-legal'
  | 'drop-invalid'
  | 'clear-1'
  | 'clear-2'
  | 'clear-3'
  | 'clear-4'
  | 'achievement'
  | 'game-over';

let ctx: AudioContext | null = null;
let gestureArmed = false;

if (typeof window !== 'undefined') {
  const arm = () => {
    gestureArmed = true;
    window.removeEventListener('pointerdown', arm);
    window.removeEventListener('keydown', arm);
    window.removeEventListener('touchstart', arm);
  };
  window.addEventListener('pointerdown', arm, { once: true });
  window.addEventListener('keydown', arm, { once: true });
  window.addEventListener('touchstart', arm, { once: true });
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    if (!gestureArmed) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.06,
  volume = 1,
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const peak = Math.max(0, Math.min(1, volume)) * gain;
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(peak, c.currentTime + 0.01);
  g.gain.linearRampToValueAtTime(0, c.currentTime + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

export function playSfx(event: Event, enabled: boolean, volume = 1): void {
  if (!enabled) return;
  if (volume <= 0) return;
  switch (event) {
    case 'pickup':
      blip(520, 0.08, 'triangle', 0.04, volume);
      break;
    case 'drop-legal':
      blip(320, 0.12, 'triangle', 0.06, volume);
      break;
    case 'drop-invalid':
      blip(160, 0.12, 'sawtooth', 0.04, volume);
      break;
    case 'clear-1':
      blip(660, 0.18, 'triangle', 0.08, volume);
      break;
    case 'clear-2':
      blip(880, 0.2, 'triangle', 0.08, volume);
      break;
    case 'clear-3':
      blip(990, 0.22, 'triangle', 0.08, volume);
      break;
    case 'clear-4':
      blip(1200, 0.28, 'triangle', 0.09, volume);
      break;
    case 'achievement':
      blip(720, 0.14, 'triangle', 0.08, volume);
      setTimeout(() => blip(960, 0.16, 'triangle', 0.08, volume), 120);
      break;
    case 'game-over':
      blip(260, 0.24, 'sawtooth', 0.06, volume);
      setTimeout(() => blip(180, 0.3, 'sawtooth', 0.05, volume), 200);
      break;
  }
}

/**
 * Plays the line-clear signature tone. Pitched up by a perfect fifth (×1.5)
 * for each additional simultaneous line. When `comboMult > 1`, a second
 * harmonic at 1.5× the base rides along at 0.3 volume.
 *
 * Envelope: 8ms attack / 80ms sustain / 90ms exponential release (~180ms total).
 * Master gain: 0.18, scaled by `sfxVolume`. No-ops if volume is 0 or the
 * AudioContext hasn't been unlocked by a user gesture yet.
 */
export function playClearSfx(lineCount: number, comboMult: number): void {
  if (typeof window === 'undefined') return;
  const volume = useSettingsStore.getState().sfxVolume;
  if (volume <= 0) return;
  const c = getCtx();
  if (!c) return;

  const lines = Math.max(1, lineCount);
  const base = 520 * Math.pow(1.5, lines - 1);
  const master = 0.18 * volume;

  const attack = 0.008;
  const sustain = 0.08;
  const release = 0.09;
  const t0 = c.currentTime;

  const tone = (freq: number, volMult: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const peak = Math.max(0.0001, master * volMult);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.setValueAtTime(peak, t0 + attack + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + sustain + release);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + attack + sustain + release + 0.02);
  };

  tone(base, 1);
  if (comboMult > 1) tone(base * 1.5, 0.3);
}

export function vibrate(pattern: number | number[], enabled: boolean): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined') return;
  const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try {
    n.vibrate?.(pattern);
  } catch {
    /* noop */
  }
}
