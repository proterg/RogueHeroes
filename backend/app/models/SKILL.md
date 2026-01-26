# Database Models Development Guide

## Overview

SQLAlchemy 2.0 models define the database schema. Each model corresponds to a database table.

## Creating a New Model

### Step 1: Create the Model File

```python
# app/models/inventory.py
"""
Inventory Database Models
-------------------------
SQLAlchemy models for inventory management:
- Item: Individual item instances
- ItemTemplate: Item definitions/templates
"""

import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Item(Base):
    """An item instance in a player's inventory."""

    __tablename__ = "items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("item_templates.id"))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("game_saves.id"))
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    template = relationship("ItemTemplate", back_populates="instances")
```

### Step 2: Register in __init__.py

```python
# app/models/__init__.py
from app.models.combat import CombatInstance
from app.models.inventory import Item, ItemTemplate

__all__ = ["CombatInstance", "Item", "ItemTemplate"]
```

### Step 3: Create Migration (if using Alembic)

```bash
alembic revision --autogenerate -m "Add inventory tables"
alembic upgrade head
```

## Model Conventions

### Primary Keys

Use UUIDs for primary keys:

```python
from sqlalchemy.dialects.postgresql import UUID
import uuid

id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

### Timestamps

Include created_at and updated_at for auditing:

```python
from sqlalchemy.sql import func

created_at = Column(DateTime(timezone=True), server_default=func.now())
updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### Relationships

Define both sides of relationships:

```python
# In Parent model
children = relationship("Child", back_populates="parent")

# In Child model
parent_id = Column(UUID(as_uuid=True), ForeignKey("parents.id"))
parent = relationship("Parent", back_populates="children")
```

### JSONB for Flexible Data

Use JSONB for game state that changes frequently:

```python
from sqlalchemy.dialects.postgresql import JSONB

game_state = Column(JSONB, default=dict)
```

## Async Queries

Use async session for all queries:

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_item(db: AsyncSession, item_id: uuid.UUID) -> Item | None:
    result = await db.execute(
        select(Item).where(Item.id == item_id)
    )
    return result.scalar_one_or_none()

async def list_items(db: AsyncSession, owner_id: uuid.UUID) -> list[Item]:
    result = await db.execute(
        select(Item).where(Item.owner_id == owner_id)
    )
    return result.scalars().all()
```
