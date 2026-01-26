"""
API Routes Package
------------------
Contains modular route files for each feature area.
"""

from app.api.routes import combat, heroes, game

__all__ = ["combat", "heroes", "game"]
