/**
 * Battlefield Editor Entry Point
 * ------------------------------
 * Bootstraps the battlefield terrain editor React application.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import BattlefieldEditorApp from './BattlefieldEditorApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BattlefieldEditorApp />
  </React.StrictMode>
);
