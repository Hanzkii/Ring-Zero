/**
 * Ring Zero - Backtrack.sys (Driver Space / Ring 2)
 * Historical position ring buffer enabling players to shoot past enemy positions and rewind their spacetime state.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class BacktrackCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.BACKTRACK);

    /** @type {Map<number, Array<{x: number, y: number, rotation: number}>>} */
    this.historyMap = new Map();
    this.rewindCount = 0;
  }

  get maxHistoryFrames() {
    // 45 frames (~0.75s) at Lv 1, 65 frames (~1.1s) at Lv 2, 90 frames (1.5s) at Lv 3
    if (this.level === 1) return 45;
    if (this.level === 2) return 65;
    return 90;
  }

  /**
   * Records historical coordinates for moving enemies
   * @param {import('../entities/Enemy.js').Enemy} enemy
   * @param {number} dt
   */
  onEnemyUpdate(enemy, dt) {
    if (!enemy.active || enemy.markedForRemoval) {
      this.historyMap.delete(enemy.id);
      return;
    }

    let history = this.historyMap.get(enemy.id);
    if (!history) {
      history = [];
      this.historyMap.set(enemy.id, history);
    }

    // Push new coordinate record
    history.push({
      x: enemy.x,
      y: enemy.y,
      rotation: enemy.rotation,
    });

    // Enforce ring buffer ceiling
    while (history.length > this.maxHistoryFrames) {
      history.shift();
    }
  }

  /**
   * Checks if a projectile hits any historical backtrack ghost of an enemy
   * @param {import('../entities/Projectile.js').Projectile} proj
   * @param {import('../entities/Enemy.js').Enemy} enemy
   * @returns {boolean} Whether a historical ghost was hit and rewound
   */
  checkGhostCollision(proj, enemy) {
    const history = this.historyMap.get(enemy.id);
    if (!history || history.length < 3) return false;

    let closestSnap = null;
    let closestDistSq = Infinity;
    let closestIndex = -1;
    // Generous hitbox allowance for reliable hit registration on fast bullets
    const totalR = enemy.radius + proj.radius + 6;
    const totalRSq = totalR * totalR;

    // Find the closest historical snapshot within collision radius
    for (let i = 0; i < history.length - 1; i++) {
      const snap = history[i];
      const dx = proj.x - snap.x;
      const dy = proj.y - snap.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= totalRSq && distSq < closestDistSq) {
        closestDistSq = distSq;
        closestSnap = snap;
        closestIndex = i;
      }
    }

    if (closestSnap) {
      // Rewind enemy spacetime state!
      enemy.x = closestSnap.x;
      enemy.y = closestSnap.y;
      enemy.vx = 0;
      enemy.vy = 0;

      // Truncate future history
      history.length = closestIndex + 1;
      this.rewindCount++;
      return true;
    }

    return false;
  }

  /**
   * Checks all enemies for a backtrack ghost collision with a projectile.
   * Returns the first enemy that collides with a ghost, or null.
   * @param {import('../entities/Projectile.js').Projectile} proj
   * @param {Array<import('../entities/Enemy.js').Enemy>} enemyList
   * @returns {import('../entities/Enemy.js').Enemy|null}
   */
  checkAllGhostsCollision(proj, enemyList) {
    for (const enemy of enemyList) {
      if (!enemy.active || enemy.markedForRemoval) continue;
      if (this.checkGhostCollision(proj, enemy)) {
        return enemy;
      }
    }
    return null;
  }

  /**
   * Rewinds the given enemy to its latest historical snapshot.
   * Used by Triggerbot when targeting a backtrack tick.
   * @param {import('../entities/Enemy.js').Enemy} enemy
   */
  rewindEnemy(enemy) {
    const history = this.historyMap.get(enemy.id);
    if (!history || history.length < 2) return false;
    // Use the most recent snapshot (last entry)
    const snap = history[history.length - 1];
    enemy.x = snap.x;
    enemy.y = snap.y;
    enemy.vx = 0;
    enemy.vy = 0;
    // Truncate history to this point (retain up to this snapshot)
    history.length = history.length;
    this.rewindCount++;
    return true;
  }

  /**
   * Renders historical ghost wireframes behind moving enemies
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context - { enemies }
   */
  onRenderWorld(ctx, alpha, context) {
    const { enemies } = context;
    if (!enemies) return;

    ctx.save();

    for (const enemy of enemies) {
      if (!enemy.active || enemy.markedForRemoval) continue;

      const history = this.historyMap.get(enemy.id);
      if (!history || history.length < 10) continue;

      // Draw ghost trail dots / wireframe breadcrumbs
      const sampleStep = Math.max(4, Math.floor(history.length / 5));
      for (let i = 0; i < history.length - 2; i += sampleStep) {
        const snap = history[i];
        const ageRatio = i / history.length; // 0 (oldest) to 1 (newest)

        ctx.strokeStyle = COLOR.AMBER;
        ctx.globalAlpha = 0.25 * ageRatio;
        ctx.lineWidth = 1;

        // Ghost circle
        ctx.beginPath();
        ctx.arc(snap.x, snap.y, enemy.radius * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        // Connect dot to current
        if (i === 0) {
          ctx.setLineDash([2, 4]);
          VectorRenderer.strokeLine(ctx, snap.x, snap.y, enemy.x, enemy.y, COLOR.AMBER, 1);
          ctx.setLineDash([]);
        }
      }
    }

    ctx.restore();
  }

  onRenderHUD(ctx, x, y) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.AMBER;
    ctx.fillText(
      `[BACKTRACK.SYS Lv.${this.level}] BUFFER_${this.maxHistoryFrames}F (${this.rewindCount} REWINDS)`,
      x,
      y
    );
    ctx.restore();
  }
}
