/**
 * Ring Zero - Penetration Bucker Exploit (Ring 1 Hypervisor Space)
 * Overclocks bullet kinetic core to pierce multiple static walls and destructible obstacles
 * with escalating kinetic damage on each penetrated boundary.
 */

import { CheatInterceptor, CHEAT_REGISTRY } from './CheatDefinition.js';
import { COLOR } from '../core/Constants.js';

export class PenetrationBuckerCheat extends CheatInterceptor {
  constructor() {
    super(CHEAT_REGISTRY.PENETRATIONBUCKER);
  }

  get extraPierce() {
    return this.level === 1 ? 2 : this.level === 2 ? 4 : 8;
  }

  /**
   * Modifies outgoing projectile parameters before spawn
   * @param {Object} bulletParams
   * @param {Object} context
   * @param {function(Object): void} spawnCallback
   */
  onWeaponFire(bulletParams, context, spawnCallback) {
    if (!this.enabled) {
      spawnCallback(bulletParams);
      return;
    }

    // Rank 1: +2 pierce
    // Rank 2: +4 pierce
    // Rank 3: +8 pierce
    const bonusPierce = this.level === 1 ? 2 : this.level === 2 ? 4 : 8;
    const modified = {
      ...bulletParams,
      pierce: (bulletParams.pierce || 1) + bonusPierce,
      canPierceWalls: true,
      color: COLOR.WHITE,
    };

    spawnCallback(modified);
  }

  onRenderHUD(ctx, x, y) {
    if (!this.enabled) return;
    ctx.font = '11px monospace';
    ctx.fillStyle = COLOR.AMBER;
    const p = this.level === 1 ? '+2' : this.level === 2 ? '+4' : '+8';
    ctx.fillText(`[BIN] PENETRATION_BUCKER.bin :: RANK ${this.level}/3 [PIERCE: ${p}]`, x, y);
  }
}
