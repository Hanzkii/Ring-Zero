/**
 * Ring Zero - Real-time Diagnostic Telemetry Overlay
 * Renders high-precision FPS, TPS, and frametime diagnostics in a discreet cyberpunk chip.
 */

import { COLOR } from '../core/Constants.js';

export class TelemetryOverlay {
  constructor() {
    this.smoothedFrametime = 16.6;
  }

  /**
   * Returns color rating based on framerate threshold
   * Green >= 58, Amber 45-57, Red < 45
   * @param {number} fps
   * @returns {string}
   */
  static getFpsColor(fps) {
    if (fps >= 58) return COLOR.GREEN;
    if (fps >= 45) return COLOR.AMBER;
    return COLOR.RED;
  }

  /**
   * Returns color rating for tick rate (targeting 60 TPS)
   * @param {number} tps
   * @returns {string}
   */
  static getTpsColor(tps) {
    if (tps >= 58) return COLOR.CYAN;
    if (tps >= 45) return COLOR.AMBER;
    return COLOR.RED;
  }

  /**
   * Renders the telemetry chip into the top-right corner of the canvas viewport
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} viewportWidth
   * @param {number} viewportHeight
   * @param {import('../core/GameLoop.js').GameLoop} loop
   */
  render(ctx, viewportWidth, viewportHeight, loop) {
    if (!loop) return;

    const fps = Math.round(loop.fps || 0);
    const tps = Math.round(loop.tps || 0);

    // Smooth frametime calculation to avoid high-frequency visual jitter
    const rawFt = loop.frameTimeMs > 0 ? loop.frameTimeMs : (fps > 0 ? 1000 / fps : 16.6);
    this.smoothedFrametime = this.smoothedFrametime * 0.85 + rawFt * 0.15;
    const frametimeStr = `${this.smoothedFrametime.toFixed(1)} ms`;

    const fpsColor = TelemetryOverlay.getFpsColor(fps);
    const tpsColor = TelemetryOverlay.getTpsColor(tps);

    ctx.save();

    const pillW = 250;
    const pillH = 26;
    const x = viewportWidth - pillW - 16;
    const y = 16;
    const r = 4;

    // 1. Dark glassmorphism pill background & cyber border
    ctx.fillStyle = 'rgba(4, 10, 20, 0.75)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + pillW - r, y);
    ctx.arcTo(x + pillW, y, x + pillW, y + r, r);
    ctx.lineTo(x + pillW, y + pillH - r);
    ctx.arcTo(x + pillW, y + pillH, x + pillW - r, y + pillH, r);
    ctx.lineTo(x + r, y + pillH);
    ctx.arcTo(x, y + pillH, x, y + pillH - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. High-tech cyan corner accent notch
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillRect(x + 3, y + 3, 6, 1.5);

    // 3. Monospace font configuration
    ctx.font = "10px 'Courier New', monospace";
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const centerY = y + pillH * 0.5 + 0.5;

    // [ PERF ] Header badge
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillText('[ PERF ]', x + 10, centerY);

    // Divider 1
    const div1X = x + 62;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.fillText('│', div1X, centerY);

    // FPS Metric
    ctx.fillStyle = fpsColor;
    ctx.fillText(`${fps} FPS`, div1X + 10, centerY);

    // Divider 2
    const div2X = div1X + 62;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.fillText('│', div2X, centerY);

    // TPS Metric
    ctx.fillStyle = tpsColor;
    ctx.fillText(`${tps} TPS`, div2X + 10, centerY);

    // Divider 3
    const div3X = div2X + 58;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.fillText('│', div3X, centerY);

    // Frametime Metric
    ctx.fillStyle = COLOR.WHITE_DIM;
    ctx.fillText(frametimeStr, div3X + 10, centerY);

    ctx.restore();
  }
}
