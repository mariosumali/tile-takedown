'use client';

import { useEffect, useRef } from 'react';

export type GameHelpMode = 'classic' | 'levels' | 'gimmicks' | 'sandbox';

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
    { control: 'M', label: 'Mute sound.' },
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
  sandbox: [
    { control: 'Palette', label: 'Choose a color and a shape, then click the board.' },
    { control: 'Paint', label: 'Paint mode fills individual cells by click or drag.' },
    { control: 'Shift/Alt', label: 'Erase cells while painting.' },
    { control: 'R', label: 'Rotate the selected shape before placing.' },
    { control: 'Save', label: 'Store snapshots or share the current board.' },
  ],
};

const TOUCH_ITEMS: Record<GameHelpMode, HelpItem[]> = {
  classic: [
    { control: 'Drag', label: 'Press a tray piece and drag it onto the board.' },
    { control: 'Lifted piece', label: 'On touch, the piece floats above your finger so you can see it.' },
    { control: 'Tap mode', label: 'Turn on tap-to-select in settings for piece, then cell placement.' },
    { control: 'Ghost', label: 'Green previews fit; red previews bounce back.' },
    { control: 'No moves', label: 'When the tray cannot fit, the run ends.' },
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
  sandbox: [
    { control: 'Palette', label: 'Tap a color and shape, then tap the board.' },
    { control: 'Paint', label: 'Paint mode lets you draw directly into cells.' },
    { control: 'Clear', label: 'Clear lines or wipe the whole board whenever you like.' },
    { control: 'Snapshots', label: 'Save tiny board ideas and load them later.' },
    { control: 'Share', label: 'Copy a link to your current board.' },
  ],
};

const TITLES: Record<GameHelpMode, string> = {
  classic: 'How classic works',
  levels: 'How levels work',
  gimmicks: 'How gimmicks work',
  sandbox: 'How sandbox works',
};

const SUBTEXT: Record<GameHelpMode, string> = {
  classic: 'Place pieces, fill rows or columns, and keep the tray alive.',
  levels: 'Each level is a small score puzzle with stars and bonus badges.',
  gimmicks: 'Classic pressure, plus obstacles, lives, and powerups.',
  sandbox: 'Build, paint, clear, save, and share without pressure.',
};

type Props = {
  mode: GameHelpMode;
  isTouchLike: boolean;
  onClose: () => void;
};

export default function GameHelpOverlay({ mode, isTouchLike, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const items = isTouchLike ? TOUCH_ITEMS[mode] : DESKTOP_ITEMS[mode];

  function trapFocus(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;
    const root = cardRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.tabIndex >= 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="help-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[mode]}
      onClick={onClose}
      onKeyDown={trapFocus}
    >
      <div ref={cardRef} className="help-card" onClick={(e) => e.stopPropagation()}>
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
        {mode === 'gimmicks' && <GimmicksCodex />}
        <button
          ref={closeRef}
          className="btn btn-primary"
          onClick={onClose}
          style={{ marginTop: 24 }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function GimmicksCodex() {
  return (
    <div className="help-codex" aria-label="Gimmicks quick reference">
      <div className="help-codex-title">Quick codex</div>
      <div className="help-codex-grid">
        <span>Locked</span>
        <p>Cannot be covered until cleared by a line or tool.</p>
        <span>Frozen</span>
        <p>Melts after turns. Work around it until then.</p>
        <span>Bomb</span>
        <p>Costs a life if its timer runs out.</p>
        <span>Power</span>
        <p>Clears fill the meter and marked tiles can bank tools.</p>
      </div>
    </div>
  );
}
