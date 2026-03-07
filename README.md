# Garden Defense

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![Phaser](https://img.shields.io/badge/Phaser-3.80-blueviolet?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMiAyMmgyMEwxMiAyeiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)
![Tests](https://img.shields.io/badge/tests-101%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

Defend your garden from pest invasions! A browser-based tower defense game built with Phaser 3 and TypeScript. Plant trees that house beneficial predators to fight off waves of garden pests.

**Play now at [gardendefense.vercel.app](https://gardendefense.vercel.app)**

## Daily Challenge

Every day brings a **new randomly generated map** — same map for all players, seeded by the date. Compete on the **cloud leaderboard** for the highest score each day. Scores reset when the daily map changes.

## Play Locally

```bash
npm install
npm run dev
```

Open the URL Vite gives you. Place towers on the soil cells, then hit **Start Wave**.

## How to Play

- **Select a tower** at the bottom (Ladybug or Mantis)
- **Click empty cells** to place towers (costs money)
- **Drag towers** to reposition them
- **Click a tower** to select it, then **Sell** to get your money back
- **Start Wave** to send pests down the path
- Pests follow the dirt path — eliminate them before they destroy your garden
- Endless waves with increasing difficulty — survive as long as you can!
- When your garden is destroyed, enter your **3-letter initials** for the leaderboard

| Tower | Cost | Damage | Fire Rate | Range | Predator |
|-------|------|--------|-----------|-------|----------|
| Ladybug Tree | $25 | 10 | Fast | Short | Ladybugs — classic aphid hunters |
| Mantis Tree | $50 | 40 | Slow | Long | Praying mantises — apex garden predators |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and bundle |
| `npm test` | Run tests with coverage |

## Tech Stack

- **Phaser 3** — Game engine / rendering
- **TypeScript** — Language
- **Vite** — Dev server and bundler
- **Vitest** — Testing with v8 coverage
- **Vercel** — Hosting and serverless functions
- **Vercel Blob** — Cloud leaderboard storage
