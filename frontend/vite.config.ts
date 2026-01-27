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

  let port = 3001;
  let openPath: string | false = false;

  if (isEditorMode) {
    port = 5174;
    openPath = '/editor.html';
  } else if (isOverworldMode) {
    port = 5175;
    openPath = '/overworld.html';
  }

  return {
    plugins: [react()],
    server: {
      port,
      open: openPath,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
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
