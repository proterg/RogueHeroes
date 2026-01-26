"""
Combat API Tests
----------------
Tests for combat-related API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    """Test the health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_start_combat(client: AsyncClient) -> None:
    """Test starting a new combat encounter."""
    player_units = [
        {
            "id": "p1",
            "type": "warrior",
            "name": "Test Warrior",
            "hp": 100,
            "max_hp": 100,
            "attack": 15,
            "defense": 10,
            "speed": 1.0,
            "position": {"x": 2, "y": 1},
            "is_player": True,
        }
    ]
    enemy_units = [
        {
            "id": "e1",
            "type": "archer",
            "name": "Enemy Archer",
            "hp": 60,
            "max_hp": 60,
            "attack": 12,
            "defense": 5,
            "speed": 1.2,
            "position": {"x": 2, "y": 8},
            "is_player": False,
        }
    ]

    response = await client.post(
        "/api/combat/start",
        json={"player_units": player_units, "enemy_units": enemy_units},
    )

    assert response.status_code == 200
    data = response.json()

    assert "combat_id" in data
    assert data["status"] == "active"
    assert data["tick"] == 0
    assert len(data["units"]) == 2


@pytest.mark.asyncio
async def test_get_combat_state(client: AsyncClient) -> None:
    """Test retrieving combat state."""
    # First, start a combat
    player_units = [
        {
            "id": "p1",
            "type": "warrior",
            "name": "Warrior",
            "hp": 100,
            "max_hp": 100,
            "attack": 15,
            "defense": 10,
            "speed": 1.0,
            "position": {"x": 2, "y": 1},
            "is_player": True,
        }
    ]
    enemy_units = [
        {
            "id": "e1",
            "type": "warrior",
            "name": "Enemy",
            "hp": 80,
            "max_hp": 80,
            "attack": 12,
            "defense": 8,
            "speed": 1.0,
            "position": {"x": 2, "y": 8},
            "is_player": False,
        }
    ]

    start_response = await client.post(
        "/api/combat/start",
        json={"player_units": player_units, "enemy_units": enemy_units},
    )
    combat_id = start_response.json()["combat_id"]

    # Then get state
    response = await client.get(f"/api/combat/{combat_id}/state")

    assert response.status_code == 200
    data = response.json()
    assert data["combat_id"] == combat_id


@pytest.mark.asyncio
async def test_combat_not_found(client: AsyncClient) -> None:
    """Test accessing non-existent combat."""
    response = await client.get("/api/combat/non-existent-id/state")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_run_combat_tick(client: AsyncClient) -> None:
    """Test advancing combat by one tick."""
    # Start combat with close units so they will fight
    player_units = [
        {
            "id": "p1",
            "type": "warrior",
            "name": "Warrior",
            "hp": 100,
            "max_hp": 100,
            "attack": 15,
            "defense": 10,
            "speed": 1.0,
            "position": {"x": 3, "y": 4},
            "is_player": True,
        }
    ]
    enemy_units = [
        {
            "id": "e1",
            "type": "warrior",
            "name": "Enemy",
            "hp": 80,
            "max_hp": 80,
            "attack": 12,
            "defense": 8,
            "speed": 1.0,
            "position": {"x": 3, "y": 5},
            "is_player": False,
        }
    ]

    start_response = await client.post(
        "/api/combat/start",
        json={"player_units": player_units, "enemy_units": enemy_units},
    )
    combat_id = start_response.json()["combat_id"]

    # Run a tick
    tick_response = await client.post(f"/api/combat/{combat_id}/tick")

    assert tick_response.status_code == 200
    data = tick_response.json()
    assert data["tick"] == 1


@pytest.mark.asyncio
async def test_place_unit_action(client: AsyncClient) -> None:
    """Test placing a unit via action."""
    player_units = [
        {
            "id": "p1",
            "type": "warrior",
            "name": "Warrior",
            "hp": 100,
            "max_hp": 100,
            "attack": 15,
            "defense": 10,
            "speed": 1.0,
            "position": None,  # No initial position
            "is_player": True,
        }
    ]
    enemy_units = [
        {
            "id": "e1",
            "type": "warrior",
            "name": "Enemy",
            "hp": 80,
            "max_hp": 80,
            "attack": 12,
            "defense": 8,
            "speed": 1.0,
            "position": {"x": 3, "y": 8},
            "is_player": False,
        }
    ]

    start_response = await client.post(
        "/api/combat/start",
        json={"player_units": player_units, "enemy_units": enemy_units},
    )
    combat_id = start_response.json()["combat_id"]

    # Place the unit
    action_response = await client.post(
        f"/api/combat/{combat_id}/action",
        json={
            "action_type": "place_unit",
            "unit_id": "p1",
            "target_position": {"x": 2, "y": 2},
        },
    )

    assert action_response.status_code == 200
    data = action_response.json()
    assert data["success"] is True

    # Verify unit was placed
    unit = next(u for u in data["state"]["units"] if u["id"] == "p1")
    assert unit["position"]["x"] == 2
    assert unit["position"]["y"] == 2


@pytest.mark.asyncio
async def test_combat_resolution(client: AsyncClient) -> None:
    """Test that combat ends when one side is defeated."""
    # Create a very uneven fight
    player_units = [
        {
            "id": "p1",
            "type": "warrior",
            "name": "Strong Warrior",
            "hp": 200,
            "max_hp": 200,
            "attack": 50,
            "defense": 20,
            "speed": 2.0,
            "position": {"x": 3, "y": 4},
            "is_player": True,
        }
    ]
    enemy_units = [
        {
            "id": "e1",
            "type": "warrior",
            "name": "Weak Enemy",
            "hp": 10,
            "max_hp": 10,
            "attack": 5,
            "defense": 0,
            "speed": 0.5,
            "position": {"x": 3, "y": 5},
            "is_player": False,
        }
    ]

    start_response = await client.post(
        "/api/combat/start",
        json={"player_units": player_units, "enemy_units": enemy_units},
    )
    combat_id = start_response.json()["combat_id"]

    # Run several ticks until combat ends
    for _ in range(10):
        response = await client.post(f"/api/combat/{combat_id}/tick")
        data = response.json()
        if data["status"] != "active":
            break

    assert data["status"] == "player_won"


@pytest.mark.asyncio
async def test_end_combat(client: AsyncClient) -> None:
    """Test ending/deleting a combat instance."""
    player_units = [
        {
            "id": "p1",
            "type": "warrior",
            "name": "Warrior",
            "hp": 100,
            "max_hp": 100,
            "attack": 15,
            "defense": 10,
            "speed": 1.0,
            "position": {"x": 2, "y": 1},
            "is_player": True,
        }
    ]
    enemy_units = [
        {
            "id": "e1",
            "type": "warrior",
            "name": "Enemy",
            "hp": 80,
            "max_hp": 80,
            "attack": 12,
            "defense": 8,
            "speed": 1.0,
            "position": {"x": 2, "y": 8},
            "is_player": False,
        }
    ]

    start_response = await client.post(
        "/api/combat/start",
        json={"player_units": player_units, "enemy_units": enemy_units},
    )
    combat_id = start_response.json()["combat_id"]

    # Delete the combat
    delete_response = await client.delete(f"/api/combat/{combat_id}")
    assert delete_response.status_code == 200

    # Verify it's gone
    get_response = await client.get(f"/api/combat/{combat_id}/state")
    assert get_response.status_code == 404
