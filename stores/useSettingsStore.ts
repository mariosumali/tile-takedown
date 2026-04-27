'use client';

import { create } from 'zustand';
import type { Settings } from '@/lib/types';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON } from '@/lib/storage/safe';

type PersistedSettings = Omit<Partial<Settings>, 'pieceSet'> & {
  pieceSet?: Settings['pieceSet'] | 'pentomino_chaos';
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'paper',
  worldTheme: 'none',
  pieceSet: 'classic',
  rotation: false,
  nextTrayPreview: true,
  tapToSelect: false,
  instantTrayRefill: false,
  sfxVolume: 0.6,
  ambientVolume: 0,
  haptics: true,
  cheats: [],
};

type State = Settings & {
  hydrated: boolean;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
  hydrate: () => void;
  /** Returns true if the code was newly added; false if unknown or already on. */
  activateCheat: (code: string) => boolean;
  deactivateCheat: (code: string) => void;
};

export const useSettingsStore = create<State>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: () => {
    const data = readJSON<PersistedSettings>(K.settings, DEFAULT_SETTINGS);
    const settings = normalizeSettings(data);
    set({ ...settings, hydrated: true });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    if (data.pieceSet === 'pentomino_chaos') {
      writeJSON(K.settings, settings);
    }
  },
  set: (k, v) => {
    set({ [k]: v } as Partial<State>);
    persistSettings(get);
    if (k === 'theme' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', v as string);
    }
  },
  reset: () => {
    set({ ...DEFAULT_SETTINGS, hydrated: true });
    writeJSON(K.settings, DEFAULT_SETTINGS);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'paper');
      document.documentElement.removeAttribute('data-world-theme');
    }
  },
  activateCheat: (code) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return false;
    const current = get().cheats;
    if (current.includes(normalized)) return false;
    const next = [...current, normalized];
    set({ cheats: next });
    persistSettings(get);
    return true;
  },
  deactivateCheat: (code) => {
    const normalized = code.trim().toUpperCase();
    const next = get().cheats.filter((c) => c !== normalized);
    set({ cheats: next });
    persistSettings(get);
  },
}));

function normalizeSettings(data: PersistedSettings): Settings {
  const pieceSet =
    data.pieceSet === 'pentomino_chaos' ? 'crazy' : data.pieceSet;

  return {
    ...DEFAULT_SETTINGS,
    ...data,
    pieceSet: pieceSet ?? DEFAULT_SETTINGS.pieceSet,
  };
}

function persistSettings(get: () => State): void {
  const s = get();
  const settings: Settings = {
    theme: s.theme,
    worldTheme: s.worldTheme,
    pieceSet: s.pieceSet,
    rotation: s.rotation,
    nextTrayPreview: s.nextTrayPreview,
    tapToSelect: s.tapToSelect,
    instantTrayRefill: s.instantTrayRefill,
    showTrayChrome: s.showTrayChrome,
    showRunStats: s.showRunStats,
    sfxVolume: s.sfxVolume,
    ambientVolume: s.ambientVolume,
    haptics: s.haptics,
    cheats: s.cheats,
  };
  writeJSON(K.settings, settings);
}
