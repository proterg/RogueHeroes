/**
 * Overworld Entry Point
 * ---------------------
 * Bootstraps the overworld React application.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import OverworldApp from './OverworldApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OverworldApp />
  </React.StrictMode>
);
