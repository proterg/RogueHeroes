"""
Services Package
----------------
Contains business logic separated from API routes.
Services handle the core game mechanics and rules.
"""

from app.services.combat_engine import CombatEngine

__all__ = ["CombatEngine"]
