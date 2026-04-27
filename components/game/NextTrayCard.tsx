import type { PieceShape } from '@/lib/types';

type Props = {
  pieces: ReadonlyArray<PieceShape>;
};

/** Shared mini preview row for upcoming tray pieces. */
export function NextTrayPreview({ pieces }: { pieces: ReadonlyArray<PieceShape> }) {
  return (
    <div className="nt-row">
      {pieces.slice(0, 3).map((shape, i) => {
        const cols = shape[0]?.length ?? 0;
        return (
          <div
            key={i}
            className="nt-piece"
            style={{ gridTemplateColumns: `repeat(${cols}, 11px)` }}
          >
            {shape.flat().map((v, idx) => (
              <div key={idx} className={v ? '' : 'empty'} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function NextTrayCard({ pieces }: Props) {
  return (
    <div className="card next-tray">
      <div className="eyebrow">next up</div>
      <NextTrayPreview pieces={pieces} />
    </div>
  );
}
