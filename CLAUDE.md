# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (play in browser)
- `npm run build` — Type-check with tsc then bundle with Vite
- `npm test` — Run all tests with coverage (vitest + v8)
- `npx vitest run tests/GameState.test.ts` — Run a single test file
- `npx tsc --noEmit` — Type-check only
- `npm run reset-leaderboards` — **DESTRUCTIVE: Wipes ALL leaderboard and session data from Redis. Only run with explicit user approval.** Requires `.env.local` (run `vercel env pull .env.local` first).

## Deployment

Hosted on **Vercel** at [dailydefense.ai](https://dailydefense.ai). GitHub repo is connected — **pushing to `main` auto-deploys to production**. No need to run `vercel --prod` manually.

- **Vercel CLI** is linked to the project (`.vercel/` directory, gitignored)
- **Environment variables**: `BLOB_READ_WRITE_TOKEN` is set in Vercel for all environments
- To pull env vars locally: `vercel env pull .env.local`

## Architecture

Browser-based garden defense game using **Phaser 3** + **TypeScript**, bundled with **Vite**.

### Theme

Towers are **trees that house beneficial predators** (ladybugs, mantises). Each tower type sends out a specific natural predator as its projectile. Enemies are common **garden pests** (aphids, ants, beetles). Future tower types can include birds, frogs, and other beneficial garden creatures.

### Logic/Rendering Separation

The codebase is split into a **pure logic layer** (`src/logic/`), a **Phaser rendering layer** (`src/scenes/`), and a **serverless API** (`api/`). This is the most important architectural decision:

- **`src/logic/`** — All game mechanics as plain TypeScript classes with zero Phaser dependencies. Fully unit-testable.
- **`src/scenes/`** — Phaser scenes that read engine state and render. No game logic here.
- **`api/`** — Vercel serverless functions (leaderboard backend).
- **`src/main.ts`** — Phaser game bootstrap (excluded from coverage).

### Daily Seeds & Map Generation

Every day gets a unique map and leaderboard:

- **`src/logic/dailySeed.ts`** — `getDailySeed()` returns `YYYYMMDD` as an integer (e.g. `20260307`). `getDailySeedLabel()` returns a display string like `"MAR 07"`.
- **`src/logic/seedRng.ts`** — `mulberry32(seed)` is a deterministic PRNG seeded by the daily seed.
- **`src/logic/MapGenerator.ts`** — `generateRandomPath()` uses the seeded RNG to produce a random path layout. Same seed = same map for all players that day.
- **`src/logic/WaveGenerator.ts`** — `generateWave()` produces endless scaling waves. `maxScoreForWave()` computes the theoretical max score for a given wave (used by anti-cheat).

### Leaderboard System

Cloud leaderboard powered by **Upstash Redis** (sorted sets):

- **`api/leaderboard.ts`** — Serverless function handling GET to fetch top 10 scores. Stores data as `leaderboard:{seed}` sorted sets in Redis. Each daily seed has its own leaderboard (TTL: 7 days).
- **`api/session.ts`** — Creates a signed session for browser clients at game start. Stores session in Redis with HMAC secret and wave-tracking fields.
- **`api/session/wave-complete.ts`** — Anti-cheat endpoint. Browser clients must report each wave completion; server tracks `wavesCompleted` and `maxPossibleScore`.
- **`api/submit-score.ts`** — Score submission for browser clients. Validates HMAC signature, requires at least 1 wave completed, and caps the score to the server-tracked maximum.
- **`src/logic/Leaderboard.ts`** — Client-side class that calls session, wave-complete, leaderboard, and submit-score endpoints.
- **`src/scenes/GameOverScene.ts`** — Initials entry screen (3-letter arcade style). Submits score then transitions to leaderboard.
- **`src/scenes/LeaderboardScene.ts`** — Displays top 10 scores for the current daily seed. Accessible mid-game via the "Scores" HUD button.

### Anti-Cheat (Browser Client Flow)

The browser leaderboard submission uses server-side wave tracking to prevent score fabrication:

1. **Session start** (`POST /api/session`) — Server creates a session with `wavesCompleted: 0`, `maxPossibleScore: 0`, and an HMAC secret.
2. **Wave reporting** (`POST /api/session/wave-complete`) — After each wave clears, the client reports it. Server enforces 5-second minimum between waves and accumulates `maxPossibleScore` using `maxScoreForWave()`.
3. **Score submission** (`POST /api/submit-score`) — Server rejects if `wavesCompleted < 1`. Score is capped to `maxPossibleScore + maxScoreForWave(wavesCompleted)` (the extra wave covers partial kills during the death wave).

`GameEngine.onWaveComplete` callback fires when a wave is cleared; `GameScene` wires this to call `Leaderboard.reportWaveComplete()`.

The agent API flow (`/api/game/*`) is unaffected — it uses full server-side simulation and auto-submits scores.

### Game Engine Flow

`GameEngine` orchestrates the game loop in a strict order each frame:
1. Spawn enemies (via WaveManager)
2. Move enemies along path
3. Process enemies that reached the end (lose lives)
4. Towers fire at alive enemies (create Projectiles)
5. Move projectiles (may kill enemies via takeDamage)
6. Collect rewards for killed enemies (not end-reached ones)
7. Cleanup dead entities
8. Check wave-clear condition (awards bonus, fires `onWaveComplete` callback)

### Key Classes

- **GameEngine** — Central orchestrator; owns all entities and delegates to subsystems
- **GameMap** — Grid (CellType[][]), path marking from waypoints, tower placement validation
- **WaveManager** — Steps through wave/group/enemy indices with spawn timers
- **GameState** — Money, lives, game-over/victory flags, score tracking

### Scenes

- **GameScene** — Main gameplay: tower placement/dragging, enemy rendering, HUD, wave control
- **GameOverScene** — Arcade-style 3-letter initials entry, submits score to cloud leaderboard
- **LeaderboardScene** — Retro top-10 display with blinking highlight for current player

### Configuration

`src/config.ts` holds all tuning constants: grid dimensions, tile size, tower stats, enemy stats, wave definitions, and path waypoints. `src/types.ts` has shared interfaces and enums.

## Testing

Tests live in `tests/` and mirror `src/logic/` one-to-one. Coverage is measured on `src/**/*.ts` excluding `src/main.ts` and `src/scenes/` (Phaser-dependent, untestable in Node). Target: **80%+ coverage**.

## Reference

- [docs/GENRE_RESEARCH.md](docs/GENRE_RESEARCH.md) — Exhaustive tower defense genre research: history, mechanics, design principles, balancing formulas, notable games, and innovations. Consult when making design decisions.
