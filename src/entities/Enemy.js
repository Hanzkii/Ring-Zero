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

// Preallocated scratch object for ranged pulse attack to avoid 60Hz heap allocations
const SENTINEL_PULSE_SCRATCH = {
  x: 0,
  y: 0,
  angle: 0,
  speed: 550,
  damage: 16,
  pierce: 1,
  color: COLOR.RED,
  layer: COLLISION_LAYER.PROJECTILE_ENEMY,
};

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
  // --- 4-Tier Protection Ring Milestone Boss Archetypes ---
  DAEMON_OVERSEER: {
    type: 'DAEMON_OVERSEER',
    name: 'DAEMON OVERSEER [W10 BOSS]',
    maxHealth: 800,
    speed: 110,
    radius: 28,
    contactDamage: 40,
    color: '#00F0FF',
    xpValue: 250,
    isBoss: true,
  },
  BUS_ARBITER: {
    type: 'BUS_ARBITER',
    name: 'BUS ARBITER [W20 BOSS]',
    maxHealth: 1800,
    speed: 95,
    radius: 32,
    contactDamage: 55,
    color: '#FFD000',
    xpValue: 500,
    isBoss: true,
  },
  HYPERVISOR_SENTINEL: {
    type: 'HYPERVISOR_SENTINEL',
    name: 'HYPERVISOR SENTINEL [W30 BOSS]',
    maxHealth: 3200,
    speed: 90,
    radius: 36,
    contactDamage: 70,
    color: '#00FF66',
    xpValue: 800,
    isBoss: true,
  },
  ROOTKIT_COLOSSUS: {
    type: 'ROOTKIT_COLOSSUS',
    name: 'ROOTKIT COLOSSUS [W40 BOSS]',
    maxHealth: 6000,
    speed: 85,
    radius: 42,
    contactDamage: 90,
    color: '#FF003C',
    xpValue: 1500,
    isBoss: true,
  },

  // Legacy Boss Aliases for backward compatibility
  KERNEL_WATCHER: {
    type: 'KERNEL_WATCHER',
    name: 'KERNEL-WATCHER [BOSS]',
    maxHealth: 800,
    speed: 110,
    radius: 28,
    contactDamage: 40,
    color: '#00F0FF',
    xpValue: 250,
    isBoss: true,
  },
  ZERO_DAY_COLOSSUS: {
    type: 'ZERO_DAY_COLOSSUS',
    name: 'ZERO-DAY COLOSSUS [BOSS]',
    maxHealth: 3200,
    speed: 90,
    radius: 36,
    contactDamage: 70,
    color: '#FF003C',
    xpValue: 800,
    isBoss: true,
  },
};

