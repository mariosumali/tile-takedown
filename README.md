# Tile Takedown

**Place. Clear. Repeat.**

Tile Takedown is a browser puzzle game: polyomino pieces from a three-slot tray go onto an 8×8 grid; filled rows and columns clear, combos multiply your score, and the run ends when nothing in the tray fits. A **Sandbox** mode offers the same grid and clears without score pressure—useful for experiments and zen placement.

Everything runs in the browser. **No accounts, no backend, no ads.** Progress, settings, and stats live in `localStorage`.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) · [React 19](https://react.dev/) · TypeScript
- [Zustand](https://zustand-demo.pmnd.rs/) for game and meta state
- [Framer Motion](https://www.framer.com/motion/) for motion where the design system calls for it
- [Vitest](https://vitest.dev/) for unit tests (engine and related logic under `lib/`)

Game rules, scoring, piece set, and UX requirements are specified in [`PRD.md`](./PRD.md). Visual and interaction details are in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). If you are extending the project with an AI assistant, [`CLAUDE.md`](./CLAUDE.md) is the build blueprint and phase guide.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/play` | Classic mode |
| `/sandbox` | Sandbox mode |
| `/stats` | Run history and aggregates |
| `/achievements` | Achievement grid |
| `/settings` | Themes, toggles, export/import |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (Next.js config) |
| `npm run typecheck` | TypeScript, no emit |
| `npx vitest` | Run tests in watch mode |
| `npx vitest run` | Single test run (e.g. CI) |

## Project layout (high level)

```
app/                 # App Router pages and global styles
components/          # UI: landing, game shell, shared pieces
lib/
  engine/            # Pure game logic: pieces, grid, bag, scoring
  storage/           # Persistence helpers
  achievements/      # Definitions + checker
  audio/             # SFX hooks
stores/              # Zustand stores (game, sandbox, settings, stats)
```

The engine under `lib/engine/` is written as **pure, testable functions**; React components and stores orchestrate input and persistence.

## Contributing / design constraints

When changing UI, follow [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md): display and body typefaces as specified there, hard offset shadows (no blurred elevation), tactile hover/press on interactive controls, and rounded surfaces throughout.

---

Made for quiet breaks and loud clears.
