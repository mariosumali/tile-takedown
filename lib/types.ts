export type PieceColor =
  | 'tomato'
  | 'mustard'
  | 'olive'
  | 'sky'
  | 'plum'
  | 'cream';

/** 2D array of 0/1 where 1 means the cell is part of the piece. */
export type PieceShape = ReadonlyArray<ReadonlyArray<0 | 1>>;

export type Piece = {
  shape: PieceShape;
  color: PieceColor;
};

export type TrayPiece = Piece & { id: string };

export type CellState = {
  filled: boolean;
  color: PieceColor | null;
};

/** 8x8 grid. `null` = empty, otherwise a PieceColor. */
export type BoardState = ReadonlyArray<ReadonlyArray<PieceColor | null>>;

export type Theme = 'paper' | 'linen' | 'noir' | 'high_contrast';

export type WorldTheme =
  | 'none'
  | 'jungle'
  | 'volcano'
  | 'abyssal'
  | 'sakura'
  | 'arctic'
  | 'desert'
  | 'cosmic'
  | 'haunted'
  | 'neon'
  | 'arcade';

export type PieceSet =
  | 'classic'
  | 'tetro_only'
  | 'pentomino_chaos'
  | 'small_only';

export type ClearCounts = {
  single: number;
  double: number;
  triple: number;
  quad: number;
};

export type RunState = {
  id: string;
  board: BoardState;
  tray: (TrayPiece | null)[];
  nextTray: TrayPiece[];
  score: number;
  combo: number;
  comboPeak: number;
  placements: number;
  clears: ClearCounts;
  perfectClears: number;
  undosUsed: number;
  startedAt: string;
  lastAt: string;
  gameOver: boolean;
  bag: ReadonlyArray<Piece>;
};

export type RunSummary = {
  id: string;
  startedAt: string;
  endedAt: string;
  score: number;
  placements: number;
  clears: ClearCounts;
  comboPeak: number;
};

export type LifetimeStats = {
  gamesPlayed: number;
  totalScore: number;
  highScore: number;
  totalPlacements: number;
  clears: ClearCounts;
  longestCombo: number;
  perfectClears: number;
  msPlayed: number;
};

export type Settings = {
  theme: Theme;
  worldTheme: WorldTheme;
  pieceSet: PieceSet;
  rotation: boolean;
  nextTrayPreview: boolean;
  tapToSelect: boolean;
  /** Refill each tray slot the moment its piece is placed, instead of waiting
   *  for all three slots to empty and swapping in a new batch together. */
  instantTrayRefill: boolean;
  sfxVolume: number;
  ambientVolume: number;
  haptics: boolean;
  /** Unlocked cheat codes (uppercase strings). Empty by default. */
  cheats: string[];
};

export type Streak = {
  current: number;
  longest: number;
  lastPlayedDate: string;
};

export type Snapshot = {
  id: string;
  createdAt: string;
  board: BoardState;
};

export type AchievementState = { unlockedAt: string };

/* ------------------------------------------------------------------------ */
/* Levels mode                                                               */
/* ------------------------------------------------------------------------ */

/** Playable-cell mask for shaped boards. `false` = void. */
export type BoardMask = ReadonlyArray<ReadonlyArray<boolean>>;

export type BoardDims = {
  rows: number;
  cols: number;
  mask?: BoardMask;
};

export type LevelStars = 0 | 1 | 2 | 3;

export type LevelTier = 1 | 2 | 3 | 4 | 5;

export type LevelDef = {
  /** 'L001'…'L100' */
  id: string;
  /** 1-indexed position in the catalog. */
  index: number;
  tier: LevelTier;
  name: string;
  dims: BoardDims;
  /** Named piece set, or custom id list. */
  pieceSet: PieceSet | 'custom';
  customPool?: string[]; // PieceDef ids
  targetScore: number;
  /** [1★, 2★, 3★] score thresholds, monotonically increasing. */
  starThresholds: readonly [number, number, number];
  parMoves: number;
  intro?: string;
};

export type LevelRecord = {
  stars: LevelStars;
  bestScore: number;
};

export type LevelProgress = Record<string, LevelRecord>;

/* ------------------------------------------------------------------------ */
/* Gimmicks mode                                                             */
/* ------------------------------------------------------------------------ */

export type PowerUpId =
  | 'bomb'
  | 'row_nuke'
  | 'col_nuke'
  | 'color_clear'
  | 'shuffle'
  | 'rotate_any';

export type PowerUpInventory = Partial<Record<PowerUpId, number>>;

export type Obstacle =
  | { kind: 'locked' }
  | { kind: 'frozen'; meltsAfter: number }
  | { kind: 'bomb'; turnsLeft: number };

export type ObstacleMap = Record<string, Obstacle>;

/** Power-ups embedded into board cells. Keys are "r:c" strings. */
export type PowerupCellMap = Record<string, PowerUpId>;

export type GimmicksRunState = {
  id: string;
  board: BoardState;
  tray: (TrayPiece | null)[];
  nextTray: TrayPiece[];
  score: number;
  combo: number;
  comboPeak: number;
  placements: number;
  clears: ClearCounts;
  perfectClears: number;
  undosUsed: number;
  startedAt: string;
  lastAt: string;
  gameOver: boolean;
  bag: ReadonlyArray<Piece>;
  // Gimmicks-specific:
  powerups: PowerUpInventory;
  powerMeter: number;
  lives: number;
  obstacles: ObstacleMap;
  /**
   * Power-ups embedded into existing filled tiles. When the tile is cleared
   * (by line or by another powerup), the embedded power-up either triggers
   * (target kinds) or is granted to the inventory (instant/modifier kinds).
   */
  powerupCells: PowerupCellMap;
  /** Random-but-deterministic seed for obstacle spawns. */
  seed: number;
  /** Powerups ever used in this run — for TOOLED_UP achievement. */
  usedPowerups: PowerUpId[];
};
