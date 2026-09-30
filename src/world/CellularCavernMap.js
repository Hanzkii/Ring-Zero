/**
 * Ring Zero - Biome 2: Cellular Automata Decrypted Cavern Map
 * Organic cavern generated via cellular automata, flood-filled connectivity, and memory cluster props.
 */

import { WORLD, COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { PRNG, WallRect, WallSegment } from './MapGenerator.js';
import { DestructibleProp, PROP_TYPE } from './DestructibleProp.js';

export class CellularCavernMap {
  /**
   * @param {number} [seed=2048]
   * @param {number} [width=WORLD.DEFAULT_WIDTH]
   * @param {number} [height=WORLD.DEFAULT_HEIGHT]
   */
  constructor(seed = 2048, width = WORLD.DEFAULT_WIDTH, height = WORLD.DEFAULT_HEIGHT) {
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.halfW = width * 0.5;
    this.halfH = height * 0.5;
    this.prng = new PRNG(seed);

    // Grid configuration: 40x40 cells of 60x60px
    this.cols = 40;
    this.rows = 40;
    this.cellSize = width / this.cols;

    /** @type {WallRect[]} */
    this.walls = [];
    /** @type {WallSegment[]} */
    this.segments = [];
    /** @type {DestructibleProp[]} */
    this.props = [];
    /** @type {Array<{x: number, y: number, radius: number, angle: number}>} */
    this.smokeVents = [];

    this.biome = 'cavern';
    this.generate();
  }

  generate() {
    this.walls = [];
    this.segments = [];
    this.props = [];
    this.smokeVents = [];

    const cols = this.cols;
    const rows = this.rows;

    // 1. Initialize cellular grid
    let grid = new Uint8Array(cols * rows);

    // Initial random fill (44% wall probability)
    const fillProb = 0.44;
    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;

        // Perimeter borders (2 cells thick) always wall
        if (r < 2 || r >= rows - 2 || c < 2 || c >= cols - 2) {
          grid[idx] = 1;
          continue;
        }

        // Center safe clearing (radius of 4 cells) always empty floor
        const dCenter = Math.hypot(c - centerCol, r - centerRow);
        if (dCenter <= 4) {
          grid[idx] = 0;
          continue;
        }

        grid[idx] = this.prng.random() < fillProb ? 1 : 0;
      }
    }

    // 2. Run 4 iterations of cellular automata smoothing
    for (let iter = 0; iter < 4; iter++) {
      grid = this._smoothGrid(grid, cols, rows, centerCol, centerRow);
    }

    // 3. Flood-fill connectivity from center to prune unreachable pockets
    this._ensureConnectivity(grid, cols, rows, centerCol, centerRow);

    // 4. Merge adjacent horizontal wall cells into WallRects to optimize collision & raycast
    this._buildWallRects(grid, cols, rows);

    // 5. Populate Props (corrupted server racks and explosive cells)
    this._populateCavernProps(grid, cols, rows);

    // 6. Add thermal memory vents
    this._addCavernVents();

    // 7. Compile wall segments for raycasting
    this._compileSegments();
  }

  /**
   * Cellular automata smoothing rule (B5678/S45678)
   */
  _smoothGrid(grid, cols, rows, centerCol, centerRow) {
    const next = new Uint8Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;

        // Keep perimeter walls solid
        if (r < 2 || r >= rows - 2 || c < 2 || c >= cols - 2) {
          next[idx] = 1;
          continue;
        }

        // Keep center clearing open
        if (Math.hypot(c - centerCol, r - centerRow) <= 4) {
          next[idx] = 0;
          continue;
        }

        // Count 8-neighbors
        let wallCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (grid[nr * cols + nc] === 1) {
              wallCount++;
            }
          }
        }

        next[idx] = wallCount >= 5 ? 1 : 0;
      }
    }

    return next;
  }

  /**
   * Flood-fill from center; fill in any unreachable cavities with solid rock
   */
  _ensureConnectivity(grid, cols, rows, centerCol, centerRow) {
    const visited = new Uint8Array(cols * rows);
    const queue = [centerRow * cols + centerCol];
    visited[centerRow * cols + centerCol] = 1;

    while (queue.length > 0) {
      const curr = queue.shift();
      const r = Math.floor(curr / cols);
      const c = curr % cols;

      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];

      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const nidx = nr * cols + nc;
          if (grid[nidx] === 0 && visited[nidx] === 0) {
            visited[nidx] = 1;
            queue.push(nidx);
          }
        }
      }
    }

    // Any floor cell not reached by the flood fill becomes solid wall
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 0 && visited[i] === 0) {
        grid[i] = 1;
      }
    }
  }

  /**
   * Merges contiguous horizontal wall cells into rectangular blocks
   */
  _buildWallRects(grid, cols, rows) {
    const visited = new Uint8Array(cols * rows);
    const cs = this.cellSize;
    const originX = -this.halfW;
    const originY = -this.halfH;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (grid[idx] === 1 && !visited[idx]) {
          // Span horizontally as far as possible
          let span = 1;
          while (c + span < cols && grid[r * cols + (c + span)] === 1 && !visited[r * cols + (c + span)]) {
            span++;
          }

          // Mark visited
          for (let s = 0; s < span; s++) {
            visited[r * cols + (c + s)] = 1;
          }

          const blockW = span * cs;
          const blockH = cs;
          const blockX = originX + c * cs + blockW * 0.5;
          const blockY = originY + r * cs + blockH * 0.5;

          this.walls.push(new WallRect(blockX, blockY, blockW, blockH, this.biome));
          c += span - 1;
        }
      }
    }
  }

  /**
   * Places props in open cavern spots away from walls
   */
  _populateCavernProps(grid, cols, rows) {
    const cs = this.cellSize;
    const originX = -this.halfW;
    const originY = -this.halfH;

    for (let r = 3; r < rows - 3; r += 2) {
      for (let c = 3; c < cols - 3; c += 2) {
        const idx = r * cols + c;
        if (grid[idx] === 0) {
          // Center clearing check
          const worldX = originX + c * cs + cs * 0.5;
          const worldY = originY + r * cs + cs * 0.5;
          if (Math.hypot(worldX, worldY) < 300) continue;

          // Check if adjacent to a cavern wall for thematic placement
          let nearWall = false;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (grid[(r + dr) * cols + (c + dc)] === 1) nearWall = true;
            }
          }

          if (nearWall && this.prng.random() < 0.22) {
            const propType = this.prng.random() < 0.6 ? PROP_TYPE.SERVER_RACK : PROP_TYPE.EXPLOSIVE_CELL;
            this.props.push(new DestructibleProp(worldX, worldY, propType));
          }
        }
      }
    }
  }

  _addCavernVents() {
    const count = 4;
    const angles = [0.3 * Math.PI, 0.8 * Math.PI, 1.3 * Math.PI, 1.8 * Math.PI];
    for (let i = 0; i < count; i++) {
      const dist = 700;
      this.smokeVents.push({
        x: Math.cos(angles[i]) * dist,
        y: Math.sin(angles[i]) * dist,
        radius: 80,
        angle: angles[i],
      });
    }
  }

  _compileSegments() {
    this.segments = [];
    for (const wall of this.walls) {
      this.segments.push(...wall.getSegments());
    }
  }

  /**
   * @returns {WallSegment[]}
   */
  getSegments() {
    return this.segments;
  }

  /**
   * Renders the decrypted cavern
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera2D.js').Camera2D} camera
   */
  render(ctx, camera) {
    ctx.save();

    // Render Cavern walls with amber / red encrypted glitch vector theme
    for (const wall of this.walls) {
      // Frustum culling
      if (
        wall.maxX < camera.x - camera.viewportWidth * 0.5 - 50 ||
        wall.minX > camera.x + camera.viewportWidth * 0.5 + 50 ||
        wall.maxY < camera.y - camera.viewportHeight * 0.5 - 50 ||
        wall.minY > camera.y + camera.viewportHeight * 0.5 + 50
      ) {
        continue;
      }

      ctx.fillStyle = '#0F0C0A';
      ctx.fillRect(wall.minX, wall.minY, wall.w, wall.h);

      ctx.strokeStyle = COLOR.AMBER_DIM;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wall.minX, wall.minY, wall.w, wall.h);

      // Organic cavern texture cross
      if (wall.w > 80) {
        ctx.strokeStyle = 'rgba(255, 176, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wall.minX + 4, wall.minY + 4);
        ctx.lineTo(wall.maxX - 4, wall.maxY - 4);
        ctx.stroke();
      }
    }

    // Render Thermal vents
    for (const vent of this.smokeVents) {
      ctx.strokeStyle = COLOR.AMBER_DIM;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vent.x, vent.y, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Render Props
    for (const prop of this.props) {
      if (!prop.markedForRemoval) {
        prop.render(ctx);
      }
    }

    ctx.restore();
  }
}
