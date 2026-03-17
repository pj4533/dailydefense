# DailyDefense: Wave Variety System

## Overview

Replace the current fixed-ratio wave composition with a seeded wave profile system. Each daily board generates both a unique path AND a unique wave schedule, creating a two-dimensional optimization puzzle.

---

## 1. Wave Profiles

Each wave has a **profile** that determines enemy composition. Profiles have a name and symbol for UI display.

| Profile | Symbol | Description | Composition Bias |
|---------|--------|-------------|-----------------|
| **Swarm** | 🐜 | Fast, numerous, fragile | Heavy ants, few beetles |
| **Siege** | 🪲 | Slow, tanky, punishing | Heavy beetles, few ants |
| **Balanced** | ⚔️ | Standard mixed assault | Even distribution |
| **Rush** | 💨 | Short burst of very fast enemies | All ants, high speed bonus |
| **Boss** | 💀 | Single (or few) high-HP enemy | 1-3 enemies with massive HP |
| **Horde** | 🌊 | Overwhelming numbers, weak individually | 2-3x normal count, reduced HP |

### Profile Parameters

Each profile defines multipliers applied to the base wave formula:

```
profile:
  ant_ratio:     0.0 - 2.0  (multiplier on ant count)
  beetle_ratio:  0.0 - 2.0  (multiplier on beetle count)
  aphid_ratio:   0.0 - 2.0  (multiplier on aphid count)
  count_mult:    0.5 - 3.0  (multiplier on total enemy count)
  hp_mult:       0.5 - 5.0  (multiplier on enemy HP)
  speed_mult:    0.5 - 2.0  (multiplier on enemy speed)
```

**Example — Swarm wave at wave 8:**
```
base_total = 8 + int(8 * 3.5) = 36
ant_ratio=1.8, beetle_ratio=0.2, aphid_ratio=1.0, count_mult=1.2

aphids: 36 * 1.0 * 1.2 = 43
ants:   36 * 0.8 * 1.8 * 1.2 = 62
beetles: 36 * 0.5 * 0.2 * 1.2 = 4
```

**Example — Boss wave at wave 10:**
```
base_total = 8 + int(10 * 3.5) = 43
count_mult=0.1, hp_mult=5.0, speed_mult=0.6

total enemies: ~3-4 with 5x HP each
```

---

## 2. Difficulty Scaling

Wave profiles are gated by wave number to prevent early difficulty spikes.

### Unlock Schedule

| Wave Range | Available Profiles |
|------------|-------------------|
| 0-2 | Balanced, Swarm |
| 3-5 | + Siege, Rush |
| 6-9 | + Horde |
| 10+ | + Boss |

### Scaling Rules

- Base enemy count still grows linearly (`8 + wave * 3.5`)
- HP scaling still applies (`1 + 0.4 * wave`)
- Speed scaling still applies (`1 + 0.08 * wave`, capped at 2.5x)
- Profile multipliers stack ON TOP of wave scaling
- Late-game profiles can have tighter spawn intervals (faster enemy spacing)

### Constraints on Seed Generation

The daily seed generates a wave schedule subject to these rules:
- No Boss waves before wave 10
- No two identical profiles in a row
- At least one Balanced wave in every 4-wave span (prevents degenerate sequences)
- First wave is always Balanced (gentle start)
- Boss waves appear at most once every 5 waves

---

## 3. Visibility System

### UI (Human Players)

Display a **wave preview bar** showing the current wave and next 2 upcoming waves:

```
┌─────────────────────────────────────────┐
│  Wave 5 ⚔️    Next: 🐜  Then: 🪲       │
└─────────────────────────────────────────┘
```

- Current wave: profile symbol + name + enemy count
- Next wave: profile symbol only (know the type, not exact numbers)
- Wave after next: profile symbol only
- Past waves: optionally shown as a timeline/history strip

### API (Agent Players)

Provide wave preview data in the game state response:

```json
{
  "current_wave": {
    "number": 5,
    "profile": "balanced",
    "symbol": "⚔️",
    "enemies": [
      {"type": "aphid", "count": 26, "hp": 150, "speed": 112},
      {"type": "ant", "count": 20, "hp": 90, "speed": 196},
      {"type": "beetle", "count": 13, "hp": 450, "speed": 70}
    ]
  },
  "preview": [
    {"wave": 6, "profile": "swarm", "symbol": "🐜"},
    {"wave": 7, "profile": "siege", "symbol": "🪲"}
  ]
}
```

**Key design choice:** Preview shows profile type but NOT exact enemy counts or stats. Agents and humans get the same information — you know *what kind* of wave is coming, but planning exact tower placement still requires understanding how profiles interact with wave scaling.

### Post-Game Summary (API + UI)

After a run completes, expose the full wave schedule:

```json
{
  "wave_schedule": [
    {"wave": 0, "profile": "balanced"},
    {"wave": 1, "profile": "balanced"},
    {"wave": 2, "profile": "swarm"},
    {"wave": 3, "profile": "siege"},
    ...
  ]
}
```

This enables:
- Agents to replay with full knowledge on subsequent attempts
- Humans to study the schedule and plan before retrying
- The natural replayability loop: blind run → learn schedule → optimize
