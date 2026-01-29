/**
 * InteractionModal Component
 * --------------------------
 * Modal wrapper for overworld interactions.
 * Displays at 50% of game container size, centered with backdrop.
 * Blocks game input while active.
 */

import React from 'react';
import { InteractionTrigger } from '../../types/interaction';
import { TownInteraction } from './interactions/TownInteraction';

interface InteractionModalProps {
  interaction: InteractionTrigger;
  onClose: () => void;
  gameWidth: number;
  gameHeight: number;
}

export const InteractionModal: React.FC<InteractionModalProps> = ({
  interaction,
  onClose,
  gameWidth,
  gameHeight,
}) => {
  // Modal is 50% of game container size
  const modalWidth = gameWidth * 0.5;
  const modalHeight = gameHeight * 0.5;

  // Render content based on interaction type
  const renderContent = () => {
    switch (interaction.type) {
      case 'town':
        return (
          <TownInteraction
            interaction={interaction}
            onClose={onClose}
          />
        );
      case 'shrine':
        return (
          <div style={{ padding: 20, color: '#fff' }}>
            <h2>Shrine</h2>
            <p>Shrine interactions coming soon...</p>
            <button onClick={onClose}>Close</button>
          </div>
        );
      case 'chest':
        return (
          <div style={{ padding: 20, color: '#fff' }}>
            <h2>Chest</h2>
            <p>Chest interactions coming soon...</p>
            <button onClick={onClose}>Close</button>
          </div>
        );
      case 'npc':
        return (
          <div style={{ padding: 20, color: '#fff' }}>
            <h2>NPC</h2>
            <p>NPC interactions coming soon...</p>
            <button onClick={onClose}>Close</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop - blocks clicks to game */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          pointerEvents: 'auto',
          zIndex: 100,
        }}
        onClick={onClose}
      />

      {/* Modal container - centered */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: modalWidth,
          height: modalHeight,
          minWidth: 400,
          minHeight: 300,
          backgroundColor: '#1a1a2e',
          border: '2px solid #4a4a6a',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'auto',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
      </div>
    </>
  );
};
