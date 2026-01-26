"""
Combat Pydantic Schemas
-----------------------
Request and response schemas for combat API endpoints.
Handles validation and serialization of combat data.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class UnitType(str, Enum):
    """Types of combat units."""
    WARRIOR = "warrior"
    ARCHER = "archer"
    MAGE = "mage"
    KNIGHT = "knight"
    HEALER = "healer"


class ActionType(str, Enum):
    """Types of player actions during combat."""
    PLACE_UNIT = "place_unit"
    CAST_SPELL = "cast_spell"
    USE_ABILITY = "use_ability"


class CombatStatus(str, Enum):
    """Combat encounter status."""
    ACTIVE = "active"
    PLAYER_WON = "player_won"
    ENEMY_WON = "enemy_won"


class Position(BaseModel):
    """Grid position on the battlefield."""
    x: int = Field(ge=0, description="X coordinate on the grid")
    y: int = Field(ge=0, description="Y coordinate on the grid")


class UnitData(BaseModel):
    """
    Data for a combat unit.

    Represents both player and enemy units with stats
    and position information.
    """
    id: str = Field(description="Unique identifier for the unit")
    type: UnitType = Field(description="Unit type (warrior, archer, etc.)")
    name: str = Field(description="Display name")
    hp: int = Field(ge=0, description="Current hit points")
    max_hp: int = Field(gt=0, description="Maximum hit points")
    attack: int = Field(ge=0, description="Attack power")
    defense: int = Field(ge=0, description="Defense value")
    speed: float = Field(ge=0, description="Movement/attack speed")
    position: Optional[Position] = Field(None, description="Current grid position")
    is_player: bool = Field(description="True if owned by player")

    class Config:
        from_attributes = True


class CombatStartRequest(BaseModel):
    """Request to start a new combat encounter."""
    player_units: list[UnitData] = Field(description="Player's army composition")
    enemy_units: list[UnitData] = Field(description="Enemy forces")


class CombatState(BaseModel):
    """
    Current state of a combat encounter.

    Contains all information needed to render the battlefield.
    """
    combat_id: str = Field(description="Unique combat identifier")
    status: CombatStatus = Field(description="Current combat status")
    tick: int = Field(ge=0, description="Current simulation tick")
    units: list[UnitData] = Field(description="All units on the battlefield")
    pending_actions: list[str] = Field(default_factory=list, description="Actions queued for next tick")

    class Config:
        from_attributes = True


class CombatAction(BaseModel):
    """Player action during combat."""
    action_type: ActionType = Field(description="Type of action")
    unit_id: Optional[str] = Field(None, description="Unit performing/receiving action")
    target_position: Optional[Position] = Field(None, description="Target position for placement/spell")
    spell_id: Optional[str] = Field(None, description="Spell to cast (if cast_spell)")
    ability_id: Optional[str] = Field(None, description="Ability to use (if use_ability)")


class CombatActionResponse(BaseModel):
    """Response after processing a player action."""
    success: bool = Field(description="Whether action was accepted")
    message: str = Field(description="Result message")
    state: CombatState = Field(description="Updated combat state")