export const ELITE_MODIFIER = {
  NONE: 'NONE',
  SHIELDED: 'SHIELDED',
  OVERCLOCKED: 'OVERCLOCKED',
  CLUSTER_SPLITTER: 'CLUSTER_SPLITTER',
  PHASE_TELEPORTER: 'PHASE_TELEPORTER',
  SHIELD_VANGUARD: 'SHIELD_VANGUARD',
  VOLATILE_KAMIKAZE: 'VOLATILE_KAMIKAZE',
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
    this.crateDropChance = 0; // World weapon crates disabled in Phase 7 (obtainable via milestone arsenal selection)

    // Boss & Elite status
    this.isBoss = Boolean(config.isBoss);
    this.elite = config.elite || ELITE_MODIFIER.NONE;
    this.shield = 0;
    this.maxShield = 0;
    this.isSplitter = false;

    // All Elites receive 3x HP and 1.25x physical footprint
    if (this.elite !== ELITE_MODIFIER.NONE) {
      this.maxHealth = Math.round(this.maxHealth * 3);
      this.health = this.maxHealth;
      this.radius = Math.round(this.radius * 1.25);
    }

    if (this.elite === ELITE_MODIFIER.SHIELDED) {
      this.maxShield = Math.round(this.maxHealth * 0.5);
      this.shield = this.maxShield;
    } else if (this.elite === ELITE_MODIFIER.OVERCLOCKED) {
      this.speed = Math.round(this.speed * 1.45);
      this.color = COLOR.AMBER;
    } else if (this.elite === ELITE_MODIFIER.CLUSTER_SPLITTER) {
      this.isSplitter = true;
    } else if (this.elite === ELITE_MODIFIER.PHASE_TELEPORTER) {
      this.teleportTimer = 3.5;
      this.glitchTimer = 0;
      this.color = '#B026FF';
    } else if (this.elite === ELITE_MODIFIER.SHIELD_VANGUARD) {
      this.vanguardShield = Math.round(this.maxHealth * 0.5);
      this.maxVanguardShield = this.vanguardShield;
      this.color = COLOR.CYAN;
    } else if (this.elite === ELITE_MODIFIER.VOLATILE_KAMIKAZE) {
      this.color = '#FF3300';
      this.isKamikaze = true;
    }

    // AI steering vectors
    this.targetPos = new Vec2();
    this.separationVec = new Vec2();
    this.attackCooldown = randomRange(1.0, 2.5); // For ranged Sentinels
    this.isHostile = true;
    this.owner = 'enemy';

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
    // 75% knockback resistance for all elites
    if (this.elite !== ELITE_MODIFIER.NONE) {
      knockbackImpulse *= 0.25;
    }

    // Directional barrier for Shield Vanguard (front 120-degree cone)
    if (this.elite === ELITE_MODIFIER.SHIELD_VANGUARD && this.vanguardShield > 0 && knockbackDir) {
      const incomingAngle = Math.atan2(-knockbackDir.y, -knockbackDir.x);
      const diff = Math.abs(normalizeAngle(incomingAngle - this.rotation));
      if (diff <= Math.PI / 3) {
        const absorbed = Math.min(this.vanguardShield, amount);
        this.vanguardShield -= absorbed;
        amount -= absorbed;
        this.hitFlashTimer = 0.08;
        if (amount <= 0) {
          this.vx += knockbackDir.x * (knockbackImpulse * 0.2);
          this.vy += knockbackDir.y * (knockbackImpulse * 0.2);
          return false;
        }
      }
    }

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
      this.hitFlashTimer = 0.08;
      if (amount <= 0) {
        if (knockbackDir) {
          this.vx += knockbackDir.x * (knockbackImpulse * 0.4);
          this.vy += knockbackDir.y * (knockbackImpulse * 0.4);
        }
        return false;
      }
    }

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
   * Advances entity kinematics
   * @param {number} dt
   */
  update(dt) {
    super.update(dt);
  }

  /**
   * Advanced swarm AI update with spatial separation and behavior modes
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../systems/SpatialHashGrid.js').SpatialHashGrid} spatialGrid
   * @param {function(Object): void} onShootProjectile - Callback for Sentinel projectiles
   * @param {Object} [arenaBounds=null] - Optional boundary clamping limits
   */
  updateAI(dt, player, spatialGrid, onShootProjectile, arenaBounds = null) {
    this.preStep();
    this.pulsePhase += dt * 3.5;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    // Phase Teleporter logic: 150px periodic blink every 3.5s
    if (this.elite === ELITE_MODIFIER.PHASE_TELEPORTER) {
      this.teleportTimer -= dt;
      if (this.teleportTimer <= 0) {
        this.teleportTimer = 3.5;
        const blinkAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
        this.prevX = this.x;
        this.prevY = this.y;
        this.x += Math.cos(blinkAngle) * 150;
        this.y += Math.sin(blinkAngle) * 150;
        if (arenaBounds) {
          this.x = Math.max(arenaBounds.minX, Math.min(arenaBounds.maxX, this.x));
          this.y = Math.max(arenaBounds.minY, Math.min(arenaBounds.maxY, this.y));
        } else {
          const hw = 1200 - 80;
          const hh = 1200 - 80;
          this.x = Math.max(-hw, Math.min(hw, this.x));
          this.y = Math.max(-hh, Math.min(hh, this.y));
        }
        this.glitchTimer = 0.25;
      }
    }

    // Volatile Kamikaze: +60% speed when within 320px
    let activeSpeed = this.speed;
    if (this.elite === ELITE_MODIFIER.VOLATILE_KAMIKAZE && distToPlayer <= 320) {
      activeSpeed *= 1.6;
    }

    // Desired velocity vector
    let desiredVx = 0;
    let desiredVy = 0;

    if (this.type === 'SENTINEL') {
      // Sentinel maintains standoff range (320px) and fires pulses
      const standoff = 320;
      if (distToPlayer > standoff + 40) {
        desiredVx = (dx / distToPlayer) * activeSpeed;
        desiredVy = (dy / distToPlayer) * activeSpeed;
      } else if (distToPlayer < standoff - 40) {
        desiredVx = -(dx / distToPlayer) * activeSpeed;
        desiredVy = -(dy / distToPlayer) * activeSpeed;
      }

      // Ranged pulse attack
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0 && distToPlayer < 550) {
        this.attackCooldown = randomRange(1.8, 2.6);
        if (onShootProjectile) {
          const aimAngle = Math.atan2(dy, dx);
          SENTINEL_PULSE_SCRATCH.x = this.x;
          SENTINEL_PULSE_SCRATCH.y = this.y;
          SENTINEL_PULSE_SCRATCH.angle = aimAngle;
          SENTINEL_PULSE_SCRATCH.speed = 550;
          SENTINEL_PULSE_SCRATCH.damage = 16;
          SENTINEL_PULSE_SCRATCH.pierce = 1;
          SENTINEL_PULSE_SCRATCH.color = COLOR.RED;
          SENTINEL_PULSE_SCRATCH.layer = COLLISION_LAYER.PROJECTILE_ENEMY;
          onShootProjectile(SENTINEL_PULSE_SCRATCH);
        }
      }
    } else {
      // Direct chase for swarmer archetypes
      if (distToPlayer > 1) {
        desiredVx = (dx / distToPlayer) * activeSpeed;
        desiredVy = (dy / distToPlayer) * activeSpeed;
      }
    }

    // Swarm Flocking Separation (avoids overcrowding, capped at 6 neighbors to maintain 60 TPS in Ring 0)
    this.separationVec.set(0, 0);
    if (spatialGrid && distToPlayer <= 1200) {
      const neighbors = spatialGrid.queryRadius(this.x, this.y, this.radius * 2.2, COLLISION_LAYER.ENEMY);
      const maxCount = Math.min(neighbors.length, 6);
      for (let i = 0; i < maxCount; i++) {
        const neighbor = neighbors[i];
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
    }

    // Blend desired tracking with separation
    const steerForce = 4.0;
    this.vx += (desiredVx + this.separationVec.x - this.vx) * Math.min(1.0, steerForce * dt);
    this.vy += (desiredVy + this.separationVec.y - this.vy) * Math.min(1.0, steerForce * dt);

    // Advance position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Strict boundary clamping with SPAWN_MARGIN (80px)
    if (arenaBounds) {
      if (this.x < arenaBounds.minX) {
        this.x = arenaBounds.minX;
        if (this.vx < 0) this.vx = 0;
      } else if (this.x > arenaBounds.maxX) {
        this.x = arenaBounds.maxX;
        if (this.vx > 0) this.vx = 0;
      }
      if (this.y < arenaBounds.minY) {
        this.y = arenaBounds.minY;
        if (this.vy < 0) this.vy = 0;
      } else if (this.y > arenaBounds.maxY) {
        this.y = arenaBounds.maxY;
        if (this.vy > 0) this.vy = 0;
      }
    }

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
    const isElite = this.elite !== ELITE_MODIFIER.NONE;
    const finalXp = isElite ? this.xpValue * 2 : this.xpValue;

    // Always drop Memory Fragment XP
    drops.push(new Drop(this.x, this.y, DROP_TYPE.XP, { xpValue: finalXp }));

    // Chance to drop Crypto Bounties (45% chance or 100% on elite)
    if (isElite || Math.random() < 0.45) {
      const cryptoValue = Math.floor(randomRange(8, 22)) * (isElite ? 2 : 1);
      drops.push(
        new Drop(this.x + randomRange(-12, 12), this.y + randomRange(-12, 12), DROP_TYPE.CRYPTO, {
          cryptoValue,
        })
      );
    }

    // Nanite Repair module drops: 100% on MEMORY_LEAK, 9% on standard daemons
    const isHeavy = this.type === 'MEMORY_LEAK';
    const naniteChance = isHeavy ? 1.0 : 0.09;
    if (Math.random() < naniteChance) {
      drops.push(
        new Drop(this.x + randomRange(-10, 10), this.y + randomRange(-10, 10), DROP_TYPE.NANITE_REPAIR, {
          healValue: 25,
        })
      );
    }

    // World weapon drops disabled by default (crateDropChance = 0).
    // Allows explicit override for testing and backward compatibility:
    if (this.crateDropChance > 0 && Math.random() < this.crateDropChance) {
      const weaponPool = [WEAPON_ARCHETYPES.KERNEL_PISTOL, WEAPON_ARCHETYPES.CODE_SWEEPER];
      if (clearanceRing <= 2) weaponPool.push(WEAPON_ARCHETYPES.FLAK_SUBMACHINE);
      if (clearanceRing <= 1) weaponPool.push(WEAPON_ARCHETYPES.VECTOR_RAILGUN);
      const chosenWeapon = weaponPool[Math.floor(Math.random() * weaponPool.length)];
      drops.push(
        new Drop(this.x + randomRange(-8, 8), this.y + randomRange(-8, 8), DROP_TYPE.WEAPON, {
          weapon: chosenWeapon,
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
        // 1. Outer dual razor chevron hull
        ctx.beginPath();
        ctx.moveTo(r * 1.1, 0);
        ctx.lineTo(-r, -r * 0.75);
        ctx.lineTo(-r * 0.45, 0);
        ctx.lineTo(-r, r * 0.75);
        ctx.closePath();
        ctx.stroke();

        // 2. Inner secondary chevron
        ctx.lineWidth = 1;
        ctx.strokeStyle = wireColor === COLOR.WHITE ? COLOR.WHITE : 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.moveTo(r * 0.5, 0);
        ctx.lineTo(-r * 0.4, -r * 0.4);
        ctx.lineTo(-r * 0.15, 0);
        ctx.lineTo(-r * 0.4, r * 0.4);
        ctx.closePath();
        ctx.stroke();

        // 3. Rotating inner bit core
        ctx.save();
        ctx.rotate(this.pulsePhase * 2.5);
        ctx.strokeStyle = wireColor;
        ctx.strokeRect(-2.5, -2.5, 5, 5);
        ctx.restore();

        // 4. Forward scanning telemetry ray
        const scanPulse = (Math.sin(this.pulsePhase * 4) + 1) * 0.5;
        ctx.strokeStyle = wireColor;
        ctx.globalAlpha = 0.4 + scanPulse * 0.4;
        ctx.beginPath();
        ctx.moveTo(r * 1.1, 0);
        ctx.lineTo(r * 1.8 + scanPulse * 4, 0);
        ctx.stroke();

        // Scanning tip bracket
        VectorRenderer.strokeLine(ctx, r * 1.8 + scanPulse * 4, -3, r * 1.8 + scanPulse * 4, 3, wireColor, 1);
        ctx.globalAlpha = 1.0;
        break;
      }

      case 'WATCHDOG': {
        // 1. Jagged combat hound chassis
        ctx.beginPath();
        ctx.moveTo(r * 1.3, 0);          // Predatory nose tip
        ctx.lineTo(r * 0.4, -r * 0.9);   // Upper jaw crest
        ctx.lineTo(-r * 0.8, -r * 0.7);  // Upper shoulder
        ctx.lineTo(-r * 1.1, -r * 0.3);  // Rear armor plate
        ctx.lineTo(-r * 0.6, 0);         // Spine center
        ctx.lineTo(-r * 1.1, r * 0.3);   // Lower rear armor
        ctx.lineTo(-r * 0.8, r * 0.7);   // Lower shoulder
        ctx.lineTo(r * 0.4, r * 0.9);    // Lower jaw crest
        ctx.closePath();
        ctx.stroke();

        // 2. Articulated forward jaws
        const jawOffset = Math.sin(this.pulsePhase * 5) * 2;
        ctx.lineWidth = 1;
        ctx.strokeStyle = COLOR.WHITE;
        ctx.beginPath();
        // Upper mandible
        ctx.moveTo(r * 0.4, -r * 0.5 + jawOffset);
        ctx.lineTo(r * 1.1, -r * 0.2);
        // Lower mandible
        ctx.moveTo(r * 0.4, r * 0.5 - jawOffset);
        ctx.lineTo(r * 1.1, r * 0.2);
        ctx.stroke();

        // 3. Glowing optic scanner lens
        ctx.fillStyle = COLOR.RED;
        ctx.beginPath();
        ctx.arc(r * 0.2, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Rear stabilization combat struts
        ctx.strokeStyle = wireColor;
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, -r * 0.7);
        ctx.lineTo(-r * 1.3, -r * 0.9);
        ctx.moveTo(-r * 0.8, r * 0.7);
        ctx.lineTo(-r * 1.3, r * 0.9);
        ctx.stroke();
        break;
      }

      case 'MEMORY_LEAK': {
        // 1. Outer rotating hexagon
        ctx.save();
        ctx.rotate(this.pulsePhase * 0.6);
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
        ctx.restore();

        // 2. Inner counter-rotating hexagon
        ctx.save();
        ctx.rotate(-this.pulsePhase * 0.9);
        ctx.lineWidth = 1;
        ctx.strokeStyle = COLOR.WHITE;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const px = Math.cos(a) * (r * 0.65);
          const py = Math.sin(a) * (r * 0.65);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // 3. Pulsing corrupted memory core
        const coreR = Math.max(2, r * 0.35 + Math.sin(this.pulsePhase * 3) * 2.5);
        ctx.strokeStyle = wireColor;
        VectorRenderer.strokeCircle(ctx, 0, 0, coreR, wireColor, 1.2);

        // 4. Orbiting leaking memory fragment shards
        for (let i = 0; i < 3; i++) {
          const shardAngle = this.pulsePhase * 1.5 + (i * Math.PI * 2) / 3;
          const dist = r * 1.25 + Math.sin(this.pulsePhase * 2 + i) * 3;
          const sx = Math.cos(shardAngle) * dist;
          const sy = Math.sin(shardAngle) * dist;
          ctx.strokeStyle = wireColor;
          ctx.strokeRect(sx - 1.5, sy - 1.5, 3, 3);
        }
        break;
      }

      case 'SENTINEL': {
        // 1. Heavy octagonal armored chassis
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

        // 2. Reinforced internal armored ring
        ctx.lineWidth = 1;
        ctx.strokeStyle = COLOR.CYAN_DIM;
        VectorRenderer.strokeCircle(ctx, 0, 0, r * 0.7, wireColor, 1);

        // 3. Rotating secondary radar ring with tick marks
        ctx.save();
        ctx.rotate(this.pulsePhase * 1.2);
        ctx.strokeStyle = COLOR.WHITE;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        // Radar radial ticks
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35);
          ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
        }
        ctx.stroke();
        ctx.restore();

        // 4. Heavy segmented railgun barrel
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = wireColor;
        ctx.beginPath();
        ctx.moveTo(0, -2.5);
        ctx.lineTo(r * 1.7, -2.5);
        ctx.lineTo(r * 1.7, 2.5);
        ctx.lineTo(0, 2.5);
        ctx.stroke();

        // Barrel muzzle charge ticks
        const chargeOffset = (Math.sin(this.pulsePhase * 6) + 1) * 0.5;
        ctx.strokeStyle = COLOR.RED;
        ctx.beginPath();
        ctx.moveTo(r * 1.7, -4);
        ctx.lineTo(r * 1.7, 4);
        // Forward targeting laser line
        ctx.moveTo(r * 1.7, 0);
        ctx.lineTo(r * 2.6 + chargeOffset * 6, 0);
        ctx.stroke();
        break;
      }

      case 'DAEMON_OVERSEER':
      case 'BUS_ARBITER':
      case 'HYPERVISOR_SENTINEL':
      case 'ROOTKIT_COLOSSUS':
      case 'KERNEL_WATCHER':
      case 'ZERO_DAY_COLOSSUS': {
        // Multi-ring Boss Core with rotating hazard brackets
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = 2;
        VectorRenderer.strokeCircle(ctx, 0, 0, r, wireColor, 2);

        ctx.save();
        ctx.rotate(this.pulsePhase * 1.5);
        VectorRenderer.drawTargetBracket(ctx, 0, 0, r * 2.4, wireColor, 6);
        ctx.restore();

        ctx.save();
        ctx.rotate(-this.pulsePhase * 2.0);
        ctx.strokeStyle = COLOR.WHITE;
        ctx.lineWidth = 1.5;
        VectorRenderer.strokeCircle(ctx, 0, 0, r * 0.5, COLOR.WHITE, 1.5);
        ctx.restore();
        break;
      }
    }

    // Rotating elite aura / brackets
    if (this.elite !== ELITE_MODIFIER.NONE) {
      ctx.save();
      ctx.rotate(this.pulsePhase * 1.5);
      const bracketColor = this.elite === ELITE_MODIFIER.PHASE_TELEPORTER ? '#D000FF' :
                           this.elite === ELITE_MODIFIER.VOLATILE_KAMIKAZE ? '#FF3300' :
                           this.elite === ELITE_MODIFIER.SHIELD_VANGUARD ? COLOR.CYAN : COLOR.AMBER;
      VectorRenderer.drawTargetBracket(ctx, 0, 0, r * 1.55, bracketColor, 5);
      ctx.restore();
    }

    // Directional forward energy barrier for Shield Vanguard
    if (this.elite === ELITE_MODIFIER.SHIELD_VANGUARD && this.vanguardShield > 0) {
      ctx.save();
      ctx.strokeStyle = COLOR.CYAN;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.strokeStyle = COLOR.WHITE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();
      ctx.restore();
    }

    // Chromatic glitch trails for Phase Teleporter
    if (this.glitchTimer > 0) {
      this.glitchTimer -= 0.016;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.7)';
      ctx.strokeRect(-r - 3, -r - 1, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.strokeRect(-r + 3, -r + 1, r * 2, r * 2);
      ctx.restore();
    }

    // Rotating shield perimeter if active
    if (this.shield > 0) {
      ctx.save();
      ctx.strokeStyle = COLOR.CYAN;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      VectorRenderer.strokeCircle(ctx, 0, 0, r + 5, COLOR.CYAN, 1.5);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Health bar overhead if damaged, boss, or elite
    const hasVanguard = this.elite === ELITE_MODIFIER.SHIELD_VANGUARD && this.vanguardShield > 0;
    if (this.health < this.maxHealth || this.isBoss || this.shield > 0 || hasVanguard || this.elite !== ELITE_MODIFIER.NONE) {
      ctx.rotate(-this.rotation); // Keep health bar horizontal
      const barW = this.isBoss ? r * 2.5 : r * 1.8;
      const barH = this.isBoss ? 4 : 2;
      const pct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW * 0.5, -r - 12, barW, barH);
      ctx.fillStyle = this.isBoss ? '#FF0055' : (this.elite !== ELITE_MODIFIER.NONE ? COLOR.AMBER : COLOR.RED);
      ctx.fillRect(-barW * 0.5, -r - 12, barW * pct, barH);
      if (this.shield > 0) {
        const shieldPct = Math.min(1.0, this.shield / this.maxShield);
        ctx.fillStyle = COLOR.CYAN;
        ctx.fillRect(-barW * 0.5, -r - 15, barW * shieldPct, 2);
      } else if (hasVanguard) {
        const vanguardPct = Math.min(1.0, this.vanguardShield / this.maxVanguardShield);
        ctx.fillStyle = COLOR.CYAN;
        ctx.fillRect(-barW * 0.5, -r - 15, barW * vanguardPct, 2);
      }
      if (this.isBoss) {
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#FF0055';
        ctx.textAlign = 'center';
        ctx.fillText(`[BOSS: ${Math.ceil(this.health)} HP]`, 0, -r - 18);
      }
    }

    ctx.restore();
  }
}
