/**
 * useCombat Hook
 * --------------
 * React hook for managing combat state and actions.
 * Provides a clean interface for components to interact with combat API.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  startCombat,
  getCombatState,
  submitAction,
  runTick,
  endCombat,
} from '../api/combat';
import {
  CombatState,
  CombatStartRequest,
  CombatAction,
} from '../types/combat';

interface UseCombatOptions {
  autoTickInterval?: number; // ms between auto-ticks, 0 to disable
}

interface UseCombatReturn {
  combatState: CombatState | null;
  isLoading: boolean;
  error: string | null;
  isAutoPlaying: boolean;
  start: (request: CombatStartRequest) => Promise<void>;
  refresh: () => Promise<void>;
  action: (action: CombatAction) => Promise<boolean>;
  tick: () => Promise<void>;
  end: () => Promise<void>;
  setAutoPlay: (enabled: boolean) => void;
}

export function useCombat(
  combatId: string | null,
  options: UseCombatOptions = {}
): UseCombatReturn {
  const { autoTickInterval = 500 } = options;

  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Fetch state when combatId changes
  useEffect(() => {
    if (!combatId) {
      setCombatState(null);
      return;
    }

    setIsLoading(true);
    getCombatState(combatId)
      .then(setCombatState)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [combatId]);

  // Auto-play loop
  useEffect(() => {
    if (!isAutoPlaying || !combatId || combatState?.status !== 'active') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const newState = await runTick(combatId);
        setCombatState(newState);

        if (newState.status !== 'active') {
          setIsAutoPlaying(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tick failed');
        setIsAutoPlaying(false);
      }
    }, autoTickInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, combatId, combatState?.status, autoTickInterval]);

  const start = useCallback(async (request: CombatStartRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const state = await startCombat(request);
      setCombatState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start combat');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!combatId) return;

    setIsLoading(true);
    try {
      const state = await getCombatState(combatId);
      setCombatState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, [combatId]);

  const action = useCallback(
    async (combatAction: CombatAction): Promise<boolean> => {
      if (!combatId) return false;

      try {
        const response = await submitAction(combatId, combatAction);
        setCombatState(response.state);
        return response.success;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
        return false;
      }
    },
    [combatId]
  );

  const tick = useCallback(async () => {
    if (!combatId) return;

    try {
      const newState = await runTick(combatId);
      setCombatState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tick failed');
    }
  }, [combatId]);

  const end = useCallback(async () => {
    if (!combatId) return;

    setIsAutoPlaying(false);
    try {
      await endCombat(combatId);
      setCombatState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end combat');
    }
  }, [combatId]);

  const setAutoPlay = useCallback((enabled: boolean) => {
    setIsAutoPlaying(enabled);
  }, []);

  return {
    combatState,
    isLoading,
    error,
    isAutoPlaying,
    start,
    refresh,
    action,
    tick,
    end,
    setAutoPlay,
  };
}
