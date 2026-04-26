'use client';

/**
 * Debug terminal overlay — unlocked by the TERMINAL cheat code (see
 * components/meta/SettingsView.tsx + lib/cheats.ts). Floating, minimisable
 * panel with a tiny command language for tweaking the current run, stats,
 * theme, and achievements on the fly.
 *
 * Intentionally dependency-free beyond the existing stores so nothing in the
 * normal app pipeline ever imports this. Mounted once in app/layout.tsx and
 * self-gates on the cheat flag.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCheatActive } from '@/lib/cheats';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useGameStore } from '@/stores/useGameStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '@/lib/achievements/definitions';
import { createEmptyBoard } from '@/lib/engine/grid';
import { K } from '@/lib/storage/keys';
import { writeJSON } from '@/lib/storage/safe';
import type { Theme } from '@/lib/types';

type Line =
  | { kind: 'cmd'; text: string }
  | { kind: 'out'; text: string }
  | { kind: 'err'; text: string };

const VALID_THEMES: Theme[] = ['paper', 'linen', 'noir', 'high_contrast'];

const HELP_LINES = [
  'commands:',
  '  help                   show this list',
  '  clear                  clear the terminal output',
  '  stats                  print lifetime stats',
  '  run                    print current run summary',
  '  score +N | -N | =N     adjust current run score',
  '  highscore =N           set lifetime high score',
  '  combo =N               set current run combo',
  '  clear-board            empty the current run board',
  '  end-run                end the current run now',
  '  start-run              start a new classic run',
  '  unlock <id> | unlock all   unlock achievement(s)',
  '  theme <id>             set theme (paper|linen|noir|high_contrast)',
  '  cheat off <code>       deactivate a cheat code',
  '',
  'tip: ↑/↓ walks command history.',
];

export default function DebugTerminal() {
  const active = useCheatActive('TERMINAL');
  const [open, setOpen] = useState(true);
  const [lines, setLines] = useState<Line[]>(() => [
    { kind: 'out', text: '// terminal unlocked. type `help` for commands.' },
  ]);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const append = useCallback((next: Line | Line[]) => {
    setLines((prev) => prev.concat(Array.isArray(next) ? next : [next]));
  }, []);

  const run = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input) return;
      append({ kind: 'cmd', text: `> ${input}` });
      setHistory((h) => (h[h.length - 1] === input ? h : h.concat(input)));
      setHistIdx(null);

      const [cmd, ...rest] = input.split(/\s+/);
      const arg = rest.join(' ');
      try {
        const out = execute(cmd.toLowerCase(), rest, arg);
        if (out === 'CLEAR_TERMINAL') {
          setLines([{ kind: 'out', text: '// cleared.' }]);
          return;
        }
        if (Array.isArray(out)) {
          append(out.map((text) => ({ kind: 'out', text }) as Line));
        } else if (out) {
          append({ kind: 'out', text: out });
        }
      } catch (e: unknown) {
        append({ kind: 'err', text: `err: ${(e as Error).message}` });
      }
    },
    [append],
  );

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  if (!active) return null;

  return (
    <div className={`dbg-term ${open ? 'open' : 'closed'}`} data-open={open}>
      <button
        type="button"
        className="dbg-term-head"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-expanded={open}
      >
        <span className="dbg-term-title">TERMINAL</span>
        <span className="dbg-term-chev" aria-hidden>
          {open ? '▾' : '▴'}
        </span>
      </button>
      {open && (
        <>
          <div ref={outputRef} className="dbg-term-output" role="log">
            {lines.map((l, i) => (
              <div key={i} className={`dbg-term-line dbg-term-${l.kind}`}>
                {l.text}
              </div>
            ))}
          </div>
          <form
            className="dbg-term-row"
            onSubmit={(e) => {
              e.preventDefault();
              run(value);
              setValue('');
            }}
          >
            <span className="dbg-term-prompt" aria-hidden>
              &gt;
            </span>
            <input
              ref={inputRef}
              className="dbg-term-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (history.length === 0) return;
                  const next = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
                  setHistIdx(next);
                  setValue(history[next] ?? '');
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (histIdx === null) return;
                  const next = histIdx + 1;
                  if (next >= history.length) {
                    setHistIdx(null);
                    setValue('');
                  } else {
                    setHistIdx(next);
                    setValue(history[next] ?? '');
                  }
                }
              }}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder="help"
              aria-label="debug terminal input"
            />
          </form>
        </>
      )}
    </div>
  );
}

/* ----------------------------- command core ----------------------------- */

