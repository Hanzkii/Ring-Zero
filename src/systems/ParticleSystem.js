/**
 * Ring Zero - High-Performance Vector Particle Engine
 * Fully pooled zero-allocation particle bursts for muzzle flashes, impacts, and explosions.
 */

import { ObjectPool } from '../core/ObjectPool.js';
import { COLOR } from '../core/Constants.js';
import { lerp, randomRange } from '../core/VectorMath.js';

class VectorParticle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.length = 6;
    this.color = COLOR.CYAN;
    this.lifetime = 0;
    this.maxLifetime = 0.3;
    this.friction = 5.0;
    this.active = false;
  }

  spawn(x, y, vx, vy, color = COLOR.CYAN, maxLifetime = 0.3, length = 6, friction = 4.0) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.maxLifetime = maxLifetime;
    this.lifetime = 0;
    this.length = length;
    this.friction = friction;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.prevX = this.x;
    this.prevY = this.y;

    const damp = Math.exp(-this.friction * dt);
    this.vx *= damp;
    this.vy *= damp;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.lifetime += dt;
    if (this.lifetime >= this.maxLifetime) {
      this.active = false;
    }
  }

  render(ctx, alpha = 1.0) {
    if (!this.active) return;

    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);
    const lifeRatio = 1.0 - this.lifetime / this.maxLifetime;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const tailFactor = Math.min(1.0, speed / 200);
    const tailX = rx - (this.vx * 0.03 * tailFactor);
    const tailY = ry - (this.vy * 0.03 * tailFactor);

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = Math.max(0, lifeRatio);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.restore();
  }

  reset() {
    this.active = false;
    this.lifetime = 0;
  }
}

export class ParticleSystem {
  constructor(capacity = 1024) {
    this.pool = new ObjectPool({
      factory: () => new VectorParticle(),
      reset: (p) => p.reset(),
      initialCapacity: capacity,
      maxCapacity: capacity * 2,
    });
    this.maxActive = 600;
  }

  /**
   * Sets maximum active particles allowed (e.g. 300 for Ring 0)
   * @param {number} maxCount
   */
  setMaxActive(maxCount) {
    this.maxActive = Math.max(50, maxCount);
  }

  /**
   * Spawns an omnidirectional spark burst
   * @param {number} x
   * @param {number} y
   * @param {number} [count=12]
   * @param {string} [color=COLOR.CYAN]
   * @param {number} [baseSpeed=300]
   */
  emitBurst(x, y, count = 12, color = COLOR.CYAN, baseSpeed = 300) {
    if (this.pool.activeCount >= this.maxActive) return;
    const spawnCount = Math.min(count, this.maxActive - this.pool.activeCount);

    for (let i = 0; i < spawnCount; i++) {
      const p = this.pool.obtain();
      if (!p) break;

      const angle = (i / spawnCount) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = baseSpeed * randomRange(0.4, 1.4);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = randomRange(0.2, 0.45);
      const len = randomRange(4, 10);

      p.spawn(x, y, vx, vy, color, life, len, randomRange(3.5, 6.0));
    }
  }

  /**
   * Spawns directional impact sparks (e.g. bullet ricochet or shield deflection)
   * @param {number} x
   * @param {number} y
   * @param {number} hitAngle - Incoming bullet angle
   * @param {number} [count=6]
   * @param {string} [color=COLOR.WHITE]
   */
  emitImpact(x, y, hitAngle, count = 6, color = COLOR.WHITE) {
    if (this.pool.activeCount >= this.maxActive) return;
    const spawnCount = Math.min(count, this.maxActive - this.pool.activeCount);

    const bounceAngle = hitAngle + Math.PI; // Deflect back
    for (let i = 0; i < spawnCount; i++) {
      const p = this.pool.obtain();
      if (!p) break;

      const angle = bounceAngle + randomRange(-0.8, 0.8);
      const speed = randomRange(150, 450);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = randomRange(0.15, 0.35);

      p.spawn(x, y, vx, vy, color, life, randomRange(4, 8), 6.0);
    }
  }

  /**
   * Updates all active particles and reclaims dead ones
   * @param {number} dt
   */
  update(dt) {
    this.pool.forEachActiveReverse((p) => {
      p.update(dt);
      if (!p.active) {
        this.pool.release(p);
      }
    });
  }

  /**
   * Renders active particles with optional off-screen frustum culling
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {import('../core/Camera2D.js').Camera2D} [camera=null]
   */
  render(ctx, alpha = 1.0, camera = null) {
    this.pool.forEachActive((p) => {
      if (camera && typeof camera.isInView === 'function') {
        const rx = lerp(p.prevX, p.x, alpha);
        const ry = lerp(p.prevY, p.y, alpha);
        if (!camera.isInView(rx, ry, 64)) return;
      }
      p.render(ctx, alpha);
    });
  }

  /**
   * Reclaims all active particles back to the object pool
   */
  clear() {
    this.pool.releaseAll();
  }
}
