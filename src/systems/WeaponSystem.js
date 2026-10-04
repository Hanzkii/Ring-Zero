/**
 * Ring Zero - Weapon Hardware & Ballistics Engine
 * Controls multi-weapon ballistics, spread dynamics, clip management, and projectile firing.
 */

import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { randomRange } from '../core/VectorMath.js';

export const WEAPON_ARCHETYPES = {
  // =========================================================================
  // --- RING 3: USERLAND (Waves 1–15 | Cyan/Green) ---
  // =========================================================================
  SIGTERM: {
    id: 'sigterm',
    name: 'SIGTERM',
    tier: 3,
    ring: 3,
    mode: 'semi',
    damage: 26,
    pellets: 1,
    spreadDeg: 1.0,
    speed: 1200,
    fireRate: 4.5,
    clipSize: 12,
    reloadTime: 0.85,
    pierce: 1,
    color: '#00F0FF',
    knockback: 110,
    recoilTrauma: 0.05,
    description: 'Semi-auto precision termination pulse. Clean kinetic accuracy.',
  },
  STDERR_STREAM: {
    id: 'stderr_stream',
    name: 'STDERR_STREAM',
    tier: 3,
    ring: 3,
    mode: 'auto',
    damage: 14,
    pellets: 3,
    spreadDeg: 18.0,
    speed: 880,
    fireRate: 3.5,
    clipSize: 18,
    reloadTime: 1.2,
    pierce: 1,
    color: '#00FF66',
    knockback: 190,
    recoilTrauma: 0.09,
    description: 'Short-range wide cone error spray. Ideal for early crowd clearing.',
  },
  SOCKET_BLASTER: {
    id: 'socket_blaster',
    name: 'SOCKET_BLASTER',
    tier: 3,
    ring: 3,
    mode: 'auto',
    damage: 12,
    pellets: 1,
    spreadDeg: 6.5,
    speed: 1050,
    fireRate: 12.0,
    clipSize: 32,
    reloadTime: 1.1,
    pierce: 1,
    color: '#00F0FF',
    knockback: 65,
    recoilTrauma: 0.04,
    description: 'High fire-rate kinetic spray carbine with rapid transmission cycles.',
  },
  CHMOD_777: {
    id: 'chmod_777',
    name: 'CHMOD_777',
    tier: 3,
    ring: 3,
    mode: 'semi',
    damage: 13,
    pellets: 8,
    spreadDeg: 22.0,
    speed: 820,
    fireRate: 1.6,
    clipSize: 6,
    reloadTime: 1.5,
    pierce: 1,
    color: '#00FF66',
    knockback: 280,
    recoilTrauma: 0.20,
    description: 'Wide-open 8-pellet shotgun. Total permissions, massive point-blank punch.',
  },

  // =========================================================================
  // --- RING 2: DEVICE DRIVERS (Waves 16–30 | Amber/Orange) ---
  // =========================================================================
  DMA_RAIL: {
    id: 'dma_rail',
    name: 'DMA_RAIL',
    tier: 2,
    ring: 2,
    mode: 'semi',
    damage: 75,
    pellets: 1,
    spreadDeg: 0.5,
    speed: 2100,
    fireRate: 2.2,
    clipSize: 8,
    reloadTime: 1.4,
    pierce: 3,
    color: '#FFB000',
    knockback: 260,
    recoilTrauma: 0.18,
    description: 'Direct memory access railgun piercing through up to 3 hostiles.',
  },
  INTERRUPT_VECTOR: {
    id: 'interrupt_vector',
    name: 'INTERRUPT_VECTOR',
    tier: 2,
    ring: 2,
    mode: 'auto',
    damage: 24,
    pellets: 2,
    spreadDeg: 8.0,
    speed: 1300,
    fireRate: 5.5,
    clipSize: 20,
    reloadTime: 1.3,
    pierce: 2,
    isCluster: true,
    clusterCount: 2,
    color: '#FF7700',
    knockback: 140,
    recoilTrauma: 0.08,
    description: 'Arc-disruptor weapon jumping sub-pulses across clustered hostiles.',
  },
  BUS_BURST: {
    id: 'bus_burst',
    name: 'BUS_BURST',
    tier: 2,
    ring: 2,
    mode: 'auto',
    damage: 28,
    pellets: 1,
    spreadDeg: 3.0,
    speed: 1400,
    fireRate: 8.0,
    clipSize: 24,
    reloadTime: 1.25,
    pierce: 1,
    color: '#FFB000',
    knockback: 110,
    recoilTrauma: 0.07,
    description: 'High-speed 4-round hardware bus burst carbine with sharp muzzle climb.',
  },
  OVERCLOCK_ROTARY: {
    id: 'overclock_rotary',
    name: 'OVERCLOCK_ROTARY',
    tier: 2,
    ring: 2,
    mode: 'auto',
    damage: 18,
    pellets: 1,
    spreadDeg: 5.0,
    speed: 1250,
    fireRate: 16.0,
    clipSize: 75,
    reloadTime: 2.2,
    pierce: 1,
    color: '#FF8800',
    knockback: 80,
    recoilTrauma: 0.04,
    description: 'Spooling rotary autocannon unleashing progressive high-frequency lead.',
  },

  // =========================================================================
  // --- RING 1: HYPERVISOR (Waves 31–45 | Magenta/Ultraviolet) ---
  // =========================================================================
  SHADOW_PAGE: {
    id: 'shadow_page',
    name: 'SHADOW_PAGE',
    tier: 1,
    ring: 1,
    mode: 'auto',
    damage: 38,
    pellets: 2,
    spreadDeg: 2.0,
    speed: 1600,
    fireRate: 5.0,
    clipSize: 22,
    reloadTime: 1.4,
    pierce: 2,
    color: '#D900FF',
    knockback: 160,
    recoilTrauma: 0.10,
    description: 'Mirrored page allocator firing synchronized dual beams along parallel axes.',
  },
  CONTAINER_BREACH: {
    id: 'container_breach',
    name: 'CONTAINER_BREACH',
    tier: 1,
    ring: 1,
    mode: 'semi',
    damage: 85,
    pellets: 1,
    spreadDeg: 1.5,
    speed: 1100,
    fireRate: 1.8,
    clipSize: 6,
    reloadTime: 1.8,
    pierce: 2,
    isCluster: true,
    clusterCount: 4,
    color: '#FF00AA',
    knockback: 320,
    recoilTrauma: 0.24,
    description: 'Pressurized cluster payload detonating into 4 volatile sub-munitions on impact.',
  },
  VMM_PHASOR: {
    id: 'vmm_phasor',
    name: 'VMM_PHASOR',
    tier: 1,
    ring: 1,
    mode: 'auto',
    damage: 48,
    pellets: 1,
    spreadDeg: 0.0,
    speed: 2600,
    fireRate: 6.5,
    clipSize: 25,
    reloadTime: 1.6,
    pierce: 5,
    canPierceWalls: true,
    color: '#B000FF',
    knockback: 180,
    recoilTrauma: 0.12,
    description: 'Continuous hypervisor phasor penetrating walls, armor, and shielding.',
  },
  VM_SINGULARITY: {
    id: 'vm_singularity',
    name: 'VM_SINGULARITY',
    tier: 1,
    ring: 1,
    mode: 'semi',
    damage: 130,
    pellets: 1,
    spreadDeg: 1.0,
    speed: 950,
    fireRate: 1.2,
    clipSize: 4,
    reloadTime: 2.0,
    pierce: 3,
    isCluster: true,
    clusterCount: 3,
    color: '#D900FF',
    knockback: -220, // Negative knockback pulls hostiles inward
    recoilTrauma: 0.26,
    description: 'Gravitational vortex core drawing nearby minor hostiles toward impact zero.',
  },

  // =========================================================================
  // --- RING 0: KERNEL SPACE (Waves 46+ | Crimson/Black) ---
  // =========================================================================
  NULL_POINTER: {
    id: 'null_pointer',
    name: 'NULL_POINTER',
    tier: 0,
    ring: 0,
    mode: 'semi',
    damage: 260,
    pellets: 1,
    spreadDeg: 0.0,
    speed: 3400,
    fireRate: 1.4,
    clipSize: 5,
    reloadTime: 1.9,
    pierce: 8,
    canPierceWalls: true,
    color: '#FF003C',
    knockback: 500,
    recoilTrauma: 0.35,
    description: 'Absolute de-allocation beam instantly vaporizing target memory structures.',
  },
  BUFFER_OVERFLOW: {
    id: 'buffer_overflow',
    name: 'BUFFER_OVERFLOW',
    tier: 0,
    ring: 0,
    mode: 'auto',
    damage: 32,
    pellets: 2,
    spreadDeg: 10.0,
    speed: 1500,
    fireRate: 18.0,
    clipSize: 80,
    reloadTime: 2.1,
    pierce: 2,
    isCluster: true,
    clusterCount: 2,
    color: '#FF2A6D',
    knockback: 120,
    recoilTrauma: 0.06,
    description: 'Hyper-rate cascade flooding hostile address spaces with memory leak fragments.',
  },
  KERNEL_PANIC: {
    id: 'kernel_panic',
    name: 'KERNEL_PANIC',
    tier: 0,
    ring: 0,
    mode: 'semi',
    damage: 350,
    pellets: 12,
    spreadDeg: 36.0,
    speed: 1800,
    fireRate: 1.0,
    clipSize: 3,
    reloadTime: 2.4,
    pierce: 6,
    canPierceWalls: true,
    color: '#FF003C',
    knockback: 650,
    recoilTrauma: 0.45,
    description: 'Critical system fault discharging an omnidirectional ring of destructive pulses.',
  },
  ROOTKIT_EXEC: {
    id: 'rootkit_exec',
    name: 'ROOTKIT_EXEC',
    tier: 0,
    ring: 0,
    mode: 'auto',
    damage: 75,
    pellets: 1,
    spreadDeg: 1.0,
    speed: 2200,
    fireRate: 5.5,
    clipSize: 20,
    reloadTime: 1.6,
    pierce: 4,
    isCluster: true,
    clusterCount: 3,
    color: '#FF003C',
    knockback: 220,
    recoilTrauma: 0.14,
    description: 'Invasive parasitic exploit corrupting hostiles into secondary explosive nodes.',
  },
};

