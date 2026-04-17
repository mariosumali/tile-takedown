# CLAUDE.md — Build blueprint for Tile Takedown

This file is the entry point for Claude Code. Read it first, then read `PRD.md` (product spec) and `DESIGN_SYSTEM.md` (visual + interaction spec). The scaffold in this repo is the visual starting point — the game engine and persistence layer are not implemented yet. Your job is to build them, phase by phase, without drifting from the spec.

---

## What's already done

- **Design system** (`DESIGN_SYSTEM.md`) is final. Don't renegotiate colors, type, or motion primitives. If you think something needs to change, flag it — don't silently change it.
- **Landing page** (`app/page.tsx`) renders the complete visual composition: nav, hero with live-looking demo board, modes, stats, features, controls, footer. All components are in `components/landing/` and `components/`.
- **Game page** (`app/play/page.tsx`) renders a full mid-run state: HUD cards, board with preclear row and ghost piece, tray, next-tray preview, undo card, mini stats, achievement toast. Visual only — no interactions.
- **Design tokens** live in `app/globals.css` as CSS custom properties. All four themes (`paper`, `linen`, `noir`, `high_contrast`) scaffolded via `html[data-theme]`.
- **Type definitions** start in `lib/types.ts` (pieces, cells, boards).
- **Mock state** for the visual pages lives in `lib/mockState.ts`. This is scaffolding data; replace it with real runtime state as the engine comes online.

## What's not done

- The game engine (placement, clearing, scoring, tray generation, game-over detection) — not implemented.
- Drag and drop / touch input — not wired.
- Persistence to localStorage — not wired.
- Framer Motion animations — CSS keyframes only at present; upgrade during Phase 2.
- Sandbox mode (`app/sandbox/page.tsx`) — does not exist yet. Fork from play after Phase 4.
- Stats, Achievements, Settings pages — not scaffolded.

---

## Build phases

Follow these in order. Don't jump ahead.

### Phase 1 · Engine (no UI)
Build pure functions in `lib/engine/`:
- `pieces.ts` — all 19 piece definitions (see PRD §02 piece set)
- `grid.ts` — `placePiece()`, `getClearedLines()`, `clearLines()`, `canAnyPieceFit()`
- `scoring.ts` — placement + clear + combo math (see PRD §02 scoring formula)
- `bag.ts` — weighted-random tray generator, 60-piece bag, density-aware bias

Tests (Vitest) live next to each file. Hit 100% on the engine before touching UI.

### Phase 2 · Classic UI + motion
Wire the engine into `app/play/page.tsx`:
- Replace mock state with a Zustand store (`stores/useGameStore.ts`)
- Pointer-based drag and drop for tray → grid
- Ghost placement preview (already visually scaffolded; hook up logic)
- Keyboard shortcuts (see PRD §11)
- Upgrade CSS keyframes to Framer Motion per DESIGN_SYSTEM §09
- Game-over card (not yet in mock; build per PRD §02)

### Phase 3 · Persistence
- `lib/storage/` with load, save, migrate, export/import
- Schema in `lib/storage/schema.ts` matches PRD §08 exactly
- Active-run resume on landing if `activeRun` exists

### Phase 4 · Sandbox
- Fork engine for infinite-tray mode
- `app/sandbox/page.tsx` with toolbar (reset, undo, redo, save snapshot, load snapshot)
- Piece palette sidebar (desktop)
- Snapshot drawer (up to 5 saved)

### Phase 5 · Landing polish
- Demo board on landing should actually auto-play (use the engine on a loop)
- Hook up `HIGH_SCORE` and `LAST_PLAYED` values to real persistence

### Phase 6 · Meta
- `app/stats/page.tsx` — calendar heatmap, histogram, last 50 runs
- `app/achievements/page.tsx` — 30-card grid, locked/unlocked states
- Achievement checker (`lib/achievements/checker.ts`) runs after every placement and clear

### Phase 7 · Settings + themes
- `app/settings/page.tsx`
- Theme switcher (wire `data-theme` attribute + token transitions)
- Piece set variant toggle
- Rotation toggle, next-tray preview toggle, tap-to-select, SFX/ambient/haptics
- Export/import JSON data

### Phase 8 · Audio, haptics, final polish
- `lib/audio/` for SFX + ambient
- `navigator.vibrate()` patterns per event
- `prefers-reduced-motion` full pass
- Keyboard-only QA
- Edge-case viewport testing

---

## Non-negotiables

1. **No backend.** Ever. All state is local. `localStorage` is the only persistence layer in v1.
2. **Two typefaces only.** Caprasimo (display) + Fraunces (body). No monospace, no sans-serif.
3. **Hard offset shadows only.** Never use blurred `box-shadow`. The entire elevation system is built on `Xpx Ypx 0 0 var(--ink)`.
4. **Tactile hover/press obeyed universally** on interactive elements (buttons, cards, mode pill, icon buttons, kbd, mode cards). Never skip. It's the signature.
5. **No zero border-radius.** Every surface is rounded.
6. **Framer Motion for state-driven animation, CSS for hover micro.** Don't mix them in the same effect.
7. **Warm tone in copy.** Sentence-case, short, wry. See DESIGN_SYSTEM §10.

---

## Project tree

```
tile-takedown/
├── README.md
├── CLAUDE.md
├── PRD.md
├── DESIGN_SYSTEM.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
├── app/
│   ├── globals.css          # all tokens + base styles + keyframes
│   ├── layout.tsx           # fonts, shell, grain overlay
│   ├── page.tsx             # LANDING — compose section components
│   └── play/
│       └── page.tsx         # GAME (Classic) — compose game components
├── components/
│   ├── Nav.tsx
│   ├── Footer.tsx
│   ├── BrandMark.tsx
│   ├── PieceShape.tsx       # render a piece from shape data
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── DemoBoard.tsx
│   │   ├── ModesSection.tsx
│   │   ├── StatsSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   └── ControlsSection.tsx
│   └── game/
│       ├── TopBar.tsx
│       ├── HudCard.tsx
│       ├── GameBoard.tsx
│       ├── Tray.tsx
│       ├── NextTrayCard.tsx
│       ├── UndoCard.tsx
│       ├── MiniStats.tsx
│       └── AchievementToast.tsx
└── lib/
    ├── types.ts             # PieceColor, Piece, CellState, BoardState
    └── mockState.ts         # demo state for the visual scaffold
```

---

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the landing. `/play` for the game mock.

When you implement new systems, keep them pure and testable. Keep components dumb — all logic lives in `lib/` or in stores.

One file, one concern. Be ruthless about that.
