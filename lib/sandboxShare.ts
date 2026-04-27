import type { BoardState, PieceColor } from './types';

const COLOR_TO_CODE: Record<PieceColor, string> = {
  tomato: 't',
  mustard: 'm',
  olive: 'o',
  sky: 's',
  plum: 'p',
  cream: 'c',
};

const CODE_TO_COLOR: Record<string, PieceColor> = {
  t: 'tomato',
  m: 'mustard',
  o: 'olive',
  s: 'sky',
  p: 'plum',
  c: 'cream',
};

export function encodeSandboxBoard(board: BoardState): string {
  return board.map((row) => row.map((cell) => (cell ? COLOR_TO_CODE[cell] : '0')).join('')).join('');
}

export function decodeSandboxBoard(value: string): BoardState | null {
  if (value.length !== 64) return null;

  const rows: Array<Array<PieceColor | null>> = [];
  for (let r = 0; r < 8; r++) {
    const row: Array<PieceColor | null> = [];
    for (let c = 0; c < 8; c++) {
      const code = value[r * 8 + c];
      if (code === '0') {
        row.push(null);
        continue;
      }
      const color = CODE_TO_COLOR[code];
      if (!color) return null;
      row.push(color);
    }
    rows.push(row);
  }
  return rows;
}