// Aliases for legacy configurations and saves
WEAPON_ARCHETYPES.PISTOL_SYS = WEAPON_ARCHETYPES.SIGTERM;
WEAPON_ARCHETYPES.PULSE_SMG = WEAPON_ARCHETYPES.SOCKET_BLASTER;
WEAPON_ARCHETYPES.SCRAP_BLASTER = WEAPON_ARCHETYPES.CHMOD_777;
WEAPON_ARCHETYPES.KERNEL_PISTOL = WEAPON_ARCHETYPES.DMA_RAIL;
WEAPON_ARCHETYPES.CODE_SWEEPER = WEAPON_ARCHETYPES.INTERRUPT_VECTOR;
WEAPON_ARCHETYPES.COMBAT_SWEEPER = WEAPON_ARCHETYPES.INTERRUPT_VECTOR;
WEAPON_ARCHETYPES.FLAK_SUBMACHINE = WEAPON_ARCHETYPES.BUS_BURST;
WEAPON_ARCHETYPES.ROTARY_MINIGUN = WEAPON_ARCHETYPES.OVERCLOCK_ROTARY;
WEAPON_ARCHETYPES.VECTOR_RAILGUN = WEAPON_ARCHETYPES.VMM_PHASOR;
WEAPON_ARCHETYPES.MEMORY_CORRUPTOR = WEAPON_ARCHETYPES.CONTAINER_BREACH;
WEAPON_ARCHETYPES.PLASMA_FLAMER = WEAPON_ARCHETYPES.SHADOW_PAGE;
WEAPON_ARCHETYPES.CRYO_INJECTOR = WEAPON_ARCHETYPES.VM_SINGULARITY;
WEAPON_ARCHETYPES.QUANTUM_BEAM = WEAPON_ARCHETYPES.NULL_POINTER;
WEAPON_ARCHETYPES.HOMING_SWARM = WEAPON_ARCHETYPES.BUFFER_OVERFLOW;
WEAPON_ARCHETYPES.DESYNC_GRENADE = WEAPON_ARCHETYPES.KERNEL_PANIC;

