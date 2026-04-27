export const STORAGE_PREFIX = 'tile-takedown:v1';

export const K = {
  settings: `${STORAGE_PREFIX}:settings`,
  stats: `${STORAGE_PREFIX}:stats`,
  activeRun: `${STORAGE_PREFIX}:activeRun`,
  sandbox: `${STORAGE_PREFIX}:sandbox`,
  achievements: `${STORAGE_PREFIX}:achievements`,
  streak: `${STORAGE_PREFIX}:streak`,
  runs: `${STORAGE_PREFIX}:runs`,
  levelsProgress: `${STORAGE_PREFIX}:levelsProgress`,
  activeLevel: `${STORAGE_PREFIX}:activeLevel`,
  gimmicksRun: `${STORAGE_PREFIX}:gimmicksRun`,
  seenHelp: `${STORAGE_PREFIX}:seenHelp`,
} as const;
