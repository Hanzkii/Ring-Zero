/**
 * Ring Zero - Weapon Hardware & Ballistics Engine
 * Controls multi-weapon ballistics, spread dynamics, clip management, and projectile firing.
 */

import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { randomRange } from '../core/VectorMath.js';

export const WEAPON_ARCHETYPES = {
  // --- TIER 0: Baseline Starters ---
  PISTOL_SYS: {
    id: 'pistol_sys',
    name: 'Pistol.sys',
    tier: 0,
    mode: 'semi',
    damage: 22,
    pellets: 1,
    spreadDeg: 1.0,
    speed: 1100,
    fireRate: 4.2,
    clipSize: 10,
    reloadTime: 0.9,
    pierce: 1,
    color: COLOR.CYAN,
    knockback: 100,
    recoilTrauma: 0.05,
    description: 'Single-shot semi-auto, reliable precision.',
  },
  PULSE_SMG: {
    id: 'pulse_smg',
    name: 'Pulse SMG',
    tier: 0,
    mode: 'auto',
    damage: 11,
    pellets: 1,
    spreadDeg: 8.5,
    speed: 950,
    fireRate: 11.0,
    clipSize: 28,
    reloadTime: 1.2,
    pierce: 1,
    color: COLOR.CYAN,
    knockback: 60,
    recoilTrauma: 0.04,
    description: 'High fire-rate kinetic spray, wider spread.',
  },
  SCRAP_BLASTER: {
    id: 'scrap_blaster',
    name: 'Scrap Blaster',
    tier: 0,
    mode: 'semi',
    damage: 14,
    pellets: 3,
    spreadDeg: 14.0,
    speed: 850,
    fireRate: 2.2,
    clipSize: 6,
    reloadTime: 1.4,
    pierce: 1,
    color: COLOR.AMBER,
    knockback: 260,
    recoilTrauma: 0.16,
    description: 'Short-range triple pellet cone, heavy point-blank knockback.',
  },

  // --- TIER 1: Mil-Spec Hardware ---
  KERNEL_PISTOL: {
    id: 'kernel_pistol',
    name: 'Kernel Pistol',
    tier: 1,
    mode: 'semi',
    damage: 28,
    pellets: 1,
    spreadDeg: 1.5,
    speed: 1200,
    fireRate: 4.5,
    clipSize: 12,
    reloadTime: 0.9,
    pierce: 1,
    color: COLOR.CYAN,
    knockback: 120,
    recoilTrauma: 0.08,
    description: 'Precision military-spec sidearm with elevated kinetic punch.',
  },
  CODE_SWEEPER: {
    id: 'code_sweeper',
    name: 'Code Sweeper',
    tier: 1,
    mode: 'semi',
    damage: 12,
    pellets: 8,
    spreadDeg: 18.0,
    speed: 880,
    fireRate: 1.4,
    clipSize: 6,
    reloadTime: 1.8,
    pierce: 1,
    color: COLOR.AMBER,
    knockback: 220,
    recoilTrauma: 0.22,
    description: 'Wide-angle flak scattergun clearing dense swarms.',
  },
  COMBAT_SWEEPER: {
    id: 'combat_sweeper',
    name: 'Code Sweeper',
    tier: 1,
    mode: 'semi',
    damage: 12,
    pellets: 8,
    spreadDeg: 18.0,
    speed: 880,
    fireRate: 1.4,
    clipSize: 6,
    reloadTime: 1.8,
    pierce: 1,
    color: COLOR.AMBER,
    knockback: 220,
    recoilTrauma: 0.22,
    description: 'Wide-angle flak scattergun clearing dense swarms.',
  },
  FLAK_SUBMACHINE: {
    id: 'flak_submachine',
    name: 'Flak Submachine',
    tier: 1,
    mode: 'auto',
    damage: 14,
    pellets: 1,
    spreadDeg: 7.0,
    speed: 980,
    fireRate: 12.0,
    clipSize: 35,
    reloadTime: 1.2,
    pierce: 1,
    color: COLOR.CYAN,
    knockback: 70,
    recoilTrauma: 0.05,
    description: 'Rapid-cycling submachine gun with high sustained suppression.',
  },
  ROTARY_MINIGUN: {
    id: 'rotary_minigun',
    name: 'Rotary Minigun',
    tier: 1,
    mode: 'auto',
    damage: 16,
    pellets: 1,
    spreadDeg: 5.5,
    speed: 1100,
    fireRate: 18.0,
    clipSize: 90,
    reloadTime: 2.5,
    pierce: 1,
    color: COLOR.AMBER,
    knockback: 90,
    recoilTrauma: 0.04,
    description: 'Gatling barrel system spinning up massive lead output.',
  },

  // --- TIER 2: Kernel-Grade Prototypes ---
  VECTOR_RAILGUN: {
    id: 'vector_railgun',
    name: 'Vector Railgun',
    tier: 2,
    mode: 'semi',
    damage: 180,
    pellets: 1,
    spreadDeg: 0.0,
    speed: 2800,
    fireRate: 0.9,
    clipSize: 3,
    reloadTime: 2.0,
    pierce: 6,
    canPierceWalls: true,
    color: COLOR.WHITE,
    knockback: 450,
    recoilTrauma: 0.35,
    description: 'Relativistic slug penetrator boring through walls and swarms with zero falloff.',
  },
  MEMORY_CORRUPTOR: {
    id: 'memory_corruptor',
    name: 'Memory Corruptor',
    tier: 2,
    mode: 'auto',
    damage: 42,
    pellets: 1,
    spreadDeg: 2.5,
    speed: 1600,
    fireRate: 6.0,
    clipSize: 16,
    reloadTime: 1.5,
    pierce: 3,
    isCluster: true,
    clusterCount: 3,
    color: COLOR.RED,
    knockback: 180,
    recoilTrauma: 0.12,
    description: 'Volatile cluster ordnance detonating into secondary corrosive sub-munitions.',
  },
  PLASMA_FLAMER: {
    id: 'plasma_flamer',
    name: 'Plasma Flamer',
    tier: 1,
    mode: 'auto',
    damage: 18,
    pellets: 2,
    spreadDeg: 12.0,
    speed: 750,
    fireRate: 15.0,
    clipSize: 60,
    reloadTime: 1.6,
    pierce: 4,
    color: '#FF7700',
    knockback: 40,
    recoilTrauma: 0.03,
    description: 'High-temperature thermal stream incinerating approaching swarms.',
  },
  CRYO_INJECTOR: {
    id: 'cryo_injector',
    name: 'Cryo Injector',
    tier: 1,
    mode: 'auto',
    damage: 26,
    pellets: 1,
    spreadDeg: 2.0,
    speed: 1400,
    fireRate: 8.0,
    clipSize: 24,
    reloadTime: 1.1,
    pierce: 2,
    color: COLOR.CYAN,
    knockback: 110,
    recoilTrauma: 0.05,
    description: 'Sub-zero cryo darts penetrating light armor with high muzzle velocity.',
  },

  // --- KERNEL LEVEL: Pure Ring 0 Hardware ---
  QUANTUM_BEAM: {
    id: 'quantum_beam',
    name: 'Quantum Beam',
    tier: 0,
    mode: 'auto',
    damage: 65,
    pellets: 1,
    spreadDeg: 0.0,
    speed: 3200,
    fireRate: 8.5,
    clipSize: 30,
    reloadTime: 1.8,
    pierce: 8,
    canPierceWalls: true,
    color: '#00F0FF',
    knockback: 250,
    recoilTrauma: 0.15,
    description: 'Relativistic quantum energy beam vaporizing everything along its trajectory.',
  },
  HOMING_SWARM: {
    id: 'homing_swarm',
    name: 'Homing Swarm',
    tier: 0,
    mode: 'auto',
    damage: 38,
    pellets: 4,
    spreadDeg: 25.0,
    speed: 1200,
    fireRate: 4.0,
    clipSize: 20,
    reloadTime: 1.5,
    pierce: 2,
    isCluster: true,
    clusterCount: 2,
    color: '#FFB000',
    knockback: 160,
    recoilTrauma: 0.10,
    description: 'Multi-vector guided cluster micro-missiles overwhelming entire hostiles sectors.',
  },
  DESYNC_GRENADE: {
    id: 'desync_grenade',
    name: 'Desync Grenade',
    tier: 0,
    mode: 'semi',
    damage: 240,
    pellets: 1,
    spreadDeg: 1.0,
    speed: 1000,
    fireRate: 1.2,
    clipSize: 4,
    reloadTime: 2.2,
    pierce: 1,
    isCluster: true,
    clusterCount: 6,
    color: '#FF003C',
    knockback: 500,
    recoilTrauma: 0.40,
    description: 'Massive temporal distortion explosive detonating into high-yield cluster fragments.',
  },
};

