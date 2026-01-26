# Frontend Development Guide

## Overview

The frontend combines React for UI and Phaser for game rendering. React handles menus, HUD, and dialogs while Phaser handles the game world and combat visualization.

## Directory Structure

```
frontend/
├── src/
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Root component
│   ├── api/             # API client functions
│   ├── components/      # React UI components
│   │   └── ui/          # Reusable UI primitives
│   ├── game/            # Phaser game code
│   │   ├── Game.ts      # Phaser config
│   │   ├── scenes/      # Phaser scenes
│   │   └── entities/    # Game entities
│   ├── hooks/           # React hooks
│   ├── stores/          # State management
│   └── types/           # TypeScript types
└── tests/
```

## Adding a New Feature

### 1. Define Types (types/)

```typescript
// types/inventory.ts
export interface Item {
  id: string;
  name: string;
  quantity: number;
}
```

### 2. Create API Client (api/)

See `src/api/SKILL.md` for details.

### 3. Create Components (components/)

See `src/components/SKILL.md` for component patterns.

### 4. Create Game Features (game/)

See `src/game/SKILL.md` for Phaser patterns.

## React + Phaser Integration

### Communication Pattern

React and Phaser communicate via an event emitter:

```typescript
// In Phaser scene
this.events.emit('unit-selected', unitData);

// In React component
useEffect(() => {
  const scene = gameRef.current?.scene.getScene('CombatScene');
  scene?.events.on('unit-selected', handleUnitSelected);
  return () => scene?.events.off('unit-selected', handleUnitSelected);
}, []);
```

### Mounting Phaser in React

```typescript
const GameContainer: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    gameRef.current = new Phaser.Game(gameConfig);
    return () => gameRef.current?.destroy(true);
  }, []);

  return <div id="game-container" />;
};
```

## Key Patterns

### API Calls

Always use the api/ functions, never call fetch directly in components:

```typescript
// Good
import { startCombat } from '../api/combat';
const state = await startCombat(army);

// Bad
const response = await fetch('/api/combat/start', ...);
```

### State Management

Use React hooks for local state, stores for shared state:

```typescript
// Local state
const [isOpen, setIsOpen] = useState(false);

// Shared state (in stores/)
const { combatState, setCombatState } = useCombatStore();
```

### Error Handling

Wrap API calls in try/catch and show user-friendly errors:

```typescript
try {
  await submitAction(action);
} catch (error) {
  showErrorToast('Failed to submit action');
}
```

## Running the Dev Server

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run test     # Run tests
npm run lint     # Check linting
```
