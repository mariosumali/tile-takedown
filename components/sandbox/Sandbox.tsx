'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import GameBoard from '@/components/game/GameBoard';
import PieceShape from '@/components/PieceShape';
import BrandMark from '@/components/BrandMark';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { PIECE_COLORS, PIECE_DEFS } from '@/lib/engine/pieces';
import type { PieceColor } from '@/lib/types';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useApplyWorldTheme } from '@/lib/hooks/useApplyWorldTheme';

export default function Sandbox() {
  useApplyWorldTheme();
  const hydrated = useSandboxStore((s) => s.hydrated);
  const board = useSandboxStore((s) => s.board);
  const selectedShape = useSandboxStore((s) => s.selectedShape);
  const selectedColor = useSandboxStore((s) => s.selectedColor);
  const paintMode = useSandboxStore((s) => s.paintMode);
  const snapshots = useSandboxStore((s) => s.snapshots);
  const hydrate = useSandboxStore((s) => s.hydrate);
  const selectShape = useSandboxStore((s) => s.selectShape);
  const rotateSelected = useSandboxStore((s) => s.rotateSelected);
  const selectColor = useSandboxStore((s) => s.selectColor);
  const togglePaint = useSandboxStore((s) => s.togglePaintMode);
  const tryPlace = useSandboxStore((s) => s.tryPlace);
  const paintCell = useSandboxStore((s) => s.paintCell);
  const eraseCell = useSandboxStore((s) => s.eraseCell);
  const clearAll = useSandboxStore((s) => s.clearAll);
  const clearLinesNow = useSandboxStore((s) => s.clearLinesNow);
  const saveSnapshot = useSandboxStore((s) => s.saveSnapshot);
  const loadSnapshot = useSandboxStore((s) => s.loadSnapshot);
  const deleteSnapshot = useSandboxStore((s) => s.deleteSnapshot);

  const settingsHydrate = useSettingsStore((s) => s.hydrate);
  useEffect(() => {
    settingsHydrate();
    hydrate();
  }, [hydrate, settingsHydrate]);

  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'r' || e.key === 'R') {
        if (selectedShape) {
          e.preventDefault();
          rotateSelected();
        }
      } else if (e.key === 'Escape') {
        selectShape(null);
      } else if (e.key === 'c' || e.key === 'C') {
        clearAll();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedShape, rotateSelected, selectShape, clearAll]);

  function handleCellDown(row: number, col: number, e: React.PointerEvent) {
    if (paintMode) {
      if (e.shiftKey || e.button === 2 || e.altKey) eraseCell(row, col);
      else paintCell(row, col);
      return;
    }
    if (selectedShape) {
      tryPlace(row, col);
    }
  }

  function handleCellEnter(row: number, col: number, e: React.PointerEvent) {
    setHover({ row, col });
    if (paintMode && (e.buttons & 1)) {
      if (e.shiftKey || e.altKey) eraseCell(row, col);
      else paintCell(row, col);
    }
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  // Group defs by size
  const bySize = PIECE_DEFS.reduce<Record<number, typeof PIECE_DEFS>>(
    (acc, d) => ({ ...acc, [d.size]: [...(acc[d.size] ?? []), d] as any }),
    {},
  );
  const sizes = Object.keys(bySize).map(Number).sort((a, b) => a - b);

  // Deduplicate by shape signature per size (only first rotation)
  function dedupe(defs: typeof PIECE_DEFS): typeof PIECE_DEFS {
    const seen = new Set<string>();
    const out: typeof PIECE_DEFS[number][] = [];
    for (const d of defs) {
      const k = d.shape.map((r) => r.join('')).join('|');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(d);
    }
    return out as any;
  }

  return (
    <>
      <header className="sb-topbar">
        <Link href="/" className="brand">
          <BrandMark size="md" />
        </Link>
        <div className="sb-title">
          <div className="eyebrow">mode</div>
          <h1>sandbox</h1>
        </div>
        <div className="sb-actions">
          <Link href="/play" className="btn btn-secondary">
            Classic
          </Link>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </header>

      <div className="sb-stage">
        <aside className="sb-palette card">
          <div className="eyebrow">palette</div>
          <div className="sb-colors">
            {PIECE_COLORS.map((c) => (
              <button
                key={c}
                className={`sb-chip ${selectedColor === c ? 'on' : ''}`}
                style={
                  {
                    ['--chip' as any]: `var(--${c === 'cream' ? 'cream-tile' : c})`,
                  } as React.CSSProperties
                }
                onClick={() => selectColor(c as PieceColor)}
                aria-label={`Color ${c}`}
                aria-pressed={selectedColor === c}
                title={c}
              />
            ))}
          </div>

          <div className="sb-tools">
            <button
              className={`btn ${paintMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={togglePaint}
              title="Paint mode (click/drag cells)"
            >
              {paintMode ? 'Paint · on' : 'Paint'}
            </button>
            <button className="btn btn-secondary" onClick={() => clearLinesNow() > 0 && flash('lines cleared')}>
              Clear lines
            </button>
            <button className="btn btn-ghost" onClick={clearAll}>
              Clear all
            </button>
          </div>

          <div className="eyebrow" style={{ marginTop: 20 }}>
            shapes
          </div>
          {sizes.map((size) => (
            <div key={size} className="sb-group">
              <div className="sb-size-label">size {size}</div>
              <div className="sb-shapes">
                {dedupe(bySize[size]).map((d, i) => {
                  const active = selectedShape === d.shape;
                  return (
                    <button
                      key={`${d.id}-${i}`}
                      className={`sb-shape ${active ? 'on' : ''}`}
                      onClick={() => selectShape(d.shape)}
                      title={d.id}
                      aria-label={`Shape ${d.id}`}
                    >
                      <PieceShape shape={d.shape} color={selectedColor} size="tray" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <div className="sb-board-wrap">
          <div className="sb-hint">
            {paintMode
              ? 'paint mode · click/drag to fill · Shift/Alt + click to erase'
              : selectedShape
                ? 'click the board to place · R rotates'
                : 'pick a shape or enable paint mode'}
          </div>
          <GameBoard
            board={board}
            ghostShape={paintMode ? null : selectedShape}
            ghostAnchor={paintMode ? null : hover}
            ghostColor={selectedColor}
            ghostLegal={
              selectedShape && hover
                ? /* show legal ghost only when placement is legal */ true
                : true
            }
            onCellDown={handleCellDown}
            onCellEnter={handleCellEnter}
            onBoardLeave={() => setHover(null)}
          />
        </div>

        <aside className="sb-snaps card">
          <div className="eyebrow">snapshots</div>
          <button
            className="btn btn-primary"
            onClick={() => {
              saveSnapshot();
              flash('snapshot saved');
            }}
            style={{ width: '100%' }}
          >
            Save snapshot
          </button>
          <div className="sb-snap-list">
            {snapshots.length === 0 && (
              <div className="sb-empty">no snapshots yet</div>
            )}
            {snapshots.map((s) => (
              <div key={s.id} className="sb-snap-item">
                <button
                  className="sb-snap-mini"
                  onClick={() => {
                    loadSnapshot(s.id);
                    flash('snapshot loaded');
                  }}
                  aria-label="Load snapshot"
                >
                  <MiniBoard board={s.board} />
                </button>
                <div className="sb-snap-meta">
                  <div>
                    {new Date(s.createdAt).toLocaleDateString()}{' '}
                    {new Date(s.createdAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  <button
                    className="sb-snap-del"
                    onClick={() => deleteSnapshot(s.id)}
                    aria-label="Delete snapshot"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {toast && <div className="sb-toast">{toast}</div>}

      {!hydrated && <div className="sb-loading">loading…</div>}
    </>
  );
}

function MiniBoard({ board }: { board: ReadonlyArray<ReadonlyArray<PieceColor | null>> }) {
  return (
    <div className="sb-mini-grid">
      {board.flatMap((row, r) =>
        row.map((v, c) => (
          <div
            key={`${r}-${c}`}
            className={`sb-mini-cell ${v ? `fill-${v} filled` : ''}`}
          />
        )),
      )}
    </div>
  );
}
