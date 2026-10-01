/**
 * Ring Zero - Aimbot.dll (Userland / Ring 3)
 * Predictive target acquisition, vector lead calculations, and angle snap interpolation.
 * Capable of targeting both live enemy player bodies and historical backtrack ghost ticks.
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
    this.isBacktrackTarget = false;
  }

  /**
   * Snaps or lerps aim angle towards the optimal target (enemy body or backtrack ghost) in FOV
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
      penetrationCheat = null,
    } = context;

    if (!player || !spatialGrid) return rawAimAngle;

    // FOV Cone & Range scale with cheat rank
    const fovHalfAngle = (45 + this.level * 25) * (Math.PI / 180);
    const maxRange = 450 + this.level * 180;
    const bulletSpeed = weapon?.speed || 1200;

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

    // Query enemies in spatial grid
    const candidates = spatialGrid.queryRadius(
      player.x,
      player.y,
      maxRange,
      COLLISION_LAYER.ENEMY
    );

    let bestTarget = null;
    let bestScore = Infinity;
    let bestTargetX = 0;
    let bestTargetY = 0;
    let isBacktrack = false;

    for (const enemy of candidates) {
      if (!enemy.active || enemy.markedForRemoval) continue;

      // 1. Direct enemy body targeting with velocity lead
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= 10 && dist <= maxRange) {
        const angleToEnemy = Math.atan2(dy, dx);
        const diff = Math.abs(angleDiff(rawAimAngle, angleToEnemy));

        if (diff <= fovHalfAngle) {
          const hasDirectLOS = checkLOS(player.x, player.y, enemy.x, enemy.y);

          if (hasDirectLOS) {
            const tLead = dist / bulletSpeed;
            const lx = enemy.x + (enemy.vx || 0) * tLead;
            const ly = enemy.y + (enemy.vy || 0) * tLead;

            const score = diff * 0.65 + (dist / maxRange) * 0.35;
            if (score < bestScore) {
              bestScore = score;
              bestTarget = enemy;
              bestTargetX = lx;
              bestTargetY = ly;
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
              const hasGhostLOS = checkLOS(player.x, player.y, snap.x, snap.y);

              if (hasGhostLOS) {
                // Ghost ticks are stationary snapshots; prioritize if closer to crosshair
                const gScore = gDiff * 0.6 + (gDist / maxRange) * 0.35;
                if (gScore < bestScore) {
                  bestScore = gScore;
                  bestTarget = enemy;
                  bestTargetX = snap.x;
                  bestTargetY = snap.y;
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
      this.targetLeadPos.set(bestTargetX, bestTargetY);
      const desiredAngle = Math.atan2(bestTargetY - player.y, bestTargetX - player.x);
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
    const isBacktrack = this.isBacktrackTarget;
    const lockColor = isBacktrack ? COLOR.AMBER : COLOR.CYAN;

    ctx.save();
    // 1. Vector targeting beam from player to target / backtrack tick
    VectorRenderer.strokeLine(ctx, player.x, player.y, lead.x, lead.y, lockColor, 1.2);

    // 2. Lock-on brackets around target point
    VectorRenderer.drawTargetBracket(ctx, lead.x, lead.y, target.radius * 2.8, lockColor, 3);

    // 3. Predictive lead reticle / ghost reticle
    VectorRenderer.drawCrosshair(ctx, lead.x, lead.y, 4, COLOR.WHITE);

    // 4. Highlight circle around enemy body
    ctx.strokeStyle = lockColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    if (isBacktrack) {
      VectorRenderer.strokeLine(ctx, target.x, target.y, lead.x, lead.y, COLOR.AMBER_DIM, 1);
    }

    // Telemetry label
    ctx.font = '9px monospace';
    ctx.fillStyle = lockColor;
    ctx.textAlign = 'center';
    const tag = isBacktrack
      ? `AIMBOT//BACKTRACK_TICK [Lv.${this.level}]`
      : `AIMBOT//LOCKED [Lv.${this.level}]`;
    ctx.fillText(tag, lead.x, lead.y - target.radius - 12);

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = this.hasTarget ? COLOR.CYAN : COLOR.CYAN_MUTED;
    const status = this.hasTarget
      ? (this.isBacktrackTarget ? 'BACKTRACK_LOCKED' : 'TARGET_LOCKED')
      : 'SCANNING';
    ctx.fillText(`[AIMBOT.DLL Lv.${this.level}] ${status}`, x, y);
    ctx.restore();
  }
}
