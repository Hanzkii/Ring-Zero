/**
 * Ring Zero - Biome 1: Binary Space Partitioned (BSP) Facility Map
 * Procedural server facility with rooms, connecting corridors, destructible server racks, and cooling units.
 */

import { WORLD, COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { PRNG, WallRect, WallSegment } from './MapGenerator.js';
import { DestructibleProp, PROP_TYPE } from './DestructibleProp.js';

class BSPNode {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left = null;
    this.right = null;
    this.room = null;
  }
}

export class BSPFacilityMap {
  /**
   * @param {number} [seed=1337]
   * @param {number} [width=WORLD.DEFAULT_WIDTH]
   * @param {number} [height=WORLD.DEFAULT_HEIGHT]
   */
  constructor(seed = 1337, width = WORLD.DEFAULT_WIDTH, height = WORLD.DEFAULT_HEIGHT) {
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.halfW = width * 0.5;
    this.halfH = height * 0.5;
    this.prng = new PRNG(seed);

    /** @type {WallRect[]} */
    this.walls = [];
    /** @type {WallSegment[]} */
    this.segments = [];
    /** @type {DestructibleProp[]} */
    this.props = [];
    /** @type {Array<{x: number, y: number, radius: number, angle: number}>} */
    this.smokeVents = [];

    this.biome = 'facility';
    this.generate();
  }

  generate() {
    this.walls = [];
    this.segments = [];
    this.props = [];
    this.smokeVents = [];

    const pad = 32;
    const hw = this.halfW;
    const hh = this.halfH;

    // 1. Perimeter Boundary Walls (32px thickness)
    this.walls.push(new WallRect(0, -hh + 16, this.width, 32, this.biome)); // Top
    this.walls.push(new WallRect(0, hh - 16, this.width, 32, this.biome));  // Bottom
    this.walls.push(new WallRect(-hw + 16, 0, 32, this.height, this.biome)); // Left
    this.walls.push(new WallRect(hw - 16, 0, 32, this.height, this.biome));  // Right

    // 2. BSP Tree generation for interior server sectors
    const usableW = this.width - pad * 4;
    const usableH = this.height - pad * 4;
    const root = new BSPNode(-usableW * 0.5, -usableH * 0.5, usableW, usableH);

    this._splitNode(root, 3); // 3 split levels -> 8 partition sectors

    // 3. Collect rooms from BSP leaves
    const rooms = [];
    this._createRooms(root, rooms);

    // 4. Generate interior partition walls with wide doorway openings
    this._generateCorridorWalls(rooms);

    // 5. Populate props (Server racks & explosive cooling units)
    this._populateProps(rooms);

    // 6. Add atmospheric cooling vents
    this._addSmokeVents();

    // 7. Compile all wall segments for raycasting
    this._compileSegments();
  }

  /**
   * Recursively split BSP nodes
   * @param {BSPNode} node
   * @param {number} depth
   */
  _splitNode(node, depth) {
    if (depth <= 0) return;

    // Decide split direction based on aspect ratio or random
    const splitHoriz = node.w > node.h * 1.25 ? false : node.h > node.w * 1.25 ? true : this.prng.random() > 0.5;

    if (splitHoriz) {
      if (node.h < 500) return;
      const splitPos = node.h * this.prng.rangeFloat(0.4, 0.6);
      node.left = new BSPNode(node.x, node.y, node.w, splitPos);
      node.right = new BSPNode(node.x, node.y + splitPos, node.w, node.h - splitPos);
    } else {
      if (node.w < 500) return;
      const splitPos = node.w * this.prng.rangeFloat(0.4, 0.6);
      node.left = new BSPNode(node.x, node.y, splitPos, node.h);
      node.right = new BSPNode(node.x + splitPos, node.y, node.w - splitPos, node.h);
    }

    this._splitNode(node.left, depth - 1);
    this._splitNode(node.right, depth - 1);
  }

