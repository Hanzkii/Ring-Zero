/**
 * Ring Zero - High-Speed Vector Projectile Entity
 * Preallocated via ObjectPool for zero-allocation ballistics.
 */

import { Entity } from './Entity.js';
import { Vec2, lerp } from '../core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class Projectile extends Entity {
  constructor() {
    super(0, 0, 4, COLLISION_LAYER.PROJECTILE_PLAYER);

    this.damage = 10;
    this.speed = 1000;
    this.lifetime = 0;
    this.maxLifetime = 2.0;
    this.pierceCount = 1;
    this.hitsRemaining = 1;

    // Track hit entities to prevent double-hitting on a single tick
    /** @type {Set<number>} */
    this.hitEntityIds = new Set();

    this.color = COLOR.CYAN;
    this.tracerLength = 18;
    this.knockback = 120;
    this.isCritical = false;
  }

  /**
   * Initializes or recycles a projectile from the pool
   * @param {Object} params
   * @param {number} params.x
   * @param {number} params.y
   * @param {number} params.angle
   * @param {number} [params.speed=1000]
   * @param {number} [params.damage=25]
   * @param {number} [params.pierce=1]
   * @param {number} [params.maxLifetime=2.0]
   * @param {string} [params.color=COLOR.CYAN]
   * @param {number} [params.layer=COLLISION_LAYER.PROJECTILE_PLAYER]
   * @param {number} [params.knockback=120]
   * @param {boolean} [params.isCritical=false]
   */
  spawn({
    x,
    y,
    angle,
    speed = 1000,
    damage = 25,
    pierce = 1,
    maxLifetime = 2.0,
    color = COLOR.CYAN,
    layer = COLLISION_LAYER.PROJECTILE_PLAYER,
    knockback = 120,
    isCritical = false,
  }) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;

    this.rotation = angle;
    this.prevRotation = angle;

    this.speed = speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.damage = damage;
    this.pierceCount = pierce;
    this.hitsRemaining = pierce;
    this.lifetime = 0;
    this.maxLifetime = maxLifetime;
    this.color = color;
    this.layer = layer;
    this.knockback = knockback;
    this.isCritical = isCritical;

    this.tracerLength = Math.max(12, speed * 0.02);
    this.hitEntityIds.clear();

    this.active = true;
    this.markedForRemoval = false;
  }

  /**
   * Advances bullet trajectory
   * @param {number} dt
   */
  update(dt) {
    if (!this.active) return;

    this.preStep();
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.lifetime += dt;
    if (this.lifetime >= this.maxLifetime || this.hitsRemaining <= 0) {
      this.markedForRemoval = true;
    }
  }

  /**
   * Records a hit against an enemy or player
   * @param {import('./Entity.js').Entity} target
   * @returns {boolean} Whether projectile should be destroyed
   */
  onHit(target) {
    if (this.hitEntityIds.has(target.id)) return false;

    this.hitEntityIds.add(target.id);
    this.hitsRemaining--;

    if (this.hitsRemaining <= 0) {
      this.markedForRemoval = true;
      return true;
    }
    return false;
  }

  /**
   * Renders high-velocity vector bullet tracer
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha = 1.0) {
    if (!this.active) return;

    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);

    // Compute tracer tail point
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const tailX = rx - cos * this.tracerLength;
    const tailY = ry - sin * this.tracerLength;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.isCritical ? 2.5 : 1.5;

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Leading white-hot projectile tip
    ctx.fillStyle = COLOR.WHITE;
    ctx.fillRect(rx - 1, ry - 1, 2, 2);

    ctx.restore();
  }

  reset() {
    super.reset();
    this.hitEntityIds.clear();
    this.hitsRemaining = 1;
    this.lifetime = 0;
  }
}