export const WEAPON_TIERS = {
  TIER_3: [
    WEAPON_ARCHETYPES.SIGTERM,
    WEAPON_ARCHETYPES.STDERR_STREAM,
    WEAPON_ARCHETYPES.SOCKET_BLASTER,
    WEAPON_ARCHETYPES.CHMOD_777,
  ],
  TIER_2: [
    WEAPON_ARCHETYPES.DMA_RAIL,
    WEAPON_ARCHETYPES.INTERRUPT_VECTOR,
    WEAPON_ARCHETYPES.BUS_BURST,
    WEAPON_ARCHETYPES.OVERCLOCK_ROTARY,
  ],
  TIER_1: [
    WEAPON_ARCHETYPES.SHADOW_PAGE,
    WEAPON_ARCHETYPES.CONTAINER_BREACH,
    WEAPON_ARCHETYPES.VMM_PHASOR,
    WEAPON_ARCHETYPES.VM_SINGULARITY,
  ],
  TIER_0: [
    WEAPON_ARCHETYPES.NULL_POINTER,
    WEAPON_ARCHETYPES.BUFFER_OVERFLOW,
    WEAPON_ARCHETYPES.KERNEL_PANIC,
    WEAPON_ARCHETYPES.ROOTKIT_EXEC,
  ],
};

