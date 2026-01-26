/**
 * MainMenu Component Tests
 * ------------------------
 * Tests for the main menu component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainMenu } from '../../src/components/ui/MainMenu';

describe('MainMenu', () => {
  it('renders the game title', () => {
    render(<MainMenu onStartGame={() => {}} />);

    expect(screen.getByText('RogueHeroes')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<MainMenu onStartGame={() => {}} />);

    expect(screen.getByText('A Roguelike RPG Adventure')).toBeInTheDocument();
  });

  it('renders the New Game button', () => {
    render(<MainMenu onStartGame={() => {}} />);

    expect(screen.getByText('New Game')).toBeInTheDocument();
  });

  it('calls onStartGame when New Game is clicked', () => {
    const handleStartGame = vi.fn();
    render(<MainMenu onStartGame={handleStartGame} />);

    fireEvent.click(screen.getByText('New Game'));

    expect(handleStartGame).toHaveBeenCalledTimes(1);
  });

  it('renders disabled Continue button', () => {
    render(<MainMenu onStartGame={() => {}} />);

    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();
  });

  it('renders disabled Settings button', () => {
    render(<MainMenu onStartGame={() => {}} />);

    const settingsButton = screen.getByText('Settings');
    expect(settingsButton).toBeDisabled();
  });
});
