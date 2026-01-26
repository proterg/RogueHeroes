"""
Combat API Routes
-----------------
Handles all combat-related endpoints including:
- Starting combat encounters
- Processing player actions (unit placement, spell casting)
- Running combat simulation ticks
- Retrieving combat results
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.combat import (
    CombatStartRequest,
    CombatState,
    CombatAction,
    CombatActionResponse,
)
from app.services.combat_engine import CombatEngine

router = APIRouter(prefix="/combat", tags=["combat"])

# In-memory storage for combat instances (will be replaced with DB)
_combat_instances: dict[str, CombatEngine] = {}


@router.post("/start", response_model=CombatState)
async def start_combat(
    request: CombatStartRequest,
    db: AsyncSession = Depends(get_db),
) -> CombatState:
    """
    Initialize a new combat encounter.

    Creates a combat instance with the player's army and enemy forces.
    Returns the initial combat state for rendering.
    """
    combat_id = str(uuid.uuid4())
    engine = CombatEngine(combat_id, request.player_units, request.enemy_units)
    _combat_instances[combat_id] = engine

    return engine.get_state()


@router.get("/{combat_id}/state", response_model=CombatState)
async def get_combat_state(combat_id: str) -> CombatState:
    """
    Get the current state of a combat encounter.

    Returns unit positions, HP, and other state needed for rendering.
    """
    engine = _combat_instances.get(combat_id)
    if not engine:
        raise HTTPException(status_code=404, detail="Combat not found")

    return engine.get_state()


@router.post("/{combat_id}/action", response_model=CombatActionResponse)
async def submit_action(combat_id: str, action: CombatAction) -> CombatActionResponse:
    """
    Submit a player action during combat.

    Actions include:
    - place_unit: Deploy a unit from reserves to the battlefield
    - cast_spell: Use a spell ability
    - use_ability: Activate a unit's special ability
    """
    engine = _combat_instances.get(combat_id)
    if not engine:
        raise HTTPException(status_code=404, detail="Combat not found")

    try:
        result = engine.process_action(action)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{combat_id}/tick", response_model=CombatState)
async def run_tick(combat_id: str) -> CombatState:
    """
    Advance the combat simulation by one tick.

    Units will move, attack, and use abilities based on AI.
    Returns the new combat state after the tick.
    """
    engine = _combat_instances.get(combat_id)
    if not engine:
        raise HTTPException(status_code=404, detail="Combat not found")

    engine.tick()
    return engine.get_state()


@router.delete("/{combat_id}")
async def end_combat(combat_id: str) -> dict[str, str]:
    """
    End a combat encounter and clean up resources.
    """
    if combat_id in _combat_instances:
        del _combat_instances[combat_id]
        return {"status": "deleted"}

    raise HTTPException(status_code=404, detail="Combat not found")
