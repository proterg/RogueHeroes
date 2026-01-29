/**
 * ArmyDisplay Component
 * ---------------------
 * Displays the hero's army in the overworld toolbar.
 * Shows hero portrait and unit icons with counts.
 * Clicking a unit opens a detail popup with stats.
 * Clicking the hero shows stats with artifact bonuses.
 */

import React, { useState } from 'react';
import { useInteractionStore } from '../../stores';
import { UnitIcon } from './UnitIcon';
import { getUnitIconInfo } from '../../game/data/UnitDisplay';
import { getUnitStats } from '../../game/data/UnitStats';
import { HeroStats } from '../../types/hero';
import { ARTIFACTS } from '../../game/data/ArtifactData';

const BORDER_COLOR = '#333';

/**
 * Hero portrait component using hero_south.png spritesheet
 * Spritesheet is 1584x672 - display first frame at visible size
 * Now clickable to show hero stats modal
 */
const HeroPortrait: React.FC<{ name: string; onClick: () => void }> = ({ name, onClick }) => {
  // hero_south.png is 1584x672
  // Display a reasonable portion showing the first frame
  const displayWidth = 95;
  const displayHeight = 160;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: 4,
        backgroundColor: '#252530',
        border: '1px solid #3a3a4a',
        cursor: 'pointer',
        borderRadius: 4,
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#303040';
        e.currentTarget.style.borderColor = '#5a5a6a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#252530';
        e.currentTarget.style.borderColor = '#3a3a4a';
      }}
    >
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundImage: `url(/assets/units/hero/hero_south.png)`,
          backgroundPosition: '0 0',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 0 1px #1a1a2e) drop-shadow(0 0 1px #1a1a2e)',
        }}
        title={name}
      />
    </button>
  );
};

/**
 * Single unit slot with icon and count - clickable button
 */
const UnitSlot: React.FC<{ unitType: string; count: number; onClick: () => void }> = ({ unitType, count, onClick }) => {
  const iconSize = 56;
  const iconScale = 3.75;
  const iconInfo = getUnitIconInfo(unitType);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#252530',
        padding: 2,
        borderRadius: 4,
        border: '1px solid #3a3a4a',
        overflow: 'visible',
        cursor: 'pointer',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#303040';
        e.currentTarget.style.borderColor = '#5a5a6a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#252530';
        e.currentTarget.style.borderColor = '#3a3a4a';
      }}
    >
      <div style={{
        width: iconSize,
        height: iconSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',  // Let clicks pass through to the button
      }}>
        <div style={{ transform: `scale(${iconScale})` }}>
          <UnitIcon unitType={unitType} size={iconSize} />
        </div>
      </div>
      <span style={{ color: '#aaa', fontSize: '11px' }}>
        {iconInfo.name}
      </span>
      <span style={{ color: '#ccc', fontSize: '13px', fontWeight: 'bold' }}>
        x{count}
      </span>
    </button>
  );
};

/**
 * Unit detail popup showing stats
 */
