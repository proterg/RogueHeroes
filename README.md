# RogueHeroes

**Version: Alpha 1.0**

A web-based roguelike RPG combining Heroes of Might and Magic 3 style overworld and tactical combat with Clash Royale style auto-combat mechanics.

> See [CHANGELOG.md](CHANGELOG.md) for version history and recent updates.

## Features

- **Overworld Exploration**: Navigate a procedurally generated map, discover resources, and encounter enemies
- **Tactical Combat**: Place units on a battlefield and watch them fight with Clash Royale-style auto-combat
- **Hero Progression**: Level up heroes, learn new abilities, and collect powerful artifacts
- **Army Building**: Recruit and upgrade units from various factions

## Tech Stack

- **Frontend**: React 18 + Phaser 3 + TypeScript + Vite
- **Backend**: FastAPI + Python 3.11 + SQLAlchemy 2.0
- **Database**: PostgreSQL 15

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ (or Docker for TestContainers)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env  # Edit with your database credentials

# Run the server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests (requires Docker for TestContainers)
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

## Project Structure

See `CLAUDE.md` for detailed project structure and development conventions.

## License

MIT
