# Cyberpunk Tower Defense

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![Phaser](https://img.shields.io/badge/Phaser-3.80-blueviolet?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMiAyMmgyMEwxMiAyeiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)
![Tests](https://img.shields.io/badge/tests-84%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

A browser-based tower defense game built with Phaser 3 and TypeScript. Currently using placeholder graphics — cyberpunk tileset coming soon.

## Play

```bash
npm install
npm run dev
```

Open the URL Vite gives you. Place towers on the dark grid cells, then hit **Start Wave**.

## How to Play

- **Select a tower** at the bottom (Basic or Sniper)
- **Click empty cells** to place towers (costs money)
- **Start Wave** to send enemies down the path
- Enemies follow the gray path — kill them before they reach the end
- Survive all 5 waves to win

| Tower | Cost | Damage | Fire Rate | Range |
|-------|------|--------|-----------|-------|
| Basic | $25 | 10 | Fast | Short |
| Sniper | $50 | 40 | Slow | Long |

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
