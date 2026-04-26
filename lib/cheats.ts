'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';

export type CheatCode = 'TERMINAL';

export type CheatDef = {
  code: CheatCode;
  name: string;
  /** Short description shown in settings after activation. */
  desc: string;
};

/**
 * Registry of every recognised cheat code. Keys match the literal a user
 * types into the settings field (case-insensitive — we uppercase on input).
 */
export const CHEATS: Record<CheatCode, CheatDef> = {
  TERMINAL: {
    code: 'TERMINAL',
    name: 'Debug terminal',
    desc: 'Adds a floating console where you can tweak the current run, stats, and theme live.',
  },
};

export function normalizeCheatInput(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isKnownCheat(code: string): code is CheatCode {
  return Object.prototype.hasOwnProperty.call(CHEATS, code);
}

/** Reactive hook — re-renders when the cheat list changes. */
export function useCheatActive(code: CheatCode): boolean {
  return useSettingsStore((s) => s.cheats.includes(code));
}

/** Non-reactive read, for effects and one-off checks. */
export function isCheatActive(code: CheatCode): boolean {
  return useSettingsStore.getState().cheats.includes(code);
}
