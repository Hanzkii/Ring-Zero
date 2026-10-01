/**
 * Ring Zero - Aimbot.dll (Userland / Ring 3)
 * Predictive target acquisition selecting the physically closest living enemy to the player
 * using squared Euclidean distance (0 Math.sqrt allocations/calls during comparison).
 * Decoupled from player velocity and movement.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { Vec2 } from '../core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class AimbotCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.AIMBOT);

    this.currentTarget = null;
    this.targetLeadPos = new Vec2();
    this.currentLockedAngle = 0;
    this.hasTarget = false;
    this.isBacktrackTarget = false;

    // Zero-allocation preallocated scratch fields for closest target acquisition
    this._bestTarget = null;
    this._bestTargetX = 0;
    this._bestTargetY = 0;
    this._bestIsBacktrack = false;
  }

  /**
   * Cheat lifecycle update.
   * Aimbot strictly operates on aimAngle and targeting lead.
   * It is decoupled from player movement and never overwrites or damps player velocity (vx, vy),
   * moveSpeed, or the WASD directional movement vector.
   * @param {number} [dt=0.016]
   * @param {Object} [context={}]
   */
  update(dt = 0.016, context = {}) {
    // Strictly no-op for player movement velocity.
  }

  /**
   * Selects the physically closest active living enemy to the player using squared Euclidean distance.
   * Runs with zero dynamic allocations in the 60Hz tick loop.
   * @param {import('../entities/Player.js').Player} player
   * @param {Array<import('../entities/Enemy.js').Enemy>} enemies
   * @param {number} [maxRange=Infinity]
   * @param {function(number, number, number, number): boolean} [checkLOS=null]
   * @param {import('./BacktrackCheat.js').BacktrackCheat} [backtrackCheat=null]
   * @returns {import('../entities/Enemy.js').Enemy|null}
   */
  acquireTarget(player, enemies, maxRange = Infinity, checkLOS = null, backtrackCheat = null) {
    this._bestTarget = null;
    this._bestTargetX = 0;
    this._bestTargetY = 0;
    this._bestIsBacktrack = false;

    if (!player || !enemies || enemies.length === 0) return null;

    const maxDistSq = maxRange * maxRange;
    let minDistanceSq = Infinity;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy || !enemy.active || enemy.markedForRemoval || enemy.health <= 0) continue;

      // 1. Direct enemy body Euclidean distance squared
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= maxDistSq) {
        const losOk = !checkLOS || checkLOS(player.x, player.y, enemy.x, enemy.y);
        if (losOk && distSq < minDistanceSq) {
          minDistanceSq = distSq;
          this._bestTarget = enemy;
          this._bestTargetX = enemy.x;
          this._bestTargetY = enemy.y;
          this._bestIsBacktrack = false;
        }
      }

      // 2. Backtrack ghost tick targeting
      if (backtrackCheat && backtrackCheat.historyMap) {
        const history = backtrackCheat.historyMap.get(enemy.id);
        if (history && history.length >= 3) {
          const step = Math.max(1, Math.floor(history.length / 5));
          for (let h = 0; h < history.length - 1; h += step) {
            const snap = history[h];
            const gdx = snap.x - player.x;
            const gdy = snap.y - player.y;
            const gDistSq = gdx * gdx + gdy * gdy;
            if (gDistSq <= maxDistSq) {
              const ghostLosOk = !checkLOS || checkLOS(player.x, player.y, snap.x, snap.y);
              if (ghostLosOk && gDistSq < minDistanceSq) {
                minDistanceSq = gDistSq;
                this._bestTarget = enemy;
                this._bestTargetX = snap.x;
                this._bestTargetY = snap.y;
                this._bestIsBacktrack = true;
              }
            }
          }
        }
      }
    }

    return this._bestTarget;
  }

  /**
   * Snaps aim angle towards the closest active enemy to the player.
   * Calculates Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x)
   * and updates player.aimAngle while preserving player velocity and strafing inertia.
   * @param {number} rawAimAngle
   * @param {Vec2} aimVector
   * @param {Object} context - { player, spatialGrid, enemies, dt, weapon, raycaster, wallSegments, hasWallhack, backtrackCheat }
   * @returns {number}
   */
  onAimInput(rawAimAngle, aimVector, context) {
    const {
      player,
      spatialGrid,
      enemies = [],
      dt = 0.016,
      weapon,
      raycaster,
      wallSegments = [],
      hasWallhack = false,
      backtrackCheat = null,
      penetrationCheat = null,
    } = context;

    if (!player) return rawAimAngle;

    const maxRange = 450 + this.level * 180;

    const maxPierce = hasWallhack
      ? 999
      : (penetrationCheat && penetrationCheat.enabled
          ? (penetrationCheat.extraPierce || 2)
          : 0);

    const checkLOS = (x1, y1, x2, y2) => {
      if (hasWallhack || !raycaster || !wallSegments || wallSegments.length === 0) return true;
      if (maxPierce > 0 && typeof raycaster.countInterveningWalls === 'function') {
        return raycaster.countInterveningWalls(x1, y1, x2, y2, wallSegments) <= maxPierce;
      }
      return raycaster.hasLineOfSight(x1, y1, x2, y2, wallSegments);
    };

    // Candidates can come from spatialGrid query or enemies array
    const candidates = spatialGrid
      ? spatialGrid.queryRadius(player.x, player.y, maxRange, COLLISION_LAYER.ENEMY)
      : enemies;

    // Strictly distance-based closest enemy acquisition with backtrack support
    const bestTarget = this.acquireTarget(player, candidates, maxRange, checkLOS, backtrackCheat);

    this.currentTarget = bestTarget;
    this.hasTarget = bestTarget !== null;
    this.isBacktrackTarget = this._bestIsBacktrack;

    if (bestTarget) {
      // Calculate target angle using Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x)
      const targetAngle = Math.atan2(this._bestTargetY - player.y, this._bestTargetX - player.x);
      this.targetLeadPos.set(this._bestTargetX, this._bestTargetY);
      this.currentLockedAngle = targetAngle;
      player.aimAngle = targetAngle;
      return targetAngle;
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
    const lockColor = COLOR.CYAN;

    ctx.save();
    // 1. Vector targeting beam from player to target
    VectorRenderer.strokeLine(ctx, player.x, player.y, lead.x, lead.y, lockColor, 1.2);

    // 2. Lock-on brackets around target point
    VectorRenderer.drawTargetBracket(ctx, lead.x, lead.y, target.radius * 2.8, lockColor, 3);

    // 3. Predictive reticle
    VectorRenderer.drawCrosshair(ctx, lead.x, lead.y, 4, COLOR.WHITE);

    // 4. Highlight circle around enemy body
    ctx.strokeStyle = lockColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Telemetry label
    ctx.font = '9px monospace';
    ctx.fillStyle = lockColor;
    ctx.textAlign = 'center';
    const tag = `AIMBOT//CLOSEST_TARGET [Lv.${this.level}]`;
    ctx.fillText(tag, lead.x, lead.y - target.radius - 12);

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = this.hasTarget ? COLOR.CYAN : COLOR.CYAN_MUTED;
    const status = this.hasTarget ? 'CLOSEST_LOCKED' : 'SCANNING';
    ctx.fillText(`[AIMBOT.DLL Lv.${this.level}] ${status}`, x, y);
    ctx.restore();
  }
}
