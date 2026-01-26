"""
API Router Aggregator
---------------------
Collects all feature routers and mounts them under /api prefix.
Add new route modules here as they are created.
"""

from fastapi import APIRouter

from app.api.routes import combat, heroes, game

api_router = APIRouter(prefix="/api")

# Include all feature routers
api_router.include_router(combat.router)
api_router.include_router(heroes.router)
api_router.include_router(game.router)
