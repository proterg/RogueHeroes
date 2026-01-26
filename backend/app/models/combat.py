"""
Combat Database Models
----------------------
SQLAlchemy models for combat-related persistence:
- GameSave: Persistent game state
- CombatInstance: Combat session for replay/persistence
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid() -> str:
    """Generate a UUID string for use as primary key."""
    return str(uuid.uuid4())


class GameSave(Base):
    """Represents a saved game state."""

    __tablename__ = "game_saves"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    game_state = Column(JSON, default=dict)

    # Relationships
    combat_instances = relationship("CombatInstance", back_populates="game_save")


class CombatInstance(Base):
    """Represents a combat encounter for persistence and replay."""

    __tablename__ = "combat_instances"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    game_save_id = Column(String(36), ForeignKey("game_saves.id"), nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
    initial_state = Column(JSON, default=dict)
    final_state = Column(JSON, nullable=True)
    action_log = Column(JSON, default=list)  # Store as JSON array

    # Relationships
    game_save = relationship("GameSave", back_populates="combat_instances")
