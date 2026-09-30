/**
 * Ring Zero - 2D Uniform Spatial Hash Grid
 * Broadphase collision acceleration and rapid spatial range queries.
 */

import { SPATIAL_GRID, COLOR } from '../core/Constants.js';

export class SpatialHashGrid {
  /**
   * @param {number} [cellSize=128] - Dimensions of each square cell in world pixels
   */
  constructor(cellSize = SPATIAL_GRID.CELL_SIZE) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;

    /** @type {Map<string, Set<any>>} */
    this.grid = new Map();

    /** @type {Map<any, {minCx: number, minCy: number, maxCx: number, maxCy: number}>} */
    this.entityCells = new Map();

    // Reusable set for query deduplication
    this._queryResultSet = new Set();
  }

  /**
   * Hashes integer cell coordinates into a lookup key
   * @param {number} cx
   * @param {number} cy
   * @returns {string}
   */
  _hash(cx, cy) {
    return `${cx}:${cy}`;
  }

  /**
   * Computes bounding cell coordinates for an entity
   * @param {any} entity - Must have x, y, and radius (or bounds)
   * @returns {{minCx: number, minCy: number, maxCx: number, maxCy: number}}
   */
  _getCellBounds(entity) {
    const r = entity.radius || 0;
    const minCx = Math.floor((entity.x - r) * this.invCellSize);
    const minCy = Math.floor((entity.y - r) * this.invCellSize);
    const maxCx = Math.floor((entity.x + r) * this.invCellSize);
    const maxCy = Math.floor((entity.y + r) * this.invCellSize);
    return { minCx, minCy, maxCx, maxCy };
  }

  /**
   * Inserts an entity into the grid
   * @param {any} entity
   */
  insert(entity) {
    if (this.entityCells.has(entity)) {
      this.update(entity);
      return;
    }

    const bounds = this._getCellBounds(entity);
    this.entityCells.set(entity, bounds);

    for (let cx = bounds.minCx; cx <= bounds.maxCx; cx++) {
      for (let cy = bounds.minCy; cy <= bounds.maxCy; cy++) {
        const key = this._hash(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = new Set();
          this.grid.set(key, cell);
        }
        cell.add(entity);
      }
    }
  }

  /**
   * Removes an entity from the grid
   * @param {any} entity
   */
  remove(entity) {
    const bounds = this.entityCells.get(entity);
    if (!bounds) return;

    for (let cx = bounds.minCx; cx <= bounds.maxCx; cx++) {
      for (let cy = bounds.minCy; cy <= bounds.maxCy; cy++) {
        const key = this._hash(cx, cy);
        const cell = this.grid.get(key);
        if (cell) {
          cell.delete(entity);
          if (cell.size === 0) {
            this.grid.delete(key);
          }
        }
      }
    }

    this.entityCells.delete(entity);
  }

  /**
   * Updates an entity's cell registration if it has moved across cell boundaries
   * @param {any} entity
   */
  update(entity) {
    const oldBounds = this.entityCells.get(entity);
    if (!oldBounds) {
      this.insert(entity);
      return;
    }

    const newBounds = this._getCellBounds(entity);

    // If cell boundaries did not change, nothing to rehash
    if (
      oldBounds.minCx === newBounds.minCx &&
      oldBounds.minCy === newBounds.minCy &&
      oldBounds.maxCx === newBounds.maxCx &&
      oldBounds.maxCy === newBounds.maxCy
    ) {
      return;
    }

    this.remove(entity);
    this.insert(entity);
  }

  /**
   * Clears the entire spatial grid
   */
  clear() {
    this.grid.clear();
    this.entityCells.clear();
  }

  /**
   * Queries entities within a radial distance
   * @param {number} x - Center world X
   * @param {number} y - Center world Y
   * @param {number} radius - Search radius
   * @param {number} [layerMask=0xFFFFFFFF] - Filter by collision layer
   * @param {any[]} [outResults] - Destination array to populate
   * @returns {any[]}
   */
  queryRadius(x, y, radius, layerMask = 0xFFFFFFFF, outResults = []) {
    outResults.length = 0;
    this._queryResultSet.clear();

    const minCx = Math.floor((x - radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);

    const radSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this._hash(cx, cy);
        const cell = this.grid.get(key);
        if (!cell) continue;

        for (const entity of cell) {
          if (this._queryResultSet.has(entity)) continue;

          // Check layer mask
          if (layerMask !== 0xFFFFFFFF && (entity.layer && !(entity.layer & layerMask))) {
            continue;
          }

          // Exact circle distance check
          const er = entity.radius || 0;
          const totalR = radius + er;
          const dx = entity.x - x;
          const dy = entity.y - y;
          if (dx * dx + dy * dy <= totalR * totalR) {
            this._queryResultSet.add(entity);
            outResults.push(entity);
          }
        }
      }
    }

    return outResults;
  }

  /**
   * Queries entities within an axis-aligned bounding box
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   * @param {number} [layerMask=0xFFFFFFFF]
   * @param {any[]} [outResults]
   * @returns {any[]}
   */
  queryAABB(minX, minY, maxX, maxY, layerMask = 0xFFFFFFFF, outResults = []) {
    outResults.length = 0;
    this._queryResultSet.clear();

    const minCx = Math.floor(minX * this.invCellSize);
    const minCy = Math.floor(minY * this.invCellSize);
    const maxCx = Math.floor(maxX * this.invCellSize);
    const maxCy = Math.floor(maxY * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this._hash(cx, cy);
        const cell = this.grid.get(key);
        if (!cell) continue;

        for (const entity of cell) {
          if (this._queryResultSet.has(entity)) continue;

          if (layerMask !== 0xFFFFFFFF && (entity.layer && !(entity.layer & layerMask))) {
            continue;
          }

          const er = entity.radius || 0;
          if (
            entity.x + er >= minX &&
            entity.x - er <= maxX &&
            entity.y + er >= minY &&
            entity.y - er <= maxY
          ) {
            this._queryResultSet.add(entity);
            outResults.push(entity);
          }
        }
      }
    }

    return outResults;
  }

  /**
   * Visualizes active grid cells and occupancy telemetry
   * @param {CanvasRenderingContext2D} ctx
   * @param {{minX: number, minY: number, maxX: number, maxY: number}} bounds - Visible camera bounds
   */
  renderDebug(ctx, bounds) {
    ctx.save();
    ctx.lineWidth = 1;

    const minCx = Math.floor(bounds.minX * this.invCellSize);
    const minCy = Math.floor(bounds.minY * this.invCellSize);
    const maxCx = Math.floor(bounds.maxX * this.invCellSize);
    const maxCy = Math.floor(bounds.maxY * this.invCellSize);

    // Draw grid lines
    ctx.strokeStyle = COLOR.GRID_MINOR;
    ctx.beginPath();
    for (let cx = minCx; cx <= maxCx + 1; cx++) {
      const gx = cx * this.cellSize;
      ctx.moveTo(gx, bounds.minY);
      ctx.lineTo(gx, bounds.maxY);
    }
    for (let cy = minCy; cy <= maxCy + 1; cy++) {
      const gy = cy * this.cellSize;
      ctx.moveTo(bounds.minX, gy);
      ctx.lineTo(bounds.maxX, gy);
    }
    ctx.stroke();

    // Highlight occupied cells
    ctx.font = '10px monospace';
    ctx.fillStyle = COLOR.CYAN_DIM;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this._hash(cx, cy);
        const cell = this.grid.get(key);
        if (cell && cell.size > 0) {
          const gx = cx * this.cellSize;
          const gy = cy * this.cellSize;

          ctx.strokeStyle = COLOR.CYAN_MUTED;
          ctx.strokeRect(gx + 1, gy + 1, this.cellSize - 2, this.cellSize - 2);

          ctx.fillText(`[${cx},${cy}] #${cell.size}`, gx + 4, gy + 4);
        }
      }
    }

    ctx.restore();
  }

  get totalOccupiedCells() {
    return this.grid.size;
  }

  get totalTrackedEntities() {
    return this.entityCells.size;
  }
}
