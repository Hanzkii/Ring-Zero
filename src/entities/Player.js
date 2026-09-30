/**
 * Ring Zero - Player Entity
 * High-agility cyber-chassis with vector wireframe aesthetics and dash kinematics.
 */

import { Entity } from './Entity.js';
import { Vec2, lerp, normalizeAngle } from '../core/VectorMath.js';
import { PLAYER_CONFIG, COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';

export class Player extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x = 0, y = 0) {
    super(x, y, PLAYER_CONFIG.RADIUS, COLLISION_LAYER.PLAYER);

    // Dynamic stats
    this.maxHealth = PLAYER_CONFIG.MAX_HEALTH;
    this.health = this.maxHealth;
    this.maxSpeed = PLAYER_CONFIG.MAX_SPEED;
    this.acceleration = PLAYER_CONFIG.ACCELERATION;
    this.friction = PLAYER_CONFIG.FRICTION;

    // Dash kinematics
    this.dashCooldown = PLAYER_CONFIG.DASH_COOLDOWN;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.isDashing = false;
    this.dashDirection = new Vec2(1, 0);

    // Trail buffer for dash ghost effect
    /** @type {Array<{x: number, y: number, rotation: number, alpha: number}>} */
    this.dashTrails = [];

    // Aim orientation target
    this.targetRotation = 0;
  }

  /**
   * Triggers the high-velocity dash impulse
   * @param {Vec2} dir - Normalized direction vector
   * @returns {boolean} Whether dash succeeded
   */
  dash(dir) {
    if (this.dashCooldownTimer > 0) return false;

    // If standing still, dash in facing direction
    if (dir.magSq() < 0.01) {
      this.dashDirection.set(Math.cos(this.rotation), Math.sin(this.rotation));
    } else {
      this.dashDirection.copy(dir).normalize();
    }

    this.isDashing = true;
    this.dashTimer = PLAYER_CONFIG.DASH_DURATION;
    this.dashCooldownTimer = PLAYER_CONFIG.DASH_COOLDOWN;

    // Apply high burst velocity
    this.vx = this.dashDirection.x * PLAYER_CONFIG.DASH_IMPULSE;
    this.vy = this.dashDirection.y * PLAYER_CONFIG.DASH_IMPULSE;

    return true;
  }

  /**
   * Updates player kinematics, dash timers, and facing orientation
   * @param {number} dt - Fixed simulation step
   * @param {Vec2} moveDir - Normalized input movement vector
   * @param {number} aimAngle - Aim orientation from mouse pointer
   */
  updateKinematics(dt, moveDir, aimAngle) {
    this.preStep();

    // Dash timer update
    if (this.isDashing) {
      this.dashTimer -= dt;
      // Record motion trail
      this.dashTrails.push({
        x: this.x,
        y: this.y,
        rotation: this.rotation,
        alpha: 0.8,
      });

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Normal movement kinematics
      if (moveDir.magSq() > 0.001) {
        this.vx += moveDir.x * this.acceleration * dt;
        this.vy += moveDir.y * this.acceleration * dt;

        // Clamp to max speed
        const speedSq = this.vx * this.vx + this.vy * this.vy;
        if (speedSq > this.maxSpeed * this.maxSpeed) {
          const s = this.maxSpeed / Math.sqrt(speedSq);
          this.vx *= s;
          this.vy *= s;
        }
      } else {
        // Friction damping
        const damp = Math.exp(-this.friction * dt);
        this.vx *= damp;
        this.vy *= damp;
        if (Math.abs(this.vx) < 1) this.vx = 0;
        if (Math.abs(this.vy) < 1) this.vy = 0;
      }
    }

    // Advance position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Facing rotation tracks mouse aim smoothly
    this.targetRotation = aimAngle;
    const diff = normalizeAngle(this.targetRotation - this.rotation);
    this.rotation += diff * Math.min(1.0, 24.0 * dt);

    // Dash cooldown
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    }

    // Age out dash trails
    for (let i = this.dashTrails.length - 1; i >= 0; i--) {
      this.dashTrails[i].alpha -= dt * 4.5;
      if (this.dashTrails[i].alpha <= 0) {
        this.dashTrails.splice(i, 1);
      }
    }
  }

  /**
   * Renders the player wireframe chassis and active dash trails
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha = 1.0) {
    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);
    const rot = this.getInterpolatedRotation(alpha);

    // 1. Draw motion ghost trails
    for (const trail of this.dashTrails) {
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.rotation);
      ctx.globalAlpha = trail.alpha;
      this._drawChassis(ctx, COLOR.CYAN_MUTED, false);
      ctx.restore();
    }

    // 2. Draw main chassis
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rot);

    const hullColor = this.isDashing ? COLOR.WHITE : COLOR.CYAN;
    this._drawChassis(ctx, hullColor, true);

    ctx.restore();
  }

  /**
   * Wireframe hull drawing routines
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} color
   * @param {boolean} details
   */
  _drawChassis(ctx, color, details) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Outer geometric chevron / diamond hull
    ctx.beginPath();
    ctx.moveTo(18, 0);     // Nose
    ctx.lineTo(-10, -13);  // Left wing
    ctx.lineTo(-5, 0);     // Inward engine notch
    ctx.lineTo(-10, 13);   // Right wing
    ctx.closePath();
    ctx.stroke();

    if (details) {
      // Inner core diamond
      ctx.strokeStyle = COLOR.WHITE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-2, -5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-2, 5);
      ctx.closePath();
      ctx.stroke();

      // Wing telemetry fin ticks
      ctx.strokeStyle = COLOR.CYAN_DIM;
      ctx.beginPath();
      ctx.moveTo(-10, -13);
      ctx.lineTo(-16, -16);
      ctx.moveTo(-10, 13);
      ctx.lineTo(-16, 16);
      ctx.stroke();

      // Forward targeting ray line
      ctx.strokeStyle = COLOR.CYAN_MUTED;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();
    }
  }

  get dashReady() {
    return this.dashCooldownTimer <= 0;
  }

  get dashCooldownPercent() {
    return Math.max(0, 1.0 - this.dashCooldownTimer / this.dashCooldown);
  }
}
