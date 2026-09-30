/**
 * Ring Zero - Radar Telemetry Exploit (Ring 2 Driver Space)
 * Renders a military-spec circular tactical radar HUD displaying all security daemons,
 * weapon crates, and explosive hazard cells in world coordinates.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';

export class RadarTelemetryCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.RADARTELEMETRY);
    this.sweepAngle = 0;
  }

  onPlayerUpdate(player, dt, context) {
    if (!this.enabled) return;
    this.sweepAngle = (this.sweepAngle + dt * 4.0) % (Math.PI * 2);
  }

  /**
   * Renders mini-radar overlay in screen space
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {Object} [context]
   */
  renderRadar(ctx, screenW, screenH, player, enemies, drops, props) {
    if (!this.enabled || !player) return;

    ctx.save();

    const radarRadius = 55;
    const radarX = screenW - radarRadius - 25;
    const radarY = radarRadius + 75;
    const radarRange = 1400; // World pixels mapped to radar radius

    // Radar border and background
    ctx.beginPath();
    ctx.arc(radarX, radarY, radarRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(7, 10, 15, 0.75)';
    ctx.fill();
    ctx.strokeStyle = COLOR.AMBER;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Concentric range rings
    ctx.beginPath();
    ctx.arc(radarX, radarY, radarRadius * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 176, 0, 0.25)';
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(radarX - radarRadius, radarY);
    ctx.lineTo(radarX + radarRadius, radarY);
    ctx.moveTo(radarX, radarY - radarRadius);
    ctx.lineTo(radarX, radarY + radarRadius);
    ctx.stroke();

    // Sweeping beam
    const sx = radarX + Math.cos(this.sweepAngle) * radarRadius;
    const sy = radarY + Math.sin(this.sweepAngle) * radarRadius;
    ctx.beginPath();
    ctx.moveTo(radarX, radarY);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = 'rgba(255, 176, 0, 0.6)';
    ctx.stroke();

    // Center player blip
    ctx.fillStyle = COLOR.CYAN;
    ctx.fillRect(radarX - 2, radarY - 2, 4, 4);

    // Render enemies
    if (enemies) {
      for (const enemy of enemies) {
        if (!enemy.active || enemy.markedForRemoval) continue;
        const dx = (enemy.x - player.x) * (radarRadius / radarRange);
        const dy = (enemy.y - player.y) * (radarRadius / radarRange);
        if (dx * dx + dy * dy <= radarRadius * radarRadius) {
          ctx.fillStyle = COLOR.RED;
          ctx.fillRect(radarX + dx - 1.5, radarY + dy - 1.5, 3, 3);
        }
      }
    }

    // Render drops / crates
    if (drops) {
      for (const drop of drops) {
        if (!drop.active || drop.markedForRemoval) continue;
        const dx = (drop.x - player.x) * (radarRadius / radarRange);
        const dy = (drop.y - player.y) * (radarRadius / radarRange);
        if (dx * dx + dy * dy <= radarRadius * radarRadius) {
          ctx.fillStyle = drop.type === 'WEAPON' ? COLOR.AMBER : COLOR.CYAN;
          ctx.fillRect(radarX + dx - 1, radarY + dy - 1, 2, 2);
        }
      }
    }

    // Label
    ctx.font = '9px monospace';
    ctx.fillStyle = COLOR.AMBER;
    ctx.textAlign = 'center';
    ctx.fillText('RADAR.ini', radarX, radarY + radarRadius + 12);

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.AMBER;
    ctx.fillText(`[INI] RADAR_TELEMETRY.ini :: RANK ${this.level}/3 [ACTIVE]`, x, y);
  }
}