export const WEAPON_TIERS = {
  TIER_0: [WEAPON_ARCHETYPES.PISTOL_SYS, WEAPON_ARCHETYPES.PULSE_SMG, WEAPON_ARCHETYPES.SCRAP_BLASTER],
  TIER_1: [WEAPON_ARCHETYPES.KERNEL_PISTOL, WEAPON_ARCHETYPES.COMBAT_SWEEPER, WEAPON_ARCHETYPES.FLAK_SUBMACHINE, WEAPON_ARCHETYPES.ROTARY_MINIGUN, WEAPON_ARCHETYPES.PLASMA_FLAMER, WEAPON_ARCHETYPES.CRYO_INJECTOR],
  TIER_2: [WEAPON_ARCHETYPES.VECTOR_RAILGUN, WEAPON_ARCHETYPES.MEMORY_CORRUPTOR, WEAPON_ARCHETYPES.QUANTUM_BEAM, WEAPON_ARCHETYPES.HOMING_SWARM, WEAPON_ARCHETYPES.DESYNC_GRENADE],
};

/**
 * Returns weapons unlocked up to a given milestone wave
 * @param {number} waveNum
 * @returns {Array<Object>}
 */
export function getUnlockedWeaponsForWave(waveNum) {
  const list = [...WEAPON_TIERS.TIER_0];
  if (waveNum >= 3) {
    list.push(...WEAPON_TIERS.TIER_1);
  }
  if (waveNum >= 6) {
    list.push(...WEAPON_TIERS.TIER_2);
  }
  return list;
}

