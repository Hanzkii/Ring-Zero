/**
 * Ring Zero - SilentAim.vmp (Kernel Execution / Ring 0)
 * Reality exploit curving bullet trajectory angles directly toward enemy hitboxes.
 * Functions as an advanced autonomous aimbot with auto-lock, triggerbot auto-firing,
 * backtrack ghost targeting, and rich vector visualization.
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
    this.isBacktrackTarget = false;
    this.autoShootTimer = 0;
    this.redirectedCount = 0;
  }

  /**
   * Autonomous triggerbot: Periodically auto-shoots locked targets.
   * Only fires when an enemy or backtrack tick is actively targeted and shootable.
   * @param {number} dt
   * @param {Object} weapon
   * @returns {boolean}
   */
  shouldAutoShoot(dt, weapon) {
    if (!this.hasTarget || !this.currentTarget || this.currentTarget.markedForRemoval) {
      this.autoShootTimer = 0;
      return false;
    }

    if (weapon && (weapon.isReloading || weapon.currentAmmo <= 0)) {
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
   * Predictive target acquisition and angle lock (supports enemy bodies and backtrack ghost ticks)
   * @param {number} rawAimAngle
   * @param {Vec2} aimVector
   * @param {Object} context - { player, spatialGrid, enemies, dt, weapon, raycaster, wallSegments, hasWallhack, backtrackCheat }
   * @returns {number}
   */
  onAimInput(rawAimAngle, aimVector, context) {
    const {
      player,
      spatialGrid,
      dt = 0.016,
      weapon,
      raycaster,
      wallSegments = [],
      hasWallhack = false,
      backtrackCheat = null,
    } = context;

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
    const bestTargetPos = new Vec2();
    let isBacktrack = false;

    for (const enemy of candidates) {
      if (!enemy.active || enemy.markedForRemoval) continue;

      // 1. Direct enemy body targeting
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= 10 && dist <= maxRange) {
        const angleToEnemy = Math.atan2(dy, dx);
        const diff = Math.abs(angleDiff(rawAimAngle, angleToEnemy));

        if (diff <= fovHalfAngle) {
          const hasDirectLOS =
            hasWallhack ||
            !raycaster ||
            raycaster.hasLineOfSight(player.x, player.y, enemy.x, enemy.y, wallSegments);

          if (hasDirectLOS) {
            const tLead = dist / bulletSpeed;
            const lx = enemy.x + (enemy.vx || 0) * tLead;
            const ly = enemy.y + (enemy.vy || 0) * tLead;

            const score = diff * 0.6 + (dist / maxRange) * 0.4;
            if (score < bestScore) {
              bestScore = score;
              bestTarget = enemy;
              bestTargetPos.set(lx, ly);
              isBacktrack = false;
            }
          }
        }
      }

      // 2. Backtrack ghost tick targeting
      if (backtrackCheat && backtrackCheat.historyMap) {
        const history = backtrackCheat.historyMap.get(enemy.id);
        if (history && history.length >= 3) {
          const step = Math.max(1, Math.floor(history.length / 5));
          for (let i = 0; i < history.length - 1; i += step) {
            const snap = history[i];
            const gdx = snap.x - player.x;
            const gdy = snap.y - player.y;
            const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
            if (gDist < 10 || gDist > maxRange) continue;

            const gAngle = Math.atan2(gdy, gdx);
            const gDiff = Math.abs(angleDiff(rawAimAngle, gAngle));

            if (gDiff <= fovHalfAngle) {
              const hasGhostLOS =
                hasWallhack ||
                !raycaster ||
                raycaster.hasLineOfSight(player.x, player.y, snap.x, snap.y, wallSegments);

              if (hasGhostLOS) {
                // Prioritize backtrack ghost ticks when close or with great line of sight
                const gScore = gDiff * 0.55 + (gDist / maxRange) * 0.35;
                if (gScore < bestScore) {
                  bestScore = gScore;
                  bestTarget = enemy;
                  bestTargetPos.set(snap.x, snap.y);
                  isBacktrack = true;
                }
              }
            }
          }
        }
      }
    }

    this.currentTarget = bestTarget;
    this.hasTarget = bestTarget !== null;
    this.isBacktrackTarget = isBacktrack;

    if (bestTarget) {
      this.targetLeadPos.copy(bestTargetPos);
      const desiredAngle = Math.atan2(bestTargetPos.y - player.y, bestTargetPos.x - player.x);
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

    if (target) {
      const dx = this.targetLeadPos.x - bulletParams.x;
      const dy = this.targetLeadPos.y - bulletParams.y;
      const redirectedAngle = Math.atan2(dy, dx);

      bulletParams.angle = redirectedAngle;
      bulletParams.isCritical = true; // Kernel Silent Aim guarantees critical strike
      bulletParams.color = this.isBacktrackTarget ? COLOR.AMBER : COLOR.RED;
      this.redirectedCount++;
    } else if (player && spatialGrid) {
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

      if (bestEnemy) {
        const dx = bestEnemy.x - bulletParams.x;
        const dy = bestEnemy.y - bulletParams.y;
        const redirectedAngle = Math.atan2(dy, dx);

        bulletParams.angle = redirectedAngle;
        bulletParams.isCritical = true;
        bulletParams.color = COLOR.RED;
        this.redirectedCount++;
      }
    }

    spawnCallback(bulletParams);
  }

  /**
   * Renders lock-on telemetry in world space:
   * Visualizes target identity, highlight silhouette, distance, health, and aiming vector.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context
   */
  onRenderWorld(ctx, alpha, context) {
    const { player } = context;

    if (!this.hasTarget || !this.currentTarget || this.currentTarget.markedForRemoval) {
      // Draw detection scan cone around player's aim angle when scanning
      if (player && this.level < 3) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 42, 109, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        const aimAngle = player.rotation;
        const fovHalfAngle = (45 + this.level * 25) * (Math.PI / 180);
        const maxRange = 550 + this.level * 150;

        ctx.beginPath();
        ctx.arc(player.x, player.y, maxRange, aimAngle - fovHalfAngle, aimAngle + fovHalfAngle);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      return;
    }

    const target = this.currentTarget;
    const targetPos = this.targetLeadPos;
    const isBacktrack = this.isBacktrackTarget;
    const beamColor = isBacktrack ? COLOR.AMBER : COLOR.RED;

    ctx.save();

    // 1. High-contrast vector tracer link from player to locked target position
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = beamColor;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(targetPos.x, targetPos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Lock-on diamond / octagonal targeting bracket around target position
    const bracketSize = (target.radius || 16) * 3.0;
    VectorRenderer.drawTargetBracket(ctx, targetPos.x, targetPos.y, bracketSize, beamColor, 4);

    // 3. Inner lock crosshair and lead reticle
    VectorRenderer.drawCrosshair(ctx, targetPos.x, targetPos.y, 6, COLOR.WHITE);

    // 4. Enemy wireframe silhouette highlight (so enemy is clearly visible even inside fog of war!)
    ctx.strokeStyle = beamColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + 3, 0, Math.PI * 2);
    ctx.stroke();

    // If locked onto backtrack tick, draw dashed connector line from enemy body to the backtrack tick
    if (isBacktrack) {
      ctx.strokeStyle = COLOR.AMBER;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Telemetry label badge
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = beamColor;
    ctx.textAlign = 'center';
    const tag = isBacktrack
      ? `[SILENT LOCK: BACKTRACK TICK]`
      : `[SILENT LOCK: ${target.type || 'ENEMY'} HP ${Math.ceil(target.health)}/${target.maxHealth}]`;
    ctx.fillText(tag, targetPos.x, targetPos.y - bracketSize * 0.5 - 6);

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = this.hasTarget ? (this.isBacktrackTarget ? COLOR.AMBER : COLOR.RED) : COLOR.RED_DIM;
    const status = this.hasTarget
      ? (this.isBacktrackTarget ? 'BACKTRACK_LOCKED' : 'KERNEL_LOCKED')
      : 'SCANNING';
    ctx.fillText(
      `[SILENTAIM.VMP Lv.${this.level}] ${status} (${this.redirectedCount} CURVED)`,
      x,
      y
    );
    ctx.restore();
  }
}
