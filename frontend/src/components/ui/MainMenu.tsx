/**
 * MainMenu Component
 * ------------------
 * Main menu screen with game title and start options.
 */

import React from 'react';

interface MainMenuProps {
  onStartGame: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>RogueHeroes</h1>
        <p style={styles.subtitle}>A Roguelike RPG Adventure</p>

        <div style={styles.buttons}>
          <button style={styles.button} onClick={onStartGame}>
            New Game
          </button>
          <button style={{ ...styles.button, ...styles.buttonDisabled }} disabled>
            Continue
          </button>
          <button style={{ ...styles.button, ...styles.buttonDisabled }} disabled>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  content: {
    textAlign: 'center',
  },
  title: {
    fontSize: '4rem',
    fontWeight: 'bold',
    color: '#e94560',
    textShadow: '0 0 20px rgba(233, 69, 96, 0.5)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.5rem',
    color: '#888',
    marginBottom: '3rem',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'center',
  },
  button: {
    padding: '1rem 3rem',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#fff',
    background: 'linear-gradient(135deg, #e94560 0%, #c73659 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    minWidth: '200px',
  },
  buttonDisabled: {
    background: '#333',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
};
