/**
 * Ring Zero - Fixed Timestep Game Loop
 * Decouples deterministic 60Hz physics simulation from variable display refresh rates.
 */

import { SIMULATION } from './Constants.js';

export class GameLoop {
  /**
   * @param {Object} options
   * @param {function(number): void} options.onUpdate - Callback invoked for fixed-step updates (fixedDt in seconds)
   * @param {function(number): void} options.onRender - Callback invoked per animation frame (alpha in [0, 1])
   */
  constructor({ onUpdate, onRender }) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;

    this.fixedDt = SIMULATION.FIXED_DT;
    this.maxFrameTime = SIMULATION.MAX_FRAME_TIME;

    this.isRunning = false;
    this.isPaused = false;
    this.rafId = null;

    this.lastTime = 0;
    this.accumulator = 0;

    // Real-time telemetry metrics
    this.fps = 0;
    this.tps = 0;
    this.frameTimeMs = 0;
    this._frameCount = 0;
    this._tickCount = 0;
    this._lastMetricTime = 0;

    this._step = this._step.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this._lastMetricTime = this.lastTime;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this._step);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (!this.isRunning) {
      this.start();
      return;
    }
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  _step(timestamp) {
    if (!this.isRunning) return;

    const frameStart = performance.now();
    let frameDelta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Guard against accumulator explosion (e.g. background tab or long suspension)
    if (frameDelta > this.maxFrameTime) {
      frameDelta = this.maxFrameTime;
    }

    if (!this.isPaused) {
      this.accumulator += frameDelta;

      // Consume fixed simulation ticks
      while (this.accumulator >= this.fixedDt) {
        this.onUpdate(this.fixedDt);
        this.accumulator -= this.fixedDt;
        this._tickCount++;
      }
    }

    // Alpha interpolation factor for smooth rendering
    const alpha = this.isPaused ? 1.0 : this.accumulator / this.fixedDt;
    this.onRender(alpha);
    this._frameCount++;

    // Compute FPS & TPS once per second
    if (timestamp - this._lastMetricTime >= 1000) {
      this.fps = this._frameCount;
      this.tps = this._tickCount;
      this._frameCount = 0;
      this._tickCount = 0;
      this._lastMetricTime = timestamp;
    }

    this.frameTimeMs = performance.now() - frameStart;
    this.rafId = requestAnimationFrame(this._step);
  }
}
