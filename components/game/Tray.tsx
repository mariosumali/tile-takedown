'use client';

import type { Piece } from '@/lib/types';
import PieceShape from '../PieceShape';

type Props = {
  pieces: ReadonlyArray<Piece | null>;
  activeIndex?: number | null;
  selectedIndex?: number | null;
  onPointerDown?: (
    i: number,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  hint?: string;
  /** Shown on touch / narrow viewports when rotation is enabled in settings. */
  showRotateButton?: boolean;
  onRotate?: () => void;
  rotateDisabled?: boolean;
};

export default function Tray({
  pieces,
  activeIndex = null,
  selectedIndex = null,
  onPointerDown,
  hint = 'drag a piece onto the board',
  showRotateButton = false,
  onRotate,
  rotateDisabled = false,
}: Props) {
  return (
    <div className="tray-wrap">
      <div className="tray-head">
        <span className="label">Your tray</span>
        <div className="tray-head-end">
          {showRotateButton && onRotate ? (
            <button
              type="button"
              className="icon-btn tray-rotate-btn"
              aria-label="Rotate selected piece"
              disabled={rotateDisabled}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRotate();
              }}
            >
              ↻
            </button>
          ) : null}
          <span className="hint">{hint}</span>
        </div>
      </div>
      <div className="tray">
        {pieces.map((piece, i) => {
          const classes = ['tray-slot'];
          if (activeIndex === i) classes.push('active');
          if (selectedIndex === i) classes.push('selected');
          if (!piece) classes.push('empty');
          return (
            <div
              key={i}
              className={classes.join(' ')}
              role="button"
              tabIndex={0}
              aria-label={`Tray slot ${i + 1}${piece ? '' : ', empty'}`}
              data-tray-index={i}
              onPointerDown={
                piece && onPointerDown
                  ? (e) => onPointerDown(i, e)
                  : undefined
              }
              style={{ touchAction: 'none' }}
            >
              <span className="slot-num">{i + 1}</span>
              {piece && (
                <PieceShape
                  shape={piece.shape}
                  color={piece.color}
                  size="tray"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
