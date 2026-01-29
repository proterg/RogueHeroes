/**
 * TerrainPalette Component
 * ------------------------
 * Terrain type selection panel for the battlefield editor.
 * Displays all available terrain types with their properties.
 */

import React from 'react';
import {
  COMBAT_TERRAIN_TYPES,
  CombatTerrainType,
  getTerrainByCategory,
} from '../../types/combatTerrain';
import { battlefieldEditorEvents } from '../../game/scenes/BattlefieldEditorScene';

interface TerrainPaletteProps {
  selectedTerrain: string;
  onSelectTerrain: (terrainId: string) => void;
}

/** Convert hex color to CSS string */
const hexToColor = (hex: number): string => {
  return '#' + hex.toString(16).padStart(6, '0');
};

/** Get terrain effect icons */
const getTerrainIcons = (terrain: CombatTerrainType): string => {
  const icons: string[] = [];
  if (!terrain.walkable) icons.push('X');
  if (terrain.movementPenalty > 0) icons.push('~');
  if (terrain.meleeAttackPenalty > 0) icons.push('-A');
  if (terrain.blocksVision) icons.push('O');
  if (terrain.destructible) icons.push('D');
  return icons.join(' ');
};

export const TerrainPalette: React.FC<TerrainPaletteProps> = ({
  selectedTerrain,
  onSelectTerrain,
}) => {
  const handleTerrainClick = (terrainId: string) => {
    onSelectTerrain(terrainId);
    battlefieldEditorEvents.emit('selectTerrain', { terrainId });
  };

  const categories = getTerrainByCategory();

  const renderTerrainButton = (terrain: CombatTerrainType) => {
    const isSelected = selectedTerrain === terrain.id;
    const icons = getTerrainIcons(terrain);

    return (
      <button
        key={terrain.id}
        style={{
          ...styles.terrainButton,
          ...(isSelected ? styles.selectedButton : {}),
        }}
        onClick={() => handleTerrainClick(terrain.id)}
        title={`${terrain.name}\n${getTerrainTooltip(terrain)}`}
      >
        <div
          style={{
            ...styles.terrainColor,
            backgroundColor: hexToColor(terrain.color),
          }}
        />
        <div style={styles.terrainInfo}>
          <span style={styles.terrainName}>{terrain.name}</span>
          {icons && <span style={styles.terrainIcons}>{icons}</span>}
        </div>
      </button>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Terrain</div>

      {/* Legend */}
      <div style={styles.legend}>
        <span style={styles.legendItem} title="Impassable">X = Block</span>
        <span style={styles.legendItem} title="Slows movement">~ = Slow</span>
        <span style={styles.legendItem} title="Melee attack penalty">-A = Atk</span>
        <span style={styles.legendItem} title="Destructible">D = Break</span>
      </div>

      {/* Neutral terrain */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>Neutral</div>
        <div style={styles.terrainGrid}>
          {categories.neutral.map(renderTerrainButton)}
        </div>
      </div>

      {/* Hazard terrain */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>Hazards</div>
        <div style={styles.terrainGrid}>
          {categories.hazards.map(renderTerrainButton)}
        </div>
      </div>

      {/* Obstacles */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>Obstacles</div>
        <div style={styles.terrainGrid}>
          {categories.obstacles.map(renderTerrainButton)}
        </div>
      </div>

      {/* Destructible */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>Destructible</div>
        <div style={styles.terrainGrid}>
          {categories.destructible.map(renderTerrainButton)}
        </div>
      </div>
    </div>
  );
};

const getTerrainTooltip = (terrain: CombatTerrainType): string => {
  const effects: string[] = [];
  if (!terrain.walkable) effects.push('Impassable');
  if (terrain.movementPenalty > 0) effects.push(`Movement: -${terrain.movementPenalty * 100}%`);
  if (terrain.meleeAttackPenalty > 0) effects.push(`Melee attack: -${terrain.meleeAttackPenalty * 100}%`);
  if (terrain.blocksVision) effects.push('Blocks vision');
  if (terrain.blocksProjectiles) effects.push('Blocks projectiles');
  if (terrain.destructible) effects.push(`Destructible (HP: ${terrain.hp})`);
  return effects.length > 0 ? effects.join(', ') : 'No special effects';
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
    padding: '8px',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  header: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
    padding: '4px 8px',
    backgroundColor: '#1a1a2e',
    borderRadius: '4px',
  },
  legendItem: {
    color: '#888',
    fontSize: '10px',
    cursor: 'help',
  },
  section: {
    marginBottom: '12px',
  },
  sectionHeader: {
    color: '#aaa',
    fontSize: '12px',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  terrainGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  terrainButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s',
    textAlign: 'left',
  },
  selectedButton: {
    backgroundColor: '#4a4a6e',
    borderColor: '#00ff00',
  },
  terrainColor: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid #666',
    flexShrink: 0,
  },
  terrainInfo: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  terrainName: {
    fontWeight: '500',
  },
  terrainIcons: {
    color: '#ff9800',
    fontSize: '10px',
    fontWeight: 'bold',
  },
};
