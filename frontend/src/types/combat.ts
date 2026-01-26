/**
 * Combat Type Definitions
 * -----------------------
 * TypeScript types for combat system.
 * Mirrors backend Pydantic schemas.
 */

export type UnitType = 'warrior' | 'archer' | 'mage' | 'knight' | 'healer';

export type ActionType = 'place_unit' | 'cast_spell' | 'use_ability';

export type CombatStatus = 'active' | 'player_won' | 'enemy_won';

export interface Position {
  x: number;
  y: number;
}

export interface UnitData {
  id: string;
  type: UnitType;
  name: string;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  position: Position | null;
  is_player: boolean;
}

export interface CombatStartRequest {
  player_units: UnitData[];
  enemy_units: UnitData[];
}

export interface CombatState {
  combat_id: string;
  status: CombatStatus;
  tick: number;
  units: UnitData[];
  pending_actions: string[];
}

export interface CombatAction {
  action_type: ActionType;
  unit_id?: string;
  target_position?: Position;
  spell_id?: string;
  ability_id?: string;
}

export interface CombatActionResponse {
  success: boolean;
  message: string;
  state: CombatState;
}