// Aliases for legacy compatibility
WEAPON_TIERS.TIER_STARTERS = WEAPON_TIERS.TIER_3;
WEAPON_TIERS.TIER_MEDIUM = WEAPON_TIERS.TIER_2;
WEAPON_TIERS.TIER_MILSPEC = WEAPON_TIERS.TIER_1;
WEAPON_TIERS.TIER_GLITCH = WEAPON_TIERS.TIER_0;

/**
 * Returns weapons unlocked up to a given milestone wave for Arsenal selection
 * @param {number} waveNum
 * @returns {Array<Object>}
 */
export function getUnlockedWeaponsForWave(waveNum) {
  const list = [...WEAPON_TIERS.TIER_3];
  if (waveNum >= 3) {
    list.push(...WEAPON_TIERS.TIER_2);
  }
  if (waveNum >= 6) {
    list.push(...WEAPON_TIERS.TIER_1);
  }
  if (waveNum >= 10) {
    list.push(...WEAPON_TIERS.TIER_0);
  }
  return list;
}

/**
 * Returns cumulative unlocked weapon pool for a target Protection Ring
 * @param {number|string} targetRing - 3, 2, 1, 0 or 'RING_3', 'RING_2', 'RING_1', 'RING_0'
 * @returns {Array<Object>}
 */
export function getCumulativeWeaponsForRing(targetRing) {
  const ring = typeof targetRing === 'string'
    ? (targetRing === 'RING_0' ? 0 : targetRing === 'RING_1' ? 1 : targetRing === 'RING_2' ? 2 : 3)
    : Number(targetRing);

  const list = [...WEAPON_TIERS.TIER_3];
  if (ring <= 2) {
    list.push(...WEAPON_TIERS.TIER_2);
  }
  if (ring <= 1) {
    list.push(...WEAPON_TIERS.TIER_1);
  }
  if (ring === 0) {
    list.push(...WEAPON_TIERS.TIER_0);
  }
  return list;
}

/**
 * Returns 4 tier-appropriate weapons for Ring Clearance Escalation Draft without undefined entries
 * @param {number|string} targetRing - 3, 2, 1, or 0 ('RING_3', 'RING_2', 'RING_1', 'RING_0')
 * @returns {Array<Object>}
 */
