/**
 * Combat API Tests
 * ----------------
 * Tests for the combat API client functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startCombat, getCombatState, submitAction, runTick, endCombat } from '../../src/api/combat';
import { CombatState, UnitData, CombatAction } from '../../src/types/combat';

describe('Combat API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('startCombat', () => {
    it('sends correct request and returns combat state', async () => {
      const mockState: CombatState = {
        combat_id: 'test-id',
        status: 'active',
        tick: 0,
        units: [],
        pending_actions: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState),
      });

      const playerUnits: UnitData[] = [
        {
          id: 'p1',
          type: 'warrior',
          name: 'Warrior',
          hp: 100,
          max_hp: 100,
          attack: 15,
          defense: 10,
          speed: 1.0,
          position: { x: 2, y: 2 },
          is_player: true,
        },
      ];

      const enemyUnits: UnitData[] = [
        {
          id: 'e1',
          type: 'archer',
          name: 'Enemy',
          hp: 60,
          max_hp: 60,
          attack: 12,
          defense: 5,
          speed: 1.0,
          position: { x: 2, y: 8 },
          is_player: false,
        },
      ];

      const result = await startCombat({ player_units: playerUnits, enemy_units: enemyUnits });

      expect(fetch).toHaveBeenCalledWith('/api/combat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_units: playerUnits, enemy_units: enemyUnits }),
      });
      expect(result).toEqual(mockState);
    });

    it('throws error on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(
        startCombat({ player_units: [], enemy_units: [] })
      ).rejects.toThrow('Failed to start combat');
    });
  });

  describe('getCombatState', () => {
    it('fetches and returns combat state', async () => {
      const mockState: CombatState = {
        combat_id: 'test-id',
        status: 'active',
        tick: 5,
        units: [],
        pending_actions: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState),
      });

      const result = await getCombatState('test-id');

      expect(fetch).toHaveBeenCalledWith('/api/combat/test-id/state');
      expect(result).toEqual(mockState);
    });
  });

  describe('submitAction', () => {
    it('sends action and returns response', async () => {
      const mockResponse = {
        success: true,
        message: 'Action processed',
        state: {
          combat_id: 'test-id',
          status: 'active',
          tick: 0,
          units: [],
          pending_actions: [],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const action: CombatAction = {
        action_type: 'place_unit',
        unit_id: 'p1',
        target_position: { x: 2, y: 2 },
      };

      const result = await submitAction('test-id', action);

      expect(fetch).toHaveBeenCalledWith('/api/combat/test-id/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('runTick', () => {
    it('advances combat and returns new state', async () => {
      const mockState: CombatState = {
        combat_id: 'test-id',
        status: 'active',
        tick: 1,
        units: [],
        pending_actions: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockState),
      });

      const result = await runTick('test-id');

      expect(fetch).toHaveBeenCalledWith('/api/combat/test-id/tick', {
        method: 'POST',
      });
      expect(result.tick).toBe(1);
    });
  });

  describe('endCombat', () => {
    it('sends delete request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      await endCombat('test-id');

      expect(fetch).toHaveBeenCalledWith('/api/combat/test-id', {
        method: 'DELETE',
      });
    });

    it('throws error on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await expect(endCombat('test-id')).rejects.toThrow('Failed to end combat');
    });
  });
});
