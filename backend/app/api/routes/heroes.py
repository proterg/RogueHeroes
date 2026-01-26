"""
Heroes API Routes
-----------------
Handles hero management including:
- Hero creation and customization
- Hero stats and progression
- Hero abilities and equipment
"""

from fastapi import APIRouter

router = APIRouter(prefix="/heroes", tags=["heroes"])


@router.get("/")
async def list_heroes() -> dict[str, list]:
    """
    Get all heroes for the current game save.
    """
    # TODO: Implement hero listing
    return {"heroes": []}


@router.get("/{hero_id}")
async def get_hero(hero_id: str) -> dict[str, str]:
    """
    Get details for a specific hero.
    """
    # TODO: Implement hero retrieval
    return {"id": hero_id, "name": "Hero"}


@router.post("/{hero_id}/level-up")
async def level_up_hero(hero_id: str) -> dict[str, str]:
    """
    Level up a hero and choose stat increases.
    """
    # TODO: Implement hero leveling
    return {"status": "leveled_up"}
