/**
 * Ring Zero - Security Daemon Enemy Management Subsystem
 * High-performance entity management, off-screen tick culling, spatial boundary clamping,
 * and zero-allocation updates on 60Hz tick across all 4 Protection Rings.
 */

import { Enemy, ENEMY_ARCHETYPES } from '../entities/Enemy.js';

export const SPAWN_MARGIN = 80;

export class EnemySystem {
  /**
   * @param {Object} [options]
   * @param {number} [options.width=2400]
   * @param {number} [options.height=2400]
   * @param {number} [options.spawnMargin=80]
   */
  constructor(options = {}) {
    const width = options.width || 2400;
    const height = options.height || 2400;
    const margin = options.spawnMargin || SPAWN_MARGIN;

    this.spawnMargin = margin;
    this.arenaWidth = width;
    this.arenaHeight = height;

    const hw = width * 0.5;
    const hh = height * 0.5;
    this.bounds = {
      minX: -hw + margin,
      maxX: hw - margin,
      minY: -hh + margin,
      maxY: hh - margin,
    };
  }

  /**
   * Dynamically scales arena boundaries across Clearance Rings
   * @param {number} width
   * @param {number} height
   * @param {number} [spawnMargin=80]
   */
  setArenaBounds(width, height, spawnMargin = SPAWN_MARGIN) {
    this.arenaWidth = width;
    this.arenaHeight = height;
    this.spawnMargin = spawnMargin;

    const hw = width * 0.5;
    const hh = height * 0.5;
    this.bounds.minX = -hw + spawnMargin;
    this.bounds.maxX = hw - spawnMargin;
    this.bounds.minY = -hh + spawnMargin;
    this.bounds.maxY = hh - spawnMargin;
  }

  /**
   * Primary update step for active enemies with off-screen tick culling
   * and strict boundary clamping to prevent out-of-bounds leakage.
   * @param {Enemy[]} enemies
   * @param {number} dt
   * @param {import('../entities/Player.js').Player} player
   * @param {import('./SpatialHashGrid.js').SpatialHashGrid} spatialGrid
   * @param {function(Object): void} onShootProjectile
   * @param {import('../core/Camera2D.js').Camera2D} [camera=null]
   * @param {import('./CheatManager.js').CheatManager} [cheatManager=null]
   */
  update(enemies, dt, player, spatialGrid, onShootProjectile, camera = null, cheatManager = null) {
    if (!enemies || enemies.length === 0) return;

    const b = this.bounds;
    const px = player ? player.x : 0;
    const py = player ? player.y : 0;

    // Off-screen culling threshold: 1.5x largest viewport dimension (typically ~1800-2400px)
    const cullDist = camera
      ? Math.max(camera.viewportWidth, camera.viewportHeight) * 1.5
      : 1800;
    const cullDistSq = cullDist * cullDist;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.active || enemy.markedForRemoval) continue;

      const dx = px - enemy.x;
      const dy = py - enemy.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > cullDistSq) {
        // Off-screen tick culling: Skip expensive flocking queries, raycasts, and complex steering.
        // Update basic linear velocity only toward the player.
        enemy.preStep();
        const dist = Math.sqrt(distSq);
        if (dist > 1) {
          enemy.vx = (dx / dist) * enemy.speed;
          enemy.vy = (dy / dist) * enemy.speed;
        }
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      } else {
        // In-range full AI simulation
        enemy.updateAI(dt, player, spatialGrid, onShootProjectile, b);
      }

      // Strict boundary clamping with SPAWN_MARGIN
      if (enemy.x < b.minX) {
        enemy.x = b.minX;
        if (enemy.vx < 0) enemy.vx = 0;
      } else if (enemy.x > b.maxX) {
        enemy.x = b.maxX;
        if (enemy.vx > 0) enemy.vx = 0;
      }

      if (enemy.y < b.minY) {
        enemy.y = b.minY;
        if (enemy.vy < 0) enemy.vy = 0;
      } else if (enemy.y > b.maxY) {
        enemy.y = b.maxY;
        if (enemy.vy > 0) enemy.vy = 0;
      }

      if (cheatManager) {
        cheatManager.updateEnemy(enemy, dt, { player });
      }

      spatialGrid.update(enemy);
    }
  }
}

export { Enemy, ENEMY_ARCHETYPES };
