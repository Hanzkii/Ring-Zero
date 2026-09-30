/**
 * Ring Zero - High-Performance 2D Vector Math Library
 * Pure ES6+. Zero external dependencies.
 */

export class Vec2 {
  /**
   * @param {number} [x=0]
   * @param {number} [y=0]
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  addXY(x, y) {
    this.x += x;
    this.y += y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  subXY(x, y) {
    this.x -= x;
    this.y -= y;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  divide(s) {
    if (s !== 0) {
      this.x /= s;
      this.y /= s;
    }
    return this;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  normalize() {
    const m = this.mag();
    if (m > 0.00001) {
      this.x /= m;
      this.y /= m;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  dist(v) {
    return Math.sqrt(this.distSq(v));
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  angleTo(v) {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = this.x * cos - this.y * sin;
    const ry = this.x * sin + this.y * cos;
    this.x = rx;
    this.y = ry;
    return this;
  }

  lerp(target, t) {
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    return this;
  }

  clampLength(max) {
    const mSq = this.magSq();
    if (mSq > max * max && mSq > 0) {
      const scale = max / Math.sqrt(mSq);
      this.x *= scale;
      this.y *= scale;
    }
    return this;
  }

  static fromAngle(angle, length = 1) {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static zero() {
    return new Vec2(0, 0);
  }
}

/**
 * Normalizes an angle into the [-PI, PI] range
 * @param {number} angle
 * @returns {number}
 */
export function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Computes shortest angular distance between two angles
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function angleDiff(from, to) {
  return normalizeAngle(to - from);
}

/**
 * Linear interpolation
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Value clamp
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Random float in range [min, max)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
