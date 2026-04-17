'use client';

import type { BoardState, PieceShape, PieceColor } from '@/lib/types';
import { pieceCells } from '@/lib/engine/pieces';

type Props = {
  board: BoardState;
  preclearRow?: number | null;
  preclearRows?: ReadonlyArray<number>;
  preclearCols?: ReadonlyArray<number>;
  ghostShape?: PieceShape | null;
  ghostAnchor?: { row: number; col: number } | null;
  ghostColor?: PieceColor | null;
  ghostLegal?: boolean;
  scorePopup?: { amount: number; mult: string } | null;
  chromeLive?: string;
  density?: number;
  onCellDown?: (row: number, col: number, e: React.PointerEvent) => void;
  onCellEnter?: (row: number, col: number, e: React.PointerEvent) => void;
  onCellUp?: (row: number, col: number, e: React.PointerEvent) => void;
  onBoardLeave?: () => void;
  clearingRows?: ReadonlyArray<number>;
  clearingCols?: ReadonlyArray<number>;
};

export default function GameBoard({
  board,
  preclearRow = null,
  preclearRows = [],
  preclearCols = [],
  ghostShape = null,
  ghostAnchor = null,
  ghostColor = 'olive',
  ghostLegal = true,
  scorePopup = null,
  chromeLive = '',
  density,
  onCellDown,
  onCellEnter,
  onCellUp,
  onBoardLeave,
  clearingRows = [],
  clearingCols = [],
}: Props) {
  const ghostSet = new Set<string>();
  if (ghostShape && ghostAnchor) {
    for (const [dr, dc] of pieceCells(ghostShape)) {
      const r = ghostAnchor.row + dr;
      const c = ghostAnchor.col + dc;
      if (r >= 0 && c >= 0 && r < 8 && c < 8) ghostSet.add(`${r}-${c}`);
    }
  }

  return (
    <>
      <div className="board-chrome">
        {chromeLive ? <span className="live-chip">{chromeLive}</span> : <span />}
        {typeof density === 'number' && (
          <span className="density-chip">
            density <strong>{density}%</strong>
          </span>
        )}
      </div>

      <div
        className="board"
        onPointerLeave={onBoardLeave}
      >
        <div className="board-grid">
          {board.flatMap((row, r) =>
            row.map((v, c) => {
              const classes = ['cell'];
              const isClearing =
                clearingRows.includes(r) || clearingCols.includes(c);
              if (v) classes.push('filled', `fill-${v}`);
              const isPreclear =
                (preclearRow !== null && r === preclearRow && v) ||
                (preclearRows.includes(r) && v) ||
                (preclearCols.includes(c) && v);
              if (isPreclear && !isClearing) classes.push('preclear');
              if (isClearing) classes.push('clearing');
              const ghostKey = `${r}-${c}`;
              if (!v && ghostSet.has(ghostKey)) {
                classes.push('filled', 'ghost');
                if (ghostLegal) classes.push(`fill-${ghostColor || 'olive'}`);
                else classes.push('illegal');
              }
              return (
                <div
                  key={ghostKey}
                  className={classes.join(' ')}
                  data-row={r}
                  data-col={c}
                  onPointerDown={
                    onCellDown ? (e) => onCellDown(r, c, e) : undefined
                  }
                  onPointerEnter={
                    onCellEnter ? (e) => onCellEnter(r, c, e) : undefined
                  }
                  onPointerUp={
                    onCellUp ? (e) => onCellUp(r, c, e) : undefined
                  }
                />
              );
            }),
          )}
        </div>
        {scorePopup && (
          <div className="score-popup" key={Math.random()} aria-hidden="true">
            <span className="plus">+ {scorePopup.amount}</span>
            <span className="mult">&times;{scorePopup.mult}</span>
          </div>
        )}
      </div>
    </>
  );
}
