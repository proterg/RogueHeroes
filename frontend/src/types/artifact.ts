/**
 * Artifact Type Definitions
 * -------------------------
 * Types for collectible artifacts/items that provide stat bonuses.
 * Artifacts are collected through quests, NPC interactions, and exploration.
 */

import { HeroStats } from './hero';

/** Partial hero stats for artifact bonuses */
export type ArtifactBonuses = Partial<HeroStats>;

/** An artifact/item that provides stat bonuses to the hero */
export interface Artifact {
  id: string;
  name: string;
  description: string;
  icon?: string;           // Emoji or icon identifier
  bonuses: ArtifactBonuses;
  source?: string;         // Where it came from (quest name, NPC, etc.)
}
