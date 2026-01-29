/**
 * SkirmishDeploymentUI Component
 * ------------------------------
 * React overlay for Skirmish battle deployment phases.
 * Shows unit selection, deployment count, and confirm button.
 * Communicates with CombatScene via Phaser events.
 */

import React, { useState, useEffect, useCallback } from 'react';

/** Deployment state emitted by CombatScene */
interface DeploymentState {
  isDeploying: boolean;
  phase: number;           // 1-indexed (1, 2, 3)
  maxUnits: number;
  unitsDeployed: number;
  selectedUnitType: string;
  availableUnits: Record<string, number>;
}

interface SkirmishDeploymentUIProps {
  game: Phaser.Game | null;
}

/** Unit display info */
const UNIT_INFO: Record<string, { name: string; icon: string }> = {
  soldier: { name: 'Soldier', icon: '⚔️' },
  archer: { name: 'Archer', icon: '🏹' },
  lancer: { name: 'Lancer', icon: '🐴' },
};

export const SkirmishDeploymentUI: React.FC<SkirmishDeploymentUIProps> = ({ game }) => {
  const [deploymentState, setDeploymentState] = useState<DeploymentState>({
    isDeploying: true,
    phase: 1,
    maxUnits: 3,
    unitsDeployed: 0,
    selectedUnitType: 'soldier',
    availableUnits: { soldier: 10, archer: 10, lancer: 1 },
  });
  const [turnNumber, setTurnNumber] = useState(0);

  // Subscribe to CombatScene events
  useEffect(() => {
    if (!game) return;

    const scene = game.scene.getScene('CombatScene') as Phaser.Scene | null;
    if (!scene) return;

    const handleDeploymentState = (state: DeploymentState) => {
      setDeploymentState(state);
    };

    const handleUnitDeployed = (data: { unitType: string; remaining: number; unitsDeployed: number }) => {
      setDeploymentState(prev => ({
        ...prev,
        unitsDeployed: data.unitsDeployed,
        availableUnits: {
          ...prev.availableUnits,
          [data.unitType]: data.remaining,
        },
      }));
    };

    // Listen for events from CombatScene
    scene.events.on('deployment-state', handleDeploymentState);
    scene.events.on('unit-deployed', handleUnitDeployed);

    // Track turn number from combat loop
    const originalUpdate = scene.update?.bind(scene);
    if (originalUpdate) {
      // We'll track this via a custom event instead
    }

    return () => {
      scene.events.off('deployment-state', handleDeploymentState);
      scene.events.off('unit-deployed', handleUnitDeployed);
    };
  }, [game]);

  const handleSelectUnit = useCallback((unitType: string) => {
    if (!game) return;
    const scene = game.scene.getScene('CombatScene') as Phaser.Scene | null;
    if (scene) {
      scene.events.emit('select-unit-type', unitType);
    }
  }, [game]);

  const handleConfirmDeployment = useCallback(() => {
    if (!game) return;
    const scene = game.scene.getScene('CombatScene') as Phaser.Scene | null;
    if (scene) {
      scene.events.emit('confirm-deployment');
    }
  }, [game]);

  // Don't render if not deploying
  if (!deploymentState.isDeploying) {
    return null;
  }

  const canDeployMore = deploymentState.unitsDeployed < deploymentState.maxUnits;
  const hasAnyUnits = Object.values(deploymentState.availableUnits).some(count => count > 0);

  return (
    <div style={styles.overlay}>
      {/* Deployment Panel */}
      <div style={styles.deploymentPanel}>
        <div style={styles.phaseHeader}>
          PHASE {deploymentState.phase} - Deploy up to {deploymentState.maxUnits} units
        </div>

        <div style={styles.unitButtons}>
          {Object.entries(UNIT_INFO).map(([type, info]) => {
            const count = deploymentState.availableUnits[type] ?? 0;
            const isSelected = deploymentState.selectedUnitType === type;
            const isDisabled = count <= 0;

            return (
              <button
                key={type}
                style={{
                  ...styles.unitButton,
                  ...(isSelected ? styles.unitButtonSelected : {}),
                  ...(isDisabled ? styles.unitButtonDisabled : {}),
                }}
                onClick={() => !isDisabled && handleSelectUnit(type)}
                disabled={isDisabled}
              >
                <span style={styles.unitIcon}>{info.icon}</span>
                <span style={styles.unitName}>{info.name}</span>
                <span style={styles.unitCount}>x{count}</span>
              </button>
            );
          })}
        </div>

        <div style={styles.deploymentInfo}>
          <span>Selected: {UNIT_INFO[deploymentState.selectedUnitType]?.name ?? 'None'}</span>
          <span style={styles.deployCount}>
            Deployed: {deploymentState.unitsDeployed}/{deploymentState.maxUnits}
          </span>
        </div>

        <div style={styles.instructions}>
          Click on the green tiles (columns 0-1) to place units
        </div>

        <button
          style={{
            ...styles.confirmButton,
            ...(deploymentState.unitsDeployed === 0 ? styles.confirmButtonDisabled : {}),
          }}
          onClick={handleConfirmDeployment}
          disabled={deploymentState.unitsDeployed === 0}
        >
          Confirm Deployment ({deploymentState.unitsDeployed}/{deploymentState.maxUnits})
        </button>
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: '20px',
  },
  deploymentPanel: {
    background: 'rgba(0, 0, 0, 0.85)',
    border: '2px solid #4caf50',
    borderRadius: '8px',
    padding: '16px 24px',
    pointerEvents: 'auto',
    minWidth: '400px',
    maxWidth: '500px',
  },
  phaseHeader: {
    color: '#4caf50',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  unitButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  unitButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid #555',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '80px',
  },
  unitButtonSelected: {
    background: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4caf50',
  },
  unitButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  unitIcon: {
    fontSize: '1.5rem',
    marginBottom: '4px',
  },
  unitName: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  unitCount: {
    color: '#aaa',
    fontSize: '0.75rem',
    marginTop: '2px',
  },
  deploymentInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#fff',
    fontSize: '0.9rem',
    marginBottom: '8px',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
  },
  deployCount: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  instructions: {
    color: '#888',
    fontSize: '0.8rem',
    textAlign: 'center',
    marginBottom: '12px',
    fontStyle: 'italic',
  },
  confirmButton: {
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#fff',
    background: '#4caf50',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  confirmButtonDisabled: {
    background: '#555',
    cursor: 'not-allowed',
  },
};
