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
  pieceSet: PieceSet;
  rotation: boolean;
  nextTrayPreview: boolean;
  tapToSelect: boolean;
  sfxVolume: number;
  ambientVolume: number;
  haptics: boolean;
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
