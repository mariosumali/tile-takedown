import type { RunState } from '../types';
import type { LifetimeStats, Streak } from '../types';
import { pieceSize } from '../engine/pieces';

export type CheckContext = {
  run: RunState;
  stats: LifetimeStats;
  streak: Streak;
  event:
    | { type: 'placement'; pieceSize: number }
    | { type: 'clear'; lines: number; perfect: boolean; combo: number }
    | { type: 'run_end' }
    | { type: 'snapshot_saved'; total: number }
    | { type: 'resumed' };
};

export type CheckResult = string[];

/** List of achievement ids that should now be unlocked, given the context. */
export function checkAchievements(ctx: CheckContext): string[] {
  const out: string[] = [];
  const { run, stats, streak, event } = ctx;

  if (event.type === 'placement') {
    if (run.placements >= 1) out.push('FIRST_PLACEMENT');
    if (stats.totalPlacements + 1 >= 100) out.push('PLACE_100');
    if (stats.totalPlacements + 1 >= 1000) out.push('PLACE_1000');
    if (run.placements >= 200) out.push('MARATHON');
  }

  if (event.type === 'clear') {
    out.push('FIRST_BLOOD');
    if (event.lines >= 2) out.push('DOUBLE_UP');
    if (event.lines >= 3) out.push('TRIPLE_THREAT');
    if (event.lines >= 4) out.push('QUAD_SQUAD');
    if (event.combo >= 8) out.push('COMBO_BREAKER'); // 1 + 0.25*8 = 3.0
    if (event.perfect) {
      out.push('PERFECT_ONCE');
      if (stats.perfectClears + 1 >= 10) out.push('PERFECT_10');
    }
    const total = stats.clears.single + stats.clears.double + stats.clears.triple + stats.clears.quad;
    if (total + 1 >= 100) out.push('CLEARS_100');
  }

  if (event.type === 'run_end') {
    out.push('FIRST_RUN');
    if (stats.gamesPlayed + 1 >= 10) out.push('TEN_RUNS');
    if (stats.gamesPlayed + 1 >= 50) out.push('FIFTY_RUNS');
    if (stats.gamesPlayed + 1 >= 100) out.push('CENTURION');

    if (run.score >= 5000) out.push('SCORE_5K');
    if (run.score >= 10000) out.push('SCORE_10K');
    if (run.score >= 20000) out.push('SCORE_20K');
    if (run.score >= 50000) out.push('SCORE_50K');

    if (run.undosUsed === 0) out.push('NO_UNDOS_RUN');
    if (run.undosUsed === 0 && run.score >= 20000) out.push('THRIFTY');

    const hour = new Date(run.startedAt).getHours();
    if (hour >= 0 && hour < 4) out.push('NIGHT_OWL');

    if (streak.current >= 7) out.push('DAILY_DEVOTED');
  }

  if (event.type === 'snapshot_saved') {
    out.push('SAVER');
    if (event.total >= 5) out.push('SANDBOX_ARCHITECT');
  }

  if (event.type === 'resumed') out.push('RESUMED');

  return Array.from(new Set(out));
}

export function minimalistCheck(sizes: number[]): boolean {
  return sizes.length > 0 && sizes.every((s) => s <= 3);
}

export function countPentoes(sizes: number[]): number {
  return sizes.filter((s) => s >= 5).length;
}

export { pieceSize };
