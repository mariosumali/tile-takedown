import PieceShape from '../PieceShape';
import {
  landingDemoBoard,
  landingGhostCells,
  landingPreclearRow,
  landingTray,
} from '@/lib/mockState';

function isGhost(r: number, c: number): boolean {
  return landingGhostCells.some(([gr, gc]) => gr === r && gc === c);
}

export default function DemoBoard() {
  return (
    <div className="demo-wrap">
      <div className="demo-board">
        <div className="demo-header">
          <span className="score-mini">
            12,480 <span className="x">&times;3</span>
          </span>
        </div>

        <div className="demo-grid">
          {landingDemoBoard.flatMap((row, r) =>
            row.map((v, c) => {
              const classes = ['cell'];
              if (v) classes.push('filled', `fill-${v}`);
              if (r === landingPreclearRow && v) classes.push('preclear');
              if (!v && isGhost(r, c)) classes.push('filled', 'ghost');
              return (
                <div key={`${r}-${c}`} className={classes.join(' ')} />
              );
            }),
          )}
        </div>

        <div className="demo-tray-mini">
          {landingTray.map((piece, i) => (
            <div key={i} className="tray-slot-mini">
              <PieceShape shape={piece.shape} color={piece.color} size="mini" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
