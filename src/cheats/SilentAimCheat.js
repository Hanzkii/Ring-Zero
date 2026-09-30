/**
 * Ring Zero - SilentAim.vmp (Kernel Execution / Ring 0)
 * Reality exploit curving bullet trajectory angles directly toward enemy hitboxes.
 * Functions as an advanced autonomous aimbot with auto-lock, triggerbot auto-firing,
 * and guaranteed critical strikes with crimson vector telemetry.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { Vec2, angleDiff, normalizeAngle } from '../core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class SilentAimCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.SILENTAIM);

    this.currentTarget = null;
    this.targetLeadPos = new Vec2();
    this.currentLockedAngle = 0;
    this.hasTarget = false;
    this.autoShootTimer = 0;
    this.redirectedCount = 0;
  }

  /**
   * Autonomous triggerbot: Periodically auto-shoots locked targets
   * @param {number} dt
   * @param {Object} weapon
   * @returns {boolean}
   */
  shouldAutoShoot(dt, weapon) {
    if (!this.hasTarget || !this.currentTarget || this.currentTarget.markedForRemoval) {
      return false;
    }

    this.autoShootTimer -= dt;
    if (this.autoShootTimer <= 0) {
      // Hyper-speed cadence scaling with rank (faster than standard Aimbot)
      const mult = this.level === 1 ? 1.0 : this.level === 2 ? 0.85 : 0.7;
      const interval = weapon ? weapon.fireInterval * mult : 0.2;
      this.autoShootTimer = interval;
      return true;
    }
    return false;
  }

  /**
   * Predictive target acquisition and angle lock
   * @param {number} rawAimAngle
   * @param {Vec2} aimVector
   * @param {Object} context - { player, spatialGrid, enemies, dt, weapon }
   * @returns {number}
   */
  onAimInput(rawAimAngle, aimVector, context) {
    const { player, spatialGrid, dt = 0.016, weapon } = context;
    if (!player || !spatialGrid) return rawAimAngle;

    // FOV cone & acquisition range scale with rank:
    // Rank 1: 45° half-angle (90° cone), 550px range
    // Rank 2: 70° half-angle (140° cone), 700px range
    // Rank 3: Full 360° omnidirectional lock, 850px range
    const fovHalfAngle = this.level === 3 ? Math.PI : (45 + this.level * 25) * (Math.PI / 180);
    const maxRange = 550 + this.level * 150;
    const bulletSpeed = weapon?.speed || 1200;

    const candidates = spatialGrid.queryRadius(
      player.x,
      player.y,
      maxRange,
      COLLISION_LAYER.ENEMY
    );

    let bestTarget = null;
    let bestScore = Infinity;
    const leadPos = new Vec2();

    for (const enemy of candidates) {
      if (!enemy.active || enemy.markedForRemoval) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      const diff = Math.abs(angleDiff(rawAimAngle, angleToEnemy));

      if (diff <= fovHalfAngle) {
        // Predictive lead calculation: t = distance / bulletSpeed
        const tLead = dist / bulletSpeed;
        const lx = enemy.x + (enemy.vx || 0) * tLead;
        const ly = enemy.y + (enemy.vy || 0) * tLead;

        // Weight by angular diff and distance
        const score = diff * 0.6 + (dist / maxRange) * 0.4;
        if (score < bestScore) {
          bestScore = score;
          bestTarget = enemy;
          leadPos.set(lx, ly);
        }
      }
    }

    this.currentTarget = bestTarget;
    this.hasTarget = bestTarget !== null;

    if (bestTarget) {
      this.targetLeadPos.copy(leadPos);
      const desiredAngle = Math.atan2(leadPos.y - player.y, leadPos.x - player.x);
      this.currentLockedAngle = desiredAngle;
      return desiredAngle;
    }

    this.currentLockedAngle = rawAimAngle;
    return rawAimAngle;
  }

  /**
   * Curves outgoing bullet angles directly toward target hitboxes with guaranteed critical strikes
   * @param {Object} bulletParams
   * @param {Object} context - { player, spatialGrid }
   * @param {function(Object): void} spawnCallback
   */
  onWeaponFire(bulletParams, context, spawnCallback) {
    const { player, spatialGrid } = context;

    let target =
      this.hasTarget && this.currentTarget && !this.currentTarget.markedForRemoval
        ? this.currentTarget
        : null;

    if (!target && player && spatialGrid) {
      const maxAngleTolerance = this.level === 3 ? Math.PI : (35 + this.level * 25) * (Math.PI / 180);
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
      target = bestEnemy;
    }

    if (target) {
      const dx = target.x - bulletParams.x;
      const dy = target.y - bulletParams.y;
      const redirectedAngle = Math.atan2(dy, dx);

      bulletParams.angle = redirectedAngle;
      bulletParams.isCritical = true; // Kernel Silent Aim guarantees critical strike
      bulletParams.color = COLOR.RED;
      this.redirectedCount++;
    }

    spawnCallback(bulletParams);
  }

  /**
   * Renders lock-on telemetry in world space: crimson laser link, targeting brackets, and lead reticle
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context
   */
  onRenderWorld(ctx, alpha, context) {
    if (!this.hasTarget || !this.currentTarget || this.currentTarget.markedForRemoval) return;

    const { player } = context;
    const target = this.currentTarget;
    const lead = this.targetLeadPos;

    ctx.save();
    // 1. Vector laser beam from player to target lead position
    VectorRenderer.strokeLine(ctx, player.x, player.y, lead.x, lead.y, COLOR.RED, 1.5);

    // 2. Lock-on brackets around target
    VectorRenderer.drawTargetBracket(ctx, target.x, target.y, target.radius * 2.8, COLOR.RED);

    // 3. Predictive lead reticle
    VectorRenderer.drawCrosshair(ctx, lead.x, lead.y, 5, COLOR.WHITE);
    VectorRenderer.strokeLine(ctx, target.x, target.y, lead.x, lead.y, COLOR.RED_DIM, 1);

    // Telemetry label
    ctx.font = '9px monospace';
    ctx.fillStyle = COLOR.RED;
    ctx.textAlign = 'center';
    ctx.fillText(`SILENTAIM//KERNEL_LOCK [Lv.${this.level}]`, target.x, target.y - target.radius - 12);

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = this.hasTarget ? COLOR.RED : COLOR.RED_DIM;
    ctx.fillText(
      `[SILENTAIM.VMP Lv.${this.level}] ${this.hasTarget ? 'KERNEL_LOCKED' : 'SCANNING'} (${this.redirectedCount} CURVED)`,
      x,
      y
    );
    ctx.restore();
  }
}
