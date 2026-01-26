# API Client Development Guide

## Overview

All API calls are centralized in this directory. Components never call `fetch` directly - they use these typed functions.

## Creating a New API Module

### Step 1: Create the API File

```typescript
// src/api/inventory.ts
/**
 * Inventory API Client
 * --------------------
 * Functions for interacting with inventory endpoints.
 */

import { Item, ItemCreate } from '../types/inventory';

const API_BASE = '/api';

/**
 * Get all items in the player's inventory.
 */
export async function getItems(): Promise<Item[]> {
  const response = await fetch(`${API_BASE}/inventory/items`);
  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }
  return response.json();
}

/**
 * Add an item to the inventory.
 */
export async function addItem(item: ItemCreate): Promise<Item> {
  const response = await fetch(`${API_BASE}/inventory/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    throw new Error('Failed to add item');
  }
  return response.json();
}

/**
 * Remove an item from the inventory.
 */
export async function removeItem(itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/inventory/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to remove item');
  }
}
```

### Step 2: Export from Index

```typescript
// src/api/index.ts
export * from './combat';
export * from './inventory';
```

## API Conventions

### Type Safety

Always use TypeScript types for requests and responses:

```typescript
import { CombatState, CombatStartRequest } from '../types/combat';

export async function startCombat(request: CombatStartRequest): Promise<CombatState> {
  // ...
}
```

### Error Handling

Throw descriptive errors that components can catch:

```typescript
export async function getItem(id: string): Promise<Item> {
  const response = await fetch(`${API_BASE}/inventory/items/${id}`);

  if (response.status === 404) {
    throw new Error(`Item ${id} not found`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch item: ${response.statusText}`);
  }

  return response.json();
}
```

### Request Options

For complex requests, use an options object:

```typescript
interface ListItemsOptions {
  category?: string;
  limit?: number;
  offset?: number;
}

export async function listItems(options: ListItemsOptions = {}): Promise<Item[]> {
  const params = new URLSearchParams();
  if (options.category) params.set('category', options.category);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));

  const url = `${API_BASE}/inventory/items?${params}`;
  // ...
}
```

### Caching and State

API functions are stateless - caching is handled by React Query or stores:

```typescript
// In a component or hook
import { useQuery } from '@tanstack/react-query';
import { getItems } from '../api/inventory';

function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  });
}
```

## Testing API Functions

```typescript
// tests/api/inventory.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getItems } from '../../src/api/inventory';

describe('inventory api', () => {
  it('fetches items successfully', async () => {
    const mockItems = [{ id: '1', name: 'Sword', quantity: 1 }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockItems),
    });

    const items = await getItems();
    expect(items).toEqual(mockItems);
  });
});
```
