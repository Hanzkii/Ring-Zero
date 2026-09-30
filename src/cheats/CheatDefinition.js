/**
 * Ring Zero - Cheat Exploit Definitions & Interceptor Base Class
 * Defines the privilege tier hierarchy, exploit metadata, and interceptor hook signatures.
 */

import { COLOR } from '../core/Constants.js';

export const RING_TIER = {
  RING_3: 3, // Userland
  RING_2: 2, // Driver Space
  RING_1: 1, // Hypervisor Space
  RING_0: 0, // Kernel Space
};

export const CHEAT_RARITY = {
  COMMON: { name: 'USERLAND', color: COLOR.CYAN },
  RARE: { name: 'DRIVER', color: COLOR.AMBER },
  KERNEL: { name: 'KERNEL EXECUTION', color: COLOR.RED },
};

/**
 * Base class for all exploit interceptors.
 * Subclasses override lifecycle hooks to alter engine physics, ballistics, damage, and rendering.
 */
export class CheatInterceptor {
  /**
   * @param {Object} def - Metadata from CHEAT_REGISTRY
   */
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.filename = def.filename;
    this.tier = def.tier;
    this.rarity = def.rarity;
    this.description = def.description;
    this.level = 1;
    this.maxLevel = def.maxLevel || 3;
    this.color = def.color || COLOR.CYAN;
    this.enabled = true;
  }

  /**
   * Upgrades the cheat to the next rank
   */
  upgrade() {
    if (this.level < this.maxLevel) {
      this.level++;
      return true;
    }
    return false;
  }

  /**
   * Hook: Intercepts and alters player aim input
   * @param {number} aimAngle - Current raw aim angle
   * @param {import('../core/VectorMath.js').Vec2} aimVector - Normalized aim direction
   * @param {Object} context - { player, spatialGrid, enemies, camera }
   * @returns {number} Modified aim angle
   */
  onAimInput(aimAngle, aimVector, context) {
    return aimAngle;
  }

  /**
   * Hook: Intercepts weapon fire events before projectiles spawn
   * @param {Object} bulletParams - Bullet configuration
   * @param {Object} context - { player, weapon, spatialGrid }
   * @param {function(Object): void} spawnCallback - Spawns a projectile into the pool
   */
  onWeaponFire(bulletParams, context, spawnCallback) {
    spawnCallback(bulletParams);
  }

  /**
   * Hook: Intercepts incoming damage to player (e.g. anti-aim, lagswitch)
   * @param {number} incomingDamage
   * @param {Object} context - { player, sourceEntity, isContact }
   * @returns {{ damage: number, evaded: boolean }}
   */
  onTakeDamage(incomingDamage, context) {
    return { damage: incomingDamage, evaded: false };
  }

  /**
   * Hook: Invoked per fixed tick for each active enemy (e.g. backtrack ring buffer)
   * @param {import('../entities/Enemy.js').Enemy} enemy
   * @param {number} dt
   * @param {Object} context
   */
  onEnemyUpdate(enemy, dt, context) {}

  /**
   * Hook: Invoked per fixed tick for player kinematics
   * @param {import('../entities/Player.js').Player} player
   * @param {number} dt
   * @param {Object} context
   */
  onPlayerUpdate(player, dt, context) {}

  /**
   * Hook: Renders world-space telemetry (ESP boxes, backtrack ghosts, lock-on vectors)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {Object} context
   */
  onRenderWorld(ctx, alpha, context) {}

  /**
   * Hook: Renders screen-space HUD badges
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   */
  onRenderHUD(ctx, x, y) {}
}

export const CHEAT_REGISTRY = {
  AIMBOT: {
    id: 'aimbot',
    name: 'AIMBOT',
    filename: 'Aimbot.dll',
    tier: RING_TIER.RING_3,
    rarity: CHEAT_RARITY.COMMON,
    color: COLOR.CYAN,
    maxLevel: 3,
    description: 'Autonomous target acquisition with velocity leading and vector lock-on lines.',
  },
  WALLHACK: {
    id: 'wallhack',
    name: 'WALLHACK (ESP)',
    filename: 'Wallhack.lua',
    tier: RING_TIER.RING_3,
    rarity: CHEAT_RARITY.COMMON,
    color: COLOR.CYAN,
    maxLevel: 3,
    description: 'Telemetry outlines displaying enemy distance, health, and geometric penetration.',
  },
  SPINBOT: {
    id: 'spinbot',
    name: 'SPINBOT (ANTI-AIM)',
    filename: 'Spinbot.asi',
    tier: RING_TIER.RING_2,
    rarity: CHEAT_RARITY.RARE,
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Rapid angle desynchronization causing incoming damage checks to glance and miss.',
  },
  DOUBLETAP: {
    id: 'doubletap',
    name: 'DOUBLE TAP',
    filename: 'DoubleTap.pkg',
    tier: RING_TIER.RING_2,
    rarity: CHEAT_RARITY.RARE,
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Emulates network packet choke to multiplex 2-3 bullets per tick at zero ammo cost.',
  },
  SILENTAIM: {
    id: 'silentaim',
    name: 'SILENT AIM',
    filename: 'SilentAim.vmp',
    tier: RING_TIER.RING_0,
    rarity: CHEAT_RARITY.KERNEL,
    color: COLOR.RED,
    maxLevel: 3,
    description: 'Dynamically curves bullet trajectories toward enemy hitboxes without altering aim crosshair.',
  },
  BACKTRACK: {
    id: 'backtrack',
    name: 'BACKTRACK',
    filename: 'Backtrack.sys',
    tier: RING_TIER.RING_2,
    rarity: CHEAT_RARITY.RARE,
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Maintains 90-frame historical ring buffer. Shooting enemy ghosts rewinds their position.',
  },
};
