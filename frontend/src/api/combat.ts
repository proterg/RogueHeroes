/**
 * Combat API Client
 * -----------------
 * Functions for interacting with combat API endpoints.
 * Handles starting combat, submitting actions, and running ticks.
 */

import {
  CombatState,
  CombatStartRequest,
  CombatAction,
  CombatActionResponse,
} from '../types/combat';

const API_BASE = '/api';

/**
 * Start a new combat encounter.
 */
export async function startCombat(request: CombatStartRequest): Promise<CombatState> {
  const response = await fetch(`${API_BASE}/combat/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to start combat');
  }

  return response.json();
}

/**
 * Get the current state of a combat encounter.
 */
export async function getCombatState(combatId: string): Promise<CombatState> {
  const response = await fetch(`${API_BASE}/combat/${combatId}/state`);

  if (!response.ok) {
    throw new Error('Failed to get combat state');
  }

  return response.json();
}

/**
 * Submit a player action during combat.
 */
export async function submitAction(
  combatId: string,
  action: CombatAction
): Promise<CombatActionResponse> {
  const response = await fetch(`${API_BASE}/combat/${combatId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });

  if (!response.ok) {
    throw new Error('Failed to submit action');
  }

  return response.json();
}

/**
 * Advance the combat simulation by one tick.
 */
export async function runTick(combatId: string): Promise<CombatState> {
  const response = await fetch(`${API_BASE}/combat/${combatId}/tick`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to run tick');
  }

  return response.json();
}

/**
 * End a combat encounter.
 */
export async function endCombat(combatId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/combat/${combatId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to end combat');
  }
}
