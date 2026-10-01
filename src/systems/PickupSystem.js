/**
 * Ring Zero - Pickup & Economy System
 * Manages magnetic attraction physics for Memory Fragments (XP) and Crypto Bounties.
 * Scales attraction radius and acceleration dynamics based on Cache Magnet firmware rank.
 */

import { DROP_TYPE } from '../entities/Drop.js';

export class PickupSystem {
  /**
   * @param {Object} [options={}]
   * @param {import('../services/StorageService.js').StorageService} [options.storage]
   */
  constructor({ storage = null } = {}) {
    this.storage = storage;
    this.baseAttractionRadius = 180;
    this.baseSpeed = 650;
  }

  /**
   * Returns current magnet radius based on Cache Magnet firmware level
   * @param {import('../entities/Player.js').Player} player
   * @returns {number}
   */
  getMagnetRadius(player = null) {
    const bonus = this.storage ? this.storage.getFirmwareBonus('cacheMagnet') : 0;
    if (player && typeof player.magnetRadius === 'number' && player.magnetRadius > this.baseAttractionRadius) {
      return player.magnetRadius + bonus;
    }
    return this.baseAttractionRadius + bonus;
  }

  /**
   * Returns magnet acceleration speed multiplier based on Cache Magnet firmware level
   * @returns {number}
   */
  getMagnetSpeedMultiplier() {
    const level = this.storage ? this.storage.getFirmwareLevel('cacheMagnet') : 0;
    return 1.0 + level * 0.25;
  }

  /**
   * Updates magnetic attraction physics and movement for a list of drops
   * @param {Array<import('../entities/Drop.js').Drop>} drops
   * @param {import('../entities/Player.js').Player} player
   * @param {number} dt
   */
  update(drops, player, dt) {
    if (!player || player.health <= 0 || !drops || drops.length === 0) return;

    const magnetRadius = this.getMagnetRadius(player);
    const speedMult = this.getMagnetSpeedMultiplier();
    const magnetRadiusSq = magnetRadius * magnetRadius;

    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i];
      if (!drop.active || drop.markedForRemoval) continue;

      // XP, Crypto fragments, and Nanite Repair modules are subject to magnetic attraction
      const isMagnetic =
        drop.type === DROP_TYPE.XP ||
        drop.type === DROP_TYPE.CRYPTO ||
        drop.type === DROP_TYPE.NANITE_REPAIR;
      if (!isMagnetic) continue;

      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < magnetRadiusSq) {
        drop.isMagnetized = true;
      }

      if (drop.isMagnetized) {
        const dist = Math.sqrt(distSq);
        if (dist > 1) {
          // Normalized direction to player
          const nx = dx / dist;
          const ny = dy / dist;

          // Quadratic lerp factor: increases dramatically as fragment closes in
          const proximity = Math.max(0, Math.min(1, 1 - dist / magnetRadius));
          const quadraticFactor = 1.0 + proximity * proximity * 3.5;

          // Spring acceleration dynamics
          const targetSpeed = this.baseSpeed * speedMult * quadraticFactor;
          const springK = 18.0 * speedMult;

          drop.vx += (nx * targetSpeed - drop.vx) * Math.min(1.0, springK * dt);
          drop.vy += (ny * targetSpeed - drop.vy) * Math.min(1.0, springK * dt);
          drop._pickupHandled = true;
        }
      }
    }
  }
}
