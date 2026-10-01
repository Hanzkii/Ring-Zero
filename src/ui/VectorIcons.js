/**
 * Ring Zero - Procedural Vector Iconography System
 * Standalone procedural vector icon renderer for the 16 runtime exploits and system telemetry.
 * Zero external assets: all icons are purely synthesized via 2D Canvas vector paths.
 */

import { COLOR } from '../core/Constants.js';

export class VectorIcons {
  /**
   * Draws a procedural vector icon directly into a Canvas2D context
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} iconId - Exploit identifier (e.g. 'aimbot', 'silentaim', 'noclip')
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} size - Outer bounding dimension (width/height)
   * @param {string} [color=COLOR.CYAN] - Primary stroke color
   */
  static draw(ctx, iconId, cx, cy, size = 32, color = COLOR.CYAN) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const r = size * 0.42;

    switch (iconId?.toLowerCase()) {
      case 'aimbot':
        this._drawAimbot(ctx, r, color);
        break;

      case 'silentaim':
        this._drawSilentAim(ctx, r, color);
        break;

      case 'triggerbot':
        this._drawTriggerbot(ctx, r, color);
        break;

      case 'wallhack':
      case 'esp':
        this._drawWallhack(ctx, r, color);
        break;

      case 'spinbot':
        this._drawSpinbot(ctx, r, color);
        break;

      case 'overclock_dash':
      case 'overclockdash':
        this._drawOverclockDash(ctx, r, color);
        break;

      case 'doubletap':
        this._drawDoubleTap(ctx, r, color);
        break;

      case 'backtrack':
        this._drawBacktrack(ctx, r, color);
        break;

      case 'speedhack':
        this._drawSpeedhack(ctx, r, color);
        break;

      case 'packetchoke':
        this._drawPacketChoke(ctx, r, color);
        break;

      case 'radartelemetry':
        this._drawRadarTelemetry(ctx, r, color);
        break;

      case 'penetrationbucker':
        this._drawPenetrationBucker(ctx, r, color);
        break;

      case 'rapidfire':
        this._drawRapidFire(ctx, r, color);
        break;

      case 'noclip':
        this._drawNoclip(ctx, r, color);
        break;

      case 'lagswitch':
        this._drawLagswitch(ctx, r, color);
        break;

      case 'kernelpanic':
        this._drawKernelPanic(ctx, r, color);
        break;

      default:
        this._drawDefaultChip(ctx, r, color);
        break;
    }

