/**
 * Ring Zero - Seedable PRNG & Procedural World Generator Base
 * Implements deterministic 32-bit Mulberry32 PRNG and map geometry data structures.
 */

import { COLLISION_LAYER } from '../core/Constants.js';

export class PRNG {
  /**
   * @param {number} [seed=1337]
   */
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
  }

  /**
   * Generates a pseudo-random 32-bit float in [0, 1) using Mulberry32
   * @returns {number}
   */
  random() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Random integer in [min, max] inclusive
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  rangeInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Random float in [min, max)
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  rangeFloat(min, max) {
    return min + this.random() * (max - min);
  }
}

/**
 * Represents a static line segment wall for 2D raycasting and SAT collision
 */
export class WallSegment {
  /**
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {string} [type='solid']
   */
  constructor(x1, y1, x2, y2, type = 'solid') {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.type = type;

    // Normal vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    this.nx = len > 0 ? -dy / len : 0;
    this.ny = len > 0 ? dx / len : 0;
  }
}

/**
 * Represents an axis-aligned static wall block
 */
export class WallRect {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {string} [biome='facility']
   */
  constructor(x, y, w, h, biome = 'facility') {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.biome = biome;
    this.layer = COLLISION_LAYER.WALL;
    this.active = true;

    this.minX = x - w * 0.5;
    this.minY = y - h * 0.5;
    this.maxX = x + w * 0.5;
    this.maxY = y + h * 0.5;

    // Bounding radius for spatial queries
    this.radius = Math.sqrt(w * w + h * h) * 0.5;
  }

  /**
   * Returns the 4 boundary line segments for raycasting
   * @returns {WallSegment[]}
   */
  getSegments() {
    return [
      new WallSegment(this.minX, this.minY, this.maxX, this.minY), // Top
      new WallSegment(this.maxX, this.minY, this.maxX, this.maxY), // Right
      new WallSegment(this.maxX, this.maxY, this.minX, this.maxY), // Bottom
      new WallSegment(this.minX, this.maxY, this.minX, this.minY), // Left
    ];
  }
}