/**
 * Returns 3 tier-appropriate weapons for Ring Clearance Escalation Draft
 * @param {number|string} targetRing - 1 or 0 ('RING_1' or 'RING_0')
 * @returns {Array<Object>}
 */
export function getEscalationWeaponsForRing(targetRing) {
  if (targetRing === 0 || targetRing === 'RING_0') {
    return [
      WEAPON_ARCHETYPES.QUANTUM_BEAM,
      WEAPON_ARCHETYPES.HOMING_SWARM,
      WEAPON_ARCHETYPES.DESYNC_GRENADE,
    ];
  }
  // Default to Ring 1 (Supervisor)
  return [
    WEAPON_ARCHETYPES.VECTOR_RAILGUN,
    WEAPON_ARCHETYPES.PLASMA_FLAMER,
    WEAPON_ARCHETYPES.CRYO_INJECTOR,
  ];
}

export class WeaponInstance {
  /**
   * @param {typeof WEAPON_ARCHETYPES[keyof typeof WEAPON_ARCHETYPES]} config
   */
  constructor(config) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.tier = config.tier ?? 1;
    this.description = config.description || '';
    this.mode = config.mode;
    this.damage = config.damage;
    this.pellets = config.pellets;
    this.spreadRad = (config.spreadDeg * Math.PI) / 180;
    this.speed = config.speed;
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

    this.cooldownTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.hasInfiniteAmmo = false;
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
