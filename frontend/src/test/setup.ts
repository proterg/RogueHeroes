/**
 * Test Setup
 * ----------
 * Configures the test environment for Vitest.
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Phaser for tests
globalThis.Phaser = {
  AUTO: 0,
  Scale: {
    RESIZE: 0,
    CENTER_BOTH: 0,
  },
  Game: class MockGame {
    scene = {
      getScene: () => null,
      isActive: () => false,
      stop: () => {},
      start: () => {},
    };
    events = {
      on: () => {},
      off: () => {},
    };
    destroy = () => {};
  },
} as unknown as typeof Phaser;

// Mock fetch
globalThis.fetch = vi.fn();