const UnitDetailModal: React.FC<{ unitType: string; count: number; onClose: () => void }> = ({ unitType, count, onClose }) => {
  const iconSize = 56;
  const iconScale = 3.75 * 1.3;  // 30% bigger than toolbar
  const stats = getUnitStats(unitType);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          border: '2px solid #444',
          borderRadius: 8,
          padding: 20,
          minWidth: 400,
          maxWidth: 500,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          borderBottom: '1px solid #333',
          paddingBottom: 12,
        }}>
          <h2 style={{ color: '#e0e0e0', margin: 0, fontSize: '18px' }}>
            {stats.name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Content - Icon and Stats side by side */}
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Unit Icon */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: iconSize,
              height: iconSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ transform: `scale(${iconScale})` }}>
                <UnitIcon unitType={unitType} size={iconSize} />
              </div>
            </div>
            <span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold', marginTop: 40 }}>
              x{count} in army
            </span>
          </div>

          {/* Stats Table */}
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <StatRow label="HP" value={stats.hp} />
                <StatRow label="Attack" value={`${stats.attack} (±10%)`} />
                <StatRow label="Defense" value={stats.defense} />
                <StatRow label="Move Speed" value={stats.moveSpeed} />
                <StatRow label="Attack Speed" value={stats.attackSpeed} />
                <StatRow label="Initiative" value={stats.initiative === 'first' ? 'First Strike' : stats.initiative === 'last' ? 'Last Strike' : 'Regular'} />
                <StatRow label="Range" value={stats.attackRange === 1 ? 'Melee' : `${stats.attackRange} tiles`} />
                <StatRow label="Crit Chance" value={`${stats.critChance}%`} />
                <StatRow label="Crit Damage" value={`${stats.critDamage * 100}%`} />
                <StatRow label="Vision" value={`${stats.vision} tiles`} />
                {stats.lifesteal > 0 && <StatRow label="Lifesteal" value={`${stats.lifesteal * 100}%`} />}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        <div style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #333',
          color: '#888',
          fontSize: '12px',
          fontStyle: 'italic',
        }}>
          {stats.description}
        </div>
      </div>
    </div>
  );
};

/** Stats table row */
const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <tr>
    <td style={{ color: '#888', padding: '4px 8px 4px 0' }}>{label}</td>
    <td style={{ color: '#e0e0e0', padding: '4px 0', textAlign: 'right' }}>{value}</td>
  </tr>
);

/** Stat row with optional artifact bonus display */
const HeroStatRow: React.FC<{ label: string; baseValue: number; totalValue: number; isPercent?: boolean }> = ({ label, baseValue, totalValue, isPercent }) => {
  const bonus = totalValue - baseValue;
  const hasBonus = bonus !== 0;

  const formatValue = (value: number) => {
    if (isPercent) {
      return value >= 0 ? `+${(value * 100).toFixed(0)}%` : `${(value * 100).toFixed(0)}%`;
    }
    return value >= 0 ? `+${value}` : `${value}`;
  };

  return (
    <tr>
      <td style={{ color: '#888', padding: '4px 8px 4px 0' }}>{label}</td>
      <td style={{ color: '#e0e0e0', padding: '4px 0', textAlign: 'right' }}>
        {formatValue(totalValue)}
        {hasBonus && (
          <span style={{ color: '#4a7c59', fontSize: '11px', marginLeft: 6 }}>
            ({formatValue(bonus)} from items)
          </span>
        )}
      </td>
    </tr>
  );
};

/**
 * Hero detail popup showing hero stats with artifact bonuses
 */
