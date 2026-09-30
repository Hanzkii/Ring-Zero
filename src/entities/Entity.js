/**
 * Ring Zero - Base Entity Class
 * Foundation for player, swarm enemies, projectiles, drops, and obstacles.
 */

import { Vec2, lerp, normalizeAngle } from '../core/VectorMath.js';
import { COLLISION_LAYER } from '../core/Constants.js';

let _nextEntityId = 1;

export class Entity {
  /**
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [radius=16]
   * @param {number} [layer=COLLISION_LAYER.NONE]
   */
  constructor(x = 0, y = 0, radius = 16, layer = COLLISION_LAYER.NONE) {
    this.id = _nextEntityId++;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;

    this.vx = 0;
    this.vy = 0;
    this.radius = radius;

    this.rotation = 0;
    this.prevRotation = 0;

    this.layer = layer;
    this.active = true;
    this.markedForRemoval = false;

    // Temporary vector to avoid allocations in interpolated reads
    this._interpVec = new Vec2();
  }

  /**
   * Records current position before advancing fixed simulation step
   */
  preStep() {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevRotation = this.rotation;
  }

  /**
   * Advances simulation kinematics
   * @param {number} dt - Fixed delta time
   */
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * Returns interpolated position for render frame
   * @param {number} alpha - In [0, 1]
   * @param {Vec2} [out]
   * @returns {Vec2}
   */
  getInterpolatedPos(alpha, out = this._interpVec) {
    out.x = lerp(this.prevX, this.x, alpha);
    out.y = lerp(this.prevY, this.y, alpha);
    return out;
  }

  /**
   * Returns shortest angular interpolated orientation
   * @param {number} alpha
   * @returns {number}
   */
  getInterpolatedRotation(alpha) {
    let diff = this.rotation - this.prevRotation;
    diff = normalizeAngle(diff);
    return this.prevRotation + diff * alpha;
  }

  /**
   * Virtual render callback
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha) {
    // Overridden by derived entities
  }

  /**
   * Resets entity state for object pooling
   */
  reset() {
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.prevRotation = 0;
    this.active = true;
    this.markedForRemoval = false;
  }
}
