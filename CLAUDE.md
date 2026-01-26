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
├── frontend/          # React + Phaser frontend
│   ├── src/
│   │   ├── api/       # API client functions
│   │   ├── components/ # React UI components
│   │   ├── game/      # Phaser game code
│   │   ├── hooks/     # React hooks
│   │   ├── stores/    # State management
│   │   └── types/     # TypeScript types
│   └── tests/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   └── tests/
└── shared/            # Shared constants
```

## Key Conventions

### File Headers
Every file must start with a docstring/comment explaining its purpose.

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

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Tests
```bash
# Backend (with TestContainers - requires Docker)
cd backend
pytest

# Frontend
cd frontend
npm run test
```

## Combat System Overview

The combat system is turn-based with auto-battler mechanics:
1. Units spawn on opposite sides of a 16x9 grid
2. Units automatically move toward and attack visible enemies
3. Fog of war limits visibility (player sees their half + unit vision radius)
4. Turn order determined by initiative: First Strike > Regular > Last Strike

### Unit Stats
| Stat | Description |
|------|-------------|
| hp | Health points |
| attack | Base damage (±10% variance) |
| defense | Flat damage reduction |
| initiative | Turn order: 'first', 'regular', 'last' |
| attackRange | Range in tiles (1 = melee) |
| critChance | Crit chance 0-100% |
| critDamage | Crit multiplier |
| vision | Fog of war reveal radius |
| attackDelay | Turns to ready attack after moving |

### Unit Types
- **Skeleton Warrior** - Balanced melee, first strike
- **Skeleton Guard** - Tanky melee, regular initiative
- **Soldier** - Balanced human fighter, good vision
- **Orc** - Heavy hitter, slow but devastating

### Key API Endpoints (Future)
- `POST /api/combat/start` - Initialize combat
- `POST /api/combat/{id}/action` - Submit player action
- `POST /api/combat/{id}/tick` - Advance simulation
- `GET /api/combat/{id}/state` - Get current state

## Asset Organization

```
ExampleArt/organized/
├── units/              # Character sprite sheets
│   ├── skeleton1/      # 32x32 frames
│   ├── skeleton2/      # 32x32 frames
│   ├── orc/            # 100x100 frames
│   ├── soldier/        # 100x100 frames
│   └── vampire/        # 32x32 frames (not yet implemented)
├── tiles/              # Tileset images
├── items/              # Items (flasks, keys, chests, torches)
├── ui/                 # Interface elements
├── projectiles/        # Arrows, etc
└── raw/aseprite/       # Source .aseprite files
```

Each unit has sprite sheets for: idle, attack, death, move, hurt
