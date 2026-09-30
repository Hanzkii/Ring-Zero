/**
 * Ring Zero - Triggerbot Exploit (Ring 3 Userland)
 * Pulls the trigger autonomously with zero reaction delay whenever the crosshair intersects an enemy.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';
import { Vec2 } from '../core/VectorMath.js';

export class TriggerbotCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.TRIGGERBOT);
    this.targetInCrosshair = false;
    this.fireTimer = 0;
  }

  /**
   * Checks if an enemy is in line with the player's crosshair ray
   * @param {number} aimAngle
   * @param {Vec2} aimVector
   * @param {Object} context
   * @returns {number}
   */
  onAimInput(aimAngle, aimVector, context) {
    if (!this.enabled) {
      this.targetInCrosshair = false;
      return aimAngle;
    }

    const { player, enemies } = context;
    if (!player || !enemies) return aimAngle;

    const maxDist = 700;
    const rayDir = new Vec2(Math.cos(aimAngle), Math.sin(aimAngle));
    let hitFound = false;

    // Tolerance cone depends on rank:
    // Rank 1: tight ray tolerance (18px)
    // Rank 2: expanded tolerance (28px)
    // Rank 3: generous snap tolerance (40px)
    const tolerance = 14 + this.level * 10;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.active || enemy.markedForRemoval) continue;

      const toEnemy = new Vec2(enemy.x - player.x, enemy.y - player.y);
      const dist = toEnemy.length();
      if (dist > maxDist || dist < 1) continue;

      // Project onto ray
      const proj = toEnemy.dot(rayDir);
      if (proj <= 0) continue; // Behind player

      const perpDist = Math.sqrt(Math.max(0, dist * dist - proj * proj));
      if (perpDist <= enemy.radius + tolerance) {
        hitFound = true;
        break;
      }
    }

    this.targetInCrosshair = hitFound;
    return aimAngle;
  }

  shouldAutoShoot() {
    return this.enabled && this.targetInCrosshair;
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = this.targetInCrosshair ? COLOR.RED : COLOR.CYAN;
    const status = this.targetInCrosshair ? 'LOCKED [TRIGGERBOT]' : 'MONITORING';
    ctx.fillText(`[CS] TRIGGERBOT.cs :: RANK ${this.level}/3 [${status}]`, x, y);
  }
}
