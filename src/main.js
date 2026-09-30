/**
 * Ring Zero - Main Entry Point
 * Bootstraps game application and handles user gesture initialization.
 */

import { GameApp } from './core/GameApp.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const terminalOverlay = document.getElementById('terminal-overlay');
  const initButton = document.getElementById('btn-init-kernel');

  if (!canvas) {
    console.error('Ring Zero: Canvas element #game-canvas not found.');
    return;
  }

  const app = new GameApp(canvas);

  const startKernelSession = () => {
    if (terminalOverlay) {
      terminalOverlay.classList.add('terminal-hidden');
      setTimeout(() => {
        terminalOverlay.style.display = 'none';
      }, 500);
    }
    app.start();
  };

  if (initButton) {
    initButton.addEventListener('click', startKernelSession);
  }

  // Keyboard shortcut to initialize
  window.addEventListener('keydown', function onInitKey(e) {
    if (e.code === 'Enter' || e.code === 'Space') {
      if (terminalOverlay && !terminalOverlay.classList.contains('terminal-hidden')) {
        window.removeEventListener('keydown', onInitKey);
        startKernelSession();
      }
    }
  });

  // Expose app on window for developer console debugging
  window.RingZeroApp = app;
});
