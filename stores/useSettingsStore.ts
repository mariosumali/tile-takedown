'use client';

import { create } from 'zustand';
import type { Settings } from '@/lib/types';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON } from '@/lib/storage/safe';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'paper',
  pieceSet: 'classic',
  rotation: true,
  nextTrayPreview: true,
  tapToSelect: false,
  sfxVolume: 0.6,
  ambientVolume: 0,
  haptics: true,
};

type State = Settings & {
  hydrated: boolean;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
  hydrate: () => void;
};

export const useSettingsStore = create<State>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: () => {
    const data = readJSON<Settings>(K.settings, DEFAULT_SETTINGS);
    set({ ...DEFAULT_SETTINGS, ...data, hydrated: true });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', data.theme || 'paper');
    }
  },
  set: (k, v) => {
    set({ [k]: v } as Partial<State>);
    const { hydrated, set: _s, reset: _r, hydrate: _h, ...rest } = get();
    writeJSON(K.settings, rest);
    if (k === 'theme' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', v as string);
    }
  },
  reset: () => {
    set({ ...DEFAULT_SETTINGS, hydrated: true });
    writeJSON(K.settings, DEFAULT_SETTINGS);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'paper');
    }
  },
}));
