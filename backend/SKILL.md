# Backend Development Guide

## Overview

The backend is built with FastAPI and follows a modular architecture with clear separation of concerns.

## Directory Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── config.py        # Settings and environment variables
│   ├── database.py      # Database connection setup
│   ├── api/
│   │   ├── router.py    # Main router aggregating all routes
│   │   └── routes/      # Feature-specific route modules
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic request/response schemas
│   └── services/        # Business logic layer
└── tests/
    └── conftest.py      # TestContainers setup
```

## Adding a New Feature

### 1. Create the Schema (schemas/)

Define Pydantic models for request/response validation:

```python
# app/schemas/inventory.py
from pydantic import BaseModel

class ItemCreate(BaseModel):
    name: str
    quantity: int

class ItemResponse(BaseModel):
    id: str
    name: str
    quantity: int
```

### 2. Create the Database Model (models/)

If the feature needs persistence:

```python
# app/models/inventory.py
from sqlalchemy import Column, String, Integer
from app.database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    quantity = Column(Integer, default=0)
```

### 3. Create the Service (services/)

Business logic goes here, not in route handlers:

```python
# app/services/inventory_service.py
class InventoryService:
    async def add_item(self, item_data: ItemCreate) -> Item:
        # Business logic here
        pass
```

### 4. Create the Routes (api/routes/)

See `app/api/SKILL.md` for detailed routing guide.

### 5. Register the Router

Add your router to `app/api/router.py`.

### 6. Write Tests

Create test file in `tests/api/test_inventory.py`.

## Key Patterns

### Dependency Injection

Use FastAPI's `Depends` for database sessions and services:

```python
@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    pass
```

### Async/Await

All database operations should be async:

```python
async def get_item(db: AsyncSession, item_id: str):
    result = await db.execute(select(Item).where(Item.id == item_id))
    return result.scalar_one_or_none()
```

### Error Handling

Use HTTPException for API errors:

```python
from fastapi import HTTPException

if not item:
    raise HTTPException(status_code=404, detail="Item not found")
```

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/api/test_combat.py
```

Tests use TestContainers to spin up a real PostgreSQL instance - Docker must be running.
