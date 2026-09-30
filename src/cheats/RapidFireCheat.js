/**
 * Ring Zero - Rapid Fire Exploit (Ring 1 Hypervisor Space)
 * Multiplies hardware firing frequency and accelerates clip reload cycles.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';

export class RapidFireCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.RAPIDFIRE);
  }

  /**
   * Modifies weapon firing dynamics
   * @param {import('../entities/Player.js').Player} player
   * @param {number} dt
   * @param {Object} context
   */
  onPlayerUpdate(player, dt, context) {
    if (!this.enabled || !context || !context.weapon) return;
    const weapon = context.weapon;

    const baseInterval = 1.0 / weapon.config.fireRate;
    let rateMult = 0.71;
    let reloadMult = 0.80;
    if (this.level === 2) {
      rateMult = 0.55;
      reloadMult = 0.65;
    }
    if (this.level >= 3) {
      rateMult = 0.45;
      reloadMult = 0.50;
    }

    weapon.fireInterval = baseInterval * rateMult;
    const dmaBonus = context.reloadReduction || 0;
    weapon.reloadTime = weapon.config.reloadTime * reloadMult * Math.max(0.3, 1.0 - dmaBonus);
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.AMBER;
    const rateText = this.level === 1 ? '+40%' : this.level === 2 ? '+80%' : '+120%';
    ctx.fillText(`[OVL] RAPID_FIRE.ovl :: RANK ${this.level}/3 [RATE: ${rateText}]`, x, y);
  }
}