const HeroDetailModal: React.FC<{
  heroData: { name: string; stats: HeroStats };
  totalStats: HeroStats;
  artifacts: string[];
  onClose: () => void;
}> = ({ heroData, totalStats, artifacts, onClose }) => {
  // 30% bigger than toolbar portrait
  const displayWidth = 95 * 1.3;
  const displayHeight = 160 * 1.3;

  const collectedArtifacts = artifacts.map(id => ARTIFACTS[id]).filter(Boolean);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          border: '2px solid #444',
          borderRadius: 8,
          padding: 20,
          minWidth: 450,
          maxWidth: 550,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          borderBottom: '1px solid #333',
          paddingBottom: 12,
        }}>
          <h2 style={{ color: '#e0e0e0', margin: 0, fontSize: '18px' }}>
            {heroData.name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Content - Portrait and Stats side by side */}
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Hero Portrait */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <div
              style={{
                width: displayWidth,
                height: displayHeight,
                backgroundImage: `url(/assets/units/hero/hero_south.png)`,
                backgroundPosition: '0 0',
                backgroundSize: 'auto 100%',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 0 2px #1a1a2e) drop-shadow(0 0 2px #1a1a2e)',
              }}
            />
          </div>

          {/* Stats Table */}
          <div style={{ flex: 1 }}>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: 8, textTransform: 'uppercase' }}>
              Troop Bonuses
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <HeroStatRow label="Attack" baseValue={heroData.stats.attack} totalValue={totalStats.attack} />
                <HeroStatRow label="Defense" baseValue={heroData.stats.defense} totalValue={totalStats.defense} />
                <HeroStatRow label="Speed" baseValue={heroData.stats.speed} totalValue={totalStats.speed} />
                <HeroStatRow label="Vampiric" baseValue={heroData.stats.vampiric} totalValue={totalStats.vampiric} isPercent />
                <HeroStatRow label="Attack Speed" baseValue={heroData.stats.attackSpeed} totalValue={totalStats.attackSpeed} />
                <HeroStatRow label="Magic" baseValue={heroData.stats.magic} totalValue={totalStats.magic} />
                <HeroStatRow label="Deployments" baseValue={heroData.stats.deployments} totalValue={totalStats.deployments} />
                <HeroStatRow label="Charisma" baseValue={heroData.stats.charisma} totalValue={totalStats.charisma} />
                <HeroStatRow label="Tactics" baseValue={heroData.stats.tactics} totalValue={totalStats.tactics} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Artifacts Section */}
        {collectedArtifacts.length > 0 && (
          <div style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid #333',
          }}>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: 8, textTransform: 'uppercase' }}>
              Artifacts Collected ({collectedArtifacts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {collectedArtifacts.map(artifact => (
                <div
                  key={artifact.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    backgroundColor: '#252540',
                    borderRadius: 4,
                    border: '1px solid #3a3a5a',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{artifact.icon || '?'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e0e0e0', fontSize: '13px' }}>{artifact.name}</div>
                    <div style={{ color: '#666', fontSize: '11px' }}>{artifact.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #333',
          color: '#888',
          fontSize: '12px',
          fontStyle: 'italic',
        }}>
          Hero stats provide bonuses to all troops in combat.
        </div>
      </div>
    </div>
  );
};

/**
 * Main ArmyDisplay component for the toolbar
 */
export const ArmyDisplay: React.FC = () => {
  const { heroData, recruitedUnits, artifacts, getHeroStatsWithArtifacts } = useInteractionStore();
  const [selectedUnit, setSelectedUnit] = useState<{ type: string; count: number } | null>(null);
  const [showHeroModal, setShowHeroModal] = useState(false);

  const totalUnits = recruitedUnits.reduce((sum, u) => sum + u.count, 0);
  const totalStats = getHeroStatsWithArtifacts();

  return (
    <div
      id="toolbar-army"
      style={{
        backgroundColor: '#1a1a2e',
        border: `2px solid ${BORDER_COLOR}`,
        borderRadius: 4,
        padding: 8,
      }}
    >
      {/* Header */}
      <div
        style={{
          color: '#666',
          fontSize: '10px',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        Hero
      </div>

      {/* Hero Portrait */}
      <HeroPortrait name={heroData.name} onClick={() => setShowHeroModal(true)} />

      {/* Separator */}
      <div
        style={{
          height: 1,
          backgroundColor: '#333',
          margin: '8px 0',
        }}
      />

      {/* Army Label */}
      <div
        style={{
          color: '#666',
          fontSize: '10px',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        Army
      </div>

      {/* Unit Grid */}
      {recruitedUnits.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {recruitedUnits.map((unit) => (
            <UnitSlot
              key={unit.type}
              unitType={unit.type}
              count={unit.count}
              onClick={() => setSelectedUnit({ type: unit.type, count: unit.count })}
            />
          ))}
        </div>
      ) : (
        <div style={{ color: '#555', fontSize: '11px', fontStyle: 'italic' }}>
          No units recruited
        </div>
      )}

      {/* Unit Detail Modal */}
      {selectedUnit && (
        <UnitDetailModal
          unitType={selectedUnit.type}
          count={selectedUnit.count}
          onClose={() => setSelectedUnit(null)}
        />
      )}

      {/* Hero Detail Modal */}
      {showHeroModal && (
        <HeroDetailModal
          heroData={heroData}
          totalStats={totalStats}
          artifacts={artifacts}
          onClose={() => setShowHeroModal(false)}
        />
      )}
    </div>
  );
};

export default ArmyDisplay;
