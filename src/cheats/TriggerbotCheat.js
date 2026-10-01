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
    this.backtrackCheat = null;
    this.backtrackTarget = null;
  }

  /**
   * Checks if an enemy is in line with the player's crosshair ray
   * @param {number} aimAngle
   * @param {Vec2} aimVector
   * @param {Object} context - { player, enemies, backtrackCheat }
   * @returns {number}
   */
  onAimInput(aimAngle, aimVector, context) {
    if (!this.enabled) {
      this.targetInCrosshair = false;
      this.backtrackCheat = null;
      this.backtrackTarget = null;
      return aimAngle;
    }

    const {
      player,
      enemies,
      backtrackCheat,
      raycaster,
      wallSegments = [],
      hasWallhack = false,
      penetrationCheat = null,
    } = context;
    this.backtrackCheat = backtrackCheat || null;
    if (!player || !enemies) return aimAngle;

    const maxDist = 700;
    const rayDir = new Vec2(Math.cos(aimAngle), Math.sin(aimAngle));
    let hitFound = false;
    const tolerance = 14 + this.level * 10;

    const maxPierce = hasWallhack
      ? 999
      : (penetrationCheat && penetrationCheat.enabled
          ? (penetrationCheat.extraPierce || 2)
          : 0);

    const isUnblocked = (tx, ty) => {
      if (hasWallhack || !raycaster || !wallSegments || wallSegments.length === 0) return true;
      if (maxPierce > 0 && typeof raycaster.countInterveningWalls === 'function') {
        return raycaster.countInterveningWalls(player.x, player.y, tx, ty, wallSegments) <= maxPierce;
      }
      return raycaster.hasLineOfSight(player.x, player.y, tx, ty, wallSegments);
    };

    // Primary active enemy check
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.active || enemy.markedForRemoval) continue;

      const toEnemy = new Vec2(enemy.x - player.x, enemy.y - player.y);
      const dist = toEnemy.length();
      if (dist > maxDist || dist < 1) continue;

      const proj = toEnemy.dot(rayDir);
      if (proj <= 0) continue; // Behind player

      const perpDist = Math.sqrt(Math.max(0, dist * dist - proj * proj));
      if (perpDist <= enemy.radius + tolerance) {
        if (isUnblocked(enemy.x, enemy.y)) {
          hitFound = true;
          break;
        }
      }
    }

    // Backtrack ghost check if no active hit
    if (!hitFound && this.backtrackCheat && this.backtrackCheat.enabled) {
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.active || enemy.markedForRemoval) continue;
        const history = this.backtrackCheat.historyMap.get(enemy.id);
        if (!history || history.length < 2) continue;
        for (let j = history.length - 1; j >= 0; j--) {
          const snap = history[j];
          const toSnap = new Vec2(snap.x - player.x, snap.y - player.y);
          const distSnap = toSnap.length();
          if (distSnap > maxDist || distSnap < 1) continue;
          const projSnap = toSnap.dot(rayDir);
          if (projSnap <= 0) continue;
          const perpDistSnap = Math.sqrt(Math.max(0, distSnap * distSnap - projSnap * projSnap));
          if (perpDistSnap <= enemy.radius + tolerance) {
            if (isUnblocked(snap.x, snap.y)) {
              hitFound = true;
              this.backtrackTarget = enemy;
              break;
            }
          }
        }
        if (hitFound) break;
      }
    }

    this.targetInCrosshair = hitFound;
    return aimAngle;
  }

  shouldAutoShoot() {
    if (!this.enabled || !this.targetInCrosshair) return false;
    if (this.backtrackTarget && this.backtrackCheat) {
      this.backtrackCheat.rewindEnemy(this.backtrackTarget);
    }
    return true;
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = this.targetInCrosshair ? COLOR.RED : COLOR.CYAN;
    const status = this.targetInCrosshair ? 'LOCKED [TRIGGERBOT]' : 'MONITORING';
    ctx.fillText(`[CS] TRIGGERBOT.cs :: RANK ${this.level}/3 [${status}]`, x, y);
  }
}
