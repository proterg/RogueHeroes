/**
 * useCombat Hook Tests
 * --------------------
 * Tests for the combat management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCombat } from '../../src/hooks/useCombat';
import { CombatState } from '../../src/types/combat';

// Mock the API module
vi.mock('../../src/api/combat', () => ({
  startCombat: vi.fn(),
  getCombatState: vi.fn(),
  submitAction: vi.fn(),
  runTick: vi.fn(),
  endCombat: vi.fn(),
}));

import * as combatApi from '../../src/api/combat';

describe('useCombat', () => {
  const mockState: CombatState = {
    combat_id: 'test-id',
    status: 'active',
    tick: 0,
    units: [],
    pending_actions: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns initial state when no combatId', () => {
    const { result } = renderHook(() => useCombat(null));

    expect(result.current.combatState).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches state when combatId is provided', async () => {
    vi.mocked(combatApi.getCombatState).mockResolvedValue(mockState);

    const { result } = renderHook(() => useCombat('test-id'));

    await waitFor(() => {
      expect(result.current.combatState).toEqual(mockState);
    });

    expect(combatApi.getCombatState).toHaveBeenCalledWith('test-id');
  });

  it('handles fetch error', async () => {
    vi.mocked(combatApi.getCombatState).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCombat('test-id'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('tick function advances combat', async () => {
    const tickedState = { ...mockState, tick: 1 };
    vi.mocked(combatApi.getCombatState).mockResolvedValue(mockState);
    vi.mocked(combatApi.runTick).mockResolvedValue(tickedState);

    const { result } = renderHook(() => useCombat('test-id'));

    await waitFor(() => {
      expect(result.current.combatState).not.toBeNull();
    });

    await act(async () => {
      await result.current.tick();
    });

    expect(result.current.combatState?.tick).toBe(1);
    expect(combatApi.runTick).toHaveBeenCalledWith('test-id');
  });

  it('action function submits action', async () => {
    const actionResponse = {
      success: true,
      message: 'Action processed',
      state: mockState,
    };
    vi.mocked(combatApi.getCombatState).mockResolvedValue(mockState);
    vi.mocked(combatApi.submitAction).mockResolvedValue(actionResponse);

    const { result } = renderHook(() => useCombat('test-id'));

    await waitFor(() => {
      expect(result.current.combatState).not.toBeNull();
    });

    let success: boolean = false;
    await act(async () => {
      success = await result.current.action({
        action_type: 'place_unit',
        unit_id: 'p1',
        target_position: { x: 2, y: 2 },
      });
    });

    expect(success).toBe(true);
    expect(combatApi.submitAction).toHaveBeenCalled();
  });

  it('end function cleans up combat', async () => {
    vi.mocked(combatApi.getCombatState).mockResolvedValue(mockState);
    vi.mocked(combatApi.endCombat).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCombat('test-id'));

    await waitFor(() => {
      expect(result.current.combatState).not.toBeNull();
    });

    await act(async () => {
      await result.current.end();
    });

    expect(result.current.combatState).toBeNull();
    expect(combatApi.endCombat).toHaveBeenCalledWith('test-id');
  });
});
