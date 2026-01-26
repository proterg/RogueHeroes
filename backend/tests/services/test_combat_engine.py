"""
Combat Engine Tests
-------------------
Unit tests for the combat engine service.
"""

import pytest

from app.schemas.combat import UnitData, CombatAction, ActionType, Position, UnitType
from app.services.combat_engine import CombatEngine, calculate_damage, calculate_distance


class TestCalculateDamage:
    """Tests for damage calculation."""

    def test_basic_damage(self) -> None:
        """Test basic damage calculation."""
        attacker = UnitData(
            id="a1",
            type=UnitType.WARRIOR,
            name="Attacker",
            hp=100,
            max_hp=100,
            attack=20,
            defense=5,
            speed=1.0,
            position=None,
            is_player=True,
        )
        defender = UnitData(
            id="d1",
            type=UnitType.WARRIOR,
            name="Defender",
            hp=100,
            max_hp=100,
            attack=10,
            defense=10,
            speed=1.0,
            position=None,
            is_player=False,
        )

        damage = calculate_damage(attacker, defender)
        # Expected: 20 - (10 / 2) = 15
        assert damage == 15

    def test_minimum_damage(self) -> None:
        """Test that minimum damage is 1."""
        attacker = UnitData(
            id="a1",
            type=UnitType.WARRIOR,
            name="Weak",
            hp=100,
            max_hp=100,
            attack=5,
            defense=5,
            speed=1.0,
            position=None,
            is_player=True,
        )
        defender = UnitData(
            id="d1",
            type=UnitType.KNIGHT,
            name="Tank",
            hp=100,
            max_hp=100,
            attack=10,
            defense=50,
            speed=1.0,
            position=None,
            is_player=False,
        )

        damage = calculate_damage(attacker, defender)
        assert damage == 1


class TestCalculateDistance:
    """Tests for distance calculation."""

    def test_same_position(self) -> None:
        """Test distance is 0 for same position."""
        pos = Position(x=5, y=5)
        assert calculate_distance(pos, pos) == 0

    def test_horizontal_distance(self) -> None:
        """Test horizontal distance."""
        pos1 = Position(x=0, y=0)
        pos2 = Position(x=3, y=0)
        assert calculate_distance(pos1, pos2) == 3

    def test_vertical_distance(self) -> None:
        """Test vertical distance."""
        pos1 = Position(x=0, y=0)
        pos2 = Position(x=0, y=4)
        assert calculate_distance(pos1, pos2) == 4

    def test_diagonal_distance(self) -> None:
        """Test diagonal distance (3-4-5 triangle)."""
        pos1 = Position(x=0, y=0)
        pos2 = Position(x=3, y=4)
        assert calculate_distance(pos1, pos2) == 5.0


