/**
 * Ring Zero - Developer Diagnostic Visualizer & Debug Renderer
 * Pure Canvas 2D zero-GC visual diagnostic passes:
 * - Hitbox & Hurtbox wireframes (Player, Enemies, Projectiles, Drops, Props)
 * - Spatial Hash Grid 128px occupancy and boundary metrics
 * - Raycast Line-of-Sight and target acquisition vectors
 * - 90-tick Backtrack ghost history trails
 */

import { COLOR, COLLISION_LAYER } from '../core/Constants.js';

export class DebugRenderer {
  constructor() {
    this.showHitboxes = false;
    this.showSpatialGrid = false;
    this.showRaycasts = false;
    this.showBacktrack = false;
  }

  /**
   * Sets a specific diagnostic mode or all/none
   * @param {string} mode - 'hitboxes' | 'spatial' | 'raycast' | 'backtrack' | 'all' | 'none'
   * @param {boolean} [state=true]
   */
  setMode(mode, state = true) {
    if (mode === 'all') {
      this.toggleAll(true);
    } else if (mode === 'none') {
      this.toggleAll(false);
    } else if (mode === 'hitboxes') {
      this.showHitboxes = state;
    } else if (mode === 'spatial') {
      this.showSpatialGrid = state;
    } else if (mode === 'raycast') {
      this.showRaycasts = state;
    } else if (mode === 'backtrack') {
      this.showBacktrack = state;
    }
  }

  /**
   * Toggles all diagnostic overlays simultaneously
   * @param {boolean} [forceState]
   */
  toggleAll(forceState) {
    const next = forceState !== undefined ? forceState : !this.showHitboxes;
    this.showHitboxes = next;
    this.showSpatialGrid = next;
    this.showRaycasts = next;
    this.showBacktrack = next;
    return next;
  }

  /**
   * Main diagnostic render pass. Called in world-space coordinates.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} options
   */
  render(ctx, {
    camera,
    player,
    enemies = [],
    drops = [],
    props = [],
    projectilePool = null,
    spatialGrid = null,
    backtrackCheat = null,
    raycaster = null,
    wallSegments = [],
  }) {
    if (!this.showHitboxes && !this.showSpatialGrid && !this.showRaycasts && !this.showBacktrack) {
      return;
    }

    ctx.save();

    // 1. Spatial Hash Grid Overlay
    if (this.showSpatialGrid && spatialGrid) {
      this._renderSpatialGrid(ctx, spatialGrid, camera);
    }

    // 2. Backtrack 90-Tick Ghost History Trails
    if (this.showBacktrack && backtrackCheat && backtrackCheat.historyMap) {
      this._renderBacktrackTrails(ctx, backtrackCheat.historyMap);
    }

    // 3. Raycast & LOS Vectors
    if (this.showRaycasts && player) {
      this._renderRaycasts(ctx, player, enemies, wallSegments, raycaster);
    }

    // 4. Hitbox & Hurtbox Visualizers
    if (this.showHitboxes) {
      this._renderHitboxes(ctx, player, enemies, drops, props, projectilePool);
    }

    ctx.restore();
  }

  /**
   * 128px uniform spatial hash grid and cell occupancy numbers
   * @private
   */
  _renderSpatialGrid(ctx, spatialGrid, camera) {
    const cellSize = spatialGrid.cellSize || 128;
    const bounds = camera ? camera.getVisibleBounds(128) : { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 };

    const startX = Math.floor(bounds.minX / cellSize) * cellSize;
    const endX = Math.ceil(bounds.maxX / cellSize) * cellSize;
    const startY = Math.floor(bounds.minY / cellSize) * cellSize;
    const endY = Math.ceil(bounds.maxY / cellSize) * cellSize;

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';

    for (let x = startX; x <= endX; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Render active cell contents
    for (const [key, cell] of spatialGrid.grid.entries()) {
      if (!cell || cell.length === 0) continue;
      const [cx, cy] = key.split(',').map(Number);
      const wx = cx * cellSize;
      const wy = cy * cellSize;

      if (wx >= bounds.minX - cellSize && wx <= bounds.maxX && wy >= bounds.minY - cellSize && wy <= bounds.maxY) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.fillRect(wx, wy, cellSize, cellSize);

        ctx.fillStyle = COLOR.CYAN;
        ctx.fillText(`[${cell.length}]`, wx + 4, wy + 12);
      }
    }
  }

