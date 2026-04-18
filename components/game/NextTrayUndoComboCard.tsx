import type { PieceShape } from '@/lib/types';
import { NextTrayPreview } from './NextTrayCard';

type Props = {
  nextShapes: ReadonlyArray<PieceShape>;
  showNext: boolean;
  undosUsed: number;
  undoTotal?: number;
};

/** Single sidebar card on mobile: incoming queue + undo count. */
export default function NextTrayUndoComboCard({
  nextShapes,
  showNext,
  undosUsed,
  undoTotal = 3,
}: Props) {
  const hasNext = showNext && nextShapes.length > 0;

  return (
    <div className="card next-undo-combo">
      {hasNext ? (
        <div className="nu-combo-section nu-combo-next">
          <div className="eyebrow">next up</div>
          <NextTrayPreview pieces={nextShapes} />
        </div>
      ) : null}
      <div className="nu-combo-section nu-combo-undo">
        <div className="eyebrow">undos left</div>
        <div className="undo-coins" aria-label={`${undoTotal - undosUsed} undos remaining`}>
          {Array.from({ length: undoTotal }).map((_, i) => (
            <span key={i} className={i < undoTotal - undosUsed ? '' : 'spent'}>
              &#8630;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
