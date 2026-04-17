import type { PieceShape } from '@/lib/types';

type Props = {
  pieces: ReadonlyArray<PieceShape>;
};

export default function NextTrayCard({ pieces }: Props) {
  return (
    <div className="card next-tray">
      <div className="eyebrow">next up</div>
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
    </div>
  );
}
