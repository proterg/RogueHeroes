# RogueHeroes - AI Development Guide

## Project Overview

RogueHeroes is a web-based roguelike RPG combining Heroes of Might and Magic 3 (overworld + tactical combat) with Clash Royale (auto-combat with user input). Single-player, browser-based.

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend Framework | React | 18.2.0 |
| Game Engine | Phaser | 3.60.0 |
| Language (FE) | TypeScript | 5.0.4 |
| Backend Framework | FastAPI | 0.100.0 |
| Language (BE) | Python | 3.11 |
| Database | PostgreSQL | 15 |
| ORM | SQLAlchemy | 2.0.x |
| Build Tool | Vite | 4.x |

## Project Structure

```
RogueHeroes/
├── frontend/
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React UI components
│   │   ├── game/
│   │   │   ├── data/      # Game data (UnitStats.ts with SpriteConfig)
│   │   │   ├── scenes/    # Phaser scenes (CombatScene.ts)
│   │   │   ├── systems/   # Modular game systems (AnimationSystem.ts)
│   │   │   └── utils/     # Pure utility functions (GridUtils.ts)
│   │   ├── hooks/         # React hooks
│   │   ├── stores/        # State management
│   │   └── types/         # TypeScript types
│   └── public/
│       └── assets/
│           └── units/     # Unit sprite sheets
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   └── tests/
└── shared/                # Shared constants
```

## Key Conventions

### File Headers
Every file must start with a docstring/comment explaining its purpose and key features.

### SKILL Files
Each module has a `SKILL.md` explaining how to extend it. Always read the relevant SKILL.md before adding new features.

### Backend Patterns
- Use modular routing: each feature has its own route file in `backend/app/api/routes/`
- All routes are aggregated in `backend/app/api/router.py`
- Use Pydantic schemas for request/response validation
- Business logic goes in `services/`, not in route handlers

### Frontend Patterns
- React handles UI, Phaser handles game rendering
- Communication between React and Phaser via event emitters
- API calls go in `src/api/` directory
- Types are centralized in `src/types/`

## Running the Project

### Frontend (Development)
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:3001

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Tests
```bash
# Backend (with TestContainers - requires Docker)
cd backend && pytest

# Frontend
cd frontend && npm run test
```

### Iterative Testing Protocol
When testing changes iteratively during a session:
1. **Always check if the dev server is running first** before making changes
2. If not running, start it on the port used throughout the session:
   - Overworld (with backend): `npm run dev:overworld:full` (ports 5175 + 8000)
   - Overworld (frontend only): `npm run dev:overworld` (port 5175)
   - Combat (with backend): `npm run dev:full` (ports 3002 + 8000)
   - Combat (frontend only): `npm run dev` (port 3002)
   - Editor: `npm run dev:editor` (port 5174)
3. Keep the same server running throughout the session to avoid port conflicts
4. After code changes, the page should hot-reload automatically
5. The `:full` scripts start both frontend and backend together (needed for AI NPCs)

---

## Combat System Architecture

### Overview
The combat system is a turn-based autobattler on a 16x9 grid:
1. Units spawn on opposite sides (player left, enemy right)
2. Units automatically move toward and attack visible enemies
3. Fog of war limits visibility (player sees their half + unit vision radius)
4. Turn order determined by initiative: First Strike > Regular > Last Strike
5. Units with same initiative attack simultaneously

### Key Files
| File | Purpose |
|------|---------|
| `frontend/src/game/scenes/CombatScene.ts` | Main combat logic, state machine, orchestration |
| `frontend/src/game/data/UnitStats.ts` | Unit definitions, damage calculation, sprite configs |
| `frontend/src/game/systems/AnimationSystem.ts` | Sprite loading and animation creation |
| `frontend/src/game/utils/GridUtils.ts` | Collision detection, positioning, distance calculations |

### Unit State Machine
Units have three states:
- **moving**: Walking toward target or forward position
- **setting**: Preparing to attack (counts down `attackDelay` turns)
- **attacking**: Actively attacking each turn

### Unit Interface (Runtime)
```typescript
interface Unit {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  stats: UnitStats;
  currentHp: number;
  gridX: number;
  gridY: number;
  isPlayer: boolean;
  state: UnitState;
  setCounter: number;   // Turns in 'setting' state
  target: Unit | null;  // Locked attack target
  chargeReady: boolean; // Lancer charge attack flag
}
```

---

## Unit Stats System

### Stats Definition (`UnitStats.ts`)
| Stat | Type | Description |
|------|------|-------------|
| hp | number | Health points |
| attack | number | Base damage (±10% variance applied) |
| defense | number | Flat damage reduction |
| moveSpeed | number | Tiles per turn (1 = normal, 2 = fast) |
| attackSpeed | number | Attacks per round |
| initiative | 'first' \| 'regular' \| 'last' | Turn order priority |
| attackRange | number | Range in tiles (1 = melee, 2+ = ranged) |
| critChance | number | Critical hit chance (0-100) |
| critDamage | number | Critical damage multiplier (1.5 = 150%) |
| vision | number | Fog of war reveal radius |
| attackDelay | number | Turns to ready attack after moving |
| size | number | Unit width in tiles (1 = normal, 2 = large/mounted) |
| lifesteal | number | Percentage of damage healed (0.2 = 20%) |

### Unit Roster

