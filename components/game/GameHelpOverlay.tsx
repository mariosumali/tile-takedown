'use client';

import { useEffect } from 'react';

export type GameHelpMode = 'classic' | 'levels' | 'gimmicks';

type HelpItem = {
  control: string;
  label: string;
};

const DESKTOP_ITEMS: Record<GameHelpMode, HelpItem[]> = {
  classic: [
    { control: 'Drag', label: 'Pick up a tray piece and drop it on the board.' },
    { control: '1/2/3', label: 'Select a tray slot for keyboard placement.' },
    { control: 'Arrows', label: 'Move the selected ghost around the grid.' },
    { control: 'Enter', label: 'Place the selected piece at the ghost.' },
    { control: 'R', label: 'Rotate when rotation is enabled in settings.' },
    { control: 'Z', label: 'Undo. Classic gives you three.' },
  ],
  levels: [
    { control: 'Drag', label: 'Place pieces to reach the level target.' },
    { control: 'Stars', label: 'Score thresholds award one, two, or three stars.' },
    { control: 'Reshuffle', label: 'If the tray deadlocks, one redraw can save the run.' },
    { control: 'Par', label: 'Finish under par for an extra badge.' },
    { control: 'R', label: 'Rotate when rotation is enabled in settings.' },
    { control: 'Z', label: 'Undo the previous level move.' },
  ],
  gimmicks: [
    { control: 'Drag', label: 'Place pieces while obstacles try to jam the board.' },
    { control: 'Lives', label: 'Deadlocks and bombs cost lives. Lose all three and the run ends.' },
    { control: 'Power', label: 'Clear lines to fill the meter and reveal powerups.' },
    { control: 'Tap cell', label: 'After choosing a target powerup, pick a board cell.' },
    { control: 'Esc', label: 'Cancel a pending powerup or selected piece.' },
    { control: 'Z', label: 'Undo, up to the run limit.' },
  ],
};

const TOUCH_ITEMS: Record<GameHelpMode, HelpItem[]> = {
  classic: [
    { control: 'Drag', label: 'Press a tray piece and drag it onto the board.' },
    { control: 'Lifted piece', label: 'On touch, the piece floats above your finger so you can see it.' },
    { control: 'Tap mode', label: 'Turn on tap-to-select in settings for piece, then cell placement.' },
    { control: 'Ghost', label: 'Green previews fit; red previews bounce back.' },
    { control: 'Undo', label: 'Classic gives you three undos per run.' },
  ],
  levels: [
    { control: 'Drag', label: 'Place pieces and chase the target score.' },
    { control: 'Stars', label: 'One star unlocks the next level; three stars is mastery.' },
    { control: 'Tap mode', label: 'Tap-to-select in settings helps on smaller screens.' },
    { control: 'Reshuffle', label: 'Use the one redraw when the tray cannot fit.' },
    { control: 'Badges', label: 'Under par, no undo, big combo, and perfect clear add replay goals.' },
  ],
  gimmicks: [
    { control: 'Drag', label: 'Place pieces around locks, frozen cells, and bombs.' },
    { control: 'Lives', label: 'Deadlocks and bombs cost lives. Keep one in the bank.' },
    { control: 'Powerups', label: 'Clear marked tiles or use banked tools from the right side.' },
    { control: 'Tap target', label: 'Target powerups wait for you to tap a board cell.' },
    { control: 'Tap mode', label: 'Use tap-to-select if dragging feels cramped.' },
  ],
};

const TITLES: Record<GameHelpMode, string> = {
  classic: 'How classic works',
  levels: 'How levels work',
  gimmicks: 'How gimmicks work',
};

const SUBTEXT: Record<GameHelpMode, string> = {
  classic: 'Place pieces, fill rows or columns, and keep the tray alive.',
  levels: 'Each level is a small score puzzle with stars and bonus badges.',
  gimmicks: 'Classic pressure, plus obstacles, lives, and powerups.',
};

type Props = {
  mode: GameHelpMode;
  isTouchLike: boolean;
  onClose: () => void;
};

export default function GameHelpOverlay({ mode, isTouchLike, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = isTouchLike ? TOUCH_ITEMS[mode] : DESKTOP_ITEMS[mode];

  return (
    <div className="help-overlay" role="dialog" aria-label={TITLES[mode]} onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">{isTouchLike ? 'touch help' : 'controls'}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 38, marginTop: 8 }}>
          {TITLES[mode]}
        </h3>
        <p className="help-sub">{SUBTEXT[mode]}</p>
        <ul className="help-list">
          {items.map((item) => (
            <li key={`${item.control}-${item.label}`}>
              <kbd className="kbd">{item.control}</kbd>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 24 }}>
          Got it
        </button>
      </div>
    </div>
  );
}
