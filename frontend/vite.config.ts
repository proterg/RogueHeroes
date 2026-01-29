/**
 * Vite Configuration
 * ------------------
 * Build configuration for the frontend.
 * Includes React plugin and test setup.
 * Supports multi-page build for main game and map editor.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Different modes run on different ports
  const isEditorMode = mode === 'editor';
  const isOverworldMode = mode === 'overworld';
  const isBattlefieldEditorMode = mode === 'battlefield-editor';

  let port = 3002;
  let openPath: string | false = false;

  if (isEditorMode) {
    port = 5174;
    openPath = '/editor.html';
  } else if (isOverworldMode) {
    port = 5175;
    openPath = '/overworld.html';
  } else if (isBattlefieldEditorMode) {
    port = 5176;
    openPath = '/battlefield-editor.html';
  }

  // Use separate cache directories to avoid conflicts between instances
  const cacheDir = isEditorMode
    ? 'node_modules/.vite-editor'
    : isOverworldMode
      ? 'node_modules/.vite-overworld'
      : isBattlefieldEditorMode
        ? 'node_modules/.vite-battlefield-editor'
        : 'node_modules/.vite-combat';

  return {
    plugins: [react()],
    cacheDir,
    server: {
      port,
      open: openPath,
      proxy: {
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          editor: resolve(__dirname, 'editor.html'),
          overworld: resolve(__dirname, 'overworld.html'),
          'battlefield-editor': resolve(__dirname, 'battlefield-editor.html'),
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
