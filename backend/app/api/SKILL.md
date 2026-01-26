# API Routes Development Guide

## Overview

API routes are organized in modular files under `routes/`. Each feature has its own route file, and all routes are aggregated in `router.py`.

## Adding a New API Route Module

### Step 1: Create the Route File

Create a new file in `routes/` (e.g., `routes/inventory.py`):

```python
"""
Inventory API Routes
--------------------
Handles all inventory-related endpoints including:
- Item management
- Equipment slots
- Crafting
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.inventory import ItemCreate, ItemResponse
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/items", response_model=list[ItemResponse])
async def list_items(db: AsyncSession = Depends(get_db)):
    """Get all items in inventory."""
    service = InventoryService(db)
    return await service.list_items()


@router.post("/items", response_model=ItemResponse, status_code=201)
async def add_item(item: ItemCreate, db: AsyncSession = Depends(get_db)):
    """Add a new item to inventory."""
    service = InventoryService(db)
    return await service.add_item(item)


@router.delete("/items/{item_id}", status_code=204)
async def remove_item(item_id: str, db: AsyncSession = Depends(get_db)):
    """Remove an item from inventory."""
    service = InventoryService(db)
    if not await service.remove_item(item_id):
        raise HTTPException(status_code=404, detail="Item not found")
```

### Step 2: Register in router.py

```python
# In app/api/router.py
from app.api.routes import inventory

api_router.include_router(inventory.router)
```

### Step 3: Create Schemas

```python
# In app/schemas/inventory.py
from pydantic import BaseModel

class ItemCreate(BaseModel):
    name: str
    quantity: int = 1

class ItemResponse(BaseModel):
    id: str
    name: str
    quantity: int

    class Config:
        from_attributes = True
```

## Route Conventions

### Prefixes and Tags

Each router should have:
- A `prefix` matching the feature name (e.g., `/inventory`)
- A `tags` list for OpenAPI grouping

```python
router = APIRouter(prefix="/inventory", tags=["inventory"])
```

### Response Models

Always specify `response_model` for type safety and documentation:

```python
@router.get("/items/{id}", response_model=ItemResponse)
async def get_item(id: str):
    pass
```

### Status Codes

Use appropriate HTTP status codes:
- `200` - OK (default for GET)
- `201` - Created (for POST creating resources)
- `204` - No Content (for DELETE)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `422` - Unprocessable Entity (Pydantic validation)

### Docstrings

Every endpoint should have a docstring for OpenAPI docs:

```python
@router.post("/items")
async def add_item(item: ItemCreate):
    """
    Add a new item to the player's inventory.

    - **name**: Item name (must be unique)
    - **quantity**: Number of items to add (default: 1)
    """
    pass
```

## Testing Routes

Create test file in `tests/api/test_inventory.py`:

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_add_item(client: AsyncClient):
    response = await client.post(
        "/api/inventory/items",
        json={"name": "Health Potion", "quantity": 5}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Health Potion"
    assert data["quantity"] == 5
```
