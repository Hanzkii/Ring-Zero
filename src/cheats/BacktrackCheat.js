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
    return 35 + this.level * 20;
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
    if (!history || history.length < 8) return false;

    let closestSnap = null;
    let closestDistSq = Infinity;
    let closestIndex = -1;
    const totalR = enemy.radius + proj.radius;
    const totalRSq = totalR * totalR;

    // Find the closest historical snapshot within collision radius
    for (let i = 0; i < history.length - 2; i++) {
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
