/**
 * TownInteraction Component
 * -------------------------
 * UI for town/castle interactions.
 * Features a Tavern with AI NPCs and a Recruit tab for hiring units.
 *
 * NPCs are loaded from the map configuration via the NPC registry,
 * allowing different towns to have different NPCs.
 */

import React, { useState, useMemo } from 'react';
import { InteractionTrigger, TownData, RecruitableUnit } from '../../../types/interaction';
import { useInteractionStore } from '../../../stores';
import { NpcCharacter } from '../../../types/npcCharacter';
import { NpcCharacterInteraction } from './NpcCharacterInteraction';
import { getTavernNpcsByLocationId } from '../../../game/data/InteractionData';

interface TownInteractionProps {
  interaction: InteractionTrigger;
  onClose: () => void;
}

type Tab = 'tavern' | 'recruit';

/** Tavern NPCs with their greetings */
interface TavernNpc {
  character: NpcCharacter;
  greeting: string;
}

export const TownInteraction: React.FC<TownInteractionProps> = ({
  interaction,
  onClose,
}) => {
  const townData = interaction.data as TownData;
  const [activeTab, setActiveTab] = useState<Tab>('tavern');
  const [recruitCounts, setRecruitCounts] = useState<Record<string, number>>({});
  const [chattingWith, setChattingWith] = useState<TavernNpc | null>(null);
  const { gold, spendGold, recruitUnit, tavernBanned, banFromTavern, addArtifact } = useInteractionStore();

  // Load tavern NPCs from map config via registry
  const tavernNpcs = useMemo<TavernNpc[]>(() => {
    if (!interaction.mapId || !interaction.locationId) {
      return [];
    }
    const npcs = getTavernNpcsByLocationId(interaction.mapId, interaction.locationId);
    return npcs.map(npc => ({
      character: npc,
      greeting: npc.speechPatterns.greeting[0],
    }));
  }, [interaction.mapId, interaction.locationId]);

  // Check if tavern has any NPCs
  const hasTavern = tavernNpcs.length > 0;

  // Handle being kicked out by Marta
  const handleKickOut = () => {
    banFromTavern();
  };

  // Handle receiving a reward from an NPC (like Seraphina's book)
  const handleReward = (reward: { type: string; name: string; description: string; artifactId?: string }) => {
    console.log('Received reward:', reward);
    if (reward.artifactId) {
      addArtifact(reward.artifactId);
    }
  };

  const handleRecruitChange = (unitType: string, delta: number, maxCount: number) => {
    setRecruitCounts(prev => {
      const current = prev[unitType] ?? 0;
      const newCount = Math.max(0, Math.min(maxCount, current + delta));
      return { ...prev, [unitType]: newCount };
    });
  };

  const calculateRecruitCost = (): number => {
    return townData.availableUnits.reduce((total, unit) => {
      const count = recruitCounts[unit.type] ?? 0;
      return total + (count * unit.cost);
    }, 0);
  };

  const handleRecruit = () => {
    const totalCost = calculateRecruitCost();
    if (totalCost > gold) return;

    if (spendGold(totalCost)) {
      // Add recruited units
      for (const unit of townData.availableUnits) {
        const count = recruitCounts[unit.type] ?? 0;
        if (count > 0) {
          recruitUnit(unit.type, count);
        }
      }
      // Reset counts and close
      setRecruitCounts({});
      onClose();
    }
  };

  const totalRecruitCost = calculateRecruitCost();
  const canAffordRecruit = gold >= totalRecruitCost && totalRecruitCost > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #4a4a6a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#e94560', fontSize: '20px' }}>
            {townData.name}
          </h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '12px' }}>
            {townData.description}
          </p>
        </div>
        <div style={{ color: '#ffd700', fontSize: '16px', fontWeight: 'bold' }}>
          Gold: {gold}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #4a4a6a',
        }}
      >
        {hasTavern && (
          <TabButton
            label="Tavern"
            active={activeTab === 'tavern'}
            onClick={() => { setActiveTab('tavern'); setChattingWith(null); }}
          />
        )}
        <TabButton
          label="Recruit"
          active={activeTab === 'recruit' || !hasTavern}
          onClick={() => setActiveTab('recruit')}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: activeTab === 'tavern' && chattingWith ? '0' : '16px 20px' }}>
        {activeTab === 'tavern' && hasTavern ? (
          tavernBanned ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#888',
              textAlign: 'center',
              padding: 20,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
              <div style={{ fontSize: 16, color: '#ff6b6b', marginBottom: 8 }}>
                You have been banned from this tavern.
              </div>
              <div style={{ fontSize: 13, fontStyle: 'italic' }}>
                Marta made it very clear you are not welcome here.
              </div>
            </div>
          ) : chattingWith ? (
            <NpcCharacterInteraction
              npc={chattingWith.character}
              greeting={chattingWith.greeting}
              onClose={() => setChattingWith(null)}
              onKickOut={handleKickOut}
              onReward={handleReward}
            />
          ) : (
            <TavernTab
              npcs={tavernNpcs}
              onTalkTo={(npc) => setChattingWith(npc)}
            />
          )
        ) : (
          <RecruitTab
            units={townData.availableUnits}
            counts={recruitCounts}
            gold={gold}
            onCountChange={handleRecruitChange}
          />
        )}
      </div>

      {/* Footer */}
      {!(activeTab === 'tavern' && chattingWith) && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #4a4a6a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {activeTab === 'recruit' ? (
            <>
              <div style={{ color: totalRecruitCost > gold ? '#ff4444' : '#ffd700' }}>
                Total Cost: {totalRecruitCost} gold
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <ActionButton label="Cancel" onClick={onClose} variant="secondary" />
                <ActionButton
                  label="Recruit"
                  onClick={handleRecruit}
                  disabled={!canAffordRecruit}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
              <ActionButton label="Leave Town" onClick={onClose} variant="secondary" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: '12px 16px',
      border: 'none',
      background: active ? '#2a2a4e' : 'transparent',
      color: active ? '#e94560' : '#888',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: active ? 'bold' : 'normal',
      transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

interface TavernTabProps {
  npcs: TavernNpc[];
  onTalkTo: (npc: TavernNpc) => void;
}

const TavernTab: React.FC<TavernTabProps> = ({ npcs, onTalkTo }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ color: '#888', fontSize: '13px', marginBottom: 8, fontStyle: 'italic' }}>
      The tavern is warm and filled with the smell of ale and roasting meat. A few patrons sit scattered about...
    </div>
    {npcs.map((npc) => (
      <div
        key={npc.character.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          backgroundColor: '#2a2a4e',
          borderRadius: 4,
          border: '1px solid #3a3a6a',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ color: '#e0e0e0', fontSize: '15px', fontWeight: 'bold' }}>
            {npc.character.background.name}
          </div>
          <div style={{ color: '#888', fontSize: '12px', marginTop: 4 }}>
            {npc.character.background.occupation}
          </div>
        </div>
        <ActionButton
          label="Talk"
          onClick={() => onTalkTo(npc)}
          variant="primary"
        />
      </div>
    ))}
  </div>
);

