/**
 * Ring Zero - Main Entry Point
 * Bootstraps game application and handles user gesture initialization.
 */

import { GameApp } from './core/GameApp.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');

  if (!canvas) {
    console.error('Ring Zero: Canvas element #game-canvas not found.');
    return;
  }

  const app = new GameApp(canvas);

  // Expose app on window for developer console debugging & inspection
  window.RingZeroApp = app;
});
