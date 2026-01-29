/**
 * Interaction Store
 * -----------------
 * State management for overworld interactions.
 * Tracks combat modifiers, recruited units, gold, artifacts, and used interactions.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CombatModifier,
  InteractionEffect,
  RecruitedUnit,
  StatModifiers,
} from '../types/interaction';
import { HeroData, HeroStats, ArmyState, DEFAULT_HERO } from '../types/hero';
import { ARTIFACTS } from '../game/data/ArtifactData';

interface InteractionStore {
  // State
  combatModifiers: CombatModifier[];
  recruitedUnits: RecruitedUnit[];
  gold: number;
  heroData: HeroData;
  isGameOver: boolean;
  tavernBanned: boolean;
  artifacts: string[];

  // Actions
  applyEffect: (effect: InteractionEffect, source: string) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  recruitUnit: (type: string, count: number) => void;
  removeUnits: (type: string, count: number) => void;
  getModifiersForUnit: (unitType: string) => StatModifiers;
  getArmyState: () => ArmyState;
  checkArmyDefeated: () => boolean;
  onCombatEnd: () => void;
  hasUsedInteraction: (interactionId: string) => boolean;
  markInteractionUsed: (interactionId: string) => void;
  clearRecruitedUnits: () => void;
  banFromTavern: () => void;
  addArtifact: (artifactId: string) => void;
  hasArtifact: (artifactId: string) => boolean;
  getHeroStatsWithArtifacts: () => HeroStats;
}

const InteractionStoreContext = createContext<InteractionStore | null>(null);

export function useInteractionStore(): InteractionStore {
  const context = useContext(InteractionStoreContext);
  if (!context) {
    throw new Error('useInteractionStore must be used within InteractionStoreProvider');
  }
  return context;
}

interface InteractionStoreProviderProps {
  children: React.ReactNode;
}

export function InteractionStoreProvider({ children }: InteractionStoreProviderProps): React.ReactElement {
  const [combatModifiers, setCombatModifiers] = useState<CombatModifier[]>([]);
  const [recruitedUnits, setRecruitedUnits] = useState<RecruitedUnit[]>([
    { type: 'soldier', count: 5 },
    { type: 'archer', count: 3 },
  ]);
  const [gold, setGold] = useState<number>(100); // Starting gold
  const [usedInteractionIds, setUsedInteractionIds] = useState<Set<string>>(new Set());
  const [heroData] = useState<HeroData>(DEFAULT_HERO);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [tavernBanned, setTavernBanned] = useState<boolean>(false);
  const [artifacts, setArtifacts] = useState<string[]>([]);

  const applyEffect = useCallback((effect: InteractionEffect, source: string) => {
    switch (effect.type) {
      case 'stat_modifier': {
        const modifiers = effect.value as StatModifiers;
        const newModifier: CombatModifier = {
          id: `${source}-${Date.now()}`,
          source,
          modifiers,
          target: effect.target === 'unit_type' ? 'unit_type' : 'all_units',
          unitType: effect.unitType,
          expiresAfterCombat: effect.duration === 'next_combat',
        };
        setCombatModifiers(prev => [...prev, newModifier]);
        break;
      }

      case 'add_unit': {
        const unitData = effect.value as RecruitedUnit;
        setRecruitedUnits(prev => {
          const existing = prev.find(u => u.type === unitData.type);
          if (existing) {
            return prev.map(u =>
              u.type === unitData.type
                ? { ...u, count: u.count + unitData.count }
                : u
            );
          }
          return [...prev, unitData];
        });
        break;
      }

      case 'add_gold': {
        const amount = effect.value as number;
        setGold(prev => prev + amount);
        break;
      }

      case 'heal_army': {
        // TODO: Implement army healing when army system is added
        console.log('Heal army effect applied');
        break;
      }

      case 'curse': {
        // Curses are negative stat modifiers
        const curseModifiers = effect.value as StatModifiers;
        const curseModifier: CombatModifier = {
          id: `curse-${source}-${Date.now()}`,
          source: `Curse: ${source}`,
          modifiers: curseModifiers,
          target: effect.target === 'unit_type' ? 'unit_type' : 'all_units',
          unitType: effect.unitType,
          expiresAfterCombat: effect.duration === 'next_combat',
        };
        setCombatModifiers(prev => [...prev, curseModifier]);
        break;
      }
    }
  }, []);

  const addGold = useCallback((amount: number) => {
    setGold(prev => prev + amount);
  }, []);

  const spendGold = useCallback((amount: number): boolean => {
    if (gold >= amount) {
      setGold(prev => prev - amount);
      return true;
    }
    return false;
  }, [gold]);

  const recruitUnit = useCallback((type: string, count: number) => {
    setRecruitedUnits(prev => {
      const existing = prev.find(u => u.type === type);
      if (existing) {
        return prev.map(u =>
          u.type === type
            ? { ...u, count: u.count + count }
            : u
        );
      }
      return [...prev, { type, count }];
    });
  }, []);

  const removeUnits = useCallback((type: string, count: number) => {
    setRecruitedUnits(prev => {
      return prev
        .map(u => {
          if (u.type === type) {
            const newCount = Math.max(0, u.count - count);
            return { ...u, count: newCount };
          }
          return u;
        })
        .filter(u => u.count > 0);
    });
  }, []);

  const getArmyState = useCallback((): ArmyState => {
    const totalUnits = recruitedUnits.reduce((sum, u) => sum + u.count, 0);
    return {
      slots: recruitedUnits.map(u => ({ type: u.type, count: u.count })),
      totalUnits,
    };
  }, [recruitedUnits]);

  const checkArmyDefeated = useCallback((): boolean => {
    const totalUnits = recruitedUnits.reduce((sum, u) => sum + u.count, 0);
    if (totalUnits === 0) {
      setIsGameOver(true);
      return true;
    }
    return false;
  }, [recruitedUnits]);

  const getModifiersForUnit = useCallback((unitType: string): StatModifiers => {
    const result: StatModifiers = {};

    for (const modifier of combatModifiers) {
      // Check if modifier applies to this unit
      if (modifier.target === 'all_units' ||
          (modifier.target === 'unit_type' && modifier.unitType === unitType)) {
        // Merge modifiers
        if (modifier.modifiers.hp) result.hp = (result.hp ?? 0) + modifier.modifiers.hp;
        if (modifier.modifiers.attack) result.attack = (result.attack ?? 0) + modifier.modifiers.attack;
        if (modifier.modifiers.defense) result.defense = (result.defense ?? 0) + modifier.modifiers.defense;
        if (modifier.modifiers.critChance) result.critChance = (result.critChance ?? 0) + modifier.modifiers.critChance;
        if (modifier.modifiers.critDamage) result.critDamage = (result.critDamage ?? 0) + modifier.modifiers.critDamage;
        if (modifier.modifiers.moveSpeed) result.moveSpeed = (result.moveSpeed ?? 0) + modifier.modifiers.moveSpeed;
        if (modifier.modifiers.attackSpeed) result.attackSpeed = (result.attackSpeed ?? 0) + modifier.modifiers.attackSpeed;
        if (modifier.modifiers.vision) result.vision = (result.vision ?? 0) + modifier.modifiers.vision;
        if (modifier.modifiers.lifesteal) result.lifesteal = (result.lifesteal ?? 0) + modifier.modifiers.lifesteal;
      }
    }

    return result;
  }, [combatModifiers]);

  const onCombatEnd = useCallback(() => {
    // Remove modifiers that expire after combat
    setCombatModifiers(prev =>
      prev.filter(m => !m.expiresAfterCombat)
    );
  }, []);

  const hasUsedInteraction = useCallback((interactionId: string): boolean => {
    return usedInteractionIds.has(interactionId);
  }, [usedInteractionIds]);

  const markInteractionUsed = useCallback((interactionId: string) => {
    setUsedInteractionIds(prev => new Set(prev).add(interactionId));
  }, []);

  const clearRecruitedUnits = useCallback(() => {
    setRecruitedUnits([]);
  }, []);

  const banFromTavern = useCallback(() => {
    setTavernBanned(true);
  }, []);

  const addArtifact = useCallback((artifactId: string) => {
    setArtifacts(prev => {
      if (prev.includes(artifactId)) return prev; // No duplicates
      return [...prev, artifactId];
    });
  }, []);

  const hasArtifact = useCallback((artifactId: string): boolean => {
    return artifacts.includes(artifactId);
  }, [artifacts]);

  const getHeroStatsWithArtifacts = useCallback((): HeroStats => {
    const base = { ...heroData.stats };
    for (const artifactId of artifacts) {
      const artifact = ARTIFACTS[artifactId];
      if (artifact?.bonuses) {
        // Merge each bonus
        (Object.keys(artifact.bonuses) as Array<keyof typeof artifact.bonuses>).forEach((key) => {
          const value = artifact.bonuses[key];
          if (value !== undefined) {
            base[key] = (base[key] || 0) + value;
          }
        });
      }
    }
    return base;
  }, [heroData.stats, artifacts]);

  const store: InteractionStore = {
    combatModifiers,
    recruitedUnits,
    gold,
    heroData,
    isGameOver,
    tavernBanned,
    artifacts,
    applyEffect,
    addGold,
    spendGold,
    recruitUnit,
    removeUnits,
    getModifiersForUnit,
    getArmyState,
    checkArmyDefeated,
    onCombatEnd,
    hasUsedInteraction,
    markInteractionUsed,
    clearRecruitedUnits,
    banFromTavern,
    addArtifact,
    hasArtifact,
    getHeroStatsWithArtifacts,
  };

  return React.createElement(
    InteractionStoreContext.Provider,
    { value: store },
    children
  );
}
