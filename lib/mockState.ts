import type { BoardState, Piece, PieceColor, PieceShape } from './types';

/* ------------------------------------------------------------------ */
/*  LANDING — demo board                                              */
/* ------------------------------------------------------------------ */

export const landingDemoBoard: BoardState = [
  [null, null, 'mustard', null, null, null, null, null],
  [null, null, 'mustard', null, null, 'sky', 'sky', null],
  [null, 'tomato', 'mustard', 'mustard', null, 'sky', 'sky', null],
  [null, 'tomato', null, null, null, null, null, null],
  [null, 'tomato', null, null, 'plum', 'plum', null, null],
  [null, null, null, 'olive', 'plum', null, null, 'cream'],
  ['tomato', 'olive', 'olive', 'olive', 'mustard', 'sky', 'plum', 'cream'],
  [null, null, 'olive', null, null, null, null, 'cream'],
];

/** Row 6 is full — preclear animation target. */
export const landingPreclearRow = 6;

/** Horizontal 1x3 ghost at row 3, cols 3..5. */
export const landingGhostCells: ReadonlyArray<[number, number]> = [
  [3, 3],
  [3, 4],
  [3, 5],
];

export const landingTray: ReadonlyArray<Piece> = [
  {
    color: 'tomato',
    shape: [
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    color: 'sky',
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    color: 'mustard',
    shape: [[1, 1, 1, 1]],
  },
];

/* ------------------------------------------------------------------ */
/*  GAME — mid-run state                                              */
/* ------------------------------------------------------------------ */

export const gameDemoBoard: BoardState = [
  [null, null, null, null, 'mustard', 'mustard', 'mustard', 'mustard'],
  [null, null, null, null, null, null, null, null],
  [null, 'tomato', null, null, null, 'plum', 'plum', null],
  [null, 'tomato', null, null, null, 'plum', 'plum', null],
  [null, 'tomato', 'tomato', null, 'olive', null, null, null],
  [null, null, null, null, 'olive', 'olive', null, 'cream'],
  ['tomato', 'olive', 'sky', 'mustard', 'olive', 'plum', 'cream', 'cream'],
  [null, null, null, null, null, null, null, 'cream'],
];

export const gamePreclearRow = 6;

/** Vertical 1x3 ghost at col 2, rows 3..5. */
export const gameGhostCells: ReadonlyArray<[number, number]> = [
  [3, 2],
  [4, 2],
  [5, 2],
];

export const gameTray: ReadonlyArray<Piece> = [
  {
    color: 'tomato',
    shape: [
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    color: 'sky',
    shape: [[1], [1], [1]],
  },
  {
    color: 'mustard',
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
];

export const gameActiveTrayIndex = 1;

/** Next-tray preview (shapes only; colors muted in UI). */
export const gameNextTray: ReadonlyArray<PieceShape> = [
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [[1], [1]],
];
