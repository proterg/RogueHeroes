# React Components Development Guide

## Overview

React components handle UI rendering and user interaction. Keep components focused - game rendering is handled by Phaser scenes.

## Creating a New Component

### Step 1: Create the Component File

```typescript
// src/components/Inventory/InventoryPanel.tsx
/**
 * InventoryPanel Component
 * ------------------------
 * Displays the player's inventory in a grid layout.
 * Handles item selection and drag-drop.
 */

import React, { useState } from 'react';
import { Item } from '../../types/inventory';
import { ItemSlot } from './ItemSlot';
import styles from './InventoryPanel.module.css';

interface InventoryPanelProps {
  items: Item[];
  onItemSelect: (item: Item) => void;
  onItemUse: (item: Item) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  items,
  onItemSelect,
  onItemUse,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (item: Item) => {
    setSelectedId(item.id);
    onItemSelect(item);
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Inventory</h2>
      <div className={styles.grid}>
        {items.map((item) => (
          <ItemSlot
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onClick={() => handleSelect(item)}
            onDoubleClick={() => onItemUse(item)}
          />
        ))}
      </div>
    </div>
  );
};
```

### Step 2: Create Styles (CSS Modules)

```css
/* src/components/Inventory/InventoryPanel.module.css */
.panel {
  background: var(--panel-bg);
  border-radius: 8px;
  padding: 16px;
}

.title {
  margin: 0 0 12px;
  font-size: 18px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
```

### Step 3: Export from Index

```typescript
// src/components/Inventory/index.ts
export { InventoryPanel } from './InventoryPanel';
export { ItemSlot } from './ItemSlot';
```

## Component Patterns

### Props Interface

Always define a props interface:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}
```

### Event Handlers

Name handlers with `on` prefix in props, `handle` prefix internally:

```typescript
interface Props {
  onSelect: (id: string) => void;  // Prop
}

const Component: React.FC<Props> = ({ onSelect }) => {
  const handleClick = (id: string) => {  // Internal handler
    // Local logic
    onSelect(id);  // Call prop
  };
};
```

### Conditional Rendering

Use early returns for conditional rendering:

```typescript
export const ItemTooltip: React.FC<{ item: Item | null }> = ({ item }) => {
  if (!item) return null;

  return (
    <div className={styles.tooltip}>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
    </div>
  );
};
```

### Loading and Error States

Handle all states explicitly:

```typescript
export const ItemList: React.FC = () => {
  const { data: items, isLoading, error } = useItems();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!items?.length) return <EmptyState message="No items found" />;

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};
```

## Phaser Integration

### Communicating with Phaser

Use refs and events:

```typescript
export const GameUI: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('CombatScene') as CombatScene;
    if (!scene) return;

    const handleUnitSelect = (unit: Unit) => setSelectedUnit(unit);
    scene.events.on('unit-selected', handleUnitSelect);

    return () => {
      scene.events.off('unit-selected', handleUnitSelect);
    };
  }, []);

  const handleCastSpell = (spell: Spell) => {
    const scene = gameRef.current?.scene.getScene('CombatScene') as CombatScene;
    scene?.castSpell(spell);
  };

  return (
    <>
      <GameContainer gameRef={gameRef} />
      <SpellBar onCast={handleCastSpell} />
      {selectedUnit && <UnitInfo unit={selectedUnit} />}
    </>
  );
};
```

## Testing Components

```typescript
// tests/components/InventoryPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryPanel } from '../../src/components/Inventory';

describe('InventoryPanel', () => {
  const mockItems = [
    { id: '1', name: 'Sword', quantity: 1 },
    { id: '2', name: 'Shield', quantity: 1 },
  ];

  it('renders all items', () => {
    render(
      <InventoryPanel
        items={mockItems}
        onItemSelect={() => {}}
        onItemUse={() => {}}
      />
    );

    expect(screen.getByText('Sword')).toBeInTheDocument();
    expect(screen.getByText('Shield')).toBeInTheDocument();
  });

  it('calls onItemSelect when item clicked', () => {
    const onSelect = vi.fn();
    render(
      <InventoryPanel
        items={mockItems}
        onItemSelect={onSelect}
        onItemUse={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Sword'));
    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });
});
```
