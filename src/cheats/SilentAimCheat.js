/**
 * Ring Zero - SilentAim.vmp (Kernel Execution / Ring 0)
 * Reality exploit curving bullet trajectory angles directly toward enemy hitboxes without moving the player chassis.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { angleDiff, normalizeAngle } from '../core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';

export class SilentAimCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.SILENTAIM);
    this.redirectedCount = 0;
  }

  /**
   * Silently curves outgoing bullet angles toward the closest vulnerable enemy
   * @param {Object} bulletParams
   * @param {Object} context - { player, spatialGrid }
   * @param {function(Object): void} spawnCallback
   */
  onWeaponFire(bulletParams, context, spawnCallback) {
    const { player, spatialGrid } = context;

    if (player && spatialGrid) {
      // Cone and search radius scale with rank
      const maxAngleTolerance = (35 + this.level * 20) * (Math.PI / 180);
      const searchRadius = 550 + this.level * 150;

      const candidates = spatialGrid.queryRadius(
        player.x,
        player.y,
        searchRadius,
        COLLISION_LAYER.ENEMY
      );

      let bestEnemy = null;
      let minAngularDiff = Infinity;

      for (const enemy of candidates) {
        if (!enemy.active || enemy.markedForRemoval) continue;

        const dx = enemy.x - bulletParams.x;
        const dy = enemy.y - bulletParams.y;
        const angleToEnemy = Math.atan2(dy, dx);
        const diff = Math.abs(angleDiff(bulletParams.angle, angleToEnemy));

        if (diff < maxAngleTolerance && diff < minAngularDiff) {
          minAngularDiff = diff;
          bestEnemy = enemy;
        }
      }

      if (bestEnemy) {
        // Compute redirected angle toward enemy
        const dx = bestEnemy.x - bulletParams.x;
        const dy = bestEnemy.y - bulletParams.y;
        const redirectedAngle = Math.atan2(dy, dx);

        bulletParams.angle = redirectedAngle;
        bulletParams.isCritical = true; // Silent aim guarantees critical vector strike
        bulletParams.color = COLOR.RED;
        this.redirectedCount++;
      }
    }

    spawnCallback(bulletParams);
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.RED;
    ctx.fillText(
      `[SILENTAIM.VMP Lv.${this.level}] KERNEL_CURVATURE (${this.redirectedCount} CURVED)`,
      x,
      y
    );
    ctx.restore();
  }
}
