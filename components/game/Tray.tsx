'use client';

import type { Piece } from '@/lib/types';
import PieceShape from '../PieceShape';

type Props = {
  pieces: ReadonlyArray<Piece | null>;
  activeIndex?: number | null;
  selectedIndex?: number | null;
  slotFeedback?: { index: number; kind: 'placed' | 'invalid'; id: number } | null;
  onPointerDown?: (
    i: number,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  hint?: string;
  chromeVisible?: boolean;
};

export default function Tray({
  pieces,
  activeIndex = null,
  selectedIndex = null,
  slotFeedback = null,
  onPointerDown,
  hint = 'drag a piece onto the board',
  chromeVisible = true,
}: Props) {
  const wrapClasses = ['tray-wrap'];
  if (!chromeVisible) wrapClasses.push('tray-chrome-hidden');

  return (
    <div className={wrapClasses.join(' ')}>
      {chromeVisible && (
        <div className="tray-head">
          <span className="label">Your tray</span>
          <span className="hint">{hint}</span>
        </div>
      )}
      <div className="tray" role="group" aria-label="Your tray">
        {pieces.map((piece, i) => {
          const classes = ['tray-slot'];
          if (activeIndex === i) classes.push('active');
          if (selectedIndex === i) classes.push('selected');
          if (slotFeedback?.index === i) classes.push(`feedback-${slotFeedback.kind}`);
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
              {chromeVisible && <span className="slot-num">{i + 1}</span>}
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
