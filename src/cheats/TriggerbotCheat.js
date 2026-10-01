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
    this.fireRequested = false;
    this.fireTimer = 0;
    this.backtrackCheat = null;
    this.backtrackTarget = null;
  }

  reset() {
    this.targetInCrosshair = false;
    this.fireRequested = false;
    this.fireTimer = 0;
    this.backtrackCheat = null;
    this.backtrackTarget = null;
  }

  teardown() {
    this.reset();
  }

  /**
   * Checks if an enemy is in line with the player's crosshair ray
   * @param {number} aimAngle
   * @param {Vec2} aimVector
   * @param {Object} context - { player, enemies, backtrackCheat }
   * @returns {number}
   */
  onAimInput(aimAngle, aimVector, context) {
    // Explicit hit-test required every single tick: clear requested fire state
    this.targetInCrosshair = false;
    this.fireRequested = false;
    this.backtrackTarget = null;

    if (!this.enabled) {
      this.backtrackCheat = null;
      return aimAngle;
    }

    const {
      player,
      enemies,
      backtrackCheat,
      silentAimCheat,
      raycaster,
      wallSegments = [],
      hasWallhack = false,
      penetrationCheat = null,
    } = context;
    this.backtrackCheat = backtrackCheat || null;
    if (!player || !enemies) return aimAngle;

    const maxDist = 700;
    const maxDistSq = maxDist * maxDist;
    const rayDirX = Math.cos(aimAngle);
    const rayDirY = Math.sin(aimAngle);
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

      const toEnemyX = enemy.x - player.x;
      const toEnemyY = enemy.y - player.y;
      const distSq = toEnemyX * toEnemyX + toEnemyY * toEnemyY;
      if (distSq > maxDistSq || distSq < 1) continue;

      const proj = toEnemyX * rayDirX + toEnemyY * rayDirY;
      if (proj <= 0) continue; // Behind player

      const perpDist = Math.sqrt(Math.max(0, distSq - proj * proj));
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
          const toSnapX = snap.x - player.x;
          const toSnapY = snap.y - player.y;
          const distSnapSq = toSnapX * toSnapX + toSnapY * toSnapY;
          if (distSnapSq > maxDistSq || distSnapSq < 1) continue;
          const projSnap = toSnapX * rayDirX + toSnapY * rayDirY;
          if (projSnap <= 0) continue;
          const perpDistSnap = Math.sqrt(Math.max(0, distSnapSq - projSnap * projSnap));
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

    // SilentAim acquisition cone expansion check if SilentAim is active
    if (!hitFound && silentAimCheat && silentAimCheat.enabled) {
      if (silentAimCheat.hasTarget && silentAimCheat.currentTarget && !silentAimCheat.currentTarget.markedForRemoval) {
        hitFound = true;
      } else {
        const fovHalfAngle = silentAimCheat.level === 3 ? Math.PI : (45 + silentAimCheat.level * 25) * (Math.PI / 180);
        const maxRange = 550 + silentAimCheat.level * 150;
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy.active || enemy.markedForRemoval) continue;
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= maxRange) {
            const angleToTarget = Math.atan2(dy, dx);
            let diff = Math.abs(aimAngle - angleToTarget) % (Math.PI * 2);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff <= fovHalfAngle && isUnblocked(enemy.x, enemy.y)) {
              hitFound = true;
              break;
            }
          }
        }
      }
    }

    this.targetInCrosshair = hitFound;
    this.fireRequested = hitFound;
    return aimAngle;
  }

  shouldAutoShoot() {
    if (!this.enabled || !this.targetInCrosshair || !this.fireRequested) return false;
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
