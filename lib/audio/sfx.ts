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

// --- Big-clear flourishes -------------------------------------------------
// These helpers layer on top of the mouth-pop sequence to give triples,
// quads, and perfect clears progressively more "oomph": a bass kick for
// weight, high sparkle for luxury, a filtered noise sweep for the boom, and
// a bright triad flourish when the board is wiped clean.

/** Low sine with a fast downward pitch sweep — gives big clears body. */
function bassKick(c: AudioContext, startAt: number, peak: number): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, startAt);
  osc.frequency.exponentialRampToValueAtTime(52, startAt + 0.18);
  const gain = Math.max(0.0001, peak);
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(gain, startAt + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + 0.3);
}

/** A flurry of short high triangles — confetti-in-the-ear shimmer. */
function sparkleShimmer(
  c: AudioContext,
  startAt: number,
  peak: number,
  count: number,
): void {
  const tones = [1760, 2093, 2349, 2637, 3136, 3520];
  for (let i = 0; i < count; i++) {
    const freq = tones[i % tones.length] * (1 + (Math.random() - 0.5) * 0.04);
    const at = startAt + i * 0.035 + Math.random() * 0.02;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = Math.max(0.0001, peak * 0.35);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.15);
  }
}

/** Filtered white noise burst with a downward filter sweep — the "boom" tail. */
function filterSweepBoom(c: AudioContext, startAt: number, peak: number): void {
  const dur = 0.45;
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2400, startAt);
  lp.frequency.exponentialRampToValueAtTime(160, startAt + dur);
  lp.Q.value = 1.2;
  const g = c.createGain();
  const gain = Math.max(0.0001, peak * 0.7);
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  noise.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  noise.start(startAt);
  noise.stop(startAt + dur + 0.02);
}

/** Bright triad (root–fifth–octave) flourish — the "perfect!" chime. */
function perfectFlourish(c: AudioContext, startAt: number, peak: number): void {
  const notes = [880, 1318.51, 1760, 2349.32]; // A5, E6, A6, D7
  notes.forEach((freq, i) => {
    const at = startAt + i * 0.08;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = Math.max(0.0001, peak * (0.5 + i * 0.08));
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.35);
  });
}

/**
 * Plays a satisfying mouth-pop for line clears: a sine with a rapid
 * exponential pitch drop plus a short bandpassed noise click for snap.
 * Each additional simultaneous line stacks another rapid-fire pop at a
 * slightly higher pitch. Combos add a sparkle pop tail.
 *
 * Triples and bigger layer in bass + sparkle. Quads add a filtered boom.
 * Perfect clears (board wipe) add a bright triad flourish on top.
 *
 * No-ops if volume is 0 or the AudioContext hasn't been unlocked yet.
 */
export function playClearSfx(
  lineCount: number,
  comboMult: number,
  opts?: { perfect?: boolean },
): void {
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

  // Triples and bigger earn a bass thump so the clear has weight.
  if (lines >= 3) {
    bassKick(c, t0, master * (lines >= 4 ? 1.25 : 0.9));
    sparkleShimmer(c, t0 + 0.04, master * 0.6, lines >= 4 ? 6 : 4);
  }

  // Quads add a downward filtered noise sweep — the "boom" tail that makes
  // big clears feel physical.
  if (lines >= 4) {
    filterSweepBoom(c, t0 + 0.02, master * 1.05);
  }

  // Perfect clear layers a bright triad flourish over whatever cleared.
  if (opts?.perfect) {
    const offset = Math.max(0, lines - 1) * 0.045 + 0.12;
    perfectFlourish(c, t0 + offset, master * 1.1);
  }
}

/**
 * Short rising chime played when the combo counter ticks up on a clear.
 * Pitch climbs with combo depth so the 5th combo feels taller than the 2nd.
 */
export function playComboSfx(comboCount: number): void {
  if (typeof window === 'undefined') return;
  if (sessionMuted) return;
  const volume = useSettingsStore.getState().sfxVolume;
  if (volume <= 0) return;
  const c = getCtx();
  if (!c) return;

  const steps = Math.min(5, Math.max(1, comboCount - 1));
  const baseFreq = 660 + steps * 120;
  const master = 0.18 * volume;
  const t0 = c.currentTime + 0.05;
  for (let i = 0; i < 2; i++) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    const at = t0 + i * 0.08;
    osc.frequency.setValueAtTime(baseFreq * (1 + i * 0.25), at);
    const gain = Math.max(0.0001, master * (i === 0 ? 0.9 : 0.7));
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.2);
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
