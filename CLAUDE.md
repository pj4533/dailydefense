# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (play in browser)
- `npm run build` — Type-check with tsc then bundle with Vite
- `npm test` — Run all tests with coverage (vitest + v8)
- `npx vitest run tests/GameState.test.ts` — Run a single test file
- `npx tsc --noEmit` — Type-check only

## Architecture

Browser-based tower defense game using **Phaser 3** + **TypeScript**, bundled with **Vite**.

### Logic/Rendering Separation

The codebase is split into a **pure logic layer** (`src/logic/`) and a **Phaser rendering layer** (`src/scenes/`). This is the most important architectural decision:

- **`src/logic/`** — All game mechanics as plain TypeScript classes with zero Phaser dependencies. Fully unit-testable.
- **`src/scenes/GameScene.ts`** — Thin Phaser scene that reads engine state and draws colored rectangles. No game logic here.
- **`src/main.ts`** — Phaser game bootstrap (excluded from coverage).

### Game Engine Flow

`GameEngine` orchestrates the game loop in a strict order each frame:
1. Spawn enemies (via WaveManager)
2. Move enemies along path
3. Process enemies that reached the end (lose lives)
4. Towers fire at alive enemies (create Projectiles)
5. Move projectiles (may kill enemies via takeDamage)
6. Collect rewards for killed enemies (not end-reached ones)
7. Cleanup dead entities
8. Check victory condition

### Key Classes

- **GameEngine** — Central orchestrator; owns all entities and delegates to subsystems
- **GameMap** — Grid (CellType[][]), path marking from waypoints, tower placement validation
- **WaveManager** — Steps through wave/group/enemy indices with spawn timers
- **GameState** — Money, lives, game-over/victory flags

### Configuration

`src/config.ts` holds all tuning constants: grid dimensions, tile size, tower stats, enemy stats, wave definitions, and path waypoints. `src/types.ts` has shared interfaces and enums.

## Testing

Tests live in `tests/` and mirror `src/logic/` one-to-one. Coverage is measured on `src/**/*.ts` excluding `src/main.ts` and `src/scenes/` (Phaser-dependent, untestable in Node). Target: **80%+ coverage**.
