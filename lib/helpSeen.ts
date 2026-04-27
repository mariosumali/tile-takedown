import { K } from './storage/keys';
import { readJSON, writeJSON } from './storage/safe';

export type HelpMode = 'classic' | 'levels' | 'gimmicks' | 'sandbox';

type SeenHelp = Partial<Record<HelpMode, boolean>>;

export function hasSeenHelp(mode: HelpMode): boolean {
  const seen = readJSON<SeenHelp>(K.seenHelp, {});
  return !!seen[mode];
}

export function markHelpSeen(mode: HelpMode): void {
  const seen = readJSON<SeenHelp>(K.seenHelp, {});
  writeJSON(K.seenHelp, { ...seen, [mode]: true });
}
