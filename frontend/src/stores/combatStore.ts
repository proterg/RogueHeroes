/**
 * Combat Store
 * ------------
 * Simple state store for combat-related data.
 * Uses React context for sharing state across components.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CombatState, UnitData } from '../types/combat';

interface CombatStore {
  combatState: CombatState | null;
  selectedUnitId: string | null;
  combatLog: string[];
  setCombatState: (state: CombatState | null) => void;
  selectUnit: (unitId: string | null) => void;
  addLogEntry: (entry: string) => void;
  clearLog: () => void;
  getSelectedUnit: () => UnitData | null;
}

const CombatStoreContext = createContext<CombatStore | null>(null);

export function useCombatStore(): CombatStore {
  const context = useContext(CombatStoreContext);
  if (!context) {
    throw new Error('useCombatStore must be used within CombatStoreProvider');
  }
  return context;
}

interface CombatStoreProviderProps {
  children: React.ReactNode;
}

export function CombatStoreProvider({ children }: CombatStoreProviderProps): React.ReactElement {
  const [combatState, setCombatStateInternal] = useState<CombatState | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);

  const setCombatState = useCallback((state: CombatState | null) => {
    setCombatStateInternal(state);
    // Clear selection if unit no longer exists
    if (state && selectedUnitId) {
      const unitExists = state.units.some((u) => u.id === selectedUnitId);
      if (!unitExists) {
        setSelectedUnitId(null);
      }
    }
  }, [selectedUnitId]);

  const selectUnit = useCallback((unitId: string | null) => {
    setSelectedUnitId(unitId);
  }, []);

  const addLogEntry = useCallback((entry: string) => {
    setCombatLog((prev) => [...prev.slice(-99), entry]); // Keep last 100 entries
  }, []);

  const clearLog = useCallback(() => {
    setCombatLog([]);
  }, []);

  const getSelectedUnit = useCallback((): UnitData | null => {
    if (!combatState || !selectedUnitId) return null;
    return combatState.units.find((u) => u.id === selectedUnitId) || null;
  }, [combatState, selectedUnitId]);

  const store: CombatStore = {
    combatState,
    selectedUnitId,
    combatLog,
    setCombatState,
    selectUnit,
    addLogEntry,
    clearLog,
    getSelectedUnit,
  };

  return React.createElement(
    CombatStoreContext.Provider,
    { value: store },
    children
  );
}