  /**
   * Create padded rooms within leaf nodes
   * @param {BSPNode} node
   * @param {Array<{x: number, y: number, w: number, h: number, cx: number, cy: number}>} rooms
   */
  _createRooms(node, rooms) {
    if (node.left && node.right) {
      this._createRooms(node.left, rooms);
      this._createRooms(node.right, rooms);
      return;
    }

    // Leaf node
    const margin = 24;
    const roomW = Math.max(300, node.w - margin * 2);
    const roomH = Math.max(300, node.h - margin * 2);
    const roomX = node.x + (node.w - roomW) * 0.5;
    const roomY = node.y + (node.h - roomH) * 0.5;

    const room = {
      x: roomX,
      y: roomY,
      w: roomW,
      h: roomH,
      cx: roomX + roomW * 0.5,
      cy: roomY + roomH * 0.5,
    };
    node.room = room;
    rooms.push(room);
  }

  /**
   * Generates partition wall blocks between adjacent room boundaries with wide corridors
   * @param {Array<{x: number, y: number, w: number, h: number, cx: number, cy: number}>} rooms
   */
  _generateCorridorWalls(rooms) {
    const wallThick = 24;
    const doorway = 220; // 220px wide passages for fluid combat navigation

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];

      // Add partial corner barrier pillars inside each room for cover
      // Keeping center hub (within 280px radius of 0,0) clear for spawn
      if (Math.hypot(r.cx, r.cy) > 300) {
        // Pillar obstacle in room quadrant
        const pillarW = 48;
        const pillarH = 48;
        const offsetX = (this.prng.random() > 0.5 ? 1 : -1) * (r.w * 0.28);
        const offsetY = (this.prng.random() > 0.5 ? 1 : -1) * (r.h * 0.28);
        this.walls.push(new WallRect(r.cx + offsetX, r.cy + offsetY, pillarW, pillarH, this.biome));
      }

