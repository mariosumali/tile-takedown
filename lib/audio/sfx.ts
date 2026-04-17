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
// Session-level mute flag. The UI's "M" toggle in ClassicGame flips this so
// store-initiated sounds (e.g. playClearSfx) honor the same switch as the
// parameterised `playSfx` calls.
let sessionMuted = false;

export function setSessionMuted(muted: boolean): void {
  sessionMuted = muted;
}

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
 * Plays a satisfying mouth-pop for line clears: a sine with a rapid
 * exponential pitch drop plus a short bandpassed noise click for snap.
 * Each additional simultaneous line stacks another rapid-fire pop at a
 * slightly higher pitch. Combos add a sparkle pop tail.
 *
 * No-ops if volume is 0 or the AudioContext hasn't been unlocked yet.
 */
export function playClearSfx(lineCount: number, comboMult: number): void {
  if (typeof window === 'undefined') return;
  if (sessionMuted) return;
  const volume = useSettingsStore.getState().sfxVolume;
  if (volume <= 0) return;
  const c = getCtx();
  if (!c) return;

  const lines = Math.max(1, lineCount);
  const master = 0.26 * volume;

  const pop = (
    startAt: number,
    startFreq: number,
    endFreq: number,
    dur: number,
    gain: number,
  ) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startAt);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(60, endFreq),
      startAt + dur * 0.55,
    );
    const peak = Math.max(0.0001, gain);
    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.exponentialRampToValueAtTime(peak, startAt + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.02);

    // Tight bandpassed noise burst gives the pop its percussive lip-snap.
    const noiseDur = 0.018;
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * noiseDur));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = startFreq;
    bp.Q.value = 1.4;
    const ng = c.createGain();
    ng.gain.setValueAtTime(peak * 0.5, startAt);
    ng.gain.exponentialRampToValueAtTime(0.0001, startAt + noiseDur);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(c.destination);
    noise.start(startAt);
    noise.stop(startAt + noiseDur + 0.01);
  };

  const t0 = c.currentTime;
  for (let i = 0; i < lines; i++) {
    const startFreq = 880 + i * 220;
    const endFreq = 200 + i * 70;
    pop(t0 + i * 0.045, startFreq, endFreq, 0.18, master);
  }

  if (comboMult > 1) {
    pop(t0 + lines * 0.045, 1600, 700, 0.14, master * 0.5);
  }
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
