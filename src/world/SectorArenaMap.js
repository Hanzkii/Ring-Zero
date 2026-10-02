/**
 * Ring Zero - 4-Tier Protection Ring Dynamic Sector Arena Map
 * Preallocates static collision geometry (WallRect AABBs) and raycast WallSegments
 * for all 4 x86 Protection Rings. Zero GC allocations on 60Hz tick and ring elevations.
 */

import { CLEARANCE_RING, SECTOR_THEMES, COLOR } from '../core/Constants.js';
import { WallRect, WallSegment } from './MapGenerator.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class SectorArenaMap {
  constructor() {
    this.wallsByRing = {
      [CLEARANCE_RING.RING_3]: [],
      [CLEARANCE_RING.RING_2]: [],
      [CLEARANCE_RING.RING_1]: [],
      [CLEARANCE_RING.RING_0]: [],
    };

    this.segmentsByRing = {
      [CLEARANCE_RING.RING_3]: [],
      [CLEARANCE_RING.RING_2]: [],
      [CLEARANCE_RING.RING_1]: [],
      [CLEARANCE_RING.RING_0]: [],
    };

    this.propsByRing = {
      [CLEARANCE_RING.RING_3]: [],
      [CLEARANCE_RING.RING_2]: [],
      [CLEARANCE_RING.RING_1]: [],
      [CLEARANCE_RING.RING_0]: [],
    };

    this.smokeVentsByRing = {
      [CLEARANCE_RING.RING_3]: [],
      [CLEARANCE_RING.RING_2]: [],
      [CLEARANCE_RING.RING_1]: [],
      [CLEARANCE_RING.RING_0]: [],
    };

    // Preallocate all 4 ring sectors once at initialization
    this._buildRing3();
    this._buildRing2();
    this._buildRing1();
    this._buildRing0();

    this.currentRing = CLEARANCE_RING.RING_3;
    this.walls = this.wallsByRing[CLEARANCE_RING.RING_3];
    this.segments = this.segmentsByRing[CLEARANCE_RING.RING_3];
    this.props = this.propsByRing[CLEARANCE_RING.RING_3];
    this.smokeVents = this.smokeVentsByRing[CLEARANCE_RING.RING_3];
  }

  /**
   * Helper to convert a WallRect into 4 static raycast WallSegments
   * @param {WallRect} w
   * @param {WallSegment[]} segArr
   */
  _addSegmentsForRect(w, segArr) {
    segArr.push(new WallSegment(w.minX, w.minY, w.maxX, w.minY)); // Top
    segArr.push(new WallSegment(w.maxX, w.minY, w.maxX, w.maxY)); // Right
    segArr.push(new WallSegment(w.maxX, w.maxY, w.minX, w.maxY)); // Bottom
    segArr.push(new WallSegment(w.minX, w.maxY, w.minX, w.minY)); // Left
  }

  /**
   * Ring 3: Userland (1920x1080, 4 corner memory cache pillars)
   */
  _buildRing3() {
    const walls = this.wallsByRing[CLEARANCE_RING.RING_3];
    const segs = this.segmentsByRing[CLEARANCE_RING.RING_3];
    const w = 1920;
    const h = 1080;
    const hw = w * 0.5;
    const hh = h * 0.5;

    // 1. Boundary walls
    walls.push(new WallRect(0, -hh + 16, w, 32, 'userland')); // Top
    walls.push(new WallRect(0, hh - 16, w, 32, 'userland'));  // Bottom
    walls.push(new WallRect(-hw + 16, 0, 32, h, 'userland')); // Left
    walls.push(new WallRect(hw - 16, 0, 32, h, 'userland'));  // Right

    // 2. 4 Corner Memory Cache Pillars at (+-550, +-320) size 120x120
    walls.push(new WallRect(-550, -320, 120, 120, 'userland'));
    walls.push(new WallRect(550, -320, 120, 120, 'userland'));
    walls.push(new WallRect(-550, 320, 120, 120, 'userland'));
    walls.push(new WallRect(550, 320, 120, 120, 'userland'));

    for (const wall of walls) {
      this._addSegmentsForRect(wall, segs);
    }
  }

  /**
   * Ring 2: Hardware Drivers (1920x1080, DMA/PCIe bus corridor arena with segmented chokepoints)
   */
  _buildRing2() {
    const walls = this.wallsByRing[CLEARANCE_RING.RING_2];
    const segs = this.segmentsByRing[CLEARANCE_RING.RING_2];
    const w = 1920;
    const h = 1080;
    const hw = w * 0.5;
    const hh = h * 0.5;

    // 1. Boundary walls
    walls.push(new WallRect(0, -hh + 16, w, 32, 'drivers'));
    walls.push(new WallRect(0, hh - 16, w, 32, 'drivers'));
    walls.push(new WallRect(-hw + 16, 0, 32, h, 'drivers'));
    walls.push(new WallRect(hw - 16, 0, 32, h, 'drivers'));

    // 2. Left vertical divider (x = -320) with center chokepoint opening
    walls.push(new WallRect(-320, -300, 40, 360, 'drivers'));
    walls.push(new WallRect(-320, 300, 40, 360, 'drivers'));

    // 3. Right vertical divider (x = 320) with top & bottom chokepoints
    walls.push(new WallRect(320, 0, 40, 400, 'drivers'));

    // 4. Horizontal bus bar conduits
    walls.push(new WallRect(0, -260, 200, 32, 'drivers'));
    walls.push(new WallRect(0, 260, 200, 32, 'drivers'));

    for (const wall of walls) {
      this._addSegmentsForRect(wall, segs);
    }
  }

  /**
   * Ring 1: Hypervisor (1920x1080, virtual sandbox partitioned compartments with broken firewall obstacles)
   */
  _buildRing1() {
    const walls = this.wallsByRing[CLEARANCE_RING.RING_1];
    const segs = this.segmentsByRing[CLEARANCE_RING.RING_1];
    const w = 1920;
    const h = 1080;
    const hw = w * 0.5;
    const hh = h * 0.5;

    // 1. Boundary walls
    walls.push(new WallRect(0, -hh + 16, w, 32, 'hypervisor'));
    walls.push(new WallRect(0, hh - 16, w, 32, 'hypervisor'));
    walls.push(new WallRect(-hw + 16, 0, 32, h, 'hypervisor'));
    walls.push(new WallRect(hw - 16, 0, 32, h, 'hypervisor'));

    // 2. Quadrant firewall barriers
    walls.push(new WallRect(-280, -180, 32, 260, 'hypervisor'));
    walls.push(new WallRect(280, -180, 32, 260, 'hypervisor'));
    walls.push(new WallRect(-280, 180, 32, 260, 'hypervisor'));
    walls.push(new WallRect(280, 180, 32, 260, 'hypervisor'));

    // 3. Lateral firewall baffles
    walls.push(new WallRect(-520, 0, 260, 32, 'hypervisor'));
    walls.push(new WallRect(520, 0, 260, 32, 'hypervisor'));

    // 4. Broken sandbox pillars
    walls.push(new WallRect(-120, -260, 48, 48, 'hypervisor'));
    walls.push(new WallRect(120, -260, 48, 48, 'hypervisor'));
    walls.push(new WallRect(-120, 260, 48, 48, 'hypervisor'));
    walls.push(new WallRect(120, 260, 48, 48, 'hypervisor'));

    for (const wall of walls) {
      this._addSegmentsForRect(wall, segs);
    }
  }

  /**
   * Ring 0: Kernel Execution (1536x864 compact arena - 80% bounds, 4 sub-core pillars)
   */
  _buildRing0() {
    const walls = this.wallsByRing[CLEARANCE_RING.RING_0];
    const segs = this.segmentsByRing[CLEARANCE_RING.RING_0];
    const w = 1536;
    const h = 864;
    const hw = w * 0.5;
    const hh = h * 0.5;

    // 1. Shrunk compact boundary walls
    walls.push(new WallRect(0, -hh + 16, w, 32, 'kernel'));
    walls.push(new WallRect(0, hh - 16, w, 32, 'kernel'));
    walls.push(new WallRect(-hw + 16, 0, 32, h, 'kernel'));
    walls.push(new WallRect(hw - 16, 0, 32, h, 'kernel'));

    // 2. Central CPU sub-core pillars
    walls.push(new WallRect(-260, -150, 96, 96, 'kernel'));
    walls.push(new WallRect(260, -150, 96, 96, 'kernel'));
    walls.push(new WallRect(-260, 150, 96, 96, 'kernel'));
    walls.push(new WallRect(260, 150, 96, 96, 'kernel'));

    for (const wall of walls) {
      this._addSegmentsForRect(wall, segs);
    }
  }

  /**
   * Swaps active ring arena geometry without runtime GC allocations
   * @param {number|string} ring - 3, 2, 1, 0 or 'RING_3'..'RING_0'
   * @param {import('../systems/SpatialHashGrid.js').SpatialHashGrid} [spatialGrid]
   */
  setRing(ring, spatialGrid = null) {
    const key = typeof ring === 'string'
      ? ring
      : (ring === 0 ? CLEARANCE_RING.RING_0 : ring === 1 ? CLEARANCE_RING.RING_1 : ring === 2 ? CLEARANCE_RING.RING_2 : CLEARANCE_RING.RING_3);

    // Remove old walls from spatial grid
    if (spatialGrid && this.walls) {
      for (let i = 0; i < this.walls.length; i++) {
        spatialGrid.remove(this.walls[i]);
      }
    }

    this.currentRing = key;
    this.walls = this.wallsByRing[key] || this.wallsByRing[CLEARANCE_RING.RING_3];
    this.segments = this.segmentsByRing[key] || this.segmentsByRing[CLEARANCE_RING.RING_3];
    this.props = this.propsByRing[key] || [];
    this.smokeVents = this.smokeVentsByRing[key] || [];

    // Insert new walls into spatial grid
    if (spatialGrid && this.walls) {
      for (let i = 0; i < this.walls.length; i++) {
        spatialGrid.insert(this.walls[i]);
      }
    }
  }

  /**
   * Returns active static wall segments for line-of-sight raycasting
   * @returns {WallSegment[]}
   */
  getSegments() {
    return this.segments;
  }

  /**
   * Renders the arena walls, architectural details, and Ring 0 hazard perimeter
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera2D.js').Camera2D} camera
   * @param {Object} theme
   */
  render(ctx, camera, theme) {
    const accent = theme.accent || COLOR.CYAN;
    const accentDim = theme.accentDim || COLOR.CYAN_DIM;
    const isRing0 = this.currentRing === CLEARANCE_RING.RING_0 || theme.ring === 0;

    ctx.save();

    // 1. Draw Ring 0 outer 60px pulsating hazard margin
    if (isRing0) {
      const hw = 1536 * 0.5 - 32;
      const hh = 864 * 0.5 - 32;
      const m = 60;
      const pulse = 0.15 + 0.1 * Math.sin(performance.now() * 0.008);

      ctx.fillStyle = `rgba(255, 0, 60, ${pulse})`;
      // Top hazard zone
      ctx.fillRect(-hw, -hh, hw * 2, m);
      // Bottom hazard zone
      ctx.fillRect(-hw, hh - m, hw * 2, m);
      // Left hazard zone
      ctx.fillRect(-hw, -hh + m, m, (hh - m) * 2);
      // Right hazard zone
      ctx.fillRect(hw - m, -hh + m, m, (hh - m) * 2);

      // Hazard boundary dashed line
      ctx.strokeStyle = '#FF003C';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(-hw + m, -hh + m, (hw - m) * 2, (hh - m) * 2);
      ctx.setLineDash([]);
    }

    // 2. Draw interior obstacle walls & pillars
    ctx.lineWidth = 2;
    for (let i = 0; i < this.walls.length; i++) {
      const w = this.walls[i];

      // Dark translucent backing
      ctx.fillStyle = 'rgba(7, 10, 15, 0.9)';
      ctx.fillRect(w.minX, w.minY, w.w, w.h);

      // Wireframe border
      ctx.strokeStyle = accent;
      ctx.strokeRect(w.minX, w.minY, w.w, w.h);

      // Interior geometric crosshatch
      if (w.w >= 64 && w.h >= 64) {
        ctx.strokeStyle = accentDim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w.minX + 8, w.minY + 8);
        ctx.lineTo(w.maxX - 8, w.maxY - 8);
        ctx.moveTo(w.maxX - 8, w.minY + 8);
        ctx.lineTo(w.minX + 8, w.maxY - 8);
        ctx.stroke();
        ctx.lineWidth = 2;

        VectorRenderer.drawTargetBracket(ctx, w.x, w.y, Math.min(w.w, w.h) * 0.45, accent, 4);
      }
    }

    ctx.restore();
  }
}
