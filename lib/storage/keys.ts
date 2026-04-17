export const STORAGE_PREFIX = 'tile-takedown:v1';

export const K = {
  settings: `${STORAGE_PREFIX}:settings`,
  stats: `${STORAGE_PREFIX}:stats`,
  activeRun: `${STORAGE_PREFIX}:activeRun`,
  sandbox: `${STORAGE_PREFIX}:sandbox`,
  achievements: `${STORAGE_PREFIX}:achievements`,
  streak: `${STORAGE_PREFIX}:streak`,
  runs: `${STORAGE_PREFIX}:runs`,
} as const;