    ctx.restore();
  }

  /**
   * Generates a pre-rendered HTMLCanvasElement containing the vector icon
   * @param {string} iconId
   * @param {number} size
   * @param {string} color
   * @returns {HTMLCanvasElement}
   */
  static renderToCanvas(iconId, size = 36, color = COLOR.CYAN) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.draw(ctx, iconId, size * 0.5, size * 0.5, size, color);
    }
    return canvas;
  }

  /**
   * Generates an inline Data URL (PNG) representing the vector icon
   * @param {string} iconId
   * @param {number} size
   * @param {string} color
   * @returns {string} Base64 Data URL
   */
  static renderToDataURL(iconId, size = 36, color = COLOR.CYAN) {
    const canvas = this.renderToCanvas(iconId, size, color);
    return canvas ? canvas.toDataURL('image/png') : '';
  }

  // --- INDIVIDUAL VECTOR ICON PATH SYNTHESIZERS ---

  /** Precision aiming crosshair with targeting brackets & lead pip */
  static _drawAimbot(ctx, r, color) {
    // Outer circle
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair ticks
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(0, -r * 0.4);
    ctx.moveTo(0, r * 1.1);
    ctx.lineTo(0, r * 0.4);
    ctx.moveTo(-r * 1.1, 0);
    ctx.lineTo(-r * 0.4, 0);
    ctx.moveTo(r * 1.1, 0);
    ctx.lineTo(r * 0.4, 0);
    ctx.stroke();

    // Center lock pip
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Predictive lead pip
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.4, r * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** Curved ballistic trajectory vector leading into target center */
  static _drawSilentAim(ctx, r, color) {
    // Target center circle
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // Target center pip
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.35, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Curved trajectory path
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.8);
    ctx.quadraticCurveTo(-r * 0.6, -r * 0.5, r * 0.35, -r * 0.35);
    ctx.stroke();

    // Angular trajectory ripple lines
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.3);
    ctx.lineTo(-r * 0.3, r * 0.4);
    ctx.moveTo(-r * 0.4, -r * 0.1);
    ctx.lineTo(0, 0);
    ctx.stroke();
  }

  /** Triggerbot: reticle ray intersecting an enemy node with trigger spark */
  static _drawTriggerbot(ctx, r, color) {
    // Primary crosshair ray
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(r * 0.9, 0);
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, r * 0.9);
    ctx.stroke();

    // Intersecting target diamond
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5);
    ctx.lineTo(r * 0.5, 0);
    ctx.lineTo(0, r * 0.5);
    ctx.lineTo(-r * 0.5, 0);
    ctx.closePath();
    ctx.stroke();

    // Instant trigger spark ticks
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.3);
    ctx.lineTo(-r * 0.5, -r * 0.5);
    ctx.moveTo(r * 0.3, -r * 0.3);
    ctx.lineTo(r * 0.5, -r * 0.5);
    ctx.moveTo(-r * 0.3, r * 0.3);
    ctx.lineTo(-r * 0.5, r * 0.5);
    ctx.moveTo(r * 0.3, r * 0.3);
    ctx.lineTo(r * 0.5, r * 0.5);
    ctx.stroke();
  }

  /** Wallhack / ESP: Digital eye scan with bounding telemetry brackets */
  static _drawWallhack(ctx, r, color) {
    // Telemetry bounding box brackets
    const b = r * 0.85;
    const l = r * 0.3;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(-b, -b + l); ctx.lineTo(-b, -b); ctx.lineTo(-b + l, -b);
    // Top-right
    ctx.moveTo(b - l, -b); ctx.lineTo(b, -b); ctx.lineTo(b, -b + l);
    // Bottom-right
    ctx.moveTo(b, b - l); ctx.lineTo(b, b); ctx.lineTo(b - l, b);
    // Bottom-left
    ctx.moveTo(-b + l, b); ctx.lineTo(-b, b); ctx.lineTo(-b, b - l);
    ctx.stroke();

    // Digital cyber-eye outline
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.quadraticCurveTo(0, -r * 0.5, r * 0.7, 0);
    ctx.quadraticCurveTo(0, r * 0.5, -r * 0.7, 0);
    ctx.stroke();

    // Inner scanning pupil
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Spinbot: Multi-axis gyroscopic anti-aim rings with rotation arrows */
  static _drawSpinbot(ctx, r, color) {
    // Outer gyro ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    // Tilted inner ellipse
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r * 0.35, Math.PI * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    // Dynamic rotation arrow pips
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.1);
    ctx.lineTo(r * 0.9, -r * 0.35);
    ctx.lineTo(r * 0.65, -r * 0.25);

    ctx.moveTo(-r * 0.85, r * 0.1);
    ctx.lineTo(-r * 0.9, r * 0.35);
    ctx.lineTo(-r * 0.65, r * 0.25);
    ctx.stroke();

    // Core pivot
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Overclocked Dash: Dual forward kinetic chevrons & capacitor impulse */
  static _drawOverclockDash(ctx, r, color) {
    // Forward primary chevron
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.85);
    ctx.lineTo(r * 0.4, 0);
    ctx.lineTo(-r * 0.6, r * 0.85);
    ctx.lineTo(-r * 0.2, 0);
    ctx.closePath();
    ctx.stroke();

    // Second smaller forward chevron
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.55);
    ctx.lineTo(-r * 0.25, 0);
    ctx.lineTo(-r * 0.95, r * 0.55);
    ctx.lineTo(-r * 0.65, 0);
    ctx.closePath();
    ctx.stroke();

    // Lightning impulse accent
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.4);
    ctx.lineTo(r * 0.85, -r * 0.1);
    ctx.lineTo(r * 0.55, 0);
    ctx.lineTo(r * 0.95, r * 0.4);
    ctx.stroke();
  }

  /** DoubleTap: Dual multiplexed duplicate bullet packets */
  static _drawDoubleTap(ctx, r, color) {
    // Bullet 1 (Upper right)
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.5);
    ctx.lineTo(r * 0.1, -r * 0.7);
    ctx.lineTo(-r * 0.3, -r * 0.5);
    ctx.lineTo(r * 0.1, -r * 0.3);
    ctx.closePath();
    ctx.stroke();

    // Bullet 2 (Lower left)
    ctx.beginPath();
    ctx.moveTo(0.3, r * 0.2);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.7, r * 0.2);
    ctx.lineTo(-r * 0.3, r * 0.4);
    ctx.closePath();
    ctx.stroke();

    // Multiplexing data link line
    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    ctx.moveTo(-r * 0.3, -r * 0.5);
    ctx.lineTo(0.3, r * 0.2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Burst rays
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.5);
    ctx.lineTo(r * 0.95, -r * 0.5);
    ctx.moveTo(r * 0.35, r * 0.2);
    ctx.lineTo(r * 0.55, r * 0.2);
    ctx.stroke();
  }

  /** Backtrack: Historical circular buffer & spacetime rewind clock */
  static _drawBacktrack(ctx, r, color) {
    // Clock/buffer dial
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 1.7);
    ctx.stroke();

    // Rewind counter-clockwise arrow
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.85);
    ctx.lineTo(r * 0.15, -r * 0.65);
    ctx.moveTo(-r * 0.1, -r * 0.85);
    ctx.lineTo(r * 0.15, -r * 1.05);
    ctx.stroke();

    // Ghost trail tick marks
    ctx.beginPath();
    ctx.arc(-r * 0.2, r * 0.2, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.2, -r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.stroke();

    // Center pivot
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Speedhack: Overclocked tachometer / gauge needle */
  static _drawSpeedhack(ctx, r, color) {
    // Gauge arc
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.8, Math.PI * 0.8, Math.PI * 2.2);
    ctx.stroke();

    // Overclock ticks
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * 0.8 + (i / 6) * Math.PI * 1.4;
      const x1 = Math.cos(a) * r * 0.8;
      const y1 = r * 0.2 + Math.sin(a) * r * 0.8;
      const x2 = Math.cos(a) * r * 0.62;
      const y2 = r * 0.2 + Math.sin(a) * r * 0.62;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Gauge needle peaking at max
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.lineTo(Math.cos(Math.PI * 1.95) * r * 0.72, r * 0.2 + Math.sin(Math.PI * 1.95) * r * 0.72);
    ctx.stroke();

    // Center spindle
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Packet Choke: Dropped/severed network node cluster */
  static _drawPacketChoke(ctx, r, color) {
    // Central node
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Satellite nodes
    const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
    for (const a of angles) {
      const nx = Math.cos(a) * r * 0.75;
      const ny = Math.sin(a) * r * 0.75;

      ctx.beginPath();
      ctx.arc(nx, ny, r * 0.18, 0, Math.PI * 2);
      ctx.stroke();

      // Severed packet connection lines (dashed / broken)
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(0, 0);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Packet drop 'X'
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.4);
    ctx.lineTo(-r * 0.15, -r * 0.15);
    ctx.moveTo(-r * 0.15, -r * 0.4);
    ctx.lineTo(-r * 0.4, -r * 0.15);
    ctx.stroke();
  }

  /** Radar Telemetry: Sweeping radar dish with angular vector wedge */
  static _drawRadarTelemetry(ctx, r, color) {
    // Outer radar ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    // Inner distance ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Radar crosshairs
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(r * 0.9, 0);
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, r * 0.9);
    ctx.stroke();

    // Sweep vector wedge
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.9 * Math.cos(-Math.PI * 0.25), r * 0.9 * Math.sin(-Math.PI * 0.25));
    ctx.stroke();

    // Detected target blip
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.55, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Penetration Bucker: Heavy penetrator slug shattering a barrier plate */
  static _drawPenetrationBucker(ctx, r, color) {
    // Barrier line (thick plate)
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, r * 0.9);
    ctx.stroke();

    // Penetrator slug passing straight through barrier
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(r * 0.8, 0);
    ctx.stroke();

    // Penetrator dart head
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.35);
    ctx.lineTo(r * 0.9, 0);
    ctx.lineTo(r * 0.5, r * 0.35);
    ctx.closePath();
    ctx.stroke();

    // Shattered barrier fragments
    ctx.beginPath();
    ctx.moveTo(r * 0.15, -r * 0.5);
    ctx.lineTo(r * 0.35, -r * 0.65);
    ctx.moveTo(r * 0.15, r * 0.45);
    ctx.lineTo(r * 0.4, r * 0.55);
    ctx.stroke();
  }

  /** Rapid Fire: Triple bullet cycling along motion trails */
  static _drawRapidFire(ctx, r, color) {
    const offsets = [-r * 0.5, 0, r * 0.5];
    for (const dy of offsets) {
      // Bullet dart
      ctx.beginPath();
      ctx.moveTo(r * 0.3, dy - r * 0.15);
      ctx.lineTo(r * 0.8, dy);
      ctx.lineTo(r * 0.3, dy + r * 0.15);
      ctx.closePath();
      ctx.stroke();

      // Velocity trail
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, dy);
      ctx.lineTo(r * 0.1, dy);
      ctx.stroke();
    }
  }

  /** Noclip: Geometric entity phasing through a static wall barrier */
  static _drawNoclip(ctx, r, color) {
    // Portal / barrier border
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, r * 0.9);
    ctx.stroke();

    // Phasing cube / hull (left half solid, right half dashed ghost)
    ctx.beginPath();
    ctx.rect(-r * 0.6, -r * 0.5, r * 0.6, r);
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    ctx.rect(0, -r * 0.5, r * 0.6, r);
    ctx.stroke();
    ctx.setLineDash([]);

    // Quantum phase wave ripples
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
  }

  /** Lagswitch: Temporal hourglass / frozen spacetime crystal */
  static _drawLagswitch(ctx, r, color) {
    // Hourglass wireframe
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.85);
    ctx.lineTo(r * 0.7, -r * 0.85);
    ctx.lineTo(-r * 0.7, r * 0.85);
    ctx.lineTo(r * 0.7, r * 0.85);
    ctx.closePath();
    ctx.stroke();

    // Top and bottom cap lines
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.85);
    ctx.lineTo(r * 0.85, -r * 0.85);
    ctx.moveTo(-r * 0.85, r * 0.85);
    ctx.lineTo(r * 0.85, r * 0.85);
    ctx.stroke();

    // Freeze pulse crystal at waist
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Kernel Panic: Radiation hazard / biohazard ring */
  static _drawKernelPanic(ctx, r, color) {
    // Central kernel circle
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // 3 hazard blades
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI * 0.5;
      const a1 = a - Math.PI * 0.22;
      const a2 = a + Math.PI * 0.22;

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, a1, a2);
      ctx.arc(0, 0, r * 0.45, a2, a1, true);
      ctx.closePath();
      ctx.stroke();
    }
  }

  /** Default Hexagonal Core Chip */
  static _drawDefaultChip(ctx, r, color) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * r * 0.85;
      const py = Math.sin(a) * r * 0.85;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}
