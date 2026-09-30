/**
 * Ring Zero - Security Daemon Enemy Archetypes & Swarm AI
 * Features flocking separation, tactical pursuit, ranged pulse attacks, and vector wireframes.
 */

import { Entity } from './Entity.js';
import { Vec2, lerp, normalizeAngle, randomRange } from '../core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { VectorRenderer } from '../ui/VectorRenderer.js';
import { Drop, DROP_TYPE } from './Drop.js';
import { WeaponInstance, WEAPON_ARCHETYPES } from '../systems/WeaponSystem.js';

export const ENEMY_ARCHETYPES = {
  BIT_SCANNER: {
    type: 'BIT_SCANNER',
    name: 'BIT-SCANNER',
    maxHealth: 32,
    speed: 230,
    radius: 12,
    contactDamage: 14,
    color: COLOR.RED,
    xpValue: 12,
    crateDropChance: 0.04,
  },
  WATCHDOG: {
    type: 'WATCHDOG',
    name: 'WATCHDOG',
    maxHealth: 85,
    speed: 175,
    radius: 16,
    contactDamage: 24,
    color: COLOR.AMBER,
    xpValue: 28,
    crateDropChance: 0.12,
  },
  MEMORY_LEAK: {
    type: 'MEMORY_LEAK',
    name: 'MEMORY-LEAK',
    maxHealth: 240,
    speed: 95,
    radius: 22,
    contactDamage: 38,
    color: COLOR.CYAN,
    xpValue: 60,
    crateDropChance: 0.25,
  },
  SENTINEL: {
    type: 'SENTINEL',
    name: 'SENTINEL',
    maxHealth: 140,
    speed: 75,
    radius: 18,
    contactDamage: 20,
    color: COLOR.WHITE,
    xpValue: 45,
    crateDropChance: 0.20,
  },
};

