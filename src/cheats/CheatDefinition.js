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
  COMMON: { name: 'USERLAND [RING 3]', color: COLOR.CYAN },
  RARE: { name: 'DRIVER SPACE [RING 2]', color: COLOR.AMBER },
  KERNEL: { name: 'KERNEL EXECUTION [RING 0]', color: COLOR.RED },
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
    this.rankDescriptions = def.rankDescriptions || [];
    this.level = 1;
    this.maxLevel = def.maxLevel || 3;
    this.color = def.color || COLOR.CYAN;
    this.enabled = true;
  }

  /**
   * Upgrades the cheat to the next rank
   * @returns {boolean} Whether upgrade succeeded
   */
  upgrade() {
    if (this.level < this.maxLevel) {
      this.level++;
      return true;
    }
    return false;
  }

  /**
   * Returns perk description for current or requested level
   * @param {number} [targetLevel]
   * @returns {string}
   */
  getPerkDescription(targetLevel = this.level) {
    const idx = targetLevel - 1;
    if (idx >= 0 && idx < this.rankDescriptions.length) {
      return this.rankDescriptions[idx];
    }
    return this.description;
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
   * Hook: Intercepts incoming damage to player (e.g. anti-aim, rootkit)
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
    rankDescriptions: [
      'Rank 1: Predictive angle snap (18 rad/s, 45° FOV, 400px range)',
      'Rank 2: Accelerated snap speed (34 rad/s, 70° FOV, 580px range)',
      'Rank 3: Instantaneous snap lock-on (180° FOV, 760px range)',
    ],
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
    rankDescriptions: [
      'Rank 1: Live wireframe bounding boxes, distance markers, and health telemetry',
      'Rank 2: Threat color classification & +1 bullet armor piercing',
      'Rank 3: Full geometric wall penetration (bullets shoot through walls) & threat snaplines',
    ],
  },
  SPINBOT: {
    id: 'spinbot',
    name: 'SPINBOT (ANTI-AIM)',
    filename: 'Spinbot.asi',
    tier: RING_TIER.RING_1,
    rarity: { name: 'HYPERVISOR [RING 1]', color: COLOR.AMBER },
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Rapid angle desynchronization causing incoming damage checks to glance and miss.',
    rankDescriptions: [
      'Rank 1: 1440°/s visual desync spin & 25% glancing blow evasion chance',
      'Rank 2: 2160°/s visual desync spin & 35% glancing blow evasion chance',
      'Rank 3: 2880°/s hyper-spin desync & 50% glancing blow evasion chance',
    ],
  },
  OVERCLOCK_DASH: {
    id: 'overclock_dash',
    name: 'OVERCLOCKED DASH',
    filename: 'OverclockDash.kext',
    tier: RING_TIER.RING_3,
    rarity: CHEAT_RARITY.COMMON,
    color: COLOR.CYAN,
    maxLevel: 3,
    description: 'Accelerates thruster cooling cycles and amplifies dash impulse velocity.',
    rankDescriptions: [
      'Rank 1: -30% dash cooldown & accelerated thruster capacitor recharge',
      'Rank 2: -50% dash cooldown & enhanced emergency burst impulse',
      'Rank 3: -70% dash cooldown & ultra-responsive evasive kinetic maneuvering',
    ],
  },
  DOUBLETAP: {
    id: 'doubletap',
    name: 'DOUBLE TAP',
    filename: 'DoubleTap.pkg',
    tier: RING_TIER.RING_2,
    rarity: CHEAT_RARITY.RARE,
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Emulates network packet choke to multiplex duplicate bullets per shot at zero ammo cost.',
    rankDescriptions: [
      'Rank 1: Multiplexes 1 extra bullet per shot (+100% burst volume) at 0 ammo cost',
      'Rank 2: Multiplexes 2 extra bullets per shot (+200% burst volume) at 0 ammo cost',
      'Rank 3: Multiplexes 3 extra bullets per shot (+300% burst volume) at 0 ammo cost',
    ],
  },
  SILENTAIM: {
    id: 'silentaim',
    name: 'SILENT AIM',
    filename: 'SilentAim.vmp',
    tier: RING_TIER.RING_0,
    rarity: CHEAT_RARITY.KERNEL,
    color: COLOR.RED,
    maxLevel: 3,
    description: 'Kernel-tier exploit providing predictive auto-aim, triggerbot auto-firing, and trajectory curvature with critical strikes.',
    rankDescriptions: [
      'Rank 1: Predictive auto-aim & triggerbot in 90° FOV cone with critical curved bullets',
      'Rank 2: Expands targeting cone to 140° FOV with rapid auto-fire and guaranteed critical strikes',
      'Rank 3: Full 360° omnidirectional kernel auto-lock and hyper-speed triggerbot',
    ],
  },
  BACKTRACK: {
    id: 'backtrack',
    name: 'BACKTRACK',
    filename: 'Backtrack.sys',
    tier: RING_TIER.RING_2,
    rarity: CHEAT_RARITY.RARE,
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Maintains 90-frame historical circular buffer. Shooting enemy ghosts rewinds their position.',
    rankDescriptions: [
      'Rank 1: 45-frame circular buffer (~0.75s rewind on ghost hitbox hit)',
      'Rank 2: 65-frame circular buffer (~1.1s rewind on ghost hitbox hit)',
      'Rank 3: 90-frame full circular buffer (~1.5s rewind on ghost hitbox hit)',
    ],
  },
  SPEEDHACK: {
    id: 'speedhack',
    name: 'SPEEDHACK',
    filename: 'Speedhack.exe',
    tier: RING_TIER.RING_3,
    rarity: CHEAT_RARITY.COMMON,
    color: COLOR.CYAN,
    maxLevel: 3,
    description: 'Overclocks player chassis bus clock rate to amplify base movement velocity.',
    rankDescriptions: [
      'Rank 1: +25% player movement velocity',
      'Rank 2: +45% player movement velocity',
      'Rank 3: +70% hyper-overclocked movement velocity',
    ],
  },
  TRIGGERBOT: {
    id: 'triggerbot',
    name: 'TRIGGERBOT',
    filename: 'Triggerbot.cs',
    tier: RING_TIER.RING_3,
    rarity: CHEAT_RARITY.COMMON,
    color: COLOR.CYAN,
    maxLevel: 3,
    description: 'Pulls the trigger autonomously with zero reaction delay when crosshair intersects an enemy.',
    rankDescriptions: [
      'Rank 1: 0ms reaction autonomous trigger pull on direct crosshair intersection',
      'Rank 2: Expanded snap tolerance cone around crosshair ray',
      'Rank 3: Wide snap tolerance and accelerated trigger response',
    ],
  },
  PACKETCHOKE: {
    id: 'packetchoke',
    name: 'PACKET CHOKE',
    filename: 'PacketChoke.net',
    tier: RING_TIER.RING_2,
    rarity: CHEAT_RARITY.RARE,
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Emulates network socket packet loss to drop incoming hostile hit confirmation packets.',
    rankDescriptions: [
      'Rank 1: 25% chance to drop/nullify incoming damage checks',
      'Rank 2: 40% chance to drop/nullify incoming damage checks',
      'Rank 3: 55% chance to drop/nullify incoming damage checks',
    ],
  },
  RADARTELEMETRY: {
    id: 'radartelemetry',
    name: 'RADAR TELEMETRY',
    filename: 'RadarTelemetry.ini',
    tier: RING_TIER.RING_2,
    rarity: CHEAT_RARITY.RARE,
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Renders a circular tactical radar HUD displaying all security daemons, weapon crates, and hazard cells.',
    rankDescriptions: [
      'Rank 1: Mini-radar screen overlay with 1400px scanning radius',
      'Rank 2: Highlights weapon crates and explosive cells with distinct blips',
      'Rank 3: Accelerated 360° sweeping frequency with high-contrast tactical pings',
    ],
  },
  PENETRATIONBUCKER: {
    id: 'penetrationbucker',
    name: 'PENETRATION BUCKER',
    filename: 'PenetrationBucker.bin',
    tier: RING_TIER.RING_1,
    rarity: { name: 'HYPERVISOR [RING 1]', color: COLOR.AMBER },
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Overclocks bullet kinetic core to pierce multiple static walls and destructible obstacles.',
    rankDescriptions: [
      'Rank 1: +2 projectile pierce and wall penetration capability',
      'Rank 2: +4 projectile pierce and wall penetration capability',
      'Rank 3: +8 projectile pierce through all walls and obstacles',
    ],
  },
  RAPIDFIRE: {
    id: 'rapidfire',
    name: 'RAPID FIRE',
    filename: 'RapidFire.ovl',
    tier: RING_TIER.RING_1,
    rarity: { name: 'HYPERVISOR [RING 1]', color: COLOR.AMBER },
    color: COLOR.AMBER,
    maxLevel: 3,
    description: 'Multiplies hardware firing frequency and accelerates clip reload cycles.',
    rankDescriptions: [
      'Rank 1: +40% weapon fire rate and -20% reload time',
      'Rank 2: +80% weapon fire rate and -35% reload time',
      'Rank 3: +120% hyper-speed weapon fire rate and -50% reload time',
    ],
  },
  NOCLIP: {
    id: 'noclip',
    name: 'NOCLIP (PHASING)',
    filename: 'Noclip.drv',
    tier: RING_TIER.RING_0,
    rarity: CHEAT_RARITY.KERNEL,
    color: COLOR.RED,
    maxLevel: 3,
    description: 'Bypasses the collision arbiter, allowing the player to phase through static walls and props.',
    rankDescriptions: [
      'Rank 1: Phase freely through interior static walls with quantum blur trails',
      'Rank 2: Zero movement deceleration when traversing dense walls and obstacles',
      'Rank 3: Total spatial phasing immunity across all world geometry',
    ],
  },
  ROOTKIT: {
    id: 'rootkit',
    name: 'ROOTKIT PURGE',
    filename: 'Rootkit.sys',
    tier: RING_TIER.RING_0,
    rarity: CHEAT_RARITY.KERNEL,
    color: COLOR.RED,
    maxLevel: 3,
    description: 'Kernel privilege execution: Press [F] to discharge an electromagnetic screen purge, obliterating hostile projectiles and frying all nearby security daemons.',
    rankDescriptions: [
      'Rank 1: EMP purge destroys all hostile projectiles, deals 300 kernel damage to all nearby daemons, and grants 2.25s invulnerability [Press F / Cooldown: 12s]',
      'Rank 2: EMP purge destroys all hostile projectiles, deals 600 kernel damage to all nearby daemons, and grants 3.0s invulnerability [Press F / Cooldown: 10s]',
      'Rank 3: EMP purge destroys all hostile projectiles, deals 900 kernel damage to all nearby daemons, and grants 3.75s invulnerability [Press F / Cooldown: 8s]',
    ],
  },
  KERNELPANIC: {
    id: 'kernelpanic',
    name: 'KERNEL PANIC',
    filename: 'KernelPanic.rip',
    tier: RING_TIER.RING_0,
    rarity: CHEAT_RARITY.KERNEL,
    color: COLOR.RED,
    maxLevel: 3,
    description: 'Catastrophic memory dump: periodic shots or taking damage unleashes an omnidirectional laser ring.',
    rankDescriptions: [
      'Rank 1: Every 10th shot unleashes a ring of 16 critical piercing lasers',
      'Rank 2: Every 7th shot unleashes a ring of 24 critical piercing lasers',
      'Rank 3: Every 5th shot unleashes a ring of 32 critical piercing lasers',
    ],
  },
  INFINITEAMMO: {
    id: 'infiniteammo',
    name: 'INFINITE AMMO',
    filename: 'InfiniteAmmo.sys',
    tier: RING_TIER.RING_0,
    rarity: CHEAT_RARITY.KERNEL,
    color: COLOR.RED,
    maxLevel: 3,
    description: 'Hardware DMA override locking weapon magazines: infinite ammunition with zero reload delays.',
    rankDescriptions: [
      'Rank 1: Weapon ammo does not deplete; reload cycles bypassed',
      'Rank 2: +15% weapon firing rate bonus under infinite ammo lock',
      'Rank 3: +30% weapon firing rate bonus under infinite ammo lock',
    ],
  },
};
