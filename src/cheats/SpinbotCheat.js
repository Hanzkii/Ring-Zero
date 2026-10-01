/**
 * Ring Zero - Spinbot.asi (Anti-Aim - Driver Space / Ring 2)
 * Rapid player angle desynchronization causing incoming damage checks to glance and miss.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class SpinbotCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.SPINBOT);

    this.spinAngle = 0;
    this.evasionTriggeredTimer = 0;
    this.evasionCount = 0;
  }

  reset() {
    this.spinAngle = 0;
    this.evasionTriggeredTimer = 0;
    this.evasionCount = 0;
  }

  teardown() {
    this.reset();
  }

  /**
   * Rapidly rotates anti-aim visual angle
   * @param {import('../entities/Player.js').Player} player
   * @param {number} dt
   */
  onPlayerUpdate(player, dt) {
    // 1440 deg/s at Lv 1, 2160 deg/s at Lv 2, 2880 deg/s at Lv 3
    const spinRate = (1440 + (this.level - 1) * 720) * (Math.PI / 180);
    this.spinAngle = (this.spinAngle + spinRate * dt) % (Math.PI * 2);
    if (player) {
      player.visualRotationOffset = this.spinAngle;
    }

    if (this.evasionTriggeredTimer > 0) {
      this.evasionTriggeredTimer = Math.max(0, this.evasionTriggeredTimer - dt);
    }
  }

  /**
   * Anti-Aim Evasion: Rolls desync glance check against incoming damage
   * @param {number} incomingDamage
   * @param {Object} context
   * @returns {{ damage: number, evaded: boolean }}
   */
  onTakeDamage(incomingDamage, context) {
    // 25% glance chance at Lv 1, 40% at Lv 2, 55% at Lv 3
    const glanceChance = 0.25 + (this.level - 1) * 0.15;

    if (Math.random() < glanceChance) {
      this.evasionTriggeredTimer = 0.25;
      this.evasionCount++;
      return { damage: 0, evaded: true };
    }

    return { damage: incomingDamage, evaded: false };
  }

  /**
   * Renders coordinate desync telemetry & glitch vectors on evasion
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context
   */
  onRenderWorld(ctx, alpha, context) {
    const { player } = context;
    if (!player) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    // 1. Draw rapidly spinning desync wireframe ring
    const ringRadius = player.radius + 6;
    ctx.strokeStyle = this.evasionTriggeredTimer > 0 ? COLOR.GREEN : COLOR.AMBER;
    ctx.lineWidth = 1;
    ctx.rotate(this.spinAngle);

    // Multi-axis anti-aim indicator
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.moveTo(-ringRadius - 4, 0);
    ctx.lineTo(ringRadius + 4, 0);
    ctx.moveTo(0, -ringRadius - 4);
    ctx.lineTo(0, ringRadius + 4);
    ctx.stroke();

    // 2. Glitch slice effect on successful evasion
    if (this.evasionTriggeredTimer > 0) {
      ctx.strokeStyle = COLOR.GREEN;
      ctx.lineWidth = 2;
      const sliceW = 28;
      ctx.strokeRect(-sliceW * 0.5, -4, sliceW, 8);

      ctx.font = '9px monospace';
      ctx.fillStyle = COLOR.GREEN;
      ctx.textAlign = 'center';
      ctx.fillText('ANTI-AIM//DESYNC_EVADED', 0, -player.radius - 16);
    }

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.AMBER;
    ctx.fillText(
      `[SPINBOT.ASI Lv.${this.level}] DESYNC_ACTIVE (${this.evasionCount} EVADED)`,
      x,
      y
    );
    ctx.restore();
  }
}
