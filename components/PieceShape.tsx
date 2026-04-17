import type { PieceColor, PieceShape as PieceShapeT } from '@/lib/types';

type Size = 'mini' | 'tray' | 'board';

type Props = {
  shape: PieceShapeT;
  color: PieceColor;
  size?: Size;
};

const SIZE_DIMS: Record<Size, { cell: string; gap: string }> = {
  mini: { cell: '14px', gap: '3px' },
  tray: { cell: '26px', gap: '3px' },
  // Board size reads CSS vars so it tracks the real board cell size
  // responsively (see globals.css `.piece-shape.sz-board`).
  board: { cell: 'var(--board-cell)', gap: 'var(--board-gap)' },
};

export default function PieceShape({ shape, color, size = 'tray' }: Props) {
  const cols = shape[0]?.length ?? 0;
  const { cell, gap } = SIZE_DIMS[size];

  return (
    <div
      className={`piece-shape sz-${size}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cell})`,
        gap,
      }}
    >
      {shape.map((row, r) =>
        row.map((v, c) => (
          <div
            key={`${r}-${c}`}
            className={
              v
                ? `tp-cell sz-${size} fill-${color}`
                : `tp-cell sz-${size} empty`
            }
            style={{ width: cell, height: cell }}
            data-piece-r={r}
            data-piece-c={c}
            data-piece-filled={v ? '1' : '0'}
            aria-hidden="true"
          />
        )),
      )}
    </div>
  );
}