class TestCombatEngine:
    """Tests for the CombatEngine class."""

    @pytest.fixture
    def player_units(self) -> list[UnitData]:
        """Create test player units."""
        return [
            UnitData(
                id="p1",
                type=UnitType.WARRIOR,
                name="Warrior",
                hp=100,
                max_hp=100,
                attack=15,
                defense=10,
                speed=1.0,
                position=Position(x=2, y=2),
                is_player=True,
            ),
            UnitData(
                id="p2",
                type=UnitType.ARCHER,
                name="Archer",
                hp=60,
                max_hp=60,
                attack=20,
                defense=5,
                speed=1.2,
                position=Position(x=4, y=2),
                is_player=True,
            ),
        ]

    @pytest.fixture
    def enemy_units(self) -> list[UnitData]:
        """Create test enemy units."""
        return [
            UnitData(
                id="e1",
                type=UnitType.WARRIOR,
                name="Goblin",
                hp=80,
                max_hp=80,
                attack=12,
                defense=8,
                speed=1.1,
                position=Position(x=3, y=7),
                is_player=False,
            ),
        ]

    def test_engine_initialization(
        self, player_units: list[UnitData], enemy_units: list[UnitData]
    ) -> None:
        """Test engine initializes correctly."""
        engine = CombatEngine("test-id", player_units, enemy_units)

        state = engine.get_state()
        assert state.combat_id == "test-id"
        assert state.status.value == "active"
        assert state.tick == 0
        assert len(state.units) == 3

    def test_place_unit_action(
        self, player_units: list[UnitData], enemy_units: list[UnitData]
    ) -> None:
        """Test placing a unit."""
        # Remove position from first player unit
        player_units[0].position = None

        engine = CombatEngine("test-id", player_units, enemy_units)

        action = CombatAction(
            action_type=ActionType.PLACE_UNIT,
            unit_id="p1",
            target_position=Position(x=1, y=1),
        )

        result = engine.process_action(action)

        assert result.success is True
        # Find the placed unit
        placed_unit = next(u for u in result.state.units if u.id == "p1")
        assert placed_unit.position is not None
        assert placed_unit.position.x == 1
        assert placed_unit.position.y == 1

    def test_cannot_place_in_enemy_zone(
        self, player_units: list[UnitData], enemy_units: list[UnitData]
    ) -> None:
        """Test that players cannot deploy in enemy zone."""
        player_units[0].position = None

        engine = CombatEngine("test-id", player_units, enemy_units)

        action = CombatAction(
            action_type=ActionType.PLACE_UNIT,
            unit_id="p1",
            target_position=Position(x=2, y=5),  # Outside player zone
        )

        result = engine.process_action(action)
        assert result.success is False

    def test_cannot_place_on_occupied_tile(
        self, player_units: list[UnitData], enemy_units: list[UnitData]
    ) -> None:
        """Test that units cannot be placed on occupied tiles."""
        player_units[0].position = None

        engine = CombatEngine("test-id", player_units, enemy_units)

        # Try to place on the archer's position
        action = CombatAction(
            action_type=ActionType.PLACE_UNIT,
            unit_id="p1",
            target_position=Position(x=4, y=2),  # Archer is here
        )

        result = engine.process_action(action)
        assert result.success is False

    def test_tick_advances(
        self, player_units: list[UnitData], enemy_units: list[UnitData]
    ) -> None:
        """Test that tick counter advances."""
        engine = CombatEngine("test-id", player_units, enemy_units)

        engine.tick()
        state = engine.get_state()
        assert state.tick == 1

        engine.tick()
        state = engine.get_state()
        assert state.tick == 2

    def test_combat_ends_when_enemies_defeated(self) -> None:
        """Test that combat ends when all enemies are defeated."""
        player_units = [
            UnitData(
                id="p1",
                type=UnitType.WARRIOR,
                name="Strong",
                hp=200,
                max_hp=200,
                attack=100,
                defense=20,
                speed=2.0,
                position=Position(x=3, y=4),
                is_player=True,
            )
        ]
        enemy_units = [
            UnitData(
                id="e1",
                type=UnitType.WARRIOR,
                name="Weak",
                hp=10,
                max_hp=10,
                attack=5,
                defense=0,
                speed=0.5,
                position=Position(x=3, y=5),
                is_player=False,
            )
        ]

        engine = CombatEngine("test-id", player_units, enemy_units)

        # Run until combat ends
        for _ in range(20):
            engine.tick()
            state = engine.get_state()
            if state.status.value != "active":
                break

        assert state.status.value == "player_won"

    def test_combat_ends_when_player_defeated(self) -> None:
        """Test that combat ends when all player units are defeated."""
        player_units = [
            UnitData(
                id="p1",
                type=UnitType.WARRIOR,
                name="Weak",
                hp=10,
                max_hp=10,
                attack=5,
                defense=0,
                speed=0.5,
                position=Position(x=3, y=4),
                is_player=True,
            )
        ]
        enemy_units = [
            UnitData(
                id="e1",
                type=UnitType.WARRIOR,
                name="Strong",
                hp=200,
                max_hp=200,
                attack=100,
                defense=20,
                speed=2.0,
                position=Position(x=3, y=5),
                is_player=False,
            )
        ]

        engine = CombatEngine("test-id", player_units, enemy_units)

        # Run until combat ends
        for _ in range(20):
            engine.tick()
            state = engine.get_state()
            if state.status.value != "active":
                break

        assert state.status.value == "enemy_won"
