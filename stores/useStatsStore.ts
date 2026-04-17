'use client';

import { create } from 'zustand';
import type {
  AchievementState,
  ClearCounts,
  LifetimeStats,
  RunSummary,
  Streak,
} from '@/lib/types';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON } from '@/lib/storage/safe';

const emptyClears: ClearCounts = { single: 0, double: 0, triple: 0, quad: 0 };

export const DEFAULT_STATS: LifetimeStats = {
  gamesPlayed: 0,
  totalScore: 0,
  highScore: 0,
  totalPlacements: 0,
  clears: { ...emptyClears },
  longestCombo: 0,
  perfectClears: 0,
  msPlayed: 0,
};

export const DEFAULT_STREAK: Streak = {
  current: 0,
  longest: 0,
  lastPlayedDate: '',
};

type State = {
  hydrated: boolean;
  stats: LifetimeStats;
  runs: RunSummary[];
  achievements: Record<string, AchievementState>;
  streak: Streak;
  hydrate: () => void;
  recordRun: (summary: RunSummary, duration: number) => void;
  addPlacement: () => void;
  addClear: (counts: ClearCounts, combo: number, perfect: boolean) => void;
  unlock: (id: string) => boolean;
  markPlayedToday: () => void;
  resetAll: () => void;
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const da = Date.UTC(y1, m1 - 1, d1);
  const db = Date.UTC(y2, m2 - 1, d2);
  return Math.round((db - da) / 86400000);
}

export const useStatsStore = create<State>((set, get) => ({
  hydrated: false,
  stats: { ...DEFAULT_STATS, clears: { ...emptyClears } },
  runs: [],
  achievements: {},
  streak: { ...DEFAULT_STREAK },
  hydrate: () => {
    const stats = readJSON<LifetimeStats>(K.stats, DEFAULT_STATS);
    const runs = readJSON<RunSummary[]>(K.runs, []);
    const achievements = readJSON<Record<string, AchievementState>>(K.achievements, {});
    const streak = readJSON<Streak>(K.streak, DEFAULT_STREAK);
    set({ stats, runs, achievements, streak, hydrated: true });
  },
  recordRun: (summary, duration) => {
    const { stats, runs } = get();
    const newStats: LifetimeStats = {
      gamesPlayed: stats.gamesPlayed + 1,
      totalScore: stats.totalScore + summary.score,
      highScore: Math.max(stats.highScore, summary.score),
      totalPlacements: stats.totalPlacements + summary.placements,
      clears: {
        single: stats.clears.single + summary.clears.single,
        double: stats.clears.double + summary.clears.double,
        triple: stats.clears.triple + summary.clears.triple,
        quad: stats.clears.quad + summary.clears.quad,
      },
      longestCombo: Math.max(stats.longestCombo, summary.comboPeak),
      perfectClears: stats.perfectClears,
      msPlayed: stats.msPlayed + duration,
    };
    const newRuns = [summary, ...runs].slice(0, 50);
    set({ stats: newStats, runs: newRuns });
    writeJSON(K.stats, newStats);
    writeJSON(K.runs, newRuns);
  },
  addPlacement: () => {
    const stats = { ...get().stats, totalPlacements: get().stats.totalPlacements + 1 };
    set({ stats });
    writeJSON(K.stats, stats);
  },
  addClear: (counts, combo, perfect) => {
    const s = get().stats;
    const stats: LifetimeStats = {
      ...s,
      clears: {
        single: s.clears.single + counts.single,
        double: s.clears.double + counts.double,
        triple: s.clears.triple + counts.triple,
        quad: s.clears.quad + counts.quad,
      },
      longestCombo: Math.max(s.longestCombo, combo),
      perfectClears: s.perfectClears + (perfect ? 1 : 0),
    };
    set({ stats });
    writeJSON(K.stats, stats);
  },
  unlock: (id) => {
    const cur = get().achievements;
    if (cur[id]) return false;
    const next = { ...cur, [id]: { unlockedAt: new Date().toISOString() } };
    set({ achievements: next });
    writeJSON(K.achievements, next);
    return true;
  },
  markPlayedToday: () => {
    const today = todayISO();
    const { streak } = get();
    if (streak.lastPlayedDate === today) return;
    let current = 1;
    if (streak.lastPlayedDate) {
      const gap = daysBetween(streak.lastPlayedDate, today);
      if (gap === 1) current = streak.current + 1;
      else if (gap === 0) current = streak.current;
    }
    const longest = Math.max(streak.longest, current);
    const next: Streak = { current, longest, lastPlayedDate: today };
    set({ streak: next });
    writeJSON(K.streak, next);
  },
  resetAll: () => {
    const reset: State['stats'] = { ...DEFAULT_STATS, clears: { ...emptyClears } };
    set({
      stats: reset,
      runs: [],
      achievements: {},
      streak: { ...DEFAULT_STREAK },
    });
    writeJSON(K.stats, reset);
    writeJSON(K.runs, []);
    writeJSON(K.achievements, {});
    writeJSON(K.streak, DEFAULT_STREAK);
  },
}));
