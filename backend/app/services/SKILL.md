# Services Development Guide

## Overview

Services contain business logic. They sit between API routes (which handle HTTP) and models (which handle data). Routes should be thin - just validation and delegation to services.

## Creating a New Service

### Step 1: Create the Service File

```python
# app/services/inventory_service.py
"""
Inventory Service
-----------------
Business logic for inventory management:
- Item validation
- Stack management
- Weight/capacity calculations
"""

import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import Item
from app.schemas.inventory import ItemCreate


class InventoryService:
    """Handles inventory business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_item(self, data: ItemCreate) -> Item:
        """
        Add an item to inventory.

        Handles stacking for stackable items.
        """
        # Check if item already exists and can stack
        existing = await self._find_stackable(data.name)
        if existing:
            existing.quantity += data.quantity
            await self.db.commit()
            return existing

        # Create new item
        item = Item(
            id=uuid.uuid4(),
            name=data.name,
            quantity=data.quantity
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def remove_item(self, item_id: uuid.UUID) -> bool:
        """Remove an item from inventory."""
        result = await self.db.execute(
            select(Item).where(Item.id == item_id)
        )
        item = result.scalar_one_or_none()
        if not item:
            return False

        await self.db.delete(item)
        await self.db.commit()
        return True

    async def _find_stackable(self, name: str) -> Item | None:
        """Find an existing stackable item by name."""
        result = await self.db.execute(
            select(Item).where(Item.name == name)
        )
        return result.scalar_one_or_none()
```

### Step 2: Use in Routes

```python
# In routes/inventory.py
from app.services.inventory_service import InventoryService

@router.post("/items")
async def add_item(item: ItemCreate, db: AsyncSession = Depends(get_db)):
    service = InventoryService(db)
    return await service.add_item(item)
```

## Service Patterns

### Dependency Injection

Services receive their dependencies (database, other services) through the constructor:

```python
class CombatService:
    def __init__(self, db: AsyncSession, unit_service: UnitService):
        self.db = db
        self.unit_service = unit_service
```

### Error Handling

Raise domain-specific exceptions, let routes convert to HTTP errors:

```python
# In services/exceptions.py
class ItemNotFoundError(Exception):
    pass

class InventoryFullError(Exception):
    pass

# In service
if not item:
    raise ItemNotFoundError(f"Item {item_id} not found")

# In route
try:
    return await service.add_item(data)
except InventoryFullError:
    raise HTTPException(status_code=400, detail="Inventory is full")
```

### Pure Functions for Logic

Complex calculations should be pure functions for easy testing:

```python
def calculate_damage(attacker: Unit, defender: Unit) -> int:
    """Calculate damage dealt. Pure function - no side effects."""
    base_damage = attacker.attack - defender.defense
    return max(1, base_damage)  # Minimum 1 damage

class CombatService:
    def resolve_attack(self, attacker: Unit, defender: Unit):
        damage = calculate_damage(attacker, defender)
        defender.hp -= damage
        # ... persistence logic
```

### Testing Services

```python
# tests/services/test_inventory_service.py
import pytest
from app.services.inventory_service import InventoryService

@pytest.mark.asyncio
async def test_add_item_creates_new(db_session):
    service = InventoryService(db_session)
    item = await service.add_item(ItemCreate(name="Sword", quantity=1))

    assert item.name == "Sword"
    assert item.quantity == 1

@pytest.mark.asyncio
async def test_add_item_stacks_existing(db_session):
    service = InventoryService(db_session)
    await service.add_item(ItemCreate(name="Potion", quantity=2))
    item = await service.add_item(ItemCreate(name="Potion", quantity=3))

    assert item.quantity == 5  # Stacked
```
