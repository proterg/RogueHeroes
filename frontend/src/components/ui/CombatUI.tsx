/**
 * CombatUI Component
 * ------------------
 * React overlay for combat screen.
 * Displays unit info, action buttons, and combat log.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getCombatState, runTick } from '../../api/combat';
import { CombatState, UnitData } from '../../types/combat';

interface CombatUIProps {
  combatId: string;
  onCombatEnd: () => void;
}

export const CombatUI: React.FC<CombatUIProps> = ({ combatId, onCombatEnd }) => {
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Fetch initial state
  useEffect(() => {
    getCombatState(combatId)
      .then(setCombatState)
      .catch(console.error);
  }, [combatId]);

  // Auto-play tick loop
  useEffect(() => {
    if (!isAutoPlaying || !combatState || combatState.status !== 'active') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const newState = await runTick(combatId);
        setCombatState(newState);

        if (newState.status !== 'active') {
          setIsAutoPlaying(false);
        }
      } catch (error) {
        console.error('Tick failed:', error);
        setIsAutoPlaying(false);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isAutoPlaying, combatId, combatState?.status]);

  const handleRunTick = useCallback(async () => {
    try {
      const newState = await runTick(combatId);
      setCombatState(newState);
    } catch (error) {
      console.error('Tick failed:', error);
    }
  }, [combatId]);

  const handleEndCombat = useCallback(() => {
    setIsAutoPlaying(false);
    onCombatEnd();
  }, [onCombatEnd]);

  if (!combatState) {
    return <div style={styles.loading}>Loading combat...</div>;
  }

  const playerUnits = combatState.units.filter((u) => u.is_player);
  const enemyUnits = combatState.units.filter((u) => !u.is_player);

  return (
    <div style={styles.overlay}>
      {/* Top bar - Combat info */}
      <div style={styles.topBar}>
        <span>Tick: {combatState.tick}</span>
        <span style={styles.status}>
          {combatState.status === 'active'
            ? 'Combat Active'
            : combatState.status === 'player_won'
            ? 'Victory!'
            : 'Defeat'}
        </span>
      </div>

      {/* Left panel - Player units */}
      <div style={styles.leftPanel}>
        <h3 style={styles.panelTitle}>Your Army</h3>
        {playerUnits.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            selected={selectedUnit?.id === unit.id}
            onClick={() => setSelectedUnit(unit)}
          />
        ))}
      </div>

      {/* Right panel - Enemy units */}
      <div style={styles.rightPanel}>
        <h3 style={styles.panelTitle}>Enemy Forces</h3>
        {enemyUnits.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            selected={selectedUnit?.id === unit.id}
            onClick={() => setSelectedUnit(unit)}
          />
        ))}
      </div>

      {/* Bottom bar - Actions */}
      <div style={styles.bottomBar}>
        <button
          style={styles.button}
          onClick={handleRunTick}
          disabled={combatState.status !== 'active' || isAutoPlaying}
        >
          Step
        </button>
        <button
          style={{
            ...styles.button,
            ...(isAutoPlaying ? styles.buttonActive : {}),
          }}
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          disabled={combatState.status !== 'active'}
        >
          {isAutoPlaying ? 'Pause' : 'Auto'}
        </button>
        <button style={styles.button} onClick={handleEndCombat}>
          {combatState.status === 'active' ? 'Retreat' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

interface UnitCardProps {
  unit: UnitData;
  selected: boolean;
  onClick: () => void;
}

const UnitCard: React.FC<UnitCardProps> = ({ unit, selected, onClick }) => {
  const hpPercent = (unit.hp / unit.max_hp) * 100;
  const isDead = unit.hp <= 0;

  return (
    <div
      style={{
        ...styles.unitCard,
        ...(selected ? styles.unitCardSelected : {}),
        ...(isDead ? styles.unitCardDead : {}),
      }}
      onClick={onClick}
    >
      <div style={styles.unitName}>{unit.name}</div>
      <div style={styles.unitType}>{unit.type}</div>
      <div style={styles.healthBar}>
        <div
          style={{
            ...styles.healthFill,
            width: `${hpPercent}%`,
            backgroundColor: hpPercent > 30 ? '#4caf50' : '#f44336',
          }}
        />
      </div>
      <div style={styles.unitStats}>
        HP: {unit.hp}/{unit.max_hp} | ATK: {unit.attack} | DEF: {unit.defense}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
    fontSize: '1.5rem',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '1rem',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
    display: 'flex',
    justifyContent: 'space-between',
    color: '#fff',
    fontSize: '1.25rem',
    pointerEvents: 'auto',
  },
  status: {
    fontWeight: 'bold',
  },
  leftPanel: {
    position: 'absolute',
    left: 0,
    top: '60px',
    bottom: '80px',
    width: '200px',
    padding: '1rem',
    background: 'rgba(0,0,0,0.7)',
    overflowY: 'auto',
    pointerEvents: 'auto',
  },
  rightPanel: {
    position: 'absolute',
    right: 0,
    top: '60px',
    bottom: '80px',
    width: '200px',
    padding: '1rem',
    background: 'rgba(0,0,0,0.7)',
    overflowY: 'auto',
    pointerEvents: 'auto',
  },
  panelTitle: {
    color: '#fff',
    marginBottom: '0.5rem',
    fontSize: '1rem',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '1rem',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    pointerEvents: 'auto',
  },
  button: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#fff',
    background: '#e94560',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonActive: {
    background: '#4caf50',
  },
  unitCard: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    padding: '0.5rem',
    marginBottom: '0.5rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  unitCardSelected: {
    background: 'rgba(233, 69, 96, 0.3)',
    border: '1px solid #e94560',
  },
  unitCardDead: {
    opacity: 0.5,
  },
  unitName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  unitType: {
    color: '#888',
    fontSize: '0.75rem',
    textTransform: 'capitalize',
  },
  healthBar: {
    height: '4px',
    background: '#333',
    borderRadius: '2px',
    marginTop: '0.25rem',
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  unitStats: {
    color: '#aaa',
    fontSize: '0.7rem',
    marginTop: '0.25rem',
  },
};
