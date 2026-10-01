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

    // Health & Combat stats
    this.baseMaxHealth = PLAYER_CONFIG.MAX_HEALTH;
    this.maxHealth = this.baseMaxHealth;
    this.health = this.maxHealth;
    this.baseMaxSpeed = PLAYER_CONFIG.MAX_SPEED;
    this.maxSpeed = this.baseMaxSpeed;
    this.acceleration = PLAYER_CONFIG.ACCELERATION;
    this.friction = PLAYER_CONFIG.FRICTION;

    // Invulnerability frames & feedback
    this.iFramesTimer = 0;
    this.hitFlashTimer = 0;

    // Progression: XP & Level
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.pendingLevelUps = 0;
    this.baseMagnetRadius = 180;
    this.magnetRadius = this.baseMagnetRadius;

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

    // Visual angle desync offset (driven by Spinbot.asi)
    this.visualRotationOffset = 0;
    this.visualAngle = 0;
    this.renderAngle = 0;
    this.desyncAngle = 0;
    this.spinOffset = 0;

    // Developer debug god mode & noclip
    this.godMode = false;
    this.noclip = false;

    // Animation elapsed timer for thrusters and shield shimmer
    this.animTime = 0;
  }

  /**
   * Applies damage to player and starts invulnerability frames
   * @param {number} amount
   * @returns {boolean} Whether player was destroyed
   */
  takeDamage(amount) {
    if (this.godMode || this.iFramesTimer > 0 || this.isDashing) return false;

    this.health = Math.max(0, this.health - amount);
    this.iFramesTimer = 0.45; // 450ms invulnerability window
    this.hitFlashTimer = 0.12;

    if (this.health <= 0) {
      this.markedForRemoval = true;
      return true;
    }
    return false;
  }

  /**
   * Resets player state for a fresh run
   */
  reset() {
    this.maxHealth = this.baseMaxHealth;
    this.health = this.maxHealth;
    this.maxSpeed = this.baseMaxSpeed;
    this.magnetRadius = this.baseMagnetRadius;
    this.markedForRemoval = false;
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.pendingLevelUps = 0;
    this.bounties = 0;
    this.iFramesTimer = 0;
    this.hitFlashTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.isDashing = false;
    this.dashTrails = [];
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.prevRotation = 0;
    this.targetRotation = 0;
    this.visualRotationOffset = 0;
    this.visualAngle = 0;
    this.renderAngle = 0;
    this.desyncAngle = 0;
    this.spinOffset = 0;
    this.godMode = false;
    this.noclip = false;
  }

  /**
   * Grants XP from collected memory fragments
   * @param {number} amount
   */
  addXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.35);
      this.pendingLevelUps++;
    }
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
    this.animTime += dt;

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

    // Invulnerability and hit flash timers
    if (this.iFramesTimer > 0) {
      this.iFramesTimer = Math.max(0, this.iFramesTimer - dt);
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

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
  /**
   * Renders the player wireframe chassis, thruster plumes, and active dash trails
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha = 1.0) {
    // If under invulnerability frames, flicker periodically (20Hz)
    if (this.iFramesTimer > 0 && Math.floor(this.iFramesTimer * 40) % 2 === 0) {
      return;
    }

    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);
    const rot = this.getInterpolatedRotation(alpha) + (this.visualRotationOffset || 0);

    // 1. Draw motion ghost trails
    for (const trail of this.dashTrails) {
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.rotation);
      ctx.globalAlpha = trail.alpha;
      this._drawChassis(ctx, COLOR.CYAN_MUTED, false);
      ctx.restore();
    }

    // 2. Draw shield shimmer / integrity aura
    this._drawShieldAura(ctx, rx, ry);

    // 3. Draw main cyber-chassis
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rot);

    let hullColor = COLOR.CYAN;
    if (this.hitFlashTimer > 0) {
      hullColor = COLOR.RED;
    } else if (this.isDashing) {
      hullColor = COLOR.WHITE;
    }

    // Draw active vector thruster plumes behind engine ports
    this._drawThrusters(ctx, hullColor);

    // Draw layered vector chassis
    this._drawChassis(ctx, hullColor, true);

    ctx.restore();
  }

  /**
   * Renders dynamic thruster exhaust plumes based on movement & dash state
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} hullColor
   */
  _drawThrusters(ctx, hullColor) {
    const speed = Math.hypot(this.vx, this.vy);
    const isMoving = speed > 10 || this.isDashing;
    if (!isMoving) return;

    ctx.save();
    const speedRatio = Math.min(1.0, speed / (this.maxSpeed || 200));
    const baseLength = this.isDashing ? 28 : (8 + speedRatio * 14);
    const flicker = Math.sin(this.animTime * 45) * 3;
    const len = Math.max(4, baseLength + flicker);

    ctx.strokeStyle = this.isDashing ? COLOR.WHITE : COLOR.CYAN;
    ctx.fillStyle = this.isDashing ? 'rgba(255,255,255,0.7)' : 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.2;

    // Twin engine ports at (-7, -5) and (-7, 5)
    const engineYOffsets = [-5, 5];
    for (const ey of engineYOffsets) {
      ctx.beginPath();
      ctx.moveTo(-7, ey - 2.5);
      ctx.lineTo(-7 - len, ey);
      ctx.lineTo(-7, ey + 2.5);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();

      // Inner flame core
      ctx.beginPath();
      ctx.strokeStyle = COLOR.WHITE;
      ctx.moveTo(-7, ey - 1);
      ctx.lineTo(-7 - len * 0.5, ey);
      ctx.lineTo(-7, ey + 1);
      ctx.stroke();
    }

    // Central impulse jet on dash
    if (this.isDashing) {
      ctx.strokeStyle = COLOR.WHITE;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-5 - len * 1.3, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders dynamic shield shimmer aura around chassis
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   */
  _drawShieldAura(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    const shieldR = this.radius + 5;
    const shieldAngle = this.animTime * 1.8;

    if (this.iFramesTimer > 0) {
      // Active protective forcefield shimmer when invulnerable
      ctx.strokeStyle = COLOR.CYAN;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6 + Math.sin(this.animTime * 25) * 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR + Math.sin(this.animTime * 20) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Hexagonal deflection nodes
      for (let i = 0; i < 6; i++) {
        const a = shieldAngle + (i * Math.PI) / 3;
        const px = Math.cos(a) * (shieldR + 2);
        const py = Math.sin(a) * (shieldR + 2);
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Subtle ambient cybernetic bracket aura
      ctx.strokeStyle = COLOR.CYAN_DIM;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.22;
      VectorRenderer.drawTargetBracket(ctx, 0, 0, shieldR * 2.2, COLOR.CYAN, 4);
    }

    ctx.restore();
  }

  /**
   * Layered wireframe cyber-chassis drawing routines
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} color
   * @param {boolean} details
   */
  _drawChassis(ctx, color, details) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // 1. Primary outer aerodynamic hull
    ctx.beginPath();
    ctx.moveTo(20, 0);     // Nose prow
    ctx.lineTo(8, -8);     // Forward canard taper
    ctx.lineTo(-11, -15);  // Left wingtip
    ctx.lineTo(-7, -5);    // Left engine intake notch
    ctx.lineTo(-5, 0);     // Central reactor notch
    ctx.lineTo(-7, 5);     // Right engine intake notch
    ctx.lineTo(-11, 15);   // Right wingtip
    ctx.lineTo(8, 8);      // Forward canard taper
    ctx.closePath();
    ctx.stroke();

    if (details) {
      // 2. Armor plate bevels & conduits
      ctx.strokeStyle = COLOR.CYAN_DIM;
      ctx.lineWidth = 1;

      // Left & right wing panel reinforcement ribs
      ctx.beginPath();
      ctx.moveTo(8, -8);
      ctx.lineTo(-4, -6);
      ctx.lineTo(-11, -15);

      ctx.moveTo(8, 8);
      ctx.lineTo(-4, 6);
      ctx.lineTo(-11, 15);
      ctx.stroke();

      // 3. Inner diamond cockpit & reactor core
      ctx.strokeStyle = COLOR.WHITE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-2, -5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-2, 5);
      ctx.closePath();
      ctx.stroke();

      // Central core node
      ctx.fillStyle = COLOR.WHITE;
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Directional stabilizer fins with micro-articulation
      ctx.strokeStyle = COLOR.CYAN;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Left stabilizer fin
      ctx.moveTo(-11, -15);
      ctx.lineTo(-17, -18);
      // Right stabilizer fin
      ctx.moveTo(-11, 15);
      ctx.lineTo(-17, 18);
      ctx.stroke();

      // Forward sensor array ray
      ctx.strokeStyle = COLOR.CYAN_MUTED;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(36, 0);
      ctx.stroke();

      // Sensor tip bracket
      VectorRenderer.strokeLine(ctx, 36, -2, 36, 2, COLOR.CYAN_MUTED, 1);
    }
  }

  get dashReady() {
    return this.dashCooldownTimer <= 0;
  }

  get dashCooldownPercent() {
    return Math.max(0, 1.0 - this.dashCooldownTimer / this.dashCooldown);
  }
}