export function getEscalationWeaponsForRing(targetRing) {
  const ring = typeof targetRing === 'string'
    ? (targetRing === 'RING_0' ? 0 : targetRing === 'RING_1' ? 1 : targetRing === 'RING_2' ? 2 : 3)
    : Number(targetRing);

  if (ring === 0) {
    // Ring 0: Kernel Space (Waves 46+ | Crimson/Black)
    return [
      WEAPON_ARCHETYPES.NULL_POINTER,
      WEAPON_ARCHETYPES.BUFFER_OVERFLOW,
      WEAPON_ARCHETYPES.KERNEL_PANIC,
      WEAPON_ARCHETYPES.ROOTKIT_EXEC,
    ];
  } else if (ring === 1) {
    // Ring 1: Hypervisor (Waves 31–45 | Magenta/Ultraviolet)
    return [
      WEAPON_ARCHETYPES.SHADOW_PAGE,
      WEAPON_ARCHETYPES.CONTAINER_BREACH,
      WEAPON_ARCHETYPES.VMM_PHASOR,
      WEAPON_ARCHETYPES.VM_SINGULARITY,
    ];
  } else if (ring === 2) {
    // Ring 2: Device Drivers (Waves 16–30 | Amber/Orange)
    return [
      WEAPON_ARCHETYPES.DMA_RAIL,
      WEAPON_ARCHETYPES.INTERRUPT_VECTOR,
      WEAPON_ARCHETYPES.BUS_BURST,
      WEAPON_ARCHETYPES.OVERCLOCK_ROTARY,
    ];
  } else {
    // Ring 3: Userland (Waves 1–15 | Cyan/Green)
    return [
      WEAPON_ARCHETYPES.SIGTERM,
      WEAPON_ARCHETYPES.STDERR_STREAM,
      WEAPON_ARCHETYPES.SOCKET_BLASTER,
      WEAPON_ARCHETYPES.CHMOD_777,
    ];
  }
}

export class WeaponInstance {
  /**
   * @param {typeof WEAPON_ARCHETYPES[keyof typeof WEAPON_ARCHETYPES]} config
   */
  constructor(config) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.tier = config.tier ?? 3;
    this.description = config.description || '';
    this.mode = config.mode;
    this.damage = config.damage;
    this.pellets = config.pellets;
    this.spreadRad = (config.spreadDeg * Math.PI) / 180;
    this.speed = config.speed;
    this.fireRate = config.fireRate;
    this.fireInterval = 1 / config.fireRate;
    this.clipSize = config.clipSize;
    this.currentAmmo = config.clipSize;
    this.reloadTime = config.reloadTime;
    this.pierce = config.pierce;
    this.color = config.color;
    this.knockback = config.knockback;
    this.recoilTrauma = config.recoilTrauma;
    this.canPierceWalls = Boolean(config.canPierceWalls);
    this.isCluster = Boolean(config.isCluster);
    this.clusterCount = config.clusterCount || 0;

    this.overclockLevel = 0;
    this.cooldownTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.hasInfiniteAmmo = false;
  }

  /**
   * Applies permanent overclock multiplier to weapon stats (+15% per rank)
   * @param {number} [multiplier=1.15]
   * @returns {this}
   */
  applyOverclock(multiplier = 1.15) {
    this.overclockLevel = (this.overclockLevel || 0) + 1;
    this.damage = Math.round(this.damage * multiplier);
    this.speed = Math.round(this.speed * multiplier);
    this.fireInterval = this.fireInterval / multiplier;
    this.fireRate = 1 / this.fireInterval;
    return this;
  }

  update(dt, hasInfiniteAmmo = false) {
    this.hasInfiniteAmmo = hasInfiniteAmmo;
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    if (hasInfiniteAmmo) {
      this.isReloading = false;
      this.currentAmmo = this.clipSize;
      return;
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.currentAmmo = this.clipSize;
        if (this.onReloadDone) this.onReloadDone();
      }
    } else if (this.currentAmmo <= 0) {
      // Automatically reload when clip is empty
      this.startReload();
    }
  }

  startReload() {
    if (this.hasInfiniteAmmo || this.isReloading || this.currentAmmo >= this.clipSize) return false;
    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
    if (this.onReloadStart) this.onReloadStart();
    return true;
  }

  get reloadProgress() {
    if (this.hasInfiniteAmmo || !this.isReloading) return 1.0;
    return 1.0 - this.reloadTimer / this.reloadTime;
  }

  get canFire() {
    if (this.hasInfiniteAmmo) return this.cooldownTimer <= 0;
    return this.cooldownTimer <= 0 && !this.isReloading && this.currentAmmo > 0;
  }
}