  /**
   * Backtrack historical ghost trails
   * @private
   */
  _renderBacktrackTrails(ctx, historyMap) {
    ctx.lineWidth = 1.5;

    for (const [enemyId, history] of historyMap.entries()) {
      if (!history || history.length < 2) continue;

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const snap = history[i];
        if (i === 0) ctx.moveTo(snap.x, snap.y);
        else ctx.lineTo(snap.x, snap.y);
      }
      ctx.stroke();

      // Draw sample ticks
      for (let i = 0; i < history.length; i += 5) {
        const snap = history[i];
        ctx.fillStyle = i === 0 ? COLOR.CYAN : 'rgba(0, 240, 255, 0.3)';
        ctx.fillRect(snap.x - 2, snap.y - 2, 4, 4);
      }
    }
  }

  /**
   * Raycast lines from player to nearby enemies with hit markers
   * @private
   */
  _renderRaycasts(ctx, player, enemies, wallSegments, raycaster) {
    ctx.lineWidth = 1;
    for (const enemy of enemies) {
      if (!enemy.active || enemy.markedForRemoval) continue;

      const hasLOS = raycaster ? raycaster.hasLineOfSight(player.x, player.y, enemy.x, enemy.y, wallSegments) : true;
      ctx.strokeStyle = hasLOS ? 'rgba(0, 255, 136, 0.45)' : 'rgba(255, 0, 85, 0.35)';

      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(enemy.x, enemy.y);
      ctx.stroke();

      if (!hasLOS) {
        // Draw occlusion cross at enemy position
        ctx.fillStyle = COLOR.RED;
        ctx.fillRect(enemy.x - 3, enemy.y - 3, 6, 6);
      }
    }
  }

  /**
   * Wireframe hitboxes and hurtboxes
   * @private
   */
  _renderHitboxes(ctx, player, enemies, drops, props, projectilePool) {
    ctx.lineWidth = 1.5;

    // 1. Player Hitbox (Green circle)
    if (player && player.health > 0) {
      ctx.strokeStyle = player.godMode ? COLOR.AMBER : COLOR.GREEN;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Center crosshair tick
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(player.x - 1, player.y - 1, 2, 2);
    }

    // 2. Enemies Hitbox (Red circle)
    for (const enemy of enemies) {
      if (!enemy.active || enemy.markedForRemoval) continue;
      ctx.strokeStyle = COLOR.RED;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Drops Hitbox (Cyan circle for XP, Amber for Crypto/Weapon, Green for Nanite)
    for (const drop of drops) {
      if (!drop.active || drop.markedForRemoval) continue;
      ctx.strokeStyle = drop.type === 'NANITE_REPAIR'
        ? COLOR.GREEN
        : (drop.type === 'CRYPTO' ? COLOR.AMBER : COLOR.CYAN);
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Props (Amber bounding box)
    for (const prop of props) {
      if (prop.markedForRemoval) continue;
      ctx.strokeStyle = COLOR.AMBER;
      ctx.strokeRect(prop.x - prop.width * 0.5, prop.y - prop.height * 0.5, prop.width, prop.height);
    }

    // 5. Active Projectiles (Cyan for player, Red for enemies)
    if (projectilePool) {
      projectilePool.forEachActive((proj) => {
        if (proj.markedForRemoval) return;
        ctx.strokeStyle = proj.layer === COLLISION_LAYER.PROJECTILE_PLAYER ? COLOR.CYAN : COLOR.RED;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius || 3, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }
}
