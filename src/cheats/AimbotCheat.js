/**
 * Ring Zero - Aimbot.dll (Userland / Ring 3)
 * Predictive target acquisition, vector lead calculations, and angle snap interpolation.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { Vec2, normalizeAngle, angleDiff } from '../core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class AimbotCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.AIMBOT);

    this.currentTarget = null;
    this.targetLeadPos = new Vec2();
    this.currentLockedAngle = 0;
    this.hasTarget = false;
    this.autoShootTimer = 0;
  }

  /**
   * Evaluates if Aimbot should automatically fire at the locked target
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
      const mult = this.level === 1 ? 1.2 : this.level === 2 ? 1.0 : 0.85;
      const interval = weapon ? weapon.fireInterval * mult : 0.25;
      this.autoShootTimer = interval;
      return true;
    }
    return false;
  }

  /**
   * Snaps or lerps aim angle towards the optimal target in FOV
   * @param {number} rawAimAngle
   * @param {Vec2} aimVector
   * @param {Object} context - { player, spatialGrid, enemies, dt, weapon }
   * @returns {number}
   */
  onAimInput(rawAimAngle, aimVector, context) {
    const { player, spatialGrid, dt = 0.016, weapon } = context;
    if (!player || !spatialGrid) return rawAimAngle;

    // FOV Cone & Range scale with cheat rank
    const fovHalfAngle = (45 + this.level * 25) * (Math.PI / 180);
    const maxRange = 400 + this.level * 180;
    const bulletSpeed = weapon?.speed || 1200;

    // Query enemies in spatial grid
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

      // Must be within player's FOV cone
      if (diff <= fovHalfAngle) {
        // Predictive lead: t = distance / bulletSpeed
        const tLead = dist / bulletSpeed;
        const lx = enemy.x + enemy.vx * tLead;
        const ly = enemy.y + enemy.vy * tLead;

        // Weight by angle diff + distance
        const score = diff * 0.7 + (dist / maxRange) * 0.3;
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

      // Dead-center precision lock onto target
      this.currentLockedAngle = desiredAngle;
      return desiredAngle;
    }

    this.currentLockedAngle = rawAimAngle;
    return rawAimAngle;
  }

  /**
   * Renders lock-on telemetry: laser link line, targeting box, and lead crosshair
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
    // 1. Vector targeting beam from player to target
    VectorRenderer.strokeLine(ctx, player.x, player.y, target.x, target.y, COLOR.CYAN, 1);

    // 2. Lock-on brackets around enemy
    VectorRenderer.drawTargetBracket(ctx, target.x, target.y, target.radius * 2.8, COLOR.CYAN);

    // 3. Predictive lead reticle
    VectorRenderer.drawCrosshair(ctx, lead.x, lead.y, 4, COLOR.WHITE);
    VectorRenderer.strokeLine(ctx, target.x, target.y, lead.x, lead.y, COLOR.CYAN_MUTED, 1);

    // Telemetry label
    ctx.font = '9px monospace';
    ctx.fillStyle = COLOR.CYAN;
    ctx.textAlign = 'center';
    ctx.fillText(`AIMBOT//LOCKED [Lv.${this.level}]`, target.x, target.y - target.radius - 12);

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = this.hasTarget ? COLOR.CYAN : COLOR.CYAN_MUTED;
    ctx.fillText(`[AIMBOT.DLL Lv.${this.level}] ${this.hasTarget ? 'TARGET_LOCKED' : 'SCANNING'}`, x, y);
    ctx.restore();
  }
}