export class WeaponSystem {
  /**
   * @param {import('../core/ObjectPool.js').ObjectPool} projectilePool
   */
  constructor(projectilePool) {
    this.projectilePool = projectilePool;

    // Callbacks
    this.onFire = null;
    this.onReloadStart = null;
    this.onReloadDone = null;

    // Dual loadout slots
    this.slots = [
      this._wireInstance(new WeaponInstance(WEAPON_ARCHETYPES.KERNEL_PISTOL)),
      null, // Secondary empty initially
    ];
    this.activeSlot = 0;

    // Optional fire interceptor hook for Cheats (Phase 3)
    this.fireInterceptor = null;
    this.cheatManager = null;
    this.hasInfiniteAmmo = false;
  }

  _wireInstance(instance) {
    if (!instance) return null;
    instance.onReloadStart = () => this.onReloadStart?.(instance);
    instance.onReloadDone = () => this.onReloadDone?.(instance);
    return instance;
  }

  get activeWeapon() {
    return this.slots[this.activeSlot] || this.slots[0];
  }

  /**
   * Equips a new weapon into reserve slot without auto-switching away from current active weapon
   * @param {WeaponInstance} weapon
   * @param {boolean} [autoSwitch=false]
   */
  equipWeapon(weapon, autoSwitch = false) {
    const wired = this._wireInstance(weapon);
    if (!this.slots[1]) {
      // Secondary slot is empty: place weapon into secondary slot
      this.slots[1] = wired;
      if (autoSwitch) {
        this.activeSlot = 1;
      }
    } else {
      // Both slots filled: replace the inactive reserve slot so currently held weapon is preserved
      const reserveSlot = this.activeSlot === 0 ? 1 : 0;
      this.slots[reserveSlot] = wired;
      if (autoSwitch) {
        this.activeSlot = reserveSlot;
      }
    }
  }

  /**
   * Swaps between primary and secondary weapon slots
   */
  switchWeapon() {
    if (this.slots[0] && this.slots[1]) {
      this.activeSlot = this.activeSlot === 0 ? 1 : 0;
    }
  }

  /**
   * Primary weapon update & firing routine
   * @param {number} dt
   * @param {import('../core/InputManager.js').InputManager} input
   * @param {import('../entities/Player.js').Player} player
   * @param {import('../core/Camera2D.js').Camera2D} camera
   * @param {boolean} [autoFire=false]
   * @param {number} [aimAngleOverride=null] - Overrides raw mouse aim angle (e.g. from Aimbot lock)
   * @param {import('../systems/CheatManager.js').CheatManager} [cheatManager=null]
   */
  update(dt, input, player, camera, autoFire = false, aimAngleOverride = null, cheatManager = null) {
    const weapon = this.activeWeapon;
    if (!weapon) return;

    if (cheatManager) this.cheatManager = cheatManager;
    const infiniteCheat = this.cheatManager?.getCheat?.('infiniteammo');
    const isInfinite = Boolean((infiniteCheat && infiniteCheat.enabled) || this.hasInfiniteAmmo);
    this.hasInfiniteAmmo = isInfinite;

    weapon.update(dt, this.hasInfiniteAmmo);

    // Swap weapons with [Q] or number keys
    if (input.isKeyJustPressed('KeyQ')) {
      this.switchWeapon();
    }
    if (input.isKeyJustPressed('Digit1')) this.activeSlot = 0;
    if (input.isKeyJustPressed('Digit2') && this.slots[1]) this.activeSlot = 1;

    // Manual reload with [R]
    if (input.isKeyJustPressed('KeyR') && !this.hasInfiniteAmmo) {
      weapon.startReload();
    }

    // Determine fire trigger (supports manual input or autonomous aimbot triggerbot)
    const wantsFire =
      autoFire ||
      (weapon.mode === 'auto'
        ? input.isMouseButtonDown(0)
        : input.isMouseButtonJustPressed(0));

    if (wantsFire) {
      if (!this.hasInfiniteAmmo && weapon.currentAmmo <= 0) {
        weapon.startReload();
      } else if (weapon.canFire) {
        const fireAngle = typeof aimAngleOverride === 'number' ? aimAngleOverride : input.aimAngle;
        this._fireWeapon(weapon, player, fireAngle, camera);
      }
    }
  }

