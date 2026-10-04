/**
 * Ring Zero - 2D Smooth Viewport Camera with Screen Trauma and Mouse Lead
 * Features high-DPI canvas transform, non-linear trauma shake, and coordinate projection.
 */

import { Vec2, clamp } from './VectorMath.js';

export class Camera2D {
  /**
   * @param {number} width - CSS width of viewport
   * @param {number} height - CSS height of viewport
   */
  constructor(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

    // Camera position in world space
    this.pos = new Vec2(0, 0);
    this.prevPos = new Vec2(0, 0);
    this.targetPos = new Vec2(0, 0);

    // Follow dynamics
    this.followSpeed = 10.0; // Lerp stiffness
    this.leadFactor = 0.22;  // Percentage of mouse distance to lead forward
    this.maxLeadDistance = 160;

    // Screen shake / trauma system
    this.traumaMultiplier = 1.0;
    this.trauma = 0;          // Value in [0, 1]
    this.traumaDecay = 1.6;   // Decay rate per second
    this.maxShakeOffset = 24; // Maximum pixel translation at trauma = 1
    this.maxShakeAngle = 0.05;// Maximum rotation in radians at trauma = 1
    this.shakeOffset = new Vec2(0, 0);
    this.shakeAngle = 0;
    this.screenFlash = 0;

    // World bounds clamping (optional)
    this.bounds = null; // { minX, minY, maxX, maxY }
  }

  get x() {
    return this.pos.x;
  }

  set x(val) {
    this.pos.x = val;
  }

  get y() {
    return this.pos.y;
  }

  set y(val) {
    this.pos.y = val;
  }

  resize(width, height, dpr = 1) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.dpr = dpr;
  }

  /**
   * Adds trauma to screen shake [0, 1]
   * @param {number} amount
   */
  addTrauma(amount) {
    const mult = this.traumaMultiplier !== undefined ? this.traumaMultiplier : 1.0;
    this.trauma = clamp(this.trauma + amount * mult, 0, 1.0);
  }

  /**
   * Sets world boundaries to clamp camera position
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   */
  setBounds(minX, minY, maxX, maxY) {
    this.bounds = { minX, minY, maxX, maxY };
  }

  /**
   * Updates camera simulation state
   * @param {number} dt - delta time in seconds
   * @param {Vec2} target - Target world position (e.g. player)
   * @param {Vec2} [aimVector] - Target aim vector
   * @param {number} [aimDistance=0] - Distance from target to pointer
   */
  update(dt, target, aimVector = null, aimDistance = 0) {
    this.prevPos.copy(this.pos);

    // Desired destination
    this.targetPos.copy(target);

    // Apply forward lead toward aim vector
    if (aimVector && aimDistance > 10) {
      const lead = Math.min(aimDistance * this.leadFactor, this.maxLeadDistance);
      this.targetPos.x += aimVector.x * lead;
      this.targetPos.y += aimVector.y * lead;
    }

    // Exponential smoothing
    const t = 1.0 - Math.exp(-this.followSpeed * dt);
    this.pos.lerp(this.targetPos, t);

    // Optional bounds clamping
    if (this.bounds) {
      const halfW = (this.viewportWidth * 0.5);
      const halfH = (this.viewportHeight * 0.5);
      this.pos.x = clamp(this.pos.x, this.bounds.minX + halfW, this.bounds.maxX - halfW);
      this.pos.y = clamp(this.pos.y, this.bounds.minY + halfH, this.bounds.maxY - halfH);
    }

    // Screen trauma shake update
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);
      const shake = this.trauma * this.trauma; // Non-linear falloff feels punchy
      
      const angle = (Math.random() * 2 - 1) * Math.PI;
      const mag = shake * this.maxShakeOffset * (0.5 + Math.random() * 0.5);
      this.shakeOffset.set(Math.cos(angle) * mag, Math.sin(angle) * mag);
      this.shakeAngle = (Math.random() * 2 - 1) * this.maxShakeAngle * shake;
    } else {
      this.shakeOffset.set(0, 0);
      this.shakeAngle = 0;
    }

    if (this.screenFlash > 0) {
      this.screenFlash = Math.max(0, this.screenFlash - dt * 3.5);
    }
  }

  /**
   * Applies the camera 2D transformation matrix to CanvasRenderingContext2D
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [alpha=1] - Sub-frame interpolation factor
   */
  begin(ctx, alpha = 1.0) {
    ctx.save();

    // Scale context for high-DPI display rendering
    ctx.scale(this.dpr, this.dpr);

    // Interpolate position between ticks for perfectly smooth 144Hz+ rendering
    const renderX = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha + this.shakeOffset.x;
    const renderY = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha + this.shakeOffset.y;

    // Center the viewport on target position
    const centerX = Math.round(this.viewportWidth * 0.5);
    const centerY = Math.round(this.viewportHeight * 0.5);

    ctx.translate(centerX, centerY);

    if (this.shakeAngle !== 0) {
      ctx.rotate(this.shakeAngle);
    }

    ctx.translate(-Math.round(renderX), -Math.round(renderY));
  }

  /**
   * Restores context after world rendering
   * @param {CanvasRenderingContext2D} ctx
   */
  end(ctx) {
    ctx.restore();
  }

  /**
   * Converts screen pixel coordinates into world coordinates
   * @param {number} sx - Screen X (CSS pixels)
   * @param {number} sy - Screen Y (CSS pixels)
   * @param {Vec2} [out] - Result vector
   * @returns {Vec2}
   */
  screenToWorld(sx, sy, out = new Vec2()) {
    const centerX = this.viewportWidth * 0.5;
    const centerY = this.viewportHeight * 0.5;
    out.x = sx - centerX + this.pos.x;
    out.y = sy - centerY + this.pos.y;
    return out;
  }

  /**
   * Converts world coordinates into screen pixel coordinates
   * @param {number} wx - World X
   * @param {number} wy - World Y
   * @param {Vec2} [out] - Result vector
   * @returns {Vec2}
   */
  worldToScreen(wx, wy, out = new Vec2()) {
    const centerX = this.viewportWidth * 0.5;
    const centerY = this.viewportHeight * 0.5;
    out.x = wx - this.pos.x + centerX;
    out.y = wy - this.pos.y + centerY;
    return out;
  }

  /**
   * Computes the current visible frustum bounding box in world coordinates
   * @param {number} [margin=64] - Extra padding around frustum
   * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
   */
  getVisibleBounds(margin = 64) {
    const halfW = (this.viewportWidth * 0.5) + margin;
    const halfH = (this.viewportHeight * 0.5) + margin;
    return {
      minX: this.pos.x - halfW,
      minY: this.pos.y - halfH,
      maxX: this.pos.x + halfW,
      maxY: this.pos.y + halfH,
    };
  }

  /**
   * Fast AABB check whether a world coordinate is inside the visible viewport
   * @param {number} x
   * @param {number} y
   * @param {number} [margin=64]
   * @returns {boolean}
   */
  isInView(x, y, margin = 64) {
    const halfW = (this.viewportWidth * 0.5) + margin;
    const halfH = (this.viewportHeight * 0.5) + margin;
    return (
      x >= this.pos.x - halfW &&
      x <= this.pos.x + halfW &&
      y >= this.pos.y - halfH &&
      y <= this.pos.y + halfH
    );
  }
}
