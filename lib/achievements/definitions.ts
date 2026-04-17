export type AchievementDef = {
  id: string;
  name: string;
  desc: string;
  icon?: string;
};

export const ACHIEVEMENTS: ReadonlyArray<AchievementDef> = [
  { id: 'FIRST_PLACEMENT', name: 'First placement', desc: 'Place your first piece.', icon: '★' },
  { id: 'FIRST_BLOOD', name: 'First blood', desc: 'Clear your first line.', icon: '◆' },
  { id: 'DOUBLE_UP', name: 'Double up', desc: 'Clear two lines in a single move.', icon: '◆◆' },
  { id: 'TRIPLE_THREAT', name: 'Triple threat', desc: 'Clear three lines in a single move.', icon: '☘' },
  { id: 'QUAD_SQUAD', name: 'Quad squad', desc: 'Clear four lines in a single move.', icon: '✦' },
  { id: 'COMBO_BREAKER', name: 'Combo breaker', desc: 'Reach the ×3.00 multiplier.', icon: '✖' },
  { id: 'PERFECT_ONCE', name: 'Picture perfect', desc: 'Empty the board with a perfect clear.', icon: '◇' },
  { id: 'PERFECT_10', name: 'Perfect ten', desc: 'Ten lifetime perfect clears.', icon: '❖' },
  { id: 'SCORE_5K', name: 'Five figures pending', desc: 'Finish a run with 5,000+.', icon: '5K' },
  { id: 'SCORE_10K', name: 'Five-digit club', desc: 'Finish a run with 10,000+.', icon: '10K' },
  { id: 'SCORE_20K', name: 'Twenty thousand', desc: 'Finish a run with 20,000+.', icon: '20K' },
  { id: 'SCORE_50K', name: 'The big one', desc: 'Finish a run with 50,000+.', icon: '50K' },
  { id: 'THRIFTY', name: 'Thrifty', desc: 'Finish a 20k+ run with no undos.', icon: '$' },
  { id: 'CENTURION', name: 'Centurion', desc: '100 runs played.', icon: 'C' },
  { id: 'MARATHON', name: 'Marathon', desc: '200+ placements in a single run.', icon: 'M' },
  { id: 'SANDBOX_ARCHITECT', name: 'Sandbox architect', desc: 'Save 5 sandbox snapshots.', icon: '▣' },
  { id: 'DAILY_DEVOTED', name: 'Daily devoted', desc: 'Play 7 days in a row.', icon: '7' },
  { id: 'NIGHT_OWL', name: 'Night owl', desc: 'Play a run between midnight and 4am.', icon: '☾' },
  { id: 'MINIMALIST', name: 'Minimalist', desc: 'Finish a run placing only 1–3 cell pieces.', icon: '·' },
  { id: 'MAXIMALIST', name: 'Maximalist', desc: 'Place 20+ pentominoes in one run.', icon: '+' },
  { id: 'FIRST_RUN', name: 'First run', desc: 'Play your first classic run.', icon: '1' },
  { id: 'TEN_RUNS', name: 'Committed', desc: '10 runs played.', icon: '10' },
  { id: 'FIFTY_RUNS', name: 'Regulars', desc: '50 runs played.', icon: '50' },
  { id: 'PLACE_100', name: '100 tiles', desc: 'Place 100 tiles lifetime.', icon: '◼' },
  { id: 'PLACE_1000', name: '1,000 tiles', desc: 'Place 1,000 tiles lifetime.', icon: '⬛' },
  { id: 'CLEARS_100', name: 'Line worker', desc: '100 lifetime line clears.', icon: '|||' },
  { id: 'SAVER', name: 'Snapshot saver', desc: 'Save your first sandbox snapshot.', icon: '▢' },
  { id: 'RESUMED', name: 'Back for more', desc: 'Resume an unfinished run.', icon: '↺' },
  { id: 'NO_UNDOS_RUN', name: 'Unflinching', desc: 'Finish a run without using undo.', icon: '=' },
  { id: 'FULL_DECK', name: 'Full deck', desc: 'Place every piece shape in one run.', icon: '♦' },
];

export const ACHIEVEMENTS_BY_ID: Readonly<Record<string, AchievementDef>> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