interface RecruitTabProps {
  units: RecruitableUnit[];
  counts: Record<string, number>;
  gold: number;
  onCountChange: (unitType: string, delta: number, maxCount: number) => void;
}

const RecruitTab: React.FC<RecruitTabProps> = ({ units, counts, gold, onCountChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {units.map((unit) => {
      const count = counts[unit.type] ?? 0;
      const canAfford = gold >= unit.cost;

      return (
        <div
          key={unit.type}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#2a2a4e',
            borderRadius: 4,
            opacity: canAfford || count > 0 ? 1 : 0.6,
          }}
        >
          <div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
              {unit.name}
            </div>
            <div style={{ color: '#ffd700', fontSize: '12px' }}>
              {unit.cost} gold each
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CounterButton
              label="-"
              onClick={() => onCountChange(unit.type, -1, unit.maxCount)}
              disabled={count <= 0}
            />
            <span style={{ color: '#fff', minWidth: 24, textAlign: 'center' }}>
              {count}
            </span>
            <CounterButton
              label="+"
              onClick={() => onCountChange(unit.type, 1, unit.maxCount)}
              disabled={count >= unit.maxCount || !canAfford}
            />
            <span style={{ color: '#666', fontSize: '11px', marginLeft: 8 }}>
              (max {unit.maxCount})
            </span>
          </div>
        </div>
      );
    })}
  </div>
);

interface CounterButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const CounterButton: React.FC<CounterButtonProps> = ({ label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: 28,
      height: 28,
      border: '1px solid #4a4a6a',
      borderRadius: 4,
      backgroundColor: disabled ? '#1a1a2e' : '#3a3a5e',
      color: disabled ? '#555' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
    }}
  >
    {label}
  </button>
);

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  disabled,
  variant = 'primary',
}) => {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 20px',
        border: isPrimary ? 'none' : '1px solid #4a4a6a',
        borderRadius: 4,
        backgroundColor: disabled
          ? '#333'
          : isPrimary
            ? '#e94560'
            : 'transparent',
        color: disabled ? '#666' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: isPrimary ? 'bold' : 'normal',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
};