#### Human Units (100x100 sprites)
| Unit | HP | ATK | DEF | Range | Initiative | Special |
|------|----|----|-----|-------|------------|---------|
| Soldier | 50 | 10 | 4 | 1 | regular | Balanced fighter |
| Orc | 80 | 18 | 4 | 1 | last | Heavy hitter |
| Knight | 60 | 14 | 5 | 1 | regular | Armored melee |
| Axeman | 70 | 18 | 6 | 1 | last | Heavy armored |
| Archer | 40 | 10 | 2 | 5 | regular | Ranged, arrow projectile |
| Lancer | 65 | 16 | 4 | 2 | first | Size 2, charge attack |

#### Undead Units (32x32 sprites)
| Unit | HP | ATK | DEF | Range | Initiative | Special |
|------|----|----|-----|-------|------------|---------|
| Skeleton Warrior | 45 | 12 | 3 | 1 | first | Fast melee |
| Skeleton Guard | 60 | 8 | 6 | 1 | regular | Tanky |
| Vampire | 35 | 14 | 2 | 1 | first | 20% lifesteal |

---

## Special Mechanics

### Multi-Tile Units (Size > 1)
Units like the Lancer occupy multiple tiles:
- `size: 2` means unit occupies gridX and gridX+1
- Collision detection checks all occupied tiles
- Distance calculations measure from nearest edges
- Sprite centers across all occupied tiles
- Movement restricted to straight lines (no diagonal multi-tile moves)

Helper functions in CombatScene:
```typescript
getOccupiedTiles(unit): { x, y }[]      // All tiles a unit occupies
isTileOccupied(x, y, excludeUnit?)      // Collision check
canUnitFitAt(unit, x, y): boolean       // Can unit move to position
getUnitDistance(unit1, unit2): number   // Distance between nearest edges
```

### Charge Attack (Lancer)
- When lancer moves into attack range, `chargeReady` flag is set
- First attack after moving deals 1.2x base damage
- No attack delay when charging (attacks immediately)
- Critical damage calculated on the boosted damage
- After charge attack, state becomes 'setting' (waits attackDelay for next attack)

### Lifesteal (Vampire)
- Heals percentage of damage dealt
- `lifesteal: 0.2` = heals 20% of damage
- Capped at max HP
- Applied after damage is dealt

### Projectile System (Archer)
- Arrow sprite spawns at bow position
- Travels to target over 300ms
- Spawns at frame 7 of 12-frame animation (750ms into attack)
- Arrow removed on impact

---

## Animation System

### Sprite Organization
Each unit has sprite sheets for:
- `{unit}_idle.png` - Idle animation
- `{unit}_attack.png` - Horizontal attack (faces right)
- `{unit}_attack_up.png` - Attack facing up
- `{unit}_attack_down.png` - Attack facing down
- `{unit}_move.png` - Walking animation
- `{unit}_hurt.png` - Damage taken
- `{unit}_death.png` - Death animation

### Attack Direction Logic
1. **Horizontal attacks**: Use base attack animation + `flipX` for left/right
2. **Vertical attacks**: Use `_attack_up` or `_attack_down` sprite sheets
3. **Diagonal attacks**: Use horizontal animation with slight rotation (max 25°)
4. **Lancer exception**: Never rotates for vertical attacks, max 25° for diagonal

### Health Tinting
Visual feedback based on HP percentage:
- Above 75%: Normal color
- 50-75%: Yellow tint (gradual)
- Below 50%: Red tint (gradual)
- Dead: Gray tint

### Depth Sorting
Y-based depth: lower rows (higher Y) render on top for natural layering when units overlap vertically.

---

## Pathfinding

### Movement Priority
1. Moves that get closer to nearest enemy (preferred)
2. Lateral moves (same distance) when forward blocked
3. Backwards moves only 20% of the time when completely blocked

### Distance Calculation
Uses Chebyshev distance (max of dx, dy) for grid movement.
Multi-tile units measure from nearest occupied tile edge.

---

## Asset Organization

```
frontend/public/assets/
├── units/
│   ├── {unit}_idle.png
│   ├── {unit}_attack.png
│   ├── {unit}_attack_up.png
│   ├── {unit}_attack_down.png
│   ├── {unit}_move.png
│   ├── {unit}_hurt.png
│   ├── {unit}_death.png
│   └── arrow.png           # Archer projectile
├── tiles/                  # Tileset images
├── maps/                   # Map data
└── ui/                     # Interface elements
```

### Sprite Sizes
- **100x100**: Soldier, Orc, Knight, Axeman, Archer, Lancer
- **32x32**: Skeleton Warrior, Skeleton Guard, Vampire

---

## Adding a New Unit

1. **Add sprite sheets** to `frontend/public/assets/units/`
   - Required: idle, attack, move, hurt, death
   - Optional: attack_up, attack_down (for vertical attacks)

2. **Define stats** in `frontend/src/game/data/UnitStats.ts`
   ```typescript
   export const NEW_UNIT: UnitStats = {
     name: 'New Unit',
     type: 'new_unit',
     description: '...',
     hp: 50, attack: 10, defense: 4,
     moveSpeed: 1, attackSpeed: 1, initiative: 'regular',
     attackRange: 1, critChance: 10, critDamage: 1.5,
     vision: 4, attackDelay: 1, size: 1, lifesteal: 0,
     abilities: [],
   };
   ```

3. **Add to getUnitStats()** switch statement

4. **Register in CombatScene**
   - Add to imports
   - Add to preload() for sprite loading
   - Add animation creation in create()

---

## Key API Endpoints (Future)
- `POST /api/combat/start` - Initialize combat
- `POST /api/combat/{id}/action` - Submit player action
- `POST /api/combat/{id}/tick` - Advance simulation
- `GET /api/combat/{id}/state` - Get current state
