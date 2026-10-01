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
  KERNEL_WATCHER: {
    type: 'KERNEL_WATCHER',
    name: 'KERNEL-WATCHER [BOSS]',
    maxHealth: 650,
    speed: 110,
    radius: 26,
    contactDamage: 45,
    color: '#FF0055',
    xpValue: 200,
    isBoss: true,
  },
  ZERO_DAY_COLOSSUS: {
    type: 'ZERO_DAY_COLOSSUS',
    name: 'ZERO-DAY COLOSSUS [BOSS]',
    maxHealth: 1600,
    speed: 80,
    radius: 34,
    contactDamage: 60,
    color: '#FF3300',
    xpValue: 500,
    isBoss: true,
  },
};

export const ELITE_MODIFIER = {
  NONE: 'NONE',
  SHIELDED: 'SHIELDED',
  OVERCLOCKED: 'OVERCLOCKED',
  CLUSTER_SPLITTER: 'CLUSTER_SPLITTER',
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

    if (this.elite === ELITE_MODIFIER.SHIELDED) {
      this.maxShield = Math.round(this.maxHealth * 0.5);
      this.shield = this.maxShield;
    } else if (this.elite === ELITE_MODIFIER.OVERCLOCKED) {
      this.speed = Math.round(this.speed * 1.45);
      this.color = COLOR.AMBER;
    } else if (this.elite === ELITE_MODIFIER.CLUSTER_SPLITTER) {
      this.isSplitter = true;
    }

    // AI steering vectors
    this.targetPos = new Vec2();
    this.separationVec = new Vec2();
    this.attackCooldown = randomRange(1.0, 2.5); // For ranged Sentinels
    this.isHostile = true;
    this.owner = 'enemy';

    // Lagswitch temporal freeze buffer & stutter ghosts
    this.isLagswitchFrozen = false;
    this._bufferedDestX = x;
    this._bufferedDestY = y;
    this._ghostTrails = [
      { x: x, y: y, alpha: 0 },
      { x: x, y: y, alpha: 0 },
      { x: x, y: y, alpha: 0 },
      { x: x, y: y, alpha: 0 },
    ];
    this._ghostIndex = 0;
    this._ghostTimer = 0.05;

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
   * Advances entity kinematics unless frozen by Lagswitch
   * @param {number} dt
   * @param {import('../systems/CheatManager.js').CheatManager} [cheatManager=null]
   */
  update(dt, cheatManager = null) {
    const isFrozen = !!((cheatManager && (cheatManager.isActive('lagswitch') || cheatManager.getCheat('lagswitch')?.active)) && (this.isHostile || this.owner === 'enemy'));
    if (isFrozen) {
      this.isLagswitchFrozen = true;
      return;
    }
    super.update(dt);
  }

  /**
   * Advanced swarm AI update with spatial separation and behavior modes
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../systems/SpatialHashGrid.js').SpatialHashGrid} spatialGrid
   * @param {function(Object): void} onShootProjectile - Callback for Sentinel projectiles
   * @param {import('../systems/CheatManager.js').CheatManager} [cheatManager=null]
   * @param {boolean} [forceFreeze=false]
   */
  updateAI(dt, player, spatialGrid, onShootProjectile, cheatManager = null, forceFreeze = false) {
    const isFrozen = Boolean(forceFreeze || (cheatManager && (cheatManager.isActive('lagswitch') || cheatManager.getCheat('lagswitch')?.active) && (this.isHostile || this.owner === 'enemy')));

    if (isFrozen) {
      this.isLagswitchFrozen = true;

      // Stutter / ghost afterimage trail generation (preallocated zero GC)
      this._ghostTimer += 0.016;
      if (this._ghostTimer >= 0.04) {
        this._ghostTimer = 0;
        const ghost = this._ghostTrails[this._ghostIndex];
        ghost.x = this.x + (Math.random() - 0.5) * 8;
        ghost.y = this.y + (Math.random() - 0.5) * 8;
        ghost.alpha = 0.7;
        this._ghostIndex = (this._ghostIndex + 1) % this._ghostTrails.length;
      }

      // Buffer incoming target trajectory toward player during socket freeze
      if (player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          this._bufferedDestX += (dx / dist) * this.speed * 0.016;
          this._bufferedDestY += (dy / dist) * this.speed * 0.016;
        }
      }

      // Fade existing ghost afterimages
      for (let i = 0; i < this._ghostTrails.length; i++) {
        if (this._ghostTrails[i].alpha > 0) {
          this._ghostTrails[i].alpha = Math.max(0, this._ghostTrails[i].alpha - 0.016 * 2.5);
        }
      }

      return; // Skip positional integration, attack timers, and firing animations
    }

    // Unfreezing: smoothly snap/lerp caught up to buffered position
    if (this.isLagswitchFrozen) {
      this.isLagswitchFrozen = false;
      if (this._bufferedDestX !== this.x || this._bufferedDestY !== this.y) {
        this.x = lerp(this.x, this._bufferedDestX, 0.5);
        this.y = lerp(this.y, this._bufferedDestY, 0.5);
      }
    }
    this._bufferedDestX = this.x;
    this._bufferedDestY = this.y;

    // Decay ghost trails when unfreezing
    for (let i = 0; i < this._ghostTrails.length; i++) {
      if (this._ghostTrails[i].alpha > 0) {
        this._ghostTrails[i].alpha = Math.max(0, this._ghostTrails[i].alpha - dt * 3.5);
      }
    }

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
    if (spatialGrid) {
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

    // Render stutter/ghost afterimage trails if frozen by lagswitch
    for (let i = 0; i < this._ghostTrails.length; i++) {
      const g = this._ghostTrails[i];
      if (g.alpha > 0.05) {
        ctx.save();
        ctx.globalAlpha = g.alpha * 0.45;
        ctx.strokeStyle = COLOR.RED;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(g.x - r * 0.8, g.y);
        ctx.lineTo(g.x + r * 0.8, g.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(this.rotation);

    if (this.isLagswitchFrozen) {
      ctx.save();
      ctx.font = '8px monospace';
      ctx.fillStyle = COLOR.RED;
      ctx.textAlign = 'center';
      ctx.fillText('[SOCKET_HALT]', 0, -r - 6);
      ctx.restore();
    }

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

    // Health bar overhead if damaged or boss
    if (this.health < this.maxHealth || this.isBoss || this.shield > 0) {
      ctx.rotate(-this.rotation); // Keep health bar horizontal
      const barW = this.isBoss ? r * 2.5 : r * 1.8;
      const barH = this.isBoss ? 4 : 2;
      const pct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW * 0.5, -r - 12, barW, barH);
      ctx.fillStyle = this.isBoss ? '#FF0055' : COLOR.RED;
      ctx.fillRect(-barW * 0.5, -r - 12, barW * pct, barH);
      if (this.shield > 0) {
        const shieldPct = Math.min(1.0, this.shield / this.maxShield);
        ctx.fillStyle = COLOR.CYAN;
        ctx.fillRect(-barW * 0.5, -r - 15, barW * shieldPct, 2);
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