function execute(
  cmd: string,
  args: string[],
  argString: string,
): string | string[] | 'CLEAR_TERMINAL' | null {
  switch (cmd) {
    case 'help':
      return HELP_LINES;

    case 'clear':
      return 'CLEAR_TERMINAL';

    case 'stats': {
      const s = useStatsStore.getState().stats;
      return [
        `games played: ${s.gamesPlayed}`,
        `high score:   ${s.highScore}`,
        `total score:  ${s.totalScore}`,
        `placements:   ${s.totalPlacements}`,
        `longest combo:${s.longestCombo}`,
        `perfects:     ${s.perfectClears}`,
      ];
    }

    case 'run': {
      const run = useGameStore.getState().run;
      if (!run) return 'no active classic run.';
      return [
        `id:        ${run.id}`,
        `score:     ${run.score}`,
        `combo:     ${run.combo} (peak ${run.comboPeak})`,
        `placements:${run.placements}`,
        `game over: ${run.gameOver}`,
      ];
    }

    case 'score':
      return mutateRunScore(argString);

    case 'highscore':
      return setHighScore(argString);

    case 'combo':
      return setCombo(argString);

    case 'clear-board':
      return clearBoard();

    case 'end-run': {
      const run = useGameStore.getState().run;
      if (!run) return 'no active run.';
      useGameStore.getState().endRun();
      return 'run ended.';
    }

    case 'start-run':
      useGameStore.getState().startRun();
      return 'new run started.';

    case 'unlock':
      return unlockAchievements(args);

    case 'theme': {
      const id = args[0] as Theme;
      if (!VALID_THEMES.includes(id)) {
        throw new Error(`unknown theme. options: ${VALID_THEMES.join(', ')}`);
      }
      useSettingsStore.getState().set('theme', id);
      return `theme set to ${id}.`;
    }

    case 'cheat': {
      if (args[0] !== 'off') throw new Error('usage: cheat off <code>');
      const code = (args[1] ?? '').toUpperCase();
      if (!code) throw new Error('usage: cheat off <code>');
      useSettingsStore.getState().deactivateCheat(code);
      return `deactivated ${code}.`;
    }

    default:
      throw new Error(`unknown command: ${cmd}. try \`help\`.`);
  }
}

function mutateRunScore(arg: string): string {
  const run = useGameStore.getState().run;
  if (!run) throw new Error('no active run.');
  const match = arg.match(/^([+\-=])\s*(-?\d+)$/);
  if (!match) throw new Error('usage: score +N | -N | =N');
  const op = match[1];
  const n = parseInt(match[2], 10);
  let next = run.score;
  if (op === '+') next = run.score + n;
  else if (op === '-') next = run.score - n;
  else next = n;
  next = Math.max(0, next);
  useGameStore.setState({ run: { ...run, score: next } });
  return `score: ${run.score} → ${next}.`;
}

function setHighScore(arg: string): string {
  const match = arg.match(/^=\s*(\d+)$/);
  if (!match) throw new Error('usage: highscore =N');
  const n = parseInt(match[1], 10);
  const stats = useStatsStore.getState().stats;
  const next = { ...stats, highScore: n };
  useStatsStore.setState({ stats: next });
  writeJSON(K.stats, next);
  return `high score: ${stats.highScore} → ${n}.`;
}

function setCombo(arg: string): string {
  const run = useGameStore.getState().run;
  if (!run) throw new Error('no active run.');
  const match = arg.match(/^=\s*(\d+)$/);
  if (!match) throw new Error('usage: combo =N');
  const n = parseInt(match[1], 10);
  useGameStore.setState({
    run: { ...run, combo: n, comboPeak: Math.max(run.comboPeak, n) },
  });
  return `combo → ${n}.`;
}

function clearBoard(): string {
  const run = useGameStore.getState().run;
  if (!run) throw new Error('no active run.');
  useGameStore.setState({
    run: { ...run, board: createEmptyBoard() },
    clearingRows: [],
    clearingCols: [],
    clearingBoard: null,
  });
  return 'board cleared.';
}

function unlockAchievements(args: string[]): string {
  if (args.length === 0) throw new Error('usage: unlock <id> | unlock all');
  const stats = useStatsStore.getState();
  if (args[0] === 'all') {
    let n = 0;
    for (const a of ACHIEVEMENTS) {
      if (stats.unlock(a.id)) n++;
    }
    return `unlocked ${n} achievement(s).`;
  }
  const id = args[0];
  if (!ACHIEVEMENTS_BY_ID[id]) throw new Error(`unknown achievement: ${id}`);
  const ok = stats.unlock(id);
  return ok ? `unlocked ${id}.` : `${id} was already unlocked.`;
}
