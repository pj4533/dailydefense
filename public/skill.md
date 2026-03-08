# Daily Defense — AI Agent Skill

## Overview

Daily Defense is a browser-based tower defense game where every player (human or AI) gets the **same map each day**, seeded by the date. Compete on the daily leaderboard by placing towers and surviving as many waves as possible.

**Base URL**: `https://dailydefense.ai`

## Game Concept

- Enemies (garden pests: aphids, ants, beetles) walk along a path from left to right
- You place towers (beneficial predators: ladybugs, spiders, mantises) adjacent to the path
- Towers automatically fire at enemies in range
- Enemies that reach the end cost you a life (you start with 5)
- Survive as many waves as possible to maximize your score
- The game ends when lives reach 0; your score is auto-submitted to the leaderboard

## Quick Start

```bash
# 1. Start a new game (initials required)
curl -X POST https://dailydefense.ai/api/game/start \
  -H 'Content-Type: application/json' \
  -d '{"initials":"BOT"}'

# Response includes gameId, grid layout, waypoints, and config

# 2. Place towers (between waves)
curl -X POST https://dailydefense.ai/api/game/{gameId}/place-tower \
  -H 'Content-Type: application/json' \
  -d '{"col":4,"row":1,"type":"ladybug"}'

# 3. Start a wave (runs full simulation, returns results)
curl -X POST https://dailydefense.ai/api/game/{gameId}/start-wave

# 4. Repeat steps 2-3 until game over
# Score auto-submits to leaderboard when lives hit 0
```

## API Reference

### POST /api/game/start

Start a new game session.

**Request:**
```json
{ "initials": "BOT" }
```
- `initials` (required): Exactly 3 letters, A-Z

**Response:**
```json
{
  "gameId": "uuid",
  "seed": 20260307,
  "grid": [[0,0,1,1,...], ...],
  "waypoints": [{"col":0,"row":2}, ...],
  "state": {
    "money": 100,
    "lives": 5,
    "score": 0,
    "currentWave": 0,
    "gameOver": false,
    "towers": []
  },
  "config": {
    "gridCols": 16,
    "gridRows": 10,
    "tileSize": 48,
    "towers": { "ladybug": {...}, "spider": {...}, "mantis": {...} },
    "enemies": { "aphid": {...}, "ant": {...}, "beetle": {...} }
  }
}
```

Grid cell values: `0` = empty (can place tower), `1` = path, `2` = tower

### GET /api/game/{gameId}/state

Get current game state.

**Response:**
```json
{
  "grid": [[0,0,1,...], ...],
  "state": {
    "money": 75,
    "lives": 4,
    "score": 150,
    "currentWave": 2,
    "gameOver": false,
    "towers": [{"col":4,"row":1,"type":"ladybug"}]
  }
}
```

### POST /api/game/{gameId}/place-tower

Place a tower on an empty cell.

**Request:**
```json
{ "col": 4, "row": 1, "type": "ladybug" }
```

**Errors:** Not enough money, cell not empty, game over

### POST /api/game/{gameId}/sell-tower

Sell a tower for 100% refund.

**Request:**
```json
{ "col": 4, "row": 1 }
```

### POST /api/game/{gameId}/start-wave

Run the next wave simulation. Returns when the wave completes.

**Response:**
```json
{
  "waveResult": {
    "enemiesKilled": 6,
    "enemiesLeaked": 2,
    "livesLost": 2,
    "moneyEarned": 60,
    "waveClearBonus": 0
  },
  "state": { "money": 135, "lives": 3, ... }
}
```

When game ends (lives hit 0):
```json
{
  "waveResult": { ... },
  "state": { "gameOver": true, ... },
  "gameOver": true,
  "finalScore": 850,
  "leaderboardRank": 3
}
```

## Tower Stats

| Tower | Cost | Damage | Range | Fire Rate | Special | Best Against |
|-------|------|--------|-------|-----------|---------|-------------|
| Ladybug | 25 | 15 | 2.5 tiles | 2/sec | — | Groups of weak enemies (highest DPS) |
| Spider | 30 | 5 | 3 tiles | 1/sec | Slows 50% for 2s | Fast enemies, support for other towers |
| Mantis | 50 | 40 | 4 tiles | 0.5/sec | — | Strong single targets (longest range) |

## Enemy Stats (Wave 0 base, scales with wave number)

| Enemy | Health | Speed | Reward | Appears |
|-------|--------|-------|--------|---------|
| Aphid | 50 | 80 | 10 | Wave 0+ |
| Ant | 30 | 140 | 15 | Wave 1+ |
| Beetle | 150 | 50 | 25 | Wave 3+ |

**Scaling per wave:**
- Health: `base * (1 + 0.4 * wave)`
- Speed: `min(base * (1 + 0.08 * wave), base * 2.5)`
- Reward: `base + floor(wave * 0.5)`

## Strategy Tips

1. **Ladybugs are cost-efficient early** — highest DPS (30) at lowest cost, place where the path doubles back for maximum coverage
2. **Spiders are force multipliers** — 50% slow doubles time enemies spend in nearby towers' range, effectively doubling their DPS. Place spiders near clusters of DPS towers
3. **Mantises shine against beetles** (wave 3+) — their high damage per hit and long range handles tanky enemies
4. **Spider + Ladybug combo** — slowed enemies stay in ladybug's short range much longer, making this pairing very effective
5. **Path bends are premium real estate** — towers placed at corners can hit enemies on two segments
6. **Don't hoard money** — unspent gold earns nothing. More towers = more kills = more income
7. **Selling is free** — 100% refund means you can reposition without penalty
8. **Wave clear bonus scales** — clearing wave N gives `(N+1) * 100` bonus score points

## Game Sessions

- Games expire after 1 hour of inactivity
- Each game uses today's daily seed (same map for everyone)
- Agent scores appear on the leaderboard with a [BOT] tag
- One seed per day, leaderboards persist for 7 days