export class Enemy extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {typeof ENEMY_ARCHETYPES[keyof typeof ENEMY_ARCHETYPES]} config
   */
  constructor(x = 0, y = 0, config = ENEMY_ARCHETYPES.BIT_SCANNER) {
    super(x, y, config.radius, COLLISION_LAYER.ENEMY);

    this.config = config;
    this.type = config.type;
    this.name = config.name;
    this.maxHealth = config.maxHealth;
    this.health = this.maxHealth;
    this.speed = config.speed;
    this.contactDamage = config.contactDamage;
    this.color = config.color;
    this.xpValue = config.xpValue;
    this.crateDropChance = config.crateDropChance;

    // AI steering vectors
    this.targetPos = new Vec2();
    this.separationVec = new Vec2();
    this.attackCooldown = randomRange(1.0, 2.5); // For ranged Sentinels

    // Visual feedback
    this.hitFlashTimer = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  /**
   * Applies damage and knockback from bullet impact
   * @param {number} amount
   * @param {Vec2} [knockbackDir]
   * @param {number} [knockbackImpulse=120]
   * @returns {boolean} Whether enemy died from this hit
   */
  takeDamage(amount, knockbackDir = null, knockbackImpulse = 120) {
    this.health -= amount;
    this.hitFlashTimer = 0.08;

    if (knockbackDir) {
      this.vx += knockbackDir.x * knockbackImpulse;
      this.vy += knockbackDir.y * knockbackImpulse;
    }

    if (this.health <= 0) {
      this.markedForRemoval = true;
      return true;
    }
    return false;
  }

  /**
   * Advanced swarm AI update with spatial separation and behavior modes
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../systems/SpatialHashGrid.js').SpatialHashGrid} spatialGrid
   * @param {function(Object): void} onShootProjectile - Callback for Sentinel projectiles
   */
  updateAI(dt, player, spatialGrid, onShootProjectile) {
    this.preStep();
    this.pulsePhase += dt * 3.5;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    // Desired velocity vector
    let desiredVx = 0;
    let desiredVy = 0;

    if (this.type === 'SENTINEL') {
      // Sentinel maintains standoff range (320px) and fires pulses
      const standoff = 320;
      if (distToPlayer > standoff + 40) {
        desiredVx = (dx / distToPlayer) * this.speed;
        desiredVy = (dy / distToPlayer) * this.speed;
      } else if (distToPlayer < standoff - 40) {
        desiredVx = -(dx / distToPlayer) * this.speed;
        desiredVy = -(dy / distToPlayer) * this.speed;
      }

      // Ranged pulse attack
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0 && distToPlayer < 550) {
        this.attackCooldown = randomRange(1.8, 2.6);
        if (onShootProjectile) {
          const aimAngle = Math.atan2(dy, dx);
          onShootProjectile({
            x: this.x,
            y: this.y,
            angle: aimAngle,
            speed: 550,
            damage: 16,
            pierce: 1,
            color: COLOR.RED,
            layer: COLLISION_LAYER.PROJECTILE_ENEMY,
          });
        }
      }
    } else {
      // Direct chase for swarmer archetypes
      if (distToPlayer > 1) {
        desiredVx = (dx / distToPlayer) * this.speed;
        desiredVy = (dy / distToPlayer) * this.speed;
      }
    }

    // Swarm Flocking Separation (avoids overcrowding)
    this.separationVec.set(0, 0);
    const neighbors = spatialGrid.queryRadius(this.x, this.y, this.radius * 2.2, COLLISION_LAYER.ENEMY);
    for (const neighbor of neighbors) {
      if (neighbor !== this && neighbor.active) {
        const ndx = this.x - neighbor.x;
        const ndy = this.y - neighbor.y;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
        if (ndist > 0.001) {
          this.separationVec.x += (ndx / ndist) * 140;
          this.separationVec.y += (ndy / ndist) * 140;
        }
      }
    }

    // Blend desired tracking with separation
    const steerForce = 4.0;
    this.vx += (desiredVx + this.separationVec.x - this.vx) * Math.min(1.0, steerForce * dt);
    this.vy += (desiredVy + this.separationVec.y - this.vy) * Math.min(1.0, steerForce * dt);

    // Advance position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Face travel/player direction
    if (distToPlayer > 1) {
      const targetAngle = Math.atan2(dy, dx);
      this.rotation = targetAngle;
    }
  }

  /**
   * Generates loot drops upon enemy purge
   * @param {import('../entities/Player.js').Player} player
   * @returns {Drop[]}
   */
  generateDrops(clearanceRing = 3) {
    const drops = [];

    // Always drop Memory Fragment XP
    drops.push(new Drop(this.x, this.y, DROP_TYPE.XP, { xpValue: this.xpValue }));

    // Chance to drop Crypto Bounties (45% chance)
    if (Math.random() < 0.45) {
      const cryptoValue = Math.floor(randomRange(8, 22));
      drops.push(
        new Drop(this.x + randomRange(-12, 12), this.y + randomRange(-12, 12), DROP_TYPE.CRYPTO, {
          cryptoValue,
        })
      );
    }

    // Chance to drop hardware weapon crate, filtered by clearance ring
    if (Math.random() < this.crateDropChance) {
      const allowedKeys = ['KERNEL_PISTOL', 'COMBAT_SWEEPER'];
      if (clearanceRing <= 2) {
        allowedKeys.push('FLAK_SUBMACHINE', 'ROTARY_MINIGUN');
      }
      if (clearanceRing <= 1) {
        allowedKeys.push('VECTOR_RAILGUN');
      }
      const chosenKey = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const weaponInstance = new WeaponInstance(WEAPON_ARCHETYPES[chosenKey]);

      drops.push(
        new Drop(this.x + randomRange(-16, 16), this.y + randomRange(-16, 16), DROP_TYPE.WEAPON, {
          weapon: weaponInstance,
        })
      );
    }

    return drops;
  }

  /**
   * Minimalist vector wireframe rendering based on archetype
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha = 1.0) {
    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);
    const r = this.radius;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(this.rotation);

    const wireColor = this.hitFlashTimer > 0 ? COLOR.WHITE : this.color;
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = 1.5;

    switch (this.type) {
      case 'BIT_SCANNER': {
        // Fast dual chevron hull
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(-r, -r * 0.7);
        ctx.lineTo(-r * 0.4, 0);
        ctx.lineTo(-r, r * 0.7);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case 'WATCHDOG': {
        // Jagged combat hound hull with forward jaws
        ctx.beginPath();
        ctx.moveTo(r * 1.2, 0);
        ctx.lineTo(r * 0.3, -r);
        ctx.lineTo(-r, -r * 0.6);
        ctx.lineTo(-r * 0.5, 0);
        ctx.lineTo(-r, r * 0.6);
        ctx.lineTo(r * 0.3, r);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = COLOR.WHITE;
        ctx.strokeRect(-2, -2, 4, 4);
        break;
      }

      case 'MEMORY_LEAK': {
        // Concentric hexagon core
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Pulsing inner memory ring
        const innerR = r * 0.5 + Math.sin(this.pulsePhase) * 2;
        VectorRenderer.strokeCircle(ctx, 0, 0, Math.max(2, innerR), wireColor, 1);
        break;
      }

      case 'SENTINEL': {
        // Octagonal defense turret with targeting reticle
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Directional laser barrel
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r * 1.5, 0);
        ctx.stroke();
        break;
      }
    }

    // Health bar overhead if damaged
    if (this.health < this.maxHealth) {
      ctx.rotate(-this.rotation); // Keep health bar horizontal
      const barW = r * 2.2;
      const barH = 3;
      const pct = Math.max(0, this.health / this.maxHealth);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW * 0.5, -r - 10, barW, barH);
      ctx.fillStyle = COLOR.RED;
      ctx.fillRect(-barW * 0.5, -r - 10, barW * pct, barH);
    }

    ctx.restore();
  }
}