      // Add partition dividers between rooms
      for (let j = i + 1; j < rooms.length; j++) {
        const r2 = rooms[j];
        // Check if adjacent horizontally
        const touchesH = Math.abs(r.x + r.w - r2.x) < 40 || Math.abs(r2.x + r2.w - r.x) < 40;
        const overlapY = Math.min(r.y + r.h, r2.y + r2.h) - Math.max(r.y, r2.y);

        if (touchesH && overlapY > 320) {
          const midX = (r.x + r.w + r2.x) * 0.5;
          const minY = Math.max(r.y, r2.y);
          const maxY = Math.min(r.y + r.h, r2.y + r2.h);
          const segLen = (maxY - minY - doorway) * 0.5;

          if (segLen > 40) {
            // Upper wall segment
            const topY = minY + segLen * 0.5;
            if (Math.hypot(midX, topY) > 260) {
              this.walls.push(new WallRect(midX, topY, wallThick, segLen, this.biome));
            }
            // Lower wall segment
            const botY = maxY - segLen * 0.5;
            if (Math.hypot(midX, botY) > 260) {
              this.walls.push(new WallRect(midX, botY, wallThick, segLen, this.biome));
            }
          }
        }

        // Check if adjacent vertically
        const touchesV = Math.abs(r.y + r.h - r2.y) < 40 || Math.abs(r2.y + r2.h - r.y) < 40;
        const overlapX = Math.min(r.x + r.w, r2.x + r2.w) - Math.max(r.x, r2.x);

        if (touchesV && overlapX > 320) {
          const midY = (r.y + r.h + r2.y) * 0.5;
          const minX = Math.max(r.x, r2.x);
          const maxX = Math.min(r.x + r.w, r2.x + r2.w);
          const segLen = (maxX - minX - doorway) * 0.5;

          if (segLen > 40) {
            // Left wall segment
            const leftX = minX + segLen * 0.5;
            if (Math.hypot(leftX, midY) > 260) {
              this.walls.push(new WallRect(leftX, midY, segLen, wallThick, this.biome));
            }
            // Right wall segment
            const rightX = maxX - segLen * 0.5;
            if (Math.hypot(rightX, midY) > 260) {
              this.walls.push(new WallRect(rightX, midY, segLen, wallThick, this.biome));
            }
          }
        }
      }
    }
  }

  /**
   * Places destructible server racks and explosive cooling units
   * @param {Array<{x: number, y: number, w: number, h: number, cx: number, cy: number}>} rooms
   */
  _populateProps(rooms) {
    for (const r of rooms) {
      // Do not clutter center spawn
      if (Math.hypot(r.cx, r.cy) < 320) continue;

      // 1 to 2 Server Racks per outer room
      const rackCount = this.prng.rangeInt(1, 2);
      for (let k = 0; k < rackCount; k++) {
        const px = r.cx + (this.prng.random() - 0.5) * (r.w * 0.5);
        const py = r.cy + (this.prng.random() - 0.5) * (r.h * 0.5);

        // Keep away from walls
        if (!this._isNearWall(px, py, 45)) {
          this.props.push(new DestructibleProp(px, py, PROP_TYPE.SERVER_RACK));
        }
      }

      // 40% chance for an explosive cooling cell
      if (this.prng.random() < 0.45) {
        const ex = r.cx + (this.prng.random() - 0.5) * (r.w * 0.6);
        const ey = r.cy + (this.prng.random() - 0.5) * (r.h * 0.6);
        if (!this._isNearWall(ex, ey, 50)) {
          this.props.push(new DestructibleProp(ex, ey, PROP_TYPE.EXPLOSIVE_CELL));
        }
      }
    }
  }

  _isNearWall(x, y, dist) {
    for (const w of this.walls) {
      if (
        x >= w.minX - dist &&
        x <= w.maxX + dist &&
        y >= w.minY - dist &&
        y <= w.maxY + dist
      ) {
        return true;
      }
    }
    return false;
  }

  _addSmokeVents() {
    // 3-4 cooling vents that emit dynamic particles
    const count = 4;
    const angles = [0.25 * Math.PI, 0.75 * Math.PI, 1.25 * Math.PI, 1.75 * Math.PI];
    for (let i = 0; i < count; i++) {
      const dist = 650 + (i % 2) * 150;
      const a = angles[i] + this.prng.rangeFloat(-0.2, 0.2);
      this.smokeVents.push({
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        radius: 70,
        angle: a,
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
   * Returns all static wall segments
   * @returns {WallSegment[]}
   */
  getSegments() {
    return this.segments;
  }

  /**
   * Renders the BSP Facility floor, walls, and props
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera2D.js').Camera2D} camera
   */
  render(ctx, camera) {
    ctx.save();

    // 1. Render floor panels / data tracks
    ctx.strokeStyle = COLOR.GRID_MINOR;
    ctx.lineWidth = 1;

    // 2. Render all static walls with high-contrast vector HUD outlines
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

      // Solid background fill for occlusion
      ctx.fillStyle = '#080C14';
      ctx.fillRect(wall.minX, wall.minY, wall.w, wall.h);

      // Razor-sharp vector perimeter stroke
      ctx.strokeStyle = COLOR.CYAN_DIM;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wall.minX, wall.minY, wall.w, wall.h);

      // Interior circuit grid detail on larger walls
      if (wall.w > 60 || wall.h > 60) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wall.minX + 4, wall.minY + 4);
        ctx.lineTo(wall.maxX - 4, wall.maxY - 4);
        ctx.stroke();
      }
    }

    // 3. Render Smoke Cooling Vents
    for (const vent of this.smokeVents) {
      ctx.strokeStyle = COLOR.CYAN_MUTED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vent.x, vent.y, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Vent grill lines
      ctx.beginPath();
      ctx.moveTo(vent.x - 14, vent.y - 14);
      ctx.lineTo(vent.x + 14, vent.y + 14);
      ctx.moveTo(vent.x + 14, vent.y - 14);
      ctx.lineTo(vent.x - 14, vent.y + 14);
      ctx.stroke();
    }

    // 4. Render Destructible Props
    for (const prop of this.props) {
      if (!prop.markedForRemoval) {
        prop.render(ctx);
      }
    }

    ctx.restore();
  }
}
