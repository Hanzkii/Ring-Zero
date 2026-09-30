/**
 * Ring Zero - Weapon Hardware & Ballistics Engine
 * Controls multi-weapon ballistics, spread dynamics, clip management, and projectile firing.
 */

import { COLOR, COLLISION_LAYER } from '../core/Constants.js';
import { randomRange } from '../core/VectorMath.js';

export const WEAPON_ARCHETYPES = {
  KERNEL_PISTOL: {
    id: 'kernel_pistol',
    name: 'KERNEL PISTOL',
    mode: 'semi',
    damage: 28,
    pellets: 1,
    spreadDeg: 1.5,
    speed: 1200,
    fireRate: 4.5, // Shots per second
    clipSize: 12,
    reloadTime: 0.9,
    pierce: 1,
    color: COLOR.CYAN,
    knockback: 120,
    recoilTrauma: 0.08,
  },
  FLAK_SUBMACHINE: {
    id: 'flak_submachine',
    name: 'FLAK SUBMACHINE',
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
  },
  COMBAT_SWEEPER: {
    id: 'combat_sweeper',
    name: 'COMBAT SWEEPER',
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
  },
  ROTARY_MINIGUN: {
    id: 'rotary_minigun',
    name: 'ROTARY MINIGUN',
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
  },
  VECTOR_RAILGUN: {
    id: 'vector_railgun',
    name: 'VECTOR RAILGUN',
    mode: 'semi',
    damage: 180,
    pellets: 1,
    spreadDeg: 0.0,
    speed: 2800,
    fireRate: 0.9,
    clipSize: 3,
    reloadTime: 2.0,
    pierce: 6,
    color: COLOR.WHITE,
    knockback: 450,
    recoilTrauma: 0.35,
  },
};

export class WeaponInstance {
  /**
   * @param {typeof WEAPON_ARCHETYPES[keyof typeof WEAPON_ARCHETYPES]} config
   */
  constructor(config) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
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

    this.cooldownTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  update(dt) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.currentAmmo = this.clipSize;
      }
    } else if (this.currentAmmo <= 0) {
      // Automatically reload when clip is empty
      this.startReload();
    }
  }

  startReload() {
    if (this.isReloading || this.currentAmmo >= this.clipSize) return false;
    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
    return true;
  }

  get reloadProgress() {
    if (!this.isReloading) return 1.0;
    return 1.0 - this.reloadTimer / this.reloadTime;
  }

  get canFire() {
    return this.cooldownTimer <= 0 && !this.isReloading && this.currentAmmo > 0;
  }
}

export class WeaponSystem {
  /**
   * @param {import('../core/ObjectPool.js').ObjectPool} projectilePool
   */
  constructor(projectilePool) {
    this.projectilePool = projectilePool;

    // Dual loadout slots
    this.slots = [
      new WeaponInstance(WEAPON_ARCHETYPES.KERNEL_PISTOL),
      null, // Secondary empty initially
    ];
    this.activeSlot = 0;

    // Optional fire interceptor hook for Cheats (Phase 3)
    this.fireInterceptor = null;
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
    if (!this.slots[1]) {
      // Secondary slot is empty: place weapon into secondary slot
      this.slots[1] = weapon;
      if (autoSwitch) {
        this.activeSlot = 1;
      }
    } else {
      // Both slots filled: replace the inactive reserve slot so currently held weapon is preserved
      const reserveSlot = this.activeSlot === 0 ? 1 : 0;
      this.slots[reserveSlot] = weapon;
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
   */
  update(dt, input, player, camera, autoFire = false, aimAngleOverride = null) {
    const weapon = this.activeWeapon;
    if (!weapon) return;

    weapon.update(dt);

    // Swap weapons with [Q] or number keys
    if (input.isKeyJustPressed('KeyQ')) {
      this.switchWeapon();
    }
    if (input.isKeyJustPressed('Digit1')) this.activeSlot = 0;
    if (input.isKeyJustPressed('Digit2') && this.slots[1]) this.activeSlot = 1;

    // Manual reload with [R]
    if (input.isKeyJustPressed('KeyR')) {
      weapon.startReload();
    }

    // Determine fire trigger (supports manual input or autonomous aimbot triggerbot)
    const wantsFire =
      autoFire ||
      (weapon.mode === 'auto'
        ? input.isMouseButtonDown(0)
        : input.isMouseButtonJustPressed(0));

    if (wantsFire) {
      if (weapon.currentAmmo <= 0) {
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
    weapon.currentAmmo--;
    weapon.cooldownTimer = weapon.fireInterval;

    if (weapon.currentAmmo <= 0) {
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

    // Screen shake when shooting has been removed for absolute combat precision
  }

  _spawnBullet(params) {
    const p = this.projectilePool.obtain();
    if (p) {
      p.spawn(params);
    }
  }
}