  /**
   * Spawns ballistics into the projectile pool with spread calculations
   * @param {WeaponInstance} weapon
   * @param {import('../entities/Player.js').Player} player
   * @param {number} baseAimAngle
   * @param {import('../core/Camera2D.js').Camera2D} camera
   */
  _fireWeapon(weapon, player, baseAimAngle, camera) {
    const hasInf = Boolean(this.hasInfiniteAmmo || this.cheatManager?.isActive?.('infiniteammo'));
    if (!hasInf) {
      weapon.currentAmmo--;
    }

    const infiniteCheat = this.cheatManager?.getCheat?.('infiniteammo');
    const fireRateMult = (hasInf && infiniteCheat) ? (infiniteCheat.fireRateMultiplier || 1.0) : 1.0;
    weapon.cooldownTimer = weapon.fireInterval / fireRateMult;
    if (this.onFire) this.onFire(weapon);

    // Apply tactile weapon recoil kick to player
    if (player && typeof player.applyRecoil === 'function') {
      player.applyRecoil(weapon.recoilTrauma || 0.1);
    }

    if (!hasInf && weapon.currentAmmo <= 0) {
      weapon.startReload();
    }

    // Apply movement penalty to spread
    const playerSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    const speedRatio = Math.min(1.0, playerSpeed / player.maxSpeed);
    const dynamicSpread = weapon.spreadRad * (1.0 + speedRatio * 0.45);

    // Muzzle offset in facing direction
    const muzzleDist = player.radius + 6;
    const muzzleX = player.x + Math.cos(baseAimAngle) * muzzleDist;
    const muzzleY = player.y + Math.sin(baseAimAngle) * muzzleDist;

    // Pellet loop
    for (let i = 0; i < weapon.pellets; i++) {
      const spreadOffset = randomRange(-dynamicSpread * 0.5, dynamicSpread * 0.5);
      const bulletAngle = baseAimAngle + spreadOffset;

      const bulletParams = {
        x: muzzleX,
        y: muzzleY,
        angle: bulletAngle,
        speed: weapon.speed * randomRange(0.97, 1.03),
        damage: weapon.damage,
        pierce: weapon.pierce,
        canPierceWalls: Boolean(weapon.canPierceWalls || weapon.config?.canPierceWalls),
        isCluster: Boolean(weapon.isCluster || weapon.config?.isCluster),
        clusterCount: weapon.clusterCount || weapon.config?.clusterCount || 0,
        maxLifetime: 1.8,
        color: weapon.color,
        layer: COLLISION_LAYER.PROJECTILE_PLAYER,
        knockback: weapon.knockback,
        isCritical: Math.random() < 0.12, // 12% baseline crit chance
      };

      // Allow cheat interceptor to multiplex or curve bullets
      if (this.fireInterceptor) {
        this.fireInterceptor(bulletParams, (params) => this._spawnBullet(params));
      } else {
        this._spawnBullet(bulletParams);
      }
    }
  }

  _spawnBullet(params) {
    const p = this.projectilePool.obtain();
    if (p) {
      p.spawn(params);
    }
  }
}
