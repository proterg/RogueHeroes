/**
 * Map Editor Entry Point
 * ----------------------
 * Bootstraps the map editor React application.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import MapEditorApp from './MapEditorApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MapEditorApp />
  </React.StrictMode>
);
