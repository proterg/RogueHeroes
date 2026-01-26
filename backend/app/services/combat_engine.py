"""
Combat Engine Service
---------------------
Core combat simulation logic. Handles:
- Turn order calculation
- Damage resolution
- Unit AI for auto-combat
- Player action validation
"""

import math
from typing import Optional

from app.schemas.combat import (
    UnitData,
    CombatState,
    CombatAction,
    CombatActionResponse,
    CombatStatus,
    ActionType,
    Position,
)


def calculate_damage(attacker: UnitData, defender: UnitData) -> int:
    """
    Calculate damage dealt by attacker to defender.

    Formula: base_damage = attack - (defense / 2)
    Minimum damage is 1.
    """
    base_damage = attacker.attack - (defender.defense // 2)
    return max(1, base_damage)


def calculate_distance(pos1: Position, pos2: Position) -> float:
    """Calculate Euclidean distance between two positions."""
    return math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2)


class CombatEngine:
    """
    Manages a single combat encounter.

    Handles unit state, action processing, and tick-based simulation.
    """

    def __init__(
        self,
        combat_id: str,
        player_units: list[UnitData],
        enemy_units: list[UnitData],
    ):
        self.combat_id = combat_id
        self.current_tick = 0
        self.status = CombatStatus.ACTIVE
        self.units: dict[str, UnitData] = {}
        self.pending_actions: list[str] = []

        # Initialize units
        for unit in player_units:
            self.units[unit.id] = unit.model_copy()
        for unit in enemy_units:
            self.units[unit.id] = unit.model_copy()

    def get_state(self) -> CombatState:
        """Get the current combat state for rendering."""
        return CombatState(
            combat_id=self.combat_id,
            status=self.status,
            tick=self.current_tick,
            units=list(self.units.values()),
            pending_actions=self.pending_actions.copy(),
        )

    def process_action(self, action: CombatAction) -> CombatActionResponse:
        """
        Process a player action.

        Validates the action and queues it for the next tick.
        """
        if self.status != CombatStatus.ACTIVE:
            return CombatActionResponse(
                success=False,
                message="Combat has ended",
                state=self.get_state(),
            )

        if action.action_type == ActionType.PLACE_UNIT:
            return self._handle_place_unit(action)
        elif action.action_type == ActionType.CAST_SPELL:
            return self._handle_cast_spell(action)
        elif action.action_type == ActionType.USE_ABILITY:
            return self._handle_use_ability(action)

        return CombatActionResponse(
            success=False,
            message="Unknown action type",
            state=self.get_state(),
        )

    def tick(self) -> None:
        """
        Advance the combat simulation by one tick.

        Units will:
        1. Move toward nearest enemy
        2. Attack if in range
        3. Use abilities when available
        """
        if self.status != CombatStatus.ACTIVE:
            return

        self.current_tick += 1

        # Get alive units
        player_units = [u for u in self.units.values() if u.is_player and u.hp > 0]
        enemy_units = [u for u in self.units.values() if not u.is_player and u.hp > 0]

        # Check win conditions
        if not enemy_units:
            self.status = CombatStatus.PLAYER_WON
            return
        if not player_units:
            self.status = CombatStatus.ENEMY_WON
            return

        # Process unit actions (simple AI)
        all_units = sorted(self.units.values(), key=lambda u: -u.speed)
        for unit in all_units:
            if unit.hp <= 0 or unit.position is None:
                continue

            # Find nearest enemy
            enemies = enemy_units if unit.is_player else player_units
            target = self._find_nearest_enemy(unit, enemies)

            if target and target.position:
                distance = calculate_distance(unit.position, target.position)

                # Attack if in range (range = 1.5 for melee)
                attack_range = 1.5 if unit.type.value != "archer" else 5.0
                if distance <= attack_range:
                    damage = calculate_damage(unit, target)
                    target.hp = max(0, target.hp - damage)
                else:
                    # Move toward target
                    self._move_toward(unit, target.position)

        # Clear pending actions
        self.pending_actions.clear()

        # Recheck win conditions after combat
        player_alive = any(u.hp > 0 for u in self.units.values() if u.is_player)
        enemy_alive = any(u.hp > 0 for u in self.units.values() if not u.is_player)

        if not enemy_alive:
            self.status = CombatStatus.PLAYER_WON
        elif not player_alive:
            self.status = CombatStatus.ENEMY_WON

    def _handle_place_unit(self, action: CombatAction) -> CombatActionResponse:
        """Handle unit placement action."""
        if not action.unit_id or not action.target_position:
            return CombatActionResponse(
                success=False,
                message="Unit ID and target position required",
                state=self.get_state(),
            )

        unit = self.units.get(action.unit_id)
        if not unit:
            return CombatActionResponse(
                success=False,
                message="Unit not found",
                state=self.get_state(),
            )

        if not unit.is_player:
            return CombatActionResponse(
                success=False,
                message="Cannot place enemy units",
                state=self.get_state(),
            )

        # Check if position is valid (within player's deployment zone)
        if action.target_position.y > 3:  # Player deploys in bottom rows
            return CombatActionResponse(
                success=False,
                message="Cannot deploy outside player zone",
                state=self.get_state(),
            )

        # Check if position is occupied
        for other in self.units.values():
            if other.position and other.id != unit.id:
                if other.position.x == action.target_position.x and other.position.y == action.target_position.y:
                    return CombatActionResponse(
                        success=False,
                        message="Position already occupied",
                        state=self.get_state(),
                    )

        unit.position = action.target_position
        self.pending_actions.append(f"Placed {unit.name}")

        return CombatActionResponse(
            success=True,
            message=f"Placed {unit.name} at ({action.target_position.x}, {action.target_position.y})",
            state=self.get_state(),
        )

    def _handle_cast_spell(self, action: CombatAction) -> CombatActionResponse:
        """Handle spell casting action."""
        # TODO: Implement spell system
        return CombatActionResponse(
            success=False,
            message="Spell system not yet implemented",
            state=self.get_state(),
        )

    def _handle_use_ability(self, action: CombatAction) -> CombatActionResponse:
        """Handle ability usage action."""
        # TODO: Implement ability system
        return CombatActionResponse(
            success=False,
            message="Ability system not yet implemented",
            state=self.get_state(),
        )

    def _find_nearest_enemy(
        self, unit: UnitData, enemies: list[UnitData]
    ) -> Optional[UnitData]:
        """Find the nearest enemy unit to the given unit."""
        if not unit.position:
            return None

        nearest: Optional[UnitData] = None
        min_distance = float("inf")

        for enemy in enemies:
            if enemy.hp <= 0 or not enemy.position:
                continue

            distance = calculate_distance(unit.position, enemy.position)
            if distance < min_distance:
                min_distance = distance
                nearest = enemy

        return nearest

    def _move_toward(self, unit: UnitData, target: Position) -> None:
        """Move unit one step toward the target position."""
        if not unit.position:
            return

        dx = target.x - unit.position.x
        dy = target.y - unit.position.y

        # Normalize to one step
        if abs(dx) > abs(dy):
            new_x = unit.position.x + (1 if dx > 0 else -1)
            new_y = unit.position.y
        else:
            new_x = unit.position.x
            new_y = unit.position.y + (1 if dy > 0 else -1)

        # Check if new position is occupied
        for other in self.units.values():
            if other.position and other.id != unit.id:
                if other.position.x == new_x and other.position.y == new_y:
                    return  # Can't move, position occupied

        unit.position = Position(x=new_x, y=new_y)
