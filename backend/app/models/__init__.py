"""
SQLAlchemy Models Package
-------------------------
Contains all database model definitions.
Import models here to register them with SQLAlchemy.
"""

from app.models.combat import GameSave, CombatInstance

__all__ = ["GameSave", "CombatInstance"]
